---
title: "解放双手：使用 pre-commit 自动化代码质量检查与修复"
date: 2025-03-23T17:33:47+04:00
slug: 'pre-commit-hooks-automation'
draft: false
cover: "https://jiejue.obs.ap-southeast-1.myhuaweicloud.com/20250323174022149.webp"
tags:
  - 开发工具
  - 代码质量
  - Git
---

你是否曾经为了处理代码中的行尾空格、文件末尾换行符等问题而头疼不已？或者团队中有人不小心提交了敏感信息或格式混乱的代码？pre-commit 工具将彻底解决这些烦恼，让你在提交代码前自动检查并修复常见问题。

<!--more-->

## 什么是 pre-commit？

pre-commit 是一个强大的工具，它可以在你提交代码前自动运行各种检查和修复操作。简单来说，它就是一个"门卫"（代码检查器），在代码进入仓库之前把关，确保所有提交的代码都符合项目规范。

一位前端开发者小王在处理一个网站项目时，经常收到同事的评论："你的代码里有很多行尾空格"、"文件末尾没有换行符"。虽然这些问题不影响代码运行，但确实影响了代码的整洁度和一致性。在他了解到 pre-commit 后，这些小问题再也不会出现在他的提交中了。

## 为什么需要 pre-commit？

想象一下以下场景：

- 你辛苦编写了代码，提交后却在代码审查中收到一大堆关于格式问题的评论
- 团队成员不小心将API密钥或私钥提交到了代码库
- 代码风格不一致，导致版本控制系统显示大量无意义的差异
- 频繁需要修复那些本可以自动检测和修复的简单问题

pre-commit 可以在这些问题进入代码库之前就自动检测并修复它们，大大节省了时间和精力。

## 快速上手 pre-commit

### 安装 pre-commit

首先，使用 pip 安装 pre-commit：

```bash
pip install pre-commit
```

### 创建配置文件

在项目根目录创建一个名为 `.pre-commit-config.yaml` 的文件：

```yaml
repos:
  - repo: https://github.com/pre-commit/pre-commit-hooks
    rev: v4.5.0  # 使用最新版本
    hooks:
      - id: trailing-whitespace  # 删除行尾空白
      - id: end-of-file-fixer    # 确保文件以换行符结束
      - id: check-yaml           # 检查YAML文件语法
      - id: check-added-large-files  # 防止提交大文件
```

### 安装Git钩子

在项目目录中运行以下命令，将 pre-commit 安装到 Git 钩子中：

```bash
pre-commit install
```

现在，每当你执行 `git commit` 命令时，pre-commit 就会自动运行配置文件中指定的检查，并在可能的情况下自动修复问题。

### 查看效果

当你执行 `git commit` 命令时，会看到类似这样的输出：

```
trim trailing whitespace.................................................Passed
fix end of files.........................................................Passed
check yaml...............................................................Passed
check for added large files..............................................Passed
```

如果所有检查通过，提交将继续进行；如果有检查失败且无法自动修复，提交将被阻止，并提示你手动解决问题。

## 常用的 pre-commit 钩子

以下是一些最实用的 pre-commit 钩子：

### 基础检查

- `trailing-whitespace`: 删除行尾空白
- `end-of-file-fixer`: 确保文件以换行符结束
- `check-yaml/json/xml/toml`: 检查各类配置文件格式
- `check-merge-conflict`: 检查未解决的合并冲突标记
- `check-case-conflict`: 检查文件名大小写冲突

### 安全性检查

- `detect-private-key`: 检测是否意外提交了私钥
- `no-commit-to-branch`: 防止直接向主分支（如main）提交
- `detect-aws-credentials`: 检测AWS凭证

### 代码格式化

- Python: `black`, `isort`, `flake8`
- JavaScript: `prettier`, `eslint`
- 其他语言: `clang-format`, `gofmt`, `ktlint` 等

### 一个更完整的配置示例

```yaml
repos:
  - repo: https://github.com/pre-commit/pre-commit-hooks
    rev: v4.5.0
    hooks:
      - id: trailing-whitespace
      - id: end-of-file-fixer
      - id: check-yaml
      - id: check-json
      - id: check-added-large-files
      - id: detect-private-key
      - id: check-merge-conflict
      
  # Python 代码格式化
  - repo: https://github.com/psf/black
    rev: 24.2.0
    hooks:
      - id: black
        
  # Python 导入排序
  - repo: https://github.com/pycqa/isort
    rev: 5.13.2
    hooks:
      - id: isort
        
  # Python 代码质量检查
  - repo: https://github.com/astral-sh/ruff-pre-commit
    rev: v0.3.0
    hooks:
      - id: ruff
        args: [--fix]
```

## 进阶用法

### 手动运行检查

你可以在不进行提交的情况下运行检查：

```bash
pre-commit run --all-files  # 检查所有文件
pre-commit run trailing-whitespace  # 只运行特定钩子
```

### 针对特定文件类型的钩子

可以配置钩子只检查特定类型的文件：

```yaml
- id: black
  types: [python]
  
- id: eslint
  files: \.(js|ts|jsx|tsx)$
```

### 自定义钩子

你可以创建自己的钩子来运行自定义脚本：

```yaml
- repo: local
  hooks:
    - id: custom-script
      name: 运行自定义检查脚本
      entry: ./scripts/custom-check.sh
      language: script
```

## 在团队中推广 pre-commit

如果你想在团队中推广使用 pre-commit，可以：

1. 在项目README中添加安装和使用说明
2. 在CI/CD流程中加入pre-commit检查，确保所有提交都符合规范
3. 解释它如何减少代码审查中处理格式问题的时间
4. 强调它的自动修复能力，减少开发者的手动工作

## 常见问题解答

### pre-commit 是否会影响我的提交速度？

虽然会增加一些提交时间，但收益远大于成本。大多数检查都非常快，只会增加几秒钟的时间，但可以节省大量后续修复问题的时间。

### 如何跳过特定提交的检查？

如果确实需要临时跳过检查，可以使用：

```bash
git commit -m "message" --no-verify
```

但请谨慎使用这个选项，因为它会绕过所有检查。

### 如何更新钩子版本？

运行以下命令更新所有钩子到最新版本：

```bash
pre-commit autoupdate
```

## 总结

pre-commit 是一个强大而灵活的工具，可以帮助你和你的团队自动化代码质量检查和问题修复。通过在代码提交前自动捕获并修复常见问题，它不仅提高了代码质量，还减少了开发者的工作量和团队的沟通成本。

开始使用 pre-commit，让那些繁琐的代码质量问题成为过去，专注于真正重要的开发工作吧！

你是否想过，除了提交前的检查，还有哪些环节可以通过自动化工具来提升开发体验和代码质量？比如自动化测试、持续集成、代码扫描等。尝试将这些工具组合起来，打造一套完整的代码质量保障体系，会带来怎样的开发体验提升呢？
