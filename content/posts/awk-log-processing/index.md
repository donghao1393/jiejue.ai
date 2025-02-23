---
title: "使用 awk 优雅地处理日志文件：从入门到实践"
date: 2025-02-23T10:51:32+04:00
slug: 'awk-log-processing-guide'
draft: false
cover: "https://jiejue.obs.ap-southeast-1.myhuaweicloud.com/20250223105350142.webp"
tag:
  - Linux
  - 文本处理
  - AWK
  - 日志分析
---

在日常工作中，我们经常需要处理各种格式的日志文件。有时候日志的格式并不理想，需要我们进行一些转换和处理才能更好地分析数据。今天，我要和大家分享如何使用 awk 这个强大的文本处理工具来优雅地处理日志文件。

<!--more-->

## 问题场景

假设我们有一个应用程序生成的日志文件，每条记录包含了时间戳、事件类型、操作对象和相关进程信息。日志的原始格式如下：

```
2025-02-23 15:30:48.078 | Event: CREATE, Path: example.txt
相关进程:
AppOne(com.example.one)[最近活跃]
系统桌面(com.android.launcher)[最近活跃]
设置(com.android.settings)[最近活跃]

2025-02-23 15:31:01.218 | Event: MODIFY, Path: config.ini
相关进程:
AppTwo(com.example.two)[最近活跃]
系统桌面(com.android.launcher)[最近活跃]
...
```

这种格式虽然人眼容易读，但不利于我们用工具进行后续分析。我们希望：

1. 过滤出特定文件的操作记录（比如只看 .txt 和 .ini 文件）
2. 只保留第一个相关进程（通常是实际操作的进程）
3. 将信息整理成表格形式，方便导入到其它工具处理

## 解决方案

让我们一步步来编写一个 awk 脚本来处理这个日志文件。

### 第一步：基本结构

首先，我们需要一个基本的脚本框架：

```fish
set raw_log my_app.log  # 设置日志文件路径
awk '
BEGIN {
    # 打印表头
    printf("%-23s | %-12s | %-8s | %-20s | %s\n",
           "TIMESTAMP", "EVENT", "PATH", "APP", "PACKAGE")
    # 打印分隔线
    printf("%.90s\n", "------------------------------------------------------------------------------------------------------------------------------------------------")
}
# 后续处理逻辑会加在这里
' $raw_log
```

这个框架做了两件事：
1. 定义了输出的表格结构
2. 使用 `printf` 格式化输出，确保各列对齐

### 第二步：匹配关键行

接下来，我们需要找到包含我们感兴趣文件的行：

```awk
/Path:.*(txt|ini)/ {  # 匹配包含 txt 或 ini 的 Path 行
    # 保存这一行，后面会处理
    event_line = $0
    # 读取下一行
    getline
    if ($0 ~ /相关进程:/) {  # 检查是否是进程信息行
        getline  # 再读取一行得到第一个进程
        process = $0
        # 后续处理...
    }
}
```

这段代码：
1. 使用正则表达式匹配包含指定文件类型的行
2. 用 `getline` 读取后续行来获取进程信息
3. 把需要的信息存储在变量中

### 第三步：提取信息

现在我们来提取需要的具体信息：

```awk
# 提取时间戳
timestamp = $1" "$2

# 提取事件类型
match($0, /Event: [^,]+/)
event_type = substr($0, RSTART+7, RLENGTH-7)

# 提取文件路径
match($0, /Path: [^ |]+/)
path = substr($0, RSTART+6, RLENGTH-6)

# 提取进程信息
match($0, /[^(]+\([^)]+\)/)
full_proc = substr($0, RSTART, RLENGTH)
split(full_proc, parts, "(")
app_name = parts[1]
package = substr(parts[2], 1, length(parts[2])-1)
```

这里使用了几个重要的 awk 函数：
- `match()`：在字符串中查找匹配的模式
- `substr()`：提取子字符串
- `split()`：分割字符串

### 第四步：格式化输出

最后，我们用格式化的方式输出提取的信息：

```awk
printf("%s | %-12s | %-8s | %-20s | %s\n", 
       timestamp, event_type, path, app_name, package)
```

格式说明：
- `%s`：字符串占位符
- `-12s`：左对齐，宽度为12的字符串
- `\n`：换行符

## 完整脚本

把上面的部分组合起来，这就是我们完整的处理脚本：

```fish
set raw_log my_app.log
awk '
BEGIN {
    printf("%-23s | %-12s | %-8s | %-20s | %s\n",
           "TIMESTAMP", "EVENT", "PATH", "APP", "PACKAGE")
    printf("%.90s\n", "------------------------------------------------------------------------------------------------------------------------------------------------")
}
/Path:.*(txt|ini)/ {
    # 提取时间戳 
    timestamp = $1" "$2
    # 提取事件类型
    match($0, /Event: [^,]+/)
    event_type = substr($0, RSTART+7, RLENGTH-7)
    # 提取路径
    match($0, /Path: [^ |]+/)
    path = substr($0, RSTART+6, RLENGTH-6)
    # 读取进程信息
    getline
    if ($0 ~ /相关进程:/) {
        getline
        # 提取进程名和包名
        match($0, /[^(]+\([^)]+\)/)
        full_proc = substr($0, RSTART, RLENGTH)
        # 分割进程名和包名
        split(full_proc, parts, "(")
        app_name = parts[1]
        package = substr(parts[2], 1, length(parts[2])-1)
        # 输出格式化的日志
        printf("%s | %-12s | %-8s | %-20s | %s\n", 
               timestamp, event_type, path, app_name, package)
    }
}' $raw_log
```

运行这个脚本后，我们会得到这样的输出：

```
TIMESTAMP               | EVENT        | PATH     | APP                  | PACKAGE
------------------------------------------------------------------------------------------
2025-02-23 15:30:48.078 | CREATE       | test.txt | AppOne              | com.example.one
2025-02-23 15:31:01.218 | MODIFY       | app.ini  | AppTwo              | com.example.two
```

## 实用技巧

1. **测试正则表达式**：在编写复杂的正则表达式时，可以先用 `echo` 和 `grep` 测试：
   ```bash
   echo "your test string" | grep "your regex"
   ```

2. **调试输出**：在开发过程中，可以使用 `print` 语句来调试：
   ```awk
   print "Debug:", $0  # 打印当前行
   ```

3. **保存中间结果**：处理大文件时，可以先处理一小部分来测试：
   ```fish
   head -n 100 big_log.txt | awk '你的脚本' > test_output.txt
   ```

## 小结

通过这个例子，我们学会了：
1. 使用 awk 的基本语法和函数
2. 如何处理多行日志记录
3. 如何提取和格式化输出信息

这个脚本可以作为一个模板，通过修改正则表达式和输出格式，很容易适配其他类似的日志处理需求。希望这个教程能帮助你更好地理解和使用 awk 来处理日志文件。
