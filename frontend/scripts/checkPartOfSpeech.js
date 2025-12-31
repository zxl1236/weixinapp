const fs = require('fs');
const path = require('path');

/**
 * 检查单词词性标注错误
 * 使用方法: node scripts/checkPartOfSpeech.js <js文件路径>
 */

// 常见词性错误规则
const commonErrors = {
  // 颜色词通常应该是"名;形容"或"名"
  colors: {
    words: ['red', 'blue', 'green', 'yellow', 'white', 'black', 'pink', 'purple', 'brown', 'orange'],
    expected: ['名;形容', '名', '形容'],
    description: '颜色词'
  },
  // 常见动词
  verbs: {
    words: ['make', 'go', 'say', 'like', 'have', 'can', 'need', 'help', 'use', 'eat', 'see', 'draw', 'run', 'cut', 'give', 'smile', 'listen', 'share', 'hear', 'win'],
    expected: ['动'],
    description: '动词'
  },
  // 常见名词
  nouns: {
    words: ['cake', 'grape', 'baby', 'tree', 'cat', 'dog', 'bag', 'hand', 'egg', 'pet', 'fish', 'sun', 'bus', 'arm', 'farm', 'bird', 'girl', 'sea', 'eye', 'ear', 'year', 'air', 'bear', 'flower', 'water', 'tiger', 'lion', 'toy', 'boy', 'mouth', 'nose', 'book', 'foot', 'garden', 'grass', 'father', 'mother', 'brother', 'sister', 'uncle', 'aunt', 'cousin', 'grandfather', 'grandmother', 'grandma', 'grandpa', 'animal', 'family', 'friend', 'school', 'zoo'],
    expected: ['名'],
    description: '名词'
  },
  // 常见形容词
  adjectives: {
    words: ['big', 'small', 'good', 'nice', 'old', 'new', 'cute', 'ill', 'tall', 'fast', 'sad', 'quiet', 'poor'],
    expected: ['形容', '名;形容'],
    description: '形容词'
  },
  // 常见代词
  pronouns: {
    words: ['I', 'he', 'she', 'me', 'we', 'us', 'them', 'you', 'your', 'my', 'who', 'what', 'which', 'some'],
    expected: ['代', '副'],
    description: '代词'
  },
  // 常见数词
  numbers: {
    words: ['one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'],
    expected: ['数'],
    description: '数词'
  }
};

function readJsModule(jsPath) {
  try {
    const resolvedPath = path.resolve(jsPath);
    delete require.cache[resolvedPath];
    const data = require(resolvedPath);
    return data;
  } catch (e) {
    console.error(`❌ 读取 JS 模块失败: ${jsPath}`);
    console.error(`   错误: ${e.message}`);
    process.exit(1);
  }
}

function checkPartOfSpeech(jsData) {
  const errors = [];
  const warnings = [];
  
  if (!jsData.words || !Array.isArray(jsData.words)) {
    console.error('❌ JS 模块中没有 words 数组');
    process.exit(1);
  }
  
  // 创建单词映射
  const wordMap = new Map();
  jsData.words.forEach(wordObj => {
    const word = (wordObj.word || '').toLowerCase().trim();
    if (word) {
      if (!wordMap.has(word)) {
        wordMap.set(word, []);
      }
      wordMap.get(word).push(wordObj);
    }
  });
  
  // 检查每种类型的错误
  Object.keys(commonErrors).forEach(category => {
    const rule = commonErrors[category];
    rule.words.forEach(word => {
      const wordLower = word.toLowerCase();
      const entries = wordMap.get(wordLower);
      
      if (entries) {
        entries.forEach(entry => {
          const pos = entry.partOfSpeech || '';
          const isCorrect = rule.expected.some(expected => pos.includes(expected));
          
          if (!isCorrect && pos) {
            errors.push({
              word: entry.word,
              current: pos,
              expected: rule.expected.join(' 或 '),
              category: rule.description,
              meaning: entry.meaning,
              serialNumber: entry.serialNumber
            });
          }
        });
      }
    });
  });
  
  // 检查重复单词的词性是否一致
  wordMap.forEach((entries, word) => {
    if (entries.length > 1) {
      const posSet = new Set(entries.map(e => e.partOfSpeech || ''));
      if (posSet.size > 1) {
        warnings.push({
          word: word,
          count: entries.length,
          positions: Array.from(posSet),
          entries: entries.map(e => ({
            serialNumber: e.serialNumber,
            partOfSpeech: e.partOfSpeech,
            meaning: e.meaning
          }))
        });
      }
    }
  });
  
  return { errors, warnings };
}

function printReport(jsPath, report) {
  console.log(`\n📋 检查报告: ${path.basename(jsPath)}\n`);
  console.log('='.repeat(60));
  
  if (report.errors.length === 0 && report.warnings.length === 0) {
    console.log('✅ 未发现明显的词性标注错误！');
    return;
  }
  
  if (report.errors.length > 0) {
    console.log(`\n❌ 发现 ${report.errors.length} 个词性标注错误：\n`);
    
    // 按类别分组
    const byCategory = {};
    report.errors.forEach(error => {
      if (!byCategory[error.category]) {
        byCategory[error.category] = [];
      }
      byCategory[error.category].push(error);
    });
    
    Object.keys(byCategory).forEach(category => {
      console.log(`\n【${category}】`);
      byCategory[category].forEach(error => {
        console.log(`  • ${error.word} (序号: ${error.serialNumber})`);
        console.log(`    当前词性: "${error.current}"`);
        console.log(`    期望词性: ${error.expected}`);
        console.log(`    含义: ${error.meaning}`);
      });
    });
  }
  
  if (report.warnings.length > 0) {
    console.log(`\n⚠️  发现 ${report.warnings.length} 个词性不一致的重复单词：\n`);
    report.warnings.forEach(warning => {
      console.log(`  • ${warning.word} (出现 ${warning.count} 次)`);
      console.log(`    词性: ${warning.positions.join(', ')}`);
      warning.entries.forEach(entry => {
        console.log(`      - 序号 ${entry.serialNumber}: "${entry.partOfSpeech}" (${entry.meaning})`);
      });
    });
  }
  
  console.log('\n' + '='.repeat(60));
}

function main() {
  const [, , ...jsPaths] = process.argv;
  
  if (jsPaths.length === 0) {
    console.log('使用方法:');
    console.log('  node scripts/checkPartOfSpeech.js <js文件路径1> [js文件路径2] ...');
    console.log('');
    console.log('示例:');
    console.log('  node scripts/checkPartOfSpeech.js "cdn-data/js-modules/grade3_1.js" "cdn-data/js-modules/grade3_2.js"');
    process.exit(1);
  }
  
  let totalErrors = 0;
  let totalWarnings = 0;
  
  jsPaths.forEach(jsPath => {
    const fullPath = path.resolve(jsPath);
    
    if (!fs.existsSync(fullPath)) {
      console.error(`❌ 文件不存在: ${fullPath}`);
      return;
    }
    
    const jsData = readJsModule(fullPath);
    const report = checkPartOfSpeech(jsData);
    
    totalErrors += report.errors.length;
    totalWarnings += report.warnings.length;
    
    printReport(jsPath, report);
  });
  
  if (jsPaths.length > 1) {
    console.log(`\n📊 总计: ${totalErrors} 个错误, ${totalWarnings} 个警告`);
  }
}

main();

