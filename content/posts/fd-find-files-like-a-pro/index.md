---
title: "fd：让文件搜索变得优雅而高效"
date: 2026-01-18T01:00:55+04:00
slug: 'fd-find-files-like-a-pro'
draft: false
cover: "https://jiejue.obs.ap-southeast-1.myhuaweicloud.com/20260118010319485.webp"
tags:
  - 命令行
  - 效率工具
  - fd
  - 文件管理
---

如果你曾经在终端里用过 `find` 命令来搜索文件，大概率会对它那反人类的语法印象深刻。`fd` 是一个现代化的替代品，它不仅语法直观，而且速度飞快——在百万级文件的目录中依然能保持流畅的搜索体验。

<!--more-->

## 为什么选择 fd

传统的 `find` 命令功能强大，但语法繁琐。比如要在当前目录查找所有 `.js` 文件，`find` 需要这样写：

```bash
find . -name "*.js" -type f
```

而 `fd` 只需要：

```bash
fd -e js
```

`fd` 默认就会递归搜索、忽略 `.gitignore` 中的文件、跳过隐藏目录，这些在 `find` 中都需要额外参数才能实现。更重要的是，`fd` 使用 Rust 编写，在大型项目中的搜索速度通常比 `find` 快数倍。

## 基础用法

`fd` 的基本语法是 `fd [模式] [路径]`。如果省略路径，默认在当前目录搜索；如果省略模式，则匹配所有文件。

```bash
# 搜索文件名包含 "config" 的文件
fd config

# 在 home 目录下搜索
fd config ~

# 只搜索文件（不包括目录）
fd config ~ --type f

# 只搜索目录
fd config ~ --type d
```

## 按修改时间筛选

这是 `fd` 特别实用的功能。想找出最近两周内修改过的文件？一行命令搞定：

```bash
fd . ~ --type f --changed-within 2weeks
```

`--changed-within` 支持多种时间格式：

- `10min` — 10 分钟内
- `2h` — 2 小时内
- `3d` — 3 天内
- `2weeks` — 2 周内

对应地，`--changed-before` 可以查找更早的文件：

```bash
# 查找 30 天前的旧文件
fd . ~ --type f --changed-before 30d
```

## 排除特定类型的文件

`fd` 的 `-e` 参数用于**包含**特定扩展名，但如果要**排除**某些类型，需要用 `-E` 或 `--exclude` 配合 glob 模式：

```bash
# 排除 markdown 文件
fd . ~ --type f --changed-within 2weeks -E '*.md'

# 排除多种类型
fd . ~ --type f -E '*.md' -E '*.log' -E '*.tmp'

# 排除整个目录
fd . ~ --type f -E '.git/' -E 'node_modules/'
```

需要注意的是，`-e` 参数不支持取反操作。如果你尝试 `fd ... -e md !`，不会得到预期的结果。排除操作必须使用 `-E`。

## 只保留纯文本文件

有时候我们只想看文本文件，排除图片、视频等二进制文件。`fd` 本身没有内置的"纯文本"过滤器，但有两种方法可以实现。

**方法一：排除常见二进制扩展名**

这种方法速度快，但不够全面：

```bash
fd . ~ --type f --changed-within 2weeks \
  -E '*.jpg' -E '*.jpeg' -E '*.png' -E '*.gif' -E '*.webp' \
  -E '*.mp3' -E '*.mp4' -E '*.mov' -E '*.avi' \
  -E '*.pdf' -E '*.zip' -E '*.tar' -E '*.gz' \
  -E '*.exe' -E '*.dll' -E '*.so' -E '*.dylib'
```

**方法二：结合 `file` 命令检测**

这种方法更准确，能正确识别没有扩展名的二进制文件，或者扩展名"骗人"的情况：

```bash
fd . ~ --type f --changed-within 2weeks -x sh -c \
  'file -b "$1" | grep -qi "text\|ascii" && echo "$1"' _ {}
```

这行命令的原理是：对 `fd` 找到的每个文件，用 `file` 命令检测其类型，如果输出包含 "text" 或 "ascii"，就打印文件路径。

如果你更喜欢管道风格，也可以这样写：

```bash
fd . ~ --type f --changed-within 2weeks | while read f; do
  file -b "$f" | grep -qi 'text\|ascii' && echo "$f"
done
```

方法二的代价是速度——对每个文件都要调用 `file` 命令，在文件数量很大时会明显变慢。根据实际需求选择适合的方法即可。

## 安装

macOS 用户可以通过 Homebrew 安装：

```bash
brew install fd
```

Linux 用户可以用各自发行版的包管理器，比如：

```bash
# Ubuntu/Debian
sudo apt install fd-find

# Arch Linux
sudo pacman -S fd
```

## 小结

`fd` 把文件搜索这件事做得既快又优雅。它的设计哲学是"合理的默认值 + 简洁的语法"，让你不需要记忆复杂的参数就能完成大部分任务。如果你经常在终端里工作，`fd` 值得成为你的标配工具。

下次当你需要在项目里快速定位某个配置文件，或者清理一个月前的临时文件时，不妨试试 `fd`。
