---
title: "如何让Hugo主题的文章列表全部显示在首页"
date: 2025-02-01T10:33:03+04:00
slug: 'hugo-show-all-posts-in-homepage'
draft: false
cover: "https://jiejue.obs.ap-southeast-1.myhuaweicloud.com/20250201103520844.webp"
tags:
  - hugo
  - 前端开发
  - 定制主题
---

在使用Hugo Dream主题时，发现首页默认开启了分页功能，每页只显示有限数量的文章。虽然分页可以提高页面加载速度，但在文章数量不多的情况下，分页反而影响了用户体验。本文将介绍如何修改Hugo主题，让所有文章显示在首页。

<!--more-->

## 问题背景

Hugo Dream主题默认使用分页功能来展示文章列表，这导致：

1. 用户需要点击"下一页"才能看到更多文章
2. 部分文章被隐藏，降低了发现率
3. 对搜索引擎爬虫不够友好

## 分析原因

通过检查主题源码，发现分页功能是在主题的 `layouts/index.html` 中通过 Hugo 的 `.Paginate` 函数实现的：

```html
{{ $paginator := .Paginate (where site.RegularPages "Type" "posts") }}

<div class="dream-grid">
  {{ range $paginator.Pages }}
  <div class="w-full md:w-1/2 lg:w-1/3 xl:w-1/4 p-4 dream-column">
    {{ .Render "summary" }}
  </div>
  {{ end }}
</div>
```

## 解决方案

有两种方法可以实现所有文章在首页显示：

### 1. 配置方案

在站点配置文件（hugo.toml）中设置较大的每页文章数：

```toml
[params.paginate]
default = 100  # 设置一个足够大的数字
```

这种方法简单，但不够优雅，而且如果文章数超过设定值还是会分页。

### 2. 主题覆盖方案

创建自定义的 layouts/index.html 来覆盖主题的模板，完全去除分页功能：

```html
{{ define "main"}}

{{ if site.Params.zenMode }}
<div class="dream-zen-posts max-w-[65ch] mt-8 mx-auto px-4 space-y-8">
{{ range (where site.RegularPages "Type" "posts") }}
  {{ .Render "zen-summary" }}
{{ end }}
</div>
{{ else }}
<div class="dream-grid">
  {{ range (where site.RegularPages "Type" "posts") }}
  <div class="w-full md:w-1/2 lg:w-1/3 xl:w-1/4 p-4 dream-column">
    {{ .Render "summary" }}
  </div>
  {{ end }}
</div>
{{ end }}

{{ end }}

{{ define "js" }}
{{ if site.Params.Experimental.jsDate }}
{{ partial "luxon.html" . }}
{{ end }}
{{ end }}
```

主要改动点：
1. 移除了 `.Paginate` 函数
2. 直接使用 `range` 遍历所有文章
3. 保留了原有的布局样式
4. 保持了主题的其他功能（如日期格式化等）

## 性能考虑

虽然移除分页会导致首页加载的内容变多，但在下列情况下，这种方案是可取的：

1. 博客文章数量适中（比如低于100篇）
2. 文章摘要控制得当，不会加载过多内容
3. 使用了 CDN 或其他缓存机制
4. 用户更看重内容的可及性而非加载速度

如果未来文章数量显著增加，可以考虑：

1. 重新引入分页机制
2. 实现无限滚动加载
3. 使用前端虚拟滚动技术
4. 增加文章分类导航

## 总结

通过自定义模板覆盖的方式，我们优雅地实现了文章列表的完整显示，提升了用户体验。这个解决方案保持了与主题的兼容性，同时也为未来的维护和升级预留了空间。`
