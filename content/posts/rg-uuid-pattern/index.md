---
title: "用 ripgrep 匹配 UUID：一行正则与 fish 封装"
date: 2025-12-20T02:41:54+04:00
slug: 'rg-uuid-pattern'
draft: false
cover: "https://jiejue.obs.ap-southeast-1.myhuaweicloud.com/20251220024312884.webp"
tags:
  - CLI
  - ripgrep
  - fish
---

在日志或配置文件里搜 UUID 是常见需求，ripgrep 配合一行正则就能搞定。

<!--more-->

## 正则模式

UUID 的标准格式是 `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`，32 个十六进制字符加 4 个连字符。匹配它的正则：

```bash
rg '[0-9a-fA-F]{8}(-[0-9a-fA-F]{4}){3}-[0-9a-fA-F]{12}'
```

用 POSIX 字符类可以稍微简化：

```bash
rg '[[:xdigit:]]{8}(-[[:xdigit:]]{4}){3}-[[:xdigit:]]{12}'
```

## rg 没有内置模式预设

你可能想问：能不能像 `rg --type=uuid` 这样用预设模式？答案是不能。

rg 的 `--type` 参数是按文件扩展名过滤的，不是正则预设。这不是功能缺失，而是设计选择——rg 遵循 Unix 哲学，专注做好快速搜索这一件事，把模式管理交给 shell 层面。

## fish function 封装

在 fish 里定义一个函数是最干脆的方案：

```fish
# ~/.config/fish/config.fish
function rg-uuid
    rg '[0-9a-fA-F]{8}(-[0-9a-fA-F]{4}){3}-[0-9a-fA-F]{12}' $argv
end
```

之后直接 `rg-uuid /path/to/logs` 就行。`$argv` 透传所有参数，所以 rg 的其他选项（如 `-i`、`-c`、`--json`）都能正常用。

如果你只是偶尔用，abbr 也行：

```fish
abbr --add uuid-grep "rg '[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}'"
```

## 小结

rg 作为 Rust 生态里文本搜索的标杆工具，其设计思路是把复杂的模式管理留给用户的 shell 环境。这不是缺陷，而是专注——它只负责跑得快、搜得准，至于你怎么组织你的常用正则，那是你自己的事。
