---
title: "JNV：一款让JSON数据一目了然的交互式导航工具"
date: 2025-03-30T20:40:11+04:00
slug: 'jnv-json-navigator-interactive-tool'
draft: false
cover: "https://jiejue.obs.ap-southeast-1.myhuaweicloud.com/20250330204108805.webp"
tag:
  - 工具
  - JSON
  - 终端
  - 数据处理
---

你是否曾经面对一大段复杂的JSON数据感到头疼？或者在Kubernetes的海量配置中迷失方向？JNV (JSON Navigator) 是一款交互式JSON查看和过滤工具，它让复杂数据变得清晰易懂，即使你不懂编程也能轻松驾驭。

<!--more-->

## 为什么需要JNV？

想象一下这个场景：小李是一名运维人员，他需要从Kubernetes返回的一大堆JSON数据中找出某个服务的状态信息。传统方法是他得使用`grep`或者复杂的`jq`命令，但这些工具要么找不准，要么需要记住一堆复杂语法。

```json
{
  "items": [
    {
      "metadata": { "name": "service-a", /* 还有几十行其他信息 */ },
      "status": {
        "conditions": [
          { "type": "Available", "status": "True" },
          { "type": "Progressing", "status": "False" }
        ]
      }
    },
    // 可能还有几十个类似结构...
  ]
}
```

面对这样的数据，小李感到无从下手。这时，JNV就能派上用场了！

## JNV是什么？

JNV是"JSON Navigator"的缩写，是一个终端中运行的交互式JSON浏览和过滤工具。它让你可以：

- 用鼠标或键盘直观地浏览复杂JSON结构
- 实时筛选你需要的信息
- 不需要记住复杂的jq语法
- 随时复制查询结果或查询命令

## 快速上手JNV

### 1. 安装

最简单的方法是通过brew安装（如果你使用Mac）：

```bash
brew install jnv
```

对于其他系统，也可以通过cargo安装：

```bash
cargo install jnv
```

### 2. 基本使用

假设你有个名为`data.json`的文件，可以这样使用JNV：

```bash
jnv data.json
```

或者处理命令输出的JSON：

```bash
kubectl get pods -o json | jnv
```

一旦启动JNV，你会看到一个漂亮的界面，显示你的JSON数据结构。

![JNV界面示意图 - 这里应展示JNV的界面，包括数据浏览区和过滤器编辑区](https://jiejue.obs.ap-southeast-1.myhuaweicloud.com/20250330205304511.webp)

### 3. 浏览JSON

一旦进入JNV界面，你可以：

- 使用**上下箭头键**浏览数据
- 按**Enter键**展开或折叠节点
- 使用**Shift+上下箭头**在编辑模式和查看模式之间切换

想象一下，小李需要查看所有服务的状态条件。他只需打开JNV，导航到数据，然后就能清楚地看到整个结构！

### 4. 过滤数据

假设小李现在只想看状态条件中的"类型"字段：

1. 按**Shift+↓**切换到编辑模式
2. 输入`.status.conditions[].type`
3. 立即看到过滤结果！

```
"Available",
"Progressing"
```

无需记忆复杂命令，一切都是实时、直观的！

### 5. 复制结果

找到你需要的数据后：

- 按**Ctrl+O**可以复制当前JSON到剪贴板
- 按**Ctrl+Q**可以复制当前jq过滤器到剪贴板（这样你下次可以直接在命令行使用）

## 在Kubernetes中使用JNV的实用场景

对于Kubernetes用户，JNV特别有用：

1. **排查Pod问题**
   ```bash
   kubectl get pod problem-pod -o json | jnv
   ```
   然后你可以轻松导航到`.status.conditions`查看问题所在。

2. **检查配置**
   ```bash
   kubectl get configmap my-config -o json | jnv
   ```
   直观地查看配置内容，无需记忆繁琐的路径。

3. **理解资源关系**
   ```bash
   kubectl get service my-service -o json | jnv
   ```
   一目了然地看到服务如何选择Pod（通过`.spec.selector`）。

## 小技巧

1. **查看帮助**：在JNV界面中，底部会显示可用的快捷键。

2. **更改缩进**：如果你觉得默认缩进太多或太少，可以用`-i`参数调整：
   ```bash
   jnv -i 4 data.json
   ```

3. **处理多个JSON**：JNV可以处理包含多个JSON对象的文件，如JSON Lines：
   ```bash
   cat multiple.jsonl | jnv
   ```

## 总结

JNV是一个简单而强大的工具，它让复杂的JSON数据变得清晰易懂。不管你是运维人员、开发者，还是只是偶尔需要处理JSON数据的用户，JNV都能帮你省下不少时间和精力。

最重要的是，你不需要成为命令行专家或记住复杂的jq语法，JNV的交互式界面让一切变得简单直观。

下次当你面对一堆复杂JSON数据时，试试JNV吧！

```bash
# 记住这个简单命令就够了
kubectl get RESOURCE -o json | jnv
```

你有没有在处理JSON数据时遇到过让你头疼的问题？JNV解决了你的问题吗？欢迎在评论区分享你的经验！
