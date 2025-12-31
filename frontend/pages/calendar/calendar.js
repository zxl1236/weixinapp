// 学习日历页面
const { userManager } = require('../../utils/userManager');
const learningDataSync = require('../../utils/learningDataSync.js');

Page({
  data: {
    // 当前显示的年月
    currentYear: 2025,
    currentMonth: 8,
    
    // 日历数据
    calendarDays: [],
    
    // 学习统计数据
    studyStats: {
      totalWords: 0,      // 总学习词汇数
      totalMistakes: 0,   // 总掌握词汇数  
      continuousDays: 0   // 连续学习天数
    },
    
    // 选中的日期
    selectedDate: '',
    selectedDateText: '',
    
    // 学习记录数据
    studyRecords: {},
    
    // 复习统计数据
    reviewStats: {
      needsReviewCount: 0,    // 需要复习的单词数量
      mistakeCount: 0         // 错题数量
    }
  },

  onLoad() {
    // 🔧 修复：清理无效的每日统计数据
    try {
      learningDataSync.cleanDailyLearningStats();
    } catch (error) {
      console.error('清理每日统计失败:', error);
    }
    
    this.initCalendar();
    this.loadStudyData();
    this.loadReviewData();
  },

  onShow() {
    // 更新tabbar选中状态
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({
        selected: 1 // 日历是第2个tab
      });
    }
    
    // 强制刷新数据同步
    this.syncCalendarData();
  },

  /**
   * 同步日历数据 - 确保数据一致性
   */
  syncCalendarData() {

    this.loadStudyData();
    
    // 重新加载复习数据
    this.loadReviewData();
    
    // 重新生成日历
    this.generateCalendar();
    
    // 强制刷新数据同步
    this.forceDataSync();
  },

  /**
   * 强制数据同步
   */
  forceDataSync() {
    try {
      // 强制同步学习数据
      const dailyStats = learningDataSync.getDailyLearningStats();
      const masteryMap = learningDataSync.getWordMasteryMap();
      
      // 触发数据更新
      this.setData({
        studyRecords: this.data.studyRecords,
        studyStats: this.data.studyStats,
        reviewStats: this.data.reviewStats
      });
      
    } catch (error) {
      console.error('强制数据同步失败:', error);
    }
  },

  /**
   * 初始化日历
   */
  initCalendar() {
    const today = new Date();
    this.setData({
      currentYear: today.getFullYear(),
      currentMonth: today.getMonth() + 1
    });
    this.generateCalendar();
  },

  /**
   * 加载学习数据
   */
  loadStudyData() {
    try {
      // 获取学习记录
      const studyRecords = this.getStudyRecords();
      
      // 计算统计数据
      const stats = this.calculateStudyStats(studyRecords);
      
      this.setData({
        studyRecords: studyRecords,
        studyStats: stats
      }, () => {
        // 🔧 修复：数据加载完成后重新生成日历，确保日期标记正确显示
        this.generateCalendar();
      });
    } catch (error) {
      console.error('加载学习数据失败:', error);
    }
  },

  /**
   * 获取学习记录 - 使用新的统一数据源
   */
  getStudyRecords() {
    try {
      // 使用新的统一数据源
      const dailyStats = learningDataSync.getDailyLearningStats();
      const records = {};
      
      Object.keys(dailyStats).forEach(dateStr => {
        const stats = dailyStats[dateStr];
        // 🔧 修复：直接使用 dateStr，因为 dailyStats 的 key 已经是 YYYY-MM-DD 格式
        const date = dateStr;
        
        // 🔧 修复：只记录有实际学习活动的日期（必须有 attempts 或 learned）
        // 避免显示只有 _mastered 标记但没有实际学习活动的日期
        const hasActualActivity = (stats.attempts && stats.attempts > 0) || 
                                  (stats.learned && stats.learned > 0) ||
                                  (stats.words && Array.isArray(stats.words) && 
                                   stats.words.filter(w => !w.endsWith('_mastered')).length > 0);
        
        if (!hasActualActivity) {
          // 跳过没有实际学习活动的日期
          return;
        }
        
        // 计算该日期的学习单词数
        let dailyWordCount = 0;
        if (stats.words && Array.isArray(stats.words)) {
          // 过滤掉 _mastered 后缀的标记，只统计实际单词
          const actualWords = stats.words.filter(w => !w.endsWith('_mastered'));
          dailyWordCount = actualWords.length;
        } else if (stats.learned && stats.learned > 0) {
          dailyWordCount = stats.learned;
        } else if (stats.attempts && stats.attempts > 0) {
          // 如果有练习次数但没有单词列表，估算单词数
          dailyWordCount = Math.min(stats.attempts, 10); // 假设每次练习最多10个单词
        }
        
        records[date] = {
          tests: 0, // 测试次数（暂时保持为0，后续可扩展）
          trains: stats.attempts || 0, // 训练次数
          mistakes: (stats.attempts || 0) - (stats.successes || 0), // 错误次数
          words: (stats.words && Array.isArray(stats.words)) ? 
            stats.words.filter(w => !w.endsWith('_mastered')) : [], // 过滤掉 _mastered 标记
          totalWords: dailyWordCount, // 使用计算出的单词数
          newWords: stats.learned || 0, // 新学单词数
          
          // 新增：详细统计
          successRate: stats.attempts > 0 ? 
            Math.round((stats.successes / stats.attempts) * 100) : 0,
            
          // 阶段详情
          phaseDetails: {
            phase1: {
              name: '四选一',
              attempts: stats.phases?.phase1?.attempts || 0,
              successes: stats.phases?.phase1?.successes || 0,
              rate: this.calculateRate(stats.phases?.phase1)
            },
            phase2: {
              name: '跟读',
              attempts: stats.phases?.phase2?.attempts || 0,
              successes: stats.phases?.phase2?.successes || 0,
              rate: this.calculateRate(stats.phases?.phase2)
            },
            phase3: {
              name: '拼写',
              attempts: stats.phases?.phase3?.attempts || 0,
              successes: stats.phases?.phase3?.successes || 0,
              rate: this.calculateRate(stats.phases?.phase3)
            },
            phase4: {
              name: '应用',
              attempts: stats.phases?.phase4?.attempts || 0,
              successes: stats.phases?.phase4?.successes || 0,
              rate: this.calculateRate(stats.phases?.phase4)
            }
          },
          
          // 年级分布
          gradeBreakdown: stats.grades || {}
        };
      });
      
      return records;
    } catch (error) {
      console.error('获取学习记录失败:', error);
      return {};
    }
  },

  /**
   * 🧮 计算成功率
   */
  calculateRate(phaseData) {
    if (!phaseData || phaseData.attempts === 0) return 0;
    return Math.round((phaseData.successes / phaseData.attempts) * 100);
  },

  /**
   * 📊 获取学习趋势数据
   */
  getLearningTrends(days = 7) {
    const dailyStats = learningDataSync.getDailyLearningStats();
    const now = new Date();
    const trends = [];
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const dayStats = dailyStats[dateStr] || {
        totalAttempts: 0,
        totalSuccesses: 0,
        newWords: 0
      };
      
      trends.push({
        date: dateStr,
        day: date.getDate(),
        attempts: dayStats.totalAttempts,
        successes: dayStats.totalSuccesses,
        newWords: dayStats.newWords,
        successRate: dayStats.totalAttempts > 0 ? 
          Math.round((dayStats.totalSuccesses / dayStats.totalAttempts) * 100) : 0
      });
    }
    
    return trends;
  },

  /**
   * 🎯 获取学习目标完成情况
   */
  getLearningGoalProgress() {
    const today = new Date().toISOString().split('T')[0];
    const dailyStats = learningDataSync.getDailyLearningStats();
    const todayStats = dailyStats[today] || {
      totalAttempts: 0,
      newWords: 0
    };
    
    // 默认目标
    const goals = {
      dailyAttempts: 50,  // 每日练习次数目标
      dailyNewWords: 10   // 每日新学单词目标
    };
    
    return {
      attempts: {
        current: todayStats.totalAttempts,
        target: goals.dailyAttempts,
        percentage: Math.min(Math.round((todayStats.totalAttempts / goals.dailyAttempts) * 100), 100)
      },
      newWords: {
        current: todayStats.newWords,
        target: goals.dailyNewWords,
        percentage: Math.min(Math.round((todayStats.newWords / goals.dailyNewWords) * 100), 100)
      }
    };
  },

  /**
   * 📈 获取月度学习统计
   */
  getMonthlyStats(year, month) {
    const dailyStats = learningDataSync.getDailyLearningStats();
    const monthKey = `${year}-${month.toString().padStart(2, '0')}`;
    
    let totalAttempts = 0;
    let totalSuccesses = 0;
    let totalNewWords = 0;
    let activeDays = 0;
    
    Object.keys(dailyStats).forEach(dateStr => {
      if (dateStr.startsWith(monthKey)) {
        const dayStats = dailyStats[dateStr];
        totalAttempts += dayStats.totalAttempts || 0;
        totalSuccesses += dayStats.totalSuccesses || 0;
        totalNewWords += dayStats.newWords || 0;
        
        if (dayStats.totalAttempts > 0) {
          activeDays++;
        }
      }
    });
    
    return {
      totalAttempts,
      totalSuccesses,
      totalNewWords,
      activeDays,
      successRate: totalAttempts > 0 ? 
        Math.round((totalSuccesses / totalAttempts) * 100) : 0,
      avgAttemptsPerDay: activeDays > 0 ? 
        Math.round(totalAttempts / activeDays) : 0
    };
  },
  
  /**
   * 计算学习统计数据 - 与首页和我的页面保持同步
   */
  calculateStudyStats(records) {
    try {
      // 使用与首页和我的页面相同的数据源和计算逻辑
      const masteryMap = learningDataSync.getWordMasteryMap();
      const learnedWords = new Set();
      let fallbackWordCount = 0;
      
      // 统计每日记录中的实际单词，优先使用去重后的真实单词列表
      Object.values(records).forEach(record => {
        if (Array.isArray(record.words) && record.words.length > 0) {
          record.words.forEach(word => learnedWords.add(word));
        } else if (record.totalWords && record.totalWords > 0) {
          // 某些记录可能只存储数量，无法拿到具体单词，作为兜底统计
          fallbackWordCount += record.totalWords;
        }
      });
      
      // 结合掌握度数据，补充去重后的单词集合，并统计已掌握数量
      let masteredWords = 0;
      Object.values(masteryMap).forEach(wordData => {
        // 检查是否有任何学习记录（totalAttempts 或 phases 中的 attempts）
        const hasLearningRecord = wordData.totalAttempts > 0 || 
          (wordData.phases && Object.values(wordData.phases).some(phase => phase.attempts > 0));
        
        if (hasLearningRecord && wordData.word) {
          learnedWords.add(wordData.word);
        }
        
        if (wordData.masteryLevel === 'mastered' || wordData.masteryLevel === 'expert') {
          masteredWords++;
        }
      });
      
      let totalWords = learnedWords.size;
      if (totalWords === 0 && fallbackWordCount > 0) {
        // 如果仍然无法获得具体单词，则使用数量兜底，保证与日历一致
        totalWords = fallbackWordCount;
      }
      
      // 计算连续学习天数（使用每日统计数据）
      const dailyStats = learningDataSync.getDailyLearningStats();
      const continuousDays = this.calculateContinuousDays(dailyStats);
      
      return {
        totalWords: totalWords,        // 共学习单词数
        totalMastered: masteredWords,      // 累计掌握单词数
        continuousDays: continuousDays,    // 坚持天数
        totalTests: 0,
        totalTrains: 0
      };
    } catch (error) {
      console.error('计算学习统计数据失败:', error);
      return {
        totalWords: 0,
        totalMastered: 0,
        continuousDays: 0,
        totalTests: 0,
        totalTrains: 0
      };
    }
  },

  /**
   * 计算连续学习天数 - 修复数据源问题
   */
  calculateContinuousDays(dailyStats) {
    if (!dailyStats || Object.keys(dailyStats).length === 0) return 0;
    
    const today = this.formatDate(new Date());
    const studyDates = Object.keys(dailyStats).sort().reverse(); // 从最新到最旧
    
    if (studyDates.length === 0) return 0;
    
    // 找到最近的学习日期（可能是今天，也可能是昨天或更早）
    const latestStudyDate = studyDates[0];
    const latestDate = new Date(latestStudyDate);
    const todayDate = new Date(today);
    
    // 🔧 修复：如果最近的学习日期是今天或昨天，说明连续学习可能还在继续
    // 如果最近的学习日期是2天前或更早，说明连续学习已经中断
    const daysSinceLatestStudy = Math.floor((todayDate - latestDate) / (1000 * 60 * 60 * 24));
    
    // 如果最近的学习日期是2天前或更早，连续学习已经中断，返回0
    if (daysSinceLatestStudy > 1) {
      return 0;
    }
    
    // 从最近的学习日期开始往前计算连续天数
    let continuousDays = 0;
    let currentDate = new Date(latestDate);
    
    // 从最近的学习日期开始往前计算连续天数
    for (let i = 0; i < 365; i++) { // 最多检查365天
      const dateStr = this.formatDate(currentDate);
      
      if (studyDates.includes(dateStr)) {
        continuousDays++;
      } else {
        // 中断了连续学习
        break;
      }
      
      // 往前推一天
      currentDate.setDate(currentDate.getDate() - 1);
    }
    
    return continuousDays;
  },

  /**
   * 生成日历 - 显示完整的月份天数，并正确处理星期对齐
   */
  generateCalendar() {
    const year = this.data.currentYear;
    const month = this.data.currentMonth;
    
    // 获取当月天数
    const lastDay = new Date(year, month, 0);
    const daysInMonth = lastDay.getDate();
    
    // 获取当月第一天是星期几（0=周日, 1=周一, ..., 6=周六）
    const firstDay = new Date(year, month - 1, 1);
    const firstDayOfWeek = firstDay.getDay();
    
    const calendarDays = [];
    const today = this.formatDate(new Date());
    
    // 在月份第一天之前添加空白占位符，确保日期从正确的星期开始
    for (let i = 0; i < firstDayOfWeek; i++) {
      calendarDays.push({
        day: '',
        date: '',
        isCurrentMonth: false,
        isToday: false,
        hasStudy: false,
        studyCount: 0
      });
    }
    
    // 添加当月的所有日期
    for (let day = 1; day <= daysInMonth; day++) {
      const date = this.formatDate(new Date(year, month - 1, day));
      calendarDays.push({
        day: day,
        date: date,
        isCurrentMonth: true,
        isToday: date === today,
        hasStudy: this.hasStudyOnDate(date),
        studyCount: this.getStudyCountOnDate(date)
      });
    }
    
    this.setData({
      calendarDays: calendarDays
    });
  },

  /**
   * 检查指定日期是否有学习记录 - 优化数据同步
   */
  hasStudyOnDate(date) {
    const records = this.data.studyRecords[date];
    if (!records) return false;
    
    // 检查是否有任何学习活动
    return (records.totalWords && records.totalWords > 0) || 
           (records.trains && records.trains > 0) ||
           (records.newWords && records.newWords > 0) ||
           (records.words && records.words.length > 0);
  },

  /**
   * 获取指定日期的学习次数 - 优化数据同步
   */
  getStudyCountOnDate(date) {
    const records = this.data.studyRecords[date];
    if (!records) return 0;
    
    // 优先使用totalWords，如果没有则使用trains或newWords
    if (records.totalWords && records.totalWords > 0) {
      return records.totalWords;
    } else if (records.words && records.words.length > 0) {
      return records.words.length;
    } else if (records.trains && records.trains > 0) {
      return Math.min(records.trains, 10); // 限制显示数量
    } else if (records.newWords && records.newWords > 0) {
      return records.newWords;
    }
    
    return 0;
  },

  /**
   * 格式化日期为YYYY-MM-DD
   */
  formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  },

  /**
   * 上一个月
   */
  prevMonth() {
    let { currentYear, currentMonth } = this.data;
    
    if (currentMonth === 1) {
      currentYear--;
      currentMonth = 12;
    } else {
      currentMonth--;
    }
    this.setData({
      currentYear,
      currentMonth
    });
    
    // 提供用户反馈
    wx.showToast({
      title: `${currentYear}年${currentMonth}月`,
      icon: 'none',
      duration: 1000
    });
    
    this.generateCalendar();
  },

  /**
   * 下一个月
   */
  nextMonth() {
    let { currentYear, currentMonth } = this.data;
    
    if (currentMonth === 12) {
      currentYear++;
      currentMonth = 1;
    } else {
      currentMonth++;
    }
    this.setData({
      currentYear,
      currentMonth
    });
    
    // 提供用户反馈
    wx.showToast({
      title: `${currentYear}年${currentMonth}月`,
      icon: 'none',
      duration: 1000
    });
    
    this.generateCalendar();
  },

  /**
   * 回到今天
   */
  goToToday() {
    const today = new Date();
    const targetYear = today.getFullYear();
    const targetMonth = today.getMonth() + 1;
    this.setData({
      currentYear: targetYear,
      currentMonth: targetMonth
    });
    
    // 提供用户反馈
    wx.showToast({
      title: '已回到当前月份',
      icon: 'success',
      duration: 1000
    });
    
    this.generateCalendar();
  },

  /**
   * 点击日期
   */
  onDayTap(e) {
    const date = e.currentTarget.dataset.date;
    if (!date) {
      console.error('日期数据为空');
      wx.showToast({
        title: '日期数据错误',
        icon: 'error'
      });
      return;
    }
    
    const records = this.data.studyRecords[date];
    if (records) {
      const dateObj = new Date(date);
      const dateText = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;
      
      this.setData({
        selectedDate: date,
        selectedDateText: `${dateText} 学习了${records.totalWords || 0}个词汇`
      });
      
      // 显示当日学习详情
      this.showDayDetail(date, records);
    } else {

      const dateObj = new Date(date);
      const dateText = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;
      
      this.setData({
        selectedDate: date,
        selectedDateText: `${dateText} 当天没有学习记录`
      });
      
      wx.showModal({
        title: '学习记录',
        content: `${dateText}\n当天没有学习记录\n\n点击开始学习来记录今天的学习！`,
        showCancel: true,
        cancelText: '取消',
        confirmText: '开始学习',
        success: (res) => {
          if (res.confirm) {
            // 跳转到学习页面
            wx.switchTab({
              url: '/pages/index/index'
            });
          }
        }
      });
    }
  },

  /**
   * 显示当日学习详情
   */
  showDayDetail(date, records) {
    const content = [
      `📚 测试次数: ${records.tests}次`,
      `💪 训练次数: ${records.trains}次`, 
      `❌ 错题数量: ${records.mistakes}个`,
      `📖 学习词汇: ${records.totalWords}个`
    ].join('\n');
    
    wx.showModal({
      title: `${date} 学习详情`,
      content: content,
      showCancel: false,
      confirmText: '知道了'
    });
  },

  /**
   * 跳转到学习记录页面
   */
  goToStudyRecord() {
    // 显示学习记录详情
    const records = this.data.studyRecords;
    const dates = Object.keys(records).sort().reverse(); // 按日期倒序排列
    
    if (dates.length === 0) {
      wx.showModal({
        title: '学习记录',
        content: '暂无学习记录\n\n开始学习来记录你的进步吧！',
        showCancel: true,
        cancelText: '取消',
        confirmText: '开始学习',
        success: (res) => {
          if (res.confirm) {
            wx.switchTab({
              url: '/pages/index/index'
            });
          }
        }
      });
      return;
    }
    
    // 显示最近的学习记录
    const recentRecords = dates.slice(0, 5); // 显示最近5天的记录
    let content = '最近学习记录：\n\n';
    
    recentRecords.forEach(date => {
      const record = records[date];
      // 🔧 修复：解析日期字符串 YYYY-MM-DD 格式
      const dateParts = date.split('-');
      const dateText = `${parseInt(dateParts[1])}月${parseInt(dateParts[2])}日`;
      
      // 🔧 修复：确保显示正确的单词数，优先使用 totalWords，如果没有则使用其他字段
      let wordCount = 0;
      if (record.totalWords && record.totalWords > 0) {
        wordCount = record.totalWords;
      } else if (record.words && record.words.length > 0) {
        wordCount = record.words.length;
      } else if (record.newWords && record.newWords > 0) {
        wordCount = record.newWords;
      } else if (record.trains && record.trains > 0) {
        wordCount = record.trains; // 使用训练次数作为估算
      }
      
      content += `${dateText}: 学习了${wordCount}个词汇\n`;
    });
    
    if (dates.length > 5) {
      content += `\n还有${dates.length - 5}天的学习记录...`;
    }
    
    // 添加总计信息，与顶部统计保持一致
    const totalWords = this.data.studyStats.totalWords || 0;
    content += `\n总计：已学习${totalWords}个词汇`;
    
    wx.showModal({
      title: '学习记录详情',
      content: content,
      showCancel: true,
      cancelText: '关闭',
      confirmText: '查看全部',
      success: (res) => {
        if (res.confirm) {
          // 可以跳转到更详细的学习记录页面
          wx.showModal({
            title: '学习记录',
            content: `共记录了${dates.length}天的学习数据\n总计学习${totalWords}个词汇\n\n详细记录功能开发中...`,
            showCancel: false,
            confirmText: '知道了'
          });
        }
      }
    });
  },

  /**
   * 加载复习数据 - 与我的页面保持同步
   */
  loadReviewData() {
    try {
      const masteryMap = learningDataSync.getWordMasteryMap();
      let needsReviewCount = 0;
      let mistakeCount = 0;
      
      const now = Date.now();
      
      Object.values(masteryMap).forEach(wordData => {
        // 统计需要复习的单词（与我的页面逻辑一致）
        if (wordData.nextReview && wordData.nextReview <= now) {
          needsReviewCount++;
        }
        
        // 统计错题（与我的页面逻辑一致）
        if (wordData.mistakes && wordData.mistakes.length > 0) {
          mistakeCount++;
        }
      });
      
      this.setData({
        reviewStats: {
          needsReviewCount,
          mistakeCount
        }
      });
    } catch (error) {
      console.error('加载复习数据失败:', error);
      // 设置默认值
      this.setData({
        reviewStats: {
          needsReviewCount: 0,
          mistakeCount: 0
        }
      });
    }
  },

  /**
   * 开始复习
   */
  startReview() {
    const masteryMap = learningDataSync.getWordMasteryMap();
    const reviewWords = [];
    const now = Date.now();
    
    // 收集需要复习的单词
    Object.values(masteryMap).forEach(wordData => {
      if (wordData.nextReview && wordData.nextReview <= now) {
        reviewWords.push({
          word: wordData.word,
          grade: wordData.gradeId,
          masteryLevel: wordData.masteryLevel,
          lastReview: wordData.lastReview
        });
      }
    });
    
    if (reviewWords.length === 0) {
      wx.showToast({
        title: '暂无需要复习的单词',
        icon: 'none'
      });
      return;
    }
    
    // 按掌握度排序，优先复习掌握度低的单词
    reviewWords.sort((a, b) => {
      const levelOrder = { learning: 0, familiar: 1, mastered: 2, expert: 3 };
      return levelOrder[a.masteryLevel] - levelOrder[b.masteryLevel];
    });
    
    // 取前20个单词进行复习
    const wordsToReview = reviewWords.slice(0, 20);
    
    wx.showModal({
      title: '开始复习',
      content: `准备复习 ${wordsToReview.length} 个单词，预计耗时 ${Math.ceil(wordsToReview.length * 0.5)} 分钟`,
      confirmText: '开始',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          // 存储复习单词列表
          wx.setStorageSync('reviewWords', wordsToReview);
          
          // 跳转到学习页面，使用复习模式
          wx.navigateTo({
            url: '/pages/learning/learning?mode=review'
          });
        }
      }
    });
  },

  /**
   * 跳转到复习记录页面
   */
  goToReviewRecord() {
    // 跳转到生词本页面
    wx.navigateTo({
      url: '/pages/mistake/mistake'
    });
  }
});
