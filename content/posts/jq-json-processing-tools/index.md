---
title: "jq 处理嵌套 JSON 与命令行 JSON 工具全景"
date: 2025-12-20T11:16:01+04:00
slug: 'jq-json-processing-tools'
draft: false
cover: "https://jiejue.obs.ap-southeast-1.myhuaweicloud.com/20251220111929698.webp"
tags:
  - jq
  - JSON
  - 命令行工具
  - 日志处理
---

日志文件里的 JSON 经常是"套娃"状态——一个 JSON 字段的值是另一个被转义的 JSON 字符串。本文记录如何用 jq 优雅地处理这类场景，并顺带梳理命令行下处理 JSON 的工具生态。

<!--more-->

## 问题场景

某个 MCP server 的日志长这样：

```json
{"result":{"contents":[{"text":"{\"train\":\"G1234\",\"from\":\"北京\"}"}]}}
```

`.text` 字段的值不是 JSON 对象，而是一个被转义的 JSON 字符串。直接用 jq 取出来会带着引号和转义符。

## fromjson：解开套娃

jq 内置的 `fromjson` 函数专门处理这种情况：

```bash
echo '{"text":"{\"name\":\"test\"}"}' | jq '.text | fromjson'
```

输出：

```json
{
  "name": "test"
}
```

实际应用中，配合管道清洗日志：

```bash
cat server.log | tail -1 | jq '.result.contents[0].text | fromjson'
```

如果嵌套JSON本身格式有问题，加 `?` 容错：

```bash
jq '.text | fromjson?' 
```

## jq 的编解码函数家族

`fromjson` 只是 jq 编解码能力的一部分。完整的家族包括：

**JSON 相关**

`fromjson` 将 JSON 字符串解析为对象，`tojson` 则反过来，将对象序列化为 JSON 字符串。`@json` 是 `tojson` 的格式化字符串版本。

```bash
# tojson: 对象 → JSON字符串
echo '{"a":1}' | jq '. | tojson'
# 输出: "{\"a\":1}"

# @json: 同上，用于字符串插值
echo '{"a":1}' | jq '@json'
```

**Base64 编解码**

`@base64` 编码，`@base64d` 解码：

```bash
echo '"hello"' | jq '@base64'
# 输出: "aGVsbG8="

echo '"aGVsbG8="' | jq '@base64d'
# 输出: "hello"
```

**URI 编解码**

`@uri` 对字符串进行 URL 编码：

```bash
echo '"hello world"' | jq '@uri'
# 输出: "hello%20world"
```

**CSV/TSV 格式化**

`@csv` 和 `@tsv` 将数组转为对应格式：

```bash
echo '["a","b","c"]' | jq '@csv'
# 输出: "\"a\",\"b\",\"c\""
```

**HTML/Shell 转义**

`@html` 转义 HTML 特殊字符，`@sh` 生成 shell 安全的引用字符串：

```bash
echo '"<script>"' | jq '@html'
# 输出: "&lt;script&gt;"

echo '"hello world"' | jq '@sh'
# 输出: "'hello world'"
```

## 处理脏日志

真实场景的日志往往不干净。比如日志行末尾混入了调试信息：

```
...}}"}]}} { metadata: undefined }
```

`{ metadata: undefined }` 是 JavaScript 的调试输出，不是合法 JSON。这时需要先清洗再解析：

```bash
cat server.log | tail -1 | sed 's/ { metadata:.*$//' | jq '.result.contents[0].text | fromjson'
```

或者封装成函数复用：

```bash
# fish shell
function parse_mcp_log
    cat $argv[1] | tail -1 | sed 's/ { metadata:.*$//' | jq '.result.contents[0].text | fromjson'
end
```

## 命令行 JSON 工具全景

jq 之外，还有一系列工具各有侧重：

| 工具 | 类型 | 交互模式 | 查询语法 | 输入格式 | 输出格式 | 特点 |
|------|------|----------|----------|----------|----------|------|
| jq | 处理器 | 否 | jq DSL | JSON | JSON/文本 | 管道友好，内置函数丰富，支持流式处理 |
| gron | 转换器 | 否 | grep兼容 | JSON | 路径=值 | 展平JSON为可grep行，`gron -u` 可还原 |
| jless | 浏览器 | 是 | vim风格导航 | JSON/YAML | 只读 | 折叠/展开节点，大文件性能好 |
| fx | 浏览器+处理 | 是 | JavaScript | JSON | JSON/文本 | 可用JS表达式选取数据 |
| jid | 浏览器 | 是 | 增量钻取 | JSON | JSON | 边输入路径边预览结果 |
| yq | 处理器 | 否 | jq DSL | JSON/YAML/XML/TOML | 多格式 | jq的多格式版本 |
| miller | 处理器 | 否 | 自有DSL | JSON/CSV/TSV等 | 多格式 | 面向表格数据，统计聚合能力强 |
| dasel | 选择器 | 否 | 路径语法 | JSON/YAML/TOML/XML/CSV | 多格式 | 统一语法操作多种格式，支持写入 |
| jo | 生成器 | 否 | 命令行参数 | shell参数 | JSON | 快速从shell变量构造JSON |
| jc | 转换器 | 否 | 无 | 命令输出 | JSON | 把 ls, ps, df 等命令输出转成JSON |

选择建议：日常处理用 jq；探索未知结构用 jless 或 jid；需要 grep 定位字段用 gron；处理配置文件用 yq 或 dasel；处理表格数据用 miller。

## 小结

`fromjson` 解决了嵌套 JSON 字符串的解析问题，配合 jq 的其他编解码函数，可以应对日志处理中的大部分格式转换需求。而当 jq 不够直观时，gron、jless 等工具提供了不同的视角来观察和操作 JSON 数据。

工具只是手段，核心是理解数据的结构。当你遇到一个新的日志格式，先用 `head` 或 `tail` 看一眼原始内容，再决定用什么工具组合来处理，往往比直接套用复杂命令更有效。
