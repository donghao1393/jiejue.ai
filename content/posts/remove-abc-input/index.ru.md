---
title: "Удалить метод ввода по умолчанию"
date: Thu Apr 04 2024 20:12:11 GMT+0000 (Coordinated Universal Time)
slug: "remove-abc-input"
draft: false
cover: "https://jiejue.obs.ap-southeast-1.myhuaweicloud.com/20250202020740418.webp"
tags:
  - "macos"
  - "метод ввода"
---

В macOS есть метод ввода, который нельзя удалить по умолчанию, например ABC, где кнопка удаления выделена серым цветом.

Чтобы удалить этот метод ввода по умолчанию, необходимо отредактировать двоичный файл Plist, что можно сделать с помощью бесплатной программы Plist Editor.

Адрес для загрузки Plist Editor: https://www.fatcatsoftware.com/plisteditpro/

<!--more-->

## 步骤

Есть два основных шага: первый - удалить метод ввода по умолчанию, второй - перезагрузить систему.

### 删除默认输入法
打开Terminal，输入以下命令，打开文件编辑。

```bash
sudo open ~/Library/Preferences/com.apple.HIToolbox.plist -a PlistEdit\ Pro
```

Найдите узел `AppleEnabledInputSources`, разверните его и в подпунктах найдите элемент со значением `KeyboardLayout Name` как имя метода ввода, который вы хотите удалить, например `ABC` в моем случае, и нажмите Delete в меню, чтобы удалить его, а затем нажмите Cmd+S, чтобы сохранить его.

![Plist Editor正在编辑](https://jiejue.obs.ap-southeast-1.myhuaweicloud.com/20250202020942974.webp)

### 重启系统
重启后，可以看到默认无法删除的ABC输入法已经被我们移出了。

![默认输入法被移除之后](https://jiejue.obs.ap-southeast-1.myhuaweicloud.com/20250202021025469.webp)

## 总结
通过编辑系统配置文件，我们就可以移出不让删除的默认输入法了。

