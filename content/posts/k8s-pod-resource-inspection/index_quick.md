---
title: "Kubernetes Pod 资源查看入门：一条命令掌握集群资源分配"
date: 2025-12-15T17:36:24+04:00
slug: 'k8s-pod-resource-inspection-quick'
draft: false
cover: "https://jiejue.obs.ap-southeast-1.myhuaweicloud.com/20251215180034101.webp"
tags:
  - Kubernetes
  - DevOps
  - 运维入门
---

刚接触 Kubernetes 的运维人员常常面临一个问题：集群里跑了那么多 Pod，每个 Pod 到底分配了多少 CPU 和内存？本文用最简单的方式帮你快速查看这些信息。

<!--more-->

## 场景：为什么需要查看 Pod 资源配置？

假设你刚入职一家公司，接手了一个 Kubernetes 集群。老板问你："我们的应用服务器配置够不够？"你打开终端，面对几十个 Pod，却不知道从哪里下手。

在 Kubernetes 中，每个 Pod 可以设置两种资源参数：requests（请求量，调度器用来决定把 Pod 放哪个节点）和 limits（上限，超过这个值会被限制或杀掉）。了解这些配置是容量规划的第一步。

## 最实用的命令

打开终端，输入：

```bash
kubectl get pods -A -o custom-columns="NAMESPACE:.metadata.namespace,NAME:.metadata.name,CPU_LIM:.spec.containers[*].resources.limits.cpu,MEM_LIM:.spec.containers[*].resources.limits.memory"
```

这条命令会列出集群中所有 Pod 的 CPU 和内存限制。输出类似这样：

```
NAMESPACE     NAME                        CPU_LIM   MEM_LIM
kube-system   coredns-5dd5756b68-abc12    100m      170Mi
default       nginx-deployment-xyz789     500m      512Mi
production    api-server-def456           1000m     1Gi
```



## 理解输出结果

CPU 单位说明：`1000m` 等于 1 个 CPU 核心，`500m` 就是半个核心，`100m` 是十分之一核心。

内存单位说明：`Mi` 是 Mebibytes（约等于 MB），`Gi` 是 Gibibytes（约等于 GB）。

如果某个字段显示 `<none>`，说明该 Pod 没有设置对应的限制——这通常意味着它可以无限制地使用节点资源，在生产环境中是个隐患。

## 只看特定命名空间

如果只想看某个命名空间（比如 `production`）的 Pod：

```bash
kubectl get pods -n production -o custom-columns="NAME:.metadata.name,CPU_LIM:.spec.containers[*].resources.limits.cpu,MEM_LIM:.spec.containers[*].resources.limits.memory"
```

把 `-A`（所有命名空间）换成 `-n production` 即可。

## 查看请求量而非限制量

如果想看 requests 而不是 limits，把命令中的 `limits` 换成 `requests`：

```bash
kubectl get pods -A -o custom-columns="NAMESPACE:.metadata.namespace,NAME:.metadata.name,CPU_REQ:.spec.containers[*].resources.requests.cpu,MEM_REQ:.spec.containers[*].resources.requests.memory"
```

## 下一步

掌握了查看方法后，下一步是学习如何合理设置这些值。没有设置资源限制的 Pod 就像没有刹车的汽车，可能在关键时刻拖垮整个集群。如果你想深入了解资源配置的原理和最佳实践，可以阅读本系列的进阶版文章。
