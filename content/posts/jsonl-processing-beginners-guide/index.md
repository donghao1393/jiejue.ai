---
title: "JSONL 文件处理入门：jq、gron、jless 三剑客"
date: 2025-12-26T22:39:24+04:00
slug: 'jsonl-processing-beginners-guide'
draft: false
cover: "https://jiejue.obs.ap-southeast-1.myhuaweicloud.com/20251226224541969.webp"
tags:
  - 命令行
  - JSON
  - 开发工具
---

如果你刚开始学编程，可能会遇到一种叫 JSONL 的文件格式。这篇文章会用最简单的方式，带你认识三个处理它的工具。

<!--more-->

## 先搞懂：JSON 和 JSONL 是什么？

想象你有一个通讯录。JSON 就像是把整个通讯录写成一种特定格式：

```json
{
  "contacts": [
    {"name": "小明", "phone": "123"},
    {"name": "小红", "phone": "456"}
  ]
}
```

这是一个完整的"包裹"，用花括号 `{}` 把所有内容包起来。

而 JSONL（JSON Lines）不一样。它把每个联系人单独写一行，不需要外面的"包裹"：

```
{"name": "小明", "phone": "123"}
{"name": "小红", "phone": "456"}
```

每一行都是独立的、完整的 JSON。就像图书馆的索引卡片，一张一张分开放，而不是订成一本书。

这种格式特别适合记录日志或者流式数据。比如你用某个软件，它可能会把你的每次操作都记成一行，最后形成一个 JSONL 文件。

## 为什么需要专门的工具？

你可能会想：用记事本打开不就行了？

问题是，真实的 JSONL 文件往往有几千甚至几万行，每行的结构还很复杂，嵌套好几层。用眼睛看根本看不过来。

这就像面对一个巨大的仓库，里面堆满了贴着标签的箱子，箱子里还有小箱子。你需要工具来帮你快速找到想要的东西。

接下来介绍的三个工具，就是帮你处理这个"仓库"的：

- **jq**：程序化处理，像是一个能听懂指令的机器人，你告诉它筛选条件，它帮你找
- **gron**：把复杂结构"压扁"，让你能用最简单的搜索功能来找东西
- **jless**：可视化浏览，像是给你一个带放大镜的地图

## jq：命令行里的 JSON 瑞士军刀

jq 是最常用的 JSON 处理工具。安装方式因系统而异，macOS 用 `brew install jq`，Ubuntu 用 `apt install jq`。

最基础的用法是格式化显示：

```bash
cat file.jsonl | jq .
```

这会把压缩成一行的 JSON 变成易读的缩进格式。管道符号 `|` 的意思是"把左边的输出，送给右边处理"。

对于 JSONL 文件，有几个特别实用的操作。

**按行号选择**：假如你只想看第一行：

```bash
head -n 1 file.jsonl | jq .
```

`head -n 1` 取第一行，然后交给 jq 格式化。想看最后一行就用 `tail -n 1`。

**按内容过滤**：假如每行都有个 `type` 字段，你只想要 `type` 等于 `message` 的：

```bash
cat file.jsonl | jq 'select(.type == "message")'
```

`select()` 就像一个筛子，只让符合条件的数据通过。

**把所有行变成数组**：这是处理 JSONL 的一个重要技巧：

```bash
cat file.jsonl | jq -s '.'
```

`-s` 参数（slurp，意思是"吸入"）会把所有行合并成一个数组。这样你就可以用索引来访问了：

```bash
cat file.jsonl | jq -s '.[0]'   # 第一个（索引从0开始）
cat file.jsonl | jq -s '.[-1]'  # 最后一个
cat file.jsonl | jq -s '.[1:4]' # 第2到第4个（作为数组返回）
cat file.jsonl | jq -s '.[2,4]' # 第3个和第5个（分别输出，不是数组）
```

## gron：把 JSON 压扁成可搜索的文本

gron 的思路很独特。它把嵌套的 JSON 结构变成一行一行的赋值语句：

```bash
echo '{"user": {"name": "小明", "age": 18}}' | gron
```

输出：

```
json = {};
json.user = {};
json.user.age = 18;
json.user.name = "小明";
```

看到了吗？每个值的完整路径都清清楚楚。这有什么用？

当你面对一个结构未知的巨大 JSON，想找某个值藏在哪里，gron 配合 grep 就是神器：

```bash
cat huge.json | gron | grep "error"
```

假如输出是 `json.response.data.items[3].error = "timeout";`，你立刻就知道这个 error 藏在哪个位置。用 jq 要猜半天。

不过 gron 有个坑：它不直接支持 JSONL 格式。你需要先把 JSONL 转成数组：

```bash
cat file.jsonl | jq -s '.' | gron | grep "something"
```

这里 `jq -s '.'` 先把多行合并成数组，然后 gron 才能正确处理。

## jless：交互式的 JSON 浏览器

jless 是一个终端里的交互式查看器。你可以用键盘上下移动、展开折叠节点，像在文件管理器里浏览文件夹一样浏览 JSON 结构。

```bash
cat file.json | jless
```

它用起来有点像 Vim 编辑器。常用的键：

- `j/k`：上下移动
- `h/l`：折叠/展开
- `/`：搜索
- `y`：复制当前节点的路径

当你拿到一个完全陌生的 JSON 文件，不知道里面有什么结构，jless 比反复试 `jq '.foo.bar'` 高效得多。你可以先用 jless 浏览，找到目标位置，复制路径，再用 jq 来提取。

## 什么时候用什么工具？

经过实际使用，我总结出这样的分工：

**用 jq 的场景**：写脚本自动化处理、提取特定字段、过滤数据、转换格式。它是"干活"的主力。

**用 gron 的场景**：结构复杂、不知道值藏在哪里、需要用简单的文本搜索来定位。它是"找东西"的侦探。

**用 jless 的场景**：拿到陌生文件、需要先了解整体结构、交互式探索。它是"看地图"的向导。

这三个工具不是互相替代的关系，更像是厨房里的不同厨具——菜刀、削皮器、开瓶器各有各的用处。

## 动手试试

如果你手边有个 JSONL 文件，可以试试这几个命令：

```bash
# 看看有多少行
wc -l file.jsonl

# 格式化显示前三行
head -n 3 file.jsonl | jq .

# 用 jless 浏览（按 q 退出）
cat file.jsonl | jq -s '.' | jless

# 用 gron 找特定内容
cat file.jsonl | jq -s '.' | gron | grep "你要找的内容"
```

工具只有用起来才能真正掌握。遇到问题的时候，记得查看各自的帮助文档：`jq --help`、`gron --help`、`jless --help`。

你平时处理 JSON 数据最头疼的是什么问题？
