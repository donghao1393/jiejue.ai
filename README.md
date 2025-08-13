# jiejue.ai

## 自动翻译系统使用指南

### 文件组织方式

我们使用**文件名后缀**方式来组织多语言内容：

```
content/posts/my-article/
├── index.md          # 中文原版（默认）
├── index.ru.md       # 俄语翻译版（自动生成）
├── cover.jpg         # 共享资源
└── other-files...
```

### 语言文件命名规则

- `index.md` - 中文原版（默认语言）
- `index.ru.md` - 俄语翻译版
- `index.en.md` - 英语版本（如需要）

### 自动翻译工作流

#### 1. GitHub Actions（推荐）

当你推送中文Markdown文件到主分支时，系统会自动：

1. 检测新增/修改的中文文件
2. 调用DeepL API进行翻译
3. 生成对应的 `.ru.md` 文件
4. 构建并部署网站

**触发条件**：
- 推送到 `main` 分支
- 修改 `content/**/*.md` 文件
- 不包括已翻译的 `*.ru.md` 文件

#### 2. 本地测试

在本地测试翻译功能：

```bash
# 1. 设置API密钥
export DEEPL_API_KEY=your_deepl_api_key

# 2. 运行测试脚本
./test-translation.sh

# 3. 检查生成的文件
ls content/posts/*/index.ru.md
```

#### 3. 手动翻译

如果需要手动运行翻译：

```bash
# 安装依赖
npm install axios fs-extra front-matter glob

# 设置API密钥
export DEEPL_API_KEY=your_api_key

# 运行翻译脚本
node .github/scripts/translate.js
```

### 配置要求

#### DeepL API密钥

1. 注册 [DeepL API](https://www.deepl.com/pro-api)
2. 获取API密钥
3. 在GitHub仓库设置中添加Secret：`DEEPL_API_KEY`

#### Hugo配置

多语言配置已在 `hugo.yaml` 中设置：

```yaml
defaultContentLanguage: zh
defaultContentLanguageInSubdir: true
languages:
  zh:
    languageName: 中文
    # ...
  ru:
    languageName: Русский
    # ...
```

### 翻译特性

#### 智能跳过

- ✅ 代码块（```）
- ✅ HTML注释（<!--）
- ✅ 图片链接（![）
- ✅ 某些Markdown语法

#### 翻译内容

- ✅ 文章标题（title）
- ✅ 描述（description）
- ✅ 标签（tags）
- ✅ 正文内容
- ✅ 分段翻译保持质量

#### 增量更新

系统会检查文件修改时间，只翻译：
- 新增的文件
- 中文版本比俄语版本更新的文件

### URL结构

- 中文版本：`/zh/2025/08/article-name/`
- 俄语版本：`/ru/2025/08/article-name/`
- 根域名：自动重定向到 `/zh/`

### 语言切换

用户可以通过导航栏的语言切换器在中俄文版本间切换。

### 故障排除

#### 常见问题

1. **翻译失败**：检查DEEPL_API_KEY是否正确设置
2. **文件不生成**：确认文件路径符合 `content/**/*.md` 模式
3. **翻译质量**：可手动编辑生成的 `.ru.md` 文件

#### 调试

查看GitHub Actions日志或本地运行输出来诊断问题。

### 成本控制

- DeepL免费版：每月50万字符
- 脚本包含延迟机制避免API限制
- 增量翻译减少重复调用
