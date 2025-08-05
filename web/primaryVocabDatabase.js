// 小学词汇数据库 - 按年级组织
// 专门用于K12小学阶段的词汇量测试和学习

const primaryVocabDatabase = {
  // 三年级词汇
  grade3: [],
  
  // 四年级词汇
  grade4: [],
  
  // 五年级词汇
  grade5: [],
  
  // 六年级词汇
  grade6: [],
  
  // 统计信息
  stats: {
    totalWords: 0,
    gradeDistribution: {
      grade3: 0,
      grade4: 0,
      grade5: 0,
      grade6: 0
    }
  }
};

// 根据年级获取词汇
function getVocabByGrade(grade, count = 20) {
  const gradeKey = `grade${grade}`;
  
  // 优先使用导入的Excel数据
  let vocabList = null;
  if (typeof importedPrimaryVocab !== 'undefined' && importedPrimaryVocab[gradeKey]) {
    vocabList = importedPrimaryVocab[gradeKey];
    console.log(`✅ 使用Excel导入数据，年级${grade}：${vocabList.length}个词汇`);
  } else {
    // 回退到内置数据库
    vocabList = primaryVocabDatabase[gradeKey];
    console.log(`⚠️ 使用内置数据库，年级${grade}：${vocabList ? vocabList.length : 0}个词汇`);
  }
  
  if (!vocabList || vocabList.length === 0) {
    console.warn(`年级 ${grade} 的词汇数据为空`);
    return [];
  }
  
  // 随机选择指定数量的词汇
  const selectedWords = [];
  const usedIndices = new Set();
  const maxCount = Math.min(count, vocabList.length);
  
  for (let i = 0; i < maxCount; i++) {
    let randomIndex;
    do {
      randomIndex = Math.floor(Math.random() * vocabList.length);
    } while (usedIndices.has(randomIndex));
    
    usedIndices.add(randomIndex);
    const word = vocabList[randomIndex];
    
    // 转换为测试所需的格式
    const wordData = {
      word: word.word,
      meaning: word.meaning,
      grade: grade,
      level: 'primary',
      difficulty: calculateGradeDifficulty(grade),
      phonetic: word.phonetic || '',
      partOfSpeech: word.partOfSpeech || 'n.'
    };
    
    // 生成或使用现有的选项
    if (word.options && Array.isArray(word.options) && word.options.length >= 4) {
      wordData.options = [...word.options];
    } else {
      wordData.options = generateOptionsForWord(word, vocabList);
    }
    
    selectedWords.push(wordData);
  }
  
  return selectedWords;
}

// 根据小学所有年级混合获取词汇（用于综合测试）
function getPrimaryMixedVocab(count = 20) {
  const allVocab = [];
  
  // 按比例从各年级抽取词汇
  const gradeRatio = {
    3: 0.2,  // 20%
    4: 0.3,  // 30%
    5: 0.3,  // 30%
    6: 0.2   // 20%
  };
  
  for (let grade = 3; grade <= 6; grade++) {
    const gradeCount = Math.round(count * gradeRatio[grade]);
    const gradeVocab = getVocabByGrade(grade, gradeCount);
    allVocab.push(...gradeVocab);
  }
  
  // 如果总数不够，从各年级补充
  while (allVocab.length < count) {
    for (let grade = 3; grade <= 6 && allVocab.length < count; grade++) {
      const additionalVocab = getVocabByGrade(grade, 1);
      if (additionalVocab.length > 0) {
        allVocab.push(additionalVocab[0]);
      }
    }
  }
  
  // 打乱顺序
  return shuffleArray(allVocab.slice(0, count));
}

// 为单词生成选项
function generateOptionsForWord(word, vocabList = []) {
  const options = [word.meaning];
  const used = new Set([word.meaning]);
  
  // 优先从同年级词汇中选择干扰项
  const sameGradeDistractors = vocabList
    .filter(w => w.word !== word.word && w.meaning !== word.meaning)
    .map(w => w.meaning)
    .filter(meaning => !used.has(meaning));
  
  // 添加同年级干扰项
  while (options.length < 4 && sameGradeDistractors.length > 0) {
    const randomIndex = Math.floor(Math.random() * sameGradeDistractors.length);
    const distractor = sameGradeDistractors.splice(randomIndex, 1)[0];
    if (!used.has(distractor)) {
      options.push(distractor);
      used.add(distractor);
    }
  }
  
  // 如果还不够4个选项，使用通用干扰项
  const fallbackDistractors = [
    '苹果', '学校', '朋友', '家庭', '老师', '学生', '书本', '铅笔',
    '桌子', '椅子', '黑板', '窗户', '门', '花', '树', '太阳',
    '月亮', '星星', '水', '火', '风', '雨', '雪', '冰'
  ];
  
  while (options.length < 4) {
    const randomDistractor = fallbackDistractors[Math.floor(Math.random() * fallbackDistractors.length)];
    if (!used.has(randomDistractor)) {
      options.push(randomDistractor);
      used.add(randomDistractor);
    }
  }
  
  return shuffleArray(options);
}

// 根据年级计算难度
function calculateGradeDifficulty(grade) {
  const difficultyMap = {
    3: 1,
    4: 2,
    5: 3,
    6: 4
  };
  return difficultyMap[grade] || 1;
}

// 打乱数组
function shuffleArray(array) {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

// 加载Excel数据到数据库
function loadExcelDataToPrimaryDB(excelData) {
  console.log('📚 开始加载小学词汇Excel数据...');
  
  try {
    // 清空现有数据
    primaryVocabDatabase.grade3 = [];
    primaryVocabDatabase.grade4 = [];
    primaryVocabDatabase.grade5 = [];
    primaryVocabDatabase.grade6 = [];
    
    let totalLoaded = 0;
    
    excelData.forEach((row, index) => {
      try {
        // 假设Excel列结构：word, meaning, grade, phonetic, partOfSpeech
        const wordData = {
          word: row.word || row.单词 || row.Word,
          meaning: row.meaning || row.中文 || row.意思 || row.Meaning,
          grade: parseInt(row.grade || row.年级 || row.Grade),
          phonetic: row.phonetic || row.音标 || row.Phonetic || '',
          partOfSpeech: row.partOfSpeech || row.词性 || row.PartOfSpeech || 'n.'
        };
        
        // 验证数据完整性
        if (!wordData.word || !wordData.meaning || !wordData.grade) {
          console.warn(`第${index + 1}行数据不完整，跳过:`, row);
          return;
        }
        
        // 验证年级范围
        if (wordData.grade < 3 || wordData.grade > 6) {
          console.warn(`第${index + 1}行年级超出范围(3-6):`, wordData.grade);
          return;
        }
        
        // 添加到对应年级
        const gradeKey = `grade${wordData.grade}`;
        primaryVocabDatabase[gradeKey].push(wordData);
        totalLoaded++;
        
      } catch (error) {
        console.error(`处理第${index + 1}行数据时出错:`, error, row);
      }
    });
    
    // 更新统计信息
    updateDatabaseStats();
    
    console.log(`✅ 小学词汇数据加载完成！总计: ${totalLoaded} 个单词`);
    console.log('📊 年级分布:', primaryVocabDatabase.stats.gradeDistribution);
    
    return true;
  } catch (error) {
    console.error('❌ 加载Excel数据失败:', error);
    return false;
  }
}

// 更新数据库统计信息
function updateDatabaseStats() {
  primaryVocabDatabase.stats.gradeDistribution.grade3 = primaryVocabDatabase.grade3.length;
  primaryVocabDatabase.stats.gradeDistribution.grade4 = primaryVocabDatabase.grade4.length;
  primaryVocabDatabase.stats.gradeDistribution.grade5 = primaryVocabDatabase.grade5.length;
  primaryVocabDatabase.stats.gradeDistribution.grade6 = primaryVocabDatabase.grade6.length;
  
  primaryVocabDatabase.stats.totalWords = 
    primaryVocabDatabase.stats.gradeDistribution.grade3 +
    primaryVocabDatabase.stats.gradeDistribution.grade4 +
    primaryVocabDatabase.stats.gradeDistribution.grade5 +
    primaryVocabDatabase.stats.gradeDistribution.grade6;
}

// 获取数据库统计信息
function getPrimaryVocabStats() {
  return primaryVocabDatabase.stats;
}

// 验证学生年级并推荐测试内容
function getRecommendedTestForStudent(studentGrade) {
  const recommendations = {
    1: { testGrades: [3], description: '一年级学生建议测试三年级基础词汇' },
    2: { testGrades: [3], description: '二年级学生建议测试三年级基础词汇' },
    3: { testGrades: [3, 4], description: '三年级学生建议测试三、四年级词汇' },
    4: { testGrades: [3, 4, 5], description: '四年级学生建议测试三到五年级词汇' },
    5: { testGrades: [4, 5, 6], description: '五年级学生建议测试四到六年级词汇' },
    6: { testGrades: [5, 6], description: '六年级学生建议测试五、六年级词汇' }
  };
  
  return recommendations[studentGrade] || recommendations[3];
}

// 导出函数供其他模块使用
if (typeof window !== 'undefined') {
  window.primaryVocabDatabase = primaryVocabDatabase;
  window.getVocabByGrade = getVocabByGrade;
  window.getPrimaryMixedVocab = getPrimaryMixedVocab;
  window.loadExcelDataToPrimaryDB = loadExcelDataToPrimaryDB;
  window.getPrimaryVocabStats = getPrimaryVocabStats;
  window.getRecommendedTestForStudent = getRecommendedTestForStudent;
}

// Node.js 导出
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    primaryVocabDatabase,
    getVocabByGrade,
    getPrimaryMixedVocab,
    loadExcelDataToPrimaryDB,
    getPrimaryVocabStats,
    getRecommendedTestForStudent
  };
}