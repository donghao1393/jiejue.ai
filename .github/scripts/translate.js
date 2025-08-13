const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');
const matter = require('front-matter');
const { glob } = require('glob');

// 翻译函数
async function translateWithDeepL(text, targetLang = 'RU') {
  try {
    const response = await axios.post('https://api-free.deepl.com/v2/translate', 
      new URLSearchParams({
        auth_key: process.env.DEEPL_API_KEY,
        text: text,
        source_lang: 'ZH',
        target_lang: targetLang,
        formality: 'default'
      }), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );
    
    return response.data.translations[0].text;
  } catch (error) {
    console.error('Translation error:', error.response?.data || error.message);
    throw error;
  }
}

// 处理Markdown文件的翻译
async function processMarkdownFile(filePath) {
  console.log(`Processing: ${filePath}`);
  
  const content = await fs.readFile(filePath, 'utf8');
  const parsed = matter(content);
  
  // 构建俄语版本文件路径 - 支持所有命名模式
  let ruPath;
  if (filePath.includes('index_')) {
    // 处理 index_something.md -> index_something.ru.md
    ruPath = filePath.replace(/\.md$/, '.ru.md');
  } else {
    // 处理 index.md -> index.ru.md
    ruPath = filePath.replace(/\.md$/, '.ru.md');
  }
  
  console.log(`Target Russian file: ${ruPath}`);
  
  // 检查俄语版本是否已存在且较新
  if (await fs.pathExists(ruPath)) {
    const originalStat = await fs.stat(filePath);
    const translationStat = await fs.stat(ruPath);
    
    if (translationStat.mtime > originalStat.mtime) {
      console.log(`Skipping ${filePath} - Russian translation is up to date`);
      return;
    }
  }
  
  // 翻译frontmatter
  const translatedAttributes = { ...parsed.attributes };

  // 保持date字段为原始字符串格式，不进行翻译
  if (parsed.attributes.date) {
    // 从原始内容中提取原始的date字符串
    const dateMatch = content.match(/^date:\s*(.+)$/m);
    if (dateMatch) {
      translatedAttributes.date = dateMatch[1].trim();
    }
  }

  if (parsed.attributes.title) {
    console.log('Translating title...');
    translatedAttributes.title = await translateWithDeepL(parsed.attributes.title);
  }

  if (parsed.attributes.description) {
    console.log('Translating description...');
    translatedAttributes.description = await translateWithDeepL(parsed.attributes.description);
  }
  
  // 翻译tags（如果存在）
  if (parsed.attributes.tags && Array.isArray(parsed.attributes.tags)) {
    console.log('Translating tags...');
    translatedAttributes.tags = [];
    for (const tag of parsed.attributes.tags) {
      if (typeof tag === 'string') {
        try {
          const translatedTag = await translateWithDeepL(tag);
          translatedAttributes.tags.push(translatedTag);
        } catch (error) {
          console.warn(`Failed to translate tag "${tag}", keeping original`);
          translatedAttributes.tags.push(tag);
        }
      } else {
        translatedAttributes.tags.push(tag);
      }
    }
  }
  
  // 翻译正文内容（分段处理以保持质量）
  console.log('Translating content...');
  const paragraphs = parsed.body.split('\n\n');
  const translatedParagraphs = [];
  
  for (let i = 0; i < paragraphs.length; i++) {
    const paragraph = paragraphs[i].trim();
    
    // 跳过空段落、代码块、和某些特殊格式
    if (!paragraph || 
        paragraph.startsWith('```') || 
        paragraph.startsWith('<!--') ||
        paragraph.match(/^#{1,6}\s/) ||  // 跳过标题，单独处理
        paragraph.startsWith('![') ||    // 跳过图片
        paragraph.startsWith('[') ||     // 跳过某些链接
        paragraph.includes('```')) {
      translatedParagraphs.push(paragraph);
      continue;
    }
    
    try {
      const translatedParagraph = await translateWithDeepL(paragraph);
      translatedParagraphs.push(translatedParagraph);
      
      // 添加延迟避免API限制
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.warn(`Failed to translate paragraph ${i + 1}, keeping original:`, error.message);
      translatedParagraphs.push(paragraph);
    }
  }
  
  const translatedBody = translatedParagraphs.join('\n\n');
  
  // 构建俄语版本的完整内容
  // 手动构建markdown内容（front-matter格式）
  const frontMatterYaml = Object.keys(translatedAttributes).map(key => {
    const value = translatedAttributes[key];
    if (Array.isArray(value)) {
      return `${key}:\n${value.map(item => `  - ${JSON.stringify(item)}`).join('\n')}`;
    } else if (key === 'date') {
      // date字段不加引号，保持原始格式
      return `${key}: ${value}`;
    } else if (typeof value === 'string') {
      return `${key}: ${JSON.stringify(value)}`;
    } else {
      return `${key}: ${value}`;
    }
  }).join('\n');
  
  const ruContent = `---\n${frontMatterYaml}\n---\n\n${translatedBody}`;

  
  // 确保目录存在并写入文件
  await fs.ensureDir(path.dirname(ruPath));
  await fs.writeFile(ruPath, ruContent, 'utf8');
  
  console.log(`✅ Translated: ${filePath} -> ${ruPath}`);
}

// 主函数
async function main() {
  try {
    if (!process.env.DEEPL_API_KEY) {
      throw new Error('DEEPL_API_KEY environment variable is required');
    }
    
    console.log('🔍 Finding Markdown files to translate...');
    
    // 查找所有需要翻译的Markdown文件
    // 支持所有Hugo配置中的文件模式
    const files = await glob('content/**/*.md', {
      ignore: [
        'content/**/*.ru.md',        // 排除已翻译的俄语文件
        'content/**/*.en.md',        // 排除英语文件
        'content/**/search/_index.md' // 排除搜索索引文件
      ]
    });
    
    // 过滤出符合我们模式的文件
    const supportedFiles = files.filter(file => {
      const basename = path.basename(file);
      return (
        basename === 'index.md' ||           // 标准 index.md
        basename.startsWith('index_') ||     // index_*.md 模式
        basename === '_index.md'             // 分类页面
      );
    });
    
    console.log(`📝 Found ${supportedFiles.length} files to process:${supportedFiles.length > 0 ? '\n  ' + supportedFiles.join('\n  ') : ''}`);
    
    for (const file of supportedFiles) {
      try {
        await processMarkdownFile(file);
      } catch (error) {
        console.error(`❌ Failed to process ${file}:`, error.message);
        // 继续处理其他文件
      }
    }
    
    console.log('🎉 Translation process completed!');
    
  } catch (error) {
    console.error('❌ Fatal error:', error.message);
    process.exit(1);
  }
}

// 运行主函数
if (require.main === module) {
  main();
}

module.exports = { translateWithDeepL, processMarkdownFile };
