const { userManager } = require('../../utils/userManager');
const learningDataSync = require('../../utils/learningDataSync.js');
const { getGradeWordCount } = require('../../utils/gradeWordDatabase.js');
const { requireLogin } = require('../../utils/loginGuard');

Page({
  data: {
    testHistory: [],
    remainingTests: 3,
    isPremium: false,
    membershipStatus: {},
    expireTimeText: '',
    
    // 新增：个性化学习数据
    recentLearning: null,        // 最近学习记录
    continueLearning: null,      // 可继续的学习
    favoriteGrades: [],          // 常用年级
    learningStats: {},           // 学习统计
    showQuickAccess: true,       // 是否显示快速访问区域
    
    // 年级选择相关
    currentGrade: null,          // 当前选择的年级
    currentGradeName: '',        // 当前年级名称
    isFirstTime: false,          // 是否首次使用
    dropdownOpen: false,         // 下拉框是否打开
    
    // 授权相关
    showAuthModal: false,        // 是否显示授权弹窗
    isLoggedIn: false,           // 是否已登录（有 openid）
    gradeGroups: [
      {
        stage: '小学阶段',
        grades: ['grade3_1', 'grade3_2', 'grade4_1', 'grade4_2', 'grade5_1', 'grade5_2', 'grade6_1', 'grade6_2']
      },
      {
        stage: '初中阶段', 
        grades: ['grade7_1', 'grade7_2', 'grade8_1', 'grade8_2', 'grade9_1', 'grade9_2']
      }
    ],
    gradeNames: {
      'grade3_1': '三年级上',
      'grade3_2': '三年级下',
      'grade4_1': '四年级上', 
      'grade4_2': '四年级下',
      'grade5_1': '五年级上',
      'grade5_2': '五年级下',
      'grade6_1': '六年级上',
      'grade6_2': '六年级下',
      'grade7_1': '初一上',
      'grade7_2': '初一下',
      'grade8_1': '初二上',
      'grade8_2': '初二下',
      'grade9_1': '初三上',
      'grade9_2': '初三下'
    }
  },

  async onLoad() {
    // 🔧 修改：允许用户先浏览内容，不强制要求登录
    // 用户可以在浏览后决定是否需要登录

    this.loadTestHistory();
    this.checkDailyLimit();
    this.checkFirstTime();
    await this.loadPersonalizedData();
    this.validateGradeGroups();
    this.checkUserAuth();
    // 🔧 修复：延迟检查登录状态，确保 app.js 的自动登录已完成
    setTimeout(() => {
      this.checkLoginStatus();
    }, 500);
  },

  async onShow() {
    // 更新tabbar选中状态
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({
        selected: 0 // 首页是第1个tab
      });
    }
    this.loadTestHistory();
    this.checkDailyLimit();
    this.checkFirstTime();
    await this.loadPersonalizedData(); // 每次显示时刷新个性化数据
    // 🔧 修复：延迟检查登录状态，确保 app.js 的自动登录已完成
    setTimeout(() => {
      this.checkLoginStatus();
    }, 300);
  },

  // 下拉刷新
  async onPullDownRefresh() {

    this.loadTestHistory();
    this.checkDailyLimit();
    this.checkFirstTime();
    await this.loadPersonalizedData();
    
    // 停止下拉刷新动画
    setTimeout(() => {
      wx.stopPullDownRefresh();
    }, 500);
  },

  // 验证年级组数据
  validateGradeGroups() {
    try {
      const { gradeGroups, gradeNames } = this.data;
      
      if (!gradeGroups || !Array.isArray(gradeGroups)) {
        console.error('gradeGroups数据异常:', gradeGroups);
        return;
      }
      
      // 检查每个年级组的数据完整性
      gradeGroups.forEach((group, index) => {
        if (!group.stage || !group.grades || !Array.isArray(group.grades)) {
          console.error(`年级组${index}数据异常:`, group);
        } else {
          // 检查grades数组中的每个年级是否在gradeNames中存在
          group.grades.forEach(grade => {
            if (!gradeNames[grade]) {
              console.error(`年级${grade}在gradeNames中不存在`);
            }
          });
        }
      });

    } catch (error) {
      console.error('验证年级组数据失败:', error);
    }
  },

  // 检查每日测试限制和会员状态
  checkDailyLimit() {
    const membershipStatus = userManager.getMembershipStatus();
    const remainingTests = userManager.getRemainingTests();
    
    this.setData({
      isPremium: membershipStatus.isPremium,
      membershipStatus: membershipStatus,
      remainingTests: remainingTests.unlimited ? '∞' : remainingTests.count
    });
  },

  // 检查是否首次使用
  checkFirstTime() {
    try {
      const hasSelectedGrade = wx.getStorageSync('SELECTED_GRADE');
      const isFirstTime = !hasSelectedGrade;
      
      this.setData({
        isFirstTime,
        currentGrade: hasSelectedGrade,
        currentGradeName: hasSelectedGrade ? this.data.gradeNames[hasSelectedGrade] : ''
      });
    } catch (error) {
      console.error('检查首次使用失败:', error);
      this.setData({
        isFirstTime: true,
        currentGrade: null,
        currentGradeName: ''
      });
    }
  },

  // 加载测试历史
  loadTestHistory() {
    try {
      const history = wx.getStorageSync('testHistory') || [];
      this.setData({
        testHistory: history.slice(-5)
      });
    } catch (e) {
      console.error('加载历史记录失败:', e);
    }
  },


  // 跳转到水平测试
  // 跳转到发音测试页面
  goToDebugAudio() {
    // 暂时跳过登录检查
    wx.navigateTo({
      url: '/pages/debugAudio/debugAudio'
    });
  },

  goToLevelTest() {
    // 暂时跳过登录检查
    const canTest = userManager.canTakeTest();
    if (!canTest.allowed) {
      userManager.showPermissionModal(canTest.reason);
      return;
    }

    wx.navigateTo({
      url: '/pages/gradeTest/gradeTest'
    });
  },

  // 显示生词本
  showWordBook() {
    // 暂时跳过登录检查
    wx.navigateTo({
      url: '/pages/mistake/mistake'
    });
  },

  // 跳转到升级页面
  goToUpgrade() {
    wx.navigateTo({
      url: '/pages/payment/payment'
    });
  },

  // 跳转到支付页面（会员管理）
  goToPayment() {
    wx.navigateTo({
      url: '/pages/payment/payment'
    });
  },

  // 清空所有历史记录
  clearAllHistory() {
    wx.showModal({
      title: '确认删除',
      content: '确定要清空所有历史记录吗？',
      success: (res) => {
        if (res.confirm) {
          try {
            wx.removeStorageSync('testHistory');
            this.setData({
              testHistory: []
            });
            wx.showToast({
              title: '已清空',
              icon: 'success'
            });
          } catch (error) {
            wx.showToast({
              title: '删除失败',
              icon: 'error'
            });
          }
        }
      }
    });
  },

  // 删除单条历史记录
  deleteHistory(e) {
    const id = e.currentTarget.dataset.id;
    try {
      const history = wx.getStorageSync('testHistory') || [];
      const newHistory = history.filter(item => item.id !== id);
      
      wx.setStorageSync('testHistory', newHistory);
      this.loadTestHistory();
      
      wx.showToast({
        title: '已删除',
        icon: 'success'
      });
    } catch (error) {
      wx.showToast({
        title: '删除失败',
        icon: 'error'
      });
    }
  },

  // 加载个性化学习数据
  async loadPersonalizedData() {
    try {
      // 1. 检查是否有可继续的学习进度
      const continueLearning = await this.findContinueLearning();
      
      // 2. 获取最近学习记录
      const recentLearning = await this.getRecentLearning();
      
      // 3. 获取常用年级
      const favoriteGrades = this.getFavoriteGrades();
      
      // 4. 获取学习统计
      const learningStats = await this.getLearningStats();
      
      this.setData({
        continueLearning,
        recentLearning,
        favoriteGrades,
        learningStats,
        showQuickAccess: continueLearning || recentLearning || favoriteGrades.length > 0
      });

    } catch (error) {
      console.error('加载个性化数据失败:', error);
    }
  },

  // 查找可继续的学习
  async findContinueLearning() {
    try {
      const { currentGrade } = this.data;

      // 如果没有选择年级，返回null
      if (!currentGrade) {
        return null;
      }

      const gradeProgress = await learningDataSync.getGradeLearningProgress(currentGrade);

      // 🔧 修复：优先检查学习页面的分组学习进度，而不是简单的LEARNING_PROGRESS
      const groupLearningProgress = wx.getStorageSync(`GROUP_LEARNING_${currentGrade}`);
      if (groupLearningProgress && groupLearningProgress.timestamp) {
        // 检查进度是否过期（24小时）
        const now = Date.now();
        const timeDiff = now - groupLearningProgress.timestamp;
        const oneDay = 24 * 60 * 60 * 1000;

        if (timeDiff < oneDay) {
          const gradeName = this.getGradeName(currentGrade);
          const currentPhase = groupLearningProgress.currentPhase || 1;
          const currentGroup = groupLearningProgress.currentGroup || 1;

          // 获取总组数（需要从单词数据计算，或者从存储中获取）
          const totalGroups = groupLearningProgress.totalGroups || await this.getTotalGroupsForGrade(currentGrade) || 1;

          const masteryInfo = this.buildMasteryInfo(currentGrade, gradeProgress);

          return {
            gradeId: currentGrade,
            gradeName,
            masteryProgress: masteryInfo.masteryProgress,
            masteredWords: masteryInfo.masteredWords,
            totalWords: masteryInfo.totalWords,
            lastUpdate: groupLearningProgress.timestamp,
            currentPhase: currentPhase,
            sessionDone: currentGroup,
            sessionTarget: totalGroups
          };
        } else {
          // 进度过期，清除
          wx.removeStorageSync(`GROUP_LEARNING_${currentGrade}`);
        }
      }

      // 🔧 兼容：如果没有分组学习进度，尝试检查旧的LEARNING_PROGRESS数据
      const learningProgressData = wx.getStorageSync(`LEARNING_PROGRESS_${currentGrade}`);
      if (learningProgressData && learningProgressData.timestamp) {
        // 检查进度是否过期（24小时）
        const now = Date.now();
        const timeDiff = now - learningProgressData.timestamp;
        const oneDay = 24 * 60 * 60 * 1000;

        if (timeDiff < oneDay) {
          const gradeName = this.getGradeName(currentGrade);
          const currentPhase = learningProgressData.currentPhase || 1;
          const currentGroup = learningProgressData.currentGroup || 1;
          const totalGroups = learningProgressData.totalGroups || 1;

          const masteryInfo = this.buildMasteryInfo(currentGrade, gradeProgress);

          return {
            gradeId: currentGrade,
            gradeName,
            masteryProgress: masteryInfo.masteryProgress,
            masteredWords: masteryInfo.masteredWords,
            totalWords: masteryInfo.totalWords,
            lastUpdate: learningProgressData.timestamp,
            currentPhase: currentPhase,
            sessionDone: currentGroup,
            sessionTarget: totalGroups
          };
        } else {
          // 进度过期，清除
          wx.removeStorageSync(`LEARNING_PROGRESS_${currentGrade}`);
        }
      }
      
      // 只有当有已掌握的单词或学习中的单词时，才显示"继续学习"
      const hasRealProgress = gradeProgress && (
        gradeProgress.mastered > 0 || 
        gradeProgress.learning > 0 || 
        gradeProgress.familiar > 0 ||
        gradeProgress.expert > 0
      );
      
      if (hasRealProgress && gradeProgress.total > 0) {
        const gradeName = this.getGradeName(currentGrade);
        
        // 计算当前阶段和进度
        const currentPhase = this.getCurrentPhase(gradeProgress);
        
        // 获取当前阶段的进度
        const currentPhaseKey = `phase${currentPhase}`;
        const currentPhaseData = gradeProgress.phases[currentPhaseKey];
        
        let sessionDone, sessionTarget;
        
        if (currentPhaseData && currentPhaseData.total > 0) {
          // 显示当前阶段的进度
          sessionDone = currentPhaseData.completed;
          sessionTarget = currentPhaseData.total;
        } else {
          // 如果没有阶段数据，显示整体掌握率
          sessionDone = gradeProgress.mastered + gradeProgress.expert;
          sessionTarget = gradeProgress.total;
        }

        const masteryInfo = this.buildMasteryInfo(currentGrade, gradeProgress);

        return {
          gradeId: currentGrade,
          gradeName,
          masteryProgress: masteryInfo.masteryProgress,
          masteredWords: masteryInfo.masteredWords,
          totalWords: masteryInfo.totalWords,
          lastUpdate: Date.now(),
          currentPhase: currentPhase,
          sessionDone: sessionDone,
          sessionTarget: sessionTarget
        };
      }
      
      // 🔧 如果没有实际学习进度，返回null，显示"开始新学习"

      return null;
    } catch (error) {
      console.error('查找继续学习失败:', error);
      return null;
    }
  },

  // 获取最近学习记录
  async getRecentLearning() {
    try {
      const recentGrades = [];
      const grades = ['grade3_1', 'grade3_2', 'grade4_1', 'grade4_2', 'grade5_1', 'grade5_2', 'grade6_1', 'grade6_2', 'grade7_1', 'grade7_2', 'grade8_1', 'grade8_2', 'grade9_1', 'grade9_2'];
      
      for (let gradeId of grades) {
        // 使用新的学习数据同步管理器获取学习进度
        const learningProgress = await learningDataSync.getGradeLearningProgress(gradeId);
        
        if (learningProgress && learningProgress.total > 0) {
          // 修复进度计算：已掌握的单词 = mastered + expert
          const sessionDone = learningProgress.mastered + learningProgress.expert;
          const sessionTarget = learningProgress.total;
          const progress = sessionTarget > 0 ? Math.round((sessionDone / sessionTarget) * 100) : 0;
          
          // 只有有学习进度的年级才显示
          if (sessionDone > 0) {
            recentGrades.push({
              gradeId,
              gradeName: this.getGradeName(gradeId),
              lastUpdate: Date.now(), // 使用当前时间，因为新系统没有时间戳
              progress: progress
            });
          }
        }
      }
      
      // 按进度排序，返回最近3个
      return recentGrades
        .sort((a, b) => b.progress - a.progress)
        .slice(0, 3);
    } catch (error) {
      console.error('获取最近学习记录失败:', error);
      return [];
    }
  },

  /**
   * 计算已掌握/总词汇信息
   * @param {string} gradeId - 当前年级
   * @param {Object} gradeProgress - learningDataSync返回的进度
   */
  buildMasteryInfo(gradeId, gradeProgress) {
    const hasGradeProgress = gradeProgress && gradeProgress.total > 0;
    
    // 计算总词汇数：优先使用进度中的 total，否则从字典获取
    let totalWords = hasGradeProgress ? gradeProgress.total : 0;
    if (!totalWords || totalWords <= 0) {
      try {
        totalWords = getGradeWordCount(gradeId) || 0;
      } catch (error) {
        console.warn('获取年级词汇总数失败，使用默认值', error);
      }
    }

    // 计算已掌握单词：优先使用进度数据，否则从 masteryMap 统计
    let masteredWords = hasGradeProgress
      ? (gradeProgress.mastered || 0) + (gradeProgress.expert || 0)
      : 0;
    
    if ((!masteredWords || masteredWords <= 0) && typeof learningDataSync.getWordMasteryMap === 'function') {
      try {
        const masteryMap = learningDataSync.getWordMasteryMap();
        masteredWords = Object.values(masteryMap || {}).reduce((count, wordData) => {
          if (wordData && wordData.gradeId === gradeId && 
              (wordData.masteryLevel === 'mastered' || wordData.masteryLevel === 'expert')) {
            return count + 1;
          }
          return count;
        }, 0);
      } catch (error) {
        console.warn('统计掌握单词数失败', error);
      }
    }

    // 确保 total 不为0，以避免 0/0
    if (!totalWords || totalWords <= 0) {
      totalWords = Math.max(masteredWords, 1); // 至少为1，防止除零
    }

    const masteryProgress = totalWords > 0
      ? Math.min(100, Math.round((masteredWords / totalWords) * 100))
      : 0;
    
    return {
      masteredWords,
      totalWords,
      masteryProgress
    };
  },

  // 获取常用年级
  getFavoriteGrades() {
    try {
      const favoriteData = wx.getStorageSync('FAVORITE_GRADES') || [];
      return favoriteData.slice(0, 4); // 最多显示4个常用年级
    } catch (error) {
      console.error('获取常用年级失败:', error);
      return [];
    }
  },

  // 获取学习统计 - 与日历保持同步
  async getLearningStats() {
    try {
      const masteryMap = learningDataSync.getWordMasteryMap();
      const learnedWords = new Set();
      let fallbackWordCount = 0;
      
      let dailyStats = learningDataSync.getDailyLearningStats();
      
      Object.values(dailyStats || {}).forEach(stats => {
        if (Array.isArray(stats.words) && stats.words.length > 0) {
          stats.words
            .filter(word => typeof word === 'string' && !word.endsWith('_mastered'))
            .forEach(word => learnedWords.add(word));
        } else if (stats.learned && stats.learned > 0) {
          fallbackWordCount += stats.learned;
        } else if (stats.totalWords && stats.totalWords > 0) {
          fallbackWordCount += stats.totalWords;
        }
      });
      
      // 🔧 修复：如果每日统计为空，尝试从历史数据生成
      if (!dailyStats || Object.keys(dailyStats).length === 0) {

        dailyStats = learningDataSync.generateDailyStatsFromMasteryMap();
      }
      
      const continuousDays = this.calculateContinuousDays(dailyStats);
      const bestStreak = this.calculateBestStreak(dailyStats);
      
      let masteredWords = 0;
      Object.values(masteryMap).forEach(wordData => {
        const hasLearningRecord = wordData.totalAttempts > 0 || 
          (wordData.phases && Object.values(wordData.phases).some(phase => phase.attempts > 0));
        
        if (hasLearningRecord && wordData.word) {
          learnedWords.add(wordData.word);
        }
        
        if (wordData.masteryLevel === 'mastered' || wordData.masteryLevel === 'expert') {
          masteredWords++;

        }
      });
      
      let totalWordsLearned = learnedWords.size;
      if (totalWordsLearned === 0 && fallbackWordCount > 0) {
        totalWordsLearned = fallbackWordCount;
      }
      
      const stats = {
        totalWordsLearned: totalWordsLearned,     // 与日历的totalWords保持一致
        totalMastered: masteredWords,            // 与日历的totalMastered保持一致
        totalSessions: 0,
        currentStreak: continuousDays,           // 与日历的continuousDays保持一致
        bestStreak: bestStreak                   // 🔧 修复：计算最佳连续天数
      };

      return stats;
    } catch (error) {
      console.error('获取学习统计失败:', error);
      return {
        totalWordsLearned: 0,
        totalMastered: 0,
        totalSessions: 0,
        currentStreak: 0,
        bestStreak: 0
      };
    }
  },

  // 计算连续学习天数 - 与日历保持一致
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

  // 格式化日期为 YYYY-MM-DD
  formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  },

  // 计算最佳连续学习天数
  calculateBestStreak(dailyStats) {
    if (!dailyStats || Object.keys(dailyStats).length === 0) return 0;
    
    const studyDates = Object.keys(dailyStats).sort(); // 从最早到最晚
    if (studyDates.length === 0) return 0;
    
    let bestStreak = 0;
    let currentStreak = 0;
    let previousDate = null;
    
    // 遍历所有学习日期，找出最长的连续天数
    studyDates.forEach(dateStr => {
      const currentDate = new Date(dateStr);
      
      if (previousDate === null) {
        // 第一个日期
        currentStreak = 1;
        bestStreak = 1;
      } else {
        // 计算日期差（天数）
        const daysDiff = Math.floor((currentDate - previousDate) / (1000 * 60 * 60 * 24));
        
        if (daysDiff === 1) {
          // 连续的一天
          currentStreak++;
          bestStreak = Math.max(bestStreak, currentStreak);
        } else {
          // 中断了，重新开始计算
          currentStreak = 1;
        }
      }
      
      previousDate = currentDate;
    });

    return bestStreak;
  },

  // 获取年级的总组数
  async getTotalGroupsForGrade(gradeId) {
    try {
      // 从单词数据库获取年级词汇总数
      const wordCount = getGradeWordCount(gradeId);
      if (wordCount && wordCount > 0) {
        // 假设每组20个单词，计算总组数
        return Math.ceil(wordCount / 20);
      }
      return 1; // 默认至少1组
    } catch (error) {
      console.warn('获取年级总组数失败:', error);
      return 1;
    }
  },

  // 获取年级名称
  getGradeName(gradeId) {
    const gradeNames = {
      'grade3_1': '三年级上',
      'grade3_2': '三年级下',
      'grade4_1': '四年级上',
      'grade4_2': '四年级下',
      'grade5_1': '五年级上',
      'grade5_2': '五年级下',
      'grade6_1': '六年级上',
      'grade6_2': '六年级下',
      'grade7_1': '初一上',
      'grade7_2': '初一下',
      'grade8_1': '初二上',
      'grade8_2': '初二下',
      'grade9_1': '初三上',
      'grade9_2': '初三下'
    };
    return gradeNames[gradeId] || gradeId;
  },

  // 计算学习进度
  calculateProgress(progressData) {
    const sessionDone = progressData.sessionDone || 0;
    const sessionTarget = progressData.sessionTarget || 30;
    return Math.round((sessionDone / sessionTarget) * 100);
  },

  // 获取当前学习阶段
  getCurrentPhase(learningProgress) {
    // 安全检查：确保 learningProgress 和 phases 存在
    if (!learningProgress || !learningProgress.phases) {
      return 1; // 默认从第1阶段开始
    }
    
    const { phases } = learningProgress;
    
    // 根据各阶段的完成情况确定当前阶段（只检查存在的阶段）
    // 注意：只有 phase1, phase2, phase3 存在，没有 phase4
    if (phases.phase3 && phases.phase3.completed > 0) {
      return 3;
    } else if (phases.phase2 && phases.phase2.completed > 0) {
      return 2;
    } else if (phases.phase1 && phases.phase1.completed > 0) {
      return 1;
    } else {
      return 1; // 默认从第1阶段开始
    }
  },

  // 继续学习
  continueLearning() {
    const { continueLearning } = this.data;
    if (!continueLearning) {
      wx.showToast({
        title: '没有可继续的学习',
        icon: 'none'
      });
      return;
    }

    // 暂时跳过登录检查
    // 直接跳转到学习页面，恢复进度
    wx.navigateTo({
      url: `/pages/learning/learning?grade=${continueLearning.gradeId}&gradeName=${encodeURIComponent(continueLearning.gradeName)}&continue=true`
    });
  },

  // 开始新学习
  startNewLearning() {
    const { currentGrade, currentGradeName } = this.data;
    if (!currentGrade || !currentGradeName) {
      wx.showToast({
        title: '请先选择年级',
        icon: 'none'
      });
      return;
    }

    // 暂时跳过登录检查
    // 跳转到学习设置页面
    wx.navigateTo({
      url: `/pages/learningSettings/learningSettings?grade=${currentGrade}&gradeName=${encodeURIComponent(currentGradeName)}`
    });
  },

  // 快速开始学习（选择年级）
  quickStartLearning(e) {
    const gradeId = e.currentTarget.dataset.grade;
    const gradeName = this.getGradeName(gradeId);

    // 暂时跳过登录检查
    // 添加到常用年级
    this.addToFavorites(gradeId, gradeName);

    // 跳转到 learning 页面进行训练
    wx.navigateTo({
      url: `/pages/learning/learning?grade=${gradeId}&gradeName=${encodeURIComponent(gradeName)}&quantity=20&mode=normal`
    });
  },

  // 添加到常用年级
  addToFavorites(gradeId, gradeName) {
    try {
      let favorites = wx.getStorageSync('FAVORITE_GRADES') || [];
      
      // 移除已存在的
      favorites = favorites.filter(item => item.gradeId !== gradeId);
      
      // 添加到开头
      favorites.unshift({ gradeId, gradeName, addTime: Date.now() });
      
      // 保持最多10个
      favorites = favorites.slice(0, 10);
      
      wx.setStorageSync('FAVORITE_GRADES', favorites);
      
      // 更新页面数据
      this.setData({
        favoriteGrades: favorites.slice(0, 4)
      });
    } catch (error) {
      console.error('添加到常用年级失败:', error);
    }
  },

  // 显示所有年级选择
  showAllGrades() {
    // 跳转到水平测试页面选择年级
    wx.navigateTo({
      url: '/pages/gradeTest/gradeTest'
    });
  },

  // 切换快速访问显示
  toggleQuickAccess() {
    this.setData({
      showQuickAccess: !this.data.showQuickAccess
    });
  },

  // 选择年级
  async selectGrade(e) {
    const gradeId = e.currentTarget.dataset.grade;
    const gradeName = this.data.gradeNames[gradeId];
    
    if (!gradeId || !gradeName) {
      console.error('年级选择失败:', { gradeId, gradeName, gradeNames: this.data.gradeNames });
      wx.showToast({
        title: '年级选择失败',
        icon: 'error'
      });
      return;
    }
    
    try {
      // 保存选择的年级
      wx.setStorageSync('SELECTED_GRADE', gradeId);
      
      // 更新页面数据
      this.setData({
        currentGrade: gradeId,
        currentGradeName: gradeName,
        isFirstTime: false
      });
      
      // 重新加载个性化数据（检查新年级的学习进度）
      await this.loadPersonalizedData();
      
      // 添加到常用年级
      this.addToFavorites(gradeId, gradeName);
      
      // 显示成功提示
      wx.showToast({
        title: `已选择${gradeName}`,
        icon: 'success',
        duration: 1500
      });
      
      // 如果是首次选择，延迟后跳转到学习页面
      if (this.data.isFirstTime) {
        setTimeout(() => {
          wx.navigateTo({
            url: `/pages/learning/learning?grade=${gradeId}&gradeName=${encodeURIComponent(gradeName)}&quantity=20&mode=normal`
          });
        }, 1500);
      }
      
    } catch (error) {
      console.error('选择年级失败:', error);
      wx.showToast({
        title: '选择失败',
        icon: 'error'
      });
    }
  },

  // 下拉框相关方法
  toggleDropdown() {
    this.setData({
      dropdownOpen: !this.data.dropdownOpen
    });
  },

  closeDropdown() {
    this.setData({
      dropdownOpen: false
    });
  },

  async selectGradeFromDropdown(e) {
    const gradeId = e.currentTarget.dataset.grade;
    const gradeName = this.data.gradeNames[gradeId];
    
    if (!gradeId || !gradeName) {
      console.error('下拉框年级选择失败:', { gradeId, gradeName, gradeNames: this.data.gradeNames });
      wx.showToast({
        title: '年级选择失败',
        icon: 'error'
      });
      return;
    }
    
    // 如果选择的是当前年级，直接关闭下拉框
    if (gradeId === this.data.currentGrade) {
      this.closeDropdown();
      return;
    }
    
    try {
      // 保存选择的年级
      wx.setStorageSync('SELECTED_GRADE', gradeId);
      
      // 更新页面数据
      this.setData({
        currentGrade: gradeId,
        currentGradeName: gradeName,
        dropdownOpen: false
      });
      
      // 重新加载个性化数据（检查新年级的学习进度）
      await this.loadPersonalizedData();
      
      // 添加到常用年级
      this.addToFavorites(gradeId, gradeName);
      
      // 显示成功提示
      wx.showToast({
        title: `已切换到${gradeName}`,
        icon: 'success',
        duration: 1500
      });
      
    } catch (error) {
      console.error('切换年级失败:', error);
      wx.showToast({
        title: '切换失败',
        icon: 'error'
      });
    }
  },

  // 检查用户授权状态
  checkUserAuth() {
    try {
      const userInfo = wx.getStorageSync('userInfo');
      const hasUserInfo = !!userInfo;
      
      // 🔧 隐藏登录UI：不再显示授权弹窗，保留静默登录功能
      // 静默登录由 app.js 的 doLogin() 在后台自动执行
      // if (!hasUserInfo) {
      //   this.setData({
      //     showAuthModal: true
      //   });
      // }
    } catch (error) {
      console.error('检查用户授权状态失败:', error);
    }
  },

  // 获取用户信息（授权）- 暂时禁用
  async getUserProfile() {
    // 临时禁用登录功能，避免 getUserProfile TAP gesture 错误
    console.log('登录功能暂时禁用');
    return;
  },

  // 确保用户已登录（获取 openid）
  async ensureLogin() {
    try {
      const { userManager } = require('../../utils/userManager');
      const { getApiUrl } = require('../../utils/apiConfig');
      
      // 检查是否已有 openid
      let openid = userManager.userData.openid || wx.getStorageSync('openid');
      
      if (openid) {
        console.info('用户已登录，openid:', openid.substring(0, 10) + '...');
        return;
      }
      
      // 如果没有 openid，执行登录
      console.info('未找到 openid，开始登录...');
      
      // 获取微信登录凭证
      const loginRes = await new Promise((resolve, reject) => {
        wx.login({
          success: resolve,
          fail: reject
        });
      });

      if (!loginRes.code) {
        throw new Error('获取登录凭证失败');
      }

      // 调用后台接口，通过 code 获取 openid 并注册用户
      const registerRes = await new Promise((resolve, reject) => {
        wx.request({
          url: getApiUrl('/api/users/register'),
          method: 'POST',
          data: {
            code: loginRes.code
          },
          timeout: 10000, // 10秒超时
          success: (res) => {
            if (res.statusCode === 200 && res.data.success) {
              resolve(res.data);
            } else {
              reject(new Error(res.data.message || '登录失败'));
            }
          },
          fail: (error) => {
            // 处理不同类型的错误
            let errorMessage = '登录失败';
            if (error.errMsg) {
              if (error.errMsg.includes('time out') || error.errMsg.includes('timeout')) {
                errorMessage = '连接超时，请检查网络或确认后端服务是否运行';
              } else if (error.errMsg.includes('fail')) {
                errorMessage = '网络请求失败，请检查后端服务地址配置';
              } else {
                errorMessage = `网络错误: ${error.errMsg}`;
              }
            }
            reject(new Error(errorMessage));
          }
        });
      });

      // 保存 openid 到本地存储和 userManager
      if (registerRes.data && registerRes.data.openid) {
        openid = registerRes.data.openid;
        
        // 更新 userManager
        userManager.userData.openid = openid;
        if (registerRes.data.membership) {
          userManager.userData.membership = registerRes.data.membership;
        }
        if (registerRes.data.membershipExpireTime) {
          userManager.userData.membershipExpireTime = registerRes.data.membershipExpireTime;
        }
        userManager.saveUserData();

        // 保存到本地存储（兼容其他可能使用的地方）
        wx.setStorageSync('openid', openid);

        console.info('登录成功，openid:', openid.substring(0, 10) + '...');
      } else {
        throw new Error('登录响应中未包含 openid');
      }
    } catch (error) {
      console.error('确保登录失败:', error);
      throw error; // 抛出错误，让调用者知道登录失败
    }
  },

  // 同步用户信息到后台
  async syncUserInfoToBackend(userInfo) {
    try {
      const { getApiUrl } = require('../../utils/apiConfig');
      const { userManager } = require('../../utils/userManager');
      
      const openid = userManager.userData.openid || wx.getStorageSync('openid');
      
      if (!openid) {
        console.warn('未找到 openid，跳过同步用户信息');
        return;
      }

      await new Promise((resolve, reject) => {
        wx.request({
          url: getApiUrl('/api/users/register'),
          method: 'POST',
          timeout: 10000, // 10秒超时
          data: {
            openid: openid,
            nickname: userInfo.nickName,
            avatar: userInfo.avatarUrl
          },
          success: (res) => {
            if (res.statusCode === 200 && res.data.success) {
              console.info('用户信息同步成功');
              resolve(res.data);
            } else {
              reject(new Error(res.data.message || '同步失败'));
            }
          },
          fail: reject
        });
      });
    } catch (error) {
      // 静默失败，不影响用户使用
      console.warn('同步用户信息失败（不影响使用）:', error.message || error);
    }
  },

  // 关闭授权弹窗
  closeAuthModal() {
    this.setData({
      showAuthModal: false
    });
  },

  // 检查登录状态 - 暂时跳过登录检查
  checkLoginStatus() {
    try {
      // 临时跳过登录检查，假定用户已登录
      console.log('登录检查暂时跳过，假定已登录');
      
      this.setData({
        isLoggedIn: true
      });
      
      return true;
    } catch (error) {
      console.error('检查登录状态失败:', error);
      this.setData({
        isLoggedIn: true // 出错时也假定已登录
      });
      return true;
    }
  },

  // 重新登录（强制重新登录）
  async reLogin() {
    try {
      wx.showLoading({
        title: '正在登录...',
        mask: true
      });

      // 清除旧的登录信息
      const { userManager } = require('../../utils/userManager');
      userManager.userData.openid = null;
      userManager.saveUserData();
      wx.removeStorageSync('openid');

      // 执行登录
      await this.ensureLogin();

      // 更新登录状态
      this.checkLoginStatus();

      wx.hideLoading();
      wx.showToast({
        title: '登录成功',
        icon: 'success',
        duration: 1500
      });

      // 触觉反馈
      wx.vibrateShort({
        type: 'light'
      });
    } catch (error) {
      wx.hideLoading();
      console.error('重新登录失败:', error);
      
      // 根据错误类型显示不同的提示
      let errorMessage = error.message || '登录失败，请重试';
      let showModal = false;
      
      if (errorMessage.includes('超时') || errorMessage.includes('timeout')) {
        errorMessage = '连接超时\n\n可能原因：\n1. 后端服务器未启动\n2. 网络连接问题\n3. API地址配置错误\n\n请检查后端服务是否正常运行';
        showModal = true;
      } else if (errorMessage.includes('网络请求失败') || errorMessage.includes('fail')) {
        errorMessage = '无法连接到服务器\n\n请检查：\n1. 后端服务是否启动\n2. API地址是否正确\n3. 小程序是否配置了合法域名';
        showModal = true;
      }
      
      if (showModal) {
        wx.showModal({
          title: '登录失败',
          content: errorMessage,
          showCancel: false,
          confirmText: '我知道了'
        });
      } else {
        wx.showToast({
          title: errorMessage,
          icon: 'none',
          duration: 3000
        });
      }
    }
  }
});