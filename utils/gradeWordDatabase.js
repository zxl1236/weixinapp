// 分级词汇数据库管理工具
// 支持K12三个阶段的词汇数据管理

/**
 * 年级词汇数据结构
 * 等待集成开源数据库后完善
 */

// 临时的年级词汇数据结构示例
const gradeStructure = {
  // 小学阶段（英语从3年级开始）
  primary: {
    grade1: { level: 1, targetWords: 0, description: '一年级（未开设英语课）', enabled: false },
    grade2: { level: 2, targetWords: 0, description: '二年级（未开设英语课）', enabled: false },
    grade3: { level: 3, targetWords: 300, description: '三年级基础词汇', enabled: true },
    grade4: { level: 4, targetWords: 400, description: '四年级扩展词汇', enabled: true },
    grade5: { level: 5, targetWords: 500, description: '五年级提升词汇', enabled: true },
    grade6: { level: 6, targetWords: 600, description: '六年级综合词汇', enabled: true }
  },
  
  // 初中阶段
  junior: {
    grade7: { level: 7, targetWords: 1000, description: '初一核心词汇' },
    grade8: { level: 8, targetWords: 1200, description: '初二重点词汇' },
    grade9: { level: 9, targetWords: 1500, description: '初三必备词汇' }
  },
  
  // 高中阶段
  senior: {
    grade10: { level: 10, targetWords: 2000, description: '高一基础词汇' },
    grade11: { level: 11, targetWords: 2500, description: '高二进阶词汇' },
    grade12: { level: 12, targetWords: 3000, description: '高三高考词汇' }
  }
};

// 引入增强版词汇数据库
const { getGradeVocabulary } = require('./enhancedWordDatabase.js');

// 尝试引入预处理的词汇数据库（第一优先级）
let getPreprocessedGradeVocabulary = null;
try {
  const preprocessed = require('./preprocessedWordDatabase.js');
  getPreprocessedGradeVocabulary = preprocessed.getPreprocessedGradeVocabulary;
  console.log('📦 检测到预处理的词汇数据库（来自 word_translation.csv）');
} catch (error) {
  console.log('📝 未找到预处理的词汇数据库');
}

// 已删除importedWordDatabase.js，简化数据优先级

// 动态词汇管理器已移除，使用传统数据源

/**
 * 获取指定年级的词汇数据
 * @param {string} gradeId - 年级ID (如: grade1, grade7, grade10)
 * @param {number} count - 需要的词汇数量
 * @param {string} dataType - 数据类型: 'test'(测试), 'training'(训练), 'all'(全部)
 * @returns {Array} 词汇列表
 */
function getGradeWords(gradeId, count = 20, dataType = 'all') {
  try {
    // 检查年级是否开设英语课
    if (!isGradeEnabled(gradeId)) {
      console.warn(`⚠️ ${gradeId} 未开设英语课，返回空词汇列表`);
      return [];
    }

    // 📦 使用预处理的词汇数据源
    // 第一优先级：使用预处理的词汇数据库（来自 word_translation.csv）
    if (getPreprocessedGradeVocabulary) {
      console.log(`📦 使用预处理数据库加载 ${gradeId} 年级词汇，数量: ${count}`);
      const preprocessedWords = getPreprocessedGradeVocabulary(gradeId, count * 2); // 获取更多词汇用于筛选
      if (preprocessedWords && preprocessedWords.length > 0) {
        console.log(`✅ 预处理数据库成功返回 ${preprocessedWords.length} 个词汇`);
        
        // 根据数据类型筛选词汇
        const filteredWords = filterWordsByDataType(preprocessedWords, dataType, gradeId);
        const finalWords = filteredWords.slice(0, count);
        
        console.log(`🎯 ${dataType}模式筛选后:`, finalWords.slice(0, 3).map(w => `${w.word}(${w.meaning})`));
        return finalWords;
      }
    }

    // 第二优先级：使用增强版本地数据库（系统默认数据）
    console.log(`📚 使用本地数据库加载 ${gradeId} 年级词汇，数量: ${count}`);
    const words = getGradeVocabulary(gradeId, count);
    console.log(`✅ 本地数据库成功返回 ${words.length} 个词汇`);
    console.log(`🔍 前3个词汇预览:`, words.slice(0, 3).map(w => `${w.word}(${w.meaning})`));
    return words;
  } catch (error) {
    console.error('❌ 所有数据库加载失败，返回空数组:', error);
    return [];
  }
}

/**
 * 根据年级ID获取难度级别
 * @param {string} gradeId - 年级ID
 * @returns {number} 难度级别
 */
function getGradeLevel(gradeId) {
  const gradeMap = {
    'grade1': 1, 'grade2': 2, 'grade3': 3, 'grade4': 4, 'grade5': 5, 'grade6': 6,
    'grade7': 7, 'grade8': 8, 'grade9': 9,
    'grade10': 10, 'grade11': 11, 'grade12': 12
  };
  
  return gradeMap[gradeId] || 1;
}

/**
 * 获取年级信息
 * @param {string} gradeId - 年级ID
 * @returns {Object} 年级信息
 */
function getGradeInfo(gradeId) {
  for (const stage in gradeStructure) {
    if (gradeStructure[stage][gradeId]) {
      return {
        ...gradeStructure[stage][gradeId],
        gradeId,
        stage
      };
    }
  }
  return null;
}

/**
 * 检查年级是否开设英语课
 * @param {string} gradeId - 年级ID
 * @returns {boolean} 是否开设英语课
 */
function isGradeEnabled(gradeId) {
  const gradeInfo = getGradeInfo(gradeId);
  return gradeInfo ? (gradeInfo.enabled !== false) : true; // 默认为开设
}

/**
 * 获取学习进度
 * @param {string} gradeId - 年级ID
 * @returns {Object} 学习进度信息
 */
function getGradeProgress(gradeId) {
  try {
    const progressKey = `grade_progress_${gradeId}`;
    const progress = wx.getStorageSync(progressKey) || {
      masteredWords: 0,
      totalAttempts: 0,
      correctAttempts: 0,
      lastStudyTime: null
    };
    
    const gradeInfo = getGradeInfo(gradeId);
    const targetWords = gradeInfo ? gradeInfo.targetWords : 100;
    
    return {
      ...progress,
      targetWords,
      masteryRate: Math.min(100, Math.round((progress.masteredWords / targetWords) * 100)),
      accuracyRate: progress.totalAttempts > 0 ? 
        Math.round((progress.correctAttempts / progress.totalAttempts) * 100) : 0
    };
  } catch (error) {
    console.error('获取学习进度失败:', error);
    return {
      masteredWords: 0,
      totalAttempts: 0,
      correctAttempts: 0,
      targetWords: 100,
      masteryRate: 0,
      accuracyRate: 0,
      lastStudyTime: null
    };
  }
}

/**
 * 更新学习进度
 * @param {string} gradeId - 年级ID
 * @param {Array} answers - 答题记录
 */
function updateGradeProgress(gradeId, answers) {
  try {
    const progressKey = `grade_progress_${gradeId}`;
    const currentProgress = getGradeProgress(gradeId);
    
    const correctAnswers = answers.filter(answer => answer.isCorrect);
    const newMasteredWords = new Set();
    
    // 统计新掌握的单词
    correctAnswers.forEach(answer => {
      newMasteredWords.add(answer.question);
    });
    
    const updatedProgress = {
      masteredWords: currentProgress.masteredWords + newMasteredWords.size,
      totalAttempts: currentProgress.totalAttempts + answers.length,
      correctAttempts: currentProgress.correctAttempts + correctAnswers.length,
      lastStudyTime: Date.now()
    };
    
    wx.setStorageSync(progressKey, updatedProgress);
    console.log(`${gradeId} 学习进度已更新:`, updatedProgress);
    
  } catch (error) {
    console.error('更新学习进度失败:', error);
  }
}

/**
 * 打乱数组
 * @param {Array} array - 原数组
 * @returns {Array} 打乱后的数组
 */
function shuffleArray(array) {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

/**
 * 根据数据类型筛选词汇
 * @param {Array} words - 原始词汇列表
 * @param {string} dataType - 数据类型: 'test', 'training', 'all'
 * @param {string} gradeId - 年级ID
 * @returns {Array} 筛选后的词汇列表
 */
function filterWordsByDataType(words, dataType, gradeId) {
  if (dataType === 'all') {
    return shuffleArray(words);
  }
  
  if (dataType === 'test') {
    // 测试模式：按阶段抽取词汇（小学/初中/高中整体词库）
    const stageWords = getStageWordsForTest(gradeId);
    console.log(`🧪 测试模式：从${getStageNameByGrade(gradeId)}阶段词库中抽取`);
    return shuffleArray(stageWords);
  }
  
  if (dataType === 'training') {
    // 训练模式：使用具体年级的词汇
    console.log(`💪 训练模式：使用 ${gradeId} 具体年级词汇`);
    return shuffleArray(words);
  }
  
  return shuffleArray(words);
}

/**
 * 根据年级获取阶段名称
 */
function getStageNameByGrade(gradeId) {
  const gradeNum = parseInt(gradeId.replace('grade', ''));
  if (gradeNum <= 6) return '小学';
  if (gradeNum <= 9) return '初中';
  return '高中';
}

/**
 * 获取测试用的阶段词汇（累进式词库：小学→小学+初中→小学+初中+高中）
 */
function getStageWordsForTest(gradeId) {
  const gradeNum = parseInt(gradeId.replace('grade', ''));
  let stageGrades = [];
  
  if (gradeNum <= 6) {
    // 小学测试：仅使用小学词汇（3-6年级）
    stageGrades = ['grade3', 'grade4', 'grade5', 'grade6'];
  } else if (gradeNum <= 9) {
    // 初中测试：使用小学+初中词汇（累进式）
    stageGrades = ['grade3', 'grade4', 'grade5', 'grade6', 'grade7', 'grade8', 'grade9'];
  } else {
    // 高中测试：使用所有词汇（小学+初中+高中）
    stageGrades = ['grade3', 'grade4', 'grade5', 'grade6', 'grade7', 'grade8', 'grade9', 'grade10', 'grade11', 'grade12'];
  }
  
  // 收集该阶段所有年级的词汇
  let allStageWords = [];
  
  // 优先使用预处理数据库
  if (getPreprocessedGradeVocabulary) {
    stageGrades.forEach(grade => {
      const gradeWords = getPreprocessedGradeVocabulary(grade, 200); // 每个年级取更多词汇
      if (gradeWords && gradeWords.length > 0) {
        allStageWords.push(...gradeWords);
      }
    });
  }
  
  // 如果预处理数据库没有足够词汇，使用本地数据库
  if (allStageWords.length < 50) {
    stageGrades.forEach(grade => {
      const gradeWords = getGradeVocabulary(grade, 100);
      if (gradeWords && gradeWords.length > 0) {
        allStageWords.push(...gradeWords);
      }
    });
  }
  
  console.log(`📚 ${getStageNameByGrade(gradeId)}阶段测试词库（累进式）：收集到 ${allStageWords.length} 个词汇，包含年级: ${stageGrades.join(', ')}`);
  return allStageWords;
}

/**
 * 获取用户已训练的词汇集合
 * @param {string} gradeId - 年级ID
 * @returns {Set} 已训练词汇的Set集合
 */
function getTrainedWords(gradeId) {
  try {
    if (typeof wx === 'undefined') {
      return new Set(); // Node.js环境返回空集合
    }
    
    const trainedKey = `trained_words_${gradeId}`;
    const trainedData = wx.getStorageSync(trainedKey) || [];
    return new Set(trainedData);
  } catch (error) {
    console.error('获取已训练词汇失败:', error);
    return new Set();
  }
}

/**
 * 获取指定年级的实际词汇总数
 * @param {string} gradeId - 年级ID
 * @returns {number} 实际词汇总数
 */
function getGradeWordCount(gradeId) {
  try {
    // 检查年级是否开设英语课
    if (!isGradeEnabled(gradeId)) {
      return 0;
    }
    
    // 优先使用预处理数据库获取总数
    if (getPreprocessedGradeVocabulary) {
      const preprocessedWords = getPreprocessedGradeVocabulary(gradeId, 10000); // 获取所有词汇
      if (preprocessedWords && preprocessedWords.length > 0) {
        console.log(`📊 ${gradeId} 实际词汇总数（来自预处理数据库）: ${preprocessedWords.length}`);
        return preprocessedWords.length;
      }
    }
    
    // 使用本地数据库作为备选
    const words = getGradeVocabulary(gradeId, 10000);
    console.log(`📊 ${gradeId} 实际词汇总数（来自本地数据库）: ${words.length}`);
    return words.length;
  } catch (error) {
    console.error(`获取 ${gradeId} 词汇总数失败:`, error);
    // 返回硬编码的默认值作为最后的兜底
    const gradeInfo = getGradeInfo(gradeId);
    return gradeInfo ? gradeInfo.targetWords : 100;
  }
}

/**
 * 记录用户训练过的词汇
 * @param {string} gradeId - 年级ID
 * @param {Array} words - 训练过的词汇列表
 */
function recordTrainedWords(gradeId, words) {
  try {
    if (typeof wx === 'undefined') {
      return; // Node.js环境不记录
    }
    
    const trainedKey = `trained_words_${gradeId}`;
    const existingTrained = new Set(wx.getStorageSync(trainedKey) || []);
    
    // 添加新训练的词汇
    words.forEach(word => {
      if (typeof word === 'string') {
        existingTrained.add(word);
      } else if (word.word) {
        existingTrained.add(word.word);
      }
    });
    
    wx.setStorageSync(trainedKey, Array.from(existingTrained));
    console.log(`📝 记录 ${gradeId} 训练词汇: +${words.length}，总计: ${existingTrained.size}`);
  } catch (error) {
    console.error('记录训练词汇失败:', error);
  }
}

// 已删除dictionaryDataParser.js和相关的databaseIntegration代码

/**
 * 根据正确率计算词汇量区间（分级测试用）
 * @param {number} score - 正确题数
 * @param {number} total - 总题数
 * @param {string} testStage - 测试阶段（primary/junior/senior）
 * @returns {Object} 词汇量评估结果
 */
function calculateVocabularyRange(score, total, testStage) {
  const percentage = (score / total) * 100;
  
  // 各阶段词汇量基数（根据教育部课程标准）
  const stageBaseVocab = {
    primary: { min: 600, max: 1800 },   // 小学：600-1800词
    junior: { min: 1800, max: 3500 },  // 初中：1800-3500词
    senior: { min: 3500, max: 8000 }   // 高中：3500-8000词
  };
  
  const baseRange = stageBaseVocab[testStage] || stageBaseVocab.primary;
  
  // 根据正确率计算词汇量区间
  const minVocab = Math.round(baseRange.min + (baseRange.max - baseRange.min) * (percentage / 100) * 0.8);
  const maxVocab = Math.round(baseRange.min + (baseRange.max - baseRange.min) * (percentage / 100) * 1.2);
  
  // 确保区间合理
  const finalMin = Math.max(baseRange.min, minVocab);
  const finalMax = Math.min(baseRange.max, maxVocab);
  
  // 评价等级
  let level, description, color;
  if (percentage >= 90) {
    level = '优秀';
    description = '词汇量非常优秀，远超同阶段水平！';
    color = '#4CAF50';
  } else if (percentage >= 80) {
    level = '良好';
    description = '词汇量良好，达到了同阶段的优秀水平。';
    color = '#8BC34A';
  } else if (percentage >= 70) {
    level = '中等';
    description = '词汇量中等，达到了同阶段的平均水平。';
    color = '#FFC107';
  } else if (percentage >= 60) {
    level = '及格';
    description = '词汇量刚好及格，需要加强学习。';
    color = '#FF9800';
  } else {
    level = '待提高';
    description = '词汇量需要大幅提升，建议系统学习。';
    color = '#F44336';
  }
  
  return {
    level,
    description,
    color,
    range: `${finalMin}-${finalMax}`,
    minVocab: finalMin,
    maxVocab: finalMax,
    percentage,
    stage: testStage,
    stageName: testStage === 'primary' ? '小学' : 
               testStage === 'junior' ? '初中' : '高中'
  };
}

/**
 * 根据年级获取测试阶段
 */
function getTestStageByGrade(gradeId) {
  const gradeNum = parseInt(gradeId.replace('grade', ''));
  if (gradeNum <= 6) return 'primary';
  if (gradeNum <= 9) return 'junior';
  return 'senior';
}

module.exports = {
  getGradeWords,
  getGradeWordCount,
  getGradeLevel,
  getGradeInfo,
  getGradeProgress,
  updateGradeProgress,
  recordTrainedWords,
  getTrainedWords,
  isGradeEnabled,
  gradeStructure,
  calculateVocabularyRange,
  getTestStageByGrade,
  getStageWordsForTest
};