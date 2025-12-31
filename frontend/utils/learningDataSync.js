// 学习数据同步工具 - 最小改动补丁版本
// 使用原始gradeId，不再进行映射

const isWeapp = () => typeof wx !== 'undefined' && !!wx.getStorageSync;

function key(gradeId, phase) {
  return `progress:${gradeId}:phase:${phase}`;
}

function loadProgress(gradeId, phase) {
  const k = key(gradeId, phase);
  try {
    return isWeapp() ? (wx.getStorageSync(k) || {}) : JSON.parse(localStorage.getItem(k) || '{}');
  } catch { return {}; }
}

function saveProgress(gradeId, phase, data) {
  const k = key(gradeId, phase);
  if (isWeapp()) wx.setStorageSync(k, data);
  else localStorage.setItem(k, JSON.stringify(data));
}

// 获取学习进度
function getLearningProgress(gradeId) {
  const k = `LEARNING_PROGRESS_${gradeId}`;
  try {
    return isWeapp() ? (wx.getStorageSync(k) || {}) : JSON.parse(localStorage.getItem(k) || '{}');
  } catch { return {}; }
}

// 保存学习进度
function setLearningProgress(gradeId, data) {
  const k = `LEARNING_PROGRESS_${gradeId}`;
  if (isWeapp()) wx.setStorageSync(k, data);
  else localStorage.setItem(k, JSON.stringify(data));
}

// 获取分组学习进度
function getGroupLearningProgress(gradeId) {
  const k = `GROUP_LEARNING_${gradeId}`;
  try {
    return isWeapp() ? (wx.getStorageSync(k) || {}) : JSON.parse(localStorage.getItem(k) || '{}');
  } catch { return {}; }
}

// 保存分组学习进度
function setGroupLearningProgress(gradeId, data) {
  const k = `GROUP_LEARNING_${gradeId}`;
  if (isWeapp()) wx.setStorageSync(k, data);
  else localStorage.setItem(k, JSON.stringify(data));
}

// 获取年级进度
function getGradeProgress(gradeId) {
  const k = `grade_progress_${gradeId}`;
  try {
    return isWeapp() ? (wx.getStorageSync(k) || {}) : JSON.parse(localStorage.getItem(k) || '{}');
  } catch { return {}; }
}

// 保存年级进度
function setGradeProgress(gradeId, data) {
  const k = `grade_progress_${gradeId}`;
  if (isWeapp()) wx.setStorageSync(k, data);
  else localStorage.setItem(k, JSON.stringify(data));
}

// 获取年级学习进度（兼容首页调用）
function getGradeLearningProgress(gradeId) {
  try {
    // 获取年级总词汇数
    const { getGradeWordCount } = require('./gradeWordDatabase.js');
    const totalWords = getGradeWordCount(gradeId);
    
    if (totalWords === 0) {
      console.warn(`⚠️ ${gradeId} 年级总词汇数为0，可能未开设该年级英语课`);
      return {
        gradeId,
        total: 0,
        mastered: 0,
        learning: 0,
        familiar: 0,
        expert: 0,
        new: 0,
        phases: {
          phase1: { completed: 0, total: 0 },
          phase2: { completed: 0, total: 0 },
          phase3: { completed: 0, total: 0 }
        }
      };
    }
    
    // 获取单词掌握映射数据
    const masteryMap = getWordMasteryMap();
    
    // 统计该年级的学习进度
    let mastered = 0;
    let learning = 0;
    let familiar = 0;
    let expert = 0;
    let newWords = 0; // 未学习的单词
    let phases = {
      phase1: { completed: 0, total: 0 },
      phase2: { completed: 0, total: 0 },
      phase3: { completed: 0, total: 0 }
    };
    
    // 遍历掌握映射，统计该年级已学习的单词
    Object.values(masteryMap).forEach(wordData => {
      if (wordData.gradeId === gradeId) {
        // 根据掌握等级分类
        if (wordData.masteryLevel === 'mastered') {
          mastered++;
        } else if (wordData.masteryLevel === 'expert') {
          expert++;
        } else if (wordData.masteryLevel === 'practicing') {
          learning++;
        } else if (wordData.masteryLevel === 'familiar') {
          familiar++;
        } else {
          learning++;
        }
        
        // 统计各阶段完成情况
        if (wordData.phases) {
          Object.keys(wordData.phases).forEach(phase => {
            if (phases[phase]) {
              phases[phase].total++;
              if (wordData.phases[phase].completed) {
                phases[phase].completed++;
              }
            }
          });
        }
      }
    });
    
    // 计算未学习的单词数
    const learnedWords = mastered + learning + familiar + expert;
    newWords = Math.max(0, totalWords - learnedWords);
    
    const result = {
      gradeId,
      total: totalWords, // 使用年级总词汇数
      mastered,
      learning,
      familiar,
      expert,
      new: newWords, // 未学习的单词数
      phases
    };

    return result;
    
  } catch (error) {
    console.error('获取年级学习进度失败:', error);
    return {
      gradeId,
      total: 0,
      mastered: 0,
      learning: 0,
      familiar: 0,
      expert: 0,
      phases: {
        phase1: { completed: 0, total: 0 },
        phase2: { completed: 0, total: 0 },
        phase3: { completed: 0, total: 0 }
      }
    };
  }
}

// 获取单词掌握映射
function getWordMasteryMap() {
  const k = 'WORD_MASTERY_MAP';
  try {
    return isWeapp() ? (wx.getStorageSync(k) || {}) : JSON.parse(localStorage.getItem(k) || '{}');
  } catch { return {}; }
}

// 获取每日学习统计
function getDailyLearningStats() {
  const k = 'DAILY_LEARNING_STATS';
  try {
    return isWeapp() ? (wx.getStorageSync(k) || {}) : JSON.parse(localStorage.getItem(k) || '{}');
  } catch { return {}; }
}

// 获取学习会话历史
function getLearningSessionHistory() {
  const k = 'LEARNING_SESSION_HISTORY';
  try {
    return isWeapp() ? (wx.getStorageSync(k) || []) : JSON.parse(localStorage.getItem(k) || '[]');
  } catch { return []; }
}

// 记录单词学习进度
function recordWordProgress(wordInfo, phaseType, success, extra = {}) {
  try {
    const { word, gradeId, gradeName } = wordInfo;
    const masteryMap = getWordMasteryMap();
    
    // 初始化单词掌握数据
    if (!masteryMap[word]) {
      masteryMap[word] = {
        word,
        gradeId,
        gradeName,
        masteryLevel: 'learning',
        masteryScore: 0,
        phases: {
          phase1: { completed: false, successes: 0, attempts: 0 },
          phase2: { completed: false, successes: 0, attempts: 0 },
          phase3: { completed: false, successes: 0, attempts: 0 }
        },
        lastUpdated: Date.now()
      };
    }
    
    // 更新阶段数据
    const phaseData = masteryMap[word].phases[phaseType];
    if (phaseData) {
      phaseData.attempts += 1;
      if (success) {
        phaseData.successes += 1;
        phaseData.completed = true;
      }
    }
    
    // 计算掌握分数
    const totalPhases = Object.keys(masteryMap[word].phases).length;
    const completedPhases = Object.values(masteryMap[word].phases).filter(p => p.completed).length;
    masteryMap[word].masteryScore = completedPhases / totalPhases;
    
    // 更新掌握等级
    if (masteryMap[word].masteryScore >= 1.0) {
      masteryMap[word].masteryLevel = 'mastered';
    } else if (masteryMap[word].masteryScore >= 0.5) {
      masteryMap[word].masteryLevel = 'practicing';
    } else {
      masteryMap[word].masteryLevel = 'learning';
    }
    
    masteryMap[word].lastUpdated = Date.now();
    
    // 保存到存储
    const k = 'WORD_MASTERY_MAP';
    if (isWeapp()) wx.setStorageSync(k, masteryMap);
    else localStorage.setItem(k, JSON.stringify(masteryMap));
    
    // 更新学习进度
    const learningProgress = getLearningProgress(gradeId);
    if (!learningProgress[word]) {
      learningProgress[word] = {
        word,
        gradeId,
        gradeName,
        totalAttempts: 0,
        totalSuccesses: 0,
        phases: {}
      };
    }

    learningProgress[word].totalAttempts += 1;
    if (success) {
      learningProgress[word].totalSuccesses += 1;
    }
    
    if (!learningProgress[word].phases[phaseType]) {
      learningProgress[word].phases[phaseType] = { attempts: 0, successes: 0 };
    }
    learningProgress[word].phases[phaseType].attempts += 1;
    if (success) {
      learningProgress[word].phases[phaseType].successes += 1;
    }
    
    setLearningProgress(gradeId, learningProgress);
    
    // 🔧 修复：更新每日学习统计（在掌握状态更新后调用）
    updateDailyLearningStats(word, success, masteryMap[word].masteryLevel);

    return {
      success: true,
      isNewLearning: masteryMap[word].masteryScore > 0 && masteryMap[word].masteryScore <= 0.3,
      masteryScore: masteryMap[word].masteryScore,
      masteryLevel: masteryMap[word].masteryLevel
    };
    
  } catch (error) {
    console.error('记录学习进度失败:', error);
    return { success: false, error: error.message };
  }
}

// 更新每日学习统计
function updateDailyLearningStats(word, success, masteryLevel) {
  try {
    const today = formatDate(new Date());
    const dailyStats = getDailyLearningStats();
    
    // 初始化今天的统计
    if (!dailyStats[today]) {
      dailyStats[today] = {
        words: [],
        mastered: 0,
        learned: 0,
        attempts: 0,
        successes: 0
      };
    }
    
    // 记录单词学习
    const isNewWord = !dailyStats[today].words.includes(word);
    if (isNewWord) {
      dailyStats[today].words.push(word);
      dailyStats[today].learned += 1;
    }
    
    // 记录尝试和成功
    dailyStats[today].attempts += 1;
    if (success) {
      dailyStats[today].successes += 1;
    }
    
    // 🔧 修复：如果单词达到掌握状态，更新已掌握统计
    if (masteryLevel === 'mastered' || masteryLevel === 'expert') {
      // 检查是否已经计算过这个单词的掌握状态
      const masteredKey = `${word}_mastered`;
      if (!dailyStats[today].words.includes(masteredKey)) {
        dailyStats[today].words.push(masteredKey);
        dailyStats[today].mastered += 1;
      }
    }
    
    // 保存每日统计
    const k = 'DAILY_LEARNING_STATS';
    if (isWeapp()) wx.setStorageSync(k, dailyStats);
    else localStorage.setItem(k, JSON.stringify(dailyStats));
    
  } catch (error) {
    console.error('更新每日学习统计失败:', error);
  }
}

// 格式化日期为 YYYY-MM-DD
function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// 从现有数据生成每日统计（用于恢复历史数据）
function generateDailyStatsFromMasteryMap() {
  try {
    const masteryMap = getWordMasteryMap();
    const dailyStats = {};
    
    // 遍历所有单词，根据lastUpdated生成每日统计
    // 🔧 修复：只生成有实际学习活动的日期记录（必须有 attempts 或 phases 中的 attempts）
    Object.values(masteryMap).forEach(wordData => {
      // 检查是否有实际学习活动
      const hasLearningActivity = wordData.totalAttempts > 0 || 
                                  (wordData.phases && Object.values(wordData.phases).some(phase => phase.attempts > 0));
      
      if (wordData.lastUpdated && hasLearningActivity) {
        const date = new Date(wordData.lastUpdated);
        const dateStr = formatDate(date);
        
        if (!dailyStats[dateStr]) {
          dailyStats[dateStr] = {
            words: [],
      mastered: 0,
            learned: 0,
            attempts: 0,
            successes: 0
          };
        }
        
        // 记录单词
        if (!dailyStats[dateStr].words.includes(wordData.word)) {
          dailyStats[dateStr].words.push(wordData.word);
          dailyStats[dateStr].learned += 1;
        }
        
        // 累计尝试次数和成功次数
        if (wordData.totalAttempts) {
          dailyStats[dateStr].attempts += wordData.totalAttempts;
        }
        if (wordData.totalSuccesses) {
          dailyStats[dateStr].successes += wordData.totalSuccesses;
        }
        
        // 如果已掌握，记录为掌握
        if (wordData.masteryLevel === 'mastered' || wordData.masteryLevel === 'expert') {
          if (!dailyStats[dateStr].words.includes(wordData.word + '_mastered')) {
            dailyStats[dateStr].words.push(wordData.word + '_mastered');
            dailyStats[dateStr].mastered += 1;
          }
        }
      }
    });
    
    // 合并现有统计（保留已有的更详细数据）
    // 🔧 修复：只保留有实际学习活动的日期记录
    const existingStats = getDailyLearningStats();
    Object.keys(existingStats).forEach(date => {
      const existing = existingStats[date];
      // 检查现有记录是否有实际学习活动
      const hasActualActivity = (existing.attempts && existing.attempts > 0) || 
                                (existing.learned && existing.learned > 0) ||
                                (existing.words && Array.isArray(existing.words) && 
                                 existing.words.filter(w => !w.endsWith('_mastered')).length > 0);
      
      if (hasActualActivity) {
      if (dailyStats[date]) {
        // 合并数据
          dailyStats[date].words = [...new Set([...dailyStats[date].words, ...(existing.words || [])])];
          dailyStats[date].mastered = Math.max(dailyStats[date].mastered, existing.mastered || 0);
          dailyStats[date].learned = Math.max(dailyStats[date].learned, existing.learned || 0);
          dailyStats[date].attempts = Math.max(dailyStats[date].attempts, existing.attempts || 0);
          dailyStats[date].successes = Math.max(dailyStats[date].successes, existing.successes || 0);
      } else {
          // 保留有实际学习活动的现有记录
          dailyStats[date] = existing;
        }
      }
      // 如果没有实际学习活动，不保留该日期记录
    });
    
    // 保存生成的统计
    const k = 'DAILY_LEARNING_STATS';
    if (isWeapp()) wx.setStorageSync(k, dailyStats);
    else localStorage.setItem(k, JSON.stringify(dailyStats));
    
    return dailyStats;
    
  } catch (error) {
    console.error('生成每日统计失败:', error);
      return {};
    }
  }

// 清理无效的每日统计数据（移除没有实际学习活动的日期记录）
function cleanDailyLearningStats() {
  try {
    const dailyStats = getDailyLearningStats();
    const cleanedStats = {};
    
    Object.keys(dailyStats).forEach(date => {
      const stats = dailyStats[date];
      // 只保留有实际学习活动的日期记录
      const hasActualActivity = (stats.attempts && stats.attempts > 0) || 
                                (stats.learned && stats.learned > 0) ||
                                (stats.words && Array.isArray(stats.words) && 
                                 stats.words.filter(w => !w.endsWith('_mastered')).length > 0);
      
      if (hasActualActivity) {
        cleanedStats[date] = stats;
      }
    });
    
    // 保存清理后的统计
    const k = 'DAILY_LEARNING_STATS';
    if (isWeapp()) wx.setStorageSync(k, cleanedStats);
    else localStorage.setItem(k, JSON.stringify(cleanedStats));
    
    console.log(`清理完成：移除了 ${Object.keys(dailyStats).length - Object.keys(cleanedStats).length} 个无效日期记录`);
    return cleanedStats;
    
  } catch (error) {
    console.error('清理每日统计失败:', error);
      return {};
    }
  }

// 获取年级单词按状态分组
function getGradeWordsByStatus(gradeId) {
  try {
    const masteryMap = getWordMasteryMap();
    const mastered = [];
    const learning = [];
    const familiar = [];
    const withErrors = [];
    const expert = [];
    
    // 遍历掌握映射，按状态分类
    Object.values(masteryMap).forEach(wordData => {
      if (wordData.gradeId === gradeId) {
        const wordInfo = {
          word: wordData.word,
          meaning: wordData.meaning || '暂无释义',
          masteryLevel: wordData.masteryLevel,
          masteryScore: wordData.masteryScore || 0,
          lastUpdated: wordData.lastUpdated
        };
        
        switch (wordData.masteryLevel) {
          case 'mastered':
            mastered.push(wordInfo);
            break;
          case 'expert':
            expert.push(wordInfo);
            break;
          case 'practicing':
            learning.push(wordInfo);
            break;
          case 'familiar':
            familiar.push(wordInfo);
            break;
          default:
            learning.push(wordInfo);
        }
        
        // 检查是否有错误记录（这里可以根据实际需求调整错误判断逻辑）
        if (wordData.errors && wordData.errors.length > 0) {
          withErrors.push(wordInfo);
        }
      }
    });

    return {
      mastered,
      learning,
      familiar,
      withErrors,
      expert
    };
    
  } catch (error) {
    console.error('获取年级单词状态失败:', error);
    return {
      mastered: [],
      learning: [],
      familiar: [],
      withErrors: [],
      expert: []
    };
  }
}

// 兼容性导出 - 支持多种导入方式
module.exports = {
  loadProgress,
  saveProgress,
  getLearningProgress,
  setLearningProgress,
  getGroupLearningProgress,
  setGroupLearningProgress,
  getGradeProgress,
  setGradeProgress,
  getGradeLearningProgress,
  getWordMasteryMap,
  getDailyLearningStats,
  getLearningSessionHistory,
  recordWordProgress,
  getGradeWordsByStatus,
  generateDailyStatsFromMasteryMap,
  cleanDailyLearningStats
};