---
title: "为什么 fd -x rg 比 rg -t 慢 600 倍？进程 fork 开销的代价"
date: 2026-01-17T18:20:22+04:00
slug: 'fd-x-rg-vs-rg-performance-fork-overhead'
draft: false
cover: "https://jiejue.obs.ap-southeast-1.myhuaweicloud.com/20260117182246652.webp"
tags:
  - Terminal
  - Performance
  - Rust
  - fd
  - ripgrep
---

在终端里搜索文件内容时，`fd` 配合 `rg` 是常见的组合。但一个看似合理的命令组合，可能比原生方案慢几百倍。

<!--more-->

## 一个简单的需求

我想在 home 目录下搜索所有 Markdown 文件中包含某个字符串的行。第一反应是用 `fd` 找文件，用 `rg` 搜内容：

```bash
fd -e md -x rg 'string'
```

这条命令能跑，但有两个问题：一是默认不显示文件名（加 `-H` 可以解决），二是慢得离谱。

更简洁的方案是直接用 `rg` 自带的文件类型过滤：

```bash
rg -t md 'string' ~
```

两者功能相同，性能差距有多大？

## 实测数据

测试环境是 macOS，目标目录 `~/projects` 包含大量文件。先看单独执行的基线时间：

```bash
time fd -e md . ~/projects 1>/dev/null
# Executed in 1.68 secs

time rg -t md -l 'TODO' ~/projects 1>/dev/null
# Executed in 1.95 secs
```

单独看，两者都在 2 秒左右完成。但把它们组合起来：

```bash
time hyperfine "fd -e md -x rg -l 'TODO' ~/projects" "rg -t md -l 'TODO' ~/projects"
```

`fd -x rg` 跑了两分钟还没完成，我手动终止了。

为了得到可对比的数据，我换了一个小一点的子目录 `~/projects/sample-app`：

```
Benchmark 1: fd -e md -x rg -l 'TODO' . ~/projects/sample-app
  Time (mean ± σ):  4.674 s ±  0.175 s

Benchmark 2: rg -t md -li 'TODO' ~/projects/sample-app
  Time (mean ± σ):  7.7 ms ±   1.4 ms

Summary
  rg -t md -li 'TODO' ~/projects/sample-app ran
  605.67 ± 111.29 times faster than fd -e md -x rg -l 'TODO' . ~/projects/sample-app
```

**605 倍的差距。**

## 差距从何而来

如果简单地看时间复杂度，`fd -x rg` 应该是 O(N + n)——N 是总文件数，n 是匹配的 Markdown 文件数。理论上，1.68s（遍历）加上 1.95s（搜索）约等于 3.6 秒。但实际上差了 30-40 倍，这说明复杂度分析忽略了一个关键因素：**常数因子**。

两种方案的执行模型完全不同：

**`fd -e md -x rg`** 的执行流程是：fd 遍历目录 → 每找到一个匹配文件就 fork 一个 rg 子进程 → rg 搜索单个文件 → 进程退出。每个文件都要经历一次完整的进程创建和销毁。

**`rg -t md`** 的执行流程是：单进程启动 → 内部线程池并行遍历和搜索 → 进程退出。从头到尾只有一个进程。

问题的核心在于 `fork` 系统调用的代价。每次 fork 都要分配进程表项、复制文件描述符表、设置内存映射——这些操作的开销是毫秒级的。而文件遍历和内容搜索的开销是微秒级的。

设 n 为匹配文件数，m 为单次 fork 开销（约 1-5 毫秒）。`fd -x rg` 的 fork 总开销是 **n × m**，而 `rg -t md` 的 fork 开销是 **1 × m**。

假设目录里有 1000 个 Markdown 文件，m 取 3 毫秒：

```
fd -x rg: 1000 × 3ms = 3000ms = 3 秒（仅 fork 开销）
rg -t md: 1 × 3ms = 3ms
```

这还没算 rg 实际搜索的时间。乘法和加法的区别，就是 600 倍差距的来源。

## 结论

**搜索场景**：直接用 `rg -t` 或 `rg -g`，别用 `fd -x rg` 组合。

**批量修改场景**：`fd -x` 配合 `sd`（或 `sed`）仍然合理，因为需要修改的文件数量通常远少于需要搜索的文件数量。搜索是 O(全部文件)，替换是 O(匹配文件)。当 n 足够小时，fork 开销可以接受。

工具组合的灵活性是 Unix 哲学的精髓，但不意味着任何组合都是最优解。理解底层执行模型，才能在灵活性和性能之间做出正确的取舍。
