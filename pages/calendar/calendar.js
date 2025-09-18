// 学习日历页面
const { userManager } = require('../../utils/userManager');
const { learningDataSync } = require('../../utils/learningDataSync.js');

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
      mistakeCount: 0,        // 错题数量
      weakWordsCount: 0       // 薄弱词汇数量
    }
  },

  onLoad() {
    this.initCalendar();
    this.loadStudyData();
  },

  onShow() {
    // 更新tabbar选中状态
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({
        selected: 1 // 日历是第2个tab
      });
    }
    // 每次显示页面时刷新数据
    this.loadStudyData();
    this.loadReviewData();
    this.generateCalendar();
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
      });

      console.log('学习数据加载完成:', stats);
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
        const date = this.formatDate(new Date(dateStr));
        
        records[date] = {
          tests: 0, // 测试次数（暂时保持为0，后续可扩展）
          trains: stats.totalAttempts || 0, // 训练次数
          mistakes: (stats.totalAttempts || 0) - (stats.totalSuccesses || 0), // 错误次数
          words: stats.totalWords || [],
          totalWords: (stats.totalWords || []).length,
          newWords: stats.newWords || 0, // 新学单词数
          
          // 新增：详细统计
          successRate: stats.totalAttempts > 0 ? 
            Math.round((stats.totalSuccesses / stats.totalAttempts) * 100) : 0,
            
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
      
      // 如果没有数据，保持现有的示例数据逻辑
      if (Object.keys(records).length === 0) {
        console.log('没有找到学习记录，添加示例数据');
        this.addSampleData(records);
      }
      
      console.log('学习记录处理完成:', records);
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
   * 添加示例数据（用于测试）
   */
  addSampleData(records) {
    const today = new Date();
    const sampleWords = ['hello', 'world', 'study', 'learn', 'practice', 'test', 'word', 'vocabulary', 'english', 'language'];
    
    // 添加最近7天的示例数据
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      const dateStr = this.formatDate(date);
      
      // 随机生成学习数据
      const tests = Math.floor(Math.random() * 3) + 1;
      const trains = Math.floor(Math.random() * 2) + 1;
      const mistakes = Math.floor(Math.random() * 2);
      
      records[dateStr] = {
        tests: tests,
        trains: trains,
        mistakes: mistakes,
        words: new Set(sampleWords.slice(0, tests + trains + mistakes))
      };
    }
    
    // 添加今天的数据
    const todayStr = this.formatDate(today);
    records[todayStr] = {
      tests: 2,
      trains: 1,
      mistakes: 1,
      words: new Set(['hello', 'world', 'study', 'learn'])
    };
    
    console.log('示例数据添加完成');
  },

  /**
   * 计算学习统计数据
   */
  calculateStudyStats(records) {
    const allWords = new Set();
    const dates = Object.keys(records).sort();
    
    let totalTests = 0;
    let totalTrains = 0;
    let totalMistakes = 0;
    
    // 统计总数据
    Object.values(records).forEach(record => {
      totalTests += record.tests || 0;
      totalTrains += record.trains || 0;
      totalMistakes += record.mistakes || 0;
      record.words.forEach(word => allWords.add(word));
    });
    
    // 计算连续学习天数
    const continuousDays = this.calculateContinuousDays(dates);
    
    return {
      totalWords: allWords.size,
      totalMistakes: totalMistakes,
      continuousDays: continuousDays,
      totalTests: totalTests,
      totalTrains: totalTrains
    };
  },

  /**
   * 计算连续学习天数
   */
  calculateContinuousDays(studyDates) {
    if (studyDates.length === 0) return 0;
    
    const today = this.formatDate(new Date());
    const sortedDates = studyDates.sort().reverse(); // 从最新到最旧
    
    let continuousDays = 0;
    let currentDate = new Date();
    
    // 从今天开始往前计算连续天数
    for (let i = 0; i < 365; i++) { // 最多检查365天
      const dateStr = this.formatDate(currentDate);
      
      if (sortedDates.includes(dateStr)) {
        continuousDays++;
      } else if (dateStr === today) {
        // 今天没有学习，但可能昨天有学习，继续检查
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
   * 生成日历
   */
  generateCalendar() {
    const year = this.data.currentYear;
    const month = this.data.currentMonth;
    
    // 获取当月第一天和最后一天
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);
    
    // 获取当月第一天是星期几
    const firstDayWeek = firstDay.getDay();
    
    // 获取当月天数
    const daysInMonth = lastDay.getDate();
    
    const calendarDays = [];
    const today = this.formatDate(new Date());
    
    // 添加上个月的日期（如果第一天不是星期日）
    if (firstDayWeek > 0) {
      const prevMonth = month === 1 ? 12 : month - 1;
      const prevYear = month === 1 ? year - 1 : year;
      const daysInPrevMonth = new Date(prevYear, prevMonth, 0).getDate();
      
      for (let i = firstDayWeek - 1; i >= 0; i--) {
        const day = daysInPrevMonth - i;
        const date = this.formatDate(new Date(prevYear, prevMonth - 1, day));
        calendarDays.push({
          day: day,
          date: date,
          isCurrentMonth: false,
          isToday: date === today,
          hasStudy: this.hasStudyOnDate(date),
          studyCount: this.getStudyCountOnDate(date)
        });
      }
    }
    
    // 添加当月的日期
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
    
    // 添加下个月的日期（补齐42个格子）
    const remainingDays = 42 - calendarDays.length;
    const nextMonth = month === 12 ? 1 : month + 1;
    const nextYear = month === 12 ? year + 1 : year;
    
    for (let day = 1; day <= remainingDays; day++) {
      const date = this.formatDate(new Date(nextYear, nextMonth - 1, day));
      calendarDays.push({
        day: day,
        date: date,
        isCurrentMonth: false,
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
   * 检查指定日期是否有学习记录
   */
  hasStudyOnDate(date) {
    const records = this.data.studyRecords[date];
    return records && (records.tests > 0 || records.trains > 0 || records.mistakes > 0);
  },

  /**
   * 获取指定日期的学习次数
   */
  getStudyCountOnDate(date) {
    const records = this.data.studyRecords[date];
    if (!records) return 0;
    return records.tests + records.trains + records.mistakes;
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
    console.log('点击上一个月按钮');
    let { currentYear, currentMonth } = this.data;
    
    if (currentMonth === 1) {
      currentYear--;
      currentMonth = 12;
    } else {
      currentMonth--;
    }
    
    console.log(`切换到: ${currentYear}年${currentMonth}月`);
    
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
    console.log('点击下一个月按钮');
    let { currentYear, currentMonth } = this.data;
    
    if (currentMonth === 12) {
      currentYear++;
      currentMonth = 1;
    } else {
      currentMonth++;
    }
    
    console.log(`切换到: ${currentYear}年${currentMonth}月`);
    
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
    console.log('点击回到今天按钮');
    const today = new Date();
    const targetYear = today.getFullYear();
    const targetMonth = today.getMonth() + 1;
    
    console.log(`回到今天: ${targetYear}年${targetMonth}月`);
    
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
    console.log('点击日期事件触发:', e);
    const date = e.currentTarget.dataset.date;
    console.log('点击的日期:', date);
    
    if (!date) {
      console.error('日期数据为空');
      wx.showToast({
        title: '日期数据错误',
        icon: 'error'
      });
      return;
    }
    
    const records = this.data.studyRecords[date];
    console.log('该日期的学习记录:', records);
    
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
      console.log('该日期没有学习记录');
      // 即使没有学习记录，也要提供反馈
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
            wx.navigateTo({
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
    // 这里可以跳转到详细的学习记录页面
    wx.showToast({
      title: '功能开发中',
      icon: 'none'
    });
  },

  /**
   * 加载复习数据
   */
  loadReviewData() {
    try {
      const masteryMap = learningDataSync.getWordMasteryMap();
      let needsReviewCount = 0;
      let mistakeCount = 0;
      let weakWordsCount = 0;
      
      const now = Date.now();
      
      Object.values(masteryMap).forEach(wordData => {
        // 统计需要复习的单词
        if (wordData.nextReview && wordData.nextReview <= now) {
          needsReviewCount++;
        }
        
        // 统计错题
        if (wordData.mistakes && wordData.mistakes.length > 0) {
          mistakeCount++;
        }
        
        // 统计薄弱词汇（掌握度较低或容易出错的单词）
        if (wordData.masteryLevel === 'learning' || 
            (wordData.mistakes && wordData.mistakes.length >= 2)) {
          weakWordsCount++;
        }
      });
      
      this.setData({
        reviewStats: {
          needsReviewCount,
          mistakeCount,
          weakWordsCount
        }
      });
      
      console.log('复习数据加载完成:', {needsReviewCount, mistakeCount, weakWordsCount});
    } catch (error) {
      console.error('加载复习数据失败:', error);
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
  },

  /**
   * 跳转到薄弱词汇页面
   */
  goToWeakWords() {
    const masteryMap = learningDataSync.getWordMasteryMap();
    const weakWords = [];
    
    // 收集薄弱词汇
    Object.values(masteryMap).forEach(wordData => {
      if (wordData.masteryLevel === 'learning' || 
          (wordData.mistakes && wordData.mistakes.length >= 2)) {
        weakWords.push({
          word: wordData.word,
          grade: wordData.gradeId,
          masteryLevel: wordData.masteryLevel,
          errorCount: wordData.mistakes ? wordData.mistakes.length : 0
        });
      }
    });
    
    if (weakWords.length === 0) {
      wx.showToast({
        title: '暂无薄弱词汇',
        icon: 'none'
      });
      return;
    }
    
    // 按错误次数排序
    weakWords.sort((a, b) => b.errorCount - a.errorCount);
    
    wx.showModal({
      title: '薄弱词汇练习',
      content: `发现 ${weakWords.length} 个薄弱词汇，是否开始强化练习？`,
      confirmText: '开始练习',
      cancelText: '查看列表',
      success: (res) => {
        if (res.confirm) {
          // 存储薄弱词汇列表
          wx.setStorageSync('reviewWords', weakWords.slice(0, 20));
          
          // 跳转到学习页面，使用强化练习模式
          wx.navigateTo({
            url: '/pages/learning/learning?mode=strengthen'
          });
        } else {
          // 跳转到生词本查看详细列表
          wx.navigateTo({
            url: '/pages/mistake/mistake'
          });
        }
      }
    });
  }
});
