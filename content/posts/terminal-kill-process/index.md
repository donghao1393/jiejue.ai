---
title: "终端里怎么关掉一个「关不掉」的程序"
date: 2025-12-01T23:40:40+04:00
slug: 'how-to-kill-process-in-terminal'
draft: false
cover: "https://jiejue.obs.ap-southeast-1.myhuaweicloud.com/20251201234347735.webp"
tags:
  - 终端
  - macOS
  - Linux
  - 进程管理
---

你在终端里启动了一个开发服务器，结果按 Ctrl+C 没反应，关掉终端窗口它还在后台跑着占用端口。怎么办？这篇文章教你用两个命令彻底解决这个问题。

<!--more-->

## 场景：程序关不掉了

小王是个前端开发，他在终端里启动了一个本地服务器。做完工作后他直接关掉了终端窗口，以为程序就停了。第二天再启动，报错说"端口被占用"。他一看，昨天的程序还在后台默默运行。

这种情况下，你需要找到这个程序的「身份证号」（PID），然后让系统把它强制关掉。

## 第一步：找到程序的 PID

每个运行中的程序都有一个数字编号，叫 PID（Process ID，进程ID）。你需要先找到它。

打开终端，输入：

```bash
ps aux | grep 关键词
```

把「关键词」换成你要找的程序名字的一部分。比如小王在找一个 Node.js 的项目：

```bash
ps aux | grep myproject
```

你会看到类似这样的输出：

```
xiaowang   12345   0.0  0.1 435760880  68704   ??  SN   9:44PM   0:00.26 node /Users/xiaowang/myproject/server.js
xiaowang   12346   0.0  0.0 410065616    208 s017  R+  10:59PM   0:00.00 grep myproject
```

第二列的数字就是 PID。这里是 `12345`（忽略最后一行带 `grep` 的，那是你刚才执行的搜索命令本身）。

## 第二步：关掉程序

找到 PID 后，有两种方式关掉它。

### 方式一：礼貌地请它关闭

```bash
kill 12345
```

这相当于跟程序说「请你退出」。大部分程序会听话地保存数据然后退出。

### 方式二：强制关闭

如果 `kill` 之后程序还在（再用 `ps aux | grep` 查一下），说明它不听话。这时候加上 `-9`：

```bash
kill -9 12345
```

这相当于直接把电源拔了，程序没有任何反抗的机会。不过也意味着它没机会保存数据，所以除非必要，先试试不带 `-9` 的版本。

## 更方便的方法：pkill

如果你嫌找 PID 麻烦，可以用 `pkill` 一步到位：

```bash
pkill -f myproject
```

这会自动找到命令行里包含 `myproject` 的所有程序并关掉它们。

同样，如果关不掉，加上 `-9`：

```bash
pkill -9 -f myproject
```

这里的 `-f` 是告诉 `pkill`：不只看程序名，要看完整的命令行。比如你的程序名是 `node`，但你想杀的是跑 `myproject` 的那个 `node`，就需要 `-f`。

## 小心误伤

`pkill` 会杀掉所有匹配的程序。如果你输入 `pkill -9 -f node`，你电脑上所有 Node.js 程序都会被关掉。

**建议**：先用 `pgrep -f 关键词` 看看会命中哪些程序，确认无误再换成 `pkill`。

```bash
# 先看看会杀掉谁
pgrep -f myproject

# 确认没问题再动手
pkill -f myproject
```

## 总结

| 你想做的事 | 命令 |
|-----------|------|
| 找到程序的 PID | `ps aux \| grep 关键词` |
| 礼貌关闭（按 PID） | `kill PID` |
| 强制关闭（按 PID） | `kill -9 PID` |
| 按名字关闭 | `pkill -f 关键词` |
| 按名字强制关闭 | `pkill -9 -f 关键词` |
| 先看看会杀谁 | `pgrep -f 关键词` |

记住：先礼后兵。先试 `kill`，不行再 `kill -9`。先用 `pgrep` 确认，再用 `pkill` 动手。
