---
title: "macOS Tahoe 的隐藏权限陷阱：为什么你的命令行工具突然「没权限」了"
date: 2026-01-01T14:58:17+04:00
slug: 'macos-tahoe-cli-full-disk-access-fix'
draft: false
cover: "https://jiejue.obs.ap-southeast-1.myhuaweicloud.com/20260101150207883.webp"
tags:
  - macOS
  - 系统配置
  - 命令行
---

升级到 macOS Tahoe (26) 后，你可能会遇到一个令人困惑的问题：明明在「系统设置」里给了某个命令行工具「完全磁盘访问权限」，但它就是不出现在列表里，而且工具仍然报「权限被拒绝」的错误。

这不是你的操作问题，而是 Apple 在 macOS Tahoe 中引入的一个已知 bug。

<!--more-->

## 发生了什么？

在 macOS 的早期版本中，你可以把任何程序（包括命令行工具）添加到「隐私与安全性」的各项权限列表中。但从 macOS Sequoia (15) 开始，Apple 收紧了对命令行工具的权限管理；到了 Tahoe (26)，情况变得更加混乱：

**你添加的命令行工具会被写入系统的权限数据库，但「系统设置」的界面却不显示它们。**

这意味着：
- 你把工具拖进权限列表，点击确认
- 界面上什么都没有出现
- 你以为添加失败了
- 实际上权限可能已经添加成功了，只是界面不显示

更糟糕的是，即使权限已经添加，如果你没有正确重启相关进程，权限也不会生效。

## 典型症状

以终端多路复用器 zellij 为例，你可能会看到这样的错误：

```
eza -lA ~/Downloads/
Permission denied: . - code: 13
```

或者：

```
ls ~/Documents/
ls: cannot access '/Users/你的用户名/Documents/': Operation not permitted
```

这类错误说明程序无法访问受保护的目录（下载、文稿、桌面等），需要「完全磁盘访问权限」。

## 解决方案

### 第一步：添加权限

打开「系统设置」→「隐私与安全性」→「完全磁盘访问权限」。

点击「+」按钮，然后按 `Cmd+Shift+G` 输入工具的完整路径。对于 Homebrew 安装的工具，路径通常是：

```
/opt/homebrew/Cellar/工具名称/版本号/bin/工具名称
```

例如 zellij：

```
/opt/homebrew/Cellar/zellij/0.43.1/bin/zellij
```

你可以用 `realpath $(which 工具名)` 命令来获取准确路径：

```bash
realpath $(which zellij)
# 输出：/opt/homebrew/Cellar/zellij/0.43.1/bin/zellij
```

添加后，即使列表里看不到这个工具，也请继续下一步。

### 第二步：验证权限是否已写入

在终端中运行以下命令（需要输入密码）：

```bash
sudo sqlite3 "/Library/Application Support/com.apple.TCC/TCC.db" \
  "SELECT service, client, auth_value FROM access WHERE client LIKE '%工具名%';"
```

例如检查 zellij：

```bash
sudo sqlite3 "/Library/Application Support/com.apple.TCC/TCC.db" \
  "SELECT service, client, auth_value FROM access WHERE client LIKE '%zellij%';"
```

如果输出类似这样：

```
kTCCServiceSystemPolicyAllFiles|/opt/homebrew/Cellar/zellij/0.43.1/bin/zellij|2
```

说明权限已经成功添加。其中：
- `kTCCServiceSystemPolicyAllFiles` 表示「完全磁盘访问权限」
- `auth_value=2` 表示「已授权」

### 第三步：让权限生效

这是最关键的一步。即使权限已经写入数据库，正在运行的进程也不会自动获得新权限。你需要：

**1. 完全关闭相关程序**

对于 zellij：

```bash
zellij kill-all-sessions
pkill -9 zellij
```

对于其他工具，确保所有相关进程都已退出。

**2. 重启系统的权限管理服务**

```bash
sudo launchctl kickstart -k system/com.apple.tccd
```

**3. 重启你的终端程序**

完全退出 iTerm2、Terminal 或你使用的其他终端，然后重新打开。

**4. 验证权限是否生效**

```bash
ls ~/Documents/
ls ~/Downloads/
```

如果能正常列出内容，说明问题已解决。

## 这个方法适用于哪些工具？

任何需要访问受保护目录的命令行工具都可能遇到这个问题，包括但不限于：

- **终端复用器**：zellij、tmux
- **窗口管理器**：yabai
- **备份工具**：restic、backrest
- **文件管理器**：ranger、yazi
- **搜索工具**：fd、rg (ripgrep)

## 注意事项

**工具升级后可能需要重新添加权限**

macOS 的 TCC 权限是按文件的绝对路径记录的。当你通过 Homebrew 升级工具时，版本号会变（比如从 `0.43.1` 变成 `0.44.0`），路径也会随之改变，之前添加的权限就失效了。

升级后如果再次遇到权限问题，重复上述步骤即可。

**这是 Apple 的 bug，不是你的问题**

这个问题已经被多个开源项目的用户报告，包括 yabai、backrest 等。Apple 在 macOS 26.2 beta 中仍未修复此问题。在 Apple 正式修复之前，上述方法是目前最可靠的解决方案。

## 写在最后

Apple 在 macOS 的权限管理上越收越紧，这本身是为了保护用户隐私和安全。但当系统界面和实际行为不一致时，就会给用户带来困惑。

如果你在使用 macOS Tahoe 时遇到了其他命令行工具的权限问题，可以尝试用本文的方法排查。核心思路是：先确认权限是否真的写入了数据库，再通过重启进程让权限生效。
