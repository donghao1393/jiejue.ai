---
title: "ditto：macOS 专属的文件复制利器"
date: 2025-12-06T22:26:58+04:00
slug: 'macos-ditto-command'
draft: false
cover: "https://jiejue.obs.ap-southeast-1.myhuaweicloud.com/20251206222919695.webp"
tags:
  - macOS
  - 命令行
  - 文件管理
---

如果你在 macOS 上复制过 `.app` 应用包，可能遇到过这种情况：用 `cp -r` 复制后，应用打不开了。这不是你的操作问题，而是 `cp` 命令的局限——它无法完整保留 macOS 文件系统的特殊属性。`ditto` 就是为解决这类问题而生的 macOS 原生工具。

<!--more-->

## 为什么需要 ditto

macOS 的文件系统 APFS（以及之前的 HFS+）有一些独特的元数据结构：resource forks（资源分支）、extended attributes（扩展属性）、ACLs（访问控制列表）。这些元数据对于应用程序的正常运行至关重要，但标准的 Unix `cp` 命令默认不会复制它们。

`ditto` 是 Apple 专门为 macOS 开发的复制工具，它能完整保留这些元数据，确保复制后的文件与原文件在功能上完全一致。

## 基本用法

最简单的用法与 `cp` 类似：

```bash
ditto 源文件 目标文件
ditto 源目录 目标目录
```

复制多个源到同一目录时，目标必须是已存在的目录：

```bash
ditto 文件1 文件2 文件3 目标目录/
```

## 压缩与解压

`ditto` 也能创建和解压 ZIP 归档，同样会保留 macOS 特有的文件属性：

```bash
# 创建压缩包
ditto -c -k 源目录 归档.zip

# 解压
ditto -x -k 归档.zip 目标目录/
```

这里 `-c` 表示创建归档，`-k` 指定使用 PKZip 格式，`-x` 表示解压。

需要注意的是，压缩模式下 `ditto` 只接受单个源路径。如果要打包多个文件或目录，需要先把它们放到一个目录里，或者改用 `zip` 命令。

## 处理资源分支

早期 Mac OS 使用 resource forks 存储图标、菜单等资源数据。虽然现代 macOS 已经较少使用这种机制，但在处理旧文件或某些特殊场景时仍会遇到。`--sequesterRsrc` 选项可以将资源分支单独存放，便于在不支持 resource forks 的系统上传输：

```bash
ditto -c -k --sequesterRsrc 源目录 归档.zip
```

## 实际应用场景

**备份应用程序**：复制 `.app` 包时，`ditto` 能确保应用的代码签名和权限设置完好无损。

```bash
ditto /Applications/MyApp.app ~/Backup/MyApp.app
```

**跨卷复制**：在不同磁盘或分区之间复制文件时，`ditto` 会正确处理文件系统差异。

**创建可分发的归档**：打包项目准备分享给其他 Mac 用户时，用 `ditto` 创建的 ZIP 能保留所有 macOS 特性。

## 与 cp 的对比

| 特性 | cp | ditto |
|------|-----|-------|
| 扩展属性 | 需要 `-p` 选项 | 默认保留 |
| 资源分支 | 不支持 | 完整支持 |
| ACLs | 需要 `-p` 选项 | 默认保留 |
| 压缩功能 | 无 | 内置支持 |
| 跨平台 | 是 | 仅 macOS |

简单来说，如果你只在 macOS 上工作，且需要确保文件的完整性，`ditto` 是更可靠的选择。如果你需要在 Linux 服务器上执行相同的脚本，那还是得用 `cp`。

## 进阶选项

`-v` 可以显示详细的复制过程：

```bash
ditto -v 源目录 目标目录
```

`-V` 会打印每个被复制的文件名，适合调试或确认复制内容：

```bash
ditto -V 源目录 目标目录
```

`--norsrc` 可以在复制时忽略资源分支，有时用于清理旧格式文件。

## 小结

`ditto` 是 macOS 生态中一个被低估的工具。它不像 `cp` 那样跨平台通用，但在 Mac 上处理文件复制和归档时，它能避免很多因元数据丢失导致的诡异问题。下次复制应用包或创建备份时，不妨试试 `ditto`。
