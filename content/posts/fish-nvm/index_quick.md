---
title: "Fish Shell下的Node.js版本管理工具 - 快速上手指南"
date: 2025-02-07T23:16:09+04:00
slug: 'fish-shell-node-version-manager-quick-start'
draft: false
cover: "https://jiejue.obs.ap-southeast-1.myhuaweicloud.com/20250208144106522.webp"
tags:
  - Fish Shell
  - Node.js
  - 开发工具
---

作为一名前端开发者，小王最近遇到了一个烦恼：他需要同时维护几个项目，但这些项目分别使用不同版本的Node.js。在使用fish shell的情况下，如何优雅地解决这个问题呢？

<!--more-->

## 问题场景

小王手上有三个项目：
- 一个使用Node.js 14的老项目
- 一个使用Node.js 16的维护项目
- 一个使用Node.js 18的新项目

每次切换项目时，他都要手动安装和切换Node.js版本，这既费时又容易出错。

## 简单解决方案

nvm.fish是一个专门为fish shell设计的Node.js版本管理工具，它可以：
- 一键安装不同版本的Node.js
- 快速切换Node.js版本
- 自动识别项目需要的版本

## 安装步骤

1. 创建必要的目录：
```fish
mkdir -p ~/.config/fish/functions
mkdir -p ~/.config/fish/completions
```

2. 下载并复制文件：
```fish
# 把nvm.fish和它的补全文件放到对应目录
curl https://raw.githubusercontent.com/donghao1393/fish-assistant/refs/heads/main/plugins/nvm/functions/nvm.fish -o ~/.config/fish/functions/nvm.fish
curl https://raw.githubusercontent.com/donghao1393/fish-assistant/refs/heads/main/plugins/nvm/completions/nvm.fish -o ~/.config/fish/completions/nvm.fish
```

## 日常使用

### 安装Node.js
```fish
# 安装最新版
nvm install latest

# 安装特定版本
nvm install 16.14.0

# 安装长期支持版
nvm install lts
```

### 切换版本
```fish
# 使用特定版本
nvm use 16.14.0

# 使用系统版本
nvm use system
```

### 查看版本
```fish
# 查看已安装的版本
nvm list

# 查看当前使用的版本
nvm current
```

## 智能版本切换

聪明的小王在每个项目目录下创建了一个`.nvmrc`文件，内容是该项目需要的Node.js版本号。这样，每次进入项目目录时，nvm.fish就会自动切换到正确的版本。

例如：
```fish
# 进入项目目录并创建.nvmrc
cd ~/projects/old-project
echo "14.17.0" > .nvmrc

# 下次进入这个目录时，nvm会自动切换到Node.js 14.17.0
```

## 小提示

1. 设置默认版本：
```fish
set -g nvm_default_version lts
```

2. 设置自动安装的包：
```fish
set -g nvm_default_packages yarn pnpm
```

这样设置后，每次安装新的Node.js版本时，这些包都会自动安装好。

## 总结

通过使用nvm.fish，小王不再需要手动管理Node.js版本了。无论是切换到哪个项目，正确的Node.js版本都会自动准备就绪，他可以专注于代码开发，而不是环境配置。

---

- 配图：nvm list命令的输出效果，显示多个已安装的Node.js版本
```fish
$ nvm install 16.14.0
Installing Node v16.14.0 lts/gallium
Fetching https://nodejs.org/dist/v16.14.0/node-v16.14.0-darwin-arm64.tar.gz
Now using Node v16.14.0 (npm 8.3.1) ~/.local/share/nvm/v16.14.0/bin/node
$ nvm list
 ▶ v16.14.0 lts/gallium
   v22.12.0 lts/jod
$ nvm uninstall 16.14.0
Uninstalling Node v16.14.0 ~/.local/share/nvm/v16.14.0/bin/node
```

- 配图：展示进入带有.nvmrc的项目目录时自动切换版本的过程
```fish
$ echo "16.14.0" > .nvmrc
$ cd ..
$ nvm use lts
Now using Node v22.12.0 (npm 10.9.0) ~/.local/share/nvm/v22.12.0/bin/node
$ nvm list
   v16.14.0 lts/gallium
 ▶ v22.12.0 lts/jod
$ z -
$ nvm use
Now using Node v16.14.0 (npm 8.3.1) ~/.local/share/nvm/v16.14.0/bin/node
$ nvm list
 ▶ v16.14.0 lts/gallium
   v22.12.0 lts/jod
```
