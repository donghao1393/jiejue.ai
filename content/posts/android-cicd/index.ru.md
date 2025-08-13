---
title: "Практика непрерывной интеграции и автоматизированного выпуска релизов для Android-проектов"
date: 2025-02-24T23:41:44+04:00
slug: "android-app-cicd-automation"
draft: false
cover: "https://jiejue.obs.ap-southeast-1.myhuaweicloud.com/20250224234437821.webp"
tags:
  - "Разработка под Android"
  - "CI/CD"
  - "автоматизированная сборка"
  - "Действия GitHub"
  - "Семантическое освобождение"
---

Будучи разработчиком Android, сталкивались ли вы с тем, что каждый раз при выпуске новой версии приходится вручную менять номер версии, писать журналы обновлений, создавать APK и загружать их на различные платформы - это повторяющиеся задачи, которые не только скучны, но и чреваты ошибками. Если вы страдаете от этого, то эта статья принесет вам облегчение.

<! ---далее-->

## Зачем вам нужен CI/CD?

Непрерывная интеграция/непрерывное развертывание (CI/CD) стала неотъемлемой частью современного процесса разработки программного обеспечения. Для разработчиков Android внедрение автоматизированного процесса имеет ряд неоспоримых преимуществ:

1. **Автоматизация управления версиями**: больше не нужно вручную изменять номер версии, система автоматически добавляет версию на основе информации о коммите
2. **Стандартизация процесса сборки**: гарантирует, что каждая сборка будет следовать одному и тому же процессу, уменьшая вмешательство человека
3. **Упрощение процесса выпуска**: автоматически генерирует журналы обновлений, упаковывает APK и выпускает их на указанные платформы.
4. **Повышение эффективности совместной работы команды**: сократите количество ручных операций и позвольте команде сосредоточиться на разработке функций.
5. **Снижение риска выпуска**: автоматизированное тестирование и проверка для уменьшения количества ошибок в процессе выпуска.

Для зрелого проекта Android внедрение автоматизированной сборки и выпуска не только экономит время, но и повышает качество продукта и эффективность работы команды.

## Выбор инструмента автоматизации

Для реализации CI/CD в Android-проекте у нас есть множество инструментов на выбор, и здесь я представлю комбинацию, которая особенно подходит для Android-проектов: GitHub Actions + Semantic Release.

### GitHub Actions

GitHub Actions - это интегрированный CI/CD-сервис, предоставляемый GitHub, который позволяет создавать автоматизированные рабочие процессы непосредственно в репозиториях GitHub. Для разработчиков Android он имеет следующие преимущества:

- Бесшовная интеграция с репозиториями кода GitHub
- Предоставление множества предварительно настроенных действий (Actions) для упрощения процесса настройки
- Поддержка различных триггеров (таких как push кода, создание PR и т. д.)
- Поставляется с функцией управления ключами, что удобно для хранения конфиденциальной информации, такой как ключи подписи.

### Семантический релиз

Semantic Release - это автоматизированный инструмент управления версиями и выпусками, основанный на принципах семантического версионирования (Semantic Versioning). Он позволяет:

- Анализирует коммиты для автоматического определения номера версии (мажорной, минорной или патча)
- Автоматически генерировать журналы обновлений (Changelog)
- Создавать теги версий и выпускать версии
- Поддержка пользовательского процесса выпуска

Объединив эти два компонента, мы можем создать мощный автоматизированный процесс, который сделает выпуск приложений для Android простым и надежным.

## Общая блок-схема

Прежде чем приступить к подробному объяснению, давайте представим себе весь процесс CI/CD с помощью следующей блок-схемы:

```mermaid
flowchart TD
    A[开发者提交代码] -->|推送到main分支| B[GitHub Actions触发];
    B --> C[检出代码];
    C --> D[设置环境<br>JDK, Gradle, Node.js];
    D --> E[安装<br>semantic-release插件];
    E --> F{分析提交信息};
    
    F -->|需要发布| G[确定版本号<br>patch/minor/major];
    F -->|不需要发布| Z[流程结束];
    
    G --> H[更新版本号<br>build.gradle.kts];
    H --> I[生成<br>CHANGELOG.md];
    I --> J[构建签名APK<br>gradlew assembleRelease];
    J --> K[提交版本号<br>和CHANGELOG更改];
    K --> L[创建Tag<br>和GitHub Release];
    L --> M[上传APK到Release];
    M --> N[可选: 部署到<br>Google Play/Firebase];
    N --> O[发布完成];
```.

С помощью этой блок-схемы мы можем наглядно увидеть весь процесс автоматизированного выпуска от отправки кода до финального выпуска на каждом этапе. Ниже я подробно опишу, как реализовать этот процесс.

## Шаги реализации

Ниже я расскажу, как поэтапно настроить процесс автоматизированного выпуска в типичном Android-проекте.

### 1. Настройте репозиторий GitHub

Сначала убедитесь, что ваш Android-проект размещен на GitHub и что структура проекта соответствует стандартному формату Android-проекта.

### 2. Создайте файл рабочего процесса

Создайте папку `.github/workflows` в корневом каталоге проекта, а затем добавьте в нее файл `release.yml` со следующим содержимым:

```yaml
name: Release

on:
  push:
    branches: [ main ]

permissions:
  contents: write
  issues: write
  pull-requests: write

jobs:
  release:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
          
      - name: Set up JDK 17
        uses: actions/setup-java@v4
        with:
          java-version: '17'
          distribution: 'temurin'
          
      - name: Setup Gradle
        uses: gradle/gradle-build-action@v2
          
      - name: Decode Keystore
        run: |
          echo "${{ secrets.KEYSTORE_BASE64 }}" | base64 -d > app-release.jks
          
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 'lts/*'
          
      - name: Install semantic-release
        run: |
          npm install -g semantic-release @semantic-release/git @semantic-release/changelog @semantic-release/exec
          
      - name: Release
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          STORE_PASSWORD: ${{ secrets.STORE_PASSWORD }}
          KEY_PASSWORD: ${{ secrets.KEY_PASSWORD }}
        run: npx semantic-release
```.

Этот рабочий процесс будет:
- Срабатывать при переносе кода в основную ветку
- Настроит окружение Java и Gradle
- Декодировать ключи подписи, хранящиеся в GitHub Secrets.
- Установить Semantic Release и его плагины
- Выполнить процесс выпуска

### 3. Настройка Semantic Release

Создайте файл `.releaserc.json` в корневом каталоге проекта, чтобы настроить Semantic Release:

```json
{
  "branches": ["main"],
  "plugins": [
    "@semantic-release/commit-analyzer",
    "@semantic-release/release-notes-generator",
    "@semantic-release/changelog",
    ["@semantic-release/exec", {
      "verifyConditionsCmd": "./gradlew assembleDebug -x lint",
      "prepareCmd": "sed -i 's/versionName \".*\"/versionName \"${nextRelease.version}\"/g' app/build.gradle.kts",
      "publishCmd": "./gradlew assembleRelease --info --stacktrace -x lint -Psigning.storePassword=$STORE_PASSWORD -Psigning.keyPassword=$KEY_PASSWORD"
    }],
    ["@semantic-release/git", {
      "assets": [
        "app/build.gradle.kts",
        "CHANGELOG.md"
      ],
      "message": "chore(release): ${nextRelease.version}\n\n${nextRelease.notes}"
    }],
    ["@semantic-release/github", {
      "assets": [
        {"path": "app/build/outputs/apk/release/app-release.apk", "label": "App ${nextRelease.version}"}
      ]
    }]
  ]
}
```.

Этот конфигурационный файл определяет шаги в процессе выпуска:
- Анализ коммитов с помощью commit-analyzer
- Использование release-notes-generator для создания заметок о релизе.
- Обновление файла CHANGELOG.md с помощью журнала изменений.
- Используйте exec для выполнения команды Gradle, обновления номера версии и сборки APK.
- Зафиксируйте изменения в репозитории с помощью git
- Используйте github для создания релиза на GitHub и загрузки APK.

### 4. Настройка секретов GitHub

Добавьте следующий ключ в Настройки > Секреты и переменные > Действия в вашем репозитории GitHub:

- `KEYSTORE_BASE64`: Подписание файла ключа с использованием кодировки base64.
- `STORE_PASSWORD`: Пароль для хранилища ключей.
- `KEY_PASSWORD`: Парольная фраза ключа подписи

Это позволит вам безопасно использовать эту конфиденциальную информацию в среде CI.

### 5. Использование обычных сообщений коммита

Чтобы Semantic Release правильно определил тип обновления, нам нужно написать сообщение о фиксации в формате Conventional Commits:

- `fix: 修复某个bug` - Исправление ошибки, добавление версии патча (1.0.0 -> 1.0.1)
- `feat: 添加新功能` - Новая функция, добавить минорную версию (1.0.0 -> 1.1.0).
- `feat!: 添加不兼容的新功能` или `fix!: 不兼容的修复` - Несовместимое обновление, добавьте основную версию (1.0.0 -> 2.0.0).
- `docs: 更新文档` - Изменение документации, не увеличивать номер версии
- `chore: 例行工作` - плановое обслуживание, номер версии не увеличивается

Этот формат не только автоматизирует версионность, но и улучшает читаемость истории коммитов.

## Проблемы и решения в реальных приложениях

В процессе реализации этого автоматизированного процесса мы столкнулись с некоторыми типичными проблемами, и вот их решения:

### Проблемы с разрешением

**Проблема**: В GitHub Actions у `GITHUB_TOKEN` по умолчанию может не хватать прав для выполнения определенных действий, например, проталкивания тегов.

**Решение**: Добавьте явную настройку разрешений в файл рабочего процесса:

```yaml
permissions:
  contents: write
  issues: write
  pull-requests: write
```.

### Ошибка Android Lint

**Проблема**: Проверки Android Lint могут сообщать об ошибках, которые приводят к сбою сборки, особенно при использовании некоторых специальных разрешений.

**Решение**: Измените файл `.releaserc.json`, чтобы пропустить проверку lint в командах проверки и выпуска:

```json
"verifyConditionsCmd": "./gradlew assembleDebug -x lint",
"publishCmd": "./gradlew assembleRelease -x lint -Psigning.storePassword=$STORE_PASSWORD -Psigning.keyPassword=$KEY_PASSWORD"
```

Или настройте lint в `app/build.gradle.kts`:

```kotlin
android {
    // 其他配置
    lint {
        disable += "ProtectedPermissions"
        abortOnError = false
    }
}
```

### Проблемы с защищенными разрешениями

**Проблема**: Некоторые разрешения Android (например, `PACKAGE_USAGE_STATS`) защищены для использования только системными приложениями, что приводит к ошибке lint.

**Решение**: Если эти разрешения действительно необходимы в приложении, их можно решить следующим образом:

1. создайте файл `app/lint.xml`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<lint>
    <issue id="ProtectedPermissions" severity="ignore" />
</lint>
```.

2. Ссылайтесь на этот файл в `app/build.gradle.kts`:

```kotlin
android {
    lint {
        lintConfig = file("lint.xml")
    }
}
```

## Фактический эффект

Когда все настройки будут выполнены, каждый раз, когда вы будете выкладывать код в основную ветку, автоматический процесс будет:

1. проверять сообщение о фиксации, чтобы узнать, нужно ли выпустить новую версию
2. автоматически обновлять номер версии
3. генерировать или обновлять файл CHANGELOG.md
4. создаст подписанный APK-файл
5. создайте новый Git-тег и GitHub Release
6. прикрепите APK-файл к релизу

Весь процесс не требует вмешательства человека, что значительно повышает эффективность и согласованность релизов.

## Расширенная оптимизация

После того как базовый процесс отлажен, можно приступить к расширенной оптимизации:

### Добавьте автоматизированные тесты

Автоматически запускайте тесты перед выпуском, чтобы обеспечить качество кода:

```yaml
- name: Run tests
  run: ./gradlew test
```

### Интеграция Firebase App Distribution

Автоматическое распространение бета-версий APK среди тестеров:

```yaml
- name: Upload to Firebase App Distribution
  run: |
    npm install -g firebase-tools
    firebase appdistribution:distribute app/build/outputs/apk/release/app-release.apk \
      --app ${{secrets.FIREBASE_APP_ID}} \
      --token ${{secrets.FIREBASE_TOKEN}} \
      --groups "testers" \
      --release-notes "$(cat CHANGELOG.md)"
```

### Автоматическое развертывание в Google Play

Автоматическая публикация приложения в Google Play:

```yaml
- name: Upload to Google Play
  uses: r0adkll/upload-google-play@v1
  with:
    serviceAccountJsonPlainText: ${{ secrets.SERVICE_ACCOUNT_JSON }}
    packageName: com.your.package
    releaseFiles: app/build/outputs/apk/release/app-release.apk
    track: production
    status: completed
```

## Резюме

Объединив GitHub Actions и Semantic Release, мы можем построить мощный автоматизированный процесс выпуска релизов для Android-проектов. Это не только сэкономит много времени на ручных операциях, но и повысит качество релизов и совместной работы команды.

Для разработчиков, имеющих опыт разработки под Android, изучение и внедрение этого процесса CI/CD является важным шагом в повышении эффективности разработки. Хотя первоначальная настройка может занять некоторое время, в долгосрочной перспективе преимущества автоматизации значительно перевесят эти затраты.

Надеемся, что эта статья поможет вам автоматизировать релизы в ваших Android-проектах, повысить эффективность разработки и дать вам больше времени, чтобы сосредоточиться на создании отличных приложений.

## Справочные ресурсы

- [Документация GitHub Actions](https://docs.github.com/en/actions)
- [Документация по семантическому релизу](https://semantic-release.gitbook.io/semantic-release/)
- [Conventional Commits specification](https://www.conventionalcommits.org/)
- [Документация Gradle Android Plugin](https://developer.android.com/studio/build)
