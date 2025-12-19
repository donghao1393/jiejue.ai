---
title: "Bun：一个想要终结 JavaScript 工具链混乱的野心家"
date: 2025-12-20T02:23:35+04:00
slug: 'bun-javascript-runtime-intro'
draft: false
cover: "https://jiejue.obs.ap-southeast-1.myhuaweicloud.com/20251220022638479.webp"
tags:
  - JavaScript
  - 前端开发
  - 工具链
  - Bun
---

如果你是前端开发者，你一定经历过这样的时刻：新建一个项目，要装 Node.js，要装 npm 或 yarn 或 pnpm，要配 TypeScript，要选打包工具 webpack 还是 vite 还是 esbuild，要选测试框架 Jest 还是 Vitest……还没写一行业务代码，半天已经过去了。

有人决定终结这种混乱。

<!--more-->

## 一个 Stripe 工程师的不满

2021 年，一个叫 Jarred Sumner 的年轻工程师离开了 Stripe。他在那里见识了大规模 JavaScript 项目的复杂性，也深刻体会到现有工具链的割裂与低效。Node.js 负责运行代码，npm 负责管理依赖，webpack 负责打包，Jest 负责测试——每一个工具都有自己的配置文件、自己的生态、自己的学习曲线。

他开始用 Zig 语言（一种以性能著称的系统编程语言）从零构建一个新东西。他的目标不是做一个"更好的 npm"或"更快的 Node.js"，而是把运行时、包管理器、打包器、测试框架全部整合进一个二进制文件里。

他给它起名叫 **Bun**。

2022 年，Bun 首次公开亮相。2023 年 9 月，1.0 正式版发布。同年，他成立的公司 Oven 拿到了 a16z（硅谷顶级风投）领投的数千万美元融资。这不是一个人的业余项目，而是一场认真的技术革命尝试。

## Bun 想做什么

用一句话概括：**把前端开发者需要的所有基础工具，装进一个命令里**。

当你安装了 Bun，你同时获得了：

**一个 JavaScript/TypeScript 运行时**。直接运行 `.js`、`.ts`、`.tsx` 文件，不需要配置 tsconfig，不需要安装 ts-node。Bun 内置了 TypeScript 转译器。

**一个包管理器**。`bun install` 可以替代 `npm install`，读的是同样的 `package.json`，生成的是同样的 `node_modules` 结构。区别在于速度——实测下来，Bun 的安装速度通常是 npm 的 10 到 20 倍，在有缓存的情况下几乎是瞬间完成。

**一个打包器**。`bun build` 可以把你的项目打包成生产环境可用的代码，功能类似 esbuild。

**一个测试框架**。`bun test` 提供了内置的测试运行器，API 兼容 Jest，迁移成本很低。

这种"全家桶"设计的好处是显而易见的：配置文件少了，依赖冲突少了，开发者可以把精力放在真正重要的事情上。

## 性能：快到什么程度

Bun 的性能优势来自两个层面。

第一是语言选择。Node.js 是用 C++ 写的，跑在 V8 引擎上；Bun 是用 Zig 写的，跑在 JavaScriptCore（Safari 的 JS 引擎）上。Zig 是一种追求极致性能的系统语言，而 JavaScriptCore 在某些场景下的启动速度优于 V8。

第二是架构设计。Bun 的包管理器使用全局缓存和硬链接，避免重复下载和磁盘写入。它的 HTTP 服务器实现也针对高并发做了深度优化。

具体数字因场景而异，但一些基准测试的结果相当惊人：在 HTTP 请求处理上，Bun 每秒能处理约 5.2 万个请求，而 Node.js 大约是 1.3 万个。在 SQLite 查询上，Bun 每秒约 81 次，Node.js 约 21 次。启动时间上，Bun 约 5 毫秒，Node.js 约 25 毫秒。

这些数字在你写一个小脚本时感知不明显，但当你需要频繁重启开发服务器、运行大量测试用例、或者在生产环境处理高并发请求时，差距就显现出来了。

不过，性能宣传也需要打个折扣。Bun 官网的对比图至今还在用 Yarn v1 做比较（v3 早就发布了），对比 Vitest/Jest 时也没有说明后者为了测试隔离而有意牺牲了速度。这不影响 Bun 确实很快的事实，但在评估时需要自己跑跑 benchmark。

## 动手试试

macOS 用户可以直接用 Homebrew 安装：

```bash
brew install oven-sh/bun/bun
```

Linux 和 WSL 用户可以用官方脚本：

```bash
curl -fsSL https://bun.sh/install | bash
```

安装完成后，验证一下：

```bash
bun --version
```

现在来体验 Bun 的几个核心功能。

**直接运行 TypeScript**。创建一个 `hello.ts` 文件：

```typescript
const greet = (name: string): void => {
  console.log(`Hello, ${name}!`);
};

greet("Bun");
```

然后直接运行：

```bash
bun hello.ts
```

没有编译步骤，没有配置文件，直接输出 `Hello, Bun!`。

**初始化一个项目**：

```bash
mkdir my-bun-project && cd my-bun-project
bun init
```

Bun 会交互式地帮你创建 `package.json`、`tsconfig.json`（如果需要）、入口文件。整个过程不到 3 秒。

**安装依赖**：

```bash
bun add express
```

你会发现安装速度快得不像话。如果你之前装过这个包，基本上是瞬间完成。

**运行脚本**。在 `package.json` 里定义的脚本，可以用 `bun run` 执行：

```bash
bun run dev
```

甚至可以省略 `run`：

```bash
bun dev
```

## 生产环境：需要睁大眼睛

说完了优点，必须诚实地谈谈风险。Bun 的开发体验确实很好，但生产环境是另一回事。

**版本稳定性存疑**。Bun 的版本策略让人担忧：patch 版本（1.0.x）里会塞新功能，minor 版本（1.1）里会引入破坏性变更。比如 1.1 改了默认的 `NODE_ENV` 值，1.1.26 改了 `node:http` 的 `idleTimeout` 行为。对于生产系统来说，版本号是一种契约——你需要知道什么时候升级是安全的。Bun 目前的做法让这种判断变得困难。相比之下，Node.js 有清晰的 LTS（长期支持）版本线，你知道哪些版本是稳定的、会维护多久。

**迁移锁定风险**。Bun 提供了很多非标准的便捷 API：`Bun.file`、`Bun.serve`、`Bun.YAML.stringify` 等等。用起来很爽，但一旦依赖这些 API，你就被绑定在 Bun 上了。如果以后需要迁回 Node.js（比如 Bun 的某个 bug 影响了你的业务），迁移成本会很高。更麻烦的是，Vitest 支持的 issue 从 1.0 之前就开了，至今未解决，这意味着你基本上被迫使用 Bun 自己的测试框架。

**Issue 积压严重**。一个值得注意的数据：Node.js 支撑着全球大部分 JS 应用，目前有约 1700 个 open issues；Bun 的采用率远低于 Node，却有约 4700 个 open issues。这个比例反映的是维护能力和产品成熟度的差距。

**一些设计决策有争议**。Bun 的 `package.json` 支持 JSONC（带注释的 JSON），这破坏了与其他工具的兼容性。lifecycle scripts 默认不执行（这本身是好的安全实践），但 Bun 维护了一个"热门包白名单"允许这些包的脚本执行——这种设计既不完全安全，对小众包的用户也不友好。

**生态协作态度**。社区里有一些关于 Bun 团队协作风格的讨论。比如 LightningCSS 的作者提供了 C bindings 愿意合作，Bun 选择自己用 Zig 重写一份；Bun 还在 `tsconfig.json` 里自创了一个 TypeScript 官方没有的 flag。这种"自己搞一套"的风格让人担心长期的生态兼容性。

2024 年的 State of JavaScript 调查显示，Bun 已经超过 Deno 成为 JS 运行时的第二选择。但从 Stack Overflow 的问题数量看，Node.js 有 47 万个问题，Bun 只有 260 个——这反映的是生产环境采用率的真实差距。

## 什么场景适合用 Bun

基于以上分析，给一个务实的建议：

**适合大胆使用的场景**：个人项目、内部工具、原型开发、CLI 脚本、对性能极度敏感且能接受风险的新项目。

**需要谨慎评估的场景**：已有的大型生产项目、需要长期维护的系统、团队成员对 Bun 不熟悉的项目。

**如果想尝试但控制风险**：可以先只用 `bun install` 替代 npm 来感受速度提升，运行时仍然用 Node.js。这样既能享受包管理的加速，又不会被锁定在 Bun 的运行时 API 上。

## 结语

JavaScript 生态的工具链碎片化是一个真实的痛点。Bun 的出现代表了一种解决思路：与其让开发者在无数工具之间做选择题，不如把最常用的功能整合到一起，用极致的性能和简洁的体验赢得用户。

这种"大一统"的野心能否成功，取决于它能否在保持速度优势的同时，建立起 Node.js 级别的稳定性和信任度。从目前的发展轨迹看，Bun 还在快速迭代中，距离"生产级稳定"还有一段路要走。

但这不妨碍你现在就试试。下次写个小脚本或者起个新项目时，`bun init` 一下，感受一下那种"原来开发可以这么快"的体验。至于生产环境，给它一点时间。
