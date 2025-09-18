/**
 * 进度同步工具
 * 用于管理全局学习进度和错题同步
 */

// 获取全局学习进度
function getGlobalProgress() {
  try {
    return wx.getStorageSync('globalLearningProgress') || {};
  } catch (error) {
    console.error('获取全局进度失败:', error);
    return {};
  }
}

// 获取错题本数据
function getMistakeBook() {
  try {
    return wx.getStorageSync('mistakeBook') || {};
  } catch (error) {
    console.error('获取错题本失败:', error);
    return {};
  }
}

// 获取指定年级的学习进度
function getGradeProgress(gradeId) {
  try {
    const globalProgress = getGlobalProgress();
    const gradeProgress = {};
    
    Object.keys(globalProgress).forEach(word => {
      const progress = globalProgress[word];
      if (progress.grade === gradeId) {
        // 添加 mastered 属性用于进度页面判断
        gradeProgress[word] = {
          ...progress,
          mastered: progress.masteryLevel === 'mastered'
        };
      }
    });
    
    console.log(`📊 ${gradeId} 进度数据:`, Object.keys(gradeProgress).length, '个单词');
    return gradeProgress;
  } catch (error) {
    console.error('获取年级进度失败:', error);
    return {};
  }
}

// 获取详细学习进度统计
function getDetailedStats(gradeId) {
  try {
    const { getTrainedWords, getGradeWordCount } = require('./gradeWordDatabase.js');
    const trainedWords = getTrainedWords(gradeId);
    const actualWordCount = getGradeWordCount(gradeId); // 使用实际词汇数量
    const mistakeBook = getMistakeBook();
    
    // 分类统计
    const stats = {
      total: actualWordCount,  // 使用实际的词汇总数
      mastered: 0,             // 已掌握（训练过的）
      withErrors: 0,           // 有错误记录的
      unlearned: 0             // 未学习的
    };
    
    const masteredSet = new Set();
    const errorSet = new Set();
    
    // 统计已掌握的单词
    trainedWords.forEach(word => {
      masteredSet.add(word);
      stats.mastered++;
    });
    
    // 统计有错误记录的单词
    Object.keys(mistakeBook).forEach(word => {
      const mistake = mistakeBook[word];
      if (mistake.grade === gradeId) {
        errorSet.add(word);
        if (!masteredSet.has(word)) {
          stats.withErrors++;
        }
      }
    });
    
    // 计算未学习的单词
    stats.unlearned = Math.max(0, stats.total - stats.mastered - stats.withErrors);
    
    console.log(`📊 ${gradeId} 详细统计 - 总计:${stats.total}, 已掌握:${stats.mastered}, 有错误:${stats.withErrors}, 未学习:${stats.unlearned}`);
    return stats;
  } catch (error) {
    console.error('获取详细统计失败:', error);
    return { total: 0, mastered: 0, withErrors: 0, unlearned: 0 };
  }
}

// 获取掌握水平统计（保持向后兼容）
function getMasteryStats(gradeId = null) {
  try {
    if (gradeId) {
      const detailedStats = getDetailedStats(gradeId);
      return {
        total: detailedStats.total,
        mastered: detailedStats.mastered,
        good: 0,
        fair: detailedStats.withErrors,
        poor: detailedStats.unlearned
      };
    }
    
    // 如果没有指定年级，使用全局进度数据
    const globalProgress = getGlobalProgress();
    const stats = {
      total: 0,
      mastered: 0,
      good: 0,
      fair: 0,
      poor: 0
    };
    
    Object.keys(globalProgress).forEach(word => {
      const progress = globalProgress[word];
      if (!gradeId || progress.grade === gradeId) {
        stats.total++;
        stats[progress.masteryLevel]++;
      }
    });
    
    return stats;
  } catch (error) {
    console.error('获取掌握统计失败:', error);
    return { total: 0, mastered: 0, good: 0, fair: 0, poor: 0 };
  }
}

// 获取需要复习的单词
function getWordsForReview(gradeId = null, limit = 20) {
  try {
    const globalProgress = getGlobalProgress();
    const reviewWords = [];
    
    Object.keys(globalProgress).forEach(word => {
      const progress = globalProgress[word];
      if (!gradeId || progress.grade === gradeId) {
        // 根据掌握水平和最后学习时间计算复习优先级
        const priority = calculateReviewPriority(progress);
        reviewWords.push({
          word: word,
          progress: progress,
          priority: priority
        });
      }
    });
    
    // 按优先级排序，返回指定数量的单词
    reviewWords.sort((a, b) => b.priority - a.priority);
    return reviewWords.slice(0, limit);
  } catch (error) {
    console.error('获取复习单词失败:', error);
    return [];
  }
}

// 计算复习优先级
function calculateReviewPriority(progress) {
  const now = Date.now();
  const daysSinceLastSeen = (now - progress.lastSeen) / (24 * 60 * 60 * 1000);
  
  let priority = 0;
  
  // 掌握水平权重
  switch (progress.masteryLevel) {
    case 'poor': priority += 100; break;
    case 'fair': priority += 50; break;
    case 'good': priority += 20; break;
    case 'mastered': priority += 5; break;
  }
  
  // 时间权重（越久没学优先级越高）
  priority += Math.min(daysSinceLastSeen * 10, 50);
  
  // 错误次数权重
  if (progress.totalAttempts > 0) {
    const errorRate = 1 - (progress.correctAttempts / progress.totalAttempts);
    priority += errorRate * 30;
  }
  
  return priority;
}

// 同步错题本到复习系统
function syncMistakesToReview() {
  try {
    const mistakeBook = getMistakeBook();
    const globalProgress = getGlobalProgress();
    
    Object.keys(mistakeBook).forEach(word => {
      const mistake = mistakeBook[word];
      
      if (!globalProgress[word]) {
        // 如果全局进度中没有这个单词，添加基础记录
        globalProgress[word] = {
          word: word,
          grade: mistake.grade || 'unknown',
          gradeName: mistake.gradeName || '未知年级',
          firstSeen: mistake.firstErrorTime,
          lastSeen: mistake.lastErrorTime,
          totalAttempts: mistake.errorCount,
          correctAttempts: 0,
          questionTypes: ['mistake_review'],
          scores: Array(mistake.errorCount).fill(0), // 所有错误都记为0分
          masteryLevel: 'poor'
        };
      } else {
        // 更新现有记录
        const progress = globalProgress[word];
        progress.lastSeen = Math.max(progress.lastSeen, mistake.lastErrorTime);
        progress.totalAttempts += mistake.errorCount;
        
        // 添加错误记录
        for (let i = 0; i < mistake.errorCount; i++) {
          progress.scores.push(0);
        }
        
        // 重新计算掌握水平
        const recentScores = progress.scores.slice(-5);
        const avgScore = recentScores.reduce((sum, s) => sum + s, 0) / recentScores.length;
        if (avgScore >= 2.5) progress.masteryLevel = 'mastered';
        else if (avgScore >= 1.5) progress.masteryLevel = 'good';
        else if (avgScore >= 0.5) progress.masteryLevel = 'fair';
        else progress.masteryLevel = 'poor';
      }
    });
    
    wx.setStorageSync('globalLearningProgress', globalProgress);
    console.log('错题本同步完成');
    
    return true;
  } catch (error) {
    console.error('错题本同步失败:', error);
    return false;
  }
}

// 导出学习报告
function exportLearningReport(gradeId = null) {
  try {
    const stats = getMasteryStats(gradeId);
    const reviewWords = getWordsForReview(gradeId, 10);
    
    const report = {
      timestamp: Date.now(),
      gradeId: gradeId,
      stats: stats,
      masteryRate: stats.total > 0 ? Math.round((stats.mastered / stats.total) * 100) : 0,
      recommendedReview: reviewWords.map(w => w.word),
      summary: `总词汇: ${stats.total}, 已掌握: ${stats.mastered}, 掌握率: ${stats.total > 0 ? Math.round((stats.mastered / stats.total) * 100) : 0}%`
    };
    
    return report;
  } catch (error) {
    console.error('导出学习报告失败:', error);
    return null;
  }
}

// 清理过期数据
function cleanupOldData(daysToKeep = 90) {
  try {
    const globalProgress = getGlobalProgress();
    const now = Date.now();
    const cutoffTime = now - (daysToKeep * 24 * 60 * 60 * 1000);
    
    let cleanedCount = 0;
    Object.keys(globalProgress).forEach(word => {
      const progress = globalProgress[word];
      if (progress.lastSeen < cutoffTime && progress.masteryLevel === 'mastered') {
        delete globalProgress[word];
        cleanedCount++;
      }
    });
    
    wx.setStorageSync('globalLearningProgress', globalProgress);
    console.log(`清理了 ${cleanedCount} 个已掌握的过期词汇记录`);
    
    return cleanedCount;
  } catch (error) {
    console.error('清理过期数据失败:', error);
    return 0;
  }
}

module.exports = {
  getGlobalProgress,
  getMistakeBook,
  getGradeProgress,
  getMasteryStats,
  getDetailedStats,
  getWordsForReview,
  syncMistakesToReview,
  exportLearningReport,
  cleanupOldData
};
