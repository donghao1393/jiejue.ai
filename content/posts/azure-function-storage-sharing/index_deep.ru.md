---
title: "Глубокий анализ учетной записи Azure Function App Storage: практика эксплуатации и обслуживания и обнаружение конфликтов"
date: 2025-07-04T20:47:48+04:00
slug: "azure-function-storage-deep-analysis"
draft: false
cover: "https://jiejue.obs.ap-southeast-1.myhuaweicloud.com/20250704205059684.webp"
tags:
  - "Лазурь"
  - "Функциональное приложение"
  - "Счет хранения"
  - "эксплуатация и обслуживание (O&M)"
  - "устранение неисправностей"
  - "глубокие технологии"
---

Углубитесь в технические детали Azure Function App и Storage Account, от структуры хранилища до обнаружения конфликтов, от оптимизации производительности до устранения неполадок, и вы получите исчерпывающее практическое руководство для инженеров по эксплуатации.

<! -еще-->

## Глубокий анализ внутренней структуры учетной записи хранилища

Функциональные приложения Azure Function Apps создают сложные структуры хранения в учетных записях хранения, и понимание этих структур очень важно для работы по эксплуатации и обслуживанию.

### Контейнеры для хранения блобов в деталях

```
azure-webjobs-hosts/
├── locks/                          # 分布式锁机制
│   ├── {host-id}.{function-name}/  # 单例函数锁
│   └── {timer-trigger-locks}/      # 计时器触发器锁
├── blobreceipts/                   # Blob触发器处理记录
│   ├── {host-id}/
│   │   └── {container-name}/       # 记录已处理的blob
├── {host-id}/                      # 主机特定数据
│   ├── output/                     # 函数输出日志
│   ├── timers/                     # 计时器状态
│   └── durable/                    # Durable Functions状态
└── sentinelfiles/                  # 哨兵文件

azure-webjobs-secrets/              # 密钥存储容器
├── {host-id}/
│   ├── host.json                   # 主机密钥
│   ├── master                      # 主密钥
│   └── functions/                  # 函数密钥
│       ├── {function-name}
│       └── ...

scm-releases/                       # 部署管理容器
├── {deployment-id}/
└── latest/

azure-functions-scale-controller/   # 缩放控制器日志
├── {timestamp-logs}/
└── ...
```

### Структура хранения очередей

```
azure-webjobs-blobtrigger-poison    # Blob触发器毒消息队列
azure-webjobs-hosts                 # 主机心跳和状态队列  
azure-webjobs-{host-id}-poison      # 特定主机的毒消息队列
{custom-queue-bindings}             # 用户定义的队列绑定
durable-task-{host-id}              # Durable Functions任务队列
durable-task-{host-id}-control      # Durable Functions控制队列
durable-task-{host-id}-workitems    # Durable Functions工作项队列
``` ## Структура хранения очереди

### Хранилище таблиц объясняется

```
AzureWebJobsHostLogs{YYYYMMdd}      # 主机日志表（按日期分区）
├── PartitionKey: {host-id}
├── RowKey: {timestamp-sequence}
└── LogData: {json-log-entry}

AzureWebJobsHostInstances{YYYYMMdd} # 主机实例表
├── PartitionKey: {host-id}  
├── RowKey: {instance-id}
└── InstanceData: {host-metadata}

DurableFunctionsHubInstances        # Durable Functions实例表
DurableFunctionsHubHistory          # Durable Functions历史表
```

## Алгоритм генерации идентификатора хоста и обнаружение конфликтов

### Логика генерации идентификатора хоста по умолчанию

```csharp
// 简化的Host ID生成算法
string GenerateHostId(string functionAppName)
{
    // 1. 取Function App名称
    // 2. 转换为小写
    // 3. 截取前32个字符
    // 4. 移除特殊字符（仅保留字母、数字、连字符）
    
    var hostId = functionAppName.ToLowerInvariant();
    if (hostId.Length > 32)
    {
        hostId = hostId.Substring(0, 32);
    }
    
    // 清理无效字符和边界情况
    hostId = Regex.Replace(hostId, "[^a-z0-9-]", "-");
    hostId = hostId.Trim('-');
    
    return hostId;
}
```

### Эволюция механизма обнаружения конфликтов

**Functions Runtime v3.x (обнаруживает и предупреждает): **
```log
[2024-07-04T16:30:15.234Z] Host ID collision detected between multiple function apps
[2024-07-04T16:30:15.235Z] Host ID: 'my-company-payment-service-pr'
[2024-07-04T16:30:15.236Z] This may cause unpredictable behavior
``` ## Functions Runtime v3.x (обнаруживает и предупреждает).

** Функции Runtime v4.x (обнаруживает и останавливает): ** ```log
[2024-07-04T16:30:15.234Z] Host ID collision detected between multiple function apps
[2024-07-04T16:30:15.235Z] Host ID: 'my-company-payment-service-pr'
[2024-07-04T16:30:15.236Z] This may cause unpredictable behavior
```.
```log
[2024-07-04T16:30:15.234Z] FATAL: Host ID collision detected
[2024-07-04T16:30:15.235Z] Host ID: 'my-company-payment-service-pr' 
[2024-07-04T16:30:15.236Z] Multiple hosts detected using the same storage account with identical host IDs
[2024-07-04T16:30:15.237Z] Host startup terminated
```

## Сценарии расширенной конфигурации и лучшие практики

### Политики именования на уровне предприятия

```json
{
    "// 推荐的Host ID命名模式": {
        "格式": "{业务域}-{环境}-{服务}-{版本}",
        "示例": [
            "payment-prod-api-v2",
            "payment-test-api-v2", 
            "notification-prod-worker-v1",
            "analytics-dev-processor-v3"
        ]
    }
}
```

### Развертывание матрицы конфигурации слотов

```json
// Production Slot配置
{
    "AzureFunctionsWebHost__hostid": "payment-prod-main",
    "WEBSITE_CONTENTSHARE": "payment-prod-content",
    "WEBSITE_CONTENTAZUREFILECONNECTIONSTRING": "DefaultEndpointsProtocol=https;..."
}

// Staging Slot配置（标记为Deployment Setting）
{
    "AzureFunctionsWebHost__hostid": "payment-prod-staging",
    "WEBSITE_CONTENTSHARE": "payment-staging-content",
    "WEBSITE_CONTENTAZUREFILECONNECTIONSTRING": "DefaultEndpointsProtocol=https;..."
}
``` ### Матрица конфигурации развернутого слота

### Конфигурация сетевой учетной записи ограниченного хранения

Когда учетная запись хранилища находится в виртуальной сети:

```json
{
    "AzureWebJobsStorage": "DefaultEndpointsProtocol=https;AccountName=securestorage;...",
    "AzureFunctionsWebHost__hostid": "secure-app-prod-001",
    "WEBSITE_CONTENTSHARE": "secure-app-content",
    "WEBSITE_CONTENTOVERVNET": "1",  // 已弃用，使用vnetContentShareEnabled
    "vnetContentShareEnabled": true, // 新的站点属性
    "WEBSITE_DNS_SERVER": "168.63.129.16",
    "WEBSITE_VNET_ROUTE_ALL": "1"    // 已弃用，使用vnetRouteAllEnabled
}
```.

## Мониторинг производительности и планирование емкости

### Ключевые показатели учетной записи хранилища

**Мониторинг объема транзакций: **.
```
指标：Total requests/minute
阈值：
- 单Function App: < 10,000 requests/min
- 共享Storage: < 50,000 requests/min
- 告警阈值: > 80% capacity
```

**Мониторинг задержек: ** ```
指标：Average E2E Latency
阈值：
- Blob操作: < 100ms
- Queue操作: < 50ms  
- Table操作: < 30ms
```.
```
指标：Average E2E Latency
阈值：
- Blob操作: < 100ms
- Queue操作: < 50ms  
- Table操作: < 30ms
```

```
指标：Average E2E Latency
阈值：
- Blob操作: < 100ms
- Queue操作: < 50ms  
- Table操作: < 30ms
``` **Формула планирования пропускной способности: ** ```
指标：Average E2E Latency
阈值：
- Blob操作: < 100ms
- Queue操作: < 50ms  
- Table操作: < 30ms
```
```
预估Storage需求 = 
    (函数代码大小 × Function App数量) +
    (日志保留天数 × 平均日志大小/天 × Function App数量) +
    (Durable Functions状态存储需求) +
    (其他绑定数据存储需求)
```

### Стратегии оптимизации для сценариев с высоким параллелизмом


```
主Storage Account（共享）:
- 函数密钥存储
- 基础运行时数据
- 低频操作数据

专用Storage Account（独立）:
- Durable Functions状态
- Event Hub检查点  
- 大量Blob处理
- 高频Queue操作
```

### Практическое руководство по устранению неполадок

### Шаги по устранению конфликта идентификаторов хостов

**1. Проверьте журналы Application Insights: **.
```kusto
traces
| where timestamp > ago(1h)
| where message contains "Host ID collision"
| project timestamp, message, operation_Name
| order by timestamp desc
```.

**2. Проверьте конфигурацию идентификатора хоста: ** ```bash
# Azure CLI命令检查配置
az functionapp config appsettings list \
    --name <function-app-name> \
    --resource-group <resource-group> \
    --query "[?name=='AzureFunctionsWebHost__hostid'].value" \
    --output tsv
```.
```bash
# Azure CLI命令检查配置
az functionapp config appsettings list \
    --name <function-app-name> \
    --resource-group <resource-group> \
    --query "[?name=='AzureFunctionsWebHost__hostid'].value" \
    --output tsv
```.

**3. Обнаружение конфликта учетных записей хранилища: ** ```kusto
traces
| where timestamp > ago(1h)
| where message contains "Host ID collision"
| project timestamp, message, operation_Name
| order by timestamp desc
``` **4.
```bash
# 列出Storage Account中的Host ID
az storage blob list \
    --account-name <storage-account> \
    --container-name azure-webjobs-hosts \
    --prefix "" \
    --query "[].name" \
    --output table
```.

### Общие примеры ошибок и их решения

**Ошибка 1: исключение функционального ключа **.
```
症状：Function keys不工作或频繁变化
原因：多个Function App写入相同的密钥路径
解决：设置唯一Host ID
```

**Ошибка 2: Повторное выполнение триггера таймера
```
症状：Timer trigger函数被多次触发
原因：多个实例争抢相同的计时器锁
解决：确保Host ID唯一性，检查锁机制
```

**Ошибка 3: состояние долговременных функций перепутано** ```
症状：Timer trigger函数被多次触发
原因：多个实例争抢相同的计时器锁
解决：确保Host ID唯一性，检查锁机制
```
```
症状：Orchestration实例状态不一致
原因：共享Storage导致状态数据交叉
解决：为Durable Functions使用独立Storage Account
```_.

### Процедура аварийного восстановления

**Сценарий: сбой производства из-за конфликта идентификаторов хостов**

```bash
# 步骤1：立即隔离冲突的Function App
az functionapp stop --name <affected-app> --resource-group <rg>

# 步骤2：修复Host ID配置
az functionapp config appsettings set \
    --name <affected-app> \
    --resource-group <rg> \
    --settings "AzureFunctionsWebHost__hostid=emergency-fix-$(date +%s)"

# 步骤3：清理冲突的Storage数据（谨慎操作）
# 建议：创建新的Storage Account并迁移

# 步骤4：重启Function App
az functionapp start --name <affected-app> --resource-group <rg>

# 步骤5：验证功能正常
az functionapp function list --name <affected-app> --resource-group <rg>
```

## Конфигурация автоматизации шаблона ARM

### Шаблоны безопасного развертывания многофункциональных приложений

```json
{
    "$schema": "https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#",
    "contentVersion": "1.0.0.0",
    "parameters": {
        "functionApps": {
            "type": "array",
            "metadata": {
                "description": "Array of function app configurations"
            }
        },
        "storageAccountName": {
            "type": "string"
        }
    },
    "variables": {
        "storageConnectionString": "[concat('DefaultEndpointsProtocol=https;AccountName=', parameters('storageAccountName'), ';AccountKey=', listKeys(resourceId('Microsoft.Storage/storageAccounts', parameters('storageAccountName')), '2021-04-01').keys[0].value)]"
    },
    "resources": [
        {
            "type": "Microsoft.Web/sites",
            "apiVersion": "2021-02-01",
            "name": "[parameters('functionApps')[copyIndex()].name]",
            "copy": {
                "name": "functionAppLoop",
                "count": "[length(parameters('functionApps'))]"
            },
            "properties": {
                "siteConfig": {
                    "appSettings": [
                        {
                            "name": "AzureWebJobsStorage",
                            "value": "[variables('storageConnectionString')]"
                        },
                        {
                            "name": "AzureFunctionsWebHost__hostid", 
                            "value": "[concat(parameters('functionApps')[copyIndex()].hostIdPrefix, '-', uniqueString(resourceGroup().id, parameters('functionApps')[copyIndex()].name))]"
                        },
                        {
                            "name": "WEBSITE_CONTENTSHARE",
                            "value": "[concat(parameters('functionApps')[copyIndex()].name, '-content-', uniqueString(resourceGroup().id))]"
                        },
                        {
                            "name": "WEBSITE_CONTENTAZUREFILECONNECTIONSTRING",
                            "value": "[variables('storageConnectionString')]"
                        }
                    ]
                }
            }
        }
    ]
}
```.

### Стратегии оптимизации затрат

### Выбор ценового уровня учетной записи хранения

```
Standard General Purpose v2 (推荐):
- 支持所有Function App功能
- 性能稳定
- 成本适中

Premium Performance:
- 仅用于极高并发场景
- 成本高昂
- 大多数场景过度配置
```.

### Управление жизненным циклом данных

```json
{
    "rules": [
        {
            "name": "FunctionAppLogRetention",
            "enabled": true,
            "type": "Lifecycle",
            "definition": {
                "filters": {
                    "blobTypes": ["blockBlob"],
                    "prefixMatch": ["azure-webjobs-hosts/"]
                },
                "actions": {
                    "baseBlob": {
                        "delete": {
                            "daysAfterModificationGreaterThan": 30
                        }
                    }
                }
            }
        }
    ]
}
```

## Резюме

Совместное использование учетных записей хранения для Azure Function App технически осуществимо, но требует глубокого понимания внутренних механизмов и потенциальных рисков. При правильной настройке идентификатора хоста, тщательном мониторинге и отлаженном процессе устранения неполадок вы сможете обеспечить стабильность системы и контролировать расходы.

Основные выводы:
1. **Идентификатор хоста - основа изоляции**:`AzureFunctionsWebHost__hostid` Конфигурация решает все!
2. **Мониторинг - залог успеха**: внимательно следите за показателями производительности Storage Account.
3. **Автоматизация снижает риск**: используйте шаблоны ARM для обеспечения согласованности конфигурации
4. **Планирование на случай непредвиденных обстоятельств необходимо**: заранее подготовьте процедуры восстановления после сбоев

---

**Справочные документы:*
- *Microsoft Learn - Соображения по хранению данных для Azure Functions (Обновлено 29 июля 2024 г.)*
- *Microsoft Learn - App settings reference for Azure Functions (Обновлено 10 июля 2024 г.)*
- *Microsoft Learn - Разработка Azure Functions с помощью Visual Studio Code (Обновлено 26 мая 2025 г.)*
