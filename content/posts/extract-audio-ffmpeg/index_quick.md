---
title: "超简单！三步从视频中提取音频（无需专业知识）"
date: 2025-10-09T19:59:40+04:00
slug: 'extract-audio-from-video-easy-guide'
draft: false
cover: "https://jiejue.obs.ap-southeast-1.myhuaweicloud.com/20251009200306039.webp"
tags:
  - 音频处理
  - 视频编辑
  - 初学者指南
---

想从视频中提取精彩的音乐、演讲或对话吗？不需要昂贵的软件或复杂的技能！本文将教你如何使用一个免费的小工具，轻松将视频中的声音保存为独立音频文件。

<!--more-->

## 生活中你可能遇到的场景

小李是一名语言学习爱好者，最近在视频平台上发现了一段精彩的英语演讲。他想在通勤时重复听这段演讲来提高语感，但不希望手机一直开着视频播放耗电。

张阿姨热爱音乐，想把孙子的钢琴表演视频中的音频提取出来，方便在早晨散步时欣赏。

小王在网上找到了一个重要的网络课程，但这个视频占用了太多存储空间，他只需要听讲解部分。

**这些问题都有一个共同的解决方案：从视频中提取音频。**

## 准备工作：安装FFmpeg

FFmpeg是一个功能强大的多媒体处理工具，别被它的命令行界面吓到——我们只需要学习一行简单命令就能完成音频提取！

根据你的操作系统，安装FFmpeg的方法有所不同：
- Mac用户：使用Homebrew安装，在终端输入`brew install ffmpeg`
- Windows用户：从官方网站下载安装包，或使用Chocolatey包管理器安装
- Linux用户：使用系统的包管理器安装，如`apt install ffmpeg`

```
jiejue.ai/content/posts/extract-audio-ffmpeg on  main [?]
󰄛 ❯ ffmpeg -version
ffmpeg version 8.0 Copyright (c) 2000-2025 the FFmpeg developers
built with Apple clang version 17.0.0 (clang-1700.0.13.3)
configuration: --prefix=/opt/homebrew/Cellar/ffmpeg/8.0_1 --enable-shared --enable-pthreads --enable-version3 --cc=clang --host-cflags= --host-ldflags='-Wl,-ld_classic' --enable-ffplay --enable-gnutls --enable-gpl --enable-libaom --enable-libaribb24 --enable-libbluray --enable-libdav1d --enable-libharfbuzz --enable-libjxl --enable-libmp3lame --enable-libopus --enable-librav1e --enable-librist --enable-librubberband --enable-libsnappy --enable-libsrt --enable-libssh --enable-libsvtav1 --enable-libtesseract --enable-libtheora --enable-libvidstab --enable-libvmaf --enable-libvorbis --enable-libvpx --enable-libwebp --enable-libx264 --enable-libx265 --enable-libxml2 --enable-libxvid --enable-lzma --enable-libfontconfig --enable-libfreetype --enable-frei0r --enable-libass --enable-libopencore-amrnb --enable-libopencore-amrwb --enable-libopenjpeg --enable-libspeex --enable-libsoxr --enable-libzmq --enable-libzimg --disable-libjack --disable-indev=jack --enable-videotoolbox --enable-audiotoolbox --enable-neon
libavutil      60.  8.100 / 60.  8.100
libavcodec     62. 11.100 / 62. 11.100
libavformat    62.  3.100 / 62.  3.100
libavdevice    62.  1.100 / 62.  1.100
libavfilter    11.  4.100 / 11.  4.100
libswscale      9.  1.100 /  9.  1.100
libswresample   6.  1.100 /  6.  1.100

Exiting with exit code 0
```

## 三种常用的音频提取场景

### 场景一：从视频开头提取一段音频

比如你想从一个音乐视频中提取前3分钟的歌曲部分。

```bash
ffmpeg -i "我的视频.mp4" -t 03:00 -vn -c:a aac -b:a 192k -f mp4 提取的音频.m4a
```

这个命令会从视频开头提取3分钟的音频，并保存为高质量的m4a文件。

### 场景二：从视频中间提取一段音频

假设你想提取视频中第5分钟到第8分钟之间（即3分钟长度）的演讲部分：

```bash
ffmpeg -i "演讲视频.mp4" -ss 05:00 -t 03:00 -vn -c:a aac -b:a 192k -f mp4 演讲片段.m4a
```

其中`-ss 05:00`表示从5分钟处开始，`-t 03:00`表示提取3分钟长度。

### 场景三：从某一时间点提取到视频结尾

如果你想保存视频从30分钟处到结尾的所有音频：

```bash
ffmpeg -i "长视频.mp4" -ss 30:00 -vn -c:a aac -b:a 192k -f mp4 后半段音频.m4a
```

这里我们只指定了开始时间`-ss 30:00`，没有指定长度，FFmpeg会自动处理到视频结束。

## 实用小技巧

如果你的视频文件很大，这个小技巧可以大幅加快处理速度：

```bash
ffmpeg -ss 01:00:00 -i "超长视频.mp4" -t 05:00 -vn -c:a aac -b:a 192k -f mp4 片段.m4a
```

注意这里的`-ss`参数放在了`-i`前面！这样FFmpeg会直接跳到指定时间点开始处理，而不是读取整个文件再裁剪，尤其适合从很长的视频中提取片段。

## 参数简易解释

即使你不是技术专家，了解一下这些基本参数也很有用：

- `-i "文件名.mp4"` - 你要处理的视频文件
- `-ss 时:分:秒` - 从哪个时间点开始提取
- `-t 时:分:秒` - 提取多长时间
- `-vn` - 不要视频，只要音频
- `-c:a aac` - 使用AAC编码器（适合大多数设备播放）
- `-b:a 192k` - 音频质量（192k通常音质很好）
- `-f mp4` - 输出为mp4容器格式
- `输出文件名.m4a` - 保存的音频文件名

## 常见问题解答

**问：为什么选择m4a格式？**  
答：m4a格式兼容性好，几乎所有手机、电脑和音乐播放器都支持，同时保持了较好的音质和较小的文件体积。

**问：我可以处理什么类型的视频？**  
答：几乎所有常见格式！mp4、mkv、avi、mov、wmv、flv，甚至是DVD的VOB文件等都可以处理。

**问：处理后的音频质量会下降吗？**  
答：通常不会明显下降。我们设置的192k比特率已经足够保持很好的音质，除非原视频的音频质量本身就很差。

## 小结

通过这篇指南，你已经掌握了一项实用技能，可以轻松从各种视频中提取音频。无需专业知识，只要记住一个简单的命令模板，就能满足日常各种音频提取需求。

下次当你想在手机上只听课程讲解、保存视频中的美妙音乐，或者为家庭视频创建有声回忆时，这个小技巧将非常有用！

**动手试试吧！** 你有什么视频中的声音想要提取出来？
