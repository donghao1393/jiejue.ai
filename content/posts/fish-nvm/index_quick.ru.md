---
title: "Средства версионирования Node.js под Fish Shell - краткое руководство по запуску"
date: 2025-02-07T23:16:09+04:00
slug: "fish-shell-node-version-manager-quick-start"
draft: false
cover: "https://jiejue.obs.ap-southeast-1.myhuaweicloud.com/20250208144106522.webp"
tags:
  - "Рыбья раковина"
  - "Node.js"
  - "инструмент разработки"
---

Как фронтенд-разработчик, Сяо Ванг недавно столкнулся с проблемой: ему нужно поддерживать несколько проектов одновременно, но каждый из этих проектов использует разные версии Node.js. Как элегантно решить эту проблему в случае использования fish shell?

<! ---далее-->

## Сценарий проблемы

У Сяо Ванга есть три проекта:
- Старый проект с использованием Node.js 14.
- Проект по обслуживанию с использованием Node.js 16.
- Новый проект с использованием Node.js 18.

Каждый раз, когда он переключает проекты, ему приходится вручную устанавливать и переключать версии Node.js, что отнимает много времени и приводит к ошибкам.

## Простое решение

nvm.fish - это инструмент версионирования Node.js, специально разработанный для оболочки fish, который может:
- Устанавливать различные версии Node.js одним щелчком мыши
- Быстро переключаться между версиями Node.js.
- автоматически определять, какая версия проекта необходима

## Этапы установки

1. создайте необходимые директории:
```fish
mkdir -p ~/.config/fish/functions
mkdir -p ~/.config/fish/completions
```.

2. Скачайте и скопируйте файл:
```fish
# 把nvm.fish和它的补全文件放到对应目录
curl https://raw.githubusercontent.com/donghao1393/fish-assistant/refs/heads/main/plugins/nvm/functions/nvm.fish -o ~/.config/fish/functions/nvm.fish
curl https://raw.githubusercontent.com/donghao1393/fish-assistant/refs/heads/main/plugins/nvm/completions/nvm.fish -o ~/.config/fish/completions/nvm.fish
```

## Повседневное использование

### Установка Node.js
```fish
# 安装最新版
nvm install latest

# 安装特定版本
nvm install 16.14.0

# 安装长期支持版
nvm install lts
```

### Переключение версий
```fish
# 使用特定版本
nvm use 16.14.0

# 使用系统版本
nvm use system
```

### Просмотр версии
```fish
# 查看已安装的版本
nvm list

# 查看当前使用的版本
nvm current
```

## Интеллектуальное переключение версий

Умная Ванга создает в каждой директории проекта файл `.nvmrc` с номером версии Node.js, необходимой для этого проекта. Таким образом, nvm.fish будет автоматически переключаться на нужную версию каждый раз, когда вы заходите в каталог проекта.

Например:
```fish
# 进入项目目录并创建.nvmrc
cd ~/projects/old-project
echo "14.17.0" > .nvmrc

# 下次进入这个目录时，nvm会自动切换到Node.js 14.17.0
```

## Совет.

1. Установите версию по умолчанию:
```fish
set -g nvm_default_version lts
```

2. установите автоматически устанавливаемые пакеты:
```fish
set -g nvm_default_packages yarn pnpm
```.

При такой настройке эти пакеты будут автоматически устанавливаться каждый раз при установке новой версии Node.js.

## Summary

Используя nvm.fish, Сяо Вангу больше не нужно управлять версиями Node.js вручную. Независимо от того, к какому проекту он переключится, нужная версия Node.js будет автоматически готова, и он сможет сосредоточиться на разработке кода, а не на настройке окружения.

---

- Сопроводительное изображение: вывод команды nvm list, показывающий несколько установленных версий Node.js
```fish
$ nvm install 16.14.0
Installing Node v16.14.0 lts/gallium
Fetching https://nodejs.org/dist/v16.14.0/node-v16.14.0-darwin-arm64.tar.gz
Now using Node v16.14.0 (npm 8.3.1) ~/.local/share/nvm/v16.14.0/bin/node
$ nvm list
 ▶ v16.14.0 lts/gallium
   v22.12.0 lts/jod
$ nvm uninstall 16.14.0
Uninstalling Node v16.14.0 ~/.local/share/nvm/v16.14.0/bin/node
```.

- Изображение: автоматическое переключение версий при входе в каталог проекта с .nvmrc.
```fish
$ echo "16.14.0" > .nvmrc
$ cd ..
$ nvm use lts
Now using Node v22.12.0 (npm 10.9.0) ~/.local/share/nvm/v22.12.0/bin/node
$ nvm list
   v16.14.0 lts/gallium
 ▶ v22.12.0 lts/jod
$ z -
$ nvm use
Now using Node v16.14.0 (npm 8.3.1) ~/.local/share/nvm/v16.14.0/bin/node
$ nvm list
 ▶ v16.14.0 lts/gallium
   v22.12.0 lts/jod
```
