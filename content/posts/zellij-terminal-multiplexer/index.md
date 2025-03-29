---
title: "Zellij: 现代化的终端多路复用器——从 tmux 迁移指南"
date: 2025-03-30T00:48:19+04:00
slug: 'zellij-terminal-multiplexer-guide'
draft: false
cover: "https://jiejue.obs.ap-southeast-1.myhuaweicloud.com/20250330004913707.webp"
tag:
  - 开发工具
  - 终端工具
  - Rust
  - 效率提升
---

你是否曾经为了同时运行多个命令而开了一堆终端窗口？或者每次 SSH 到服务器后担心连接断开会丢失工作进度？终端多路复用器（Terminal Multiplexer）解决了这些问题，而 Zellij 是这个领域中 Rust 实现的后起之秀，带来了出色的用户体验和独特的功能。

<!--more-->

## 什么是 Zellij？

Zellij 是一个用 Rust 编写的现代化终端多路复用器，类似于 tmux 或 screen，但设计理念和用户体验更加现代化。它允许你在一个终端窗口中同时运行多个终端会话，并且可以分离（detach）和重新连接（reattach）会话而不中断运行的程序。

### 为什么选择 Zellij？

对于 tmux 的老用户和终端多开需求的新用户，Zellij 提供了一些引人注目的优势：

1. **更友好的默认配置** - 开箱即用，无需大量自定义
2. **直观的键位绑定** - 更容易记忆和使用
3. **浮动窗格** - 独特的功能，可以创建覆盖在主工作区上的窗格
4. **强大的布局系统** - 声明式配置，易于定义和复用
5. **更好的复制粘贴体验** - 包括在编辑器中编辑滚动缓冲区

## 从 tmux 迁移到 Zellij

### 安装

在 macOS 上，可以使用 Homebrew 安装：

```bash
brew install zellij
```

在 Linux 上，可以使用包管理器或通过 Cargo 安装：

```bash
cargo install zellij
```

更多安装方法可以参考[官方文档](https://zellij.dev/documentation/installation.html)。

### 基础概念对比

| tmux 概念 | Zellij 等价概念 | 描述 |
|---------|---------------|------|
| Session | Session | 一组终端窗口的集合 |
| Window | Tab | 可以切换的视图页面 |
| Pane | Pane | 单个终端实例 |
| 前缀键 (默认 Ctrl+b) | 模式切换键 (默认 Ctrl+g) | 激活命令模式的组合键 |

### 主要区别与注意点

Zellij 最大的不同是它采用了"模式系统"——类似于 vim 的模式概念：

- **Normal 模式**：键入内容直接发送给终端应用
- **命令模式**：通过前缀键激活，执行 Zellij 的操作
- **Scroll 模式**：浏览历史内容
- **Search 模式**：搜索终端内容
- 等等...

## 为 tmux 用户定制 Zellij

如果你习惯了 tmux，可以通过一些配置使 Zellij 的键位更接近 tmux。以下是一个针对 tmux 用户的 Zellij 配置示例：

```kdl
// ~/.config/zellij/config.kdl
keybinds {
    normal {
        // 移除默认的 Ctrl+g 前缀
        unbind "Ctrl g"
        // 禁用 Ctrl+s 以避免与文本编辑器冲突
        unbind "Ctrl s"
        // 使用 Ctrl+q 作为前缀键（可改为 Ctrl+b 以匹配 tmux）
        bind "Ctrl q" { SwitchToMode "tmux"; }
    }
    
    tmux {
        // 前缀键按两次发送一次前缀键给应用程序
        bind "Ctrl q" { Write 17; SwitchToMode "normal"; }
        
        // 窗口管理（类似 tmux 的 window）
        bind "c" { NewTab; SwitchToMode "normal"; }
        bind "," { SwitchToMode "RenameTab"; }
        
        // 面板分割（类似 tmux 的 split-window）
        bind "\\" { NewPane "Right"; SwitchToMode "normal"; }
        bind "-" { NewPane "Down"; SwitchToMode "normal"; }
        
        // vim 风格的窗格切换
        bind "h" { MoveFocus "Left"; SwitchToMode "normal"; }
        bind "l" { MoveFocus "Right"; SwitchToMode "normal"; }
        bind "j" { MoveFocus "Down"; SwitchToMode "normal"; }
        bind "k" { MoveFocus "Up"; SwitchToMode "normal"; }
        
        // 会话管理
        bind "d" { Detach; }
        
        // 浮动窗格（Zellij 特有功能）
        bind "w" { ToggleFloatingPanes; SwitchToMode "normal"; }
        
        // 进入复制模式
        bind "[" { SwitchToMode "scroll"; }
    }
    
    // 滚动/复制模式
    scroll {
        // vim 风格的导航
        bind "j" { ScrollDown; }
        bind "k" { ScrollUp; }
        bind "d" { HalfPageScrollDown; }
        bind "u" { HalfPageScrollUp; }
        bind "G" { ScrollToBottom; }
        
        // 复制操作
        bind "y" { Copy; }
        
        // 使用编辑器打开缓冲区
        bind "e" { EditScrollback; SwitchToMode "normal"; }
        
        // 退出复制模式
        bind "q" { SwitchToMode "normal"; }
    }
}

options {
    // MacOS系统设置系统剪贴板集成
    copy_command "pbcopy"
    
    // 防止窗格在命令结束时自动关闭
    pane_close_on_exit false
}
```

## Zellij 布局系统

Zellij 的布局系统是它的一大亮点，通过 KDL 格式文件定义窗口排列：

```kdl
// ~/.config/zellij/layouts/dev.kdl
layout {
    // 默认标签页模板
    default_tab_template {
        // 标签栏
        pane size=1 borderless=true {
            plugin location="zellij:tab-bar"
        }
        // 子窗格内容
        children
        // 状态栏
        pane size=2 borderless=true {
            plugin location="zellij:status-bar"
        }
    }
    
    // 会话名称（可选）
    session_name "dev"
    
    // 系统监控标签页
    tab name="monitor" {
        pane command="htop"
    }
    
    // 编辑标签页
    tab name="editor" {
        pane command="nvim"
    }
    
    // 分割窗格的标签页
    tab name="terminal" {
        pane split_direction="horizontal" {
            pane size="60%"
            pane size="40%" split_direction="vertical" {
                pane
                pane
            }
        }
    }
}
```

使用自定义布局启动：

```bash
zellij --layout dev
```

## 常用快捷键和功能

以下是使用上述配置后的常用操作：

### 会话管理

- **启动新会话**：`zellij`
- **命名会话启动**：`zellij -s 会话名称`
- **列出会话**：`zellij list-sessions`
- **附加到会话**：`zellij attach 会话名称`
- **分离会话**：`Ctrl+q d`

### 窗格操作

- **创建水平分割窗格**：`Ctrl+q -`
- **创建垂直分割窗格**：`Ctrl+q \`
- **切换窗格焦点**：`Ctrl+q` 然后 `h/j/k/l`（vim风格）
- **调整窗格大小**：`Ctrl+q` 然后方向键
- **关闭当前窗格**：`Ctrl+q x`
- **全屏当前窗格**：`Ctrl+q z`

### 标签页（Tab）管理

- **创建新标签页**：`Ctrl+q c`
- **重命名标签页**：`Ctrl+q ,`
- **切换标签页**：在状态栏用鼠标点击或使用键位如 `Alt+数字`
- **移动标签页**：`Ctrl+q Ctrl+j`（向右）或 `Ctrl+q Ctrl+k`（向左）

### 复制模式

- **进入滚动模式**：`Ctrl+q [`
- **在滚动模式中开始选择**：`v`
- **复制选中内容**：`y`
- **编辑滚动缓冲区**：在滚动模式中按 `e`
- **退出滚动模式**：`q` 或 `Escape`

### Zellij 特色功能

- **浮动窗格**：`Ctrl+q w` 切换浮动窗格可见性
- **运行命令到浮动窗格**：`zellij run --floating -- 命令`
- **模式锁定**：`Ctrl+q Ctrl+g`
- **命令模式**：`Ctrl+q :` 然后输入命令

## 实用案例：开发工作流

使用 Zellij 创建一个高效的开发工作流，包含以下组件：

1. **系统监控**：htop 运行在单独标签页
2. **代码编辑**：nvim 在主标签页
3. **构建与测试**：分割的窗格用于运行测试和查看输出
4. **日志监控**：浮动窗格用于实时查看日志

```kdl
// ~/.config/zellij/layouts/dev.kdl
layout {
    default_tab_template {
        pane size=1 borderless=true {
            plugin location="zellij:tab-bar"
        }
        children
        pane size=2 borderless=true {
            plugin location="zellij:status-bar"
        }
    }
    
    session_name "dev"
    
    tab name="monitor" {
        pane command="htop"
    }
    
    tab name="code" {
        pane command="nvim" cwd="/path/to/project"
    }
    
    tab name="build" {
        pane split_direction="horizontal" {
            pane command="sh" {
                args "-c" "echo 'Ready to build'; $SHELL"
            }
            pane command="sh" {
                args "-c" "echo 'Ready to test'; $SHELL"
            }
        }
    }
    
    // 浮动日志窗格
    floating_panes {
        pane command="tail" {
            args "-f" "/path/to/log/file.log"
        }
    }
}
```

## 技巧与陷阱

### 环境变量在布局文件中的处理

Zellij 布局文件中的环境变量不会自动扩展。最佳实践是使用 `sh -c` 命令：

```kdl
pane command="sh" {
    args "-c" "tail -f $HOME/logs/app.log"
}
```

### 防止窗格意外关闭

设置全局选项或在特定窗格上设置：

```kdl
// 全局设置
options {
    pane_close_on_exit false
}

// 或针对特定窗格
pane close_on_exit=false {
    // ...
}
```

### 复制粘贴最佳实践

对于复杂的复制操作，使用编辑器模式：

1. 进入滚动模式：`Ctrl+q [`
2. 按 `e` 在默认编辑器中打开内容
3. 使用编辑器的全部功能（搜索、复制等）
4. 保存并退出回到 Zellij

## 结语

Zellij 为终端多路复用带来了现代化的体验和创新功能。对于 tmux 的老用户，它提供了平滑的迁移路径；对于新用户，它降低了入门门槛。通过本文提供的配置和指南，你可以轻松开始使用 Zellij 提升你的终端工作效率。

Zellij 仍在积极开发中，新功能不断增加。建议定期查看[官方文档](https://zellij.dev/documentation/)以获取最新信息。

你是如何组织你的终端工作流的？Zellij 的哪些功能对你最有帮助？欢迎在评论中分享你的体验。
