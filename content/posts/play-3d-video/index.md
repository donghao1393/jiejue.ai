---
title: "在 Mac 上用 ffplay 播放 3D 视频"
date: 2024-12-07T21:41:38+04:00
slug: 'play-3d-video'
draft: false
cover: "https://jiejue.obs.ap-southeast-1.myhuaweicloud.com/20250202030000561.webp"
tags:
  - macos
  - 3d视频
  - ffplay
---

前段时间我入手了一副支持 3D 视频观看的智能眼镜。它支持 SBS（左右分屏）格式的视频播放，但市面上的 3D 视频资源大多是 HSBS（半宽左右分屏）格式。我原本用 Bino 这款老牌 3D 播放器，但它是为 Intel 芯片开发的，在我的 M1 Mac 上经常出现卡顿。

<!--more-->

后来发现 ffplay（ffmpeg 项目的一部分）完全能满足需求。它原生支持 Apple Silicon，播放性能很好，而且操作也很简单。

安装很直接。首先需要安装 Homebrew，如果还没装过的话去 [brew.sh](https://brew.sh) 按提示安装就好。然后一行命令就能装好 ffmpeg：

```bash
brew install ffmpeg
```

播放 3D 视频也很简单，比如要把 HSBS 格式的视频转成 SBS 格式播放：

```bash
ffplay -i video.mp4 -vf "scale=2*iw:ih"
```

如果觉得每次输入命令麻烦，可以在 fish shell 配置文件（~/.config/fish/config.fish）里加一个函数：

```bash
function play3d
    ffplay -i $argv -vf "scale=2*iw:ih"
end
```

这样以后直接用 `play3d video.mp4` 就可以了。

ffplay 的一些常用快捷键：
- w：显示/隐藏进度条
- 空格：暂停/继续
- 左右方向键：快退/快进 10 秒
- 上下方向键：快退/快进 1 分钟
- q 或 ESC：退出

特别好用的是，如果视频里有内嵌字幕，ffplay 会自动显示，而且会在左右两边都显示，完全不用额外设置。

相比其他一些 3D 播放器，ffplay 虽然界面简单了些，但该有的功能都有，而且性能很好，用起来很顺手。对于想在 Mac 上看 3D 视频的朋友来说，这是个不错的选择。

