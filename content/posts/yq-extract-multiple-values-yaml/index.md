---
title: "yq 多路径取值：从 YAML 中精准提取你需要的数据"
date: 2026-02-05T20:01:50+04:00
slug: 'yq-extract-multiple-values-yaml'
draft: false
cover: "https://jiejue.obs.ap-southeast-1.myhuaweicloud.com/20260205200354233.webp"
tags:
  - yq
  - YAML
  - 命令行工具
  - DevOps
---

YAML 配置文件往往层级复杂，而我们常常只需要其中几个特定的值。`yq` 提供了灵活的语法，让你能从不同层级、不同父节点中一次性提取所需数据。

<!--more-->

## 基础：逗号分隔多路径

最直接的方式是用逗号分隔多个路径选择器。假设有这样一个配置文件 `config.yaml`：

```yaml
server:
  host: localhost
  port: 8080
  timeout: 30

database:
  host: db.example.com
  port: 5432
  max_connections: 100

cache:
  ttl: 3600
  max_size: 1024
```

要同时获取服务器端口、数据库最大连接数和缓存 TTL：

```bash
yq '.server.port, .database.max_connections, .cache.ttl' config.yaml
```

输出三个值，按路径顺序排列：

```
8080
100
3600
```

## 保留键名：对象构造语法

纯值输出有时不够清晰。如果想让输出保留键名，形成一个新的 YAML 对象：

```bash
yq '{
  port: .server.port,
  max_connections: .database.max_connections,
  cache_ttl: .cache.ttl
}' config.yaml
```

输出：

```yaml
port: 8080
max_connections: 100
cache_ttl: 3600
```

这种方式适合需要将提取结果传递给下游处理、或者输出结果需要自描述的场景。

## 批量选取：pick() 函数

当需要从同一个父节点下选取多个子节点时，逐个列出路径会显得冗长。`pick()` 函数可以简化这个过程：

```bash
yq '.database | pick(["host", "port", "max_connections"])' config.yaml
```

输出：

```yaml
host: db.example.com
port: 5432
max_connections: 100
```

`pick()` 接受一个键名数组，返回只包含这些键的子对象。

## 跨父节点合并：* 操作符

实际场景中，我们需要的数据往往分散在不同父节点下。这时可以对多个 `pick()` 结果使用 `*` 操作符进行合并：

```bash
yq '
  (.server | pick(["port", "timeout"])) *
  (.database | pick(["max_connections"])) *
  (.cache | pick(["ttl"]))
' config.yaml
```

输出：

```yaml
port: 8080
timeout: 30
max_connections: 100
ttl: 3600
```

`*` 是对象合并操作符。如果存在键冲突，右侧的值会覆盖左侧。

## 处理空值：// 操作符

真实配置文件中，某些节点可能不存在或为 null。直接对 null 调用 `pick()` 会报错：

```
Error: cannot pick indices from type !!null
```

解决方案是使用 `//` 空值合并操作符，提供一个默认的空对象：

```bash
yq '
  (.server | pick(["port"])) *
  ((.optional_section // {}) | pick(["some_key"]))
' config.yaml
```

`// {}` 的含义是：如果左侧为 null 或不存在，则返回空对象 `{}`。这样 `pick()` 就不会报错，只是结果中不会包含那个键。

## 实战：从 Kubernetes ConfigMap 提取嵌套配置

一个典型的 DevOps 场景：ConfigMap 中存储着 YAML 格式的应用配置，我们需要从中提取特定参数。

```bash
kubectl get cm my-app-config -o yaml | yq '
  .data["app_config.yaml"] | from_yaml |
  (.polling | pick(["interval", "timeout"])) *
  ((.retry // {}) | pick(["max_attempts", "backoff"]))
'
```

这个命令做了几件事：

1. 从 ConfigMap 的 `.data["app_config.yaml"]` 取出存储的 YAML 字符串
2. 用 `from_yaml` 将字符串解析为 YAML 结构
3. 从 `polling` 节点选取 `interval` 和 `timeout`
4. 从 `retry` 节点（如果存在）选取 `max_attempts` 和 `backoff`
5. 合并两个结果

## 小结

| 需求 | 语法 |
|------|------|
| 取多个独立路径的值 | `.a.b, .c.d, .e.f` |
| 取值并构造新对象 | `{key1: .a.b, key2: .c.d}` |
| 从同一父节点批量选取 | `.parent \| pick(["key1", "key2"])` |
| 合并多个父节点的选取结果 | `(.a \| pick([...])) * (.b \| pick([...]))` |
| 处理可能为空的节点 | `((.maybe_null // {}) \| pick([...]))` |

掌握这些组合技巧，就能从复杂的 YAML 配置中精准提取所需数据，避免手动解析或编写临时脚本。
