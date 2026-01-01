---
title: "macOS 上 Rust 环境的正确管理方式"
date: 2026-01-01T17:15:54+04:00
slug: 'rust-environment-cleanup-macos'
draft: false
cover: "https://jiejue.obs.ap-southeast-1.myhuaweicloud.com/20260101171909684.webp"
tags:
  - Rust
  - macOS
  - Homebrew
  - 开发环境
---

很多 Rust 初学者在 macOS 上会遇到一个问题：安装了多个版本的 Rust，不知道哪个在起作用，也不知道怎么清理。这篇文章通过一个真实的清理案例，帮你理清 Rust 工具链的管理逻辑。

<!--more-->

## 问题的起源

在 macOS 上安装 Rust，常见的方式有三种：

1. **Homebrew 的 `rust` formula**：直接安装一个固定版本的 Rust 编译器
2. **Homebrew 的 `rustup` formula**：安装 Rust 的版本管理器
3. **官方 curl 脚本**：`curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh`

这三种方式可以共存，但共存会带来混乱。比如我的情况是：2024年10月做 Tauri 项目时用 curl 安装了 rustup，后来又通过 Homebrew 安装了独立的 rust 和 rustup，三者并存了一年多。

## 诊断当前状态

首先检查你的系统里有什么：

```fish
# 检查 Homebrew 安装了哪些 rust 相关的包
brew list | grep rust

# 检查各个命令的来源
which rustup
which rustc
which cargo

# 检查 curl 安装的 rustup 是否留有残余
ls -la ~/.rustup
ls -la ~/.cargo
```

我的诊断结果：

```
brew list | grep rust
→ rust, rustup

which rustup
→ /opt/homebrew/opt/rustup/bin/rustup

ls ~/.rustup
→ 目录存在（curl 安装的残留）
```

这说明我有三份重复安装。

## 理解 rust 和 rustup 的区别

这里需要做一个类比来帮助理解：

| Rust 生态 | Python 生态 | 作用 |
|-----------|-------------|------|
| `brew install rust` | `brew install python@3.12` | 独立的单版本编译器 |
| `brew install rustup` | `brew install uv` 或 `pyenv` | 版本管理器 |

`rust` formula 是一个固定版本的编译器，而 `rustup` 是一个管理器，可以安装、切换多个版本的 Rust，还能添加交叉编译目标。

如果你用过 Python 的 uv 或 pyenv，那 rustup 的作用完全一样——让你摆脱对单一版本的依赖。

## 清理步骤

确定使用 rustup 管理 Rust 后，清理步骤如下：

```fish
# 1. 卸载独立的 rust formula（因为和 rustup 冲突）
brew uninstall rust

# 2. 删除 curl 安装的 rustup 残留数据
rm -rf ~/.rustup

# 3. 确保 Homebrew 的 rustup 在 PATH 中
#    如果你用 fish，检查是否已有这一行
fish_add_path /opt/homebrew/opt/rustup/bin

# 4. 用 Homebrew 的 rustup 初始化工具链
rustup default stable
```

执行 `rustup default stable` 后，rustup 会下载最新的 stable 版本到 `~/.rustup/toolchains/`。

## 验证清理结果

```fish
which rustup && which rustc && which cargo
→ 都应该指向 /opt/homebrew/opt/rustup/bin/

rustup show
→ 应该显示：
   Default host: aarch64-apple-darwin
   rustup home:  /Users/你的用户名/.rustup
   installed toolchains: stable-aarch64-apple-darwin (active, default)
```

## 日后的维护

清理完成后，维护变得简单：

- **更新 Rust 工具链**：`rustup update`
- **更新 rustup 本身**：`brew upgrade rustup`
- **安装其他版本**：`rustup install nightly` 或 `rustup install 1.70.0`
- **添加交叉编译目标**：`rustup target add aarch64-linux-android`

## 总结

Rust 环境管理的核心原则是**只保留一个入口**。对于 macOS + Homebrew 用户，推荐的方式是：

1. 只安装 `brew install rustup`
2. 不要安装独立的 `brew install rust`
3. 不要用官方的 curl 脚本（除非你不用 Homebrew）

这样所有的 Rust 版本都由 Homebrew 的 rustup 统一管理，数据集中在 `~/.rustup/`，干净清晰，且 rustup 本身的更新也纳入 Homebrew 的管理体系。
