---
title: "Android Studio 退出后，为什么还有 Java 进程吃掉我好几个 GB 内存？"
date: 2025-12-31T01:41:41+04:00
slug: 'gradle-daemon-memory-management'
draft: false
cover: "https://jiejue.obs.ap-southeast-1.myhuaweicloud.com/20251231014301003.webp"
tags:
  - Android
  - Gradle
  - 性能优化
  - Java
---

你关掉了 Android Studio，以为终于可以把内存还给 Chrome 了，结果打开活动监视器一看——三个 Java 进程，每个占用 1.5GB 内存，安静地躺在那里。这是什么？病毒吗？

不是。这是 Gradle 的"官方功能"。

<!--more-->

## Gradle Daemon：好心办坏事的典型

Gradle 是 Android 项目的构建工具。为了加速构建，Gradle 引入了一个叫 Daemon 的后台进程。它的设计思路是：JVM 启动很慢，如果每次构建都要冷启动 JVM，Android 项目动辄要等好几分钟。于是 Gradle 在第一次构建时启动一个常驻后台的 JVM 进程，保持"热身"状态，下次构建时直接复用，省去启动时间。

听起来很合理。问题出在哪？

**版本不兼容导致 Daemon 泛滥。** 每个 Android 项目都有一个 `gradle/wrapper/gradle-wrapper.properties` 文件，里面指定了 Gradle 版本。如果你有两个项目，一个用 Gradle 8.2，另一个用 Gradle 8.9，Gradle 会启动两个独立的 Daemon。再加上 Android Studio 自己可能用另一个版本，于是你的电脑上就同时跑着三个 Daemon，各占 2GB 内存（默认配置），总共 6GB——而你可能只是想编译一个 Hello World。

更糟的是，这些 Daemon 的默认空闲超时是 **3 小时**。你中午构建了一次项目，下午去开会，晚上回来它们还在。

## 诊断：找出这些幽灵进程

打开终端，运行：

```bash
ps aux | grep GradleDaemon | grep -v grep
```

你会看到类似这样的输出：

```
username  55276  0.0  1.3 ... org.gradle.launcher.daemon.bootstrap.GradleDaemon 8.11.1
username  53572  0.0  1.2 ... org.gradle.launcher.daemon.bootstrap.GradleDaemon 8.9
username  50968  0.0  0.7 ... org.gradle.launcher.daemon.bootstrap.GradleDaemon 8.2
```

每一行就是一个 Daemon，末尾的数字是 Gradle 版本。内存占用在第六列（这里显示的是百分比，乘以你的总内存就是实际占用）。

想看更详细的状态，可以用 Gradle 自带的命令（需要指定版本）：

```bash
~/.gradle/wrapper/dists/gradle-8.9-bin/*/gradle-8.9/bin/gradle --status
```

## 清理：立即释放内存

**方法一：温柔地请它们退出**

```bash
# 对每个版本执行
~/.gradle/wrapper/dists/gradle-8.9-bin/*/gradle-8.9/bin/gradle --stop
```

**方法二：直接杀掉所有 Daemon**

```bash
pkill -f GradleDaemon
```

这两种方式都是安全的，不会损坏任何项目文件。下次构建时 Gradle 会自动启动新的 Daemon。

## 预防：调整 Gradle 全局配置

与其每次手动清理，不如从源头控制。创建或编辑 `~/.gradle/gradle.properties` 文件：

```properties
# 空闲 10 分钟后自动退出（默认 3 小时）
org.gradle.daemon.idletimeout=600000

# 降低每个 Daemon 的内存上限（默认 2048m）
org.gradle.jvmargs=-Xmx1536m -XX:+HeapDumpOnOutOfMemoryError -Dfile.encoding=UTF-8

# 既然用了 Daemon，就把其他性能优化也打开
org.gradle.parallel=true
org.gradle.caching=true
org.gradle.configuration-cache=true
```

这个配置的效果：

1. **10 分钟超时**：不用的 Daemon 很快就会自动退出，而不是霸占内存 3 小时
2. **1.5GB 内存上限**：对大多数 Android 项目够用，复杂项目可以调回 2048m
3. **并行构建和缓存**：既然 Daemon 的目的是加速，索性把其他优化也开启

## 要不要完全禁用 Daemon？

可以，在 `gradle.properties` 加一行：

```properties
org.gradle.daemon=false
```

但我不推荐。禁用后每次构建都要冷启动 JVM，Android 项目的构建时间会从几十秒膨胀到几分钟。对于偶尔开发 Android 的场景，10 分钟超时是更好的平衡——用的时候有加速，不用时快速释放资源。

## 为什么说这是"丑陋设计"？

Gradle Daemon 的核心问题在于：它把内存使用的决策权从用户手中夺走了。

一个合理的设计应该是：当 Android Studio 退出时，相关的 Daemon 也应该退出——毕竟此时用户显然不打算继续构建了。或者至少，不同小版本的 Gradle 应该能复用同一个 Daemon，而不是版本号差一点点就要另起炉灶。

现在的设计相当于：你关了暖气，但锅炉还在烧——因为 Gradle 觉得"你可能待会儿还要开"。这种默认行为对于内存紧张的开发机来说是一种冒犯。

好在通过上面的配置，你可以把这个"体贴"限制在一个合理的范围内。
