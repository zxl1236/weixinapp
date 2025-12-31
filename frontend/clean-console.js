/**
 * 清理调试代码脚本
 * 移除 console.log，保留 console.error 和 console.warn
 */

const fs = require('fs');
const path = require('path');

// 需要清理的目录
const CLEAN_DIRS = [
  'pages',
  'utils'
];

// 需要清理的文件
const CLEAN_FILES = [
  'app.js'
];

// 排除的文件（工具脚本等）
const EXCLUDE_PATTERNS = [
  /check-deploy\.js$/,
  /clean-console\.js$/,
  /test-.*\.js$/,
  /\.md$/,
  /cdn-data/,
  /docs/,
  /examples/
];

let totalRemoved = 0;
let filesProcessed = 0;

/**
 * 检查文件是否应该被排除
 */
function shouldExclude(filePath) {
  return EXCLUDE_PATTERNS.some(pattern => pattern.test(filePath));
}

/**
 * 清理单个文件中的 console.log
 */
function cleanFile(filePath) {
  if (shouldExclude(filePath)) {
    return;
  }

  try {
    let content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;
    
    // 匹配 console.log 语句（包括多行）
    // 匹配规则：
    // 1. console.log(...) 单独一行
    // 2. console.log(...); 带分号
    // 3. 前面可能有缩进
    // 4. 后面可能有注释
    
    // 移除单行 console.log
    content = content.replace(/^\s*console\.log\([^)]*\);?\s*(\/\/.*)?$/gm, '');
    
    // 移除多行 console.log（带换行的参数）
    content = content.replace(/^\s*console\.log\([^)]*\)\s*;?\s*(\/\/.*)?$/gm, '');
    
    // 移除 console.log 但保留 console.error 和 console.warn
    // 更精确的匹配：只匹配 console.log，不匹配 console.error 或 console.warn
    const lines = content.split('\n');
    const cleanedLines = [];
    let removedCount = 0;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // 检查是否是 console.log（但不是 console.error 或 console.warn）
      if (/^\s*console\.log\(/.test(line) && 
          !/^\s*console\.(error|warn)\(/.test(line)) {
        // 跳过这一行
        removedCount++;
        continue;
      }
      
      cleanedLines.push(line);
    }
    
    content = cleanedLines.join('\n');
    
    // 移除连续的空行（超过2个空行）
    content = content.replace(/\n{3,}/g, '\n\n');
    
    if (content !== originalContent) {
      fs.writeFileSync(filePath, content, 'utf8');
      totalRemoved += removedCount;
      filesProcessed++;
      console.log(`✅ 已清理: ${filePath} (移除 ${removedCount} 处)`);
      return removedCount;
    }
    
    return 0;
  } catch (error) {
    console.error(`❌ 处理文件失败 ${filePath}:`, error.message);
    return 0;
  }
}

/**
 * 递归遍历目录
 */
function walkDir(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      if (!shouldExclude(filePath)) {
        walkDir(filePath, fileList);
      }
    } else if (file.endsWith('.js')) {
      if (!shouldExclude(filePath)) {
        fileList.push(filePath);
      }
    }
  });
  
  return fileList;
}

// 主函数
function main() {
  console.log('🧹 开始清理调试代码...\n');
  
  // 清理目录
  CLEAN_DIRS.forEach(dir => {
    if (fs.existsSync(dir)) {
      const files = walkDir(dir);
      files.forEach(cleanFile);
    }
  });
  
  // 清理指定文件
  CLEAN_FILES.forEach(file => {
    if (fs.existsSync(file)) {
      cleanFile(file);
    }
  });
  
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`📊 清理完成！`);
  console.log(`   处理文件数: ${filesProcessed}`);
  console.log(`   移除 console.log: ${totalRemoved} 处`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

main();

