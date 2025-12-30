---
title: "macOS 应用卸载：为什么拖进废纸篓还不够？"
date: 2025-12-31T01:09:35+04:00
slug: 'completely-uninstall-macos-apps'
draft: false
cover: "https://jiejue.obs.ap-southeast-1.myhuaweicloud.com/20251231011131624.webp"
tags:
  - macOS
  - 系统维护
  - 新手教程
---

把应用图标拖进废纸篓，macOS 会告诉你"已卸载"。但打开 Finder 看看 `~/Library` 目录，你会发现那个"已卸载"的应用还留下了一堆文件夹和配置文件。这篇文章以 Vivaldi 浏览器为例，带你走一遍完整的卸载流程，顺便搞清楚 macOS 应用数据的存放逻辑。

<!--more-->

## 为什么会有残留？

macOS 的应用设计遵循一个原则：应用本体和用户数据分离。`/Applications` 里的 `.app` 只是程序本身，你的书签、历史记录、偏好设置都存在别的地方。这样设计的好处是重装应用时数据还在，坏处是卸载应用时数据也还在。

## 残留文件藏在哪？

macOS 应用通常把用户数据存放在 `~/Library` 下的几个固定位置。以 Vivaldi 为例（Bundle ID 是 `com.vivaldi.Vivaldi`）：

| 路径 | 存放内容 |
|------|----------|
| `~/Library/Application Support/Vivaldi` | 用户数据：书签、历史、扩展、登录状态等 |
| `~/Library/Caches/com.vivaldi.Vivaldi` | 缓存文件：网页缓存、图片缓存等 |
| `~/Library/Preferences/com.vivaldi.Vivaldi.plist` | 偏好设置：窗口位置、功能开关等 |
| `~/Library/Saved Application State/com.vivaldi.Vivaldi` | 窗口状态：上次关闭时的标签页、窗口布局 |
| `~/Library/Application Support/CrashReporter/Vivaldi*.plist` | 崩溃报告配置 |

注意命名规则：有的用应用名（`Vivaldi`），有的用 Bundle ID（`com.vivaldi.Vivaldi`）。搜索时两种都要试。

## 实操：完整卸载 Vivaldi

### 第一步：删除应用本体

把 `/Applications/Vivaldi.app` 拖进废纸篓，或者右键选择"移到废纸篓"。

### 第二步：找出残留文件

打开终端，用这条命令一次性检查所有常见位置：

```bash
echo "=== Application Support ===" && ls -la ~/Library/Application\ Support/ | grep -i vivaldi
echo "=== Caches ===" && ls -la ~/Library/Caches/ | grep -i vivaldi
echo "=== Preferences ===" && ls -la ~/Library/Preferences/ | grep -i vivaldi
echo "=== Saved Application State ===" && ls -la ~/Library/Saved\ Application\ State/ | grep -i vivaldi
```

每个 `echo` 会告诉你当前在查哪个目录，有输出说明有残留，没输出说明该目录干净。

### 第三步：删除残留

根据上一步的结果，删除对应文件：

```bash
rm -rf ~/Library/Application\ Support/Vivaldi
rm -rf ~/Library/Caches/com.vivaldi.Vivaldi
rm ~/Library/Preferences/com.vivaldi.Vivaldi.plist
rm -rf ~/Library/Saved\ Application\ State/com.vivaldi.Vivaldi
```

### 第四步：全盘搜索确认

用 Spotlight 的命令行工具做最后确认：

```bash
mdfind -name vivaldi
```

这会搜索整个磁盘。如果还有结果，检查一下是什么——可能是你自己创建的脚本、自动启动配置，或者崩溃报告：

```bash
rm ~/Library/Application\ Support/CrashReporter/Vivaldi*.plist
```

## 举一反三

这套方法适用于几乎所有 macOS 应用。核心就三步：

1. **找 Bundle ID**：不知道应用的 Bundle ID？右键点击 `.app` → 显示包内容 → 打开 `Contents/Info.plist`，找 `CFBundleIdentifier` 字段
2. **检查四个目录**：`Application Support`、`Caches`、`Preferences`、`Saved Application State`
3. **全盘搜索**：用 `mdfind -name 应用名` 兜底

## 什么时候需要保留残留？

如果你只是想重装应用、不想丢失数据，那就只删 `.app`，保留 `Application Support` 里的用户数据。重新安装后，书签、历史、登录状态都还在。

但如果应用开始出问题（比如 Vivaldi 最近频繁崩溃重启），干净卸载后重装往往能解决。配置文件损坏是很多"莫名其妙"问题的根源。
