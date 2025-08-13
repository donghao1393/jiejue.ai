const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');
const matter = require('front-matter');
const { glob } = require('glob');

// 翻译函数
async function translateWithDeepL(text, targetLang = 'RU') {
  try {
    const response = await axios.post('https://api.deepl.com/v2/translate',
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
  
  // 翻译正文内容（智能处理特殊格式）
  console.log('Translating content...');

  // 预处理：保护代码块和链接
  let bodyToTranslate = parsed.body;
  const protectedBlocks = [];
  let blockIndex = 0;

  // 保护代码块
  bodyToTranslate = bodyToTranslate.replace(/```[\s\S]*?```/g, (match) => {
    const placeholder = `__PROTECTED_CODE_BLOCK_${blockIndex}__`;
    protectedBlocks[blockIndex] = match;
    blockIndex++;
    return placeholder;
  });

  // 保护内联代码
  bodyToTranslate = bodyToTranslate.replace(/`[^`]+`/g, (match) => {
    const placeholder = `__PROTECTED_INLINE_CODE_${blockIndex}__`;
    protectedBlocks[blockIndex] = match;
    blockIndex++;
    return placeholder;
  });

  // 保护图片（完整保护，不翻译alt文本）
  bodyToTranslate = bodyToTranslate.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (match) => {
    const placeholder = `__PROTECTED_IMAGE_${blockIndex}__`;
    protectedBlocks[blockIndex] = match;
    blockIndex++;
    return placeholder;
  });

  // 保护链接URL（保护URL但允许链接文本被翻译）
  bodyToTranslate = bodyToTranslate.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match, text, url) => {
    const placeholder = `__PROTECTED_LINK_URL_${blockIndex}__`;
    protectedBlocks[blockIndex] = url;
    blockIndex++;
    return `[${text}](${placeholder})`;
  });

  // 保护Hugo shortcodes
  bodyToTranslate = bodyToTranslate.replace(/\{\{<[^>]*>\}\}/g, (match) => {
    const placeholder = `__PROTECTED_SHORTCODE_${blockIndex}__`;
    protectedBlocks[blockIndex] = match;
    blockIndex++;
    return placeholder;
  });

  // 保护HTML标签（包含属性）
  bodyToTranslate = bodyToTranslate.replace(/<[^>]+>/g, (match) => {
    const placeholder = `__PROTECTED_HTML_TAG_${blockIndex}__`;
    protectedBlocks[blockIndex] = match;
    blockIndex++;
    return placeholder;
  });

  // 翻译处理后的内容
  const translatedBody = await translateWithDeepL(bodyToTranslate);

  // 恢复保护的内容
  let finalBody = translatedBody;
  for (let i = 0; i < protectedBlocks.length; i++) {
    const codeBlockPlaceholder = `__PROTECTED_CODE_BLOCK_${i}__`;
    const inlinePlaceholder = `__PROTECTED_INLINE_CODE_${i}__`;
    const linkPlaceholder = `__PROTECTED_LINK_URL_${i}__`;
    const imagePlaceholder = `__PROTECTED_IMAGE_${i}__`;
    const shortcodePlaceholder = `__PROTECTED_SHORTCODE_${i}__`;
    const htmlTagPlaceholder = `__PROTECTED_HTML_TAG_${i}__`;

    // 按类型恢复内容
    finalBody = finalBody.replace(new RegExp(codeBlockPlaceholder, 'g'), protectedBlocks[i]);
    finalBody = finalBody.replace(new RegExp(inlinePlaceholder, 'g'), protectedBlocks[i]);
    finalBody = finalBody.replace(new RegExp(linkPlaceholder, 'g'), protectedBlocks[i]);
    finalBody = finalBody.replace(new RegExp(imagePlaceholder, 'g'), protectedBlocks[i]);
    finalBody = finalBody.replace(new RegExp(shortcodePlaceholder, 'g'), protectedBlocks[i]);
    finalBody = finalBody.replace(new RegExp(htmlTagPlaceholder, 'g'), protectedBlocks[i]);
  }
  
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
  
  const ruContent = `---\n${frontMatterYaml}\n---\n\n${finalBody}`;

  
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
