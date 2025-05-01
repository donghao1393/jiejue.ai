---
title: "提取和分析日志中的JSON消息"
date: 2025-02-16T20:34:33+04:00
slug: 'extract-json-from-logs'
draft: false
cover: "https://jiejue.obs.ap-southeast-1.myhuaweicloud.com/20250216203652932.webp"
tags:
  - Linux
  - 运维
  - 日志分析
---

在运维工作中，我们经常需要从日志文件中提取和分析特定格式的信息。最近我遇到了这样一个场景：需要从一个包含大量JSON格式消息的日志文件中，提取并统计不同类型的API调用。这篇文章将分享如何使用Linux命令行工具来高效完成这项工作。

<!--more-->

## 问题背景

假设我们有一个微服务系统的日志文件`/var/log/app-server.log`，其中包含了大量类似这样的JSON格式消息：

```
2025-02-15T20:04:25.720Z [AppServer] [info] Message from client: {"method":"resources/list","params":{},"jsonrpc":"2.0","id":1347}
2025-02-15T20:04:25.721Z [AppServer] [info] Message from client: {"method":"prompts/list","params":{},"jsonrpc":"2.0","id":1348}
```

我们的目标是：
1. 从这些日志中提取出所有的JSON消息
2. 将相同类型的API调用（相同的method）归类统计
3. 忽略每次调用不同的id值

## 第一次尝试：简单但不完整

最开始，我们可能会这样尝试：

```bash
cat /var/log/app-server.log | rg 'Message from client' | awk '{print $7}' | sort -u
```

这个命令组合：
- 使用`cat`读取日志文件
- 用`rg`（ripgrep，一个更快的grep）查找包含"Message from client"的行
- 用`awk`提取第7列（JSON内容）
- 用`sort -u`去重

看起来很合理，但这个方法有两个问题：
1. JSON中的id不同会导致实际相同的调用被当作不同的记录
2. 如果日志格式稍有变化，比如JSON内容跨越了多列，`awk`就会提取不完整

## 改进方案：精确提取和统一处理

让我们一步步改进：

首先，使用`rg`的`-o`选项直接提取完整的JSON：

```bash
cat /var/log/app-server.log | rg -o '\{.*\}'
```

`-o`表示只输出匹配的部分，`\{.*\}`会匹配从`{`开始到`}`结束的所有内容。

然后，用`jq`处理JSON，统一处理id：

```bash
cat /var/log/app-server.log | rg -o '\{.*\}' | jq -c '. | .id = 0' | sort -u
```

这里：
- `jq -c`表示输出压缩格式的JSON（每条记录一行）
- `. | .id = 0`将每条记录的id都设为0
- `sort -u`去重

最终我们得到干净的输出：

```json
{"method":"prompts/list","params":{},"jsonrpc":"2.0","id":0}
{"method":"resources/list","params":{},"jsonrpc":"2.0","id":0}
```

## 进一步优化：只看关键信息

如果只想看不同的method，可以这样做：

```bash
cat /var/log/app-server.log | rg -o '\{.*\}' | jq -c '. | .method' | sort -u
```

输出会更简洁：

```
"prompts/list"
"resources/list"
```

## 总结

通过这个实例，我们学会了：
1. 使用`rg -o`精确提取JSON内容
2. 用`jq`进行JSON处理和标准化
3. 使用`sort -u`进行去重统计

这些技巧不仅适用于处理API调用日志，对于任何包含JSON格式数据的日志文件都同样有效。掌握这些命令行工具的组合使用，能够大大提高日志分析的效率。

## 扩展阅读

- [ripgrep文档](https://github.com/BurntSushi/ripgrep/blob/master/GUIDE.md)：了解更多关于ripgrep的高级用法
- [jq手册](https://stedolan.github.io/jq/manual/)：探索jq强大的JSON处理能力
- [Linux文本处理命令](https://linuxhandbook.com/text-processing-commands/)：学习更多文本处理工具
