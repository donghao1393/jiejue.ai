---
title: "Kubernetes 资源审计实战：从命令行到 YAML 的完整排查指南"
date: 2025-12-15T17:36:24+04:00
slug: 'k8s-pod-resource-inspection-deep'
draft: false
cover: "https://jiejue.obs.ap-southeast-1.myhuaweicloud.com/20251215180034101.webp"
tags:
  - Kubernetes
  - DevOps
  - 资源管理
  - 集群运维
---

在生产环境中，资源配置的可见性直接决定了容量规划和故障排查的效率。本文系统梳理 Kubernetes 中查看 Pod 资源配置的各种方法，从简单的命令行查询到复杂的 JSONPath 表达式，覆盖日常运维和自动化脚本的需求。

<!--more-->

## 资源模型回顾

Kubernetes 的资源模型围绕两个核心概念构建：

**Requests** 是调度器的承诺——Pod 声明"我至少需要这么多资源才能正常运行"，调度器据此选择有足够空闲资源的节点。如果一个节点的可分配资源（Allocatable）减去已调度 Pod 的 requests 总和小于新 Pod 的 requests，该节点就不会被选中。

**Limits** 是 kubelet 的执行边界——容器运行时（如 containerd）会配置 cgroups 来强制执行这个上限。CPU 超限会被节流（throttling），内存超限会触发 OOM Killer。

理解这个区别很重要：requests 影响调度决策，limits 影响运行时行为。一个 Pod 可以只设 requests 不设 limits（允许 burst），也可以只设 limits 不设 requests（requests 默认等于 limits），但生产环境通常建议两者都设。

## 方法一：custom-columns 快速概览

最直接的批量查看方式：

```bash
kubectl get pods -A -o custom-columns="\
NAMESPACE:.metadata.namespace,\
POD:.metadata.name,\
CPU_REQ:.spec.containers[*].resources.requests.cpu,\
CPU_LIM:.spec.containers[*].resources.limits.cpu,\
MEM_REQ:.spec.containers[*].resources.requests.memory,\
MEM_LIM:.spec.containers[*].resources.limits.memory"
```


这个命令同时展示 requests 和 limits，适合快速扫描哪些 Pod 缺少配置。`[*]` 通配符会聚合 Pod 中所有容器的值（多容器 Pod 的值用逗号分隔）。

## 方法二：JSONPath 精确提取

当需要在脚本中处理输出时，JSONPath 更可控：

```bash
kubectl get pods -A -o jsonpath='{range .items[*]}{.metadata.namespace}{"\t"}{.metadata.name}{"\t"}{.spec.containers[0].resources.limits.cpu}{"\t"}{.spec.containers[0].resources.limits.memory}{"\n"}{end}'
```

注意这里用了 `containers[0]`，只取第一个容器。如果需要遍历所有容器，可以嵌套 range：

```bash
kubectl get pods -A -o jsonpath='{range .items[*]}{range .spec.containers[*]}{..metadata.namespace}{"\t"}{..metadata.name}{"\t"}{.name}{"\t"}{.resources.limits.cpu}{"\t"}{.resources.limits.memory}{"\n"}{end}{end}'
```

## 方法三：describe 查看完整上下文

当需要理解单个 Pod 的完整资源配置及其运行状态时：

```bash
kubectl describe pod <pod-name> -n <namespace>
```

输出中的 `Containers` 部分会展示每个容器的 Limits 和 Requests，同时还能看到 QoS Class（Guaranteed / Burstable / BestEffort）——这是 Kubernetes 根据资源配置自动推断的服务质量等级，影响 OOM 时的优先级。

## 方法四：kubectl top 查看实际使用量

如果集群部署了 metrics-server，可以查看实时资源消耗：

```bash
kubectl top pods -A
kubectl top pods -A --containers  # 按容器拆分
```

对比 `top` 的实际使用量和 `get` 的配置值，可以发现资源配置是否合理：实际使用远低于 requests 说明过度预留，接近 limits 说明可能需要扩容。

## 方法五：节点视角的资源汇总

从节点角度查看资源分配情况：

```bash
kubectl describe node <node-name>
```


输出中的 `Allocated resources` 部分汇总了该节点上所有 Pod 的 requests 总和及其占节点可分配资源的百分比。这对识别资源碎片化（单个节点剩余资源不足以调度任何新 Pod）很有帮助。

## YAML 配置参考

在 Deployment 或 Pod spec 中，资源配置的结构如下：

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-server
spec:
  template:
    spec:
      containers:
      - name: api
        image: myapp:latest
        resources:
          requests:
            cpu: "250m"
            memory: "256Mi"
          limits:
            cpu: "1000m"
            memory: "1Gi"
```

一些经验法则：limits 通常设为 requests 的 2-4 倍，允许短暂 burst；对于延迟敏感的服务，可以让 limits 等于 requests 以获得 Guaranteed QoS；批处理任务可以只设 requests 让它利用空闲资源。

## 集群级别的资源策略

单纯查看 Pod 配置不够，还需要了解集群是否有强制策略：

**LimitRange** 为命名空间设置默认值和边界：

```bash
kubectl get limitrange -A
kubectl describe limitrange <name> -n <namespace>
```

**ResourceQuota** 限制命名空间的资源总量：

```bash
kubectl get resourcequota -A
kubectl describe resourcequota <name> -n <namespace>
```

如果某个 Pod 没有显式设置 resources，但 LimitRange 存在，Pod 会继承 LimitRange 的默认值。这解释了为什么有时 `kubectl get` 看到的值和 YAML 文件里写的不一样。

## 自动化脚本示例

一个实用的巡检脚本，找出所有没有设置 limits 的 Pod：

```bash
kubectl get pods -A -o json | jq -r '
  .items[] | 
  select(.spec.containers[].resources.limits == null) | 
  [.metadata.namespace, .metadata.name] | @tsv
'
```

或者用纯 kubectl 实现（不依赖 jq）：

```bash
kubectl get pods -A -o custom-columns="NS:.metadata.namespace,NAME:.metadata.name,LIM:.spec.containers[*].resources.limits" | grep '<none>'
```

## 小结

资源配置的可见性是集群治理的基础。本文覆盖了从交互式查询到自动化脚本的多种方法。在实践中，建议将资源审计纳入 CI/CD 流程——在部署前检查 Deployment 是否设置了合理的 resources，比事后排查 OOM 要高效得多。

如果你的集群规模较大，还可以考虑使用 Prometheus + kube-state-metrics 采集资源配置指标，通过 Grafana 可视化追踪配置变化趋势。
