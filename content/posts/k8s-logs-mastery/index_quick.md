---
title: "Kubernetes 日志查询实战：5分钟掌握运维必备技能"
date: 2025-11-22T15:18:46+04:00
slug: 'k8s-logs-quick-guide'
draft: false
cover: "https://jiejue.obs.ap-southeast-1.myhuaweicloud.com/20251122152550891.webp"
tags:
  - Kubernetes
  - DevOps
  - 日志分析
  - 运维
---

运维工程师小李今天早上接到告警：生产环境的订单服务从早上6点开始出现异常。他需要快速查看日志找出问题，但面对几十个容器实例，该如何高效地获取关键信息呢？

这篇文章将手把手教你如何用 `kubectl logs` 命令精准获取你需要的日志，无论是排查故障还是日常巡检，都能游刃有余。

<!--more-->

## 你会遇到的真实场景

想象一下这些情况：

- **故障排查**：凌晨2点被叫醒，需要快速定位问题日志
- **性能分析**：查看某个时间段的访问日志，分析流量峰值
- **多实例追踪**：你的服务部署了10个副本，需要同时查看所有实例的日志
- **容器重启**：Pod 重启了，需要看重启前发生了什么

## 基础命令：最简单的日志查看

```bash
# 查看某个 Pod 的日志
kubectl logs my-app-pod

# 如果你在特定的命名空间（namespace）
kubectl logs -n production my-app-pod
```

**实际应用**：当你知道具体是哪个 Pod 出问题时，这是最直接的方式。

## 按时间过滤：找到关键时间点的日志

### 场景1：查看从今天早上6点开始的所有日志

```bash
kubectl logs my-app-pod \
  --since-time="2025-11-22T06:00:00Z" \
  --timestamps
```

**解释**：
- `--since-time`：指定开始时间（注意用 UTC 时区，后面的 `Z` 表示零时区）
- `--timestamps`：在每条日志前显示时间戳，方便定位

**时区转换小贴士**：如果你在北京时间早上6点，对应的 UTC 时间是前一天晚上10点（22:00）。

### 场景2：查看最近2小时的日志

```bash
kubectl logs my-app-pod --since=2h --timestamps
```

这种相对时间的方式更简单，常用的时间单位：
- `5m`：5分钟
- `2h`：2小时  
- `1d`：1天

## 批量查询：一次看所有相关容器的日志

### 场景3：通过标签选择器查看所有实例

```bash
kubectl logs -l app=order-service --timestamps
```

**实际案例**：订单服务有10个副本在运行，使用 `-l`（label selector）可以一次性获取所有实例的日志。

### 场景4：查看所有容器（包括边车容器）

```bash
kubectl logs my-app-pod \
  --all-containers=true \
  --prefix=true
```

**解释**：
- `--all-containers`：获取 Pod 中所有容器的日志（如果你的 Pod 里有多个容器）
- `--prefix`：在每行日志前加上容器名称，便于区分

## 查看历史：重启前发生了什么

### 场景5：查看上一次容器的日志

```bash
kubectl logs my-app-pod --previous
```

**关键用途**：当容器因为 OOM（内存不足）或崩溃重启时，需要查看重启前的日志来定位问题。

## 控制输出量：避免日志洪水

### 场景6：只看最后100行日志

```bash
kubectl logs my-app-pod --tail=100
```

### 场景7：实时跟踪日志（类似 tail -f）

```bash
kubectl logs my-app-pod -f
```

按 `Ctrl+C` 可以停止跟踪。

## 组合技：解决复杂问题

### 实战案例：排查早上6点开始的支付异常

```bash
# 步骤1：查看支付服务所有实例从6点开始的日志
kubectl logs -n production \
  -l app=payment-service \
  --since-time="2025-11-22T06:00:00Z" \
  --timestamps \
  --all-containers=true \
  --prefix=true > payment_logs.txt

# 步骤2：在日志中搜索错误信息
grep -i "error\|exception" payment_logs.txt

# 步骤3：如果有重启，查看重启前的日志
kubectl get pods -n production -l app=payment-service
kubectl logs -n production payment-service-abc123 --previous
```

## 常见陷阱与注意事项

### 陷阱1：时区混淆

❌ 错误：用本地时间查询 UTC 时间
```bash
# 如果你在东八区（北京时间），想查早上8点的日志
# 错误方式：
--since-time="2025-11-22T08:00:00Z"  # 这会查到下午4点的日志！
```

✅ 正确：转换为 UTC 时间
```bash
# 北京时间早上8点 = UTC时间凌晨0点
--since-time="2025-11-22T00:00:00Z"
```

### 陷阱2：日志轮转导致历史数据丢失

Kubernetes 有日志大小限制，过早的日志可能已被清理。如果需要长期保存日志，应该使用日志收集系统（如 ELK、Loki）。

### 陷阱3：多 Pod 日志混在一起

使用标签选择器时，多个 Pod 的日志会混合输出。建议：
1. 加上 `--prefix=true` 区分来源
2. 或者重定向到文件后再分析

## 快速参考卡片

| 需求 | 命令参数 |
|------|---------|
| 指定开始时间 | `--since-time="2025-11-22T06:00:00Z"` |
| 相对时间范围 | `--since=2h` |
| 显示时间戳 | `--timestamps` |
| 通过标签批量查询 | `-l app=myapp` |
| 查看所有容器 | `--all-containers=true` |
| 区分容器来源 | `--prefix=true` |
| 查看重启前日志 | `--previous` |
| 限制输出行数 | `--tail=100` |
| 实时跟踪 | `-f` |

## 下一步

掌握这些基础命令后，你已经可以应对大部分日常运维场景。如果你想了解：

- 日志查询的底层原理
- 如何优化大规模集群的日志查询
- 日志收集系统的设计

可以参考《Kubernetes 日志查询深度解析》。

---

**小贴士**：建议把常用命令保存成 shell 脚本或别名（alias），提高效率。例如：

```bash
# 添加到 ~/.bashrc 或 ~/.zshrc
alias klogs-prod='kubectl logs -n production --timestamps'
alias klogs-recent='kubectl logs --since=1h --timestamps'
```

这样每次只需要输入 `klogs-prod pod-name` 就能快速查询了。
