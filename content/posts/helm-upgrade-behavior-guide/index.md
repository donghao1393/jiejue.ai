---
title: "Helm Upgrade 到底改了什么？Kubernetes 资源更新行为完全指南"
date: 2025-12-30T00:42:41+04:00
slug: 'helm-upgrade-behavior-guide'
draft: false
cover: "https://jiejue.obs.ap-southeast-1.myhuaweicloud.com/20251230004553630.webp"
tags:
  - Kubernetes
  - Helm
  - DevOps
  - 容器编排
---

当你执行 `helm upgrade` 后，哪些 Pod 会重启？ConfigMap 改了为什么应用没感知？这篇文章帮你彻底搞清楚 Helm 和 Kubernetes 的更新行为。

<!--more-->

## helm upgrade 的工作流程

`helm upgrade` 执行时会经历以下步骤：

1. 读取新的 values（来自命令行 `--set` 或 `-f values.yaml`）
2. 用新 values 渲染所有模板，生成新的 Kubernetes manifest
3. 与当前集群中的资源做对比（diff）
4. 只 apply 有差异的部分

这意味着 Helm 本身不决定 Pod 是否重启——它只负责把变更提交给 Kubernetes，由 Kubernetes 的控制器（如 Deployment Controller）决定后续动作。

## Pod 重启的判定逻辑

Kubernetes 的 Deployment 控制器根据 **Pod template spec 是否变化** 来决定是否触发滚动更新。

以下变更 **会触发** Pod 重启：

| Values 变化类型 | 原因 |
|----------------|------|
| `image` 镜像地址或 tag | Pod spec 核心字段 |
| `resources.limits/requests` | 资源配置属于 Pod spec |
| `env` 环境变量 | 环境变量属于 Pod spec |
| `volumeMounts` 或 `volumes` | 存储挂载属于 Pod spec |
| `nodeSelector`、`tolerations` | 调度约束属于 Pod spec |
| `command`、`args` | 启动命令属于 Pod spec |

以下变更 **不会触发** Pod 重启：

| Values 变化类型 | 原因 |
|----------------|------|
| Service 的 `port` | Service 是独立资源 |
| Ingress 配置 | Ingress 是独立资源 |
| ConfigMap/Secret **内容** | 默认不触发（见下文详解） |
| HPA 配置 | HPA 是独立资源 |

## ConfigMap/Secret 的陷阱

这是初学者最容易踩的坑：你改了 ConfigMap 的内容，执行了 `helm upgrade`，但应用完全没有感知到变化。

原因很简单：ConfigMap 本身更新了，但 Pod spec 没有任何变化，所以 Deployment Controller 认为"不需要重启"。

**解决方案**：在 Deployment 模板里加入 checksum annotation：

```yaml
spec:
  template:
    metadata:
      annotations:
        checksum/config: {{ include (print $.Template.BasePath "/configmap.yaml") . | sha256sum }}
```

这样，ConfigMap 内容变化会导致 checksum 变化，进而导致 annotation 变化，从而触发滚动更新。

**另一种情况**：如果你同时更新了 ConfigMap 和 image（即使代码相同，只要 image tag/digest 不同），Pod 会因为 image 变化而重启，ConfigMap 的新内容自然也就"搭便车"生效了。

## 不同 Kubernetes 资源的更新行为

不同类型的资源，更新行为也不同：

| 资源类型 | 更新方式 | 是否中断服务 |
|---------|---------|-------------|
| Deployment | 滚动更新（RollingUpdate） | 通常不中断 |
| StatefulSet | 按序滚动（OrderedReady） | 通常不中断 |
| DaemonSet | 滚动更新 | 通常不中断 |
| Job | 不可变，需删除重建 | N/A |
| CronJob | 下次调度生效 | 不中断 |
| ConfigMap/Secret | 原地更新 | 不中断（但 Pod 不自动感知） |
| Service | 原地更新 | 不中断 |
| PVC | 部分字段不可变 | 可能失败 |

## helm upgrade 常用 flags

| Flag | 效果 |
|------|------|
| `--install` | Release 不存在时自动 install（幂等操作，CI/CD 常用） |
| `--atomic` | 失败时自动回滚到上一版本 |
| `--wait` | 等待所有 Pod Ready 才算成功 |
| `--timeout 5m` | 配合 `--wait` 使用的超时时间 |
| `--reuse-values` | 继承上次的 values，只覆盖本次指定的 |
| `--reset-values` | 忽略上次 values，完全用 chart 默认值 + 本次指定 |
| `--force` | 强制替换资源（删除再创建，会导致短暂中断） |
| `--dry-run` | 只渲染模板，不实际执行 |

**关于 `--reuse-values` vs `--reset-values` 的选择**：

| 场景 | 推荐 | 原因 |
|-----|------|------|
| CI/CD 自动化部署 | `--reset-values` + 完整 values 文件 | 保证可重复性 |
| 临时手动改一个值 | `--reuse-values` + `--set key=val` | 方便快捷 |
| chart 版本升级 | `--reset-values` | 新版本可能有新的默认值结构 |

## 验证变更的方法

在真正执行之前，先看看会改什么：

```bash
# 方法一：dry-run
helm upgrade my-release ./chart -f new-values.yaml --dry-run --debug

# 方法二：使用 helm-diff 插件（推荐）
helm diff upgrade my-release ./chart -f new-values.yaml
```

## 常见的"改了但没生效"排查

| 现象 | 可能原因 |
|-----|---------|
| Pod 没重启 | values 变化没影响 Pod spec |
| ConfigMap 改了但应用没感知 | 缺少 checksum annotation，或应用没 watch 文件变化 |
| 新增的资源没出现 | 模板里有条件判断 `{{- if .Values.xxx }}` 没满足 |
| 旧资源没删除 | Helm 只管理自己创建的资源，手动加的不会删 |
| values 被忽略 | `--reuse-values` 和 `-f` 同时用时优先级问题 |

## image tag 的坑

如果你用的是固定 tag（如 `myapp:latest`），即使镜像仓库里的内容变了，Kubernetes 看到的字符串没变，**不会触发更新**。

解决方案：

1. **推荐**：用唯一 tag，如 git commit hash：`myapp:abc123f`
2. 用完整 digest：`myapp@sha256:...`
3. 设置 `imagePullPolicy: Always`（但仍需手动触发重启）

---

理解了这些机制，你就能准确预判每次 `helm upgrade` 会产生什么效果，不再需要靠"重启大法"来解决问题了。
