---
title: "Настройка поддержки языка KDL в Neovim"
date: 2025-03-29T19:56:46+04:00
slug: "configure-kdl-support-in-neovim"
draft: false
cover: "https://jiejue.obs.ap-southeast-1.myhuaweicloud.com/20250329200248895.webp"
tags:
  - "Neovim"
  - "LazyVim"
  - "KDL"
  - "настроить"
---

Недавно я столкнулся с KDL (Kdl Document Language), развивающимся языком документации, и мне понадобилось редактировать KDL-файлы в Neovim. В этой статье мы расскажем, как добавить поддержку языка KDL в Neovim (особенно в конфигурации LazyVim), чтобы включить подсветку синтаксиса и функции аннотирования.

<!--more-->

## KDL语言简介

KDL (произносится как "cuddle") - это развивающийся язык малых документов с семантикой узлов, подобной XML, но с синтаксисом, больше похожим на команды CLI. Он предназначен для использования в качестве формата сериализации и языка конфигурации, аналогичного JSON, YAML или XML.

Простой пример KDL:

```kdl
// 这是KDL的注释
package {
  name "my-package"
  version "1.0.0"
  
  dependencies {
    lodash "^3.2.1" optional=#true
  }
  
  scripts {
    build """
      echo "Building package"
      npm run compile
    """
  }
}
```

KDL характеризуется ясным и лаконичным синтаксисом, сохраняя при этом хорошие структурированные свойства, что делает его идеальным для использования в качестве формата конфигурационных файлов.

## Neovim中添加KDL支持

Добавление поддержки KDL в Neovim требует двух основных частей:

1. подсветка синтаксиса (с помощью Tree-sitter)
2. поддержка ярлыков аннотаций

### 准备工作

Убедитесь, что у вас установлен [LazyVim](https://www.lazyvim.org/) или хотя бы [lazy.nvim](https://github.com/folke/lazy.nvim), настроенный в качестве менеджера плагинов.

### 创建配置文件

В LazyVim нам нужно создать специальный файл конфигурации плагина. Обычно принято создавать новый файл в директории `~/.config/nvim/lua/plugins/`.

```bash
mkdir -p ~/.config/nvim/lua/plugins/
touch ~/.config/nvim/lua/plugins/kdl.lua
```

### 配置KDL支持

Откройте файл `kdl.lua`, который вы только что создали, и добавьте в него следующее:

```lua
return {
  -- 添加KDL语言支持到Neovim
  {
    "nvim-treesitter/nvim-treesitter",
    opts = function(_, opts)
      -- 将KDL添加到ensure_installed列表
      vim.list_extend(opts.ensure_installed or {}, {
        "kdl",
      })
    end,
  },

-- 配置KDL文件的注释字符串
  {
    "JoosepAlviste/nvim-ts-context-commentstring",
    opts = function(_, opts)
      if not opts.config then opts.config = {} end
      opts.config.kdl = { __default = "// %s" }
      return opts
    end,
  },
}
```

Этот профиль выполняет две задачи:

1. Пусть `nvim-treesitter` установит и загрузит парсер языка KDL, чтобы обеспечить подсветку синтаксиса
2. настройте плагин `nvim-ts-context-commentstring`, чтобы он знал, что файлы KDL используют `//` в качестве префикса комментариев

### 应用配置

После сохранения файла перезапустите Neovim или выполните следующую команду для синхронизации плагина:

```
:Lazy sync
```

Tree-sitter автоматически устанавливает парсер языка KDL, когда вы впервые открываете файл KDL.

## 配置说明

### Tree-sitter配置

```lua
{
  "nvim-treesitter/nvim-treesitter",
  opts = function(_, opts)
    vim.list_extend(opts.ensure_installed or {}, {
      "kdl",
    })
  end,
}
```

Этот код добавляет парсер `kdl`, изменяя опцию `ensure_installed` в `nvim-treesitter` через систему конфигурации LazyVim. Таким образом, когда он понадобится вам в первый раз, система автоматически загрузит и скомпилирует парсер KDL tree-sitter.

### 注释功能配置

```lua
{
  "JoosepAlviste/nvim-ts-context-commentstring",
  opts = function(_, opts)
    if not opts.config then opts.config = {} end
    opts.config.kdl = { __default = "// %s" }
    return opts
  end,
}
```

Эта конфигурация указывает KDL-файлу плагина `nvim-ts-context-commentstring` использовать `//` в качестве префикса комментария. `%s` - это заполнитель, указывающий на то, что комментируемое содержимое будет размещено в этой позиции.

При такой настройке Neovim будет правильно использовать `//` в качестве маркера комментария, когда вы используете команду комментария, такую как `gcc` (для комментирования текущей строки) или `gc` (для комментирования выделения) в KDL-файле.

## 使用体验

После завершения настройки, открыв файл `.kdl`, вы увидите:

1. подсветка синтаксиса работает правильно, с различными цветами для ключевых слов, строк, комментариев и т.д.
2. ярлыки комментариев (например, `gcc`) отлично работают для добавления или удаления комментариев

## 可能的问题和解决方案

Если вы столкнулись со следующими проблемами:

### 没有语法高亮

Убедитесь, что:
- Tree-sitter правильно установлен
- Парсер KDL установлен (представление `:TSInstallInfo`)
- Расширение файла `.kdl` или тип файла установлен правильно

### 注释快捷键不工作

Убедитесь, что:
- `nvim-ts-context-commentstring` настроен правильно
- Используемый вами плагин комментариев (например, `comment.nvim` или `mini.comment`) работает правильно
- Файл правильно распознан как тип KDL

## 总结

С помощью простой конфигурации мы можем добавить поддержку языка KDL в Neovim/LazyVim, включив подсветку синтаксиса и функции аннотирования. С развитием языка KDL в будущем может появиться больше инструментов и плагинов для KDL, но эта базовая конфигурация уже может удовлетворить большинство потребностей в редактировании.

Если вы часто используете KDL, эта настройка значительно повысит эффективность редактирования. Надеюсь, эта статья была вам полезна!

## 相关资源

- [Официальный репозиторий KDL](https://github.com/kdl-org/kdl)
- [Tree-sitter KDL parser](https://github.com/tree-sitter-grammars/tree-sitter-kdl)
- [nvim-treesitter](https://github.com/nvim-treesitter/nvim-treesitter)
- [nvim-ts-context-commentstring](https://github.com/JoosepAlviste/nvim-ts-context-commentstring)