---
title: "终端里发 API 请求：Shell 变量替换的几种方法"
date: 2026-01-13T19:51:20+04:00
slug: 'shell-variable-substitution-curl-requests'
draft: false
cover: "https://jiejue.obs.ap-southeast-1.myhuaweicloud.com/20260113195417420.webp"
tags:
  - Shell
  - curl
  - DevOps
  - API
---

当 Postman 不可用，或者你只是想在终端里快速测试一个 API，curl 是最直接的选择。但当请求里需要动态插入 token、用户名、邮箱这些存在文件里的值时，shell 的引号规则会让人头疼。这篇文章整理了几种在 curl 请求中插入变量的方法，覆盖 Bash 和 Fish 两种常见 shell。

<!--more-->

## 问题场景

假设你有这样一组文件：

```
auth.txt        # X-API-Key: sk_live_a1b2c3d4e5f6...
order_id.txt    # ORD-20260113-0042
customer.txt    # customer@example.com
```

你需要用这些值构造一个 PATCH 请求来更新订单信息。

## 基础：命令替换的引号规则

在 Bash 中，命令替换用 `$(...)` 语法。关键点是：**双引号内的 `$(...)` 会被展开，单引号内的不会**。

```bash
# ✅ 双引号 - 变量会被替换
curl --header "$(cat auth.txt)" https://api.example.com

# ❌ 单引号 - 字面输出 $(cat auth.txt)
curl --header '$(cat auth.txt)' https://api.example.com
```

Fish shell 的语法略有不同，用 `(...)` 而不是 `$(...)`:

```fish
# Fish 语法
curl --header (cat auth.txt) https://api.example.com
```

## 方法一：URL 中的变量替换

URL 部分相对简单，用双引号包裹整个 URL 即可：

```bash
# Bash
curl --location --request GET \
  "https://api.example.com/orders/$(cat order_id.txt)"
```

```fish
# Fish
curl --location --request GET \
  "https://api.example.com/orders/(cat order_id.txt)"
```

## 方法二：Header 中的变量替换

Header 同样在双引号内使用命令替换：

```bash
# Bash
curl --location --request GET "https://api.example.com/orders" \
  --header "$(cat auth.txt)" \
  --header "Content-Type: application/json"
```

```fish
# Fish - 推荐先存到变量
set auth (cat auth.txt | string trim)
curl --location --request GET "https://api.example.com/orders" \
  --header "$auth" \
  --header "Content-Type: application/json"
```

## 方法三：JSON Body 中的变量替换

这是最容易出错的部分。JSON 本身需要双引号包裹字符串值，而 shell 也用双引号来启用变量替换，两者冲突。

### 方案 A：转义内部双引号（繁琐但直接）

```bash
curl --request PATCH "https://api.example.com/orders/$(cat order_id.txt)" \
  --header "Content-Type: application/json" \
  --header "$(cat auth.txt)" \
  --data-raw "{
    \"customer\": \"$(cat customer.txt)\",
    \"status\": \"$(cat status.txt)\"
  }"
```

每个 JSON 的双引号都要加反斜杠转义，容易遗漏。

### 方案 B：用 jq 构建 JSON（推荐）

jq 可以安全地构建 JSON，自动处理特殊字符转义：

```bash
# Bash
jq -n \
  --arg customer "$(cat customer.txt)" \
  --arg address "$(cat address.txt)" \
  '{
    shipping: {
      recipient: $customer,
      address: $address,
      method: "express"
    }
  }' | curl --request PATCH "https://api.example.com/orders/$(cat order_id.txt)" \
    --header "Content-Type: application/json" \
    --header "$(cat auth.txt)" \
    -d @-
```

```fish
# Fish
set customer (cat customer.txt | string trim)
set address (cat address.txt | string trim)
set auth (cat auth.txt | string trim)
set order_id (cat order_id.txt | string trim)

set payload (jq -n --arg customer "$customer" --arg address "$address" '{
  shipping: {
    recipient: $customer,
    address: $address,
    method: "express"
  }
}')

curl --request PATCH "https://api.example.com/orders/$order_id" \
  --header "Content-Type: application/json" \
  --header "$auth" \
  -d "$payload"
```

注意 `-d @-` 表示从 stdin 读取数据，而 `--data-raw @-` 会把 `@-` 当作字面字符串。

### jq 中的变量引用

在 jq 内部，用 `--arg name value` 定义变量后，引用时直接用 `$name`。如果要在字符串中拼接变量，有两种写法：

```fish
# 字符串拼接
jq -n --arg id "$order_id" '{tracking: ["TRK-" + $id]}'

# 字符串插值（反斜杠语法）
jq -n --arg id "$order_id" '{tracking: ["TRK-\($id)"]}'
```

两者效果相同，但插值语法在复杂模板中更易读。

### 方案 C：Heredoc（仅 Bash）

Bash 支持 heredoc 语法，Fish 不支持：

```bash
curl --request PATCH "https://api.example.com/orders/$(cat order_id.txt)" \
  --header "Content-Type: application/json" \
  --header "$(cat auth.txt)" \
  --data-raw "$(cat <<EOF
{
  "customer": "$(cat customer.txt)",
  "status": "$(cat status.txt)"
}
EOF
)"
```

## 方法四：用 Python 脚本（最可靠）

当请求复杂度上升，或者需要处理响应、做错误重试时，Python 脚本是最清晰的选择：

```python
#!/usr/bin/env python3
import requests

def read_file(path):
    with open(path) as f:
        return f.read().strip()

order_id = read_file('order_id.txt')
customer = read_file('customer.txt')
address = read_file('address.txt')
api_key = read_file('auth.txt')

url = f"https://api.example.com/orders/{order_id}"

headers = {
    "Content-Type": "application/json",
    "X-API-Key": api_key.replace("X-API-Key: ", "") if api_key.startswith("X-API-Key") else api_key
}

payload = {
    "shipping": {
        "recipient": customer,
        "address": address,
        "method": "express"
    }
}

response = requests.patch(url, headers=headers, json=payload)
print(response.status_code)
print(response.text)
```

运行方式：

```bash
uv run --with requests python update_order.py
```

## 附加技巧：生成 SQL 语句

同样的变量替换思路也适用于生成 SQL。Fish 脚本示例：

```fish
#!/usr/bin/env fish
# generate_sql.fish

set old_status (cat old_status.txt | string trim)
set new_status (cat new_status.txt | string trim)
set order_id (cat order_id.txt | string trim)

# 转义单引号防止 SQL 注入
set new_status_escaped (string replace --all "'" "''" -- $new_status)

echo "-- Query current status
SELECT order_id, status FROM orders WHERE order_id = '$order_id';

-- Update status
UPDATE orders 
SET status = '$new_status_escaped'
WHERE order_id = '$order_id';"
```

运行后重定向到文件：

```fish
fish generate_sql.fish > update_order.sql
```

## 常见陷阱

**认证文件格式不一致**：有些 API 要求 header 名和值一起存（如 `X-API-Key: sk_xxx`），有些只存值。读取时注意格式处理。

**Token 文件重复内容**：如果文件不小心保存了两遍内容（比如复制粘贴时多按了一次），请求会失败。用 `wc -c` 检查文件大小是否异常。

**文件末尾换行符**：有些工具对换行符敏感。用 `string trim` (Fish) 或 `tr -d '\n'` (Bash) 去除。

**单双引号混淆**：记住一条规则——需要变量替换时用双引号，不需要时用单引号。

## 选择建议

根据场景复杂度选择方案：

- **简单的一次性请求**：直接在命令行用双引号 + 命令替换
- **包含 JSON body**：用 jq 构建，避免手动转义
- **需要重复执行或处理响应**：写 Python 脚本
- **Fish shell 用户**：先把文件内容存到变量，再构建请求

掌握这些方法后，在终端里发送 API 请求会变得和 Postman 一样顺手——甚至更快，因为不需要离开键盘。
