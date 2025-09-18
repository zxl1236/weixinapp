// pages/learn/index.js
// 新训练流 + SRS
const { getGradeWords, recordTrainedWords } = require('../../utils/gradeWordDatabase.js');
const { learningDataSync } = require('../../utils/learningDataSync.js');

const DAY = 24 * 60 * 60 * 1000;

// 统一音频实例
const innerAudio = wx.createInnerAudioContext();
innerAudio.autoplay = true;

// onOnce：给没有 once 的 API 用
function onOnce(ctx, evt, handler) {
  const on = ctx[`on${evt}`], off = ctx[`off${evt}`];
  if (typeof on !== 'function') return;
  const wrap = (...args) => {
    if (typeof off === 'function') off.call(ctx, wrap);
    handler(...args);
  };
  on.call(ctx, wrap);
}

Page({
  data: {
    // 基础
    gradeId: '', gradeName: '',
    loading: true,
          quantity: 5,          // 接收的学习数量，默改为5便于测试

    // 防抖控制
    isProcessing: false,   // 防止重复点击
    lastActionTime: 0,     // 上次操作时间
    isTransitioning: false,// 防止页面切换时的操作

    // 分组学习状态
    currentGroup: 1,       // 当前学习组（1, 2, 3, 4, 5...）
        totalGroups: 20,        // 总组数（96/5 = 20组）
    currentPhase: 1,       // 当前阶段（1-2）
          currentWordIndex: 0,   // 当前组内单词索引（0-4）
    
    // 学习组数据
    learningGroups: [],    // 所有分组的单词数据
    currentGroupWords: [], // 当前组的单词列表
    currentWord: null,     // 当前正在学习的单词

    // 简化阶段状态：认识阶段(phase0) + 2个学习阶段
    // phase0: 认识筛选, phase1: 认读练习, phase2: 巩固练习
    wordPhaseStatus: {},   // {wordId: {phase0: 'unknown'|'mastered'|'needLearning', phase1: true, phase2: true}}
    
    // 认识阶段相关
    recognitionDone: 0,           // 已完成认识判断的单词数量
    recognizedWords: [],          // 被标记为"认识"的单词列表
    needLearningWords: [],        // 需要学习的单词列表
    isRecognitionPhase: true,     // 当前是否在认识阶段
    
    // 过滤结果统计界面
    showFilterResult: false,     // 是否显示过滤结果统计界面
    masteredWords: [],           // 已掌握的单词列表
    masteredCount: 0,            // 已掌握单词数量
    needLearningCount: 0,         // 需要学习单词数量
    
    // 统计
    sessionTarget: 5,      // 当前组的学习数量
    sessionDone: 0,
    dueCount: 0,
    
    // 暂停功能
    isPaused: false,
    pauseTime: null,



    // 四选一阶段
    choiceOptions: [],
    selectedAnswer: '',
    choiceCorrect: false,
    
    // 跟读阶段
    isPlaying: false,
    hasListened: false,
    
    // 中译英填空阶段
    userInput: '',
    showHint: false,
    fillCorrect: false,


    // 音频
    audioCache: {},

    // 计时
    _startTs: 0,

    // 数据同步
    sessionStartTime: 0,
    phaseAttempts: 0,
  },

  /* ================= 数据同步功能 ================= */
  
  // 📊 获取同步状态摘要
  getSyncStatusSummary() {
    try {
      const { currentGroupWords } = this.data;
      if (!currentGroupWords || currentGroupWords.length === 0) {
        return { mistakeCount: 0, sessionCount: 0, masteredCount: 0 };
      }

      // 统计生词本中的学习记录
      const mistakeBook = wx.getStorageSync('mistakeBook') || {};
      const mistakeCount = currentGroupWords.filter(word => 
        mistakeBook[word.word] && !mistakeBook[word.word].mastered
      ).length;

      // 从同步系统获取学习记录
      const sessionHistory = learningDataSync.getLearningSessionHistory();
      const sessionCount = sessionHistory.filter(session => 
        currentGroupWords.some(word => word.word === session.word)
      ).length;

      // 统计掌握的单词数量
      const wordMasteryMap = learningDataSync.getWordMasteryMap();
      const masteredCount = currentGroupWords.filter(word => {
        const mastery = wordMasteryMap[word.word];
        return mastery && (mastery.masteryLevel === 'mastered' || mastery.masteryLevel === 'expert');
      }).length;

      return { mistakeCount, sessionCount, masteredCount };
    } catch (error) {
      console.error('获取同步状态失败:', error);
      return { mistakeCount: 0, sessionCount: 0, masteredCount: 0 };
    }
  },

  // 📋 显示详细同步状态
  // 显示菜单选项
  showMenuOptions() {
    try {
      wx.showActionSheet({
        itemList: [
          '📊 学习统计',
          '🔄 重新开始',
          '📖 查看生词本',
          '📅 学习日历', 
          '📊 学习进度',
          '🔄 返回首页'
        ],
        success: (res) => {
          if (res.tapIndex === 0) {
            // 学习统计
            this.showSyncStatusDetails();
          } else if (res.tapIndex === 1) {
            // 重新开始
            if (this.data.currentPhase > 1) {
              this.forceRestartLearning();
            } else {
              wx.showToast({ title: '已是初始状态', icon: 'none' });
            }
          } else if (res.tapIndex === 2) {
            // 查看生词本
            wx.navigateTo({
              url: '/pages/mistake/mistake'
            });
          } else if (res.tapIndex === 3) {
            // 查看学习日历
            wx.navigateTo({
              url: '/pages/calendar/calendar'
            });
          } else if (res.tapIndex === 4) {
            // 查看学习进度
            wx.navigateTo({
              url: '/pages/profile/profile'
            });
          } else if (res.tapIndex === 5) {
            // 返回首页
            wx.navigateBack();
          }
        }
      });
    } catch (error) {
      console.error('显示菜单选项失败:', error);
    }
  },

  showSyncStatusDetails() {
    try {
      const { currentGroupWords, gradeId, gradeName } = this.data;
      
      wx.showActionSheet({
        itemList: [
          '📖 查看生词本',
          '📅 查看学习日历', 
          '📊 查看学习进度',
          '🔄 返回训练页面',
          '⏸️ 暂停学习'
        ],
        success: (res) => {
          switch (res.tapIndex) {
            case 0: // 查看生词本
              wx.navigateTo({
                url: `/pages/mistake/mistake?from=learning&grade=${gradeId}&gradeName=${encodeURIComponent(gradeName)}`
              });
              break;
            case 1: // 查看学习日历
              wx.navigateTo({
                url: `/pages/calendar/calendar?from=learning&grade=${gradeId}&gradeName=${encodeURIComponent(gradeName)}`
              });
              break;
            case 2: // 查看学习进度
              this.showProgressDetails();
              break;
            case 3: // 返回训练页面
              wx.navigateBack();
              break;
            case 4: // 暂停学习
              this.pauseLearning();
              break;
          }
        }
      });
    } catch (error) {
      console.error('显示同步状态详情失败:', error);
      wx.showToast({
        title: '获取状态失败',
        icon: 'error'
      });
    }
  },

  // 📈 显示学习进度详情
  showProgressDetails() {
    try {
      const { currentGroupWords, gradeId } = this.data;
      const wordMasteryMap = learningDataSync.getWordMasteryMap();
      const gradeProgress = learningDataSync.getGradeLearningProgress(gradeId);
      
      // 统计当前组单词的掌握情况
      const groupStats = {
        new: 0,
        learning: 0, 
        familiar: 0,
        mastered: 0,
        expert: 0
      };

      currentGroupWords.forEach(word => {
        const mastery = wordMasteryMap[word.word];
        if (mastery) {
          groupStats[mastery.masteryLevel] = (groupStats[mastery.masteryLevel] || 0) + 1;
        } else {
          groupStats.new++;
        }
      });

      const content = `📊 当前组掌握情况：\n` +
        `🆕 新学：${groupStats.new}个\n` +
        `📖 学习中：${groupStats.learning}个\n` +
        `👍 熟悉：${groupStats.familiar}个\n` +
        `✅ 掌握：${groupStats.mastered}个\n` +
        `🏆 精通：${groupStats.expert}个\n\n` +
        `🎯 年级总进度：\n` +
        `总词汇：${gradeProgress.total}个\n` +
        `已掌握：${gradeProgress.mastered + gradeProgress.expert}个\n` +
        `需复习：${gradeProgress.needReview}个`;

      wx.showModal({
        title: '学习进度详情',
        content: content,
        showCancel: false,
        confirmText: '继续',
        success: () => {
          // 用户选择继续学习，检查是否有下一组
          if (this.data.currentGroup < this.data.totalGroups) {
            this.startNextGroup();
          } else {
            wx.navigateBack();
          }
        }
      });
    } catch (error) {
      console.error('显示进度详情失败:', error);
      wx.showToast({
        title: '获取进度失败',
        icon: 'error'
      });
    }
  },
  
  // 🎯 记录学习进展到统一数据源
  recordLearningSync(word, phaseType, success, userAnswer = '', correctAnswer = '') {
    // 兜底：把传入的 word 统一规范为字符串 id
    const wordId = (word && typeof word === 'object')
      ? (word.id || word.word || '')
      : (word || '');
    if (!wordId || !phaseType) return;
    
    try {
      // 计算会话时长
      const duration = Date.now() - (this.data.sessionStartTime || Date.now());
      
      // 增加尝试次数
      this.setData({ phaseAttempts: this.data.phaseAttempts + 1 });
      
      // 记录到同步系统
      const result = learningDataSync.recordWordProgress(
        {
          word: wordId,
          gradeId: this.data.gradeId,
          gradeName: this.data.gradeName
        },
        phaseType,
        success,
        {
          userAnswer,
          correctAnswer,
          questionType: phaseType,
          duration,
          attempts: this.data.phaseAttempts,
          extra: {
            sessionId: `session_${this.data.sessionStartTime}`,
            currentGroup: this.data.currentGroup
          }
        }
      );
      
      if (result.success) {
        console.log(`✅ 数据同步成功: ${word} - ${phaseType} - ${success ? '正确' : '错误'}`);
        
        // 如果是新学内容，显示提示
        if (result.isNewLearning) {
          this.showNewLearningTip(phaseType);
        }
      }
      
      // 保持现有的记录方法（向后兼容）
      if (!success) {
        this.recordWord(word, userAnswer, correctAnswer, phaseType);
      }
      
      this.recordLearningProgress(word, success ? 3 : 0, phaseType);
      
      // 如果成功，重置尝试次数
      if (success) {
        this.setData({ phaseAttempts: 0 });
      }
      
    } catch (error) {
      console.error('记录学习进展失败:', error);
    }
  },
  
  // 💡 显示新学提示
  showNewLearningTip(phaseType) {
    const phaseNames = {
      phase1: '四选一',
      phase2: '巩固'
    };
    
    wx.showToast({
      title: `🎉 ${phaseNames[phaseType]}学会了!`,
      icon: 'success',
      duration: 1500
    });
  },

  /* ================= 防抖辅助函数 ================= */
  
  // 防抖检查：防止快速重复点击
  canPerformAction(actionName = 'default', minInterval = 800) {
    const now = Date.now();
    const timeSinceLastAction = now - this.data.lastActionTime;
    
    if (this.data.isProcessing) {
      console.log(`[防抖] ${actionName} 被阻止 - 正在处理中`);
      return false;
    }
    
    if (this.data.isTransitioning) {
      console.log(`[防抖] ${actionName} 被阻止 - 页面正在切换`);
      return false;
    }
    
    if (timeSinceLastAction < minInterval) {
      console.log(`[防抖] ${actionName} 被阻止 - 操作过于频繁 (${timeSinceLastAction}ms < ${minInterval}ms)`);
      return false;
    }
    
    // 设置防抖状态
    this.setData({ 
      isProcessing: true,
      lastActionTime: now 
    });
    
    console.log(`[防抖] ${actionName} 允许执行`);
    return true;
  },
  
  // 重置防抖状态
  resetActionState() {
    this.setData({ isProcessing: false });
  },

  // 批量更新数据，减少setData调用次数
  batchUpdateData(updates) {
    // 合并所有更新到一次setData调用中
    this.setData(updates);
  },



  /* ================= 生命周期 ================= */
  onLoad(options) {
    // 初始化学习页面
    
    const gradeId = options.grade || '';
    const gradeName = decodeURIComponent(options.gradeName || '');
    const quantity = parseInt(options.quantity) || 30;  // 接收学习数量参数
    this.setData({ 
      gradeId, 
      gradeName, 
      quantity,
      sessionStartTime: Date.now() // 初始化会话开始时间
    });
    this.bootstrap();
  },

  async bootstrap() {
    try {
      wx.showLoading({ title: '加载词汇中...' });

      // 加载所有单词
      const allWords = getGradeWords(this.data.gradeId, 1000, 'training') || [];
      if (!allWords.length) {
        wx.hideLoading();
        wx.showModal({ title: '暂无词汇', content: '该年级暂无可用词汇', showCancel: false, success:()=>wx.navigateBack() });
        return;
      }

      // 规范化单词数据
      this.allWords = allWords.map(w => ({
        id: w.id || w.word,
        word: w.word,
        phonetic: w.phonetic || '',
        meaning: w.meaning || '',
        examples: w.examples || [],
        wordType: this.getWordType(w.word, w.meaning)
      }));

      // 获取学习数量参数
      const quantity = this.data.quantity || 5;
      
      // 创建学习分组（会自动过滤已掌握的单词）
      this.createLearningGroups(quantity);
      
      // 尝试恢复学习进度
      const hasProgress = this.loadGroupLearningProgress();
      
      if (!hasProgress) {
        // 开始新的学习，从第1组第1阶段开始
        this.startNewGroupLearning();
      } else {
        // 检测到已有进度，询问用户是否继续或重新开始
        this.checkProgressAndConfirm();
      }

      // 准备当前单词的训练内容
      this.prepareCurrentWord();

      // 确保加载状态被正确重置
      this.setData({ loading: false });
      wx.hideLoading();
      
      console.log('学习页面初始化完成', {
        gradeId: this.data.gradeId,
        totalGroups: this.data.totalGroups,
        currentGroup: this.data.currentGroup,
        currentPhase: this.data.currentPhase,
        phase: this.data.phase,
        currentWord: this.data.currentWord?.word,
        loading: this.data.loading
      });

      // 第一次预热：当前词 + 接下来几个
      const firstWarm = [];
      if (this.data.currentWord?.word) firstWarm.push(this.data.currentWord.word);
      firstWarm.push(...this._getUpcomingWords(this._prefetchCfg().nextCount));
      this.prefetchWords(firstWarm);
    } catch (e) {
      wx.hideLoading();
      this.setData({ loading: false });
      console.error('学习初始化失败:', e);
      wx.showModal({ title:'加载失败', content:'词汇加载失败，请重试', showCancel:false, success:()=>wx.navigateBack() });
    }
  },

  /* ================= 分组学习管理 ================= */
  
  // 获取已掌握的单词列表
  getMasteredWords() {
    try {
      const masteredKey = `MASTERED_WORDS_${this.data.gradeId}`;
      const masteredWords = wx.getStorageSync(masteredKey) || [];
      console.log('从存储中获取已掌握单词:', masteredWords);
      return masteredWords;
    } catch (e) {
      console.error('获取已掌握单词失败:', e);
      return [];
    }
  },
  
  // 保存已掌握的单词
  saveMasteredWord(wordId) {
    try {
      const masteredKey = `MASTERED_WORDS_${this.data.gradeId}`;
      const masteredWords = this.getMasteredWords();
      
      if (!masteredWords.includes(wordId)) {
        masteredWords.push(wordId);
        wx.setStorageSync(masteredKey, masteredWords);
        console.log(`单词 ${wordId} 已保存到已掌握列表`);
      }
    } catch (e) {
      console.error('保存已掌握单词失败:', e);
    }
  },
  
  // 创建学习分组
  createLearningGroups(quantity) {
    // 获取已掌握的单词列表
    const masteredWords = this.getMasteredWords();
    console.log('已掌握的单词:', masteredWords);
    
    // 过滤掉已掌握的单词
    const availableWords = this.allWords.filter(word => {
      const wordId = word.id || word.word;
      return !masteredWords.includes(wordId);
    });
    
    console.log(`总单词数: ${this.allWords.length}, 已掌握: ${masteredWords.length}, 待学习: ${availableWords.length}`);
    
    if (availableWords.length === 0) {
      wx.showModal({
        title: '学习完成',
        content: '恭喜！您已经掌握了所有单词！',
        showCancel: false,
        success: () => wx.navigateBack()
      });
      return;
    }
    
    // 按词性优先级排序：名词 > 动词 > 形容词 > 短语
    const wordTypeOrder = { 'noun': 1, 'verb': 2, 'adjective': 3, 'phrase': 4 };
    
    // 对可用单词按词性排序
    const sortedWords = [...availableWords].sort((a, b) => {
      const orderA = wordTypeOrder[a.wordType] || 5;
      const orderB = wordTypeOrder[b.wordType] || 5;
      
      if (orderA !== orderB) {
        return orderA - orderB;
      }
      
      // 同词性内按字母顺序排序
      return a.word.localeCompare(b.word);
    });
    
    const groupSize = quantity;
    const totalGroups = Math.ceil(sortedWords.length / groupSize);
    
    const learningGroups = [];
    for (let i = 0; i < totalGroups; i++) {
      const startIndex = i * groupSize;
      const endIndex = Math.min(startIndex + groupSize, sortedWords.length);
      const groupWords = sortedWords.slice(startIndex, endIndex);
      
      learningGroups.push({
        groupId: i + 1,
        words: groupWords,
        completed: false
      });
    }

    // 更新排序后的单词列表
    this.words = sortedWords;

      this.setData({
      learningGroups,
      totalGroups,
      sessionTarget: quantity
    });
    
    console.log(`创建了${totalGroups}个学习组，每组${groupSize}个单词`);
    console.log('单词按词性排序：名词→动词→形容词→短语');
  },
  
  // 开始新的分组学习
  startNewGroupLearning() {
    // 初始化所有单词的阶段状态
    const wordPhaseStatus = {};
    if (this.words && Array.isArray(this.words)) {
      this.words.forEach(word => {
        wordPhaseStatus[word.id] = {
          phase0: 'unknown',  // 认识筛选：unknown | mastered | needLearning
          phase1: false,      // 认读练习
          phase2: false       // 巩固练习
        };
      });
    }
    
    const firstGroupWords = this.data.learningGroups[0]?.words || [];
    const firstWord = firstGroupWords[0] || null;
    
    this.setData({
      currentGroup: 1,
      currentPhase: 0,            // 从认识阶段开始
      currentWordIndex: 0,
      wordPhaseStatus,
      currentGroupWords: firstGroupWords,
      currentWord: firstWord,
      isRecognitionPhase: true,
      recognitionDone: 0,
      recognizedWords: [],
      needLearningWords: [],
      phase: 'phase0',
      phaseLabel: this.getPhaseLabel(0),
      loading: false
    });
    
    console.log('开始新的分组学习，从认识阶段开始', {
      currentGroup: 1,
      currentPhase: 0,
      totalGroups: this.data.totalGroups,
      groupWords: this.data.learningGroups[0]?.words.length
    });

    // 第一次预热：当前词 + 接下来几个
    const firstWarm = [];
    if (this.data.currentWord?.word) firstWarm.push(this.data.currentWord.word);
    firstWarm.push(...this._getUpcomingWords(this._prefetchCfg().nextCount));
    this.prefetchWords(firstWarm);
  },
  
  // 分析学习进度，确定当前应该学习的组和阶段
  analyzeActualProgress(wordPhaseStatus) {
    const { learningGroups } = this.data;
    
    // 遍历所有组，找到第一个未完全完成的组
    for (let groupIndex = 0; groupIndex < learningGroups.length; groupIndex++) {
      const group = learningGroups[groupIndex];
      const groupNumber = groupIndex + 1;
      
      // 检查这个组的完成状态
      let phase0Complete = true;
      let phase1Complete = true; 
      let phase2Complete = true;
      
      // 检查每个单词的各个阶段完成状态
      for (const word of group.words) {
        const wordId = word.id || word.word;
        const status = wordPhaseStatus[wordId] || {};
        
        if (status.phase0 !== 'mastered' && status.phase0 !== 'needLearning') {
          phase0Complete = false;
        }
        if (!status.phase1) phase1Complete = false;
        if (!status.phase2) phase2Complete = false;
      }
      
      // 确定当前应该学习的阶段
      let currentPhase;
      let isRecognitionPhase = false;
      
      if (!phase0Complete) {
        currentPhase = 0;
        isRecognitionPhase = true;
      } else if (!phase1Complete) {
        currentPhase = 1;
      } else if (!phase2Complete) {
        currentPhase = 2;
      } else {
        // 这个组完全完成了，继续下一组
        continue;
      }
      
      // 找到第一个需要学习当前阶段的单词
      let currentWordIndex = 0;
      for (let i = 0; i < group.words.length; i++) {
        const word = group.words[i];
        const wordId = word.id || word.word;
        const status = wordPhaseStatus[wordId] || {};
        
        if (currentPhase === 0) {
          if (status.phase0 !== 'mastered' && status.phase0 !== 'needLearning') {
            currentWordIndex = i;
            break;
          }
        } else {
          if (!status[`phase${currentPhase}`]) {
            currentWordIndex = i;
            break;
          }
        }
      }
      
      return {
        currentGroup: groupNumber,
        currentPhase,
        currentWordIndex,
        isRecognitionPhase
      };
    }
    
    // 所有组都完成了，返回最后一组
    return {
      currentGroup: learningGroups.length,
      currentPhase: 4,
      currentWordIndex: 0,
      isRecognitionPhase: false
    };
  },

  // 加载分组学习进度
  loadGroupLearningProgress() {
    try {
      const progressKey = `GROUP_LEARNING_${this.data.gradeId}`;
      const savedProgress = wx.getStorageSync(progressKey);
      
      if (savedProgress && savedProgress.wordPhaseStatus) {
        // 分析实际的学习进度
        const actualProgress = this.analyzeActualProgress(savedProgress.wordPhaseStatus);
        
        console.log('分析的实际进度:', actualProgress);
        console.log('保存的进度信息:', {
          currentGroup: savedProgress.currentGroup,
          currentPhase: savedProgress.currentPhase,
          currentWordIndex: savedProgress.currentWordIndex
        });
        
        // 设置正确的phase和phaseLabel
        const phase = actualProgress.currentPhase === 0 ? 'phase0' : `phase${actualProgress.currentPhase}`;
        const phaseLabel = this.getPhaseLabel(actualProgress.currentPhase);
        
        this.setData({
          currentGroup: actualProgress.currentGroup,
          currentPhase: actualProgress.currentPhase,
          currentWordIndex: actualProgress.currentWordIndex,
          phase: phase,
          phaseLabel: phaseLabel,
          // 认出中文，读对英文
          wordPhaseStatus: savedProgress.wordPhaseStatus,
          isRecognitionPhase: actualProgress.isRecognitionPhase,
          isPaused: savedProgress.isPaused || false,
          pauseTime: savedProgress.pauseTime || null,
          loading: false
        });
        
        // 设置当前组的单词
        const currentGroupData = this.data.learningGroups[actualProgress.currentGroup - 1];
        if (currentGroupData) {
          this.setData({ currentGroupWords: currentGroupData.words });
        }
        
        console.log('恢复学习进度到:', actualProgress);
        return true;
      }
      
      return false;
    } catch (e) {
      console.error('加载学习进度失败:', e);
      return false;
    }
  },
  
  // 保存分组学习进度
  saveGroupLearningProgress() {
    try {
      const progressKey = `GROUP_LEARNING_${this.data.gradeId}`;
      const progressData = {
        currentGroup: this.data.currentGroup,
        currentPhase: this.data.currentPhase,
        currentWordIndex: this.data.currentWordIndex,
        wordPhaseStatus: this.data.wordPhaseStatus,
        isPaused: this.data.isPaused,
        pauseTime: this.data.pauseTime,
        timestamp: Date.now()
      };
      
      try {
        wx.setStorageSync(progressKey, progressData);
        console.log('保存学习进度成功');
      } catch (error) {
        console.error('保存学习进度失败:', error);
        wx.showToast({
          title: '保存失败，请重试',
          icon: 'error'
        });
      }
    } catch (e) {
      console.error('保存学习进度失败:', e);
    }
  },

  /* ================= 工具 ================= */
  
  buildTTSUrl(text, type = 1) {
    const q = encodeURIComponent(String(text || '').trim());
    return `https://dict.youdao.com/dictvoice?audio=${q}&type=${type}`;
  },

  playLocal(filePath) {
    return new Promise((resolve, reject) => {
      innerAudio.stop();
      innerAudio.src = filePath;

      onOnce(innerAudio, 'Play', () => resolve());
      onOnce(innerAudio, 'Error', (e) => reject(e));
      // 结束后复位播放状态
      onOnce(innerAudio, 'Ended', () => this.setData({ isPlaying: false }));
      onOnce(innerAudio, 'Stop',  () => this.setData({ isPlaying: false }));

      // 启播
      try { innerAudio.play(); } catch (e) { /* 某些版本autoplay足够 */ }
    });
  },

  async downloadTTS(text, type = 1) {
    const url = this.buildTTSUrl(text, type);

    // 轻校验：必须 200 且 Content-Type 以 audio/ 开头
    const ok = await new Promise((resolve) => {
      wx.request({
        url,
        method: 'GET',
        responseType: 'arraybuffer',
        success: (res) => {
          const ct = (res.header['Content-Type'] || res.header['content-type'] || '').toLowerCase();
          resolve(res.statusCode === 200 && ct.startsWith('audio/'));
        },
        fail: () => resolve(false)
      });
    });
    if (!ok) throw new Error('TTS not audio or 200');

    return new Promise((resolve, reject) => {
      wx.downloadFile({
        url,
        success: (df) => df.statusCode === 200 ? resolve(df.tempFilePath)
                                               : reject(new Error('download fail ' + df.statusCode)),
        fail: reject
      });
    });
  },

  labelOf(phase){ return {warmup:'热身', learn:'新词', mixed:'交错复习', final:'收官测', done:'完成'}[phase] || ''; },
  shuffle(a){ 
    if (!a || !Array.isArray(a)) return [];
    return a.map(x=>[Math.random(),x]).sort((p,q)=>p[0]-q[0]).map(p=>p[1]); 
  },
  interleave(arr, gap=2){ 
    if (!arr || !Array.isArray(arr)) return [];
    const res=[]; arr.forEach((x,i)=>{ const pos=Math.min(res.length,i*gap); res.splice(pos,0,x); }); return res; 
  },
  makeChoices(correct) {

    
    // 先尝试从原始学习组获取选项（包含所有单词，包括已掌握的）
    let availableMeanings = [];
    
    // 优先从当前组的原始单词列表获取选项
    const currentGroupIndex = this.data.currentGroup - 1;
    const originalGroupWords = this.data.learningGroups && this.data.learningGroups[currentGroupIndex] 
      ? this.data.learningGroups[currentGroupIndex].words : null;
    

    
    if (originalGroupWords && originalGroupWords.length > 0) {
      availableMeanings = originalGroupWords
        .map(w => w.meaning)
        .filter(m => m && m !== correct);

    }
    
    // 如果原始组选项不够，再尝试当前组（筛选后的）
    if (availableMeanings.length < 3 && this.data.currentGroupWords && this.data.currentGroupWords.length > 0) {
      const currentGroupMeanings = this.data.currentGroupWords
        .map(w => w.meaning)
        .filter(m => m && m !== correct && !availableMeanings.includes(m));
      
      availableMeanings = [...availableMeanings, ...currentGroupMeanings];

    }
    
    // 如果还是不够，使用全局词库
    if (availableMeanings.length < 3) {

      if (!this.words || !Array.isArray(this.words)) {
        console.error('makeChoices: this.words未正确设置，this.words:', this.words);
        const placeholders = ['选项A', '选项B', '选项C'];
        const choices = this.shuffle([correct, ...placeholders.slice(0, 3)]);
        return choices;
      }
      
      const globalMeanings = this.words
        .map(w => w.meaning)
        .filter(m => m && m !== correct && !availableMeanings.includes(m));
      
      availableMeanings = [...availableMeanings, ...globalMeanings];

    }
    
    // 生成最终选项
    if (availableMeanings.length < 3) {

      // 补充占位符
      while (availableMeanings.length < 3) {
        availableMeanings.push(`选项${availableMeanings.length + 1}`);
      }
    }
    
    const ds = this.shuffle(availableMeanings).slice(0, 3);
    const choices = this.shuffle([correct, ...ds]);
    

    return choices;
  },
  
  /* ================= 单词和阶段管理 ================= */
  
  // 准备当前单词
  prepareCurrentWord() {
    const currentWord = this.getCurrentWord();
    if (!currentWord) {
      console.warn('没有当前单词可用');
      console.log('当前数据状态:', {
        currentGroupWords: this.data.currentGroupWords,
        currentWordIndex: this.data.currentWordIndex,
        phase: this.data.phase,
        loading: this.data.loading
      });
      
      // 如果没有当前单词，尝试重新初始化
      if (this.data.currentGroupWords && this.data.currentGroupWords.length > 0) {
        const firstWord = this.data.currentGroupWords[0];
        this.setData({ 
          currentWord: firstWord,
          currentWordIndex: 0,
          loading: false
        });
        this.prepareCurrentPhase(firstWord);
      } else {
        // 如果确实没有单词，显示错误
        this.setData({ loading: false });
        wx.showModal({
          title: '没有可学习的单词',
          content: '当前组没有可用的单词，请重新选择学习内容',
          showCancel: false,
          success: () => wx.navigateBack()
        });
      }
      return;
    }
    
    this.setData({ currentWord, loading: false });
    this.prepareCurrentPhase(currentWord);
  },
  
  // 获取当前单词
  getCurrentWord() {
    const { currentGroupWords, currentWordIndex } = this.data;
    return currentGroupWords[currentWordIndex] || null;
  },
  
  // 获取阶段标签
  getPhaseLabel(phase) {
    const labels = {
      0: '认出中文，读对英文',
      1: '认读练习',
      2: '巩固练习'
    };
    return labels[phase] || `第${phase}阶段`;
  },

  /* ================= 热身阶段 ================= */
  prepareWarmup(word){
    // 热身用简单的英文→中文选择题
    const choiceOptions = this.makeChoices(word.meaning);
    this.setData({ 
      choiceOptions, 
      userInput: '', 
      showHint: false, 
      selectedAnswer: '' 
    });
  },

  /* ================= 新词微循环 ================= */
  prepareLearn(word){
    // 重置所有步骤状态
    this.setData({ 
      learnStep: 1,
      choiceOptions: this.makeChoices(word.meaning),
      selectedAnswer: '',
      choiceCorrect: false,
      hasListened: false,
      userInput: '',
      showHint: false,
      fillCorrect: false
    });
  },

  /* ================= 四个阶段管理 ================= */
  
  // 初始化四个阶段的进度
  initializePhaseProgress() {
    // 确保this.words已经设置
    if (!this.words || !Array.isArray(this.words)) {
      console.warn('initializePhaseProgress: this.words未正确设置');
      return;
    }
    
    const phaseProgress = {
      phase1: { completed: 0, total: this.words.length, words: [] },
      phase2: { completed: 0, total: this.words.length, words: [] },
      phase3: { completed: 0, total: this.words.length, words: [] },
      phase4: { completed: 0, total: this.words.length, words: [] }
    };

    // 从本地存储读取已完成的阶段进度
    const storedProgress = wx.getStorageSync(`PHASE_PROGRESS_${this.data.gradeId}`) || {};
    
    Object.keys(phaseProgress).forEach(phase => {
      if (storedProgress[phase]) {
        phaseProgress[phase] = { ...storedProgress[phase] };
      }
    });

    this.setData({ phaseProgress });
    console.log('阶段进度初始化完成:', phaseProgress);
  },

  // 获取当前阶段需要训练的单词
  getCurrentPhaseWords() {
    const currentPhase = `phase${this.data.currentPhase}`;
    const phaseData = this.data.phaseProgress[currentPhase];
    
    if (!phaseData) return [];

    // 如果当前阶段已完成，返回空数组
    if (phaseData.completed >= phaseData.total) {
      return [];
    }

    // 简化逻辑：直接返回所有单词，让训练逻辑处理进度
    return this.words;
  },

  // 进入下一阶段
  advanceToNextPhase() {
    const nextPhase = this.data.currentPhase + 1;
    
    if (nextPhase <= 2) {
      // 进入下一个训练阶段
      this.setData({ 
        currentPhase: nextPhase,
        phase: `phase${nextPhase}`,
        phaseLabel: this.getPhaseLabel(nextPhase)
      });
      
      // 重新加载当前阶段的单词
      // 注意：避免无限递归，使用setTimeout
      setTimeout(() => {
        this.bootstrap();
      }, 100);
    } else {
      this.bootstrap();
    }
  },

  // 自动判断词性（简单规则）
  getWordType(word, meaning) {
    // 优先检查是否为短语（多个单词组合）
    if (word.includes(' ') || word.includes('-')) {
      return 'phrase';
    }
    
    // 检查含义中的词性提示
    if (meaning.includes('短语') || meaning.includes('词组')) return 'phrase';
    
    // 动词识别（扩展关键词）
    if (meaning.includes('着') || meaning.includes('了') || meaning.includes('过') || 
        meaning.includes('做') || meaning.includes('进行') || meaning.includes('执行') ||
        meaning.includes('去') || meaning.includes('来') || meaning.includes('走') ||
        meaning.includes('跑') || meaning.includes('看') || meaning.includes('听') ||
        meaning.includes('说') || meaning.includes('吃') || meaning.includes('喝')) {
      return 'verb';
    }
    
    // 形容词识别（扩展关键词）
    if (meaning.includes('的') || meaning.includes('地') || 
        meaning.includes('很') || meaning.includes('非常') ||
        meaning.includes('漂亮') || meaning.includes('好') || meaning.includes('坏') ||
        meaning.includes('大') || meaning.includes('小') || meaning.includes('高') ||
        meaning.includes('矮') || meaning.includes('长') || meaning.includes('短')) {
      return 'adjective';
    }
    
    // 默认为名词
    return 'noun';
  },

  // 根据当前阶段准备训练内容
  prepareCurrentPhase(word) {
    if (!word) return;
    
    const currentPhase = this.data.currentPhase;
    const phaseLabel = this.getPhaseLabel(currentPhase);
    
    // 重置阶段相关状态
    this.setData({
      phase: `phase${currentPhase}`,
      phaseLabel,
      selectedAnswer: '',
      choiceCorrect: false,
      hasListened: false,
      userInput: '',
      showHint: false,
      fillCorrect: false
    });
    
    switch (currentPhase) {
      case 1: // 第一阶段：四选一
        this.preparePhase1(word);
        break;
      case 2: // 第二阶段：跟读
        this.preparePhase2(word);
        break;
      case 3: // 第三阶段：汉译英拼写
        this.preparePhase3(word);
        break;
    }
    
    console.log(`准备${phaseLabel}:`, word.word);
  },

  // 准备第一阶段：四选一
  preparePhase1(word) {
    const choiceOptions = this.makeChoices(word.meaning);
    this.setData({ choiceOptions });
  },

  // 准备第二阶段：跟读
  preparePhase2(word) {
    // 跟读阶段只需要重置监听状态
    this.setData({
      hasListened: false,
      isPlaying: false
    });
  },

  // 准备第三阶段：汉译英拼写
  preparePhase3(word) {
    this.setData({
      userInput: '',
      showHint: false,
      fillCorrect: false
    });
  },


  /* ================= 阶段完成和流转 ================= */
  
  // 完成当前阶段，按阶段学习模式进入下一个单词或下一个阶段
  completeCurrentPhase() {
    const { currentWord, currentPhase } = this.data;
    
    if (!currentWord) {
      console.warn('completeCurrentPhase: 没有当前单词');
      return;
    }
    
    // 防抖检查 - 如果正在过渡中则跳过，但允许正常的学习流程
    if (this.data.isTransitioning) {
      console.log('[防抖] completeCurrentPhase 被阻止 - 页面正在切换');
      return;
    }
    
    // 设置防抖状态，防止重复调用
    this.setData({ isProcessing: true });
    
    console.log(`完成阶段${currentPhase}: ${currentWord.word}`);
    
    // 标记当前单词的当前阶段为已完成
    const wordId = currentWord.id || currentWord.word;
    const wordStatus = this.data.wordPhaseStatus[wordId] || {};
    const currentPhaseKey = `phase${currentPhase}`;
    wordStatus[currentPhaseKey] = true;
    
    // 更新单词阶段状态
    const newWordPhaseStatus = { ...this.data.wordPhaseStatus };
    newWordPhaseStatus[wordId] = wordStatus;
    this.setData({ wordPhaseStatus: newWordPhaseStatus });
    
    // 调用nextWord来处理下一步逻辑
    this.nextWord();
    
    // 保存进度
    this.saveGroupLearningProgress();
    
    // 延迟重置防抖状态，确保页面切换稳定
    setTimeout(() => {
      this.resetActionState();
    }, 500);
  },
  
  // 进入下一个阶段（同一个单词）
  moveToNextPhase() {
    const nextPhase = this.data.currentPhase + 1;
    if (nextPhase <= 2) {
      this.setData({ currentPhase: nextPhase });
      this.prepareCurrentWord();
      console.log(`进入第${nextPhase}阶段:`, this.data.currentWord.word);
    }
  },
  
  // 进入下一个单词
  moveToNextWord() {
    const { currentWordIndex, currentGroupWords, currentGroup, totalGroups } = this.data;
    const nextWordIndex = currentWordIndex + 1;
    
    if (nextWordIndex < currentGroupWords.length) {
      // 当前组还有单词，继续学习
      this.setData({
        currentWordIndex: nextWordIndex,
        currentPhase: 1 // 重置到第一阶段
      });
      this.prepareCurrentWord();
      console.log(`进入下一个单词:`, currentGroupWords[nextWordIndex].word);
    } else {
      // 当前组完成，检查是否还有下一组
      this.completeCurrentGroup();
    }
  },
  
  // 完成当前组
  completeCurrentGroup() {
    const { currentGroup, totalGroups, masteredWords, needLearningWords } = this.data;
    
    wx.showToast({
      title: `第${currentGroup}组完成！`,
      icon: 'success',
      duration: 2000
    });
    
    // 获取同步状态信息
    this.updateGroupCompletionProgress(); // 确保进度已更新
    const syncStatus = this.getSyncStatusSummary();
    
    // 累计数据：将当前组的单词添加到累计列表中
    this.accumulateGroupData(masteredWords, needLearningWords);
    
    if (currentGroup < totalGroups) {
      // 还有下一组，开始下一组的过滤
            this.startNextGroup();
    } else {
      // 所有组都完成了
      this.completeAllLearning();
    }
  },

  // 累计组数据
  accumulateGroupData(masteredWords, needLearningWords) {
    // 获取累计数据
    const accumulatedMastered = wx.getStorageSync('ACCUMULATED_MASTERED_WORDS') || [];
    const accumulatedNeedLearning = wx.getStorageSync('ACCUMULATED_NEED_LEARNING_WORDS') || [];
    
    // 添加当前组的数据
    const newMastered = [...accumulatedMastered, ...masteredWords];
    const newNeedLearning = [...accumulatedNeedLearning, ...needLearningWords];
    
    // 去重（基于单词ID）
    const uniqueMastered = this.removeDuplicateWords(newMastered);
    const uniqueNeedLearning = this.removeDuplicateWords(newNeedLearning);
    
    // 保存累计数据
    wx.setStorageSync('ACCUMULATED_MASTERED_WORDS', uniqueMastered);
    wx.setStorageSync('ACCUMULATED_NEED_LEARNING_WORDS', uniqueNeedLearning);
    
    console.log(`📊 累计数据更新:`, {
      mastered: uniqueMastered.length,
      needLearning: uniqueNeedLearning.length
    });
  },

  // 去重函数
  removeDuplicateWords(words) {
    const seen = new Set();
    return words.filter(word => {
      const wordId = word.id || word.word;
      if (seen.has(wordId)) {
        return false;
      }
      seen.add(wordId);
      return true;
    });
  },
  
  // 开始下一组
  startNextGroup() {
    const nextGroup = this.data.currentGroup + 1;
    const nextGroupData = this.data.learningGroups[nextGroup - 1];
    
    if (nextGroupData) {
      // 统计当前组完成的单词数量并更新进度
      this.updateGroupCompletionProgress();
      
      console.log(`开始第${nextGroup}组学习，从认识筛选开始`);
      
      // 重置认识阶段状态，每组都从认识筛选开始
      this.setData({
        currentGroup: nextGroup,
        currentPhase: 0,           // 重要：从phase0(认识筛选)开始
        currentWordIndex: 0,
        currentGroupWords: nextGroupData.words,
        
        // 重置认识阶段相关状态
        isRecognitionPhase: true,
        recognitionDone: 0,
        recognizedWords: [],
        needLearningWords: [],
        
        // 重置过滤结果界面状态
        showFilterResult: false,
        masteredWords: [],
        masteredCount: 0,
        needLearningCount: 0,
        
        // 重置当前单词
        currentWord: null,
        
        // 重置处理状态
        isProcessing: false
      });
      
      // 初始化新组的单词状态
      this.initializeGroupWordStatus(nextGroupData.words);
      
      // 开始认识阶段的第一个单词
      this.prepareRecognitionWord();
    } else {
      console.error('下一组数据不存在:', nextGroup);
    }
  },

  // 初始化新组的单词状态
  initializeGroupWordStatus(words) {
    const wordPhaseStatus = {};
    words.forEach(word => {
      const wordId = word.id || word.word;
      wordPhaseStatus[wordId] = {
        phase0: 'unknown',  // 认识状态：unknown, mastered, needLearning
        phase1: false,      // 四选一
        phase2: false,      // 跟读
        phase3: false,      // 汉译英拼写
        phase4: false       // 句子填空
      };
    });
    
    this.setData({ wordPhaseStatus });
    console.log('初始化新组单词状态:', wordPhaseStatus);
  },

  // 准备认识阶段的单词
  prepareRecognitionWord() {
    const { currentGroupWords, recognitionDone } = this.data;
    
    if (recognitionDone < currentGroupWords.length) {
      const currentWord = currentGroupWords[recognitionDone];
      
      this.setData({
        currentWord,
        phase: 'phase0',
        isProcessing: false
      });
      
      console.log(`准备认识阶段单词 ${recognitionDone + 1}/${currentGroupWords.length}:`, currentWord.word);
    } else {
      console.log('所有单词认识阶段完成，准备开始正式学习');
      this.startFormalLearning();
    }
  },
  
  // 更新分组完成进度
  updateGroupCompletionProgress() {
    const { currentGroup, currentGroupWords, wordPhaseStatus } = this.data;
    
    // 统计当前组完成的单词数量
    let completedWords = 0;
    const completedWordsList = [];
    
    currentGroupWords.forEach(word => {
      const wordId = word.id || word.word;
      const status = wordPhaseStatus[wordId] || {};
      
      // 检查是否完成所有4个阶段
      if (status.phase1 && status.phase2 && status.phase3 && status.phase4) {
        completedWords++;
        completedWordsList.push(word.word);
      }
    });
    
    // 更新已学单词列表（用于外部同步）
    const updatedLearnedWords = [...this.data.learnedWords];
    completedWordsList.forEach(word => {
      if (!updatedLearnedWords.includes(word)) {
        updatedLearnedWords.push(word);
      }
    });
    
    // 更新数据
    this.setData({
      learnedWords: updatedLearnedWords
    });
    
    // 同步到外部数据库
    recordTrainedWords(this.data.gradeId, completedWordsList);
    
    console.log(`第${currentGroup}组完成进度统计: ${completedWords}/${currentGroupWords.length} 单词完成`);
    
    // 发送自定义事件通知外部页面更新数据
    this.notifyProgressUpdate();
  },
  
  // 通知外部页面更新进度
  notifyProgressUpdate() {
    try {
      const pages = getCurrentPages();
      const prevPage = pages[pages.length - 2]; // 获取上一个页面
      
      if (prevPage && prevPage.onLearningProgressUpdate) {
        prevPage.onLearningProgressUpdate({
          gradeId: this.data.gradeId,
          learnedWords: this.data.learnedWords
        });
      }
    } catch (error) {
      console.warn('通知外部页面进度更新失败:', error);
    }
  },
  
  // 完成所有学习
  completeAllLearning() {
    // 统计最后一组的完成进度
    this.updateGroupCompletionProgress();
    
    // 获取总体同步状态
    const syncStatus = this.getSyncStatusSummary();
    const gradeProgress = learningDataSync.getGradeLearningProgress(this.data.gradeId);
    
    wx.showModal({
      title: '🎉 学习完成！',
      content: `恭喜您完成了所有单词的学习！\n\n🔄 数据同步完成：\n✅ 错题记录：${syncStatus.mistakeCount}个\n📅 学习记录：${syncStatus.sessionCount}条\n📈 已掌握：${gradeProgress.mastered + gradeProgress.expert}个\n🏆 精通：${gradeProgress.expert}个`,
      confirmText: '详情',
      cancelText: '返回',
      success: (res) => {
        if (res.confirm) {
          this.showSyncStatusDetails();
        } else {
          wx.navigateBack();
        }
      }
    });
  },

  /* ================= 用户交互处理 ================= */
  
  // 四选一选择答案
  selectChoice(e) {
    const answer = e.currentTarget.dataset.answer;
    const currentWord = this.data.currentWord;
    
    if (!currentWord) return;
    
    // 防抖检查
    if (!this.canPerformAction('selectChoice', 600)) {
      return;
    }
    
    // 只有第一阶段使用选择题
    const isCorrect = answer === currentWord.meaning;
    
    this.setData({
      selectedAnswer: answer,
      choiceCorrect: isCorrect
    });
    
    if (isCorrect) {
      // 记录学习进展
      this.recordLearningSync(
        this.data.currentWord.word, 
        'phase1', 
        true, 
        this.data.selectedAnswer, 
        this.data.currentWord.meaning
      );
      
      wx.showToast({ title: '回答正确！', icon: 'success' });
      setTimeout(() => {
        this.resetActionState(); // 先重置防抖状态
        this.completeCurrentPhase();
      }, 1200);
    } else {
      // 记录学习进展（错误）
      this.recordLearningSync(
        this.data.currentWord.word, 
        'phase1', 
        false, 
        this.data.selectedAnswer, 
        this.data.currentWord.meaning
      );
      
      wx.showToast({ title: '答案不正确，请重试', icon: 'error' });
      setTimeout(() => {
        this.setData({ selectedAnswer: '' });
        this.resetActionState();
      }, 1500);
    }
  },
  
  // 播放发音
  playPronunciation() {
    const currentWord = this.data.currentWord;
    if (!currentWord) return;
    
    // 跳过防抖检查，允许重复播放
    // if (!this.canPerformAction('playPronunciation', 600)) {
    //   return;
    // }
    
    // 播放单词发音
    this.playWordWithTTS(currentWord.word);
    
    this.setData({ 
      hasListened: true,
      isPlaying: true 
    });
    
    // 播放完成后重置状态，但不自动跳转
    setTimeout(() => {
      this.setData({ isPlaying: false });
      this.resetActionState();
    }, 2000);
  },
  
  // 处理填空输入
  onInput(e) {
    this.setData({ userInput: e.detail.value });
  },
  
  // 显示提示
  toggleHint() {
    this.setData({ showHint: !this.data.showHint });
  },
  
  // 获取当前阶段已完成的单词数量
  getCompletedWordsInCurrentPhase() {
    const currentPhase = this.data.currentPhase;
    let completedCount = 0;
    
    this.data.currentGroupWords.forEach(word => {
      const wordId = word.id || word.word;
      const status = this.data.wordPhaseStatus[wordId] || {};
      if (status[`phase${currentPhase}`]) {
        completedCount++;
      }
    });
    
    return completedCount;
  },
  
  // 暂停学习
  pauseLearning() {
    // 保存当前进度时也更新统计
    this.updateGroupCompletionProgress();
    
    this.setData({
      isPaused: true,
      pauseTime: Date.now()
    });
    
    this.saveGroupLearningProgress();
    
    // 获取同步状态信息
    const syncStatus = this.getSyncStatusSummary();
    const { currentGroup, totalGroups, currentGroupWords } = this.data;
    
    wx.showModal({
      title: '学习已暂停',
      content: `您的学习进度已保存，下次可以继续学习\n\n📊 当前进度：\n组别：${currentGroup}/${totalGroups}\n当前组：${currentGroupWords.length}个单词\n\n🔄 数据同步状态：\n✅ 错题记录：${syncStatus.mistakeCount}个\n📅 学习记录：${syncStatus.sessionCount}条\n📈 已掌握：${syncStatus.masteredCount}个`,
      confirmText: '详情',
      cancelText: '返回',
      success: (res) => {
        if (res.confirm) {
          this.showSyncStatusDetails();
        } else {
          wx.navigateBack();
        }
      }
    });
  },
  
  // 跳过当前单词（仅跳过当前阶段）
  skipWord() {
    wx.showModal({
      title: '跳过确认',
      content: '确定要跳过当前阶段吗？',
      success: (res) => {
        if (res.confirm) {
          this.completeCurrentPhase();
        }
      }
    });
  },

  /* ================= 兼容性方法 ================= */
  
  confirmCompletion() {
    this.completeCurrentPhase();
  },
  
  goBack() {
    wx.showModal({
      title: '确认退出',
      content: '退出将保存当前学习进度，确定要退出吗？',
      success: (res) => {
        if (res.confirm) {
          this.saveGroupLearningProgress();
          wx.navigateBack();
        }
      }
    });
  },
  
  // 恢复学习
  resumeLearning() {
    this.setData({
      isPaused: false,
      pauseTime: null
    });
    
    this.saveGroupLearningProgress();
    
    wx.showToast({
      title: '已恢复学习',
      icon: 'success',
      duration: 1000
    });
  },


  // 播放当前单词读音（认识阶段使用）
  playCurrentWordPronunciation() {
    if (!this.data.currentWord || !this.data.currentWord.word) {
      wx.showToast({
        title: '没有可播放的单词',
        icon: 'none'
      });
      return;
    }
    
    // 跳过防抖检查，允许重复播放
    this.playWordWithTTS(this.data.currentWord.word);
  },

  
  async playWordWithTTS(word) {
    if (!word) return;
    try {
      // 🎯 优先尝试预生成音频
      const preGeneratedUrl = await this.getPreGeneratedAudioUrl(word);
      if (preGeneratedUrl) {
        console.log(`✅ 使用预生成音频: ${word} -> ${preGeneratedUrl}`);
        await this.playLocal(preGeneratedUrl);
        this.setData({ isPlaying: true });
        return;
      }

      // 🔄 回退到实时TTS
      console.log(`🔄 预生成音频不存在，使用TTS: ${word}`);
      const ready = await this.ensureTTSReady(word);
      if (!ready) throw new Error('ensureTTSReady failed');

      if (typeof ready === 'string') {
        // 单文件
        await this.playLocal(ready);
      } else if (ready.playlist && Array.isArray(ready.playlist)) {
        // 多文件顺序播
        await this._playSequence(ready.playlist);
      }

      this.setData({ isPlaying: true });
      // 继续预加载后续
      const nextWords = this._getUpcomingWords(this._prefetchCfg?.nextCount || 6);
      this.prefetchWords(nextWords);

    } catch (e) {
      console.error('playWordWithTTS failed:', e);
      wx.showToast({ title: '发音加载失败', icon: 'none' });
    }
  },

  playFromCache(word) {
    const rec = this.data.audioCache?.[word];
    if (!rec?.local) return;
    this.playLocal(rec.local).catch(()=>{});
  },

  /* ================= 预生成音频支持 ================= */

  // 获取预生成音频URL
  async getPreGeneratedAudioUrl(word) {
    if (!word) return null;
    
    try {
      // 获取当前年级
      const grade = this.data.currentGrade || 'grade3';
      
      // 生成音频文件名
      const audioKey = word.toLowerCase()
        .replace(/[^\w\s]/g, '')  // 移除标点符号
        .replace(/\s+/g, '_')     // 空格转下划线
        + '.mp3';
      
      // 构建CDN URL
      // 配置选项：请根据您使用的CDN服务商修改以下域名
      const cdnConfig = {
        // 腾讯云COS示例: 'https://your-bucket.cos.ap-beijing.myqcloud.com'
        // 阿里云OSS示例: 'https://your-bucket.oss-cn-beijing.aliyuncs.com'  
        // 七牛云示例: 'https://your-bucket.qiniucdn.com'
        // AWS CloudFront示例: 'https://d1234567890.cloudfront.net'
        domain: 'https://cdn.yourdomain.com', // ← 请替换为您的实际CDN域名
        enabled: false // 设置为true启用预生成音频功能
      };
      
      // 如果未启用预生成音频，直接返回null
      if (!cdnConfig.enabled) {
        console.log(`🔧 预生成音频功能已禁用，跳过: ${word}`);
        return null;
      }
      
      const audioUrl = `${cdnConfig.domain}/audio/${grade}/${audioKey}`;
      
      // 检查文件是否存在（HEAD请求）
      const exists = await this.checkAudioExists(audioUrl);
      
      if (exists) {
        console.log(`✅ 预生成音频存在: ${word} -> ${audioUrl}`);
        return audioUrl;
      } else {
        console.log(`❌ 预生成音频不存在: ${word} -> ${audioUrl}`);
        return null;
      }
      
    } catch (error) {
      console.error('检查预生成音频失败:', word, error);
      return null;
    }
  },

  // 检查音频文件是否存在
  async checkAudioExists(url) {
    try {
      const response = await new Promise((resolve, reject) => {
        wx.request({
          url: url,
          method: 'HEAD',
          success: resolve,
          fail: reject
      }); 
    });
    
      return response.statusCode === 200;
    } catch (error) {
      return false;
    }
  },

  /* ================= 预加载（Prefetch）管理器 ================= */

  // 可调参数
  _prefetchCfg() {
    return {
      nextCount: 6,          // 每次预加载"接下来的"多少个词
      maxConcurrent: 2,      // 同时下载的并发数
      maxCache: 80,          // LRU缓存上限（条数），超出则淘汰最久未用
      retryTypes: [1, 2],    // 失败时 type=1→2 重试
      wordMaxLen: 40         // 超长短语截断
    };
  },

  // 运行时状态
  _prefetchState() {
    return {
      queue: [],             // 等待预加载的词（去重后的队列）
      inflight: 0,           // 进行中的下载计数
      active: false,         // 调度器是否在跑
      paused: false          // 页面隐藏/切后台时暂停
    };
  },

  // 简单的 LRU 触达（命中或写入时更新时间戳）
  _touchCache(key) {
    const cache = this.data.audioCache || {};
    const rec = cache[key];
    if (rec) { rec.ts = Date.now(); this.setData({ audioCache: cache }); }
  },

  // LRU 淘汰（超过 maxCache 时删除最久未用的条目）
  _pruneCacheIfNeeded() {
    const cache = this.data.audioCache || {};
    const keys = Object.keys(cache);
    if (keys.length <= this._prefetchCfg().maxCache) return;
    const sorted = keys.sort((a, b) => (cache[a].ts || 0) - (cache[b].ts || 0));
    const toDelete = keys.length - this._prefetchCfg().maxCache;
    for (let i = 0; i < toDelete; i++) delete cache[sorted[i]];
    this.setData({ audioCache: cache });
  },

  // 入队（去重）
  _enqueuePrefetch(words) {
    if (!Array.isArray(words) || !words.length) return;
    const st = this._prefetchState();
    const set = new Set(st.queue);
    for (const w of words) {
      const key = String(w || '').trim();
      if (!key) continue;
      // 已有本地缓存就不排队了
      const rec = this.data.audioCache?.[key];
      if (rec?.local) continue;
      set.add(key);
    }
    st.queue = Array.from(set);
  },

  // 调度器主循环
  _runPrefetchLoop() {
    const cfg = this._prefetchCfg(), st = this._prefetchState();
    if (st.active || st.paused) return;
    st.active = true;

    const step = async () => {
      // 退出条件
      if (st.paused || st.queue.length === 0) { st.active = false; return; }
      if (st.inflight >= cfg.maxConcurrent) { 
        // 稍等再试
        setTimeout(step, 120);
        return;
      }

      const word = st.queue.shift();
      st.inflight++;

      // 执行一个下载任务
      this._prefetchOne(word).finally(() => {
        st.inflight--;
        // 微任务后继续调度
        setTimeout(step, 0);
      });
    };

    // 启动 maxConcurrent 个"工人"
    for (let i = 0; i < Math.min(cfg.maxConcurrent, 3); i++) step();
  },

  // 预加载单个词：下载到本地并写入缓存（含 1→2 重试、超长截断）
  async _prefetchOne(text) {
    const key = String(text || '').trim();
    if (!key) return;

    // 命中则更新触达
    const existed = this.data.audioCache?.[key];
    if (existed?.local || (existed?.playlist && existed.playlist.length)) {
      existed.ts = Date.now();
      this.setData({ audioCache: this.data.audioCache });
      return;
    }

    const cfg = this._prefetchCfg();
    const trimmed = key.length > cfg.wordMaxLen ? key.slice(0, cfg.wordMaxLen) : key;

    // 1) 试整句
    for (const t of cfg.retryTypes) {
      try {
        const p = await this.downloadTTS(trimmed, t);
        const cache = this.data.audioCache || {};
        cache[key] = { local: p, ts: Date.now() };
        this.setData({ audioCache: cache });
        this._pruneCacheIfNeeded();
        return;
      } catch (e) {}
    }

    // 2) 整句失败 → 拆词
    const parts = key.replace(/[^\w'\-\s]/g, ' ').split(/\s+/).filter(Boolean);
    if (!parts.length) return;

    const playlist = [];
    for (const w of parts) {
      const hit = this.data.audioCache?.[w]?.local;
      if (hit) { playlist.push(hit); continue; }
      let p = null;
      for (const t of cfg.retryTypes) {
        try { p = await this.downloadTTS(w, t); break; } catch (e) {}
      }
      if (!p) return; // 某词失败，中止（不影响其他任务）
      const cache = this.data.audioCache || {};
      cache[w] = { local: p, ts: Date.now() };
      this.setData({ audioCache: cache });
      playlist.push(p);
    }

    const cache = this.data.audioCache || {};
    cache[key] = { playlist, ts: Date.now() };
    this.setData({ audioCache: cache });
    this._pruneCacheIfNeeded();
  },

  // 顺序播放播放列表（短语）
  async _playSequence(paths, gapMs = 50) {
    for (const p of paths) {
      try {
        await this.playLocal(p);
      } catch (e) {
        console.error('播放片段失败', p, e);
      }
      if (gapMs > 0) {
        await new Promise(r => setTimeout(r, gapMs));
      }
    }
    this.setData({ isPlaying: false });
  },

  // 对外接口：确保某词已在本地（若没有则同步下载一次）
  // 取本地或同步下载。可能返回 string(单文件) 或 {playlist: string[]}
  async ensureTTSReady(word) {
    const key = String(word || '').trim();
    if (!key) return null;

    // 命中缓存
    const hit = this.data.audioCache?.[key];
    if (hit?.local || (hit?.playlist && hit.playlist.length)) {
      hit.ts = Date.now();
      this.setData({ audioCache: this.data.audioCache });
      return hit.local || { playlist: hit.playlist };
    }

    // 优先尝试整句（部分短语偶尔能成功）
    const cfg = this._prefetchCfg();
    const whole = key.length > cfg.wordMaxLen ? key.slice(0, cfg.wordMaxLen) : key;
    for (const t of cfg.retryTypes) {
      try {
        const p = await this.downloadTTS(whole, t);
        const cache = this.data.audioCache || {};
        cache[key] = { local: p, ts: Date.now() };
        this.setData({ audioCache: cache });
        this._pruneCacheIfNeeded();
        return p; // 单文件成功
      } catch (e) { /* try next */ }
    }

    // 整句失败 → 拆词
    const parts = key
      .replace(/[^\w'\-\s]/g, ' ')   // 去掉标点
      .split(/\s+/).filter(Boolean);

    if (parts.length === 0) return null;

    const playlist = [];
    for (const w of parts) {
      const wKey = w;
      // 子项命中缓存就复用
      const hitChild = this.data.audioCache?.[wKey]?.local;
      if (hitChild) { playlist.push(hitChild); continue; }

      let p = null;
      for (const t of cfg.retryTypes) {
        try { p = await this.downloadTTS(w, t); break; } catch (e) {}
      }
      if (!p) { 
        // 某个词也失败，就放弃整句兜底
        return null;
      }
      // 写子项缓存
      const cache = this.data.audioCache || {};
      cache[wKey] = { local: p, ts: Date.now() };
      this.setData({ audioCache: cache });
      playlist.push(p);
    }

    // 把整句的 playlist 也写入缓存
    const cache = this.data.audioCache || {};
    cache[key] = { playlist, ts: Date.now() };
    this.setData({ audioCache: cache });
    this._pruneCacheIfNeeded();

    return { playlist };
  },

  // 对外接口：预加载一批词（去重、限并发）
  prefetchWords(words) {
    if (!words || !words.length) return;
    // 网络不佳可选择跳过（可选）
    wx.getNetworkType && wx.getNetworkType({
      success: (res) => {
        if (res.networkType === 'none') return;
        this._enqueuePrefetch(words);
        this._runPrefetchLoop();
      },
      fail: () => {
        this._enqueuePrefetch(words);
        this._runPrefetchLoop();
      }
    });
  },

  // 取"接下来要用"的词（当前组从当前索引后推 N 个，不够就拼下一组）
  _getUpcomingWords(n = 6) {
    const res = [];
    const { currentGroup, learningGroups, currentWordIndex } = this.data;

    // 1) 当前组后续
    const cur = learningGroups[currentGroup - 1]?.words || [];
    for (let i = currentWordIndex + 1; i < cur.length && res.length < n; i++) {
      res.push(cur[i].word);
    }
    // 2) 下一组补齐
    if (res.length < n && currentGroup < learningGroups.length) {
      const next = learningGroups[currentGroup]?.words || [];
      for (let i = 0; i < next.length && res.length < n; i++) {
        res.push(next[i].word);
      }
    }
    return res;
  },
  prevStep(){ this.setData({ learnStep: Math.max(1, this.data.learnStep-1) }); },
  nextStep(){
    const s = this.data.learnStep + 1;
    if (s <= 4) return this.setData({ learnStep: s });
    // step4 提交，进入下一个阶段
    this.completeCurrentPhase();
  },

  /* ================= 交错复习题目准备 ================= */
  prepareMixed(word){
    if (!word) return;
    
    const types = ['spell','meaning','cloze','listen'];
    const promptType = types[Math.floor(Math.random()*types.length)];
    let currentPrompt='', choiceOptions=[], clozeSentence='', userInput='';
    if (promptType==='meaning'){
      currentPrompt = word.word; choiceOptions = this.makeChoices(word.meaning);
    } else if (promptType==='cloze'){
      const ex = (word.examples && word.examples[0]) || {en:`I like ${word.word}.`, zh:''};
      clozeSentence = ex.en.replace(new RegExp(word.word,'i'),'_____'); currentPrompt = ex.zh || '例句填空';
    } else if (promptType==='listen'){
      currentPrompt = '▶ 听写（点击播放）';
    } else {
      currentPrompt = word.meaning; // spell：中文→英文
    }
    this.setData({ promptType, currentPrompt, choiceOptions, clozeSentence, userInput, showHint:false, selectedAnswer:'' });
  },

  /* ================== 四个阶段处理方法 ================== */



  // 第三阶段：中译英填空
  onInput(e) {
    this.setData({ userInput: e.detail.value || '' });
  },

  submitFill() {
    if (!this.data.currentWord) return;
    
    // 防抖检查
    if (!this.canPerformAction('submitFill', 600)) {
      return;
    }
    
    const userInput = this.data.userInput.trim();
    if (!userInput) {
      wx.showToast({ title: '请输入单词', icon: 'none' });
      this.resetActionState();
      return;
    }

    const isCorrect = this.autoGrade(userInput, this.data.currentWord.word) >= 2;
    this.setData({ fillCorrect: isCorrect });

    if (isCorrect) {
      // 记录拼写阶段成功
      this.recordLearningSync(
        this.data.currentWord.word, 
        'phase3', 
        true, 
        userInput, 
        this.data.currentWord.word
      );
      
      wx.showToast({ title: '拼写正确！', icon: 'success' });
      // 延迟进入下一阶段
      setTimeout(() => {
        this.resetActionState(); // 先重置防抖状态
        this.completeCurrentPhase();
      }, 1000);
    } else {
      // 记录拼写阶段失败
      this.recordLearningSync(
        this.data.currentWord.word, 
        'phase3', 
        false, 
        userInput, 
        this.data.currentWord.word
      );
      
      wx.showToast({ title: '拼写不对，请重试', icon: 'none' });
      // 清空输入框让用户重新输入
      this.setData({ userInput: '' });
      this.resetActionState();
    }
  },

  toggleHint() {
    // 防抖检查
    if (!this.canPerformAction('toggleHint', 300)) {
      return;
    }
    
    this.setData({ showHint: !this.data.showHint });
    this.resetActionState();
  },



  // 进入下一个单词
  nextWord() {
    const { currentPhase, currentGroupWords, wordPhaseStatus, currentWord } = this.data;
    
    if (!currentGroupWords || currentGroupWords.length === 0) {
      console.warn('nextWord: 没有当前组单词');
      return;
    }
    
    // 先完成当前单词的当前阶段
    if (currentWord) {
      // 记录跟读阶段完成状态（如果是第二阶段）
      if (currentPhase === 2) {
        this.recordLearningSync(
          currentWord.word, 
          'phase2', 
          true, 
          'completed', 
          currentWord.word
        );
      }
      
      // 标记当前单词的当前阶段为已完成
      const wordId = currentWord.id || currentWord.word;
      const wordStatus = this.data.wordPhaseStatus[wordId] || {};
      const currentPhaseKey = `phase${currentPhase}`;
      wordStatus[currentPhaseKey] = true;
      
      // 更新单词阶段状态
      const newWordPhaseStatus = { ...this.data.wordPhaseStatus };
      newWordPhaseStatus[wordId] = wordStatus;
      this.setData({ wordPhaseStatus: newWordPhaseStatus });
      
      console.log(`完成阶段${currentPhase}: ${currentWord.word}`);
    }
    
    // 按阶段学习：找下一个需要学习当前阶段的单词
    let nextWordIndex = -1;
    
    // 在当前组中找到下一个还没完成当前阶段的单词
    for (let i = 0; i < currentGroupWords.length; i++) {
      const word = currentGroupWords[i];
      const wordId = word.id || word.word;
      const status = wordPhaseStatus[wordId] || {};
      
      // 如果这个单词的当前阶段还没完成
      if (!status[`phase${currentPhase}`]) {
        nextWordIndex = i;
        break;
      }
    }
    
    if (nextWordIndex !== -1) {
      // 找到了下一个需要学习当前阶段的单词
      this.setData({
        currentWordIndex: nextWordIndex,
        currentWord: currentGroupWords[nextWordIndex]
      });
      
      // 重置界面状态并准备数据
      this.resetUIState();
      this.preparePhaseData(currentPhase);
      
      console.log(`继续第${currentPhase}阶段，单词: ${currentGroupWords[nextWordIndex].word}`);

      // 当前词一设定，预加载后面的
      const warming = this._getUpcomingWords(this._prefetchCfg().nextCount);
      this.prefetchWords(warming);
    } else {
      // 当前阶段所有单词都完成了，进入下一阶段
      console.log(`第${currentPhase}阶段全部完成，进入下一阶段`);
      this.moveToNextPhase();
    }
  },
  
  // 进入下一阶段
  moveToNextPhase() {
    const nextPhase = this.data.currentPhase + 1;
    
    if (nextPhase <= 2) {
      // 设置过渡状态
      this.setData({ isTransitioning: true });
      
      // 进入下一阶段，寻找第一个需要学习该阶段的单词
      const { currentGroupWords, wordPhaseStatus } = this.data;
      let firstWordIndex = 0;
      
      // 找到第一个还没完成下一阶段的单词
      for (let i = 0; i < currentGroupWords.length; i++) {
        const word = currentGroupWords[i];
        const wordId = word.id || word.word;
        const status = wordPhaseStatus[wordId] || {};
        
        if (!status[`phase${nextPhase}`]) {
          firstWordIndex = i;
          break;
        }
      }
      
      this.batchUpdateData({
        currentPhase: nextPhase,
        phase: `phase${nextPhase}`,
        phaseLabel: this.getPhaseLabel(nextPhase),
        currentWordIndex: firstWordIndex,
        currentWord: currentGroupWords[firstWordIndex],
        isTransitioning: false
      });
      
      // 重置界面状态并准备数据
      this.resetUIState();
      this.preparePhaseData(nextPhase);
      
      // 当前词一设定，预加载后面的
      const warming = this._getUpcomingWords(this._prefetchCfg().nextCount);
      this.prefetchWords(warming);
      
      wx.showToast({
        title: `进入第${nextPhase}阶段`,
        icon: 'success',
        duration: 1500
      });
      
      console.log(`进入第${nextPhase}阶段: ${this.getPhaseLabel(nextPhase)}，从第${firstWordIndex + 1}个单词开始`);
    } else {
      // 所有阶段都完成了，当前组完成
      console.log('所有2个阶段完成，当前组学习结束');
      this.completeCurrentGroup();
    }
  },

  // 重置界面状态
  resetUIState() {
    this.batchUpdateData({
      selectedAnswer: '',
      choiceCorrect: false,
      userInput: '',
      showHint: false,
      fillCorrect: false,
      hasListened: false,
      isPlaying: false,
      sentenceInput: '',
      sentenceCorrect: false,
      showSentenceHint: false,
      isProcessing: false  // 重置防抖状态
    });
  },

  // 为新阶段准备数据
  preparePhaseData(phase) {
    const currentWord = this.data.currentWord;
    if (!currentWord) {
      console.error('preparePhaseData: currentWord为空');
      return;
    }



    switch (phase) {
      case 0:
        // 认识阶段，显示单词和含义
        this.preparePhase0(currentWord);
        break;
      case 1:
        // 四选一阶段，需要准备选项
        const choices = this.makeChoices(currentWord.meaning);
        this.setData({ 
          choiceOptions: choices,
          selectedAnswer: '',
          choiceCorrect: false
        });
        break;
      case 2:
        // 巩固练习阶段，准备四选一选项
        const consolidationChoices = this.makeChoices(currentWord.meaning);
        this.setData({
          choiceOptions: consolidationChoices,
          selectedAnswer: '',
          choiceCorrect: false
        });
        break;
    }
  },

  // 准备认识阶段
  preparePhase0(word) {
    // 认识阶段只需要显示单词和含义，不需要特殊准备
    console.log('准备认识阶段：', word.word);
  },

  /* ================= 认识阶段处理函数 ================= */

  // 标记为已掌握
  markAsMastered() {
    if (this.data.isProcessing) return;
    
    this.setData({ isProcessing: true });
    
    const { currentWord, wordPhaseStatus } = this.data;
    if (!currentWord) return;
    
    const wordId = currentWord.id || currentWord.word;
    
    // 更新单词状态：直接标记为完全掌握
    const updatedStatus = { ...wordPhaseStatus };
    updatedStatus[wordId] = {
      phase0: 'mastered',
      phase1: true,  // 直接标记所有阶段为完成
      phase2: true
    };
    
    // 记录到认识的单词列表
    const recognizedWords = [...this.data.recognizedWords, currentWord];
    const recognitionDone = this.data.recognitionDone + 1;
    
    this.setData({
      wordPhaseStatus: updatedStatus,
      recognizedWords,
      recognitionDone
    });
    
    // 持久化保存已掌握的单词
    this.saveMasteredWord(wordId);
    
    // 记录学习数据
    this.recordLearningSync(currentWord.word, 'phase0', true, 'mastered', 'mastered');
    
    wx.showToast({
      title: '已标记为掌握',
      icon: 'success',
      duration: 1000
    });
    
    console.log(`单词 ${currentWord.word} 被标记为已掌握`);
    
    // 继续下一个单词
    setTimeout(() => {
      this.nextRecognitionWord();
    }, 1000);
  },

  // 标记为需要学习
  markAsNeedLearning() {
    if (this.data.isProcessing) return;
    
    this.setData({ isProcessing: true });
    
    const { currentWord, wordPhaseStatus } = this.data;
    if (!currentWord) return;
    
    const wordId = currentWord.id || currentWord.word;
    
    // 更新单词状态：标记为需要学习
    const updatedStatus = { ...wordPhaseStatus };
    if (!updatedStatus[wordId]) {
      updatedStatus[wordId] = {};
    }
    updatedStatus[wordId].phase0 = 'needLearning';
    
    // 记录到需要学习的单词列表
    const needLearningWords = [...this.data.needLearningWords, currentWord];
    const recognitionDone = this.data.recognitionDone + 1;
    
    this.setData({
      wordPhaseStatus: updatedStatus,
      needLearningWords,
      recognitionDone
    });
    
    // 记录学习数据
    this.recordLearningSync(currentWord.word, 'phase0', true, 'needLearning', 'needLearning');
    
    wx.showToast({
      title: '标记为需要学习',
      icon: 'none',
      duration: 1000
    });
    
    console.log(`单词 ${currentWord.word} 被标记为需要学习`);
    
    // 继续下一个单词
    setTimeout(() => {
      this.nextRecognitionWord();
    }, 1000);
  },

  // 新增：认读阶段 - 标记为理解
  markAsUnderstood() {
    if (this.data.isProcessing) return;
    
    this.setData({ isProcessing: true });
    
    const { currentWord, wordPhaseStatus } = this.data;
    if (!currentWord) return;
    
    const wordId = currentWord.id || currentWord.word;
    
    // 更新单词状态：完成第一阶段
    const updatedStatus = { ...wordPhaseStatus };
    if (!updatedStatus[wordId]) {
      updatedStatus[wordId] = {};
    }
    updatedStatus[wordId].phase1 = true;
    
    this.setData({
      wordPhaseStatus: updatedStatus
    });
    
    console.log(`单词 "${currentWord.word}" 认读完成`);
    
    wx.showToast({
      title: '认读完成',
      icon: 'success',
      duration: 1000
    });
    
    // 进入下一个单词
    setTimeout(() => {
      this.setData({ isProcessing: false });
      this.nextWord();
    }, 1000);
  },

  // 新增：认读阶段 - 需要更多帮助
  needMoreHelp() {
    if (this.data.isProcessing) return;
    
    this.setData({ isProcessing: true });
    
    // 直接进入巩固练习阶段
    this.setData({
      currentPhase: 2,
      isProcessing: false
    });
    
    // 生成四选一选项
    this.generateChoiceOptions();
    
    console.log('进入巩固练习阶段');
    
    wx.showToast({
      title: '进入巩固练习',
      icon: 'none',
      duration: 1000
    });
  },

  // 进入下一个认识阶段的单词
  nextRecognitionWord() {
    const { currentGroupWords, recognitionDone, wordPhaseStatus } = this.data;
    
    console.log(`nextRecognitionWord: recognitionDone=${recognitionDone}, totalWords=${currentGroupWords.length}`);
    console.log('当前wordPhaseStatus:', wordPhaseStatus);
    
    // 检查是否所有单词都已完成认识判断
    let allWordsProcessed = true;
    for (let i = 0; i < currentGroupWords.length; i++) {
      const word = currentGroupWords[i];
      const wordId = word.id || word.word;
      const status = wordPhaseStatus[wordId];
      
      if (!status || status.phase0 === 'unknown') {
        allWordsProcessed = false;
        break;
      }
    }
    
    console.log(`所有单词是否已处理: ${allWordsProcessed}`);
    
    if (allWordsProcessed) {
      // 认识阶段完成，显示过滤结果统计界面
      console.log('认识阶段完成，准备显示过滤结果统计界面');
      this.showFilterResultPage();
      return;
    }
    
    // 找到下一个未完成认识判断的单词
    let nextWordIndex = -1;
    for (let i = 0; i < currentGroupWords.length; i++) {
      const word = currentGroupWords[i];
      const wordId = word.id || word.word;
      const status = wordPhaseStatus[wordId];
      
      if (!status || status.phase0 === 'unknown') {
        nextWordIndex = i;
        break;
      }
    }
    
    if (nextWordIndex !== -1) {
      this.setData({
        currentWordIndex: nextWordIndex,
        currentWord: currentGroupWords[nextWordIndex],
        isProcessing: false
      });
      
      console.log(`继续认识阶段，单词: ${currentGroupWords[nextWordIndex].word}`);
    } else {
      // 所有单词都已完成认识判断
      console.log('通过循环检查发现所有单词都已完成认识判断');
      this.showFilterResultPage();
    }
  },

  // 显示过滤结果统计页面
  showFilterResultPage() {
    console.log('showFilterResultPage 被调用');
    const { currentGroupWords, wordPhaseStatus } = this.data;
    
    console.log('当前组单词:', currentGroupWords);
    console.log('单词阶段状态:', wordPhaseStatus);
    
    // 统计已掌握和需要学习的单词
    const masteredWords = [];
    const needLearningWords = [];
    
    currentGroupWords.forEach(word => {
      const wordId = word.id || word.word;
      const status = wordPhaseStatus[wordId];
      
      if (status && status.phase0 === 'mastered') {
        masteredWords.push(word);
      } else if (status && status.phase0 === 'needLearning') {
        needLearningWords.push(word);
      }
    });
    
    // 获取累计数据
    const accumulatedMastered = wx.getStorageSync('ACCUMULATED_MASTERED_WORDS') || [];
    const accumulatedNeedLearning = wx.getStorageSync('ACCUMULATED_NEED_LEARNING_WORDS') || [];
    
    // 计算累计总数
    const totalAccumulatedMastered = accumulatedMastered.length + masteredWords.length;
    const totalAccumulatedNeedLearning = accumulatedNeedLearning.length + needLearningWords.length;
    
    // 更新数据
    this.setData({
      showFilterResult: true,
      currentWord: null,  // 清除当前单词，避免认识阶段界面继续显示
      masteredWords: masteredWords,
      masteredCount: masteredWords.length,
      needLearningCount: needLearningWords.length,
      needLearningWords: needLearningWords,
      // 添加累计数据用于显示
      accumulatedMasteredCount: totalAccumulatedMastered,
      accumulatedNeedLearningCount: totalAccumulatedNeedLearning
    });
    
    console.log('✅ 过滤结果界面状态已更新');
    console.log('showFilterResult:', true);
    console.log('masteredCount:', masteredWords.length);
    console.log('needLearningCount:', needLearningWords.length);
    console.log('accumulatedMasteredCount:', totalAccumulatedMastered);
    console.log('accumulatedNeedLearningCount:', totalAccumulatedNeedLearning);
    
    console.log(`📊 第${this.data.currentGroup}组过滤完成:`, {
      currentGroup: {
        mastered: masteredWords.length,
        needLearning: needLearningWords.length
      },
      accumulated: {
        mastered: totalAccumulatedMastered,
        needLearning: totalAccumulatedNeedLearning
      }
    });
  },


  // 继续过滤下一组
  continueToNextGroup() {
    const { currentGroup, totalGroups } = this.data;
    
    if (currentGroup >= totalGroups) {
      wx.showModal({
        title: '提示',
        content: '已经是最后一组了',
        showCancel: false
      });
      return;
    }
    
    // 完成当前组
    this.completeCurrentGroup();
  },

  // 开始认读练习
  startReadingPractice() {
    // 获取累计的需要学习单词
    const accumulatedNeedLearning = wx.getStorageSync('ACCUMULATED_NEED_LEARNING_WORDS') || [];
    
    if (accumulatedNeedLearning.length === 0) {
      wx.showModal({
        title: '提示',
        content: '没有需要认读的单词',
        showCancel: false
      });
      return;
    }
    
    // 隐藏过滤结果界面，开始认读练习
    this.setData({
      showFilterResult: false,
      needLearningWords: accumulatedNeedLearning,
      phase: 'phase0', // 设置为认识阶段
      currentPhase: 0,
      phaseLabel: '认识阶段'
    });
    
    // 准备第一个单词
    this.prepareCurrentWord();
    
    wx.showToast({
      title: '开始认读练习',
      icon: 'success'
    });
  },

  // 开始学习不熟悉的单词
  startLearningUnfamiliarWords() {
    // 获取累计的需要学习单词
    const accumulatedNeedLearning = wx.getStorageSync('ACCUMULATED_NEED_LEARNING_WORDS') || [];
    
    if (accumulatedNeedLearning.length === 0) {
      wx.showModal({
        title: '提示',
        content: '没有需要学习的单词',
        showCancel: false
      });
      return;
    }
    
    // 隐藏过滤结果界面
    this.setData({
      showFilterResult: false,
      needLearningWords: accumulatedNeedLearning
    });
    
    // 调用原有的正式学习方法
      this.startFormalLearning();
  },

  // 完成过滤（全部掌握的情况）
  finishFiltering() {
    const { currentGroup, totalGroups } = this.data;
    
    wx.showModal({
      title: '太棒了！🎉',
      content: `第${currentGroup}组单词你都认识！已全部标记为掌握。\n\n${currentGroup < totalGroups ? '是否继续学习下一组？' : '恭喜完成所有学习！'}`,
      showCancel: currentGroup < totalGroups,
      cancelText: '暂停',
      confirmText: currentGroup < totalGroups ? '下一组' : '完成',
      success: (res) => {
        if (res.confirm) {
          this.completeCurrentGroup();
        } else if (res.cancel) {
          // 用户选择暂停，返回首页
          wx.navigateBack();
        }
      }
    });
  },

  // 开始正式学习（跳过已掌握的单词）
  startFormalLearning() {
    const { needLearningWords, recognizedWords, currentGroup, totalGroups } = this.data;
    

    
    if (needLearningWords.length === 0) {
      // 所有单词都已掌握

      
      // 确保在主线程中显示弹窗
      setTimeout(() => {
        wx.showModal({
          title: '太棒了！🎉',
          content: `第${currentGroup}组单词你都认识！已全部标记为掌握。\n\n${currentGroup < totalGroups ? '是否继续学习下一组？' : '恭喜完成所有学习！'}`,
          showCancel: currentGroup < totalGroups,
          cancelText: '暂停',
          confirmText: currentGroup < totalGroups ? '下一组' : '完成',
          success: (res) => {
            if (res.confirm) {
              this.completeCurrentGroup();
            } else if (res.cancel) {
              // 用户选择暂停，返回首页
              wx.navigateBack();
            }
          },
          fail: (err) => {
            console.error('显示弹窗失败:', err);
            this.completeCurrentGroup();
          }
        });
      }, 100);
      return;
    }
    
    // 验证第一个单词的数据结构
    const firstWord = needLearningWords[0];
    if (!firstWord || !firstWord.word || !firstWord.meaning) {
      console.error('首个需要学习的单词数据异常:', firstWord);
      wx.showModal({
        title: '数据错误',
        content: '学习数据异常，请重新开始',
        showCancel: false,
        success: () => {
          this.forceRestartLearning();
        }
      });
      return;
    }
    

    
    // 更新当前组单词为需要学习的单词
    this.setData({
      currentGroupWords: needLearningWords,
      currentPhase: 1,
      phase: 'phase1',
      phaseLabel: this.getPhaseLabel(1),
      currentWordIndex: 0,
      currentWord: firstWord,
      isRecognitionPhase: false,
      isProcessing: false  // 重置防抖状态，确保可以点击
    });
    
    this.preparePhaseData(1);
    
    wx.showToast({
      title: `开始学习${needLearningWords.length}个单词`,
      icon: 'success',
      duration: 2000
    });
  },

  // 移动到组内下一个单词
  moveToNextWordInGroup() {
    const nextIndex = this.data.currentWordIndex + 1;
    
    if (nextIndex < this.data.currentGroupWords.length) {
      // 还有更多单词，切换到下一个单词
      const nextWord = this.data.currentGroupWords[nextIndex];
      this.setData({
        currentWordIndex: nextIndex,
        currentWord: nextWord,
        currentPhase: 1, // 重新从第一阶段开始
        phase: 'phase1',
        phaseLabel: this.getPhaseLabel(1)
      });
      
      // 重置界面状态
      this.resetUIState();
      
      // 为第一阶段准备数据
      this.preparePhaseData(1);
    } else {
      // 当前组完成，移动到下一组
      this.moveToNextGroup();
    }
  },

  // 移动到下一组
  moveToNextGroup() {
    const nextGroup = this.data.currentGroup + 1;
    
    if (nextGroup <= this.data.totalGroups) {
      // 还有更多组，从认识筛选阶段开始
      const nextGroupData = this.data.learningGroups[nextGroup - 1];
      
      this.setData({
        currentGroup: nextGroup,
        currentPhase: 0,           // 从认识筛选开始
        phase: 'phase0',
        phaseLabel: this.getPhaseLabel(0),
        currentWordIndex: 0,
        currentGroupWords: nextGroupData.words,
        
        // 重置认识阶段相关状态
        isRecognitionPhase: true,
        recognitionDone: 0,
        recognizedWords: [],
        needLearningWords: [],
        
        // 重置当前单词
        currentWord: null,
        
        // 重置处理状态
        isProcessing: false
      });
      
      // 初始化新组的单词状态
      this.initializeGroupWordStatus(nextGroupData.words);
      
      // 开始认识阶段的第一个单词
      this.prepareRecognitionWord();
      
      console.log(`moveToNextGroup: 开始第${nextGroup}组学习，从认识筛选开始`);
    } else {
      // 所有组都完成了
      this.finishAllLearning();
    }
  },

  // 完成所有学习
  finishAllLearning() {
    // 切换到完成状态
    this.setData({
      phase: 'done',
      loading: false
    });
    
    // 保存学习记录
    this.saveLearningProgress();
    
    // 显示完成提示
    wx.showToast({
      title: '恭喜完成所有学习！',
      icon: 'success',
      duration: 2000
    });
  },

  // 注意：completeCurrentPhase函数已在783行定义，此处删除重复定义

  // 跳过当前单词（用于特殊情况）
  skipWord() {
    this.nextWord();
  },

  /* ================== 热身阶段专用方法 ================== */
  submitWarmupAnswer(){
    if (!this.data.currentWord) return;
    
    // 选择题答案检查
    const isCorrect = this.data.selectedAnswer === this.data.currentWord.meaning;
    if (isCorrect) {
      // 记录热身阶段成功
      this.recordLearningSync(
        this.data.currentWord.word, 
        'phase1', 
        true, 
        this.data.selectedAnswer, 
        this.data.currentWord.meaning
      );
      
      // 答对了，进入下一阶段
      wx.showToast({ title: '回答正确！', icon: 'success' });
      setTimeout(() => {
        this.resetActionState(); // 先重置防抖状态
        this.completeCurrentPhase();
      }, 1000);
    } else {
      // 记录热身阶段失败
      this.recordLearningSync(
        this.data.currentWord.word, 
        'phase1', 
        false, 
        this.data.selectedAnswer, 
        this.data.currentWord.meaning
      );
      
      // 答错了，记录到生词本（保持原有逻辑）
      this.recordWord(
        this.data.currentWord.word, 
        this.data.selectedAnswer, 
        this.data.currentWord.meaning, 
        'warmup_choice'
      );
      
      wx.showToast({title: '答案不对，请重新选择', icon: 'none'});
      // 重置选择，让用户重新答题
      this.setData({ selectedAnswer: '' });
    }
  },
  
  markUnknown(){
    if (!this.data.currentWord) return;
    
    // 记录标记不认识
    this.recordLearningSync(
      this.data.currentWord.word, 
      'phase1', 
      false, 
      'unknown', 
      this.data.currentWord.meaning
    );
    
    // 直接标记为不认识，记录到生词本（保持原有逻辑）
    this.recordWord(
      this.data.currentWord.word, 
      'unknown', 
      this.data.currentWord.meaning, 
      'warmup_unknown'
    );
    
    wx.showToast({title: '已标记为不认识', icon: 'none'});
    // 进入下一阶段，让用户继续学习
    setTimeout(() => {
      this.resetActionState(); // 先重置防抖状态
      this.completeCurrentPhase();
    }, 1000);
  },

  /* ================== 评分流程（SRS） - 已弃用 ================== */
  gradeAgain(){ console.warn('gradeAgain() is deprecated'); },
  gradeHard(){ console.warn('gradeHard() is deprecated'); },
  gradeGood(){ console.warn('gradeGood() is deprecated'); },
  gradeEasy(){ console.warn('gradeEasy() is deprecated'); },

  submitSpell(){ this.submitAnswer(); },
  submitAnswer(){
    // 该方法已被新的分阶段方法替代，保留以维持兼容性
    console.warn('submitAnswer() is deprecated, use phase-specific methods instead');
  },
  autoGrade(user, truth){
    const clean = s => (s||'').toLowerCase().replace(/[^a-z]/g,'').trim();
    const u = clean(user), t = clean(truth);
    if(!u) return 0;
    if(u===t) return 3;
    const d = this.lev(u,t);
    if(d<=1 && t.length>4) return 2;
    if(d<=2) return 1;
    return 0;
  },
  lev(a,b){
    if (!a || !b || typeof a !== 'string' || typeof b !== 'string') return 999;
    
    const m=a.length,n=b.length; const dp=Array.from({length:m+1},()=>Array(n+1).fill(0));
    for(let i=0;i<=m;i++) dp[i][0]=i; for(let j=0;j<=n;j++) dp[0][j]=j;
    for(let i=1;i<=m;i++) for(let j=1;j<=n;j++){
      const c=a[i-1]===b[j-1]?0:1;
      dp[i][j]=Math.min(dp[i-1][j]+1,dp[i][j-1]+1,dp[i-1][j-1]+c);
    } return dp[m][n];
  },

  finishCurrent(q){
    const {currentWord, _startTs} = this.data;
    
    // 1) 简化SRS更新逻辑
    const key = currentWord.word;
    if (!this.progress) this.progress = {};
    const old = this.progress[key] || {ease:2.5, interval:0, reps:0, lapses:0, failsInSession:0};
    const next = this.srsUpdate(old, q);
    this.progress[key] = next;
    try {
      wx.setStorageSync(`PROGRESS_${this.data.gradeId}`, this.progress);
    } catch (error) {
      console.error('保存单词进度失败:', error);
      wx.showToast({
        title: '保存失败，请重试',
        icon: 'error'
      });
    }

    // 2) 记录学习进度到全局进度系统
    this.recordLearningProgress(currentWord.word, q, 'four_step_learning');

    // 3) 学过数（沿用你原逻辑）
    if (q > 0) this.markAsLearnedCompat(currentWord.word);

    // 4) 统计
    const rt = (Date.now()-_startTs)/1000;
    this.statPush(q, rt);

    // 5) 下一题/阶段 - 使用新的分组学习系统
    this.completeCurrentPhase();
  },

  // 获取当前题目类型
  getQuestionType() {
    const {promptType, currentWord} = this.data;
    if (promptType === 'meaning') return 'meaning_choice';
    if (promptType === 'spell') return 'spell_input';
    if (promptType === 'cloze') return 'cloze_fill';
    if (promptType === 'listen') return 'listen_spell';
    if (currentWord && currentWord._phase === 'warmup') return 'warmup_choice';
    if (currentWord && currentWord._phase === 'learn') return 'new_word_learning';
    return 'mixed_review';
  },

  srsUpdate(state, q){
    if (!state || typeof q !== 'number') return {ease:2.5, interval:0, reps:0, lapses:0, failsInSession:0};
    
    let {ease=2.5, interval=0, reps=0, lapses=0, failsInSession=0} = state;
    if (q===0){
      lapses+=1; reps=0; ease=Math.max(1.3, ease-0.2); interval=0.02; failsInSession+=1;
    } else {
      reps+=1;
      if (interval===0) interval=[0.02,1,3][Math.min(q,2)];
      else {
        const factor=[1.2,1.5,ease][Math.min(Math.max(q,1),3)-1];
        interval=Math.max(1/24, interval*factor);
      }
      failsInSession=0;
    }
    const nextDue = Date.now() + interval*DAY;
    const strength = 1 - Math.exp(-(reps)/(3+lapses));
    const leech = failsInSession>=2 || lapses>=4;
    return {ease, interval, reps, lapses, failsInSession, nextDue, strength, leech};
  },

  injectLater(item, pos){
    if (!item || !this.data.queue) return;
    
    const q = this.data.queue.slice();
    const safePos = Math.min(q.length, Math.max(this.data.idx+1, pos));
    q.splice(safePos, 0, {...item, _phase:'mixed'});
    this.setData({ queue:q });
  },

  statPush(q, rt){
    if (typeof q !== 'number' || typeof rt !== 'number') return;
    
    const done = this.data.sessionDone + 1;
    const accSum = (this._accSum || 0) + (q>0?1:0);
    const timeSum = (this._timeSum || 0) + rt;
    this._accSum = accSum; this._timeSum = timeSum;
    this.setData({ sessionDone: done, accuracy: Math.round(accSum/done*100), avgTime: (timeSum/done).toFixed(1) });
  },

  gotoNext(){
    // 该方法已被新的分组学习系统替代，保留以维持兼容性
    console.warn('gotoNext() is deprecated, using completeCurrentPhase() instead');
    this.completeCurrentPhase();
  },

  /* ================= 收官测（6题） - 已弃用 ================= */
  startFinal(){
    console.warn('startFinal() is deprecated in new group learning system');
    return;
    const uniq = [...new Set(seen)];
    const pick = (n, f) => this.shuffle(uniq).slice(0,n).map(id=>this.words.find(w=>w.id===id)).map(f);
    const spell  = pick(2, w => ({type:'spell',  prompt:w.meaning, word:w}));
    const choice = pick(2, w => ({type:'choice', prompt:w.word,    word:w}));
    const listen = pick(1, w => ({type:'listen', prompt:'▶ 听写', word:w}));
    const cloze  = pick(1, w => {
      const ex=(w.examples&&w.examples[0])||{en:`I like ${w.word}.`, zh:''};
      return {type:'cloze', prompt:ex.zh||'例句填空', cloze:ex.en.replace(new RegExp(w.word,'i'),'_____'), word:w};
    });
    const finalSet = this.shuffle([...spell,...choice,...listen,...cloze]);
    this.setData({
      phase:'final', phaseLabel:'收官测',
      finalSet, finalIndex:0,
      finalType: finalSet[0].type,
      finalPrompt: finalSet[0].prompt,
      finalDesc: this.descOf(finalSet[0].type),
      clozeSentence: finalSet[0].cloze || '',
      currentWord: finalSet[0].word,
      userInput:'', selectedAnswer:'', choiceOptions: this.makeChoices(finalSet[0].word.meaning)
    });
  },
  descOf(t){ return {spell:'（中文→英文，拼写）', choice:'（义配英）', listen:'（听写）', cloze:'（例句填空）'}[t] || ''; },
  submitFinal(){
    const item = this.data.finalSet[this.data.finalIndex];
    let ok = false;
    if (item.type==='choice') ok = (this.data.selectedAnswer === item.word.meaning);
    else ok = (this.autoGrade(this.data.userInput, item.word.word) >= 2);
    this._finalRight = (this._finalRight||0) + (ok?1:0);

    if (this.data.finalIndex >= 5) return this.endSession();

    const i = this.data.finalIndex + 1;
    const nxt = this.data.finalSet[i];
    this.setData({
      finalIndex: i,
      finalType: nxt.type,
      finalPrompt: nxt.prompt,
      finalDesc: this.descOf(nxt.type),
      clozeSentence: nxt.cloze || '',
      currentWord: nxt.word,
      userInput:'', selectedAnswer:'', choiceOptions: this.makeChoices(nxt.word.meaning)
    });
  },
  prevFinal(){
    if (this.data.finalIndex===0) return;
    const i = this.data.finalIndex - 1, cur = this.data.finalSet[i];
    this.setData({
      finalIndex:i, finalType:cur.type, finalPrompt:cur.prompt,
      finalDesc:this.descOf(cur.type), clozeSentence:cur.cloze||'',
      currentWord:cur.word, userInput:'', selectedAnswer:'', choiceOptions:this.makeChoices(cur.word.meaning)
    });
  },
  revealAnswer(){
    const w = this.data.currentWord;
    wx.showToast({title:`答案：${w.word}`, icon:'none', duration:2000});
  },

  /* ================= 结束训练会话 ================= */
  endSession(){
    // 简化逻辑：避免访问可能不存在的progress对象
    const accuracy = this.data.sessionDone > 0 ? 
      Math.round((this.data.sessionDone / this.data.sessionTarget) * 100) : 0;

    this.setData({ 
      phase:'done', 
      phaseLabel:'完成', 
      accuracy, 
      cleared: 0, 
      tomorrowDue: 0
    });

    // 外部留档：把"学过的词"回写
    recordTrainedWords(this.data.gradeId, this.data.learnedWords);
  },

  markAsLearnedCompat(word){
    if (!word) return;
    
    const learnedWords = [...this.data.learnedWords];
    if (!learnedWords.includes(word)) {
      learnedWords.push(word);
      this.setData({
        learnedWords
      });
      try {
        wx.setStorageSync(`learned_${this.data.gradeId}`, learnedWords);
      } catch (error) {
        console.error('保存已学词汇失败:', error);
        wx.showToast({
          title: '保存失败，请重试',
          icon: 'error'
        });
      }
    }
  },

  // 记录生词到生词本
  recordWord(word, userAnswer, correctAnswer, questionType) {
    if (!word || !correctAnswer || !questionType) return;
    
    try {
      const wordBook = wx.getStorageSync('wordBook') || {};
      const now = Date.now();
      
      if (!wordBook[word]) {
        // 新生词
        wordBook[word] = {
          word: word,
          correctAnswer: correctAnswer,
          studyCount: 1,
          firstStudyTime: now,
          lastStudyTime: now,
          studyHistory: [{
            userAnswer: userAnswer,
            correctAnswer: correctAnswer,
            questionType: questionType,
            timestamp: now,
            grade: this.data.gradeId,
            gradeName: this.data.gradeName
          }],
          mastered: false,
          grade: this.data.gradeId,
          gradeName: this.data.gradeName
        };
      } else {
        // 已存在的生词，更新学习次数和历史
        wordBook[word].studyCount++;
        wordBook[word].lastStudyTime = now;
        wordBook[word].studyHistory.push({
          userAnswer: userAnswer,
          correctAnswer: correctAnswer,
          questionType: questionType,
          timestamp: now,
          grade: this.data.gradeId,
          gradeName: this.data.gradeName
        });
        
        // 如果学习次数较多，标记为需要复习
        if (wordBook[word].studyCount >= 3) {
          wordBook[word].needsReview = true;
        }
      }
      
      try {
        wx.setStorageSync('wordBook', wordBook);
        console.log(`记录生词: ${word}, 学习次数: ${wordBook[word].studyCount}`);
      } catch (error) {
        console.error('保存生词失败:', error);
        wx.showToast({
          title: '保存失败，请重试',
          icon: 'error'
        });
      }
      
    } catch (error) {
      console.error('记录生词失败:', error);
    }
  },

  // 记录学习进度到全局进度系统
  recordLearningProgress(word, score, questionType) {
    if (!word || typeof score !== 'number' || !questionType) return;
    
    try {
      const globalProgress = wx.getStorageSync('globalLearningProgress') || {};
      const now = Date.now();
      
      if (!globalProgress[word]) {
        globalProgress[word] = {
          word: word,
          grade: this.data.gradeId,
          gradeName: this.data.gradeName,
          firstSeen: now,
          lastSeen: now,
          totalAttempts: 1,
          correctAttempts: score > 0 ? 1 : 0,
          questionTypes: [questionType],
          scores: [score],
          masteryLevel: score === 3 ? 'mastered' : score === 2 ? 'good' : score === 1 ? 'fair' : 'poor'
        };
      } else {
        // 更新现有进度
        globalProgress[word].lastSeen = now;
        globalProgress[word].totalAttempts++;
        if (score > 0) globalProgress[word].correctAttempts++;
        if (!globalProgress[word].questionTypes.includes(questionType)) {
          globalProgress[word].questionTypes.push(questionType);
        }
        globalProgress[word].scores.push(score);
        
        // 更新掌握水平
        const recentScores = globalProgress[word].scores.slice(-5); // 最近5次
        const avgScore = recentScores.reduce((sum, s) => sum + s, 0) / recentScores.length;
        if (avgScore >= 2.5) globalProgress[word].masteryLevel = 'mastered';
        else if (avgScore >= 1.5) globalProgress[word].masteryLevel = 'good';
        else if (avgScore >= 0.5) globalProgress[word].masteryLevel = 'fair';
        else globalProgress[word].masteryLevel = 'poor';
      }
      
      try {
        wx.setStorageSync('globalLearningProgress', globalProgress);
      } catch (error) {
        console.error('保存全局进度失败:', error);
        wx.showToast({
          title: '保存失败，请重试',
          icon: 'error'
        });
      }
      
    } catch (error) {
      console.error('记录学习进度失败:', error);
    }
  },

  // 导航/报告/返回（与你当前页面一致）
  exportReport(){
    wx.setClipboardData({data:`正确率${this.data.accuracy}%，平均反应${this.data.avgTime}s，清空到期${this.data.cleared}个`});
    wx.showToast({title:'已复制学习报告', icon:'success'});
  },
  restartSession(){ this.bootstrap(); },
  backHome(){ wx.navigateBack({delta:1}); },
  
  // 缺失的方法实现
  skipItem(){
    // 跳过当前项目，按困难处理
    this.finishCurrent(1);
  },
  
  playAudio(){
    // 播放当前单词发音
    if (this.data.currentWord && this.data.currentWord.word) {
      this.playWordWithTTS(this.data.currentWord.word);
    }
  },
  
  reviewPlan(){
    // 查看明日到期计划
    wx.showModal({
      title: '明日到期',
      content: `明天有 ${this.data.tomorrowDue} 个单词到期复习`,
      showCancel: false,
      success: () => {
        wx.navigateBack();
      }
    });
  },

  // 暂停学习
  pauseLearning() {
    this.setData({ 
      isPaused: true, 
      pauseTime: Date.now() 
    });
    
    // 保存当前进度
    this.saveLearningProgress();
    
    wx.showToast({ 
      title: '学习已暂停', 
      icon: 'success' 
    });
  },
  
  // 恢复学习
  resumeLearning() {
    this.setData({ 
      isPaused: false, 
      pauseTime: null 
    });
    
    wx.showToast({ 
      title: '学习已恢复', 
      icon: 'success' 
    });
  },
  
  // 保存学习进度
  saveLearningProgress() {
    // 确保phaseLabel是最新计算的
    const currentPhaseLabel = this.getPhaseLabel(this.data.currentPhase);
    
    const progressData = {
      gradeId: this.data.gradeId,
      gradeName: this.data.gradeName,
      currentPhase: this.data.currentPhase,
      phase: this.data.phase,
      phaseLabel: currentPhaseLabel,  // 使用计算得出的phaseLabel
      sessionTarget: this.data.sessionTarget,
      sessionDone: this.data.sessionDone,
      idx: this.data.idx,
      currentWord: this.data.currentWord,
      queue: this.data.queue,
      phaseProgress: this.data.phaseProgress,
      learnedWords: this.data.learnedWords,
      pauseTime: this.data.pauseTime,
      timestamp: Date.now()
    };
    
    try {
      wx.setStorageSync(`LEARNING_PROGRESS_${this.data.gradeId}`, progressData);
      console.log('学习进度已保存:', progressData);
    } catch (error) {
      console.error('保存完整学习进度失败:', error);
      wx.showToast({
        title: '保存失败，请重试',
        icon: 'error'
      });
    }
  },
  
  // 加载学习进度
  loadLearningProgress() {
    const progressData = wx.getStorageSync(`LEARNING_PROGRESS_${this.data.gradeId}`);
    
    if (progressData && progressData.timestamp) {
      // 检查进度是否过期（24小时）
      const now = Date.now();
      const timeDiff = now - progressData.timestamp;
      const oneDay = 24 * 60 * 60 * 1000;
      
      if (timeDiff < oneDay) {
        // 恢复进度
        const restoredPhase = progressData.currentPhase || 1;
        const calculatedPhaseLabel = this.getPhaseLabel(restoredPhase);
        
        this.setData({
          currentPhase: restoredPhase,
          phase: progressData.phase || 'phase1',
          phaseLabel: calculatedPhaseLabel,  // 使用计算得出的phaseLabel而不是存储的
          sessionTarget: progressData.sessionTarget || 30,
          sessionDone: progressData.sessionDone || 0,
          idx: progressData.idx || 0,
          currentWord: progressData.currentWord || null,
          queue: progressData.queue || [],
          phaseProgress: progressData.phaseProgress || {},
          learnedWords: progressData.learnedWords || [],
          pauseTime: progressData.pauseTime || null,
          isPaused: !!progressData.pauseTime
        });
        
        console.log('学习进度已恢复:', progressData);
        return true;
      } else {
        // 进度过期，清除
        wx.removeStorageSync(`LEARNING_PROGRESS_${this.data.gradeId}`);
        console.log('学习进度已过期，重新开始');
      }
    }
    
    return false;
  },
  
  // 清除学习进度
  clearLearningProgress() {
    wx.removeStorageSync(`LEARNING_PROGRESS_${this.data.gradeId}`);
    wx.removeStorageSync(`GROUP_LEARNING_${this.data.gradeId}`);  // 清除分组学习进度
    console.log('学习进度已清除');
  },

  // 强制重新开始学习（清除所有进度）
  forceRestartLearning() {
    this.clearLearningProgress();
    this.startNewGroupLearning();
    this.prepareCurrentWord();
    wx.showToast({
      title: '已重新开始学习',
      icon: 'success'
    });
  },

  // 检测进度并确认
  checkProgressAndConfirm() {
    const { currentPhase, currentGroup, phaseLabel } = this.data;
    
    // 确保有当前单词数据
    const currentGroupData = this.data.learningGroups[currentGroup - 1];
    if (currentGroupData) {
      // 找到当前应该学习的单词
      const { currentWordIndex } = this.data;
      const currentWord = currentGroupData.words[currentWordIndex] || currentGroupData.words[0];
      
      this.setData({ 
        currentGroupWords: currentGroupData.words,
        currentWord: currentWord
      });
    }
    
    wx.showModal({
      title: '检测到学习进度',
      content: `发现你之前学习到了第${currentGroup}组的${phaseLabel}，是否继续上次的进度？`,
      confirmText: '继续',
      cancelText: '重新',
      success: (res) => {
        if (res.cancel) {
          // 用户选择重新开始
          this.forceRestartLearning();
        } else {
          // 用户选择继续，直接准备当前单词
          this.prepareCurrentWord();
          this.setData({ loading: false });
          wx.showToast({
            title: '继续上次学习',
            icon: 'success'
          });
        }
      }
    });
  },
  
  // 设置学习数量
  setSessionTarget(target) {
    this.setData({ sessionTarget: target });
    this.saveLearningProgress();
  },

  onHide() {
    this._prefetchState().paused = true;
    // 你已有的保存逻辑...
    this.setData({ isPlaying:false });
    this.saveLearningProgress();
  },
  onShow() {
    this._prefetchState().paused = false;
    // 继续调度
    this._runPrefetchLoop();
  },
  onUnload() {
    this._prefetchState().paused = true;
    this.setData({ isPlaying:false, audioCache:{} });
    this.saveLearningProgress();
  }
});