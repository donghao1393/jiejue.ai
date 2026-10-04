---
title: "git-filter-repo 到底是什么：别把它当成插件，也别当成 rebase 的加强版"
date: 2026-10-04T09:30:00+04:00
slug: 'git-filter-repo-explained'
draft: false
cover: "https://jiejue.obs.ap-southeast-1.myhuaweicloud.com/20261004100435023.webp"
tags:
  - Git
  - 版本控制
  - 命令行工具
  - 历史重写
---

如果有一天你必须在「这个仓库的历史」和「这个仓库还能用」之间做选择，你会怎么办？

可以试着闭眼三秒想一个真实场景：你不小心把一个配置文件连着密码一起提交了，而且是三个月前提交的，后面还有两百多个提交压在上面。文件你现在已经从工作区删掉了，`git log -- 那个文件` 也什么都看不到了——但你心里清楚，它还在 `.git` 里躺着，任何人 clone 一次就能翻出来。删文件解决不了这个问题，因为 Git 保存的是"某一次提交的完整快照"，而不是"文件的当前状态"。要让那段内容从历史里消失，你必须**重写历史**。

<!--more-->

这时你多半会搜到两个名字：`git filter-branch` 和 `git filter-repo`。前者是爷爷辈的工具，慢、坑多，官方自己的文档里都写着"不推荐使用"；后者是被官方文档点名推荐的替代品。

但围绕 `git filter-repo` 有两种特别常见的误解，而且方向完全相反：

- 一种是**高估它**——"这是个删敏感文件的神器，一条命令搞定"；
- 一种是**低估它**——"不就是把 `filter-branch` 用 Python 重写了一遍吗"。

这篇文章想谈的，是夹在这两句话中间的那部分：它到底是个什么东西、它的机制为什么决定了它的能力边界、以及官方文档里那条**最容易被忽略、也最容易让人翻车**的规则。

## 一、先纠正一个用词：它不是插件

`git filter-repo` 是一个**独立的 Python 脚本**。它的文件名被故意起成 `git-filter-repo`，只要把它放进 `PATH`，Git 就会把它当作外部子命令来调用——也就是在命令行里敲 `git filter-repo` 时，Git 会去找一个叫 `git-filter-repo` 的可执行文件并执行它。

这是 Git 提供的一个**命名约定**，不是插件机制。它没有加载进 Git 进程，不通过 Git 的某个扩展 API 工作，和 `git filter-branch` 之间也没有任何代码继承关系。它们只是"解决同一类问题"的前后两代工具。

更重要的是：**它同时还是一个 Python 库**。官方手册在讲它的多功能性时专门提到，你可以 `import` 它，用它里面的类和方法去构建自己的工具：

> One can even use this to write new tools with a completely different interface.

所以把它理解成"一个带 CLI 的历史重写引擎"会比"一个插件"准确得多。CLI 只是它的一层壳，壳下面是一套通用的对象变换框架。

## 二、它的机制：一次"有选择的整体重放"

要理解它能做什么、不能做什么，得先知道它怎么干活的。

`git filter-repo` 的内部管线，本质上等价于：

```text
git fast-export --all  →  逐个对象做决策  →  git fast-import
```

它把仓库里所有的提交、树、标签、blob 全部遍历一遍，**对每个对象决定：留下、丢掉、还是改写**，然后把结果重放成一套全新的历史，最后删掉旧历史、重新打包。

这个机制推出三个非常重要的结论：

**第一，它天然是"全仓库"的，不是"某个分支"的。** 它不是在某条提交链上打补丁，而是在遍历所有 ref 之后重建对象图。

**第二，它知道"内容在哪里"。** 因为它拿到的是每个 commit 对应的 tree 和 blob，所以它才能真正做到"从历史里删掉一个文件的内容"——而不是像 `rebase` 那样只是重放了一串补丁，旧 blob 依然作为悬空对象留在对象库里。

**第三，它的扩展能力来自回调（callback），而不是参数。** 从便利参数到 Python 回调，官方给了一个很清楚的"能力阶梯"：

| 层次 | 手段 | 例子 |
|------|------|------|
| 1 | 便利选项 | `--path`、`--strip-blobs-bigger-than`、`--replace-text`、`--mailmap` |
| 2 | 某个选项的通用形态 | `--paths-from-file`（能干所有 `--path*` 的活，还支持正则改名） |
| 3 | 针对单类数据的回调 | filename / message / name / email / refname |
| 4 | 针对底层 Git 对象的回调 | commit / tag / blob / reset |
| 5 | 把整个工具 import 进你自己的程序 | 构建全新接口的重写工具 |

真正"批量改"的时候，干活的通常是第 3、4 层的回调。到了第 5 层，它其实已经不再是"一个命令"，而是"一个工具箱"。

顺带说一句：这条能力阶梯里还有一类**不修改任何东西**的用法——`--analyze`。它只分析历史、生成报告，用来帮你决定该过滤什么，或者验证上一次过滤是否达到了预期。手册里写得毫不含糊：

> Will not modify your repo.

一个"只读分析"模式出现在一个"历史重写工具"里，本身就说明它的定位比"批量修改"宽。

### 和 rebase 的分工

这两种工具经常被拿来比较，但它们改的根本不是同一个东西：

| | `git rebase -i` | `git filter-repo` |
|---|---|---|
| 操作维度 | 提交序列（在某条链上重放补丁） | 对象（对每个 commit/tree/blob 做决策） |
| 覆盖范围 | 你指定的那段 + 当前分支 | 所有分支、所有标签 |
| 能删内容吗 | 不能，只能让后面的提交不再包含它 | 能，旧 blob 不再出现在新历史里 |
| 合并提交 | 容易打乱拓扑 | 保留拓扑，并处理"退化合并"的边界情况 |
| 主要风险 | 冲突、误操作 | 破坏性重写，且难以回头 |

一句话：**rebase 是重排，filter-repo 是重造。** 你要处理的如果是"我最近三个提交写乱了"，`rebase -i` 又轻又快；如果是"给我把这三个月的历史里所有 `*.pem` 都抹掉"，那只有后者能干。

## 三、元数据会保留吗？

这是很多人最关心的问题：重写历史之后，我那一千多个提交的**作者、时间、提交信息**还在吗？

答案是：**默认全部保留**，除非你显式要求修改。

具体包括：作者姓名与邮箱、作者时间戳、提交者姓名与邮箱、提交时间戳、提交信息、父子拓扑关系。你只是想删掉一个文件，那么除了受影响的那些提交的**哈希**会变，其他一切照旧。

需要主动改的时候，改法也是分层的：

```bash
# 1) 用 mailmap 永久固化作者/邮箱映射（时间戳不动）
git filter-repo --mailmap .mailmap

# 2) 用回调改时间戳等任意字段
git filter-repo --commit-callback '
  if b"old@example.com" in commit.author_email:
      commit.author_date = b"2023-01-01T00:00:00+0000"
'
```

验证时可以对比新旧两条提交：

```bash
git log --format="%H %an <%ae> %ad %cn <%ce> %cd" -1
```

但请记住：**哈希一定会变**。这是重写历史的定义，不是副作用。所有引用旧哈希的地方——你的脚手架脚本、CI 配置、issue 里的链接、同事本地的分支——都需要重新对齐。

## 四、四个最常被照抄的用法（以及各自的前提）

```bash
# 1) 从全部历史中删掉某个文件
git filter-repo --path secrets.env --invert-paths

# 2) 把某个子目录提取成新仓库的根
git filter-repo --subdirectory-filter services/api/

# 3) 把 mailmap 的映射固化进历史
git filter-repo --mailmap .mailmap

# 4) 干掉所有超过 10MB 的大文件
git filter-repo --strip-blobs-bigger-than 10M
```

这四条都对，但每一条背后都有个不显然的前提：

**关于第 1 条：`--invert-paths` 反选的是"路径选择器"，不是所有条件。** 如果你写成 `--path tmp/ --author someone@example.com --invert-paths`，它的真实语义是"反选那一组路径匹配"，而不是"同时反选作者条件"。把路径选择和作者/时间等条件混在一起再反选，语义很容易和直觉不符。**这种组合千万别靠推理，要在一个一次性仓库里先跑一遍，把 `commit-map` 拿出来看。**

**关于第 2 条：它不是另一种模式。** `--subdirectory-filter` 只是 `--path` 加 `--path-rename` 的便利写法，理解成"语法糖"就好，别以为它会走一条不同的代码路径。

**关于第 4 条：别只看文件大小。** `--strip-blobs-bigger-than` 是按 blob 大小筛，对"某个目录整体很大"或"某类扩展名很大"的场景，用 `--path` / `--path-glob` 会更可控。

### 那些默认就会发生的事

这几个自动行为经常让"我只想动一个文件"的人一脸问号，但它们在官方手册里全部是**默认开启**的：

- 把提交信息里（可能是缩写形式的）旧哈希**重写成新哈希**；
- 剪掉因为过滤而变空的提交，也包括"退化成空"的合并提交；
- **重写 stash**；
- 把 `refs/replace/` 里的替换引用**烘焙**进正式历史，然后删掉这些引用；
- 删掉原始历史，避免新旧历史混在一起；
- 结束后自动 repack，帮你把仓库压小。

大部分可以覆盖，但你要先知道它们存在。

## 五、最重要的一条：它不会帮你备份

这是整篇文章我最想让人记住的一点。

很多关于 `git filter-repo` 的介绍（包括我见过的一些 AI 生成的说明）会写"它默认强制创建备份，比 rebase 安全"。**这句话是错的，而且错得方向刚好相反。**

官方手册里有一整节叫 *FRESH CLONE SAFETY CHECK AND --FORCE*。作者的态度非常坦率：他**没有办法检查你有没有备份**，于是只能退而求其次，问一个"代理问题"——**"这个仓库是不是一个全新 clone？"**

具体做法是：他找了大约十来条"全新 clone 通常一定成立"的特征，逐条检查。只要不满足，`git filter-repo` 就会**直接中止**，要求你加 `--force`。

作者对这个机制可能误判也毫不掩饰：有人可能备份得很好但不是全新 clone（误报），也有人可以刻意把仓库改造成满足这些条件的样子（漏报）。但实践中它足够有效，作者甚至说自己有一次在错误的目录里想跑 filter-repo，就是被这个检查拦下来的。

然后他写了一段话，值得原样体会：

> It is a really bad idea to get in the habit of always specifying `--force`; if you do, one day you will run one of your commands in the wrong directory like I did, and you won't have the safety check anymore to bail you out. Also, it is definitely NOT okay to recommend `--force` on forums, Q&A sites, or in emails to other users without first carefully explaining that `--force` means putting your repositories' data at risk.

所以正确的表述是：

**它的安全机制是"要求你在全新 clone 上操作"，而不是"自动给你做备份"。** 真正的备份动作，必须由你自己在动手之前完成。

那仓库里那个 `.git/filter-repo/` 目录是干什么的？它是 **`commit-map`、`ref-map`、`first-changed-commits` 这类映射表**——用途是让你能看到"旧哈希 → 新哈希"的对应关系，以及让下一次运行能被识别为"上一次的延续"。**它不是回滚用的备份。**

还有一个细节特别能说明作者的设计意图：为了逼你不要在原地改，filter-repo 会**主动删掉你的 `origin` remote**。"全新 clone"是它给你留的退路，而它希望那条退路一直在。

顺带一个现实提醒：如果你的仓库只在本地、没有远端，那这个检查也救不了你——加到 `--force` 之前，请先复制整个目录。

## 六、这条路没有回头票，而且不止你一个人要走

历史重写是**不可逆**的，而且影响的不只是你：

- **所有协作者都必须重新处理。** 最省事的做法是让大家重新 clone；如果不想，至少要 `git fetch` 之后把自己的分支 rebase 到新历史上。任何还持有旧历史的人一旦 push，旧历史就会被推回来。
- **保护分支要先放开。** force push 到 `main` 这类分支，通常要被临时解锁。
- **`--force` 不是习惯动作。** 它绕过的是你唯一的自动兜底，别把它写进脚本模板里。

## 七、它也不是秘密扫描器

这一节是给被"一键清除敏感信息"吸引过来的读者看的。

`git filter-repo` 擅长的是**按你给出的条件做替换和删除**，它**不负责发现**你历史里有什么。想知道仓库里到底藏了哪些秘密，应该用专门的扫描器（比如 gitleaks、trufflehog 这类），让它们出报告，再拿着报告去写 filter-repo 的参数。

更关键的是：**如果秘密已经推到过公共仓库，重写历史并不能保证它消失了。** Fork、第三方缓存、托管平台的悬空对象，都可能还留着副本。这种情况下正确的第一动作是**轮换密钥**——把泄露的东西作废，然后才是清理历史。

把 `filter-repo` 当成"事后补救的一环"，而不是"安全的终点"。

## 八、可以直接照抄的工作流

```bash
# 0) 挑一个专门的工作副本（不是你的日常仓库）
git clone <repo-url> repo-rewrite
cd repo-rewrite

# 1) 先分析，不改任何东西
git filter-repo --analyze
# 报告在 .git/filter-repo/analysis/ 下，看清楚再决定过滤条件

# 2) 在副本上试跑（此时 origin 还在，加 --force 才允许运行）
git filter-repo --path secrets.env --invert-paths --force

# 3) 立刻核对结果
git log --oneline | head
cat .git/filter-repo/commit-map | head    # 旧哈希 → 新哈希

# 4) 推到一个新仓库，通知所有人重新 clone（推荐做法）
git remote add clean-origin <new-repo-url>
git push clean-origin --all
git push clean-origin --tags

#    如果确实必须覆盖原仓库（见下文"关于第 4 步"），再改成：
#    git remote add origin <repo-url>
#    git push --force --branches --tags --prune
```

**心法只有一句：把"重写历史"当成"发布一个新仓库"来对待，而不是"原地改一下"。** 一旦你按这个心态准备——专门的副本、先分析、试跑、核对、再推送、最后通知协作者——上面那些坑基本都会自动绕开。

### 关于第 4 步：作者其实建议你推到一个新仓库

上面第 4 步给的是"推到一个新仓库"的推荐路线；覆盖原仓库那条被注释掉了，因为手册里有一节 FAQ 直接叫 *Why is my origin removed?*，作者的立场比"顺手 force push 一下"保守得多：

> Removing the `origin` remote and suggesting people push to a new repo (and ensuring they tell others to clone the new repo) is usually a good forcing function to avoid these problems.

理由很扎实。历史一旦被重写，从**第一个被改动的提交**开始，后面所有提交的 ID 都会变——哪怕你主观上"没动"那个中间提交，只要它的祖先变了，它的哈希也会变。这就带来一个非常现实的危险：某个还持有旧历史的 clone，只要做一次平平无奇的 `git pull && git push`，或者有人在代码平台上把**重写前**开的老 Pull Request 点一下"合并"，新旧两套历史就会被合到一起——每个提交出现两份，仓库体积和混乱程度双双翻倍。

所以更稳妥的做法是：**推到同一个远端的同名分支是"能做但不推荐"，新建一个仓库、让所有人重新 clone 才是推荐路径。** 如果你确实要覆盖原仓库（比如涉及敏感数据、必须让旧仓库本身也干净），那就要按手册里 *Sensitive Data Removals* 那一节的完整步骤来做，而不只是 `git push --force`。

## 所以，回到最初那个问题

`git filter-repo` 是"为了批量修改仓库历史而设计的"吗？

**是，但这是它的主用例，不是它的全部设计目的。** 更完整的三层说法是：

1. **定位上**，它是整个仓库历史的重写/过滤工具，默认破坏性，且假定你在全新 clone 上工作；
2. **实现上**，它是 fast-export/fast-import 管线的流式重实现加一套回调框架——所以它同时是**分析工具**，也是**可以被 import 的库**，这两点已经超出"批量修改"；
3. **它不是** Git 的插件，也不是 rebase 的加强版：两者操作的对象层级根本不同，rebase 是重排提交，它是重造对象。

最后留一个开放问题给你自己去验证。找一个你有完整备份、又确实不想要某个文件的仓库，先跑一遍 `--analyze`，把报告里"这个仓库到底多大、大在哪里"看清楚，然后问自己：

**如果我今天必须把历史重写一遍，我手上的备份够不够让我在出错后回到现在？**

先回答这个问题，再决定要不要敲下那条命令。
