// pages/learn/index.js
// 新训练流 + SRS
const { getGradeWords, recordTrainedWords } = require('../../utils/gradeWordDatabase.js');
const learningDataSync = require('../../utils/learningDataSync.js');
const { userManager } = require('../../utils/userManager.js');

// 引入工具函数模块
const { 
  generateHighlightedWord,
  generateHighlightedPhonetic
} = require('./utils/wordHighlightUtils.js');
const { 
  onOnce, 
  normalizeMeaning, 
  processLongText, 
  shuffle, 
  autoGrade, 
  lev, 
  getWordType, 
  shouldShowWordType 
} = require('./utils/commonUtils.js');
const { buildTTSUrl } = require('./utils/audioUtils.js');
const AudioManager = require('../../utils/audioManager.js');
const { getApiUrl, getDevApiBase } = require('../../utils/apiConfig.js');

// 引入业务模块
const createDataSyncModule = require('./modules/dataSync.js');
const createDebounceHelperModule = require('./modules/debounceHelper.js');
const createInteractionHandlerModule = require('./modules/interactionHandler.js');
const createCompatibilityHandlerModule = require('./modules/compatibilityHandler.js');
let createGroupManagerModule;
try {
  createGroupManagerModule = require('./modules/groupManager.js');
} catch (error) {
  console.warn('[learning] groupManager module missing, using fallback.', error);
  createGroupManagerModule = () => ({});
}
const createWordManagerModule = require('./modules/wordManager.js');
const createPhaseManagerModule = require('./modules/phaseManager.js');
const createRecognitionHandlerModule = require('./modules/recognitionHandler.js');
const createPhaseHandlersModule = require('./modules/phaseHandlers.js');
const createAudioManagerModule = require('./modules/audioManager.js');
const createSessionManagerModule = require('./modules/sessionManager.js');

// 统一音频实例
const innerAudio = wx.createInnerAudioContext();
innerAudio.autoplay = true;

Page({
  data: {
    // 基础
    gradeId: '', gradeName: '',
    loading: true,
    quantity: 10,          // 默认学习数量，会被onLoad中的参数覆盖
    mode: 'normal',        // 学习模式

    // 防抖控制
    isProcessing: false,   // 防止重复点击
    lastActionTime: 0,     // 上次操作时间
    isTransitioning: false,// 防止页面切换时的操作

    // 分组学习状态
    currentGroup: 1,       // 当前学习组（1, 2, 3, 4, 5...）
    totalGroups: 0,        // 总组数（动态计算）
    currentPhase: 1,       // 当前阶段（1）
          currentWordIndex: 0,   // 当前组内单词索引（0-4）
    
    // 学习组数据
    learningGroups: [],    // 所有分组的单词数据
    currentGroupWords: [], // 当前组的单词列表
    currentWord: null,     // 当前正在学习的单词
    highlightedWord: null, // 高亮单词的分段数据 {parts: Array<{text: string, highlight: boolean}>}
    phoneticTypeNote: '',  // 音标类型注释文本
    isLongWord: false,     // 单词是否超过7个字母

    // 简化阶段状态：认识阶段(phase0) + 1个学习阶段
    // phase0: 认识筛选, phase1: 认读练习
    wordPhaseStatus: {},   // {wordId: {phase0: 'unknown'|'mastered'|'needLearning', phase1: true}}
    
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
    accumulatedMasteredCount: 0,  // 累计已掌握单词数量
    accumulatedNeedLearningCount: 0, // 累计需要学习单词数量
    hasMoreWordsToLearn: false,   // 是否还有更多单词可以学习
    
    // 统计
    sessionTarget: 10,     // 当前组的学习数量，会被quantity覆盖
    sessionDone: 0,
    dueCount: 0,

    // 自我评估功能
    showSelfAssessment: false,     // 是否显示自我评估界面
    selfAssessmentScore: 0,        // 自我评估分数 (1-5)
    selfAssessmentHistory: [],     // 自我评估历史记录
    learnedWords: [],      // 已学习的单词列表
    

    // 年级切换器

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
    
    // 阶段状态
    phase: 'phase0',           // 当前阶段：phase0, phase1
    phaseLabel: '第1/1组·第1阶段', // 阶段标签显示
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

  // 返回上一个界面
  showMenuOptions() {
    try {
            wx.navigateBack();
    } catch (error) {
      console.error('返回失败:', error);
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
          '🔄 返回训练页面'
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
    // 兜底：把传入的 word 统一规范为字符串 id（使用 serialNumber/id）
    const wordId = (word && typeof word === 'object')
      ? (this.getWordId(word) || '')
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
      phase1: '四选一'
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

      return false;
    }
    
    if (this.data.isTransitioning) {

      return false;
    }
    
    if (timeSinceLastAction < minInterval) {
      return false;
    }
    
    // 设置防抖状态
    this.setData({ 
      isProcessing: true,
      lastActionTime: now 
    });

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

  /* ================= 调试接口 ================= */
  initDebugInterface() {
    // 将调试接口暴露到全局，方便控制台访问
    // 兼容微信小程序环境：尝试多种方式获取全局对象
    let globalObj = null;
    
    // 尝试多种方式获取全局对象
    if (typeof globalThis !== 'undefined') {
      globalObj = globalThis;
    } else if (typeof window !== 'undefined') {
      globalObj = window;
    } else if (typeof global !== 'undefined') {
      globalObj = global;
    } else if (typeof wx !== 'undefined') {
      // 微信小程序环境，尝试挂载到 wx 对象上
      globalObj = wx;
    } else {
      // 最后的备选方案：使用 Function 构造器获取全局作用域
      try {
        globalObj = (new Function('return this'))();
      } catch (e) {
        console.warn('无法获取全局对象:', e);
      }
    }
    
    // 如果仍然没有找到，尝试直接挂载到当前作用域（通过 eval）
    if (!globalObj) {
      try {
        // 在微信小程序中，控制台的作用域是全局作用域
        // 使用 eval 在全局作用域中创建变量
        eval('var __learningDebugGlobal = {};');
        globalObj = eval('__learningDebugGlobal');
      } catch (e) {
        console.warn('无法创建全局对象:', e);
      }
    }
    
    // 无论是否找到全局对象，都先创建调试接口对象
    const pageInstance = this; // 保存页面实例引用
    const debugInterface = {
        // 获取页面实例
        getPage: () => {
          // 优先使用保存的实例，如果不可用则尝试 getCurrentPages
          if (pageInstance && pageInstance.setData) {
            return pageInstance;
          }
          try {
            const pages = getCurrentPages();
            return pages && pages.length > 0 ? pages[pages.length - 1] : null;
          } catch (e) {
            console.warn('无法获取页面实例:', e);
            return pageInstance;
          }
        },
        
        // 查看当前状态
        status: () => {
          const page = globalObj.learningDebug.getPage();
          const data = page.data;
          return data;
        },
        
        // 切换到认识阶段
        toPhase0: () => {
          const page = globalObj.learningDebug.getPage();
          if (!page.data.currentWord && page.data.currentGroupWords.length > 0) {
            page.setData({
              currentWord: page.data.currentGroupWords[0],
              currentWordIndex: 0
            });
          }
          page.setData({
            phase: 'phase0',
            showFilterResult: false,
            loading: false,
            isRecognitionPhase: true
          });
        },
        
        // 切换到认读练习阶段
        toPhase1: () => {
          const page = globalObj.learningDebug.getPage();
          if (!page.data.currentWord && page.data.currentGroupWords.length > 0) {
            page.setData({
              currentWord: page.data.currentGroupWords[0],
              currentWordIndex: 0
            });
          }
          page.setData({
            phase: 'phase1',
            currentPhase: 1,
            showFilterResult: false,
            loading: false,
            isRecognitionPhase: false
          });
        },
        
        // 切换到过滤结果统计界面
        toFilterResult: () => {
          const page = globalObj.learningDebug.getPage();
          page.setData({
            showFilterResult: true,
            phase: 'phase0',
            currentWord: null,
            loading: false
          });
        },
        
        // 切换到完成界面
        toDone: () => {
          const page = globalObj.learningDebug.getPage();
          page.setData({
            phase: 'done',
            showFilterResult: false,
            loading: false
          });
        },
        
        // 切换到加载界面
        toLoading: () => {
          const page = globalObj.learningDebug.getPage();
          page.setData({
            loading: true
          });
        },
        
        // 跳转到指定单词（通过索引）
        gotoWord: (index) => {
          const page = globalObj.learningDebug.getPage();
          const words = page.data.currentGroupWords;
          if (index >= 0 && index < words.length) {
            page.setData({
              currentWord: words[index],
              currentWordIndex: index
            });
          } else {
            console.warn('❌ 索引超出范围，当前组有', words.length, '个单词');
          }
        },
        
        // 跳转到指定单词（通过单词文本）
        gotoWordByText: (wordText) => {
          const page = globalObj.learningDebug.getPage();
          const words = page.data.currentGroupWords;
          const index = words.findIndex(w => w.word === wordText || w.word.toLowerCase() === wordText.toLowerCase());
          if (index !== -1) {
            page.setData({
              currentWord: words[index],
              currentWordIndex: index
            });
          } else {
            console.warn('❌ 未找到单词:', wordText);
          }
        },
        
        // 切换到指定组
        gotoGroup: (groupNum) => {
          const page = globalObj.learningDebug.getPage();
          if (groupNum >= 1 && groupNum <= page.data.totalGroups) {
            // 这里需要重新加载组数据，简化处理
            page.setData({
              currentGroup: groupNum,
              currentWordIndex: 0
            });
            console.warn('⚠️ 注意：需要重新加载组数据才能完整切换');
          } else {
            console.warn('❌ 组号超出范围，总组数:', page.data.totalGroups);
          }
        },
        
        // 查看当前组的所有单词
        listWords: () => {
          const page = globalObj.learningDebug.getPage();
          const words = page.data.currentGroupWords;
          return words;
        },
        
        // 查看所有单词（包括所有组）
        listAllWords: () => {
          const page = globalObj.learningDebug.getPage();
          const allWords = page.data.allWords || [];
          return allWords;
        },
        
        // 重置防抖状态（用于测试时解除锁定）
        resetLock: () => {
          const page = globalObj.learningDebug.getPage();
          page.setData({
            isProcessing: false,
            isTransitioning: false
          });
        },
        
        // 显示帮助信息
        help: () => {
          // 帮助信息已移除
        }
      };
    
    // 将调试接口挂载到页面实例上（备用方案）
    pageInstance.learningDebug = debugInterface;
    
    if (globalObj) {
      // 将调试接口挂载到全局对象
      globalObj.learningDebug = debugInterface;
      
      // 添加全局快捷方法，方便直接调用（如：toPhase1() 而不是 window.learningDebug.toPhase1()）
      // 强制覆盖已存在的方法，确保总是使用最新的实现
      const shortcuts = ['status', 'toPhase0', 'toPhase1', 'toFilterResult', 'toDone', 'toLoading', 
                        'gotoWord', 'gotoWordByText', 'gotoGroup', 'listWords', 'listAllWords', 
                        'resetLock', 'help'];
      shortcuts.forEach(method => {
        // 强制创建/覆盖全局方法
        globalObj[method] = (...args) => {
          if (globalObj.learningDebug && typeof globalObj.learningDebug[method] === 'function') {
            return globalObj.learningDebug[method](...args);
          } else {
            console.error(`❌ 调试接口未初始化或方法 ${method} 不存在`);
          }
        };
      });
      
      // 在微信小程序中，还需要尝试通过 Function 构造器在全局作用域创建方法
      // 这样控制台可以直接访问
      try {
        // 获取全局作用域
        const getGlobal = new Function('return this');
        const globalScope = getGlobal();
        
        // 在全局作用域创建方法
        shortcuts.forEach(method => {
          if (!globalScope[method]) {
            globalScope[method] = (...args) => {
              const g = getGlobal();
              if (g && g.learningDebug && typeof g.learningDebug[method] === 'function') {
                return g.learningDebug[method](...args);
              } else {
                console.error(`❌ 调试接口未初始化或方法 ${method} 不存在`);
                return null;
              }
            };
          }
        });
        
        // 同时确保 learningDebug 也在全局作用域
        if (!globalScope.learningDebug) {
          globalScope.learningDebug = globalObj.learningDebug;
        }
      } catch (e) {
        // 忽略错误
      }
    }
  },

  /* ================= 生命周期 ================= */
  onLoad(options) {
    // 初始化学习页面
    
    // 初始化模块（将提取的模块方法合并到 this）
    const dataSyncModule = createDataSyncModule(this);
    const debounceHelperModule = createDebounceHelperModule(this);
    const interactionHandlerModule = createInteractionHandlerModule(this);
    const compatibilityHandlerModule = createCompatibilityHandlerModule(this);
    const groupManagerModule = createGroupManagerModule(this);
    const wordManagerModule = createWordManagerModule(this);
    const phaseManagerModule = createPhaseManagerModule(this);
    const recognitionHandlerModule = createRecognitionHandlerModule(this);
    const phaseHandlersModule = createPhaseHandlersModule(this);
    const audioManagerModule = createAudioManagerModule(this);
    const sessionManagerModule = createSessionManagerModule(this);
    
    // 合并模块方法到 Page 对象（如果方法不存在）
    Object.assign(this, {
      ...dataSyncModule,
      ...debounceHelperModule,
      ...interactionHandlerModule,
      ...compatibilityHandlerModule,
      ...groupManagerModule,
      ...wordManagerModule,
      ...phaseManagerModule,
      ...recognitionHandlerModule,
      ...phaseHandlersModule,
      ...audioManagerModule,
      ...sessionManagerModule,
      // 工具函数（直接使用，不需要模块）
      normalizeMeaning,
      processLongText,
      shuffle,
      autoGrade,
      lev,
      getWordType,
      shouldShowWordType,
      buildTTSUrl
    });
    
    const gradeId = options.grade || '';
    const gradeName = decodeURIComponent(options.gradeName || '');
    const quantity = parseInt(options.quantity) || 10;  // 接收学习数量参数，默认10个
    const mode = options.mode || 'normal'; // 学习模式
    const isContinue = options.continue === 'true'; // 是否为继续学习

    // 非会员限制：累计学习/掌握达到上限（默认30）后，提示付费解锁
    const membershipStatus = userManager.getMembershipStatus();
    if (!membershipStatus.isPremium && userManager.hasReachedFreeLimit()) {
      const learned = userManager.getTotalMasteredWordsCount();
      const limit = (membershipStatus.config && membershipStatus.config.maxLearnedWords) || 30;
      wx.showModal({
        title: '需要解锁会员',
        content: `免费版累计可学习 ${limit} 个单词，您已达到 ${learned} 个。\n\n开通会员即可继续学习。`,
        confirmText: '立即开通',
        cancelText: '返回',
        success: (res) => {
          if (res.confirm) {
            wx.navigateTo({ url: '/pages/payment/payment' });
          } else {
            wx.navigateBack();
          }
        }
      });
      return;
    }
    
    this.setData({ 
      gradeId, 
      gradeName, 
      quantity,
      mode,
      isContinue,
      sessionStartTime: Date.now() // 初始化会话开始时间
    });

    // 初始化调试接口
    this.initDebugInterface();

    this.bootstrap();
  },

  async bootstrap() {
    try {
      wx.showLoading({ title: this.data.isContinue ? '恢复学习中...' : '加载词汇中...' });

      console.log('[Learning] 开始加载年级:', this.data.gradeId);

      // 初始化累计数据
      this.initAccumulatedData();

      // 加载所有单词
      console.log('[Learning] 开始加载单词数据...');
      let allWords = await getGradeWords(this.data.gradeId, 1000, 'training') || [];
      console.log('[Learning] 加载完成，单词数量:', allWords ? allWords.length : 0);

      // 已解除限制：不再检查激活状态，所有用户都可以访问全部单词

      if (!allWords.length) {
        console.error('[Learning] 单词数据为空，无法继续');
        wx.hideLoading();
        wx.showModal({ title: '暂无词汇', content: '该年级暂无可用词汇', showCancel: false, success:()=>wx.navigateBack() });
        return;
      }
      
      // 设置全局词库，供 makeChoices 使用
      this.words = allWords;

      // 规范化单词数据
      this.allWords = allWords.map((w, index) => {
        // 修复初中年级单词缺少serialNumber的问题
        if (!w.serialNumber || w.serialNumber === '') {
          w.serialNumber = String(index + 1);
        }
        const normalizedMeaning = this.normalizeMeaning(w.meaning);
        
        // 检查含义数据异常
        if (normalizedMeaning === '[object Object]' || normalizedMeaning.includes('object Object')) {
          console.warn('发现含义数据异常:', {
            word: w.word,
            originalMeaning: w.meaning,
            normalizedMeaning: normalizedMeaning,
            meaningType: typeof w.meaning
          });
        }
        
        // 提取高亮字母和备注，支持多种字段名
        const highlightLetters = w.highlightLetters !== undefined ? w.highlightLetters : 
                                 (w.highlightLetter !== undefined ? w.highlightLetter : '');
        const note = w.note !== undefined ? w.note : 
                    (w.rule !== undefined ? w.rule : '');
        // 提取音标高亮字段
        const highlightPhonetic = w.highlightPhonetic !== undefined ? w.highlightPhonetic : '';
        
        // 生成唯一ID：如果数据中有id就用id，否则基于word+phonetic+highlightLetters生成唯一ID
        let uniqueId = w.id;
        if (!uniqueId) {
          // 将highlightLetters转换为字符串（可能是数组）
          const highlightStr = Array.isArray(highlightLetters) 
            ? highlightLetters.join(',') 
            : (highlightLetters || '');
          // 组合word、phonetic、highlightLetters生成唯一ID
          const idParts = [
            w.word || '',
            w.phonetic || '',
            highlightStr
          ].filter(p => p).join('|');
          // 如果组合后还是相同（理论上不应该），使用索引作为后缀
          uniqueId = idParts || `word_${index}`;
        }
        
        
        const normalizedWord = {
          id: uniqueId,
          word: w.word,
          phonetic: w.phonetic || '',
          meaning: normalizedMeaning,
          examples: w.examples || [],
          wordType: this.getWordType(w.word, w.meaning, w),
          highlightLetters: highlightLetters,
          highlightPhonetic: highlightPhonetic,
          note: note,
          partOfSpeech: w.partOfSpeech,
          grade: w.grade,
          serialNumber: w.serialNumber
        };
        
        return normalizedWord;
      });

      // 获取学习数量参数
      const quantity = this.data.quantity || 10;

      this.createLearningGroups(quantity);

      // 🔧 修复：如果是继续学习模式，直接尝试恢复分组学习进度
      if (this.data.isContinue) {
        const hasProgress = this.loadGroupLearningProgress();

        if (!hasProgress) {
          // 没有找到分组学习进度，可能是数据丢失或格式问题
          console.warn('继续学习模式下没有找到分组学习进度，尝试开始新学习');
          wx.showToast({
            title: '学习进度已重置，开始新学习',
            icon: 'none',
            duration: 2000
          });
          this.startNewGroupLearning();
        }
        // 如果有进度，直接使用，不需要询问用户
      } else {
        // 正常学习模式：尝试恢复学习进度
        const hasProgress = this.loadGroupLearningProgress();

        if (!hasProgress) {
          // 开始新的学习，从第1组第1阶段开始
          this.startNewGroupLearning();
        } else {
          // 检测到已有进度，询问用户是否继续或重新开始
          this.checkProgressAndConfirm();
        }
      }

      // 准备当前单词的训练内容
      this.prepareCurrentWord();

      // 确保加载状态被正确重置
      this.setData({ loading: false });
      wx.hideLoading();
      
      // 注册全局播放回调，用于更新 isPlaying 状态
      AudioManager.setCallbacks({
        onPlay: () => {
          this.setData({ isPlaying: true });
        },
        onEnded: () => {
          this.setData({ isPlaying: false });
        },
        onStop: () => {
          this.setData({ isPlaying: false });
        },
        onError: () => {
          this.setData({ isPlaying: false });
        },
      });
      
      // 🚀 预加载音频，提升发音响应速度
      this.preloadAudioForCurrentSession();

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
  
  // 初始化累计数据
  initAccumulatedData() {
    try {
      // 获取累计数据
      const accumulatedMastered = wx.getStorageSync('ACCUMULATED_MASTERED_WORDS') || [];
      const accumulatedNeedLearning = wx.getStorageSync('ACCUMULATED_NEED_LEARNING_WORDS') || [];
      
      // 计算累计总数
      const totalAccumulatedMastered = accumulatedMastered.length;
      const totalAccumulatedNeedLearning = accumulatedNeedLearning.length;
      
      // 更新页面数据
      this.setData({
        accumulatedMasteredCount: totalAccumulatedMastered,
        accumulatedNeedLearningCount: totalAccumulatedNeedLearning
      });

    } catch (e) {
      console.error('初始化累计数据失败:', e);
    }
  },
  
  // 获取单词的唯一标识符（优先使用 serialNumber，然后是 id，最后是 word）
  getWordId(word) {
    if (!word) return null;
    // 优先使用 serialNumber（这是每个单词独一无二的标识）
    if (word.serialNumber !== undefined && word.serialNumber !== null && word.serialNumber !== '') {
      return String(word.serialNumber);
    }
    // 其次使用 id
    if (word.id !== undefined && word.id !== null && word.id !== '') {
      return String(word.id);
    }
    // 最后使用 word 字段（向后兼容）
    return word.word || null;
  },
  
  // 迁移旧的 wordPhaseStatus 键格式（从 word 字段迁移到 serialNumber）
  migrateWordPhaseStatus(oldWordPhaseStatus) {
    if (!oldWordPhaseStatus || typeof oldWordPhaseStatus !== 'object') {
      return oldWordPhaseStatus || {};
    }
    
    const migrated = {};
    let hasMigration = false;
    
    // 遍历所有单词，将旧的键（可能是 word 字段）转换为新的键（serialNumber）
    for (const word of this.allWords || []) {
      const newKey = this.getWordId(word);
      if (!newKey) continue;
      
      // 检查是否有旧格式的键（可能是 word 字段）
      const oldKey = word.word || word.id;
      if (oldKey && oldWordPhaseStatus[oldKey] && oldKey !== newKey) {
        // 发现旧格式的键，迁移到新格式
        migrated[newKey] = oldWordPhaseStatus[oldKey];
        hasMigration = true;
      } else if (oldWordPhaseStatus[newKey]) {
        // 已经是新格式，直接使用
        migrated[newKey] = oldWordPhaseStatus[newKey];
      }
    }
    
    // 如果有迁移，保存迁移后的状态
    if (hasMigration) {
      console.log('🔄 迁移了 wordPhaseStatus 键格式（从 word 到 serialNumber）');
      const progressKey = `GROUP_LEARNING_${this.data.gradeId}`;
      const savedProgress = wx.getStorageSync(progressKey);
      if (savedProgress) {
        savedProgress.wordPhaseStatus = migrated;
        wx.setStorageSync(progressKey, savedProgress);
      }
    }
    
    return migrated;
  },
  
  // 获取已掌握的单词列表（兼容旧格式，自动迁移）
  getMasteredWords() {
    try {
      const masteredKey = `MASTERED_WORDS_${this.data.gradeId}`;
      let masteredWords = wx.getStorageSync(masteredKey) || [];
      
      // 检查是否需要迁移：如果列表中有 word 格式的条目，需要转换为 serialNumber
      const needsMigration = masteredWords.some(item => {
        // 如果 item 是字符串，且能在 allWords 中找到对应的单词
        if (typeof item === 'string') {
          const word = this.allWords?.find(w => w.word === item);
          if (word) {
            const serialNumber = this.getWordId(word);
            // 如果 serialNumber 与 item 不同，说明需要迁移
            return serialNumber && serialNumber !== item;
          }
        }
        return false;
      });
      
      if (needsMigration && this.allWords && this.allWords.length > 0) {
        // 执行迁移：将 word 格式转换为 serialNumber 格式
        const migratedWords = [];
        const seenIds = new Set();
        
        for (const item of masteredWords) {
          if (typeof item === 'string') {
            // 尝试在 allWords 中找到对应的单词
            const word = this.allWords.find(w => w.word === item || w.id === item);
            if (word) {
              const wordId = this.getWordId(word);
              if (wordId && !seenIds.has(wordId)) {
                migratedWords.push(wordId);
                seenIds.add(wordId);
              }
            } else {
              // 如果找不到，可能是 serialNumber 格式，直接保留
              if (!seenIds.has(item)) {
                migratedWords.push(item);
                seenIds.add(item);
              }
            }
          } else {
            // 非字符串格式，直接保留
            migratedWords.push(item);
          }
        }
        
        // 保存迁移后的数据
        masteredWords = migratedWords;
        wx.setStorageSync(masteredKey, masteredWords);
        console.log('🔄 迁移了已掌握单词列表（从 word 到 serialNumber）');
      }

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

      }
    } catch (e) {
      console.error('保存已掌握单词失败:', e);
    }
  },
  
  // 创建学习分组
  createLearningGroups(quantity) {
    // 检查 allWords 是否已加载
    if (!this.allWords || this.allWords.length === 0) {
      console.error('❌ allWords 未加载或为空！');
      return;
    }
    
    // 获取已掌握的单词列表（会自动迁移旧格式）
    const masteredWords = this.getMasteredWords();
    
    // 过滤掉已掌握的单词
    // 使用 serialNumber/id 作为唯一标识符
    const availableWords = this.allWords.filter(word => {
      const wordId = this.getWordId(word);
      if (!wordId) return false; // 如果没有标识符，跳过
      
      // 检查是否已掌握（基于 serialNumber/id）
      const isMastered = masteredWords.includes(wordId);
      
      return !isMastered;
    });
    
    // 调试日志：检查过滤结果
    if (availableWords.length > 0 && availableWords.length < this.allWords.length) {
      console.log('📊 过滤已掌握单词:', {
        总单词数: this.allWords.length,
        已掌握数: masteredWords.length,
        可用单词数: availableWords.length,
        前5个可用单词ID: availableWords.slice(0, 5).map(w => this.getWordId(w)),
        前5个可用单词serialNumber: availableWords.slice(0, 5).map(w => w.serialNumber)
      });
    }
    
    // 如果过滤后没有可用单词，但已掌握数量小于总数，说明有问题
    if (availableWords.length === 0 && masteredWords.length < this.allWords.length) {
      console.error('❌ 严重问题：过滤后没有可用单词，但已掌握数量小于总数！', {
        总单词数: this.allWords.length,
        已掌握数: masteredWords.length,
        已掌握单词列表: masteredWords,
        前10个单词ID: this.allWords.slice(0, 10).map(w => w.id || w.word),
        前10个单词对象: this.allWords.slice(0, 10)
      });
      
      // 尝试修复：使用 getWordId 重新过滤
      const fixedAvailableWords = this.allWords.filter(word => {
        const wordId = this.getWordId(word);
        if (!wordId) return false;
        return !masteredWords.includes(wordId);
      });
      
      if (fixedAvailableWords.length > 0) {
        console.warn('⚠️ 检测到ID格式不匹配，使用 getWordId 重新过滤，找到可用单词:', fixedAvailableWords.length);
        
        // 继续使用修复后的列表创建分组
          // 正常学习模式：按照 grade3_1.js 文件中的原始顺序排序（使用 serialNumber）
        let sortedWords;
          sortedWords = [...fixedAvailableWords].sort((a, b) => {
            // 优先使用 serialNumber 排序（保持文件中的原始顺序）
            if (a.serialNumber !== undefined && b.serialNumber !== undefined) {
              const numA = parseInt(a.serialNumber) || 0;
              const numB = parseInt(b.serialNumber) || 0;
              return numA - numB;
            }
            
            // 如果只有一个有 serialNumber，有 serialNumber 的排在前面
            if (a.serialNumber !== undefined) return -1;
            if (b.serialNumber !== undefined) return 1;
            
            // 如果都没有 serialNumber，保持原始顺序（不排序）
            return 0;
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
        
        this.words = sortedWords;
        this.setData({
          learningGroups,
          totalGroups,
          sessionTarget: quantity
        });

        return;
      }
      
      // 如果修复后仍然没有可用单词，检查是否所有单词都已掌握
      if (masteredWords.length >= this.allWords.length) {
        // 所有单词都已掌握，跳转到完成界面
        console.log('🎉 数据修复后发现所有单词都已掌握，跳转到完成页面');
        wx.hideLoading();
        this.showAllWordsMasteredCompletion();
        return;
      }

      // 如果确实是数据异常，显示错误提示
      wx.hideLoading();
      wx.showModal({
        title: '数据异常',
        content: `检测到数据异常：总共有${this.allWords.length}个单词，但只有${masteredWords.length}个已掌握，却无法找到可学习的单词。请尝试重新开始学习。`,
        showCancel: true,
        confirmText: '重新开始',
        cancelText: '返回',
        success: (res) => {
          if (res.confirm) {
            // 清除学习进度，重新开始
            const progressKey = `GROUP_LEARNING_${this.data.gradeId}`;
            wx.removeStorageSync(progressKey);
            // 重新加载页面
            this.bootstrap();
          } else {
            wx.navigateBack();
          }
        }
      });
      return;
    }
    
    if (availableWords.length === 0) {
      // 所有单词都已掌握，跳转到完成界面
      console.log('🎉 所有单词都已掌握，跳转到完成页面');
      wx.hideLoading();
      this.showAllWordsMasteredCompletion();
      return;
    }
    
      // 正常学习模式：按照 grade3_1.js 文件中的原始顺序排序（使用 serialNumber）
      // 如果单词有 serialNumber 字段，按它排序；否则保持原始顺序
    let sortedWords;
      sortedWords = [...availableWords].sort((a, b) => {
        // 优先使用 serialNumber 排序（保持文件中的原始顺序）
        if (a.serialNumber !== undefined && b.serialNumber !== undefined) {
          const numA = parseInt(a.serialNumber) || 0;
          const numB = parseInt(b.serialNumber) || 0;
          return numA - numB;
        }
        
        // 如果只有一个有 serialNumber，有 serialNumber 的排在前面
        if (a.serialNumber !== undefined) return -1;
        if (b.serialNumber !== undefined) return 1;
        
        // 如果都没有 serialNumber，保持原始顺序（不排序）
        return 0;
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

  },
  
  // 开始新的分组学习
  startNewGroupLearning() {
    // 初始化所有单词的阶段状态
    const wordPhaseStatus = {};
    if (this.words && Array.isArray(this.words)) {
      this.words.forEach(word => {
        const wordId = this.getWordId(word);
        if (wordId) {
          wordPhaseStatus[wordId] = {
          phase0: 'unknown',  // 认识筛选：unknown | mastered | needLearning
          phase1: false       // 认读练习
        };
        }
      });
    }
    
    const firstGroupWords = this.data.learningGroups[0]?.words || [];
    const firstWord = firstGroupWords[0] || null;
    
    // 正常学习模式：从认识阶段开始
    this.setData({
      currentGroup: 1,
      currentPhase: 0,
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
    
    // 预加载本组单词音频
    this.setupCurrentGroup(firstGroupWords);
    
    // 开始新学习时，初始化累计数据
    this.initAccumulatedData();

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
      
      // 检查每个单词的各个阶段完成状态
      for (const word of group.words) {
        const wordId = this.getWordId(word);
        if (!wordId) continue;
        const status = wordPhaseStatus[wordId] || {};
        
        if (status.phase0 !== 'mastered' && status.phase0 !== 'needLearning') {
          phase0Complete = false;
        }
        if (!status.phase1) phase1Complete = false;
      }
      
      // 确定当前应该学习的阶段
      let currentPhase;
      let isRecognitionPhase = false;
      
      if (!phase0Complete) {
        currentPhase = 0;
        isRecognitionPhase = true;
      } else if (!phase1Complete) {
        currentPhase = 1;
      } else {
        // 这个组完全完成了，继续下一组
        continue;
      }
      
      // 找到第一个需要学习当前阶段的单词
      let currentWordIndex = 0;
      for (let i = 0; i < group.words.length; i++) {
        const word = group.words[i];
        const wordId = this.getWordId(word);
        if (!wordId) continue;
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
      currentPhase: 1,
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
        // 迁移旧的 wordPhaseStatus 键格式（从 word 字段迁移到 serialNumber）
        const migratedWordPhaseStatus = this.migrateWordPhaseStatus(savedProgress.wordPhaseStatus);
        
        // 分析实际的学习进度（使用迁移后的状态）
        const actualProgress = this.analyzeActualProgress(migratedWordPhaseStatus);

        const totalGroups = this.data.learningGroups ? this.data.learningGroups.length : this.data.totalGroups || 0;
        
        // 设置正确的phase和phaseLabel
        const phase = actualProgress.currentPhase === 0 ? 'phase0' : `phase${actualProgress.currentPhase}`;
        const phaseLabel = this.getPhaseLabel(actualProgress.currentPhase);
        
        this.setData({
          currentGroup: actualProgress.currentGroup,
          currentPhase: actualProgress.currentPhase,
          currentWordIndex: actualProgress.currentWordIndex,
          phase: phase,
          phaseLabel: phaseLabel,
          // 认出中文，读对英文（使用迁移后的状态）
          wordPhaseStatus: migratedWordPhaseStatus,
          isRecognitionPhase: actualProgress.isRecognitionPhase,
          totalGroups: totalGroups, // 确保 totalGroups 被正确设置
          loading: false
        });
        
        // 设置当前组的单词
        const currentGroupData = this.data.learningGroups[actualProgress.currentGroup - 1];
        if (currentGroupData) {
          this.setData({ currentGroupWords: currentGroupData.words });
          // 预加载本组单词音频
          this.setupCurrentGroup(currentGroupData.words);
        } else {
          console.warn('⚠️ 当前组数据不存在，learningGroups长度:', this.data.learningGroups?.length);
        }
        
        // 恢复学习进度时，重新初始化累计数据
        this.initAccumulatedData();

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
        timestamp: Date.now()
      };
      
      try {
        wx.setStorageSync(progressKey, progressData);

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
      
      // iOS兼容性设置
      innerAudio.autoplay = false;
      innerAudio.volume = 1.0;

      // 设置超时
      const timeout = setTimeout(() => {
        console.warn('音频播放超时');
        reject(new Error('音频播放超时'));
      }, 10000);

      onOnce(innerAudio, 'Play', () => {
        clearTimeout(timeout);
        resolve();
      });
      onOnce(innerAudio, 'Error', (e) => {
        clearTimeout(timeout);
        reject(e);
      });
      // 结束后复位播放状态
      onOnce(innerAudio, 'Ended', () => {
        clearTimeout(timeout);
        this.setData({ isPlaying: false });
      });
      onOnce(innerAudio, 'Stop', () => {
        clearTimeout(timeout);
        this.setData({ isPlaying: false });
      });

      // iOS兼容性：延迟播放
      setTimeout(() => {
        try { 
          innerAudio.play(); 
        } catch (e) { 
          console.error('播放失败:', e);
          clearTimeout(timeout);
          reject(e);
        }
      }, 100);
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

  shuffle(a){ 
    if (!a || !Array.isArray(a)) return [];
    return a.map(x=>[Math.random(),x]).sort((p,q)=>p[0]-q[0]).map(p=>p[1]); 
  },
  makeChoices(correct) {
    // 规范化正确答案，去除换行符和多余空格
    const normalizedCorrect = this.normalizeMeaning(correct).replace(/\n/g, '').replace(/\r/g, '').trim();
    
    // 先尝试从原始学习组获取选项（包含所有单词，包括已掌握的）
    let availableMeanings = [];
    
    // 优先从当前组的原始单词列表获取选项
    const currentGroupIndex = this.data.currentGroup - 1;
    const originalGroupWords = this.data.learningGroups && this.data.learningGroups[currentGroupIndex] 
      ? this.data.learningGroups[currentGroupIndex].words : null;
    
    if (originalGroupWords && originalGroupWords.length > 0) {
      availableMeanings = originalGroupWords
        .map(w => {
          // 规范化含义，去除换行符
          const normalized = this.normalizeMeaning(w.meaning).replace(/\n/g, '').replace(/\r/g, '').trim();
          return normalized;
        })
        .filter(m => m && m !== normalizedCorrect);

    }
    
    // 如果原始组选项不够，再尝试当前组（筛选后的）
    if (availableMeanings.length < 3 && this.data.currentGroupWords && this.data.currentGroupWords.length > 0) {
      const currentGroupMeanings = this.data.currentGroupWords
        .map(w => {
          // 规范化含义，去除换行符
          const normalized = this.normalizeMeaning(w.meaning).replace(/\n/g, '').replace(/\r/g, '').trim();
          return normalized;
        })
        .filter(m => m && m !== normalizedCorrect && !availableMeanings.includes(m));
      
      availableMeanings = [...availableMeanings, ...currentGroupMeanings];

    }
    
    // 如果还是不够，使用全局词库
    if (availableMeanings.length < 3) {

      if (!this.words || !Array.isArray(this.words)) {
        console.error('makeChoices: this.words未正确设置，this.words:', this.words);
        const placeholders = ['选项A', '选项B', '选项C'];
        const choices = this.shuffle([normalizedCorrect, ...placeholders.slice(0, 3)]);
        return choices;
      }
      
      const globalMeanings = this.words
        .map(w => {
          // 规范化含义，去除换行符
          const normalized = this.normalizeMeaning(w.meaning).replace(/\n/g, '').replace(/\r/g, '').trim();
          return normalized;
        })
        .filter(m => m && m !== normalizedCorrect && !availableMeanings.includes(m));
      
      availableMeanings = [...availableMeanings, ...globalMeanings];

    }
    
    // 去重处理
    availableMeanings = [...new Set(availableMeanings)];
    
    // 生成最终选项
    if (availableMeanings.length < 3) {

      // 补充占位符
      while (availableMeanings.length < 3) {
        availableMeanings.push(`选项${availableMeanings.length + 1}`);
      }
    }
    
    const ds = this.shuffle(availableMeanings).slice(0, 3);
    const choices = this.shuffle([normalizedCorrect, ...ds]);
    

    return choices;
  },
  
  /* ================= 单词和阶段管理 ================= */
  
  // 准备当前单词
  prepareCurrentWord() {
    const currentWord = this.getCurrentWord();
    if (!currentWord) {
      console.warn('没有当前单词可用');

      if (this.data.currentGroupWords && this.data.currentGroupWords.length > 0) {
        const firstWord = this.data.currentGroupWords[0];
        this.setData({
          currentWord: firstWord,
          currentWordIndex: 0,
          loading: false
        });
        this.updateWordHighlight(firstWord);
        this.prepareCurrentPhase(firstWord);
      } else {
        // 如果确实没有单词，检查是否所有单词都已掌握
        this.setData({ loading: false });

        // 检查是否所有单词都已掌握
        const masteredWords = this.getMasteredWords();
        if (masteredWords.length >= this.allWords.length) {
          // 所有单词都已掌握，显示完成界面
          this.showAllWordsMasteredCompletion();
        } else {
          // 🔧 修复：如果是继续学习模式，给出更友好的提示
          if (this.data.isContinue) {
            wx.showModal({
              title: '学习进度异常',
              content: '未找到可继续学习的进度，可能由于数据异常或学习已完成。是否开始新学习？',
              confirmText: '开始新学习',
              cancelText: '返回首页',
              success: (res) => {
                if (res.confirm) {
                  // 清除可能损坏的进度数据，开始新学习
                  wx.removeStorageSync(`GROUP_LEARNING_${this.data.gradeId}`);
                  wx.removeStorageSync(`LEARNING_PROGRESS_${this.data.gradeId}`);
                  this.startNewGroupLearning();
                } else {
                  wx.navigateBack();
                }
              }
            });
          } else {
            // 普通学习模式下的错误提示
            wx.showModal({
              title: '没有可学习的单词',
              content: '当前组没有可用的单词，请重新选择学习内容',
              showCancel: false,
              success: () => wx.navigateBack()
            });
          }
        }
      }
      return;
    }
    
    // 创建新对象，避免直接修改原始数据
    const processedWord = { ...currentWord };
    
    // 确保当前单词的含义数据已经规范化处理
    if (processedWord.meaning && typeof processedWord.meaning === 'object') {
      processedWord.meaning = this.normalizeMeaning(processedWord.meaning);
    }
    
    // 处理长文本释义
    if (processedWord.meaning && processedWord.meaning.length > 6) {
      processedWord.originalMeaning = processedWord.meaning;
      processedWord.meaning = this.processLongText(processedWord.meaning);
    }
    
    this.setData({ currentWord: processedWord, loading: false });
    this.updateWordHighlight(processedWord);
    this.prepareCurrentPhase(processedWord);
    
    // 强制刷新数据，确保界面显示正确
    setTimeout(() => {
      const currentWordData = this.data.currentWord;
      if (currentWordData && currentWordData.meaning && typeof currentWordData.meaning === 'object') {
        const refreshedWord = { ...currentWordData };
        refreshedWord.meaning = this.normalizeMeaning(refreshedWord.meaning);
        this.setData({ currentWord: refreshedWord });
        this.updateWordHighlight(refreshedWord);
      }
    }, 100);
  },

  // 规范化词义字段
  normalizeMeaning(meaning) {
    if (!meaning) return '';
    
    // 如果是字符串，直接返回
    if (typeof meaning === 'string') {
      return meaning;
    }
    
    // 如果是对象，尝试提取文本内容
    if (typeof meaning === 'object') {
      // 如果是数组，取第一个元素
      if (Array.isArray(meaning)) {
        return meaning.length > 0 ? String(meaning[0]) : '';
      }
      
      // 如果是对象，尝试提取常见字段
      if (meaning.text) return String(meaning.text);
      if (meaning.definition) return String(meaning.definition);
      if (meaning.translation) return String(meaning.translation);
      if (meaning.meaning) return String(meaning.meaning);
      if (meaning.chinese) return String(meaning.chinese);
      if (meaning.zh) return String(meaning.zh);
      if (meaning.cn) return String(meaning.cn);
      
      // 尝试获取对象的第一个字符串值
      for (const key in meaning) {
        if (meaning.hasOwnProperty(key)) {
          const value = meaning[key];
          if (typeof value === 'string' && value.trim()) {
            return value.trim();
          }
        }
      }
      
      // 如果对象有toString方法，使用toString
      if (typeof meaning.toString === 'function') {
        const str = meaning.toString();
        if (str !== '[object Object]') {
          return str;
        }
      }
      
      // 最后尝试JSON.stringify，但限制深度避免循环引用
      try {
        const jsonStr = JSON.stringify(meaning, null, 2);
        // 如果JSON字符串太长，截取前200个字符
        return jsonStr.length > 200 ? jsonStr.substring(0, 200) + '...' : jsonStr;
      } catch (e) {
        console.warn('无法序列化含义对象:', meaning, e);
        return '含义数据格式异常';
      }
    }
    
    // 其他类型，转换为字符串
    return String(meaning);
  },

  // 更新单词高亮数据
  updateWordHighlight(word) {
    if (!word) {
      this.setData({
        highlightedWord: null,
        highlightedPhonetic: null,
        phoneticTypeNote: '',
        isLongWord: false
      });
      return;
    }

    // 检测单词长度，超过7个字母则标记为长单词
    const isLongWord = word.word && word.word.length > 7;

    // 从单词数据中读取 highlightLetters 字段
    const highlightLetters = word.highlightLetters || word.highlightLetter;
    
    const highlightedData = generateHighlightedWord(word.word, word.phonetic, highlightLetters);
    
    // 处理音标高亮
    // highlightPhonetic 可能是提示文本（如 "a读字母音/eɪ/"），需要提取音标部分
    // 或者使用 note 字段（如 "/eɪ/"）
    let phoneticToHighlight = '';
    if (word.highlightPhonetic) {
      // 尝试从 highlightPhonetic 中提取音标部分（在斜杠之间的内容）
      const match = word.highlightPhonetic.match(/\/([^\/]+)\//);
      if (match && match[1]) {
        phoneticToHighlight = match[1]; // 提取 "eɪ"
      } else {
        // 如果没有斜杠，尝试直接使用（可能是纯音标）
        phoneticToHighlight = word.highlightPhonetic;
      }
    }
    // 如果 highlightPhonetic 提取失败，尝试使用 note 字段
    if (!phoneticToHighlight && word.note) {
      // note 可能是 "/eɪ/" 格式，去掉斜杠
      phoneticToHighlight = word.note.replace(/\//g, '');
    }
    
    const highlightedPhoneticData = generateHighlightedPhonetic(word.phonetic, phoneticToHighlight);
    
    this.setData({
      highlightedWord: highlightedData.parts,
      highlightedPhonetic: highlightedPhoneticData,
      phoneticTypeNote: highlightedData.phoneticType,
      isLongWord: isLongWord
    });
  },
  
  // 处理长文本释义
  processLongText(text) {
    if (!text || text.length <= 6) return text;
    
    // 如果包含括号，在括号后换行
    if (text.includes('(') && text.includes(')')) {
      return text.replace(/\)/g, ')\n');
    }
    
    // 如果包含逗号，在逗号后换行
    if (text.includes('，')) {
      return text.replace(/，/g, '，\n');
    }
    
    // 如果包含顿号，在顿号后换行
    if (text.includes('、')) {
      return text.replace(/、/g, '、\n');
    }
    
    // 如果包含斜杠，在斜杠后换行
    if (text.includes('/')) {
      return text.replace(/\//g, '/\n');
    }
    
    // 如果包含分号，在分号后换行
    if (text.includes('；')) {
      return text.replace(/；/g, '；\n');
    }
    
    // 如果包含冒号，在冒号后换行
    if (text.includes('：')) {
      return text.replace(/：/g, '：\n');
    }
    
    // 如果文本很长但没有标点，在中间位置截断
    if (text.length > 20) {
      const midPoint = Math.floor(text.length / 2);
      return text.substring(0, midPoint) + '\n' + text.substring(midPoint);
    }
    
    return text;
  },

  // 获取当前单词
  getCurrentWord() {
    const { currentGroupWords, currentWordIndex } = this.data;
    return currentGroupWords[currentWordIndex] || null;
  },
  
  // 获取阶段标签
  getPhaseLabel(phase) {
    // 确保获取最新的组信息
    const currentGroup = this.data.currentGroup || 1;
    const totalGroups = this.data.totalGroups || 1;
    const labels = {
      0: '认出中文，读对英文',
      1: '认读练习'
    };
    const phaseText = labels[phase] || `第${phase}阶段`;
    return `第${currentGroup}/${totalGroups}组 · ${phaseText}`;
  },



  // 自动判断词性（改进规则）
  getWordType(word, meaning, dataSource = null) {
    // 优先使用数据源的类型信息
    if (dataSource && dataSource.partOfSpeech) {
      const partOfSpeech = dataSource.partOfSpeech;
      // 将中文类型转换为英文标识
      if (partOfSpeech === '句子') return 'sentence';
      if (partOfSpeech === '短语') return 'phrase';
      if (partOfSpeech === '名词') return 'noun';
      if (partOfSpeech === '动词') return 'verb';
      if (partOfSpeech === '形容词') return 'adjective';
      if (partOfSpeech === '名词短语') return 'noun_phrase';
      // 如果已经是英文标识，直接返回
      return partOfSpeech;
    }
    
    // 回退到原有逻辑：优先检查是否为短语（多个单词组合）
    if (word.includes(' ') || word.includes('-')) {
      return 'phrase';
    }
    
    // 检查含义中的词性提示
    if (meaning.includes('短语') || meaning.includes('词组')) return 'phrase';
    
    // 动词识别（扩展关键词）
    const verbKeywords = [
      '着', '了', '过', '做', '进行', '执行', '去', '来', '走', '跑', '看', '听', '说', '吃', '喝',
      '玩', '学', '教', '写', '读', '画', '唱', '跳', '飞', '游', '骑', '开', '关', '打', '拿',
      '给', '买', '卖', '找', '想', '爱', '喜欢', '帮助', '工作', '睡觉', '起床', '洗澡', '刷牙'
    ];
    
    for (let keyword of verbKeywords) {
      if (meaning.includes(keyword)) {
        return 'verb';
      }
    }
    
    // 形容词识别（扩展关键词）
    const adjKeywords = [
      '的', '地', '很', '非常', '漂亮', '好', '坏', '大', '小', '高', '矮', '长', '短',
      '新', '旧', '快', '慢', '热', '冷', '暖', '凉', '干', '湿', '干净', '脏', '亮', '暗',
      '红', '蓝', '绿', '黄', '黑', '白', '甜', '酸', '辣', '苦', '咸', '香', '臭',
      '年轻', '老', '胖', '瘦', '强', '弱', '聪明', '笨', '勇敢', '害怕', '开心', '难过'
    ];
    
    for (let keyword of adjKeywords) {
      if (meaning.includes(keyword)) {
        return 'adjective';
      }
    }
    
    // 特殊单词词性判断
    const specialWords = {
      // 动词
      'need': 'verb', 'want': 'verb', 'like': 'verb', 'love': 'verb', 'hate': 'verb',
      'can': 'verb', 'will': 'verb', 'should': 'verb', 'must': 'verb', 'may': 'verb',
      'go': 'verb', 'come': 'verb', 'get': 'verb', 'make': 'verb', 'take': 'verb',
      'give': 'verb', 'put': 'verb', 'see': 'verb', 'know': 'verb', 'think': 'verb',
      'feel': 'verb', 'look': 'verb', 'find': 'verb', 'use': 'verb', 'work': 'verb',
      'play': 'verb', 'run': 'verb', 'walk': 'verb', 'sit': 'verb', 'stand': 'verb',
      'eat': 'verb', 'drink': 'verb', 'sleep': 'verb', 'wake': 'verb', 'live': 'verb',
      
      // 形容词
      'good': 'adjective', 'bad': 'adjective', 'big': 'adjective', 'small': 'adjective',
      'new': 'adjective', 'old': 'adjective', 'hot': 'adjective', 'cold': 'adjective',
      'fast': 'adjective', 'slow': 'adjective', 'easy': 'adjective', 'hard': 'adjective',
      'happy': 'adjective', 'sad': 'adjective', 'beautiful': 'adjective', 'ugly': 'adjective',
      'tall': 'adjective', 'short': 'adjective', 'long': 'adjective', 'wide': 'adjective',
      'narrow': 'adjective', 'thick': 'adjective', 'thin': 'adjective', 'heavy': 'adjective',
      'light': 'adjective', 'strong': 'adjective', 'weak': 'adjective', 'rich': 'adjective',
      'poor': 'adjective', 'clean': 'adjective', 'dirty': 'adjective', 'full': 'adjective',
      'empty': 'adjective', 'open': 'adjective', 'closed': 'adjective', 'free': 'adjective',
      'busy': 'adjective', 'ready': 'adjective', 'sure': 'adjective', 'right': 'adjective',
      'wrong': 'adjective', 'true': 'adjective', 'false': 'adjective', 'same': 'adjective',
      'different': 'adjective', 'important': 'adjective', 'special': 'adjective', 'normal': 'adjective'
    };
    
    if (specialWords[word.toLowerCase()]) {
      return specialWords[word.toLowerCase()];
    }
    
    // 默认为名词
    return 'noun';
  },

  /**
   * 判断是否应该显示词性标签
   * 单个单词显示词性（名词、动词、形容词等），短语/句子不显示
   * @param {Object} word - 单词对象
   * @returns {boolean} 是否显示词性标签
   */
  shouldShowWordType(word) {
    if (!word || !word.word) return false;
    
    // 如果 wordType 是短语/句子类型，不显示
    if (word.wordType === 'phrase' || 
        word.wordType === 'sentence' || 
        word.wordType === 'noun_phrase') {
      return false;
    }
    
    // 如果单词中包含空格或连字符（两个以上单词），不显示
    const wordText = word.word.trim();
    if (wordText.includes(' ') || wordText.includes('-')) {
      // 检查单词数量：按空格或连字符分割
      const wordCount = wordText.split(/[\s-]+/).filter(w => w.length > 0).length;
      if (wordCount >= 2) {
        return false;
      }
    }
    
    // 其他情况（单个单词的词性）显示
    return true;
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

  },

  // 准备第一阶段：四选一
  preparePhase1(word) {
    if (!word || !word.meaning) {
      console.error('[preparePhase1] 单词数据无效', word);
      return;
    }
    
    console.log('[preparePhase1] 准备选项，单词:', word.word, '含义:', word.meaning);
    const choiceOptions = this.makeChoices(word.meaning);
    console.log('[preparePhase1] 生成的选项:', choiceOptions);
    
    if (!choiceOptions || choiceOptions.length === 0) {
      console.error('[preparePhase1] 选项生成失败');
      return;
    }
    
    this.setData({ choiceOptions }, () => {
      console.log('[preparePhase1] 选项已设置到界面');
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

      return;
    }
    
    // 设置防抖状态，防止重复调用
    this.setData({ isProcessing: true });

    const wordId = this.getWordId(currentWord);
    if (!wordId) {
      console.error('[completeCurrentPhase] 无法获取单词ID');
      this.setData({ isProcessing: false });
      return;
    }
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
  
  // 进入下一个单词
  moveToNextWord() {
    console.log('[moveToNextWord] ========== 开始执行 ==========');
    const { currentWordIndex, currentGroupWords, currentGroup, totalGroups, mode } = this.data;
    
    console.log('[moveToNextWord] 📊 当前状态:', {
      currentWordIndex,
      groupWordsLength: currentGroupWords?.length,
      mode,
      hasGroupWords: !!currentGroupWords,
      isProcessing: this.data.isProcessing,
      isTransitioning: this.data.isTransitioning,
      currentWord: this.data.currentWord?.word
    });
    
    if (!currentGroupWords || currentGroupWords.length === 0) {
      console.error('[moveToNextWord] ❌ 没有当前组单词，无法继续');
      return;
    }
    
    const nextWordIndex = currentWordIndex + 1;
    console.log('[moveToNextWord] 📍 下一个单词索引:', nextWordIndex, '总单词数:', currentGroupWords.length);
    
    if (nextWordIndex < currentGroupWords.length) {
      // 当前组还有单词，继续学习
      const nextWord = currentGroupWords[nextWordIndex];
      
      if (!nextWord) {
        console.error('[moveToNextWord] ❌ 下一个单词不存在，索引:', nextWordIndex);
        return;
      }
      
      console.log('[moveToNextWord] 📝 准备下一个单词:', nextWord.word);
      
        this.setData({
          currentWordIndex: nextWordIndex,
          currentPhase: 1, // 重置到第一阶段
          currentWord: nextWord,
          selectedAnswer: '',
          choiceCorrect: false
        });
        this.prepareCurrentWord();

    } else {
      // 当前组完成，检查是否还有下一组
      console.log('[moveToNextWord] 当前组完成，检查下一组');
      this.completeCurrentGroup();
    }
  },
  
  // 完成当前组
  completeCurrentGroup() {
    const { currentGroup, totalGroups, masteredWords, needLearningWords, mode } = this.data;
    
    
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
    
    // 检查是否还有更多单词可以学习
    const allMasteredWords = this.getMasteredWords();
    const hasMoreWords = this.allWords && this.allWords.length > allMasteredWords.length;

    if (totalGroups > 0 && currentGroup < totalGroups) {
      // 还有下一组，开始下一组的过滤
      this.startNextGroup();
    } else if (hasMoreWords) {
      // totalGroups 可能为0或已到最后一组，但还有更多单词可以学习

      const quantity = this.data.quantity || 10;
      this.recreateGroupsAndContinue(quantity);
    } else {
      // 所有组都完成了，且没有更多单词
      this.completeAllLearning();
    }
  },

  // 累计组数据
  accumulateGroupData(masteredWords, needLearningWords) {
    // 获取累计数据
    const accumulatedMastered = wx.getStorageSync('ACCUMULATED_MASTERED_WORDS') || [];
    const accumulatedNeedLearning = wx.getStorageSync('ACCUMULATED_NEED_LEARNING_WORDS') || [];
    
    // 获取当前组已累计的单词ID（避免重复累计）
    const currentGroupId = `group_${this.data.currentGroup}`;
    const processedGroups = wx.getStorageSync('PROCESSED_GROUPS') || [];
    
    if (processedGroups.includes(currentGroupId)) {

      return;
    }
    
    // 添加当前组的数据
    const newMastered = [...accumulatedMastered, ...masteredWords];
    const newNeedLearning = [...accumulatedNeedLearning, ...needLearningWords];
    
    // 去重（基于单词ID）
    const uniqueMastered = this.removeDuplicateWords(newMastered);
    const uniqueNeedLearning = this.removeDuplicateWords(newNeedLearning);
    
    // 保存累计数据
    wx.setStorageSync('ACCUMULATED_MASTERED_WORDS', uniqueMastered);
    wx.setStorageSync('ACCUMULATED_NEED_LEARNING_WORDS', uniqueNeedLearning);
    
    // 标记当前组已处理
    processedGroups.push(currentGroupId);
    wx.setStorageSync('PROCESSED_GROUPS', processedGroups);
    
    // 🔄 同步数据到 learningDataSync 系统（修复首页进度条更新问题）
    this.syncToLearningDataSync(uniqueMastered, uniqueNeedLearning);

  },

  // 去重函数（基于 serialNumber/id）
  removeDuplicateWords(words) {
    const seen = new Set();
    return words.filter(word => {
      const wordId = this.getWordId(word);
      if (!wordId || seen.has(wordId)) {
        return false;
      }
      seen.add(wordId);
      return true;
    });
  },

  // 🔄 同步数据到 learningDataSync 系统
  syncToLearningDataSync(masteredWords, needLearningWords) {
    try {
      const { gradeId, gradeName } = this.data;
      
      // 🔧 修复：同步到 learningDataSync 系统的本地存储键
      const masteredKey = `MASTERED_WORDS_${gradeId}`;
      const currentMastered = wx.getStorageSync(masteredKey) || [];
      
      // 添加新掌握的单词到本地存储（使用 serialNumber/id）
      const newMasteredIds = masteredWords.map(word => this.getWordId(word)).filter(id => id);
      const updatedMastered = [...new Set([...currentMastered, ...newMasteredIds])];
      wx.setStorageSync(masteredKey, updatedMastered);

      masteredWords.forEach(word => {
        const wordId = this.getWordId(word);
        if (!wordId) return;
        learningDataSync.recordWordProgress(
          {
            word: wordId,
            gradeId: gradeId,
            gradeName: gradeName
          },
          'phase0', // 认识阶段标记为已掌握
          true, // 成功
          {
            userAnswer: 'mastered',
            correctAnswer: wordId,
            questionType: 'phase0',
            duration: 0,
            attempts: 1,
            extra: {
              source: 'group_completion',
              currentGroup: this.data.currentGroup,
              syncTime: Date.now()
            }
          }
        );
      });
      
      // 同步需要学习的单词
      needLearningWords.forEach(word => {
        const wordId = this.getWordId(word);
        if (!wordId) return;
        learningDataSync.recordWordProgress(
          {
            word: wordId,
            gradeId: gradeId,
            gradeName: gradeName
          },
          'phase0', // 认识阶段标记为需要学习
          false, // 需要学习
          {
            userAnswer: 'needLearning',
            correctAnswer: wordId,
            questionType: 'phase0',
            duration: 0,
            attempts: 1,
            extra: {
              source: 'group_completion',
              currentGroup: this.data.currentGroup,
              syncTime: Date.now()
            }
          }
        );
      });

    } catch (error) {
      console.error('同步数据到 learningDataSync 失败:', error);
    }
  },
  
  // 开始下一组
  startNextGroup() {
    const nextGroup = this.data.currentGroup + 1;
    const nextGroupData = this.data.learningGroups[nextGroup - 1];
    
    if (nextGroupData) {
      // 统计当前组完成的单词数量并更新进度
      this.updateGroupCompletionProgress();

      this.setData({
        currentGroup: nextGroup
      });
      
      // 重置认识阶段状态，每组都从认识筛选开始
      this.setData({
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
        isProcessing: false,
        
        // 更新阶段标签
        phase: 'phase0',
        phaseLabel: this.getPhaseLabel(0)
      });
      
      // 预加载本组单词音频
      this.setupCurrentGroup(nextGroupData.words);
      
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
      const wordId = this.getWordId(word);
      if (wordId) {
      wordPhaseStatus[wordId] = {
        phase0: 'unknown',  // 认识状态：unknown, mastered, needLearning
        phase1: false       // 四选一
      };
      }
    });
    
    // 确保只设置当前组的单词状态，清除之前组的状态
    this.setData({ wordPhaseStatus });

  },

  // 准备认识阶段的单词
  prepareRecognitionWord() {
    const { currentGroupWords, recognitionDone } = this.data;
    
    if (recognitionDone < currentGroupWords.length) {
      const currentWord = currentGroupWords[recognitionDone];
      
      // 确保含义数据已经规范化处理
      if (currentWord.meaning && typeof currentWord.meaning === 'object') {

        currentWord.meaning = this.normalizeMeaning(currentWord.meaning);

      }
      
      this.setData({
        currentWord,
        phase: 'phase0',
        isProcessing: false
      });
      this.updateWordHighlight(currentWord);

    } else {

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
      const wordId = this.getWordId(word);
      if (!wordId) return;
      const status = wordPhaseStatus[wordId] || {};
      
      // 检查是否完成所有阶段
      if (status.phase1) {
        completedWords++;
        completedWordsList.push(word.word);
      }
    });
    
    // 更新已学单词列表（用于外部同步）
    const updatedLearnedWords = [...(this.data.learnedWords || [])];
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
          learnedWords: this.data.learnedWords || []
        });
      }
    } catch (error) {
      console.warn('通知外部页面进度更新失败:', error);
    }
  },
  
  // 显示所有单词已掌握的完成界面
  showAllWordsMasteredCompletion() {
    // 获取学习统计信息
    const gradeProgress = learningDataSync.getGradeLearningProgress(this.data.gradeId);
    const gradeName = this.getGradeName(this.data.gradeId);
    
    // 计算学习天数
    const studyRecords = wx.getStorageSync('STUDY_RECORDS') || {};
    const gradeStudyRecords = studyRecords[this.data.gradeId] || {};
    const studyDays = Object.keys(gradeStudyRecords).length;
    
    // 获取总单词数和已掌握单词数
    const totalWords = this.allWords ? this.allWords.length : 0;
    const masteredWords = this.getMasteredWords().length;

    wx.redirectTo({
      url: `/pages/learningComplete/learningComplete?gradeId=${this.data.gradeId}&gradeName=${encodeURIComponent(gradeName)}&totalWords=${totalWords}&masteredWords=${masteredWords}&studyDays=${studyDays}`
    });
  },

  // 完成所有学习
  completeAllLearning() {
    // 统计最后一组的完成进度
    this.updateGroupCompletionProgress();
    
    // 获取总体同步状态和学习统计
    const syncStatus = this.getSyncStatusSummary();
    const gradeProgress = learningDataSync.getGradeLearningProgress(this.data.gradeId);
    
    // 获取年级名称
    const gradeName = this.getGradeName(this.data.gradeId);
    
    // 计算学习天数（从学习记录中获取）
    const studyRecords = wx.getStorageSync('STUDY_RECORDS') || {};
    const gradeStudyRecords = studyRecords[this.data.gradeId] || {};
    const studyDays = Object.keys(gradeStudyRecords).length;
    
    // 获取总单词数和已掌握单词数
    const totalWords = this.allWords ? this.allWords.length : 0;
    const masteredWords = gradeProgress.mastered + gradeProgress.expert;

    wx.redirectTo({
      url: `/pages/learningComplete/learningComplete?gradeId=${this.data.gradeId}&gradeName=${encodeURIComponent(gradeName)}&totalWords=${totalWords}&masteredWords=${masteredWords}&studyDays=${studyDays}`
    });
  },

  /* ================= 用户交互处理 ================= */
  
  // 四选一选择答案
  selectChoice(e) {
    // 最开始的日志，确保方法被调用
    console.log('🔴🔴🔴 [selectChoice] 方法被调用了！🔴🔴🔴');
    console.log('[selectChoice] 事件对象:', e);
    
    const answer = e?.currentTarget?.dataset?.answer;
    const currentWord = this.data.currentWord;
    
    if (!currentWord) {
      console.error('[selectChoice] ❌ 当前单词不存在，无法处理');
      return;
    }
    
    // 防抖检查
    const canAction = this.canPerformAction('selectChoice', 600);
    if (!canAction) {
      console.warn('[selectChoice] ⚠️ 防抖检查失败，操作被阻止');
      return;
    }
    
    // 只有第一阶段使用选择题
    const isCorrect = answer === currentWord.meaning;
    
    this.setData({
      selectedAnswer: answer,
      choiceCorrect: isCorrect
    });
    
      // 正常学习模式：答对继续，答错重试
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
  
  // 播放发音 - 快速响应版本
  playPronunciation() {
    const currentWord = this.data.currentWord;
    if (!currentWord) return;
    
    const wordId = this.getWordId(currentWord) || currentWord.word;
    const word = currentWord.word;
    const gradeId = this.data.gradeId;
      
    // 立即播放，不等待异步操作
      AudioManager.playWord(wordId, {
      gradeId: gradeId,
      word: word
      });
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
      const wordId = this.getWordId(word);
      if (!wordId) return;
      const status = this.data.wordPhaseStatus[wordId] || {};
      if (status[`phase${currentPhase}`]) {
        completedCount++;
      }
    });
    
    return completedCount;
  },
  
  
  // 跳过当前单词（仅跳过当前阶段）
  skipWord() {
      // 正常学习模式：显示确认弹窗
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
  
  // 显示重新分组选择框
  showRegroupModal() {
    const currentQuantity = this.data.quantity || 10;
    
    wx.showActionSheet({
      itemList: ['10个单词/组', '20个单词/组', '自定义'],
      success: (res) => {
        if (res.tapIndex === 0) {
          // 选择10个
          this.regroup(10);
        } else if (res.tapIndex === 1) {
          // 选择20个
          this.regroup(20);
        } else if (res.tapIndex === 2) {
          // 自定义
          this.showCustomQuantityInput();
        }
      }
    });
  },
  
  // 显示自定义数量输入框
  showCustomQuantityInput() {
    wx.showModal({
      title: '自定义分组数量',
      editable: true,
      placeholderText: '请输入单词数量（1-100）',
      success: (res) => {
        if (res.confirm && res.content) {
          const quantity = parseInt(res.content);
          if (isNaN(quantity) || quantity < 1 || quantity > 100) {
            wx.showToast({
              title: '请输入1-100之间的数字',
              icon: 'none'
            });
            return;
          }
          this.regroup(quantity);
        }
      }
    });
  },
  
  // 重新分组
  regroup(newQuantity) {
    if (!newQuantity || newQuantity < 1) {
      wx.showToast({
        title: '分组数量无效',
        icon: 'none'
      });
      return;
    }
    
    // 保存当前学习状态
    const currentWord = this.data.currentWord;
    const currentGroupWords = this.data.currentGroupWords || [];
    const recognitionDone = this.data.recognitionDone || 0;
    const isRecognitionPhase = this.data.isRecognitionPhase;
    
    // 保存当前单词的word字段，用于在新分组中查找
    const currentWordText = currentWord ? currentWord.word : null;
    
    // 获取所有未学习的单词（包括当前组未完成的单词）
    const allAvailableWords = this.getAllAvailableWordsForRegroup();
    
    if (allAvailableWords.length === 0) {
      wx.showToast({
        title: '没有可重新分组的单词',
        icon: 'none'
      });
      return;
    }
    
    // 使用未完成的单词重新创建分组
    const sortedWords = [...allAvailableWords].sort((a, b) => {
      if (a.serialNumber !== undefined && b.serialNumber !== undefined) {
        const numA = parseInt(a.serialNumber) || 0;
        const numB = parseInt(b.serialNumber) || 0;
        return numA - numB;
      }
      if (a.serialNumber !== undefined) return -1;
      if (b.serialNumber !== undefined) return 1;
      return 0;
    });
    
    const groupSize = newQuantity;
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
    
    // 尝试找到当前单词在新分组中的位置
    let newGroup = 1;
    let newWordIndex = 0;
    let found = false;
    
    if (currentWordText) {
      // 查找当前单词在新分组中的位置
      for (let i = 0; i < learningGroups.length; i++) {
        const group = learningGroups[i];
        const wordIndex = group.words.findIndex(w => {
          const wordKey = w.word || w.id;
          return wordKey === currentWordText;
        });
        if (wordIndex !== -1) {
          newGroup = i + 1;
          newWordIndex = wordIndex;
          found = true;
          break;
        }
      }
    }
    
    // 如果没找到当前单词，从第一组开始
    if (!found) {
      newGroup = 1;
      newWordIndex = 0;
    }
    
    // 更新数据
    this.words = sortedWords;
    this.setData({
      quantity: newQuantity,
      learningGroups,
      totalGroups,
      currentGroup: newGroup,
      currentGroupWords: learningGroups[newGroup - 1]?.words || [],
      currentWordIndex: newWordIndex,
      currentWord: learningGroups[newGroup - 1]?.words[newWordIndex] || learningGroups[newGroup - 1]?.words[0] || null,
      recognitionDone: isRecognitionPhase ? newWordIndex : 0,
      sessionTarget: newQuantity
    });
    
    // 设置当前组
    const newGroupData = learningGroups[newGroup - 1];
    if (newGroupData && newGroupData.words.length > 0) {
      this.setupCurrentGroup(newGroupData.words);
      this.prepareCurrentWord();
    }
    
    // 保存进度
    this.saveGroupLearningProgress();
    
    wx.showToast({
      title: `已重新分组为${newQuantity}个/组`,
      icon: 'success'
    });
  },
  
  // 获取所有可用于重新分组的单词
  getAllAvailableWordsForRegroup() {
    // 获取所有单词
    if (!this.allWords || this.allWords.length === 0) {
      return [];
    }
    
    // 获取已掌握的单词
    const masteredWords = this.getMasteredWords();
    
    // 获取当前组中未完成的单词
    const currentGroupWords = this.data.currentGroupWords || [];
    const recognitionDone = this.data.recognitionDone || 0;
    const unfinishedWords = currentGroupWords.slice(recognitionDone);
    
    // 获取后续组的所有单词
    const remainingGroups = [];
    const currentGroup = this.data.currentGroup || 1;
    const learningGroups = this.data.learningGroups || [];
    
    for (let i = currentGroup; i < learningGroups.length; i++) {
      if (learningGroups[i] && learningGroups[i].words) {
        remainingGroups.push(...learningGroups[i].words);
      }
    }
    
    // 合并：未完成的单词 + 后续组的单词
    const allWords = [...unfinishedWords, ...remainingGroups];
    
    // 去重（基于 serialNumber/id，因为同一个 word 可能有多个不同的 serialNumber）
    const uniqueWords = [];
    const seenIds = new Set();
    
    for (const word of allWords) {
      const wordId = this.getWordId(word);
      if (wordId && !seenIds.has(wordId)) {
        seenIds.add(wordId);
        uniqueWords.push(word);
      }
    }
    
    // 过滤掉已掌握的单词（基于 serialNumber/id）
    const availableWords = uniqueWords.filter(word => {
      const wordId = this.getWordId(word);
      if (!wordId) return false;
      return !masteredWords.includes(wordId);
    });
    
    // 按照原始顺序排序（使用serialNumber）
    return availableWords.sort((a, b) => {
      if (a.serialNumber !== undefined && b.serialNumber !== undefined) {
        const numA = parseInt(a.serialNumber) || 0;
        const numB = parseInt(b.serialNumber) || 0;
        return numA - numB;
      }
      if (a.serialNumber !== undefined) return -1;
      if (b.serialNumber !== undefined) return 1;
      return 0;
    });
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
  

  // 播放当前单词读音（认识阶段使用）- 快速响应版本
  playCurrentWordPronunciation() {
    if (!this.data.currentWord || !this.data.currentWord.word) {
      wx.showToast({
        title: '没有可播放的单词',
        icon: 'none'
      });
      return;
    }
    
      const wordId = this.data.currentWord.id || this.data.currentWord.wordId || this.data.currentWord.word;
    const word = this.data.currentWord.word;
    const gradeId = this.data.gradeId;
      
    // 立即播放，不等待异步操作
      AudioManager.playWord(wordId, {
      gradeId: gradeId,
      word: word
    });
  },



  /* ================= 音频预加载优化 ================= */
  

  /**
   * 当你拿到当前这一组 words 时，调用预加载
   * 例如：从数据库筛选完一组后调用
   */
  setupCurrentGroup(groupWords) {
    if (!groupWords || groupWords.length === 0) return;
    
    // 预加载本组单词音频（后台下载，不阻塞）
    const gradeId = this.data.gradeId;
    if (gradeId) {
      AudioManager.preloadWordList(groupWords, gradeId);
    }
  },
  
  // 预加载当前学习会话的音频
  preloadAudioForCurrentSession() {
    try {
      const currentGroupWords = this.data.currentGroupWords || [];
      if (currentGroupWords.length > 0) {
        this.setupCurrentGroup(currentGroupWords);
      }
    } catch (error) {
      console.warn('预加载音频失败:', error);
    }
  },



  /* ================= 预加载（Prefetch）管理器 ================= */

  // 可调参数
  _prefetchCfg() {
    return {
      nextCount: 12,         // 每次预加载"接下来的"多少个词（增加预加载数量）
      maxConcurrent: 3,      // 同时下载的并发数（提高并发）
      maxCache: 120,         // LRU缓存上限（条数），超出则淘汰最久未用（增加缓存）
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


  /* ================== 四个阶段处理方法 ================== */

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


  // 进入下一个单词
  nextWord() {
    // 非会员限制：在继续学习之前检查
    const membershipStatus = userManager.getMembershipStatus();
    if (!membershipStatus.isPremium && userManager.hasReachedFreeLimit()) {
      if (!this._freeLimitPrompted) {
        this._freeLimitPrompted = true;
        const learned = userManager.getTotalMasteredWordsCount();
        const limit = (membershipStatus.config && membershipStatus.config.maxLearnedWords) || 30;
        wx.showModal({
          title: '需要解锁会员',
          content: `免费版累计可学习 ${limit} 个单词，您已达到 ${learned} 个。\n\n开通会员即可继续学习。`,
          confirmText: '立即开通',
          cancelText: '稍后',
          success: (res) => {
            this._freeLimitPrompted = false;
            if (res.confirm) {
              wx.navigateTo({ url: '/pages/payment/payment' });
            }
          }
        });
      }
      return; // 达到限制，不继续学习
    }
    
    const { currentPhase, currentGroupWords, wordPhaseStatus, currentWord } = this.data;
    
    if (!currentGroupWords || currentGroupWords.length === 0) {
      console.warn('nextWord: 没有当前组单词');
      return;
    }
    
    // 先完成当前单词的当前阶段（仅用于正式学习阶段，避免覆盖认识阶段的枚举状态）
    if (currentWord && currentPhase > 0) {
      const wordId = this.getWordId(currentWord);
      if (!wordId) {
        console.warn('[nextWord] 无法获取单词ID，跳过状态更新');
      } else {
      const wordStatus = this.data.wordPhaseStatus[wordId] || {};
      const currentPhaseKey = `phase${currentPhase}`;
      wordStatus[currentPhaseKey] = true;
      
      // 更新单词阶段状态
      const newWordPhaseStatus = { ...this.data.wordPhaseStatus };
      newWordPhaseStatus[wordId] = wordStatus;
      this.setData({ wordPhaseStatus: newWordPhaseStatus });
      }
    }
    
    // 按阶段学习：找下一个需要学习当前阶段的单词（phase0 由 nextRecognitionWord 管理）
    let nextWordIndex = -1;
    
    // 在当前组中找到下一个还没完成当前阶段的单词
    for (let i = 0; i < currentGroupWords.length; i++) {
      const word = currentGroupWords[i];
      const wordId = this.getWordId(word);
      if (!wordId) continue;
      const status = wordPhaseStatus[wordId] || {};
      
      // 如果这个单词的当前阶段还没完成
      if (!status[`phase${currentPhase}`]) {
        nextWordIndex = i;
        break;
      }
    }
    
    if (nextWordIndex !== -1) {
      // 找到了下一个需要学习当前阶段的单词
      const nextWord = currentGroupWords[nextWordIndex];
      this.setData({
        currentWordIndex: nextWordIndex,
        currentWord: nextWord
      });
      
      // 重置界面状态并准备数据
      this.resetUIState();
      this.preparePhaseData(currentPhase);
      
      // 更新单词高亮（确保单词显示正确更新）
      if (nextWord) {
        this.updateWordHighlight(nextWord);
      }

      const warming = this._getUpcomingWords(this._prefetchCfg().nextCount);
      this.prefetchWords(warming);
    } else {
      // 当前阶段所有单词都完成了，进入下一阶段

      this.moveToNextPhase();
    }
  },
  
  // 进入下一阶段
  moveToNextPhase() {
    const nextPhase = this.data.currentPhase + 1;
    
    // 当前版本只保留一个正式学习阶段（phase1）：
    // phase0：认识筛选；phase1：认读/练习
    // 当 phase1 内所有单词完成后，直接视为当前组完成，不再进入历史上的 phase2
    if (nextPhase <= 1) {
      // 设置过渡状态
      this.setData({ isTransitioning: true });
      
      // 进入下一阶段，寻找第一个需要学习该阶段的单词
      const { currentGroupWords, wordPhaseStatus } = this.data;
      let firstWordIndex = 0;
      
      // 找到第一个还没完成下一阶段的单词
      for (let i = 0; i < currentGroupWords.length; i++) {
        const word = currentGroupWords[i];
        const wordId = this.getWordId(word);
        if (!wordId) continue;
        const status = wordPhaseStatus[wordId] || {};
        
        if (!status[`phase${nextPhase}`]) {
          firstWordIndex = i;
          break;
        }
      }
      
      const firstWord = currentGroupWords[firstWordIndex];
      this.batchUpdateData({
        currentPhase: nextPhase,
        phase: `phase${nextPhase}`,
        phaseLabel: this.getPhaseLabel(nextPhase),
        currentWordIndex: firstWordIndex,
        currentWord: firstWord,
        isTransitioning: false
      });
      
      // 重置界面状态并准备数据
      this.resetUIState();
      this.preparePhaseData(nextPhase);
      
      // 更新单词高亮（确保单词显示正确更新）
      if (firstWord) {
        this.updateWordHighlight(firstWord);
      }
      
      // 当前词一设定，预加载后面的
      const warming = this._getUpcomingWords(this._prefetchCfg().nextCount);
      this.prefetchWords(warming);
      
      wx.showToast({
        title: `进入第${nextPhase}阶段`,
        icon: 'success',
        duration: 1500
      });
      
    } else {
      // 所有阶段都完成了，当前组完成

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
    }
  },

  // 准备认识阶段
  preparePhase0(word) {
    // 认识阶段只需要显示单词和含义，不需要特殊准备
  },

  /* ================= 认识阶段处理函数 ================= */

  // 标记为已掌握
  markAsMastered() {
    if (this.data.isProcessing) return;
    
    this.setData({ isProcessing: true });
    
    const { currentWord, wordPhaseStatus } = this.data;
    if (!currentWord) {
      this.setData({ isProcessing: false });
      return;
    }
    
    const wordId = this.getWordId(currentWord);
    if (!wordId) {
      console.error('[markAsMastered] 无法获取单词ID');
      this.setData({ isProcessing: false });
      return;
    }
    
    // 非会员限制：在标记之前检查，如果达到限制，直接阻止操作
    const membershipStatus = userManager.getMembershipStatus();
    if (!membershipStatus.isPremium) {
      // 先检查标记后是否会达到限制（当前已掌握数 + 1）
      const currentLearned = userManager.getTotalMasteredWordsCount();
      const limit = (membershipStatus.config && membershipStatus.config.maxLearnedWords) || 30;
      
      // 如果标记后达到或超过限制，阻止操作
      if (currentLearned >= limit) {
        this.setData({ isProcessing: false });
        if (!this._freeLimitPrompted) {
          this._freeLimitPrompted = true;
          wx.showModal({
            title: '需要解锁会员',
            content: `免费版累计可学习 ${limit} 个单词，您已达到 ${currentLearned} 个。\n\n开通会员即可继续学习。`,
            confirmText: '立即开通',
            cancelText: '稍后',
            success: (res) => {
              this._freeLimitPrompted = false; // 重置标记，允许下次再弹
              if (res.confirm) {
                wx.navigateTo({ url: '/pages/payment/payment' });
              }
            }
          });
        }
        return; // 直接返回，不执行后续操作
      }
    }
    
    // 更新单词状态：直接标记为完全掌握
    // 注意：只标记当前这个变体（通过 serialNumber 识别），其他相同文本的变体需要单独学习
    const updatedStatus = { ...wordPhaseStatus };
    updatedStatus[wordId] = {
      phase0: 'mastered',
      phase1: true   // 直接标记所有阶段为完成
    };
    
    // 记录到认识的单词列表
    const recognizedWords = [...this.data.recognizedWords, currentWord];
    // 确保 recognitionDone 不会超过当前组的单词数量
    const currentRecognitionDone = this.data.recognitionDone;
    const maxRecognitionDone = this.data.currentGroupWords.length;
    const recognitionDone = Math.min(currentRecognitionDone + 1, maxRecognitionDone);
    
    if (recognitionDone < currentRecognitionDone + 1) {
      console.warn(`[警告] recognitionDone 已达到最大值 ${maxRecognitionDone}，无法继续增加`);
    }
    
    this.setData({
      wordPhaseStatus: updatedStatus,
      recognizedWords,
      recognitionDone
    });
    
    // 持久化保存已掌握的单词（使用 serialNumber/id）
    this.saveMasteredWord(wordId);
    
    // 记录学习数据 - 同时记录所有阶段为完成状态（使用 wordId）
    this.recordLearningSync(currentWord, 'phase0', true, 'mastered', 'mastered');
    
    // 额外记录到学习数据同步系统，确保掌握状态正确更新（使用 wordId）
    this.updateMasteryInLearningDataSync(wordId, currentWord);
    
    wx.showToast({
      title: '已标记为掌握',
      icon: 'success',
      duration: 1000
    });

    setTimeout(() => {
      // 标记后再次检查限制，如果达到限制，阻止继续学习
      const membershipStatusAfter = userManager.getMembershipStatus();
      if (!membershipStatusAfter.isPremium && userManager.hasReachedFreeLimit()) {
        if (!this._freeLimitPrompted) {
          this._freeLimitPrompted = true;
          const learned = userManager.getTotalMasteredWordsCount();
          const limit = (membershipStatusAfter.config && membershipStatusAfter.config.maxLearnedWords) || 30;
          wx.showModal({
            title: '需要解锁会员',
            content: `免费版累计可学习 ${limit} 个单词，您已达到 ${learned} 个。\n\n开通会员即可继续学习。`,
            confirmText: '立即开通',
            cancelText: '稍后',
            success: (res) => {
              this._freeLimitPrompted = false;
              if (res.confirm) {
                wx.navigateTo({ url: '/pages/payment/payment' });
              }
            }
          });
        }
        // 达到限制，不继续下一个单词
        this.setData({ isProcessing: false });
        return;
      }
      this.nextRecognitionWord();
    }, 1000);
  },

  // 更新学习数据同步系统中的掌握状态
  updateMasteryInLearningDataSync(wordId, wordObj) {
    try {
      if (!wordId) {
        console.warn('[updateMasteryInLearningDataSync] wordId 为空');
        return;
      }
      
      const { gradeId, gradeName } = this.data;
      const wordText = wordObj?.word || wordId;
      
      // 使用 wordId (serialNumber) 作为唯一标识符
      learningDataSync.recordWordProgress(
        {
          word: wordId,  // 使用 serialNumber/id 作为唯一标识
          gradeId: gradeId,
          gradeName: gradeName
        },
        'phase0',
        true,
        {
          userAnswer: 'mastered',
          correctAnswer: wordId,
          questionType: 'phase0',
          duration: 0,
          attempts: 1,
          extra: {
            source: 'mark_as_mastered',
            wordText: wordText,
            syncTime: Date.now()
          }
        }
      );
      
      // 直接更新掌握映射，标记为已掌握（使用 wordId 作为键）
      const masteryMap = learningDataSync.getWordMasteryMap();
      if (masteryMap[wordId]) {
        // 如果单词已存在，直接更新掌握状态
        masteryMap[wordId].masteryLevel = 'mastered';
        masteryMap[wordId].masteryScore = 1.0;
        
        // 确保phases对象存在
        if (!masteryMap[wordId].phases) {
          masteryMap[wordId].phases = {};
        }
        
        // 更新现有的阶段数据
        if (masteryMap[wordId].phases.phase1) {
          masteryMap[wordId].phases.phase1.completed = true;
          masteryMap[wordId].phases.phase1.successes = 1;
          masteryMap[wordId].phases.phase1.attempts = 1;
        }
        if (masteryMap[wordId].phases.phase2) {
          masteryMap[wordId].phases.phase2.completed = true;
          masteryMap[wordId].phases.phase2.successes = 1;
          masteryMap[wordId].phases.phase2.attempts = 1;
        }
        if (masteryMap[wordId].phases.phase3) {
          masteryMap[wordId].phases.phase3.completed = true;
          masteryMap[wordId].phases.phase3.successes = 1;
          masteryMap[wordId].phases.phase3.attempts = 1;
        }
        
        masteryMap[wordId].lastUpdated = Date.now();
      } else {
        // 如果单词不存在，创建新的掌握记录（使用 wordId 作为键）
        masteryMap[wordId] = {
          word: wordId,  // 使用 serialNumber/id 作为唯一标识
          gradeId: this.data.gradeId,
          gradeName: this.data.gradeName,
          masteryLevel: 'mastered',
          masteryScore: 1.0,
          phases: {
            phase1: { completed: true, successes: 1, attempts: 1 },
            phase2: { completed: true, successes: 1, attempts: 1 },
            phase3: { completed: true, successes: 1, attempts: 1 }
          },
          lastUpdated: Date.now()
        };
      }
      
      // 保存更新后的掌握映射
      const k = 'WORD_MASTERY_MAP';
      if (typeof wx !== 'undefined' && wx.setStorageSync) {
        wx.setStorageSync(k, masteryMap);
      } else {
        localStorage.setItem(k, JSON.stringify(masteryMap));
      }

    } catch (error) {
      console.error('更新掌握状态失败:', error);
    }
  },

  // 标记为需要学习
  markAsNeedLearning() {
    if (this.data.isProcessing) return;
    
    this.setData({ isProcessing: true });
    
    const { currentWord, wordPhaseStatus } = this.data;
    if (!currentWord) return;
    
    const wordId = this.getWordId(currentWord);
    if (!wordId) {
      console.error('[markAsNeedLearning] 无法获取单词ID');
      this.setData({ isProcessing: false });
      return;
    }
    
    // 更新单词状态：标记为需要学习
    const updatedStatus = { ...wordPhaseStatus };
    if (!updatedStatus[wordId]) {
      updatedStatus[wordId] = {};
    }
    updatedStatus[wordId].phase0 = 'needLearning';
    
    // 记录到需要学习的单词列表
    const needLearningWords = [...this.data.needLearningWords, currentWord];
    // 确保 recognitionDone 不会超过当前组的单词数量
    const currentRecognitionDone = this.data.recognitionDone;
    const maxRecognitionDone = this.data.currentGroupWords.length;
    const recognitionDone = Math.min(currentRecognitionDone + 1, maxRecognitionDone);
    
    if (recognitionDone < currentRecognitionDone + 1) {
      console.warn(`[警告] recognitionDone 已达到最大值 ${maxRecognitionDone}，无法继续增加`);
    }
    
    this.setData({
      wordPhaseStatus: updatedStatus,
      needLearningWords,
      recognitionDone
    });
    
    try {
      const correctAnswer = String(currentWord.meaning || '');
      this.recordWord(currentWord.word, 'needLearning', correctAnswer, 'phase0');
    } catch (e) {
      console.error('记录需要学习生词失败:', e);
    }

    // 记录学习数据
    this.recordLearningSync(currentWord.word, 'phase0', true, 'needLearning', 'needLearning');
    
    wx.showToast({
      title: '标记为需要学习',
      icon: 'none',
      duration: 1000
    });

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
    
    const wordId = this.getWordId(currentWord);
    if (!wordId) {
      console.error('[markAsUnderstood] 无法获取单词ID');
      this.setData({ isProcessing: false });
      return;
    }
    
    // 更新单词状态：标记为已掌握
    const updatedStatus = { ...wordPhaseStatus };
    updatedStatus[wordId] = {
      phase0: 'mastered',
      phase1: true   // 直接标记所有阶段为完成
    };
    
    this.setData({
      wordPhaseStatus: updatedStatus
    });
    
    // 持久化保存已掌握的单词
    this.saveMasteredWord(wordId);
    
    // 记录学习数据 - 同时记录所有阶段为完成状态（使用 wordId）
    this.recordLearningSync(currentWord, 'phase0', true, 'mastered', 'mastered');
    
    // 额外记录到学习数据同步系统，确保掌握状态正确更新（使用 wordId）
    this.updateMasteryInLearningDataSync(wordId, currentWord);

    wx.showToast({
      title: '已掌握',
      icon: 'success',
      duration: 1000
    });
    
    // 进入下一个单词
    setTimeout(() => {
      this.setData({ isProcessing: false });
      this.nextWord();
    }, 1000);
  },


  // 进入下一个认识阶段的单词
  nextRecognitionWord() {
    // 非会员限制：在继续学习之前检查
    const membershipStatus = userManager.getMembershipStatus();
    if (!membershipStatus.isPremium && userManager.hasReachedFreeLimit()) {
      if (!this._freeLimitPrompted) {
        this._freeLimitPrompted = true;
        const learned = userManager.getTotalMasteredWordsCount();
        const limit = (membershipStatus.config && membershipStatus.config.maxLearnedWords) || 30;
        wx.showModal({
          title: '需要解锁会员',
          content: `免费版累计可学习 ${limit} 个单词，您已达到 ${learned} 个。\n\n开通会员即可继续学习。`,
          confirmText: '立即开通',
          cancelText: '稍后',
          success: (res) => {
            this._freeLimitPrompted = false;
            if (res.confirm) {
              wx.navigateTo({ url: '/pages/payment/payment' });
            }
          }
        });
      }
      return; // 达到限制，不继续学习
    }
    
    const { currentGroupWords, wordPhaseStatus, currentGroup } = this.data;

    // 统计实际已处理的单词数量（基于 wordPhaseStatus）
    let processedCount = 0;
    const processedWords = [];
    const unprocessedWords = [];
    for (let i = 0; i < currentGroupWords.length; i++) {
      const word = currentGroupWords[i];
      const wordId = this.getWordId(word);
      if (!wordId) continue;
      const status = wordPhaseStatus[wordId];
      if (status && status.phase0 !== 'unknown') {
        processedCount++;
        processedWords.push(word.word || wordId);
      } else {
        unprocessedWords.push(word.word || wordId);
      }
    }

    // 同步更新 recognitionDone 为实际已处理的单词数量
    if (this.data.recognitionDone !== processedCount) {
      this.setData({ recognitionDone: processedCount });
    }

    // 检查是否所有单词都已处理
    if (processedCount >= currentGroupWords.length) {
      // 所有单词都已完成认识判断，显示过滤结果统计界面
      this.showFilterResultPage();
      return;
    }
    
    // 找到下一个未完成认识判断的单词
    let nextWordIndex = -1;
    for (let i = 0; i < currentGroupWords.length; i++) {
      const word = currentGroupWords[i];
      const wordId = this.getWordId(word);
      if (!wordId) continue;
      const status = wordPhaseStatus[wordId];
      
      // 检查单词是否已处理：只检查 wordId 状态
      // 每个变体都是独立的，需要单独学习（基于 serialNumber）
      const isProcessedById = status && status.phase0 !== 'unknown';
      
      if (!isProcessedById) {
        nextWordIndex = i;
        break;
      }
    }
    
    if (nextWordIndex !== -1 && nextWordIndex < currentGroupWords.length) {
      const nextWord = currentGroupWords[nextWordIndex];
      this.setData({
        currentWordIndex: nextWordIndex,
        currentWord: nextWord,
        isProcessing: false
      });
      this.updateWordHighlight(nextWord);
    } else {
      // 所有单词都已完成认识判断（双重检查）
      this.showFilterResultPage();
    }
  },

  // 显示过滤结果统计页面
  showFilterResultPage() {

    const { currentGroupWords, wordPhaseStatus, currentGroup } = this.data;

    const masteredWords = [];
    const needLearningWords = [];
    
    currentGroupWords.forEach(word => {
      const wordId = this.getWordId(word);
      if (!wordId) return;
      const status = wordPhaseStatus[wordId];
      
      if (status && status.phase0 === 'mastered') {
        masteredWords.push(word);
      } else if (status && status.phase0 === 'needLearning') {
        needLearningWords.push(word);
      }
    });
    
    // 先累计当前组的数据
    this.accumulateGroupData(masteredWords, needLearningWords);
    
    // 获取更新后的累计数据
    const accumulatedMastered = wx.getStorageSync('ACCUMULATED_MASTERED_WORDS') || [];
    const accumulatedNeedLearning = wx.getStorageSync('ACCUMULATED_NEED_LEARNING_WORDS') || [];
    
    // 计算累计总数：之前累计 + 当前组数据（去重后）
    // 确保累计数据始终包含当前组，即使当前组已经处理过
    const currentGroupMasteredIds = new Set(masteredWords.map(w => w.id || w.word));
    const currentGroupNeedLearningIds = new Set(needLearningWords.map(w => w.id || w.word));
    
    // 合并累计数据和当前组数据，去重
    const allAccumulatedMasteredIds = new Set([
      ...accumulatedMastered.map(w => w.id || w.word),
      ...Array.from(currentGroupMasteredIds)
    ]);
    const allAccumulatedNeedLearningIds = new Set([
      ...accumulatedNeedLearning.map(w => w.id || w.word),
      ...Array.from(currentGroupNeedLearningIds)
    ]);
    
    const totalAccumulatedMastered = allAccumulatedMasteredIds.size;
    const totalAccumulatedNeedLearning = allAccumulatedNeedLearningIds.size;
    
    // 检查是否还有其他单词可以学习
    // 需要排除当前组已经处理过的单词
    const allMasteredWords = this.getMasteredWords();
    const currentGroupWordIds = currentGroupWords.map(word => this.getWordId(word)).filter(id => id);
    
    const availableWords = this.allWords.filter(word => {
      const wordId = this.getWordId(word);
      if (!wordId) return false;
      // 排除已掌握的单词和当前组已经处理过的单词
      return !allMasteredWords.includes(wordId) && !currentGroupWordIds.includes(wordId);
    });
    const hasMoreWordsToLearn = availableWords.length > 0;

    this.setData({
      showFilterResult: true,
      currentWord: null,  // 清除当前单词，避免认识阶段界面继续显示
      masteredWords: masteredWords,
      masteredCount: masteredWords.length,
      needLearningCount: needLearningWords.length,
      needLearningWords: needLearningWords,
      // 添加累计数据用于显示
      accumulatedMasteredCount: totalAccumulatedMastered,
      accumulatedNeedLearningCount: totalAccumulatedNeedLearning,
      // 添加是否有更多单词可以学习的标志
      hasMoreWordsToLearn: hasMoreWordsToLearn
    });

  },

  // 继续过滤下一组
  continueToNextGroup() {
    const { currentGroup, totalGroups, hasMoreWordsToLearn } = this.data;
    
    // 如果还有下一组，直接完成当前组进入下一组
    if (currentGroup < totalGroups) {
      this.completeCurrentGroup();
      return;
    }
    
    // 如果当前组是最后一组，但还有更多单词可以学习，重新创建分组
    if (currentGroup >= totalGroups && hasMoreWordsToLearn) {

      const { masteredWords, needLearningWords } = this.data;
      this.accumulateGroupData(masteredWords, needLearningWords);
      
      // 保存当前组号，用于后续递增
      const previousGroup = currentGroup;
      
      // 重新创建分组（会自动过滤已掌握的单词）
      const quantity = this.data.sessionTarget || 10;
      this.createLearningGroups(quantity);
      
      // 如果创建了新的分组，开始下一组
      if (this.data.totalGroups > 0) {
        // 组号继续递增（比如第1组完成后，新分组显示为第2组）
        const nextGroup = previousGroup + 1;
        
        // 开始第一组的学习（新分组的第一组）
        const firstGroup = this.data.learningGroups[0];
        if (firstGroup) {
          this.setData({
            currentGroup: nextGroup,  // 保持组号递增
            currentPhase: 0,
            currentWordIndex: 0,
            currentGroupWords: firstGroup.words,
            isRecognitionPhase: true,
            recognitionDone: 0,
            recognizedWords: [],
            needLearningWords: [],
            showFilterResult: false,
            masteredWords: [],
            masteredCount: 0,
            needLearningCount: 0,
            currentWord: null,
            isProcessing: false,
            phase: 'phase0',
            phaseLabel: this.getPhaseLabel(0)
          });
          
          // 初始化新组的单词状态
          this.initializeGroupWordStatus(firstGroup.words);
          
          // 开始认识阶段的第一个单词
          this.prepareRecognitionWord();
          
          wx.showToast({
            title: `开始第${nextGroup}组学习`,
            icon: 'success',
            duration: 1500
          });
        }
      } else {
        wx.showModal({
          title: '提示',
          content: '没有更多单词可以学习了',
          showCancel: false
        });
      }
      return;
    }
    
    // 如果既没有下一组，也没有更多单词，提示用户
    wx.showModal({
      title: '提示',
      content: '已经是最后一组了',
      showCancel: false
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
    const { currentGroup, totalGroups, quantity } = this.data;
    
    // 检查是否还有其他单词可以学习
    const masteredWords = this.getMasteredWords();
    const availableWords = this.allWords.filter(word => {
      const wordId = this.getWordId(word);
      if (!wordId) return false;
      return !masteredWords.includes(wordId);
    });
    
    const hasMoreWords = availableWords.length > 0;
    const hasNextGroup = currentGroup < totalGroups;
    const canContinue = hasNextGroup || hasMoreWords;
    
    wx.showModal({
      title: '太棒了！🎉',
      content: `第${currentGroup}组单词你都认识！已全部标记为掌握。\n\n${canContinue ? (hasNextGroup ? '是否继续学习下一组？' : '是否继续学习更多单词？') : '恭喜完成所有学习！'}`,
      showCancel: canContinue,
      cancelText: '暂停',
      confirmText: canContinue ? (hasNextGroup ? '下一组' : '继续学习') : '完成',
      success: (res) => {
        if (res.confirm) {
          if (hasNextGroup) {
            // 有下一组，直接完成当前组并进入下一组
            this.completeCurrentGroup();
          } else if (hasMoreWords) {
            // 没有下一组，但还有更多单词，重新创建分组
            this.recreateGroupsAndContinue(quantity);
          } else {
            // 没有更多单词，完成学习
            this.completeAllLearning();
          }
        } else if (res.cancel) {
          // 用户选择暂停，返回首页
          wx.navigateBack();
        }
      }
    });
  },

  // 重新创建分组并继续学习
  recreateGroupsAndContinue(quantity) {
    // 保存当前组号，用于后续递增（不要重置为1）
    const previousGroup = this.data.currentGroup || 1;

    this.createLearningGroups(quantity);
    
    // 检查是否有新的分组
    if (this.data.totalGroups > 0) {
      // 组号继续递增
      const nextGroup = previousGroup + 1;
      
      // 开始第一组的学习（新分组的第一组）
      const firstGroup = this.data.learningGroups[0];
      if (firstGroup) {
        this.setData({
          currentGroup: nextGroup,  // 保持组号递增，不要重置为1
          currentPhase: 0,
          currentWordIndex: 0,
          currentGroupWords: firstGroup.words,
          isRecognitionPhase: true,
          recognitionDone: 0,
          recognizedWords: [],
          needLearningWords: [],
          showFilterResult: false,
          masteredWords: [],
          masteredCount: 0,
          needLearningCount: 0,
          currentWord: null,
          isProcessing: false,
          phase: 'phase0',
          phaseLabel: this.getPhaseLabel(0)
        });
        
        // 初始化新组的单词状态
        this.initializeGroupWordStatus(firstGroup.words);
        
        // 预加载本组单词音频
        this.setupCurrentGroup(firstGroup.words);
        
        // 开始认识阶段的第一个单词
        this.prepareRecognitionWord();
        
        // 保存进度
        this.saveGroupLearningProgress();
      
      wx.showToast({
          title: `开始第${nextGroup}组学习`,
        icon: 'success',
          duration: 1500
      });
      }
    } else {
      // 没有更多单词可以学习
      this.completeAllLearning();
    }
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
    
    // 确保第一个单词的含义数据已经规范化处理
    if (firstWord.meaning && typeof firstWord.meaning === 'object') {

      firstWord.meaning = this.normalizeMeaning(firstWord.meaning);

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
    // 预加载需要学习的单词音频
    this.setupCurrentGroup(needLearningWords);
    this.updateWordHighlight(firstWord);
    this.preparePhaseData(1);
    
    // 强制刷新数据，确保界面显示正确
    setTimeout(() => {
      const currentWord = this.data.currentWord;
      if (currentWord && currentWord.meaning && typeof currentWord.meaning === 'object') {

        currentWord.meaning = this.normalizeMeaning(currentWord.meaning);
        this.setData({ currentWord });
        this.updateWordHighlight(currentWord);

      }
    }, 100);
    
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
      
      // 更新单词高亮（确保单词显示正确更新）
      if (nextWord) {
        this.updateWordHighlight(nextWord);
      }
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
      
      // 先更新currentGroup，然后计算正确的phaseLabel
      this.setData({
        currentGroup: nextGroup
      });
      
      this.setData({
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
      
      // 预加载本组单词音频
      this.setupCurrentGroup(nextGroupData.words);
      
      // 初始化新组的单词状态
      this.initializeGroupWordStatus(nextGroupData.words);
      
      // 开始认识阶段的第一个单词
      this.prepareRecognitionWord();

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
    
    // 获取学习统计信息
    const gradeProgress = learningDataSync.getGradeLearningProgress(this.data.gradeId);
    const gradeName = this.getGradeName(this.data.gradeId);
    
    // 计算学习天数
    const studyRecords = wx.getStorageSync('STUDY_RECORDS') || {};
    const gradeStudyRecords = studyRecords[this.data.gradeId] || {};
    const studyDays = Object.keys(gradeStudyRecords).length;
    
    // 跳转到完成界面
    wx.redirectTo({
      url: `/pages/learningComplete/learningComplete?gradeId=${this.data.gradeId}&gradeName=${encodeURIComponent(gradeName)}&totalWords=${this.allWords ? this.allWords.length : 0}&masteredWords=${gradeProgress.mastered + gradeProgress.expert}&studyDays=${studyDays}`
    });
  },

  // 跳过当前单词（用于特殊情况）
  skipWord() {
    this.nextWord();
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







  // 记录生词到生词本
  recordWord(word, userAnswer, correctAnswer, questionType) {
    if (!word || !correctAnswer || !questionType) return;
    
    try {
      const wordBook = wx.getStorageSync('wordBook') || {};
      const now = Date.now();
      
      if (!wordBook[word]) {
        // 非会员错题本容量限制：仅在新增时校验
        const canAdd = userManager.canAddMistake(Object.keys(wordBook).length);
        if (!canAdd.allowed) {
          wx.showModal({
            title: '功能限制',
            content: `${canAdd.reason}\n\n升级会员即可解锁全部功能！`,
            confirmText: '立即升级',
            cancelText: '返回',
            success: (res) => {
              if (res.confirm) {
                wx.navigateTo({ url: '/pages/payment/payment' });
              }
            }
          });
          return;
        }
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
      currentGroup: this.data.currentGroup,  // 添加当前组信息
      totalGroups: this.data.totalGroups,    // 添加总组数信息
      idx: this.data.idx,
      currentWord: this.data.currentWord,
      queue: this.data.queue,
      phaseProgress: this.data.phaseProgress,
      learnedWords: this.data.learnedWords || [],
      pauseTime: this.data.pauseTime,
      timestamp: Date.now()
    };
    
    try {
      wx.setStorageSync(`LEARNING_PROGRESS_${this.data.gradeId}`, progressData);

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
        });

        return true;
      } else {
        // 进度过期，清除
        wx.removeStorageSync(`LEARNING_PROGRESS_${this.data.gradeId}`);

      }
    }
    
    return false;
  },
  
  // 清除学习进度
  clearLearningProgress() {
    wx.removeStorageSync(`LEARNING_PROGRESS_${this.data.gradeId}`);
    wx.removeStorageSync(`GROUP_LEARNING_${this.data.gradeId}`);  // 清除分组学习进度
    
    // 清除累计数据
    wx.removeStorageSync('ACCUMULATED_MASTERED_WORDS');
    wx.removeStorageSync('ACCUMULATED_NEED_LEARNING_WORDS');
    wx.removeStorageSync('PROCESSED_GROUPS');

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
    
    // 检测到学习进度时，初始化累计数据
    this.initAccumulatedData();
    
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
    
    // 重新初始化累计数据（防止从其他页面返回时数据丢失）
    this.initAccumulatedData();
  },
  
  onUnload() {
    this._prefetchState().paused = true;
    // 离开页面时销毁播放器 & 缓存
    AudioManager.destroy();
    this.setData({ isPlaying:false, audioCache:{} });
    this.saveLearningProgress();
  },

  // ===== 自我评估功能 =====

  // 开始自我评估
  startSelfAssessment() {
    if (this.data.isProcessing) return;

    // 先播放单词发音
    this.playCurrentWordPronunciation();

    // 显示自我评估界面
    this.setData({
      showSelfAssessment: true,
      selfAssessmentScore: 0
    });
  },

  // 选择自我评估分数
  selectSelfAssessmentScore(e) {
    const score = e.currentTarget.dataset.score;
    this.setData({
      selfAssessmentScore: score
    });
  },

  // 确认自我评估
  confirmSelfAssessment() {
    if (this.data.isProcessing || !this.data.selfAssessmentScore) return;

    this.setData({ isProcessing: true });

    const { currentWord, selfAssessmentScore, gradeId } = this.data;
    const wordId = this.getWordId(currentWord);

    if (!wordId) {
      console.error('[confirmSelfAssessment] 无法获取单词ID');
      this.setData({ isProcessing: false });
      return;
    }

    // 记录自我评估结果
    const assessmentRecord = {
      wordId: wordId,
      word: currentWord.word,
      score: selfAssessmentScore,
      timestamp: Date.now(),
      gradeId: gradeId
    };

    // 保存到历史记录
    const selfAssessmentHistory = [...this.data.selfAssessmentHistory, assessmentRecord];
    this.setData({
      selfAssessmentHistory: selfAssessmentHistory,
      showSelfAssessment: false,
      isProcessing: false
    });

    // 保存到本地存储
    this.saveSelfAssessmentRecord(assessmentRecord);

    // 显示反馈
    const scoreTexts = {
      1: '需要加强练习',
      2: '还需要努力',
      3: '基本掌握',
      4: '掌握得不错',
      5: '完全掌握'
    };

    wx.showToast({
      title: `评分：${selfAssessmentScore}分 - ${scoreTexts[selfAssessmentScore]}`,
      icon: 'success',
      duration: 1500
    });

    // 记录到学习数据同步系统
    learningDataSync.recordWordProgress({
      word: wordId,
      gradeId: gradeId,
      gradeName: this.data.gradeName
    }, 'self_assessment', true, {
      score: selfAssessmentScore,
      timestamp: Date.now()
    });

    // 继续到下一个单词
    setTimeout(() => {
      this.nextWord();
    }, 1500);
  },

  // 取消自我评估
  cancelSelfAssessment() {
    this.setData({
      showSelfAssessment: false,
      selfAssessmentScore: 0
    });
  },

  // 保存自我评估记录到本地存储
  saveSelfAssessmentRecord(record) {
    try {
      const key = `SELF_ASSESSMENT_${this.data.gradeId}`;
      const existingRecords = wx.getStorageSync(key) || [];
      existingRecords.push(record);

      // 只保留最近100条记录
      const recentRecords = existingRecords.slice(-100);

      wx.setStorageSync(key, recentRecords);
    } catch (e) {
      console.warn('保存自我评估记录失败:', e);
    }
  },

  // 获取自我评估历史
  getSelfAssessmentHistory() {
    try {
      const key = `SELF_ASSESSMENT_${this.data.gradeId}`;
      return wx.getStorageSync(key) || [];
    } catch (e) {
      console.warn('获取自我评估历史失败:', e);
      return [];
    }
  },

  // 获取单词的平均自我评估分数
  getWordAverageScore(wordId) {
    const history = this.getSelfAssessmentHistory();
    const wordAssessments = history.filter(record => record.wordId === wordId);

    if (wordAssessments.length === 0) return null;

    const totalScore = wordAssessments.reduce((sum, record) => sum + record.score, 0);
    return Math.round(totalScore / wordAssessments.length);
  }

});