---
title: "Kubernetes 资源管理入门：从 kubectl top 到 LimitRange"
date: 2025-12-06T18:48:28+04:00
slug: 'kubernetes-resource-requests-top-limitrange'
draft: false
cover: "https://jiejue.obs.ap-southeast-1.myhuaweicloud.com/20251206185203983.webp"
tags:
  - Kubernetes
  - DevOps
  - 资源管理
---

刚接触 Kubernetes 的运维同学经常会遇到一个困惑：有些 deployment 的 yaml 里写了 resources.requests，有些却没写。没写的那些 Pod 用的是什么"默认值"？能不能查到它们实际占用了多少资源？

<!--more-->

## 先澄清一个误解

当 Pod 没有定义 resources.requests 时，Kubernetes 并不会自动给它一个"默认值"——它就是空的。这不是系统疏忽，而是一种明确的设计选择，意味着你告诉调度器："这个 Pod 对资源没有特别要求，随便安排。"

这种"随便安排"的后果是，该 Pod 会被归类为 BestEffort QoS（服务质量）等级。在节点资源紧张需要驱逐 Pod 时，BestEffort 等级的 Pod 会最先被牺牲。相比之下，声明了 requests 和 limits 的 Pod 属于 Guaranteed 或 Burstable 等级，在资源争抢中有更高的存活优先级。

## requests 和 limits 是什么关系

这两个概念经常被混淆，但它们各司其职。requests 是 Pod 向调度器声明的"最低资源需求"，调度器会据此决定把 Pod 放到哪个节点上——只有当节点的可分配资源大于等于 Pod 的 requests 时，调度才会成功。而 limits 是 Pod 能使用的"资源上限"，超过这个上限，CPU 会被限流，内存则可能触发 OOMKilled。

打个比方：requests 像是订酒店时告诉前台"我至少需要一张双人床"，酒店会据此分配房间；limits 则像房间的物理边界，你不能占用隔壁房间的空间。

一个常见的配置模式是 requests 设得比 limits 低，允许 Pod 在负载高峰时临时使用更多资源，同时保证基础需求能被满足。但如果 requests 和 limits 设成一样，Pod 就会获得 Guaranteed QoS 等级，资源使用会更稳定可预测。

## 用 kubectl top 看清实际消耗

既然没配置 requests 的 Pod 没有"默认值"可查，那怎么知道它们实际用了多少资源呢？这就是 kubectl top 的用武之地。

```bash
# 查看某个 namespace 下所有 Pod 的资源消耗
kubectl top pods -n your-namespace

# 查看单个 Pod 的详细消耗（按容器拆分）
kubectl top pod your-pod-name -n your-namespace --containers
```

这个命令依赖集群中部署了 metrics-server。如果执行后报错说找不到 metrics，你需要先在集群里安装 metrics-server 组件。

需要注意的是，kubectl top 显示的是实时消耗，会随负载波动。如果你想给没配置 requests 的 Pod 补上合理的值，最好在业务高峰期多采集几次数据，取一个比较高的百分位（比如 P95）作为参考，而不是随便看一眼就定下来。

## LimitRange：namespace 级别的兜底策略

如果你管理的集群有很多 namespace，逐个检查每个 deployment 的 yaml 是否配置了 requests 会非常繁琐。这时候 LimitRange 就能派上用场。

LimitRange 是一种 namespace 级别的资源，它可以做两件事：一是设置边界约束，规定 Pod 声明的 requests 和 limits 不能超出某个范围；二是提供默认值注入，当 Pod 没声明时自动填充。

先看看你的集群里有没有配置 LimitRange：

```bash
# 查看所有 namespace 的 LimitRange
kubectl get limitrange -A

# 查看某个 namespace 的详细配置
kubectl describe limitrange -n your-namespace
```

如果想给一个 namespace 配置默认值，可以创建这样一个 LimitRange：

```yaml
apiVersion: v1
kind: LimitRange
metadata:
  name: default-resources
  namespace: your-namespace
spec:
  limits:
  - default:          # 未声明 limits 时的默认值
      cpu: "500m"
      memory: "512Mi"
    defaultRequest:   # 未声明 requests 时的默认值
      cpu: "100m"
      memory: "128Mi"
    type: Container
```

当这个 LimitRange 生效后，该 namespace 下新创建的、没有声明资源配置的 Pod，会被自动注入 defaultRequest 和 default 里定义的值。

## 显式配置还是依赖默认值

既然 LimitRange 可以自动注入默认值，为什么还要在 values.yaml 里显式配置 requests 呢？

首先是精确性的问题。LimitRange 的默认值是 namespace 级别的"一刀切"，但一个 nginx 反向代理和一个 JVM 应用的资源需求天差地别。用同一个默认值，要么对轻量应用过度分配造成浪费，要么对重量应用分配不足导致性能问题。

其次是可见性。当 requests 写在 values.yaml 里，做 code review 时能直接看到这个应用声明了多少资源。如果依赖 LimitRange 注入，yaml 里是空的，reviewer 得去查 namespace 的 LimitRange 配置才知道实际值，增加了认知负担，也容易遗漏问题。

第三是可移植性。如果某天这个 deployment 要迁移到另一个 namespace 或者另一个集群，显式声明的配置能直接用，不依赖目标环境有没有配好 LimitRange。

所以实践中比较好的分工是：LimitRange 作为兜底策略和安全边界，防止有人忘记配置或者配置得离谱；而 values.yaml 里的显式声明是正常配置路径，每个应用自己负责声明合理的资源需求。

## 补齐缺失配置的实践建议

如果你现在面对的是一堆历史遗留的、没配置 requests 的 deployment，可以按这个思路处理：

先用 kubectl top 在业务高峰期采集各 Pod 的实际资源消耗，持续几天，取 P95 或 P99 作为 requests 的参考值。limits 可以设得比 requests 高一些，给突发负载留出余量，但也不要太离谱以免影响节点上的其他 Pod。

然后逐步更新各 deployment 的 yaml，把 requests 和 limits 补上。每次更新后观察一段时间，确认没有因为资源配置不当导致的调度失败或 OOM。

最后，在各 namespace 部署 LimitRange 作为兜底，这样以后如果有人忘记配置，至少不会出现 BestEffort 的 Pod 在资源紧张时被无差别驱逐的情况。

---

你的集群里现在有多少 Pod 是 BestEffort 等级的？用下面的命令可以快速筛出来，数量可能会让你吃惊。 
```fish
kubectl get pods -A -o json | jq '.items[] | select(.status.qosClass=="BestEffort") | .metadata.name'` 
```
