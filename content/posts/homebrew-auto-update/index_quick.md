---
title: "Mac 用户必备：Homebrew 自动更新配置指南"
date: 2025-05-03T11:09:08+04:00
slug: 'homebrew-auto-update-guide'
draft: false
cover: "https://jiejue.obs.ap-southeast-1.myhuaweicloud.com/20250503111511793.webp"
tags:
  - Mac
  - Homebrew
  - 自动化
  - 效率工具
---

# Mac 用户必备：Homebrew 自动更新配置指南

你是否曾经因为忘记更新 Homebrew 包而导致软件出现问题？或者是否厌倦了每次手动执行更新命令的繁琐？本文将为你介绍一种简单的方法，让你的 Mac 在每天凌晨自动更新 Homebrew 包，而你只需安心睡觉！

<!--more-->

## 为什么需要自动更新 Homebrew？

小明是一名设计师，他每天使用 Mac 上的各种设计工具。有一天，他发现自己常用的一个设计软件突然无法正常工作了。经过一番排查，原来是因为这个软件依赖的某个库太旧了。如果他能定期更新 Homebrew 包，就不会遇到这个问题。

但是，手动执行 `brew update` 和 `brew upgrade` 命令实在太麻烦了，而且很容易忘记。有没有一种方法可以让电脑自动完成这项工作呢？

## 解决方案：homebrew-autoupdate

好消息是，有一个名为 `homebrew-autoupdate` 的工具可以帮助我们实现自动更新。更好的是，它最近新增了一个 `--leaves-only` 选项，可以只更新我们直接安装的包，而不更新那些作为依赖项安装的包，这样可以大大减少因依赖更新而导致的兼容性问题。

## 如何设置自动更新

### 步骤 1：安装 homebrew-autoupdate

打开终端，输入以下命令：

```bash
brew tap domt4/autoupdate
```

### 步骤 2：配置自动更新

接下来，我们需要配置自动更新。假设我们希望每天凌晨 4 点 25 分自动更新，并且只更新顶层包（即直接安装的包，不包括依赖项），可以使用以下命令：

```bash
brew autoupdate start 86400 --upgrade --leaves-only --cleanup
```

这个命令的含义是：
- `start`：启动自动更新
- `86400`：更新间隔为 86400 秒，即 24 小时
- `--upgrade`：不仅更新 Homebrew 本身，还会升级已安装的包
- `--leaves-only`：只更新顶层包，不更新依赖项
- `--cleanup`：自动清理旧版本和缓存文件

### 步骤 3：确认设置成功

要确认自动更新已经成功设置，可以使用以下命令：

```bash
brew autoupdate status
```

如果看到类似 "Autoupdate is currently running..." 的信息，说明设置成功了。

## 如何调整更新时间

默认情况下，homebrew-autoupdate 会在启动后立即运行一次，然后每隔设定的时间（例如 24 小时）运行一次。但这可能不是我们想要的。

如果你希望它在特定时间（例如凌晨 4 点 25 分）运行，可以先停止当前的自动更新，然后使用 Mac 的 launchd 系统手动调整。

### 步骤 1：停止当前的自动更新

```bash
brew autoupdate delete
```

### 步骤 2：编辑 plist 文件

首先，启动自动更新但不立即运行：

```bash
brew autoupdate start 86400 --upgrade --leaves-only --cleanup
```

然后，编辑 plist 文件：

```bash
open -e ~/Library/LaunchAgents/com.github.domt4.homebrew-autoupdate.plist
```

在打开的文件中，找到 `<key>StartInterval</key>` 和 `<integer>86400</integer>` 这两行，将它们替换为：

```xml
<key>StartCalendarInterval</key>
<dict>
    <key>Hour</key>
    <integer>4</integer>
    <key>Minute</key>
    <integer>25</integer>
</dict>
```

保存文件并关闭。

### 步骤 3：重新加载 plist 文件

```bash
launchctl unload ~/Library/LaunchAgents/com.github.domt4.homebrew-autoupdate.plist
launchctl load ~/Library/LaunchAgents/com.github.domt4.homebrew-autoupdate.plist
```

现在，自动更新将在每天凌晨 4 点 25 分运行，而不是每隔 24 小时运行一次。

## 查看更新日志

如果你想查看自动更新的日志，可以在以下位置找到：

```bash
~/Library/Logs/com.github.domt4.homebrew-autoupdate/
```

## 总结

通过 homebrew-autoupdate 工具，我们可以轻松实现 Homebrew 包的自动更新，不再需要手动执行命令。特别是使用新增的 `--leaves-only` 选项，可以只更新顶层包，大大减少因依赖更新而导致的兼容性问题。

设置完成后，你的 Mac 将在每天凌晨 4 点 25 分自动更新 Homebrew 包，让你的软件始终保持最新状态，同时减少因版本问题导致的各种麻烦。

你是否有其他自动化工具来提高工作效率？欢迎在评论区分享你的经验！
