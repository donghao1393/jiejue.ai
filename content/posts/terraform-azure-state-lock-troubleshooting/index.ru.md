---
title: "Подробное описание проблем блокировки состояния Terraform Azure: разрешения, разблокировка и лучшие практики"
date: 2025-06-25T21:13:41+04:00
slug: "terraform-azure-state-lock-troubleshooting"
draft: false
cover: "https://jiejue.obs.ap-southeast-1.myhuaweicloud.com/20250625211704888.webp"
tags:
  - "Terraform"
  - "Лазурь"
  - "DevOps"
  - "Управление состоянием"
  - "устранение неисправностей"
---

Когда вы используете Terraform для управления ресурсами Azure в производственной среде, вы можете столкнуться с этой непонятной ошибкой: `StatusCode=403 -- Исходная ошибка: autorest/azure: Service returned an error. status=403 Code = "AuthorisationFailure"`. За этой, казалось бы, простой ошибкой разрешения на самом деле скрывается управление статусами Terraform, разрешения на хранение Azure и основная философия проектирования инфраструктуры как кода.

<!--more-->

## 问题场景重现

Представьте себе ситуацию, когда вы обновляете конфигурацию учетной записи хранилища в производственной среде, приложение Terraform внезапно обрывается на полпути выполнения, а когда вы пытаетесь запустить его снова, возникает ошибка 403 с правами доступа. Что еще больше запутывает, так это то, что несколько минут назад вы могли получить к нему нормальный доступ, так почему же теперь у вас нет разрешений?

```bash
terraform plan
╷
│ Error: error loading state: blobs.Client#Get: Failure responding to request: 
│ StatusCode=403 -- Original Error: autorest/azure: Service returned an error. 
│ Status=403 Code="AuthorizationFailure" Message="This request is not authorized 
│ to perform this operation.\nRequestId:8f2e1a45-cd89-4b12-9876-3f4d5e6a7b8c\nTime:2025-06-25T14:23:17.8542156Z"
```

Обычно это происходит, когда в учетную запись хранилища вносятся изменения сетевых правил или конфигурации шифрования, файл состояния Terraform блокируется, а проверка разрешений во время изменения проходит с ошибками.

## 理解Azure存储的两套权限模式

Прежде чем мы перейдем к решению проблемы, нам нужно понять два режима доступа к учетным записям хранилища Azure, что является ключом к решению проблемы.

### 模式一：Azure AD认证（推荐的企业级方案）

Это стандартная практика для современных облачных инфраструктур, доступ к которым контролируется с помощью аутентификации Azure AD:

```hcl
terraform {
  backend "azurerm" {
    resource_group_name  = "myapp-prod-rg"
    storage_account_name = "myappprodst01"
    container_name       = "tfstate"
    key                  = "terraform.tfstate"
    use_azuread_auth     = true  # 关键配置
  }
}
```

Преимуществами этой модели являются:
- Единое управление идентификацией, интегрированное с корпоративной AD
- Более детальный контроль привилегий
- Соответствие модели безопасности с нулевым доверием
- Облегчает аудит и управление соответствием нормативным требованиям

### 模式二：存储账户密钥认证

Традиционный метод аутентификации по ключу использует непосредственно ключ доступа к учетной записи хранилища:

```hcl
terraform {
  backend "azurerm" {
    resource_group_name  = "myapp-prod-rg"
    storage_account_name = "myappprodst01"
    container_name       = "tfstate"
    key                  = "terraform.tfstate"
    access_key           = "storage-account-access-key"
  }
}
```

## 状态锁定问题的根本原因

Механизм блокировки состояния в Terraform предназначен для защиты целостности состояния инфраструктуры. Блокировка обеспечивает одновременное выполнение нескольких операций:

1. **Атомарная операция**: предотвращает повреждение состояния при одновременных модификациях
2. **Согласованность данных**: гарантирует, что каждая операция применения основана на последнем состоянии.
3. **Защита безопасности**: защита файла состояния в случае отключения сети или завершения операции.

Однако если сетевые правила для учетных записей хранения Azure изменяются в процессе применения, может возникнуть проблема "курицы и яйца":
- Terraform необходимо получить доступ к учетной записи хранилища для чтения файла состояния.
- Terraform необходимо получить доступ к учетной записи хранилища, чтобы прочитать файл состояния, но изменение сетевых правил для учетной записи хранилища может временно запретить этот доступ.
- Файл состояния заблокирован, и нет возможности завершить операцию или снять блокировку.

## 两套解锁命令：应对不同权限场景

В зависимости от ваших прав и конфигурации среды существует два способа разблокировки:

### 方案一：使用Azure AD权限解锁

Если вы обладаете достаточными привилегиями Azure AD:

```bash
# 首先确认当前登录状态
az account show

# 检查对存储账户的权限
az role assignment list --assignee john.doe@contoso.com \
  --scope "/subscriptions/12345678-90ab-cdef-1234-567890abcdef/resourceGroups/myapp-prod-rg/providers/Microsoft.Storage/storageAccounts/myappprodst01"

# 检查状态文件的lease状态（AD模式）
az storage blob show \
  --container-name tfstate \
  --name terraform.tfstate \
  --account-name myappprodst01 \
  --auth-mode login \
  --query 'properties.lease' \
  --output json

# 强制解锁（需要知道lock ID）
terraform force-unlock LOCK_ID

# 如果不知道lock ID，可以尝试重新初始化
terraform init -reconfigure
```

### 方案二：使用存储账户密钥解锁

Если привилегии AD недостаточны, но доступ к ключу хранения возможен:

```bash
# 获取存储账户密钥
az storage account keys list \
  --resource-group myapp-prod-rg \
  --account-name myappprodst01

# 检查状态文件的lease状态（密钥模式）
az storage blob show \
  --container-name tfstate \
  --name terraform.tfstate \
  --account-name myappprodst01 \
  --account-key "storage-account-access-key" \
  --query 'properties.lease' \
  --output json

# 使用密钥配置临时访问
export ARM_ACCESS_KEY="storage-account-access-key"

# 或者修改backend配置，临时使用密钥模式
terraform init -backend-config="access_key=storage-account-access-key"

# 解锁状态
terraform force-unlock LOCK_ID
```

### 特殊情况：网络限制下的解锁

Если учетная запись хранилища настроена с учетом сетевых ограничений, могут потребоваться временные настройки:

```bash
# 临时允许当前IP访问（需要Contributor权限）
az storage account network-rule add \
  --resource-group myapp-prod-rg \
  --account-name myappprodst01 \
  --ip-address $(curl -s ifconfig.me)

# 执行解锁操作
terraform force-unlock LOCK_ID

# 恢复网络限制（在解锁完成后）
az storage account network-rule remove \
  --resource-group myapp-prod-rg \
  --account-name myappprodst01 \
  --ip-address $(curl -s ifconfig.me)
```

## tfvars文件上传：完整性保障的设计哲学

В ходе обсуждения мы обнаружили, что многие команды также загружают файлы tfvars в удаленное хранилище. Это не лишняя операция, а хорошо продуманный дизайн:

### 为什么要上传tfvars？

1. **Согласованность конфигурации**: убедитесь, что все члены команды и конвейер CI/CD используют одну и ту же конфигурацию переменных.
2. **Целостность состояния**: переменные являются важной частью состояния инфраструктуры и должны управляться вместе с файлом состояния
3. **Контроль версий**: обеспечение отслеживания и отката изменений конфигурации
4. **Соответствие требованиям**: в корпоративной среде управление конфигурацией часто требует наличия аудиторского следа.

### 最佳实践实现

```bash
# 上传tfvars到存储账户
az storage blob upload \
  --account-name myappprodst01 \
  --container-name tfstate \
  --name terraform.tfvars \
  --file terraform.tfvars \
  --auth-mode login

# 在apply前下载最新配置
az storage blob download \
  --account-name myappprodst01 \
  --container-name tfstate \
  --name terraform.tfvars \
  --file terraform.tfvars \
  --auth-mode login

# 执行计划和应用
terraform plan -var-file=terraform.tfvars
terraform apply -var-file=terraform.tfvars
```

## 不同环境下的权限策略

На практике для разных сред и ролей требуются разные политики разрешений:

### 开发环境
- 开发者：Azure AD权限 + Storage Blob Data Contributor
- 适合学习和实验，权限相对宽松

### 生产环境  
- CI/CD系统：托管身份(Managed Identity) + 最小权限原则
- 运维人员：Azure AD权限，但可能需要密钥作为应急手段
- 容器/Pod：通过托管身份管理锁定，不直接暴露密钥

### 应急场景
- 当AD服务出现问题时，存储密钥成为重要的后备方案
- 网络隔离环境中，可能需要依赖密钥认证

## 预防性措施和监控

Чтобы избежать повторения подобных проблем, рекомендуется принять следующие меры:

### 1. 监控和告警
```bash
# 设置存储账户访问监控
az monitor metrics alert create \
  --name "TerraformStateAccessFailure" \
  --resource-group myapp-prod-rg \
  --scopes "/subscriptions/12345678-90ab-cdef-1234-567890abcdef/resourceGroups/myapp-prod-rg/providers/Microsoft.Storage/storageAccounts/myappprodst01" \
  --condition "count 'Availability' < 100"
```

### 2. 自动化备份
```bash
# 定期备份状态文件
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
az storage blob copy start \
  --source-container tfstate \
  --source-blob terraform.tfstate \
  --destination-container tfstate-backup \
  --destination-blob "terraform.tfstate.$DATE" \
  --account-name myappprodst01
```

### 3. 权限审计
定期检查和审计访问权限，确保最小权限原则的实施。

## 总结

Интеграция Terraform с Azure, хотя и является мощной, также ставит сложные задачи управления привилегиями. Понимание модели двойной аутентификации для хранилищ Azure, владение методами разблокировки в различных сценариях и осознание важности управления tfvars - все это основные навыки, которыми должен овладеть современный специалист по DevOps.

Помните, что управление состоянием - это не просто технология, это основа командной работы и корпоративного управления. В следующий раз, когда вы столкнетесь с подобной ошибкой 403, не просто ищите быстрое решение, а подумайте о модели разрешений, политике безопасности и процессах командной работы, которые стоят за этим.

Эта способность глубоко мыслить и решать проблемы системно - то, что отличает хорошего инженера DevOps от среднего оператора.