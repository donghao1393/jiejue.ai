---
title: "Git 在 macOS 上的大小写幽灵：当 packed-refs 遇上不区分大小写的文件系统"
date: 2026-02-27T23:31:00+04:00
slug: 'git-case-sensitivity-macos-packed-refs'
draft: false
cover: "https://jiejue.obs.ap-southeast-1.myhuaweicloud.com/20260227233531737.webp"
tags:
  - Git
  - macOS
  - 踩坑记录
---

你用 macOS 写代码，用 Git 管理版本，某天 fetch 突然报错说 lock 文件已存在，删了 lock 文件下次 fetch 又报——这篇文章就是写给你的。

<!--more-->

## 症状

用 GUI 客户端（Fork、SourceTree 等均可能触发）执行 fetch 时，输出里夹着一条错误：

```
error: could not delete references: cannot lock ref 'refs/remotes/origin/bug/PROJ-1234':
Unable to create '.../.git/refs/remotes/origin/bug/PROJ-1234.lock': File exists.

Another git process seems to be running in this repository...
```

远程仓库刚好在清理大量已合并的分支，fetch 输出里跟着一长串 `[deleted]` 记录——那些都成功了，唯独这一条失败。

直觉告诉你：删掉那个 `.lock` 文件就好了。于是你去删：

```bash
rm ~/projects/my-app/.git/refs/remotes/origin/bug/PROJ-1234.lock
```

文件可能已经不在了（git 进程结束时自己清理了），也可能确实删掉了。无论哪种情况，下次 fetch 时**同样的错误又回来了**。

这就是线索——问题不在 lock 文件本身。

## 根因

用一条命令揭开谜底：

```bash
grep -i "PROJ-1234" .git/packed-refs
```

输出：

```
a1b2c3d4... refs/remotes/origin/BUG/PROJ-1234
a1b2c3d4... refs/remotes/origin/bug/PROJ-1234
```

同一个分支，两条引用记录，唯一的区别是前缀的大小写：`BUG/` 和 `bug/`。

这就是冲突的核心。要理解它为什么会卡住，需要知道两件事：

**Git 内部是大小写敏感的。** `packed-refs` 是一个纯文本文件，git 逐行匹配引用名。`BUG/PROJ-1234` 和 `bug/PROJ-1234` 对 git 来说是两个完全不同的引用。

**macOS 默认的 APFS/HFS+ 文件系统是大小写不敏感的。** 当 git 需要在 `.git/refs/remotes/origin/` 下操作这些引用对应的目录和文件时，操作系统认为 `BUG/` 和 `bug/` 是同一个目录。

于是在 fetch 过程中，git 发现远程已经删除了这两个分支，需要逐个清理本地的远程追踪引用。它先处理其中一个（比如 `BUG/PROJ-1234`），在文件系统上创建 `.git/refs/remotes/origin/bug/PROJ-1234.lock`（注意路径被文件系统归一化了）。接着处理第二个（`bug/PROJ-1234`），试图在同一路径创建 lock 文件——发现已存在，报错。

每次 fetch 都会重复这个流程，所以删 lock 文件只是治标。

## 解决

直接从 `packed-refs` 里删掉这两行冲突的记录：

```bash
cd ~/projects/my-app
# 先确认有哪些冲突行
grep -i "PROJ-1234" .git/packed-refs

# 删除匹配的行（这里用 sd，sed 也行）
sd '.*PROJ-1234\n' '' .git/packed-refs

# 验证
grep -i "PROJ-1234" .git/packed-refs
# 应该没有输出

# 清理可能残留的空目录
rmdir .git/refs/remotes/origin/bug/ 2>/dev/null
```

之后重新 fetch 即可恢复正常。

## 这对 macOS 上的 Git 意味着什么

这个问题不只影响 fetch 时的分支删除。任何涉及仅大小写不同的引用名的操作——checkout、push、创建分支——都可能在 macOS 上出问题。典型的产生条件是团队成员在 Linux 服务器（大小写敏感）上创建了大小写不同的同名分支前缀，比如一个人用 `BUG/`，另一个人用 `bug/`。Linux 上这完全合法，推到远程仓库也没问题，但 macOS 用户一 fetch 就会中招。

预防很简单：团队约定分支命名规范，统一前缀大小写。比如全部小写 `bug/`、`feature/`、`hotfix/`。如果你的团队用 Jira 或类似工具自动生成分支名，检查一下模板的大小写设定。

如果你想从根本上消除这类问题，也可以在创建 APFS 分区时选择 case-sensitive 格式——但这会带来其他兼容性问题（部分 macOS 应用假设文件系统大小写不敏感），不适合所有人。

## 快速诊断清单

下次在 macOS 上遇到反复出现的 git lock 文件错误时，可以按这个顺序排查：

1. **删 lock 文件后问题复现？** → 不是进程残留问题，往下查
2. **`grep -i "<关键词>" .git/packed-refs`** → 看看是否有仅大小写不同的重复引用
3. **如果有** → 手动从 `packed-refs` 中删除冲突行，清理空目录，重新 fetch
4. **如果没有** → 检查是否有其他 git 进程在运行（`ps aux | grep git`），或者检查文件系统权限
