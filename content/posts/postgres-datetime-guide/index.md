---
title: "PostgreSQL 日期时间操作速查：从踩坑到熟练"
date: 2025-12-23T21:19:51+04:00
slug: 'postgres-datetime-guide'
draft: false
cover: "https://jiejue.obs.ap-southeast-1.myhuaweicloud.com/20251223212232006.webp"
tags:
  - PostgreSQL
  - SQL
  - 数据库
---

日期时间处理是SQL查询中最常见的需求之一，也是新手最容易踩坑的地方。本文整理PostgreSQL中日期时间操作的核心用法，帮你快速上手。

<!--more-->

## 字符串转日期：引号和格式的陷阱

写日期查询时，第一个坑往往是引号。来看一个典型的错误写法：

```sql
-- ❌ 错误：双引号在SQL中是用于标识符的
SELECT * FROM orders 
WHERE created_at BETWEEN "14/Dec/24 9:00 AM" AND "21/Dec/24 9:00 AM"
```

SQL标准规定，字符串必须用单引号，双引号是给列名、表名这类标识符用的。第二个问题是日期格式——`14/Dec/25` 这种写法大多数数据库无法直接解析。

正确写法是使用ISO标准格式 `YYYY-MM-DD HH:MM:SS`：

```sql
-- ✅ 正确
SELECT * FROM orders 
WHERE created_at BETWEEN '2024-12-14 09:00:00' AND '2024-12-21 09:00:00'
```

如果想更明确，可以用 `::timestamp` 显式转换类型：

```sql
SELECT * FROM orders 
WHERE created_at BETWEEN '2024-12-14 09:00:00'::timestamp 
                      AND '2024-12-21 09:00:00'::timestamp
```

## 日期比较：灵活运用比较运算符

查询某个日期之后的数据，用 `>=` 即可：

```sql
-- 查询 2024年12月14日 9:00 之后的所有记录
SELECT count(*) FROM orders 
WHERE created_at >= '2024-12-14 09:00:00'
```

如果要明确查到当前时刻为止，可以配合 `NOW()` 使用：

```sql
SELECT count(*) FROM orders 
WHERE created_at BETWEEN '2024-12-14 09:00:00' AND NOW()
```

`NOW()` 返回当前时间戳，等效的写法还有 `CURRENT_TIMESTAMP`。两者在PostgreSQL中行为一致，选择哪个主要看个人习惯。

## INTERVAL：时间运算的核心

日期时间的加减运算是实际业务中的高频需求。PostgreSQL用 `INTERVAL` 语法处理这类运算，语义直观：

```sql
-- 加一天
NOW() + INTERVAL '1 day'

-- 加一小时
NOW() + INTERVAL '1 hour'

-- 减三天
NOW() - INTERVAL '3 days'
```

单位支持 `year`、`month`、`week`、`day`、`hour`、`minute`、`second`，单复数形式都可以（`1 day` 和 `1 days` 都合法）。

更灵活的是，可以组合多个单位：

```sql
NOW() + INTERVAL '1 day 2 hours 30 minutes'
```

这个语法在实际查询中非常实用。比如查最近24小时的数据：

```sql
SELECT count(*) FROM orders 
WHERE created_at >= NOW() - INTERVAL '24 hours'
```

查最近一周：

```sql
SELECT * FROM logs 
WHERE created_at >= NOW() - INTERVAL '7 days'
ORDER BY created_at DESC
```

查某个固定日期到明天的数据：

```sql
SELECT count(*) FROM batch_job 
WHERE created_at BETWEEN '2024-12-14 09:00:00' AND NOW() + INTERVAL '1 day'
```

## 常用时间函数速查

除了 `NOW()`，PostgreSQL还提供了一些常用的时间函数：

| 函数 | 返回值 | 示例 |
|------|--------|------|
| `NOW()` | 当前时间戳（带时区） | `2024-12-20 09:30:00+08` |
| `CURRENT_DATE` | 当前日期 | `2024-12-20` |
| `CURRENT_TIME` | 当前时间 | `09:30:00+08` |
| `DATE_TRUNC('day', ts)` | 截断到指定精度 | 将时间截断到天的开始 |

`DATE_TRUNC` 在统计场景特别有用。比如按天统计订单数：

```sql
SELECT DATE_TRUNC('day', created_at) AS day, COUNT(*)
FROM orders
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE_TRUNC('day', created_at)
ORDER BY day
```

## 小结

PostgreSQL的日期时间操作记住三点：

字符串用单引号，格式用ISO标准 `YYYY-MM-DD HH:MM:SS`。当前时间用 `NOW()` 或 `CURRENT_TIMESTAMP`。时间加减用 `INTERVAL '数量 单位'` 语法。

掌握这些，日常的日期查询需求基本都能覆盖。
