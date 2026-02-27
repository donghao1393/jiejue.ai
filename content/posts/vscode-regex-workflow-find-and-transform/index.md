---
title: "在 VS Code 里把正则替换变成一键工作流"
date: 2026-02-27T23:40:04+04:00
slug: 'vscode-regex-workflow-find-and-transform'
draft: false
cover: "https://jiejue.obs.ap-southeast-1.myhuaweicloud.com/20260227234348703.webp"
tags:
  - VS Code
  - 正则表达式
  - 效率工具
---

你有没有遇到过这样的场景：从某个系统导出的文本，格式乱七八糟，需要连续做好几步正则查找替换才能整理成想要的样子？比如先把转义的 `\n` 变成真正的换行，再把转义的引号还原，最后用正则提取出关键字段——每次都要手动重复这套流程，烦不胜烦。

<!--more-->

VS Code 的查找替换功能本身很强大，但它是"一次性"的——你没办法把一组操作保存下来反复调用。今天介绍一个扩展 **Find and Transform**，它能让你把多步正则替换定义成"工作流"，一键执行。

## 安装

在 VS Code 扩展市场搜索 `Find and Transform`（扩展 ID：`arturodent.find-and-transform`），安装即可。这是一个[开源项目](https://github.com/ArturoDent/find-and-transform)，作者维护得相当活跃。

## 核心概念

这个扩展的思路很简单：你在 `settings.json` 里定义一组有序的查找替换规则，每组规则注册为一个独立的命令，可以通过命令面板（`Cmd+Shift+P` / `Ctrl+Shift+P`）调用，也可以绑定快捷键。

`find` 和 `replace` 都支持数组，数组中的每一对按顺序依次执行——这就是"工作流"的含义。

## 第一个工作流：清理 JSON 转义文本

假设你经常要处理这样的文本——从 API 响应或日志里复制出来的 JSON 字符串值，里面满是 `\n` 和 `\"`：

```
"这是第一行\\n这是第二行\\n他说\\\"你好\\\""
```

你想把它还原成可读的文本。打开 `settings.json`（`Cmd+Shift+P` → `Preferences: Open User Settings (JSON)`），加入：

```json
"findInCurrentFile": {
    "cleanJsonEscape": {
        "title": "Clean JSON Escaped Text",
        "find": ["\\n", "\\\""],
        "replace": ["\n", "\""],
        "isRegex": false
    }
}
```

这里定义了两步操作：

1. 把字面的 `\n`（两个字符）替换成真正的换行符
2. 把字面的 `\"` 替换成 `"`

注意 `isRegex` 设为 `false`——这个场景不需要正则，纯字面替换即可。这一点很重要：如果设成 `true`，JSON 层和正则层的转义会叠加，导致实际匹配的内容和你预期的不一样。

## 注册命令的"双重 Reload"机制

保存 `settings.json` 后，你可能会发现在命令面板里搜不到刚定义的命令。这不是 bug，而是这个扩展的注册机制决定的。

它的工作原理：扩展激活时读取你的 settings，然后把命令**写入扩展自身的 `package.json`**。而 VS Code 的命令面板是根据 `package.json` 来注册命令的，读取发生在扩展激活**之前**。所以时序上：

1. **第一次 Reload**：扩展激活 → 读取 settings → 写入 `package.json`（但命令面板已加载完毕）
2. **第二次 Reload**：VS Code 读到更新后的 `package.json` → 命令注册成功

所以每次新增或修改工作流后，执行两次 `Cmd+Shift+P` → `Developer: Reload Window`。之后在命令面板搜索 `Find-Transform: Clean JSON Escaped Text` 就能找到了。

## 调用方式

有两种调用方式。

**命令面板**：`Cmd+Shift+P`，输入你定义的 `title`（比如 `Clean JSON`），点击执行。

**快捷键**：在 `keybindings.json` 里绑定：

```json
{
    "key": "ctrl+shift+r",
    "command": "findInCurrentFile.cleanJsonEscape"
}
```

命令格式是 `findInCurrentFile.` 加上你在 settings 里定义的 key 名。绑定快捷键后不需要再 reload。

## 进阶：用正则提取结构化数据

来看一个更实际的例子。假设你有一份银行对账单的文本，格式大概长这样：

```
09/01 NETFLIX SUBSCRIPTION 15.99
RECURRING PAYMENT
09/01 GROCERY STORE 128.50
09/02 COFFEE SHOP DOWNTOWN 4.75
CARD ENDING 1234
09/03 ELECTRICITY BILL 89.00 CR
```

你想把它整理成 tab 分隔的表格格式，方便粘贴到电子表格里。问题是交易记录之间混杂着无关的描述行（如"RECURRING PAYMENT"、"CARD ENDING 1234"），需要先清除再提取。

```json
"extractBankStatement": {
    "title": "Extract Bank Statement to TSV",
    "find": ["\\n^([^0-9])", "^([0-9/]+) (.*?) ([0-9.]+( CR)?)$"],
    "replace": ["$1", "$${ return `$1\\t$2\\t$3`; }$$"],
    "isRegex": true
}
```

这里有两步：

**第一步** `\n^([^0-9])` → `$1`：找到换行符后紧跟非数字字符的位置，把换行符吃掉——效果是把描述行合并到上一行末尾。这样"RECURRING PAYMENT"就会拼接到上一条交易的末尾，不再单独占行。

**第二步** `^([0-9/]+) (.*?) ([0-9.]+( CR)?)$` → tab 分隔的三列：日期、描述、金额。

注意 replace 里用了 `$${ return \`$1\\t$2\\t$3\`; }$$`——这是 Find and Transform 支持的 JavaScript 表达式语法。之所以要用它，是因为 VS Code 查找替换的 replace 字段不支持 `\t` 转义。用反引号包裹的模板字符串里，`\\t` 才会被正确解释为 tab 字符。

执行后你会得到：

```
09/01	NETFLIX SUBSCRIPTION RECURRING PAYMENT	15.99
09/01	GROCERY STORE	128.50
09/02	COFFEE SHOP DOWNTOWN CARD ENDING 1234	4.75
09/03	ELECTRICITY BILL	89.00 CR
```

直接粘贴到 Excel 或 Google Sheets 就是三列。

## `isRegex` 的选择

一个容易踩的坑：`isRegex` 对整个工作流生效，不能对数组里的每一步单独设置。如果你的工作流里混合了字面替换和正则替换，有两个选择——要么把字面替换改写成正则写法（比如用 `\\n` 匹配字面的反斜杠 n），要么拆成两个独立的工作流分别调用。

## 多个工作流的组织

所有工作流都定义在 `findInCurrentFile` 这个 key 下，每个工作流是一个独立的子 key：

```json
"findInCurrentFile": {
    "cleanJsonEscape": {
        "title": "Clean JSON Escaped Text",
        "find": ["\\n", "\\\""],
        "replace": ["\n", "\""],
        "isRegex": false
    },
    "extractBankStatement": {
        "title": "Extract Bank Statement to TSV",
        "find": ["\\n^([^0-9])", "^([0-9/]+) (.*?) ([0-9.]+( CR)?)$"],
        "replace": ["$1", "$${ return `$1\\t$2\\t$3`; }$$"],
        "isRegex": true
    }
}
```

每新增一个工作流，记得双重 Reload。

## 还能做什么

Find and Transform 远不止多步替换。它还支持在 replace 里写 JavaScript 表达式做数学运算或字符串操作、用 VS Code 的 snippet 变量（如 `${CURRENT_YEAR}`）插入动态内容、限制替换范围只在选区内执行（`restrictFind: selections`）、替换后自动移动光标到指定位置（`cursorMoveSelect`）、以及保存时自动执行某些规则（`codeActionsOnSave`）。

如果你的需求超出了编辑器内操作——比如要批量处理几十个文件——那 `sd`（一个更现代的 `sed` 替代品）配合 shell 脚本可能更合适。但对于日常在编辑器里反复执行的格式清理任务，把它封装成一个命令面板里的一键操作，是个值得花五分钟设置的事情。
