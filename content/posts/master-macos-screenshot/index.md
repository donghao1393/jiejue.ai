---
title: "掌握 macOS 截图的各种技巧"
date: 2024-12-13T18:48:22+04:00
slug: 'master-macos-screenshot'
draft: false
cover: "https://jiejue.obs.ap-southeast-1.myhuaweicloud.com/20250201095905780.webp"
tags:
  - macos
  - 截图
---
很多人认为 macOS 的截图功能不如 Windows 的 Snipping Tool 好用，其实不然。macOS 内置了强大的截图工具，从基础截图到高级录屏，从快捷键到图形界面，功能一应俱全。本文将详细介绍如何掌握这些功能。

<!--more-->

## 基础快捷键

macOS 提供了三个基础的截图快捷键：

```bash
Command + Shift + 3    # 截取整个屏幕
Command + Shift + 4    # 截取选定区域（按ESC退出）
Command + Shift + 4，然后按空格键    # 截取窗口
```

## 截图工具栏

从 macOS Mojave (10.14) 开始，除了快捷键，macOS 还提供了一个功能完整的截图工具栏：

```bash
Command + Shift + 5    # 打开截图工具栏
```

工具栏提供以下功能：

- 截取整个屏幕
- 截取选定窗口
- 截取选定区域
- 录制整个屏幕
- 录制选定区域

### 实用选项

点击工具栏中的"选项"按钮，可以设置：

- 保存位置（桌面、文档、剪贴板等）
- 倒计时延迟（用于捕捉特定状态）
- 显示鼠标指针
- 录制时使用麦克风
- 保留上次选择的区域大小

## 高级设置

如果需要更多自定义设置，可以通过终端命令来实现：

### 修改保存格式

```bash
# 修改为 JPG 格式
defaults write com.apple.screencapture type jpg

# 修改为 PNG 格式（默认）
defaults write com.apple.screencapture type png

# 其他支持的格式：pdf、tiff、gif
```

### 自定义文件名和外观

```bash
# 修改默认文件名前缀
defaults write com.apple.screencapture name "自定义前缀"

# 禁用窗口截图的阴影效果
defaults write com.apple.screencapture disable-shadow -bool true

# 禁用浮动缩略图预览
defaults write com.apple.screencapture show-thumbnail -bool false

# 自定义保存位置
defaults write com.apple.screencapture location ~/自定义路径
```

每次修改这些设置后，需要重启系统 UI 服务：

```bash
killall SystemUIServer
```

## 使用技巧

1. **窗口截图**：使用 Command + Shift + 4，按空格键后，移动鼠标到不同窗口，会自动识别窗口边界。
2. **延时截图**：需要截取菜单或其他临时状态时，可以使用工具栏中的延时功能。
3. **录屏技巧**：

   - 录制某个窗口时会自动忽略背景
   - 可以同时录制系统声音和麦克风
   - 状态栏的录制图标可以快速结束录制
4. **标注功能**：截图后的预览缩略图可以直接点击进行标注，支持箭头、文字、马赛克等效果。

## 总结

macOS 的截图工具设计遵循了"简单易用，深度可选"的原则。基础功能简单直接，进阶功能一应俱全。掌握这些技巧后，你会发现 macOS 的截图功能其实非常强大和灵活。无论是日常使用还是专业需求，都能得心应手。
