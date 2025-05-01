---
title: "MCP数据库服务：轻松管理多个数据库"
date: 2025-02-09T21:32:00+04:00
slug: 'mcp-dbutils-quick-guide'
draft: false
cover: "https://jiejue.obs.ap-southeast-1.myhuaweicloud.com/20250209213924711.webp"
tags:
  - MCP
  - Database
  - Usage
---

如果你和我一样经常需要查看不同项目的数据库，一定经历过这样的烦恼：要频繁切换数据库连接，记住不同的连接参数，还要注意安全问题。今天介绍一个简单但强大的工具，让数据库查询变得像跟AI对话一样自然。

<!--more-->

## 真实场景演示

想象一下，你需要查看两个不同项目的数据库。使用MCP数据库服务，操作是这样的：

```
用户: 看看stage-db里user表里的内容

AI助手: 让我查询一下。

从查询结果看，user表包含了用户的基本信息：
1. user_id: 用户的唯一标识符
2. first_name: 用户名
3. last_name: 姓氏
4. email: 电子邮件地址
5. created_at: 创建时间
6. data: 附加数据

用户: 再看看dev-db，这应该不是一个项目的吧

AI助手: 让我看看dev-db里的情况。

确实是不同的项目，dev-db是一个社交应用数据库：
- users: 用户表
- posts: 帖子表
- interactions: 互动表

两个数据库完全不同：
1. stage-db是企业门户系统，关注用户管理
2. dev-db是社交平台，包含内容和互动功能
```

看，就像日常对话一样简单！不需要记住连接参数，不用担心安全问题，只要说明想看什么，AI就能帮你完成查询。

## 如何配置

```mermaid
graph LR
    A[准备配置文件] --> B[添加到AI设置]
    B --> C[开始使用]
    style A fill:#f0f8ff
    style B fill:#e6ffe6
    style C fill:#fff0f0
```

### 第一步：准备配置文件

创建一个`config.yaml`文件，填入数据库信息：

```yaml
databases:
  # PostgreSQL数据库配置
  stage-db:
    type: postgres
    dbname: stage
    user: myuser
    password: mypassword
    host: localhost
    port: 5432

  # SQLite数据库配置
  dev-db:
    type: sqlite
    path: /path/to/dev.db
```

### 第二步：添加到AI设置

在你的AI助手配置中添加：

```json
"mcpServers": {
  "dbutils": {
    "command": "uvx",
    "args": [
      "mcp-dbutils",
      "--config",
      "/path/to/config.yaml"
    ],
    "env": {
      "MCP_DEBUG": "1"  // 如果需要调试信息
    }
  }
}
```

### 第三步：开始使用

配置完成后，你就可以像开头演示的那样，通过自然对话来查询数据库了！

## 安全提示

- 服务仅支持SELECT查询，保护数据库安全
- 敏感信息（如密码）会自动在日志中隐藏
- 所有查询都在只读事务中执行

现在，你可以像聊天一样轻松管理多个数据库了。试试看，你会爱上这种简单的方式！
