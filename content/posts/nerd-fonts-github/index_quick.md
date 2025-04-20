---
title: "在GitHub上优雅显示Nerd字体：从实用技巧到哲学思考"
date: 2025-04-20T23:53:54+04:00
slug: 'display-nerd-fonts-on-github'
draft: false
cover: "https://jiejue.obs.ap-southeast-1.myhuaweicloud.com/20250420235634187.webp"
tag:
  - 前端技术
  - 字体设计
  - 开发工具
  - 哲学思考
---

你是否曾在终端里看到过这样炫酷的提示符？

```
FramePack-macos on  main [?] via 🐍 v3.10.16 (env) took 31m27s
󰄛 ❯
```

但当你将命令行截图粘贴到GitHub的issue或PR评论中，那些特殊符号却变成了一个个难看的方块？这篇文章将帮助你解决这个问题，让你的GitHub评论也能完美展示终端里的Nerd字体特殊符号。

<!--more-->

## 问题的本质

在终端中，我们经常使用Nerd字体或Powerline字体来显示各种炫酷的提示符、状态标志和图标。这些字体包含了大量特殊符号，能让你的终端界面更直观、更美观。

然而，当你将终端内容复制到GitHub评论中时，这些特殊符号往往会显示为方块或问号，因为GitHub默认不支持这些特殊字体。

## 快速解决方案

解决这个问题的方法其实很简单：使用自定义CSS将Nerd字体应用到GitHub页面上。以下是具体步骤：

1. **安装Stylus浏览器扩展**
   - Chrome商店或Firefox附加组件商店搜索"Stylus"并安装

2. **添加自定义CSS规则**
   - 点击Stylus扩展图标
   - 选择"创建新样式"
   - 将以下CSS代码粘贴进去：

```css
/* 应用于GitHub评论区和代码块 */
.comment-body pre, .markdown-body pre, .comment-body code, .markdown-body code {
  font-family: "SauceCodePro Nerd Font", "Source Code Pro", monospace !important;
}

/* 覆盖更多可能的代码元素 */
.blob-code, .blob-code-inner {
  font-family: "SauceCodePro Nerd Font", "Source Code Pro", monospace !important;
}
```

3. **设置应用范围和保存**
   - 在"应用于"部分，添加`github.com`
   - 点击左上角的问号图标，输入一个名称如"GitHub Nerd Font"
   - 点击保存按钮

完成这些步骤后，刷新GitHub页面，你的终端截图和代码块中的特殊符号就应该能正常显示了！

## 小贴士与注意事项

- 确保你的系统已安装Nerd字体（例如SauceCodePro Nerd Font）
- 如果某些图标仍然显示不正确，可能需要调整CSS选择器
- 这种方法仅对你自己的浏览器有效，他人查看你的评论时仍可能看到方块
- 可以在CSS中添加备用字体，确保基本可读性

这样一个简单的浏览器插件配置，就能让你在GitHub上完美展示你的终端界面，不再有难看的方块符号打扰你的技术讨论！

下一次，当你需要在issue中分享你的终端输出或错误信息时，它们将以原汁原味的样式呈现，包括所有的特殊图标和符号。
