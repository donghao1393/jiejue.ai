---
title: "Helm 小技巧：改了配置文件，Pod 自动重启"
date: 2025-12-29T20:55:42+04:00
slug: 'helm-configmap-checksum-auto-rollout-quick'
draft: false
cover: "https://jiejue.obs.ap-southeast-1.myhuaweicloud.com/20251229205854288.webp"
tags:
  - Kubernetes
  - Helm
  - DevOps
---

用 Helm 部署应用时，你可能遇到过这种情况：明明改了配置，跑了 `helm upgrade`，但应用还是用着旧配置。必须手动删 Pod 或者 `kubectl rollout restart` 才行。这篇文章教你一个小改动，让配置变更自动触发 Pod 重启。

<!--more-->

## 问题场景

假设你用 Helm 管理一个前端应用，配置存在 ConfigMap 里。某天需要改一个 API 地址，于是你：

1. 修改了 values 文件里的配置
2. 执行 `helm upgrade`
3. 命令显示成功
4. 但访问应用，发现还是旧的 API 地址

为什么？因为 Kubernetes 的设计是这样的：ConfigMap 更新了，但 Pod 的定义（spec）没变，Kubernetes 认为"不需要动 Pod"。

## 解决方案

在 Deployment 的 Pod 模板里加一行 annotation，让它记录 ConfigMap 的"指纹"：

```yaml
spec:
  template:
    metadata:
      annotations:
        checksum/config: {{ include (print $.Template.BasePath "/configmap.yaml") . | sha256sum }}
```

这行代码做了什么？

1. 读取 `configmap.yaml` 渲染后的内容
2. 计算一个固定长度的"指纹"（hash 值）
3. 把这个指纹写进 Pod 的 annotation

ConfigMap 内容一变，指纹就变；指纹变了，Pod 模板就变了；Pod 模板变了，Kubernetes 就会滚动更新 Pod。

## 具体操作

找到你的 `templates/deployment.yaml`，在 `spec.template.metadata` 下面加上 annotations：

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ include "myapp.fullname" . }}
spec:
  template:
    metadata:
      annotations:
        # 加这一行
        checksum/config: {{ include (print $.Template.BasePath "/configmap.yaml") . | sha256sum }}
      labels:
        app: myapp
    spec:
      containers:
        # ...
```

如果你的 ConfigMap 文件名不是 `configmap.yaml`，换成实际的文件名即可。

## 验证

改完后，本地验证一下模板渲染是否正确：

```bash
helm template my-release ./my-chart --values values.yaml | grep -A2 "checksum"
```

应该能看到类似这样的输出：

```yaml
      annotations:
        checksum/config: 5d8f2a3b7c9e1f4d6a8b0c2e4f6a8b0c2e4f6a8b0c2e4f6a8b0c2e4f6a8b0c2e
```

那串字符就是 ConfigMap 内容的指纹。改动 values 里的配置再跑一次，你会发现这个值变了。

## 注意事项

这个方案意味着**任何** ConfigMap 变更都会触发 Pod 重启。如果你的应用支持热加载配置（不重启就能读取新配置），这个方案可能不是最优选择。

但对于大多数不支持热加载的应用来说，这是最简单可靠的方式。
