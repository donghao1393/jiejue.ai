---
title: "Bitbucket Runner 的僵尸 Pod 问题：从原理到根治"
date: 2026-02-05T20:09:15+04:00
slug: 'bitbucket-runner-zombie-pod-fix'
draft: false
cover: "https://jiejue.obs.ap-southeast-1.myhuaweicloud.com/20260205201220491.webp"
tags:
  - Kubernetes
  - Bitbucket
  - DevOps
  - CI/CD
---

如果你在 Kubernetes 上运行 Bitbucket self-hosted runners，可能会遇到一个令人困惑的问题：pipeline 执行完了，但 Pod 就是不退出，Job 永远显示 Active。这些"僵尸 Pod"会不断累积，消耗集群资源。本文将解释这个问题的根本原因，以及如何用 Kubernetes 原生特性彻底解决它。

<!--more-->

## 什么是 Bitbucket Self-Hosted Runner？

Bitbucket Pipelines 默认使用 Atlassian 提供的云端执行环境来运行你的 CI/CD 任务。但在某些场景下，你可能需要自己托管执行环境：

- 需要访问内网资源（数据库、私有 API）
- 对构建环境有特殊要求（GPU、大内存）
- 出于安全合规考虑，代码不能离开自己的基础设施

Self-hosted runner 就是运行在你自己 Kubernetes 集群里的 Pod，它会从 Bitbucket 拉取任务，在本地执行，然后把结果报告回去。

## Docker-in-Docker 架构

Bitbucket runner 使用 Docker-in-Docker（DinD）架构。每个 runner Pod 包含两个容器：

```
┌─────────────────────────────────────────────────────────┐
│  Runner Pod                                             │
│  ┌─────────────────────┐  ┌─────────────────────────┐  │
│  │  runner 容器         │  │  docker 容器 (DinD)      │  │
│  │                     │  │                         │  │
│  │  - 与 Bitbucket 通信 │  │  - 提供 Docker daemon   │  │
│  │  - 执行 pipeline 脚本│  │  - 执行 docker build    │  │
│  │                     │  │  - 执行 docker push     │  │
│  └──────────┬──────────┘  └──────────┬──────────────┘  │
│             │                        │                  │
│             └────── /var/run ────────┘  (共享 socket)   │
└─────────────────────────────────────────────────────────┘
```

为什么需要两个容器？因为 pipeline 脚本里经常需要执行 `docker build`、`docker push` 这类命令。runner 容器本身不运行 Docker daemon，它通过共享的 `/var/run/docker.sock` 调用旁边 docker 容器里的 daemon。

这个设计很优雅，但有一个隐藏的问题。

## 僵尸 Pod 是怎么形成的

问题出在 Pod 的生命周期管理上：

1. Runner 容器完成 pipeline 任务后正常退出
2. Docker 容器**没有任何机制知道 runner 已经退出**，继续运行
3. Pod 状态显示 Running（1/2 容器就绪）
4. Kubernetes Job 状态保持 Active（因为 Pod 还在运行）
5. 你配置的 `ttlSecondsAfterFinished` 永远不会触发（它只在 Job 状态变成 Complete/Failed 后才计时）

随着时间推移，这些"僵尸 Pod"不断累积。你可能会看到这样的场景：

```bash
$ kubectl get jobs -n bitbucket-runners
NAME                             STATUS   AGE
runner-abc123                    Active   12d
runner-def456                    Active   9d
runner-ghi789                    Active   7d
# ... 几十个永远 Active 的 Job
```

检查 Pod 状态，会发现 runner 容器已经退出，但 docker 容器还在运行：

```bash
$ kubectl get pod runner-abc123-xxxxx -o jsonpath='{range .status.containerStatuses[*]}{.name}: {.state}{"\n"}{end}'
docker: {"running":{"startedAt":"2026-01-15T08:30:00Z"}}
runner: {"terminated":{"exitCode":0,"reason":"Completed"}}
```

## 为什么 TTL 不管用？

很多人的第一反应是配置 `ttlSecondsAfterFinished`：

```yaml
spec:
  ttlSecondsAfterFinished: 600  # 完成后 10 分钟删除
```

这个配置本身没问题，但它有一个前提：**Job 必须先变成 Complete 或 Failed 状态**。

由于 docker 容器不退出，Pod 一直是 Running，Job 一直是 Active。TTL 机制根本不会被触发。

## 解决方案：Kubernetes 原生 Sidecar

Kubernetes 1.28 引入了原生 sidecar 支持。通过在 `initContainers` 中设置 `restartPolicy: Always`，你可以告诉 Kubernetes：这个容器是 sidecar，当主容器退出时，请自动终止它。

### 原理

原生 sidecar 的生命周期如下：

```
Job 创建
    │
    ▼
┌─────────────────────────────────────────────────────────┐
│ initContainers:                                         │
│   docker (restartPolicy: Always) ──────────────────────►│ 持续运行
└─────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────┐
│ containers:                                             │
│   runner ─────────────────────────────────► exit(0)     │
└─────────────────────────────────────────────────────────┘
                                                  │
                                                  ▼
                                    K8s 检测到主容器退出
                                                  │
                                                  ▼
                                    自动终止 docker sidecar
                                                  │
                                                  ▼
                                    Pod → Completed, Job → Complete
                                                  │
                                                  ▼
                                    TTL 触发，Job + Pod 被删除
```

### 配置方法

修改 Job 模板，把 docker 容器从 `containers` 移到 `initContainers`，并添加 `restartPolicy: Always`：

**修改前**（docker 作为普通容器）：

```yaml
spec:
  template:
    spec:
      containers:
        - name: runner
          image: docker-public.packages.atlassian.com/sox/atlassian/bitbucket-pipelines-runner:latest
          # ... runner 配置 ...
        - name: docker
          image: docker:dind
          securityContext:
            privileged: true
          # ... volume mounts ...
```

**修改后**（docker 作为原生 sidecar）：

```yaml
spec:
  template:
    spec:
      initContainers:
        - name: docker
          image: docker:dind
          restartPolicy: Always  # 关键：启用原生 sidecar 行为
          securityContext:
            privileged: true
          volumeMounts:
            - name: tmp
              mountPath: /tmp
            - name: docker-containers
              mountPath: /var/lib/docker/containers
            - name: var-run
              mountPath: /var/run
      containers:
        - name: runner
          image: docker-public.packages.atlassian.com/sox/atlassian/bitbucket-pipelines-runner:latest
          # ... runner 配置保持不变 ...
```

### 部署和验证

部署新配置后，需要删除现有的僵尸 Job（新 Job 会自动使用新模板）：

```bash
# 部署新配置
helm upgrade --install bitbucket-runner ./my-chart \
  -n bitbucket-runner-control-plane \
  -f values.yaml

# 清理现有僵尸 Job
kubectl -n bitbucket-runners delete jobs --all

# 等待 autoscaler 创建新 runner
kubectl -n bitbucket-runners get jobs -w
```

验证修复是否生效：

```bash
# 触发一个 pipeline，等待完成后检查 Job 状态
# 应该看到 SUCCEEDED=1，而不是 ACTIVE=1
kubectl -n bitbucket-runners get jobs \
  -o custom-columns='NAME:.metadata.name,ACTIVE:.status.active,SUCCEEDED:.status.succeeded'
```

如果一切正常，你会看到完成的 Job 在 TTL 时间后自动消失。

## 其他方案的对比

在找到原生 sidecar 方案之前，我们也考虑过其他方法：

| 方案 | 优点 | 缺点 |
|------|------|------|
| CronJob 定期清理 | 不改现有架构 | 治标不治本；判断逻辑复杂；可能误杀 |
| 修改 docker 启动脚本监控 runner | 不依赖 K8s 版本 | 脚本复杂；边缘情况多 |
| **原生 Sidecar** | K8s 原生；零额外组件；精确 | 需要 K8s 1.28+ |

如果你的集群版本是 1.28 以上，强烈推荐使用原生 sidecar。这是 Kubernetes 官方为 sidecar 生命周期问题提供的解决方案。

## 配置建议

基于实践经验，以下是一些配置建议：

```yaml
# Job 模板
spec:
  ttlSecondsAfterFinished: 600  # 完成后 10 分钟删除，留出调试窗口
  backoffLimit: 6               # 失败重试次数
  
# Autoscaler 配置
constants:
  runner_api_polling_interval: 300  # 5 分钟轮询一次（平衡响应速度和 API 配额）
  runner_cool_down_period: 300      # 缩容冷却期

# Runner 组配置
parameters:
  min: 2    # 每个仓库最少保持 2 个 idle runner
  max: 10   # 最多扩展到 10 个
```

## 写在最后

僵尸 Pod 问题的根源是 sidecar 容器不知道何时该退出。Kubernetes 1.28 的原生 sidecar 特性正是为此设计的。相比各种 workaround（CronJob 清理、自定义脚本），原生方案更简洁、更可靠。

如果你正在运维 Bitbucket self-hosted runners，不妨检查一下你的集群是否有这个问题。一个简单的配置改动，就能避免资源浪费和运维烦恼。
