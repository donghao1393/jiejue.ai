#!/bin/bash

echo "🔍 Analyzing your content structure..."

echo ""
echo "📁 File distribution:"
fd "index*.md" content/posts/ | awk -F/ '{print $NF}' | sort | uniq -c

echo ""
echo "📋 Files that will be translated:"
find content -name "index.md" -o -name "index_*.md" -o -name "_index.md" | grep -v "\.ru\.md" | sort

echo ""
echo "📄 Existing Russian translations:"
find content -name "*.ru.md" | sort

echo ""
echo "💡 Missing Russian translations:"
for file in $(find content -name "index.md" -o -name "index_*.md" -o -name "_index.md" | grep -v "\.ru\.md"); do
    ru_file="${file%.md}.ru.md"
    if [ ! -f "$ru_file" ]; then
        echo "  $file -> $ru_file (missing)"
    fi
done
