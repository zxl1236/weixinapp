// 分级词汇数据库管理工具
// 支持K12三个阶段的词汇数据管理

/**
 * 年级词汇数据结构
 * 等待集成开源数据库后完善
 */

// 完整的年级词汇数据结构
const gradeStructure = {
  // 小学阶段（英语从3年级开始，分为上下学期）
  primary: {
    grade1: { level: 1, targetWords: 0, description: '一年级（未开设英语课）', enabled: false },
    grade2: { level: 2, targetWords: 0, description: '二年级（未开设英语课）', enabled: false },
    grade3_1: { level: 3, targetWords: 180, description: '三年级上册基础词汇', enabled: true },
    grade3_2: { level: 3, targetWords: 180, description: '三年级下册基础词汇', enabled: true },
    grade4_1: { level: 4, targetWords: 200, description: '四年级上册扩展词汇', enabled: true },
    grade4_2: { level: 4, targetWords: 200, description: '四年级下册扩展词汇', enabled: true },
    grade5_1: { level: 5, targetWords: 250, description: '五年级上册提升词汇', enabled: true },
    grade5_2: { level: 5, targetWords: 250, description: '五年级下册提升词汇', enabled: true },
    grade6_1: { level: 6, targetWords: 300, description: '六年级上册综合词汇', enabled: true },
    grade6_2: { level: 6, targetWords: 300, description: '六年级下册综合词汇', enabled: true }
  },
  
  // 初中阶段（分为上下学期）
  junior: {
    grade7_1: { level: 7, targetWords: 500, description: '初一上册核心词汇', enabled: true },
    grade7_2: { level: 7, targetWords: 500, description: '初一下册核心词汇', enabled: true },
    grade8_1: { level: 8, targetWords: 600, description: '初二上册重点词汇', enabled: true },
    grade8_2: { level: 8, targetWords: 600, description: '初二下册重点词汇', enabled: true },
    grade9_1: { level: 9, targetWords: 750, description: '初三上册必备词汇', enabled: true },
    grade9_2: { level: 9, targetWords: 750, description: '初三下册必备词汇', enabled: true }
  }
  
  // 高中阶段暂时隐藏
};

// 增强版词汇数据库已删除，使用预处理的词汇数据库作为唯一数据源

// 尝试引入CDN词汇加载器（第一优先级）
let cdnWordLoader = null;
try {
  const cdnLoader = require('./cdnWordLoader.js');
  cdnWordLoader = cdnLoader; // 修复：使用整个导出对象
} catch (error) {
}

// 已删除importedWordDatabase.js 和 preprocessedWordDatabase.js，简化数据优先级
// 现在只使用 cdnWordLoader（本地文件 + CDN）作为数据源

// 动态词汇管理器已移除，使用传统数据源

/** 解包：支持 数组 / {words|list|data: []} */
function unwrapPack(pack) {
  if (Array.isArray(pack)) return pack;
  if (pack?.words && Array.isArray(pack.words)) return pack.words;
  if (pack?.list  && Array.isArray(pack.list))  return pack.list;
  if (pack?.data  && Array.isArray(pack.data))  return pack.data;
  return null;
}

/**
 * 获取指定年级的词汇数据 - 最小改动补丁版本
 * @param {string} gradeId - 年级ID (如: grade3_1, grade4_2)
 * @param {number} count - 需要的词汇数量
 * @param {string} dataType - 数据类型: 'test'(测试), 'training'(训练), 'all'(全部)
 * @returns {Array} 词汇列表
 */
async function getGradeWords(gradeId, count = 20, dataType = 'all') {
  try {
    console.log(`[getGradeWords] 开始加载年级: ${gradeId}, 类型: ${dataType}`);

    // 检查年级是否开设英语课
    if (!isGradeEnabled(gradeId)) {
      console.warn(`⚠️ ${gradeId} 未开设英语课，返回空词汇列表`);
      return [];
    }

    // 1) **本地文件优先（包括JS模块和JSON），然后CDN（严格同名ID）**
    // 注意：cdnWordLoader.getGradeWords 内部已经优先使用本地文件
    if (cdnWordLoader && cdnWordLoader.getGradeWords) {
      try {
        console.log(`[getGradeWords] 尝试通过cdnWordLoader加载 ${gradeId}`);
        const cdnWords = await cdnWordLoader.getGradeWords(gradeId);
        console.log(`[getGradeWords] cdnWordLoader返回数据类型:`, typeof cdnWords, Array.isArray(cdnWords) ? 'array' : 'object');

        const cdnArr = unwrapPack(cdnWords);
        console.log(`[getGradeWords] 解包后数据长度:`, cdnArr ? cdnArr.length : 0);

        if (cdnArr && cdnArr.length) {
          console.log(`[getGradeWords] 成功加载 ${cdnArr.length} 个单词`);
          return cdnArr;
        }
        console.warn('⚠️ [数据加载器返回需解包失败]', { gradeId });
      } catch (e) {
        console.warn(`🌧️ [数据加载器异常] ${gradeId}:`, e.message || e);
      }
    }

    // 2) 本地包（可选兜底）
    try {
      // 修复：LOCAL_FILES的键是 grade3_1 格式，需要确保 gradeId 有 grade 前缀
      const gradePrefix = gradeId.startsWith('grade') ? gradeId : `grade${gradeId}`;
      const { LOCAL_FILES } = require('../cdn-data/localMap');
      const loader = LOCAL_FILES?.[gradePrefix];
      if (loader) {
        const pack = loader();
        const local = unwrapPack(pack);
        if (local && local.length) {
          return local;
        }
      }
    } catch (e) {
      console.warn('本地包载入失败(可忽略)：', e);
    }

    // 3) 全部失败
    console.error(`❌ 所有数据源不可用: ${gradeId}`);
    throw new Error(`All sources unavailable for ${gradeId}`);
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
 * @returns {Promise<Array>} 筛选后的词汇列表
 */
async function filterWordsByDataType(words, dataType, gradeId) {
  if (dataType === 'all') {
    return shuffleArray(words);
  }
  
  if (dataType === 'test') {
    // 测试模式：按阶段抽取词汇（小学/初中/高中整体词库）
    const stageWords = await getStageWordsForTest(gradeId);
    return shuffleArray(stageWords);
  }
  
  if (dataType === 'training') {
    // 训练模式：使用具体年级的词汇
    return shuffleArray(words);
  }
  
  return shuffleArray(words);
}

/**
 * 根据年级获取阶段名称
 */
function getStageNameByGrade(gradeId) {
  // 解析年级ID，支持新的上下学期格式
  const gradeMatch = gradeId.match(/grade(\d+)_?(\d+)?/);
  if (!gradeMatch) {
    return '未知';
  }
  
  const gradeNum = parseInt(gradeMatch[1]);
  if (gradeNum <= 6) return '小学';
  if (gradeNum <= 9) return '初中';
  
  return '未知'; // 高中阶段暂时隐藏
}

/**
 * 获取测试用的阶段词汇（累进式词库：小学→小学+初中→小学+初中+高中）
 */
async function getStageWordsForTest(gradeId) {
  // 解析年级ID，支持新的上下学期格式
  const gradeMatch = gradeId.match(/grade(\d+)_?(\d+)?/);
  if (!gradeMatch) {
    console.warn('无法解析年级ID:', gradeId);
    return [];
  }
  
  const gradeNum = parseInt(gradeMatch[1]);
  const semester = gradeMatch[2]; // 1或2，表示上下学期
  let stageGrades = [];
  
  if (gradeNum <= 6) {
    // 小学测试：仅使用小学词汇（3-6年级，上下学期）
    stageGrades = ['grade3_1', 'grade3_2', 'grade4_1', 'grade4_2', 'grade5_1', 'grade5_2', 'grade6_1', 'grade6_2'];
  } else if (gradeNum <= 9) {
    // 初中测试：使用小学+初中词汇（累进式，上下学期）
    stageGrades = ['grade3_1', 'grade3_2', 'grade4_1', 'grade4_2', 'grade5_1', 'grade5_2', 'grade6_1', 'grade6_2', 
                   'grade7_1', 'grade7_2', 'grade8_1', 'grade8_2', 'grade9_1', 'grade9_2'];
  }
  // 高中阶段暂时隐藏
  
  // 收集该阶段所有年级的词汇
  let allStageWords = [];
  
  // 使用 cdnWordLoader 加载各年级词汇
  if (cdnWordLoader && cdnWordLoader.getGradeWords) {
    for (const grade of stageGrades) {
      try {
        const gradeWords = await cdnWordLoader.getGradeWords(grade);
        const wordsArray = unwrapPack(gradeWords);
        if (wordsArray && Array.isArray(wordsArray) && wordsArray.length > 0) {
          allStageWords.push(...wordsArray);
        }
      } catch (error) {
        console.warn(`⚠️ 加载 ${grade} 词汇失败:`, error.message);
      }
    }
  }
  
  // 如果词汇不足，记录警告
  if (allStageWords.length < 50) {
    console.warn(`⚠️ 阶段词汇不足，仅收集到 ${allStageWords.length} 个词汇`);
  }
  
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
    
    // 第一优先级：使用CDN数据获取总数
    if (cdnWordLoader && cdnWordLoader.getGradeWordCountSync) {
      try {
        const cdnWordCount = cdnWordLoader.getGradeWordCountSync(gradeId);
        if (cdnWordCount > 0) {
          return cdnWordCount;
        }
      } catch (error) {
      }
    }
    
    // 本地数据库已删除，返回默认值
    const gradeInfo = getGradeInfo(gradeId);
    return gradeInfo ? gradeInfo.targetWords : 100;
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
  // 防止除零错误
  if (!total || total === 0) {
    return {
      level: '待提高',
      range: '0-0',
      description: '词汇量需要大幅提升，建议系统学习。',
      color: '#F44336',
      minVocab: 0,
      maxVocab: 0
    };
  }
  
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