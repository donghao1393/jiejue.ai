---
title: "修复 macOS 里损坏的应用"
date: 2024-04-03T00:12:11+04:00
slug: 'fix-damaged-app'
draft: false
cover: "https://jiejue.obs.ap-southeast-1.myhuaweicloud.com/20250202021703377.webp"
tags:
  - macos
  - 安全
  - 应用损坏
---

MacOS会对应用进行认证检查，如果有问题的应用，默认是打不开的。

怎么办？我们给他放行就是。

<!--more-->

## 步骤

主要分为两步，一是禁用GateKeeper，二是修复应用权限。

### 禁用GateKeeper
```bash
sudo spctl --master-disable
```

### 修复应用权限
把如下PicGo.app换成你的应用名称。
```bash
xattr -cr /Applications/PicGo.app
```

## 总结
通过修复应用权限，我们就可以正确打开应用了。

