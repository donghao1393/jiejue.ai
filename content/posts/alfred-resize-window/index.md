---
title: "用Alfred工作流提升macOS生产力：轻松调整应用窗口分辨率"
date: 2025-03-12T19:25:12+04:00
slug: 'boost-macos-productivity-with-alfred-workflows'
draft: false
cover: "https://jiejue.obs.ap-southeast-1.myhuaweicloud.com/20250312192922845.webp"
tag:
  - macOS
  - 生产力
  - Alfred
  - 自动化
  - AppleScript
---

作为macOS的重度用户，你可能已经尝试过各种提升效率的工具和技巧。今天，我想分享一种实用且强大的方法——通过Alfred和AppleScript创建自定义工作流，以解决日常工作中的特定问题。

<!--more-->

## 为什么需要自定义工作流？

尽管macOS内置了许多便捷功能，但仍有一些特定需求无法直接满足。例如，当你需要录制屏幕教程或者截图时，可能希望将应用窗口调整到特定分辨率（比如1920×1080），但macOS并没有提供这样的快捷操作。

这时，Alfred工作流就能派上用场。通过简单的AppleScript脚本，我们可以创建一个强大的工具，用于快速调整任何应用窗口的大小。

## 案例实战：开发窗口分辨率调整工具

### 问题背景

在制作视频教程或截图时，我们经常需要将应用窗口调整为标准的16:9分辨率（如1920×1080）。手动调整既耗时又不精确，特别是当你需要频繁切换不同应用窗口时。

### 解决方案

我们将创建一个名为"Set App Resolution"（简称"sar"）的Alfred工作流，它能够：
1. 列出所有正在运行的应用
2. 选择一个应用后显示常用分辨率选项
3. 一键将选中的应用窗口调整到指定分辨率

### 工作流设计

这个工作流由以下组件构成：
1. 触发关键字（"sar"）
2. 应用列表脚本过滤器
3. 分辨率选项脚本过滤器
4. 执行脚本
5. 通知输出

![工作流结构](https://jiejue.obs.ap-southeast-1.myhuaweicloud.com/20250312193539746.webp)

### 核心代码实现

以下是工作流中各个组件的关键代码：

**1. 应用列表脚本过滤器**

这个脚本获取当前运行的所有应用并以列表形式显示：

```applescript
on run argv
  -- 获取正在运行的应用列表
  tell application "System Events"
    set processList to name of every process where background only is false
  end tell
  
  -- 创建Alfred JSON格式输出
  set json to "{"
  set json to json & "\"items\": ["
  
  set firstItem to true
  repeat with processName in processList
    if not firstItem then
      set json to json & ","
    end if
    set firstItem to false
    
    set json to json & "{"
    set json to json & "\"uid\": \"" & processName & "\","
    set json to json & "\"title\": \"" & processName & "\","
    set json to json & "\"subtitle\": \"选择此应用调整窗口大小\","
    set json to json & "\"arg\": \"" & processName & "\","
    set json to json & "\"variables\": {\"appName\": \"" & processName & "\"}"
    set json to json & "}"
  end repeat
  
  set json to json & "]"
  set json to json & "}"
  
  return json
end run
```

**2. 分辨率选项脚本过滤器**

选择应用后，这个脚本会显示预设的分辨率选项：

```applescript
on run argv
  -- 获取应用名称(从前一步传递)
  set app_name to system attribute "appName"
  
  -- 创建预设分辨率选项
  set json to "{"
  set json to json & "\"items\": ["
  
  -- 1080p选项
  set json to json & "{"
  set json to json & "\"uid\": \"1080p\","
  set json to json & "\"title\": \"1920×1080 (1080p)\","
  set json to json & "\"subtitle\": \"全高清分辨率\","
  set json to json & "\"arg\": \"" & app_name & " 1920 1080\","
  set json to json & "\"variables\": {\"resolution\": \"1920 1080\"}"
  set json to json & "},"
  
  -- 720p选项
  set json to json & "{"
  set json to json & "\"uid\": \"720p\","
  set json to json & "\"title\": \"1280×720 (720p)\","
  set json to json & "\"subtitle\": \"高清分辨率\","
  set json to json & "\"arg\": \"" & app_name & " 1280 720\","
  set json to json & "\"variables\": {\"resolution\": \"1280 720\"}"
  set json to json & "},"
  
  -- 更多分辨率选项...
  
  set json to json & "]"
  set json to json & "}"
  
  return json
end run
```

**3. 执行脚本**

这个脚本实际调整窗口大小：

```applescript
on run argv
  -- 获取完整输入
  set full_input to item 1 of argv
  
  -- 分离应用名和分辨率
  set text item delimiters to " "
  set input_parts to text items of full_input
  
  -- 获取应用名和分辨率参数
  set app_name to item 1 of input_parts
  
  -- 确保至少有3个参数(应用名、宽度、高度)
  if (count of input_parts) < 3 then
    return "错误：参数不足"
  end if
  
  -- 解析宽度和高度
  set width_val to item 2 of input_parts as number
  set height_val to item 3 of input_parts as number
  
  -- 调整窗口大小
  tell application "System Events" to tell process app_name
    set position of window 1 to {0, 0}
    set size of window 1 to {width_val, height_val}
  end tell
  
  return "成功将 " & app_name & " 调整为 " & width_val & "×" & height_val & " 大小"
end run
```

## 使用方法

1. 在Alfred中输入"sar"
2. 从列表中选择要调整的应用
3. 选择一个预设分辨率（或者自定义大小）
4. 应用窗口会立即调整到指定大小

这个简单的工作流可以为内容创作者、开发者和设计师节省大量时间，特别是在需要频繁调整窗口大小的场景中。

![使用演示](https://jiejue.obs.ap-southeast-1.myhuaweicloud.com/20250312193624040.webp)

## 拓展与定制

这个工作流只是展示了Alfred和AppleScript强大功能的一个简单例子。你可以进一步拓展和定制：

1. **添加更多预设尺寸**：根据你的屏幕和常用需求添加更多预设分辨率
2. **记忆位置**：添加功能记住每个应用的上次位置和大小
3. **多显示器支持**：添加在不同显示器间移动窗口的选项
4. **窗口布局**：创建预定义的窗口布局，适用于多应用协同工作

## 为什么这种方法如此强大？

这种自定义工作流的方法有几个关键优势：

1. **高度针对性**：解决的是你实际工作中遇到的具体问题
2. **快速实现**：使用AppleScript，无需深入的编程知识
3. **系统集成**：与macOS无缝集成，无需额外的重型应用
4. **完全自定义**：可以根据个人需求不断调整和改进

## 更多实用工作流创意

除了窗口管理，还有许多其他领域可以应用这种方法：

1. **快速文本处理**：创建自定义文本转换、格式化工作流
2. **文件管理**：批量重命名、移动特定类型文件
3. **网络服务集成**：快速搜索、上传或下载内容
4. **系统管理**：创建快速切换系统设置的工作流

## 结语

在macOS上，真正的生产力提升往往来自于解决那些反复出现但又没有现成解决方案的小问题。Alfred工作流和AppleScript的组合提供了一种简单而强大的方式，让你能够制作专属的自动化工具。

无论你是内容创作者、开发者还是日常的重度macOS用户，学习创建自定义工作流都能让你的工作更加高效。尝试从解决一个具体问题开始，比如本文中的窗口大小调整，然后逐步拓展到其他领域，你会发现自己的macOS使用体验得到质的提升。

开始创建你自己的工作流吧，让重复性工作变得更简单！

## 资源与学习

- [Alfred工作流文档](https://www.alfredapp.com/help/workflows/)
- [AppleScript基础教程](https://developer.apple.com/library/archive/documentation/AppleScript/Conceptual/AppleScriptLangGuide/introduction/ASLR_intro.html)
- [macOS自动化专题](https://www.macstories.net/tag/automation/)
