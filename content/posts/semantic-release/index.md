---
title: "使用 Semantic Release 实现自动化版本发布：踩坑与解决方案"
date: 2025-03-13T21:15:50+04:00
slug: 'automatic-versioning-with-semantic-release'
draft: false
cover: "https://jiejue.obs.ap-southeast-1.myhuaweicloud.com/20250313211837337.webp"
tag:
  - DevOps
  - Git
  - 自动化
  - 版本控制
---

在软件开发过程中，版本管理看似简单却常常令人头疼。手动管理版本不仅繁琐，还容易出错。通过语义化版本发布工具（Semantic Release），我们可以将这一过程自动化，但这个过程中也隐藏着一些易被忽视的陷阱。本文将分享我们团队在使用 Semantic Release 时遇到的问题和解决方案，帮助你避开这些坑。

<!--more-->

## 问题背景：当自动化版本发布遇到了"拒绝发布"

小李是一名初入职场的软件工程师，他所在的团队最近开始使用自动化工具来管理项目版本。一天，他按照往常的流程提交了一个包含新功能的代码，奇怪的是持续集成系统返回了这样的信息：

```
The type of the next release release is: no_release
```

这意味着尽管代码已经合并到主分支，但自动化系统认为这些变更不足以触发一个新的版本发布。小李百思不得其解，明明是一个重要的功能更新，为什么系统不认为需要发布新版本呢？

## 语义化版本（Semantic Versioning）是什么？

在深入问题之前，我们需要了解什么是语义化版本。语义化版本通常采用 `X.Y.Z` 的格式，其中：

- **X**：主版本号（Major）- 当做了不兼容的 API 修改
- **Y**：次版本号（Minor）- 当做了向下兼容的功能性新增
- **Z**：修订号（Patch）- 当做了向下兼容的问题修正

当我们使用自动化工具如 Semantic Release 时，它会根据提交信息来判断应该更新哪一部分的版本号，甚至是否需要发布新版本。

## 问题分析：提交信息格式的重要性

经过仔细检查日志，我们发现了问题所在。Semantic Release 在分析提交信息时，是按照"约定式提交"（Conventional Commits）规范来判断的。这个规范要求提交信息遵循特定的格式：

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

其中 `type` 是关键，决定了版本号的变更方式：

- `feat`: 新功能，会触发次版本号（Y）增加
- `fix`: 修复问题，会触发修订号（Z）增加
- `perf`: 性能优化，通常触发修订号增加

而像 `docs`、`style`、`refactor`、`test`、`chore` 等类型默认情况下不会触发版本变更。

小李的问题出在这里：他使用了 `feature:` 而非标准的 `feat:` 作为提交类型，或者使用了 `refactor:` 进行提交，这导致 Semantic Release 没有识别出需要发布新版本。

## 尝试的解决方案

我们尝试了几种方法来解决这个问题：

### 1. 修改历史提交顺序与内容

最初，我们尝试通过 Git 的交互式变基（interactive rebase）来重新排序和修改提交历史：

```bash
git rebase -i HEAD~4  # 显示最近4个提交
# 修改提交顺序和内容
git push --force  # 强制推送到远程仓库
```

然而，这个方法并没有解决问题，因为即使重新排序了提交，提交信息的格式问题仍然存在。

### 2. 检查 Semantic Release 配置

接下来，我们检查了项目中的 Semantic Release 配置：

```json
{
  "branches": ["main"],
  "plugins": [
    "@semantic-release/commit-analyzer",
    "@semantic-release/release-notes-generator",
    "@semantic-release/changelog",
    ["@semantic-release/exec", {
      "verifyConditionsCmd": "uv --version",
      "prepareCmd": "sed -i.bak 's/version = \".*\"/version = \"${nextRelease.version}\"/g' pyproject.toml && rm -f pyproject.toml.bak",
      "publishCmd": "uv build"
    }],
    ["@semantic-release/git", {
      "assets": [
        "pyproject.toml",
        "CHANGELOG.md"
      ],
      "message": "chore(release): ${nextRelease.version}\n\n${nextRelease.notes}"
    }],
    ["@semantic-release/github", {
      "assets": [
        {"path": "dist/*.whl", "label": "Python Wheel ${nextRelease.version}"},
        {"path": "dist/*.tar.gz", "label": "Source Distribution ${nextRelease.version}"}
      ]
    }]
  ]
}
```

这是一个标准配置，没有自定义规则阻止特定类型的提交触发发布。

## 成功的解决方案

最终，我们采用了一个简单而有效的方法：

1. 从备份分支中使用 `git cherry-pick` 提取需要的提交
2. 使用 `git rebase` 和 `git commit --amend` 修改提交信息，将 `feature:` 或 `refactor:` 改为标准的 `feat:`
3. 强制推送到远程仓库

```bash
git cherry-pick <commit-hash>
git rebase -i HEAD~
# 在编辑器中将 "feature:" 或 "refactor:" 改为 "feat:"
git push --force
```

这一次，CI/CD 系统成功识别了提交类型，并自动增加了项目的次版本号。

## 规范的提交信息类型参考

为了避免类似问题，这里列出了标准的提交类型及其对应的版本影响：

| 提交类型 | 说明 | 版本影响 |
|---------|------|---------|
| `feat` | 新功能 | 增加次版本号 (Y) |
| `fix` | 修复Bug | 增加修订号 (Z) |
| `docs` | 文档变更 | 通常不触发版本变更 |
| `style` | 代码风格变更（不影响功能） | 通常不触发版本变更 |
| `refactor` | 代码重构 | 通常不触发版本变更 |
| `perf` | 性能优化 | 通常触发修订号增加 |
| `test` | 测试相关 | 通常不触发版本变更 |
| `build` | 构建系统变更 | 通常不触发版本变更 |
| `ci` | CI配置变更 | 通常不触发版本变更 |
| `chore` | 其他变更 | 通常不触发版本变更 |

对于破坏性变更，可以使用 `!` 符号或在提交信息中添加 `BREAKING CHANGE:` 前缀：

```
feat!: 添加了一个有破坏性的功能
```

或

```
feat: 添加了新功能

BREAKING CHANGE: 这个变更破坏了之前的API
```

这会触发主版本号（X）的增加。

## 自定义提交类型行为

如果你希望某些默认不触发版本变更的提交类型（如 `refactor`）也能触发版本变更，可以在配置中添加自定义规则：

```json
{
  "plugins": [
    ["@semantic-release/commit-analyzer", {
      "preset": "angular",
      "releaseRules": [
        {"type": "refactor", "release": "patch"}
      ]
    }],
    // 其他插件...
  ]
}
```

这样 `refactor` 类型的提交也会触发修订号的增加。

## 总结与经验

通过这次踩坑，我们学到了几点重要经验：

1. **严格遵循约定式提交规范**：使用标准的提交类型前缀（`feat:`, `fix:` 等），而不是完整单词或变体
2. **理解不同提交类型的影响**：知道哪些类型会触发版本更新，哪些不会
3. **熟悉 Git 工具**：学会使用 `cherry-pick`, `rebase` 等工具来修复提交历史问题
4. **保持配置简单**：除非有特殊需求，否则保持默认配置

对于团队而言，建议将约定式提交规范添加到团队文档中，并考虑使用提交信息验证工具（如 `commitlint`）来确保所有提交都符合规范。

语义化版本发布工具可以大大简化版本管理，但前提是我们需要理解并遵循它的规则。希望这篇文章能帮助你避开类似的坑，顺利实现版本管理自动化。

## 相关资源

- [约定式提交规范官方文档](https://www.conventionalcommits.org/zh-hans/v1.0.0/)
- [Semantic Release GitHub 仓库](https://github.com/semantic-release/semantic-release)
- [Git 交互式变基教程](https://git-scm.com/book/zh/v2/Git-%E5%B7%A5%E5%85%B7-%E9%87%8D%E5%86%99%E5%8E%86%E5%8F%B2)
