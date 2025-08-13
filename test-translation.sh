#!/bin/bash

# 本地测试翻译脚本
echo "🧪 Testing translation script locally..."

# 检查是否设置了API密钥
if [ -z "$DEEPL_API_KEY" ]; then
    echo "❌ DEEPL_API_KEY environment variable is not set"
    echo "💡 Please set it with: export DEEPL_API_KEY=your_api_key"
    exit 1
fi

# 安装依赖
echo "📦 Installing dependencies..."
npm install axios fs-extra front-matter glob --silent

# 运行翻译脚本
echo "🔄 Running translation..."
node .github/scripts/translate.js

echo "✅ Test completed!"
echo "📋 Check the generated .ru.md files in content/posts/"
