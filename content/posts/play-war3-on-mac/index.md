---
title: "让CrossOver支持在Mac上玩魔兽争霸3"
date: 2024-12-12
slug: 'play-war3-on-mac'
draft: false
cover: "https://jiejue.obs.ap-southeast-1.myhuaweicloud.com/20250201100422602.webp"
tags:
  - macos
  - war3
  - 魔兽争霸
  - crossover
---

魔兽争霸3是一款经典的即时战略游戏，虽然主要面向Windows平台，但通过CrossOver这款软件，Mac用户也能够流畅地运行这款游戏。本文将详细介绍如何在Mac上配置并运行原版魔兽争霸3（非重制版）。

<!--more-->

## 前期准备

1. CrossOver（可从官方网站下载）
2. 魔兽争霸3完整安装目录（包含游戏本体和注册表修复工具）

## 安装步骤

### 1. 创建CrossOver容器

1. 打开CrossOver，创建新的bottle
2. 选择Windows 7（32位）作为系统版本
3. 为容器起一个名字（比如War3）

### 2. 安装游戏

1. 在bottle的C盘下的Program Files目录中创建文件夹
2. 将完整的魔兽争霸3目录复制到该文件夹中

### 3. 解决中文显示问题

1. 在CrossOver的软件市场中搜索并安装"Adobe Source Han Sans Simplified Chinese Font Package"思源中文字体
2. 安装"Setting bottle's language to Simplified Chinese"包，将容器语言设置为中文

### 4. 修复游戏配置

1. 运行War3目录中的"War3注册表修复.exe"
2. 点击自定义、定位魔兽目录、修复

### 5. 优化游戏显示

1. 启动游戏后，进入选项-图像设置
2. 调低亮度数值，避免画面过亮
3. 根据需要调整其他画质选项

## 可能遇到的问题

1. 游戏中显示问号：安装中文字体包可以解决
2. 游戏画面过亮：在游戏内图像设置中调低亮度
3. 游戏启动报错：运行注册表修复工具，并确保容器设置为中文环境

## 总结

通过CrossOver，我们可以在Mac上流畅运行魔兽争霸3。正确配置中文环境、修复注册表以及调整显示设置是获得最佳游戏体验的关键步骤。

## 参考资料

1. CrossOver官方文档
2. [解决 CrossOver 中文乱码的方案](https://icxzl.com/2516.html)
