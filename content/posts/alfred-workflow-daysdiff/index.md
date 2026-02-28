---
title: "告别 Excel：用 Alfred 三秒算出日期差"
date: 2026-02-28T12:23:05+04:00
slug: 'alfred-workflow-daysdiff'
draft: false
cover: "https://jiejue.obs.ap-southeast-1.myhuaweicloud.com/20260228122649477.webp"
tags:
  - macOS
  - Alfred
  - 效率工具
  - Python
---

每次想知道距离某个日期还有多少天，你是不是也要打开 Excel，输入公式 `=DATEDIF(TODAY(), "2026-12-31", "D")`？我决定彻底告别这个繁琐流程。

<!--more-->

## 一个简单的需求

工作中经常需要计算日期差：项目截止还有多少天？签证到期还剩多久？下次休假倒计时多少天？

以前我的做法是打开 Excel，新建一个工作表，输入日期函数。虽然能用，但每次都要经历「打开应用 → 新建文件 → 输入公式 → 查看结果 → 关闭文件」的完整流程。对于一个只需要一个数字的需求来说，这个流程实在太重了。

作为 macOS 用户，我一直在用 Alfred 作为启动器。某天突然想到：能不能让 Alfred 直接帮我算日期差？

答案是肯定的。Alfred 的 Workflow 功能允许用户创建自定义命令，只要写一个简单的 Python 脚本，就能实现「按下快捷键 → 输入日期 → 立即看到结果」的丝滑体验。

## 设计思路

### Alfred Workflow 是什么？

如果你用过 Alfred，应该知道它是一个强大的效率启动器。按下快捷键（默认是 `⌥ Space`），输入关键词就能快速启动应用、搜索文件、进行计算。

Workflow 是 Alfred 的扩展功能，允许你创建自定义的命令流程。一个 Workflow 通常包含：

1. **触发器**（Trigger）：用户如何启动这个功能，比如输入关键词 `dd`
2. **脚本**（Script）：处理用户输入并返回结果的程序
3. **输出**（Output）：如何展示结果，比如显示在 Alfred 界面或复制到剪贴板

### 我想要的功能

我给自己定了几个目标：

- **快速**：输入 `dd 2026-12-31` 就能看到结果
- **灵活**：支持多种日期格式，比如 `3/31/2026`（美式）、`12-31`（省略年份）
- **实用**：按回车后把天数复制到剪贴板，方便粘贴使用
- **包含起始日**：如果今天是周一，距离周三应该是 3 天（周一、周二、周三），而不是 2 天

## 源代码解析

整个 Workflow 只需要两个文件：一个 Python 脚本处理日期计算，一个配置文件告诉 Alfred 如何运行它。

### 核心脚本 daysdiff.py

```python
#!/usr/bin/env python3
import sys
import json
from datetime import datetime, date

def parse_date(date_str):
    """尝试多种格式解析日期"""
    date_str = date_str.strip()
    today = date.today()
    
    formats = [
        "%Y-%m-%d",      # 2026-12-31
        "%Y/%m/%d",      # 2026/12/31
        "%Y.%m.%d",      # 2026.12.31
        "%m/%d/%Y",      # 3/31/2026 (美式)
        "%m-%d-%Y",      # 3-31-2026
        "%m-%d",         # 12-31 (当年)
        "%m/%d",         # 12/31 (当年)
        "%m.%d",         # 12.31 (当年)
        "%d-%m-%Y",      # 31-12-2026 (欧式)
        "%d/%m/%Y",      # 31/12/2026 (欧式)
    ]
    
    for fmt in formats:
        try:
            parsed = datetime.strptime(date_str, fmt).date()
            # 如果格式不包含年份，智能判断使用当年或下一年
            if "%Y" not in fmt:
                parsed = parsed.replace(year=today.year)
                if parsed < today:
                    parsed = parsed.replace(year=today.year + 1)
            return parsed
        except ValueError:
            continue
    
    return None

def main():
    query = sys.argv[1] if len(sys.argv) > 1 else ""
    
    if not query.strip():
        result = {
            "items": [{
                "title": "输入日期计算天数差",
                "subtitle": "支持格式: 2026-12-31, 12/31, 3/31/2026 等",
                "valid": False
            }]
        }
    else:
        target_date = parse_date(query)
        if target_date:
            today = date.today()
            diff = (target_date - today).days + 1  # 包含起始日
            
            if diff > 0:
                title = f"还有 {diff} 天"
                subtitle = f"从今天 ({today}) 到 {target_date}"
            elif diff < 0:
                title = f"已过去 {abs(diff)} 天"
                subtitle = f"从 {target_date} 到今天 ({today})"
            else:
                title = "就是今天！"
                subtitle = f"{target_date}"
            
            result = {
                "items": [{
                    "title": title,
                    "subtitle": subtitle,
                    "arg": str(abs(diff)),
                    "valid": True
                }]
            }
        else:
            result = {
                "items": [{
                    "title": "无法识别日期格式",
                    "subtitle": f"输入: {query} | 试试 2026-12-31 或 12/31",
                    "valid": False
                }]
            }
    
    print(json.dumps(result))

if __name__ == "__main__":
    main()
```

这段代码的核心逻辑很简单：

1. **接收用户输入**：从命令行参数获取用户输入的日期字符串
2. **尝试解析日期**：按预定义的格式列表逐一尝试，直到成功解析
3. **计算天数差**：用目标日期减去今天，再加 1（包含起始日）
4. **返回 JSON**：Alfred 要求脚本输出特定格式的 JSON，包含 `title`（主标题）、`subtitle`（副标题）、`arg`（按回车后传递的值）

### 智能年份判断

注意 `parse_date` 函数中的这段逻辑：

```python
if "%Y" not in fmt:
    parsed = parsed.replace(year=today.year)
    if parsed < today:
        parsed = parsed.replace(year=today.year + 1)
```

当用户输入 `12/31` 这样省略年份的格式时，脚本会智能判断：如果这个日期在今年已经过了，就自动使用明年。比如今天是 2026 年 3 月，输入 `1/15` 会被解析为 2027-01-15。

### 配置文件 info.plist

Alfred Workflow 使用 plist 格式的配置文件。关键配置项包括：

```xml
<key>keyword</key>
<string>dd</string>

<key>script</key>
<string>python3 daysdiff.py "{query}"</string>

<key>scriptargtype</key>
<integer>0</integer>
```

这里有一个重要的坑：`scriptargtype` 的值决定了 Alfred 如何传递用户输入：

- `0` = 替换脚本中的 `{query}` 占位符（**正确**）
- `1` = 追加到命令末尾作为 argv

如果设置错误，用户输入的日期不会被正确传递给脚本，导致功能失效。

## 如何构建 Workflow 包

Alfred Workflow 本质上是一个 `.alfredworkflow` 后缀的 ZIP 压缩包。构建步骤：

```bash
# 进入项目目录
cd ~/projects/daysdiff-workflow

# 打包成 .alfredworkflow 文件
zip -r ~/Downloads/DaysDiff.alfredworkflow info.plist daysdiff.py icon.png
```

打包完成后，双击 `DaysDiff.alfredworkflow` 文件即可导入 Alfred。

## 使用教程

### 安装

1. 确保你已经安装了 [Alfred](https://www.alfredapp.com/) 并购买了 Powerpack（Workflow 功能需要付费版）
2. 下载 `DaysDiff.alfredworkflow` 文件
3. 双击文件，在弹出的对话框中点击 Import

### 日常使用

唤起 Alfred（默认快捷键 `⌥ Space`），输入：

- `dd 2026-12-31` → 显示距离 2026 年最后一天还有多少天
- `dd 3/31/2026` → 美式日期格式
- `dd 12/31` → 省略年份，自动判断是今年还是明年
- `dd 1.15` → 点分隔也可以

看到结果后按回车，天数会自动复制到剪贴板。

### 项目结构

```
daysdiff-workflow/
├── daysdiff.py    # 核心脚本
├── info.plist     # Alfred 配置文件
├── icon.png       # 图标（512x512）
└── icon.svg       # 图标源文件
```

## 开发中的一个小插曲

在调试过程中遇到了一个有趣的问题：脚本在终端里运行正常，但在 Alfred 里总是显示「无法识别日期格式」。

通过添加调试日志发现，Alfred 传递给脚本的参数是字面量 `{query}` 而不是用户实际输入的内容。原来是 `scriptargtype` 设置成了 `1`（argv 模式），而脚本期望的是 `0`（占位符替换模式）。

这个问题的教训是：**当遇到「明明代码没问题但就是不工作」的情况时，先检查配置是否正确传递了输入参数**。在 Alfred 的 Workflow 编辑器中，双击 Script Filter 组件，可以看到一个下拉菜单选择「with input as argv」或「with input as {query}」——确保选择的是后者。

## 小结

从一个「不想再打开 Excel」的念头出发，到一个可以三秒出结果的 Alfred Workflow，整个开发过程大概花了半小时。这就是 macOS 生态的魅力：系统提供了丰富的自动化能力，只要你愿意折腾一下，就能把很多重复性工作变成一键完成。

如果你也有类似的小需求，不妨试试用 Alfred Workflow 来解决。Python 脚本 + JSON 输出，门槛并不高。
