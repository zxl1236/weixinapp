/**
 * 学习数据追踪器
 * 统一管理和记录用户的学习行为
 */

/**
 * 学习追踪器类
 */
class StudyTracker {
  constructor() {
    this.storageKeys = {
      testHistory: 'testHistory',
      trainHistory: 'trainHistory', 
      mistakeHistory: 'mistakeHistory',
      dailyStats: 'dailyStudyStats'
    };
  }

  /**
   * 记录测试完成
   * @param {Object} testData - 测试数据
   */
  recordTestCompletion(testData) {
    try {
      const record = {
        id: this.generateId(),
        type: 'test',
        grade: testData.grade || '未知',
        score: testData.score || 0,
        totalQuestions: testData.totalQuestions || 0,
        correctAnswers: testData.correctAnswers || 0,
        wrongAnswers: testData.wrongAnswers || 0,
        words: testData.words || [],
        startTime: testData.startTime,
        endTime: testData.endTime || new Date().toISOString(),
        duration: testData.duration || 0,
        timestamp: new Date().toISOString()
      };

      // 保存到测试历史
      this.addToHistory('testHistory', record);
      
      // 更新每日统计
      this.updateDailyStats('test', record);
      
      // 更新学习记录
      if (record.words && record.words.length > 0) {
        record.words.forEach(wordData => {
          this.recordWordStudy(wordData.word, 'test', {
            correct: wordData.correct,
            grade: record.grade
          });
        });
      }

      console.log('测试记录已保存:', record.id);
      return record.id;
    } catch (error) {
      console.error('记录测试失败:', error);
      return null;
    }
  }

  /**
   * 记录训练完成
   * @param {Object} trainData - 训练数据
   */
  recordTrainCompletion(trainData) {
    try {
      const record = {
        id: this.generateId(),
        type: 'train',
        grade: trainData.grade || '未知',
        word: trainData.word,
        correct: trainData.correct || false,
        attempts: trainData.attempts || 1,
        timeSpent: trainData.timeSpent || 0,
        timestamp: new Date().toISOString()
      };

      // 保存到训练历史
      this.addToHistory('trainHistory', record);
      
      // 更新每日统计
      this.updateDailyStats('train', record);
      
      // 记录单词学习
      if (record.word) {
        this.recordWordStudy(record.word, 'train', {
          correct: record.correct,
          grade: record.grade,
          attempts: record.attempts
        });
      }

      console.log('训练记录已保存:', record.id);
      return record.id;
    } catch (error) {
      console.error('记录训练失败:', error);
      return null;
    }
  }

  /**
   * 记录错题添加
   * @param {Object} mistakeData - 错题数据
   */
  recordMistakeAdd(mistakeData) {
    try {
      const record = {
        id: this.generateId(),
        type: 'mistake',
        word: mistakeData.word,
        meaning: mistakeData.meaning,
        grade: mistakeData.grade,
        source: mistakeData.source || 'test', // test, train, manual
        addTime: new Date().toISOString(),
        reviewCount: 0,
        masteryLevel: 0
      };

      // 保存到错题历史
      this.addToHistory('mistakeHistory', record);
      
      // 更新每日统计
      this.updateDailyStats('mistake', record);

      console.log('错题记录已保存:', record.id);
      return record.id;
    } catch (error) {
      console.error('记录错题失败:', error);
      return null;
    }
  }

  /**
   * 记录错题复习
   * @param {string} mistakeId - 错题ID
   * @param {boolean} correct - 是否答对
   */
  recordMistakeReview(mistakeId, correct) {
    try {
      const mistakes = this.getHistory('mistakeHistory');
      const mistakeIndex = mistakes.findIndex(item => item.id === mistakeId);
      
      if (mistakeIndex !== -1) {
        mistakes[mistakeIndex].reviewCount = (mistakes[mistakeIndex].reviewCount || 0) + 1;
        mistakes[mistakeIndex].lastReviewTime = new Date().toISOString();
        
        if (correct) {
          mistakes[mistakeIndex].masteryLevel = Math.min(
            (mistakes[mistakeIndex].masteryLevel || 0) + 1, 
            5
          );
        } else {
          mistakes[mistakeIndex].masteryLevel = Math.max(
            (mistakes[mistakeIndex].masteryLevel || 0) - 1, 
            0
          );
        }

        this.saveHistory('mistakeHistory', mistakes);
        
        // 更新每日统计
        this.updateDailyStats('review', {
          correct: correct,
          word: mistakes[mistakeIndex].word
        });

        console.log('错题复习记录已更新:', mistakeId);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('记录错题复习失败:', error);
      return false;
    }
  }

  /**
   * 记录单词学习
   * @param {string} word - 单词
   * @param {string} type - 学习类型
   * @param {Object} data - 额外数据
   */
  recordWordStudy(word, type, data = {}) {
    try {
      const wordStats = this.getWordStats(word);
      
      wordStats.totalStudies = (wordStats.totalStudies || 0) + 1;
      wordStats.lastStudyTime = new Date().toISOString();
      wordStats.studyTypes = wordStats.studyTypes || {};
      wordStats.studyTypes[type] = (wordStats.studyTypes[type] || 0) + 1;
      
      if (data.correct !== undefined) {
        if (data.correct) {
          wordStats.correctCount = (wordStats.correctCount || 0) + 1;
        } else {
          wordStats.wrongCount = (wordStats.wrongCount || 0) + 1;
        }
        
        // 计算准确率
        const total = wordStats.correctCount + wordStats.wrongCount;
        wordStats.accuracy = total > 0 ? wordStats.correctCount / total : 0;
      }
      
      if (data.grade) {
        wordStats.grades = wordStats.grades || [];
        if (!wordStats.grades.includes(data.grade)) {
          wordStats.grades.push(data.grade);
        }
      }

      this.saveWordStats(word, wordStats);
    } catch (error) {
      console.error('记录单词学习失败:', error);
    }
  }

  /**
   * 更新每日统计
   * @param {string} type - 活动类型
   * @param {Object} data - 活动数据
   */
  updateDailyStats(type, data) {
    try {
      const today = this.formatDate(new Date());
      const dailyStats = this.getDailyStats(today);
      
      switch (type) {
        case 'test':
          dailyStats.tests = (dailyStats.tests || 0) + 1;
          dailyStats.testScore = data.score || 0;
          dailyStats.questionsAnswered = (dailyStats.questionsAnswered || 0) + (data.totalQuestions || 0);
          break;
          
        case 'train':
          dailyStats.trains = (dailyStats.trains || 0) + 1;
          dailyStats.trainTime = (dailyStats.trainTime || 0) + (data.timeSpent || 0);
          break;
          
        case 'mistake':
          dailyStats.mistakesAdded = (dailyStats.mistakesAdded || 0) + 1;
          break;
          
        case 'review':
          dailyStats.reviews = (dailyStats.reviews || 0) + 1;
          if (data.correct) {
            dailyStats.correctReviews = (dailyStats.correctReviews || 0) + 1;
          }
          break;
      }
      
      // 更新学习单词集合
      if (data.word) {
        dailyStats.studiedWords = dailyStats.studiedWords || new Set();
        dailyStats.studiedWords.add(data.word);
      }
      
      if (data.words && Array.isArray(data.words)) {
        dailyStats.studiedWords = dailyStats.studiedWords || new Set();
        data.words.forEach(wordData => {
          if (wordData.word) {
            dailyStats.studiedWords.add(wordData.word);
          }
        });
      }
      
      // 转换Set为数组进行存储
      if (dailyStats.studiedWords instanceof Set) {
        const wordsArray = Array.from(dailyStats.studiedWords);
        dailyStats.studiedWords = wordsArray;
        dailyStats.uniqueWordsCount = wordsArray.length;
      }
      
      dailyStats.lastUpdateTime = new Date().toISOString();
      
      this.saveDailyStats(today, dailyStats);
    } catch (error) {
      console.error('更新每日统计失败:', error);
    }
  }

  /**
   * 获取历史记录
   */
  getHistory(key) {
    try {
      return wx.getStorageSync(key) || [];
    } catch (error) {
      console.error('获取历史记录失败:', error);
      return [];
    }
  }

  /**
   * 保存历史记录
   */
  saveHistory(key, data) {
    try {
      wx.setStorageSync(key, data);
    } catch (error) {
      console.error('保存历史记录失败:', error);
    }
  }

  /**
   * 添加到历史记录
   */
  addToHistory(key, record) {
    const history = this.getHistory(key);
    history.push(record);
    
    // 限制历史记录数量，保留最新的1000条
    if (history.length > 1000) {
      history.splice(0, history.length - 1000);
    }
    
    this.saveHistory(key, history);
  }

  /**
   * 获取单词统计
   */
  getWordStats(word) {
    try {
      const allWordStats = wx.getStorageSync('wordStatistics') || {};
      return allWordStats[word] || {};
    } catch (error) {
      console.error('获取单词统计失败:', error);
      return {};
    }
  }

  /**
   * 保存单词统计
   */
  saveWordStats(word, stats) {
    try {
      const allWordStats = wx.getStorageSync('wordStatistics') || {};
      allWordStats[word] = stats;
      wx.setStorageSync('wordStatistics', allWordStats);
    } catch (error) {
      console.error('保存单词统计失败:', error);
    }
  }

  /**
   * 获取每日统计
   */
  getDailyStats(date) {
    try {
      const allDailyStats = wx.getStorageSync('dailyStudyStats') || {};
      return allDailyStats[date] || {};
    } catch (error) {
      console.error('获取每日统计失败:', error);
      return {};
    }
  }

  /**
   * 保存每日统计
   */
  saveDailyStats(date, stats) {
    try {
      const allDailyStats = wx.getStorageSync('dailyStudyStats') || {};
      allDailyStats[date] = stats;
      wx.setStorageSync('dailyStudyStats', allDailyStats);
    } catch (error) {
      console.error('保存每日统计失败:', error);
    }
  }

  /**
   * 获取学习统计概览
   */
  getStudyOverview() {
    try {
      const testHistory = this.getHistory('testHistory');
      const trainHistory = this.getHistory('trainHistory');
      const mistakeHistory = this.getHistory('mistakeHistory');
      
      const allWords = new Set();
      
      // 统计测试数据
      testHistory.forEach(test => {
        if (test.words) {
          test.words.forEach(word => allWords.add(word.word));
        }
      });
      
      // 统计训练数据
      trainHistory.forEach(train => {
        if (train.word) {
          allWords.add(train.word);
        }
      });
      
      return {
        totalWords: allWords.size,
        totalTests: testHistory.length,
        totalTrains: trainHistory.length,
        totalMistakes: mistakeHistory.length,
        continuousDays: this.calculateContinuousDays()
      };
    } catch (error) {
      console.error('获取学习概览失败:', error);
      return {
        totalWords: 0,
        totalTests: 0,
        totalTrains: 0,
        totalMistakes: 0,
        continuousDays: 0
      };
    }
  }

  /**
   * 计算连续学习天数
   */
  calculateContinuousDays() {
    try {
      const allDailyStats = wx.getStorageSync('dailyStudyStats') || {};
      const dates = Object.keys(allDailyStats).sort().reverse();
      
      if (dates.length === 0) return 0;
      
      const today = this.formatDate(new Date());
      let continuousDays = 0;
      let currentDate = new Date();
      
      for (let i = 0; i < 365; i++) {
        const dateStr = this.formatDate(currentDate);
        
        if (allDailyStats[dateStr]) {
          continuousDays++;
        } else if (dateStr === today) {
          // 今天没有学习记录，继续检查昨天
        } else {
          break;
        }
        
        currentDate.setDate(currentDate.getDate() - 1);
      }
      
      return continuousDays;
    } catch (error) {
      console.error('计算连续天数失败:', error);
      return 0;
    }
  }

  /**
   * 格式化日期
   */
  formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * 生成唯一ID
   */
  generateId() {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// 导出单例实例
const studyTracker = new StudyTracker();

module.exports = {
  studyTracker
};
