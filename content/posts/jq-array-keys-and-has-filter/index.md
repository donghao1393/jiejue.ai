---
title: "jq 筛选两例：数组值的键名与含指定字段的对象"
date: 2026-10-08T16:18:37+04:00
slug: 'jq-array-keys-and-has-filter'
draft: false
cover: "https://jiejue.obs.ap-southeast-1.myhuaweicloud.com/20261008162211865.webp"
tags:
  - jq
  - JSON
  - 命令行工具
  - 日志处理
---

用 jq 时，最常见的筛选是"值等于什么"——`.level == "error"`、`.status == "active"`，条件写在值上。但还有一类问题，问的不是值，而是**结构**：

- 这个对象里，哪些键的**值是数组**？
- 这一串对象里，哪些**含有某个字段**？

这两种"结构性筛选"写法各有讲究。本文把两条命令拆开揉碎，讲清楚每一步数据在做什么，也顺带聊一个 jq 管道里容易踩的坑。

<!--more-->

## 场景一：找出"值是数组"的键名

假设有一份混杂类型的配置：

```json
{
  "name": "demo-app",
  "tags": ["web", "api"],
  "replicas": 3,
  "envs": ["prod", "staging"],
  "enabled": true
}
```

目标：找出所有"值是数组"的键名，即 `["tags", "envs"]`。

### 一行命令

```bash
jq 'to_entries | map(select(.value | type == "array") | .key)' config.json
```

命令看着有点长，其实只做了三件事。

### 拆解：数据的三次变形

**第一步：`to_entries` 把对象拆成"条目数组"**

对象是"字典"，适合按名字取值，但不适合"对每个键值对做同样的检查"。`to_entries` 把它变成一叠卡片：

```json
[
  { "key": "name", "value": "demo-app" },
  { "key": "tags", "value": ["web", "api"] },
  { "key": "replicas", "value": 3 },
  { "key": "envs", "value": ["prod", "staging"] },
  { "key": "enabled", "value": true }
]
```

每个键值对变成一张 `{key, value}` 卡片。现在可以逐张检查了。

**第二步：`map(select(...))` 逐张筛卡片**

`select` 像一个筛子：条件为真，卡片通过；为假，卡片被丢掉。

条件 `type == "array"` 里，`type` 函数问一个值"你是什么类型"，返回 `"array"`、`"string"`、`"number"`、`"object"` 等。

`select(.value | type == "array")` 读作：**取出这张卡片的 value，问它的类型是不是 "array"**。

这里的竖线值得停一下：`.value | type == "array"` 中，`|` 把左边的结果（卡片的 value）送给右边。所以 `type` 检查的不是整张卡片，而是卡片里的 value——这正是"检查值是数组"的实现。

**第三步：`| .key` 取回键名**

通过筛选的卡片，取它的 `key` 字段。`map` 把每张卡片的处理结果收进一个数组：

```json
["tags", "envs"]
```

### 为什么 `select` 后面还能接 `.key`？

因为 `select` 通过时，输出的是**整张卡片**（原样放行）；被筛掉的卡片输出为空。所以 `select(...) | .key` 只是"在通过筛选的卡片上继续取 key"——被丢掉的卡片自然什么都不产生。

### 变体写法

```bash
# 变体 A：先重建对象，再取所有键
jq 'with_entries(select(.value | type == "array")) | keys'
```

`with_entries` 是 `to_entries` 的逆操作：筛完条目后把数组重建回对象，`keys` 取出所有键。输出：

```json
["envs", "tags"]
```

注意顺序变了：`keys` 会按字母序排序，原始顺序丢失；想保留文档里的原始顺序，用 `keys_unsorted`。

```bash
# 变体 B：逐行输出纯文本
jq -r 'to_entries[] | select(.value | type == "array") | .key'
```

输出：

```
tags
envs
```

`to_entries[]` 直接把条目数组展开成流，逐条处理；`-r`（raw output）去掉 JSON 引号，每行一个键名——适合喂给下游命令或循环。

## 场景二：筛选"含指定字段"的对象

处理 JSONL（每行一个 JSON 对象，比如日志或事件流）时，各行的字段往往不统一：

```jsonl
{"id": "evt-1", "kind": "message", "content": "服务已启动"}
{"id": "evt-2", "kind": "debug", "detail": "cache warmed"}
{"id": "evt-3", "kind": "message", "text": "任务完成"}
```

三行对象，两种"文本载体"字段：`.content` 和 `.text`。目标：把含文本内容的行挑出来。

### `has()`：问对象"有没有这个字段"

`has("字段名")` 检查对象里是否存在某个键：

```bash
jq 'has("text")' events.jsonl
```

对三行数据分别得到 `false`、`false`、`true`。

一个值得记住的细节：`has` 只回答"字段在不在"，不过问它的值是什么。即使值是 `null`，`{"text": null}` 上的 `has("text")` 依然为 `true`。如果要判断"值非空"，写法是 `select(.text != null)` 之类——两者回答的是不同的问题。

### 交集与并集：一个词的差别

```bash
# 两个字段同时拥有（交集）
jq 'select(has("text") and has("content"))' events.jsonl

# 拥有任意一个（并集）
jq 'select(has("text") or has("content"))' events.jsonl
```

拿上面的数据对照：

| 行 | 有 text | 有 content | 交集 | 并集 |
|----|---------|------------|------|------|
| evt-1 | ✗ | ✓ | 淘汰 | 通过 |
| evt-2 | ✗ | ✗ | 淘汰 | 淘汰 |
| evt-3 | ✓ | ✗ | 淘汰 | 通过 |

**交集的结果是空的**——不能说明命令写错了，而是数据里真的没有一行同时带着两个字段。这正好引出下面这个习惯。

### 空结果时：用数据自检

筛选结果为空时，先别怀疑语法，先问一句"数据真的满足条件吗"。逐行打印判定值：

```bash
jq -c '{id, has_text: has("text"), has_content: has("content")}' events.jsonl
```

输出：

```json
{"id":"evt-1","has_text":false,"has_content":true}
{"id":"evt-2","has_text":false,"has_content":false}
{"id":"evt-3","has_text":true,"has_content":false}
```

每行的字段情况一目了然——"交集为空"就有了确凿的数据依据。这比盯着空输出怀疑人生高效得多。

### 从筛选到提取

筛出来往往只是第一步，真正的目标是"把两类字段收拢成统一结构"：

```bash
# 收集成对象，缺失的字段为 null
jq '{text: .text, content: .content}' events.jsonl

# jq 1.7+ 的等价写法
jq 'pick(.text, .content)' events.jsonl
```

如果目标是**拿到纯文本**，最实用的是一条龙"筛选 + 提取"：

```bash
jq -r 'select(has("text") or has("content")) | .text // .content' events.jsonl
```

输出：

```
服务已启动
任务完成
```

`//` 是"备选"运算符：左边为 `null` 或 `false` 时改用右边。整条的读法是——**先挑出含任一字段的行，再"优先取 text，没有就取 content"**。

## 一个共同的坑：管道里，`.` 会变

两种用法里都出现了 `.value | type == "array"` 这样的写法。要真正吃透它们，必须掌握 jq 管道的一条核心规则：

**`|` 会替换右侧表达式里的 `.`。**

`.value | 右侧` 中，右侧的 `.` 已经不是原来的对象，而是 `.value` 的结果。单独看很顺，一旦场景变复杂——比如筛选"数组元素中还含某字段"的条目——就容易写出这种命令：

```bash
# ❌ 错误写法
jq 'to_entries | map(select(.value | type == "array" and any(.value[]; has("text"))) | .key)'
```

表面逻辑没问题："value 是数组，且数组元素中存在含 text 的"。但对 `{"tags": [{"text": "a"}]}` 运行会直接报错：

```
jq: error (at <stdin>:1): Cannot index array with string "value"
```

原因：`.value |` 之后，`.` 已经是那个数组。`any(.value[]; ...)` 里的 `.value` 相当于在问**数组**"你的 value 字段是什么"——数组没有字段，立刻报错。

正确写法是让生成器直接迭代"当前值"的元素——`.[]`：

```bash
# ✅ 写法一：管道之后，.[] 即数组元素
jq 'to_entries | map(select(.value | type == "array" and any(.[]; has("text"))) | .key)'
```

或者干脆不降层，把类型判断放在条目层面完成：

```bash
# ✅ 写法二：比较表达式写在同一上下文
jq 'to_entries | map(select((.value | type) == "array" and any(.value[]; has("text"))) | .key)'
```

两种写法对上面的数据都输出：

```json
["tags"]
```

**记法**：写下 `|` 时多问一句——"现在 `.` 是谁？"过了管道，所有路径都相对于新输入重新起算。

## 小结

把两个场景并排放，会发现它们是同一类问题的两种形态——**对数据结构的提问**：

| 问的问题 | 钥匙 | 典型命令 |
|---------|------|---------|
| 哪些键的值是数组？ | `type` | `to_entries \| map(select(.value \| type == "array") \| .key)` |
| 哪些对象含某字段？ | `has` | `select(has("text") or has("content"))` |

配套记住三件事：

1. **`to_entries` / `with_entries`** 是对象与条目数组之间的桥——要在对象上"逐条检查"，先过桥；
2. **`select` 是筛子**——通过则原样放行（所以后面能接着 `.key`），不通过则输出空；
3. **管道会替换 `.`**——写复杂条件前，先确认"现在 `.` 是谁"。

你写 jq 时有没有遇到过"命令看着没毛病、结果却为空"的情况？最后是怎么找到原因的？
