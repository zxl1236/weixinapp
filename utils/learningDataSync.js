/**
 * 🎯 学习数据同步管理器（WeChat Mini Program）
 * 统一管理：四阶段学习、错题本、日历、进度与向后兼容数据
 * 修复点：
 *  - 统一日历存储键：每日统计统一使用 storageKeys.dailyLearningStats
 *  - 任何 .includes() 或 .phase0 等访问前做结构兜底
 *  - 相位（phase）统一规范化，避免传入异常相位
 */

// =================== 工具函数 ===================

// 确保 obj[key] 为数组
function ensureArray(obj, key) {
  if (!obj[key]) obj[key] = [];
  if (!Array.isArray(obj[key])) obj[key] = [];
  return obj[key];
}

// 确保 obj[key] 为对象
function ensureObject(obj, key) {
  if (!obj[key] || typeof obj[key] !== 'object') obj[key] = {};
  return obj[key];
}

// 安全的 includes 检查（数组/字符串）
function safeIncludes(maybeArrOrStr, item) {
  if (Array.isArray(maybeArrOrStr)) return maybeArrOrStr.includes(item);
  if (typeof maybeArrOrStr === 'string') return maybeArrOrStr.includes(String(item));
  return false;
}

// 确保单词的 phases 结构完整
function ensureWordPhases(wordData) {
  if (!wordData.phases || typeof wordData.phases !== 'object') {
    wordData.phases = {
      phase0: { completed: false, userAnswer: null, lastAttempt: null },
      phase1: { completed: false, attempts: 0, successes: 0, lastAttempt: null },
      phase2: { completed: false, attempts: 0, successes: 0, lastAttempt: null },
      phase3: { completed: false, attempts: 0, successes: 0, lastAttempt: null },
      phase4: { completed: false, attempts: 0, successes: 0, lastAttempt: null }
    };
  } else {
    ['phase0','phase1','phase2','phase3','phase4'].forEach(p => {
      if (!wordData.phases[p]) {
        if (p === 'phase0') {
          wordData.phases[p] = { completed: false, userAnswer: null, lastAttempt: null };
        } else {
          wordData.phases[p] = { completed: false, attempts: 0, successes: 0, lastAttempt: null };
        }
      }
    });
  }
  
  // 确保其他必要的数组属性存在
  if (!Array.isArray(wordData.learningPath)) wordData.learningPath = [];
  if (!Array.isArray(wordData.mistakes)) wordData.mistakes = [];
  
  return wordData.phases;
}

// 规范化相位
function normalizePhase(phase) {
  return ['phase0','phase1','phase2','phase3','phase4'].includes(phase) ? phase : 'phase0';
}

// =================== 主类 ===================

class LearningDataSyncManager {
  constructor() {
    // —— 统一存储键 —— //
    this.storageKeys = {
      // 核心数据
      wordMasteryMap: 'word_mastery_map',          // 单词掌握映射
      learningSessionHistory: 'learning_sessions', // 学习会话历史
      dailyLearningStats: 'dailyLearningStats',    // 每日学习统计（统一日历键）
      // 兼容键
      phaseCompletionTracker: 'phase_completion',
      wordPhaseStatus: 'wordPhaseStatus',
      testHistory: 'testHistory',
      mistakeBook: 'mistakeBook',
      globalProgress: 'globalLearningProgress'
    };

    // 旧的模块化数据（如果你有日历/模块页面用到）
    this._storeKeyCalendar = 'learningCalendar'; // 旧：不再作为日历主存储，仅兼容
    this._storeKeyModules  = 'learningModules';

    // 初始化兼容容器（尽量不破坏现有依赖）
    const calendar = wx.getStorageSync(this._storeKeyCalendar) || {};
    const modules  = wx.getStorageSync(this._storeKeyModules)  || {};

    if (!calendar.days || typeof calendar.days !== 'object') {
      calendar.days = {};
    }
    if (!modules.byPhase || typeof modules.byPhase !== 'object') {
      modules.byPhase = { phase0: [], phase1: [], phase2: [], phase3: [], phase4: [] };
    } else {
      ['phase0','phase1','phase2','phase3','phase4'].forEach(p => ensureArray(modules.byPhase, p));
    }

    this.calendar = calendar;
    this.modules  = modules;

    // 阶段定义（认识阶段不计入掌握评分）
    this.phases = {
      phase0: { name: '认识筛选', type: 'recognition_filter', weight: 0.0 },
      phase1: { name: '四选一',   type: 'recognition',        weight: 0.2 },
      phase2: { name: '跟读',     type: 'pronunciation',      weight: 0.2 },
      phase3: { name: '拼写',     type: 'spelling',           weight: 0.3 },
      phase4: { name: '应用',     type: 'application',        weight: 0.3 }
    };

    // 掌握等级
    this.masteryLevels = {
      new:      { threshold: 0.0, label: '新学',   color: '#f0f0f0' },
      learning: { threshold: 0.25, label: '学习中', color: '#e8f4fd' },
      familiar: { threshold: 0.5, label: '熟悉',   color: '#bde3ff' },
      mastered: { threshold: 0.8, label: '掌握',   color: '#4ecdc4' },
      expert:   { threshold: 1.0, label: '精通',   color: '#44a08d' }
    };
  }

  // ========== 入口：记录学习进展 ==========
  recordWordProgress(wordData, phaseType, result, metadata = {}) {
    try {
      const { word, gradeId, gradeName } = wordData || {};
      if (!word) return { success: false, error: 'empty word id' };

      const timestamp = Date.now();
      const safePhase = normalizePhase(phaseType);

      console.log(`📚 记录学习进展: ${word} - ${safePhase} - ${result ? '✓' : '✗'}`);

      // 1) 掌握映射
      const isNewLearning = this.updateWordMasteryMap(word, safePhase, result, {
        gradeId, gradeName, timestamp, ...metadata
      });

      // 2) 学习会话
      this.recordLearningSession({ word, gradeId, gradeName }, safePhase, result, metadata);

      // 3) 每日统计
      this.updateDailyStats(gradeId, safePhase, result, timestamp, isNewLearning);

      // 4) 同步到模块/兼容系统
      this.syncToModules(word, gradeId, safePhase, result);

      return { success: true, isNewLearning };
    } catch (e) {
      console.error('记录学习进展失败:', e);
      return { success: false, error: e.message };
    }
  }

  // ========== 掌握映射 ==========
  updateWordMasteryMap(word, phaseType, success, metadata) {
    const masteryMap = this.getWordMasteryMap();
    let isNewLearning = false;

    if (!masteryMap[word]) {
      masteryMap[word] = {
        word,
        gradeId: metadata.gradeId,
        gradeName: metadata.gradeName,
        firstSeen: metadata.timestamp,
        lastStudied: metadata.timestamp,

        // 阶段状态
        phases: {
          phase0: { completed: false, userAnswer: null, lastAttempt: null },
          phase1: { completed: false, attempts: 0, successes: 0, lastAttempt: null },
          phase2: { completed: false, attempts: 0, successes: 0, lastAttempt: null },
          phase3: { completed: false, attempts: 0, successes: 0, lastAttempt: null },
          phase4: { completed: false, attempts: 0, successes: 0, lastAttempt: null }
        },

        // 综合统计
        totalAttempts: 0,
        totalSuccesses: 0,
        masteryScore: 0,
        masteryLevel: 'new',

        // 学习轨迹与错误
        learningPath: [],
        mistakes: [],

        // SRS
        nextReview: null,
        reviewInterval: 1
      };
      isNewLearning = true;
    }

    const wordData = masteryMap[word];
    ensureWordPhases(wordData);
    const phaseData = wordData.phases[phaseType];

    if (phaseType === 'phase0') {
      // 认识阶段：写入选择结果（mastered / needLearning）
      const wasCompleted = !!phaseData.completed;
      phaseData.completed   = true;
      phaseData.userAnswer  = metadata.userAnswer || null;
      phaseData.lastAttempt = metadata.timestamp;

      if (!wasCompleted) isNewLearning = true;
    } else {
      // 标准阶段：attempts / successes / completed
      const wasCompleted = !!phaseData.completed;
      phaseData.attempts = (phaseData.attempts || 0) + 1;
      if (success) {
        phaseData.successes = (phaseData.successes || 0) + 1;
        if (!wasCompleted) {
          phaseData.completed = true;
          isNewLearning = true; // 新阶段达成
        }
      }
      phaseData.lastAttempt = metadata.timestamp;
    }

    // 综合
    wordData.totalAttempts += 1;
    if (success) wordData.totalSuccesses += 1;
    wordData.lastStudied = metadata.timestamp;

    // 轨迹
    wordData.learningPath.push({
      phase: phaseType,
      success,
      timestamp: metadata.timestamp,
      metadata: metadata.extra || {}
    });

    // 错误记录
    if (!success) {
      wordData.mistakes.push({
        phase: phaseType,
        timestamp: metadata.timestamp,
        userAnswer: metadata.userAnswer,
        correctAnswer: metadata.correctAnswer,
        questionType: metadata.questionType
      });
    }

    // 掌握分数与等级
    const oldLevel = wordData.masteryLevel;
    this.calculateMasteryScore(wordData);
    if (oldLevel !== wordData.masteryLevel) isNewLearning = true;

    wx.setStorageSync(this.storageKeys.wordMasteryMap, masteryMap);
    return isNewLearning;
  }

  calculateMasteryScore(wordData) {
    let totalScore = 0;
    let maxScore   = 0;

    ensureWordPhases(wordData);

    // 只计算 phase1~4
    Object.keys(this.phases).forEach(phase => {
      if (phase === 'phase0') return;
      const phaseInfo = this.phases[phase];
      const phaseData = wordData.phases[phase];
      const weight    = phaseInfo.weight;

      maxScore += weight;
      if (phaseData && phaseData.completed) {
        const successRate = phaseData.attempts > 0 ? (phaseData.successes / phaseData.attempts) : 0;
        totalScore += weight * successRate;
      }
    });

    wordData.masteryScore = maxScore > 0 ? totalScore / maxScore : 0;

    const score = wordData.masteryScore;
    if (score >= this.masteryLevels.expert.threshold)       wordData.masteryLevel = 'expert';
    else if (score >= this.masteryLevels.mastered.threshold) wordData.masteryLevel = 'mastered';
    else if (score >= this.masteryLevels.familiar.threshold) wordData.masteryLevel = 'familiar';
    else if (score >= this.masteryLevels.learning.threshold) wordData.masteryLevel = 'learning';
    else                                                     wordData.masteryLevel = 'new';

    this.calculateNextReview(wordData);
  }

  calculateNextReview(wordData) {
    const now = Date.now();
    const DAY = 24 * 60 * 60 * 1000;

    let interval = wordData.reviewInterval || 1;

    switch (wordData.masteryLevel) {
      case 'new':      interval = 1; break;
      case 'learning': interval = 2; break;
      case 'familiar': interval = 4; break;
      case 'mastered': interval = 7; break;
      case 'expert':   interval = 15; break;
    }

    const recentMistakes = (wordData.mistakes || []).filter(m => now - m.timestamp < 7 * DAY).length;
    if (recentMistakes > 0) interval = Math.max(1, Math.floor(interval / 2));

    wordData.reviewInterval = interval;
    wordData.nextReview     = now + interval * DAY;
  }

  // ========== 学习会话 ==========
  recordLearningSession(wordData, phaseType, result, metadata) {
    let sessions = this.getLearningSessionHistory();
    // 确保 sessions 是数组
    if (!Array.isArray(sessions)) {
      console.warn('学习会话历史不是数组，重新初始化');
      sessions = [];
    }
    
    sessions.push({
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 11)}`,
      timestamp: Date.now(),
      word: wordData.word,
      gradeId: wordData.gradeId,
      gradeName: wordData.gradeName,
      phase: phaseType,
      phaseName: (this.phases[phaseType] && this.phases[phaseType].name) || phaseType,
      success: result,
      duration: metadata.duration || 0,
      attempts: metadata.attempts || 1,
      metadata: metadata.extra || {}
    });
    
    if (sessions.length > 1000) sessions.splice(0, sessions.length - 1000);
    wx.setStorageSync(this.storageKeys.learningSessionHistory, sessions);
  }

  // ========== 每日统计（统一键） ==========
  updateDailyStats(gradeId, phaseType, success, timestamp, isNewLearning) {
    const dateStr = new Date(timestamp).toISOString().split('T')[0];
    const dailyStats = this.getDailyLearningStats();

    if (!dailyStats[dateStr]) {
      dailyStats[dateStr] = {
        date: dateStr,
        grades: {},
        totalAttempts: 0,
        totalSuccesses: 0,
        totalWords: [],
        newWords: 0,
        phases: {
          phase0: { attempts: 0, successes: 0 },
          phase1: { attempts: 0, successes: 0 },
          phase2: { attempts: 0, successes: 0 },
          phase3: { attempts: 0, successes: 0 },
          phase4: { attempts: 0, successes: 0 }
        }
      };
    }

    const dayStats = dailyStats[dateStr];

    // 确保数据结构完整性（向后兼容）
    if (!dayStats.grades || typeof dayStats.grades !== 'object') dayStats.grades = {};
    if (!dayStats.phases || typeof dayStats.phases !== 'object') dayStats.phases = {};
    if (typeof dayStats.totalAttempts !== 'number') dayStats.totalAttempts = 0;
    if (typeof dayStats.totalSuccesses !== 'number') dayStats.totalSuccesses = 0;
    if (typeof dayStats.newWords !== 'number') dayStats.newWords = 0;

    // 年级数据结构验证
    if (!dayStats.grades[gradeId] || typeof dayStats.grades[gradeId] !== 'object') {
      dayStats.grades[gradeId] = { attempts: 0, successes: 0, words: [], newWords: 0 };
    }
    const gradeStats = dayStats.grades[gradeId];
    if (typeof gradeStats.attempts !== 'number') gradeStats.attempts = 0;
    if (typeof gradeStats.successes !== 'number') gradeStats.successes = 0;
    if (typeof gradeStats.newWords !== 'number') gradeStats.newWords = 0;
    if (!Array.isArray(gradeStats.words)) gradeStats.words = [];

    // 阶段数据结构验证 - 关键修复点
    if (!dayStats.phases[phaseType] || typeof dayStats.phases[phaseType] !== 'object') {
      dayStats.phases[phaseType] = { attempts: 0, successes: 0 };
    }
    const phaseStats = dayStats.phases[phaseType];
    if (typeof phaseStats.attempts !== 'number') phaseStats.attempts = 0;
    if (typeof phaseStats.successes !== 'number') phaseStats.successes = 0;

    dayStats.totalAttempts += 1;
    gradeStats.attempts += 1;
    phaseStats.attempts += 1;

    if (success) {
      dayStats.totalSuccesses += 1;
      gradeStats.successes += 1;
      phaseStats.successes += 1;
    }

    if (isNewLearning) {
      dayStats.newWords += 1;
      gradeStats.newWords += 1;
    }

    wx.setStorageSync(this.storageKeys.dailyLearningStats, dailyStats);
  }

  // ========== 模块/兼容系统同步 ==========
  syncToModules(word, gradeId, phaseType, success) {
    // 错题本（仅失败）
    if (!success) this.syncToMistakeBook(word, gradeId, phaseType);

    // 日历
    this.syncToCalendar(word, gradeId, phaseType, success);

    // 进度
    this.syncToProgressModule(word, gradeId, phaseType, success);

    // 旧系统
    this.syncToLegacySystems(word, gradeId, phaseType, success);
  }

  syncToMistakeBook(word, gradeId, phaseType) {
    const mistakeBook = wx.getStorageSync('mistakeBook') || {};
    const now = Date.now();

    if (!mistakeBook[word]) {
      mistakeBook[word] = {
        word,
        correctAnswer: word,
        grade: gradeId,
        errorCount: 0,
        firstErrorTime: now,
        lastErrorTime: now,
        errorHistory: [],
        mastered: false,
        phases: {}
      };
    }

    const item = mistakeBook[word];
    item.errorCount += 1;
    item.lastErrorTime = now;
    item.phases[phaseType] = (item.phases[phaseType] || 0) + 1;

    wx.setStorageSync('mistakeBook', mistakeBook);
  }

  /**
   * 📅 日历同步（**统一键：dailyLearningStats**）
   * 只做**计数与去重词表**，不写入深层 phase0 结构，杜绝 undefined.phase0 报错
   */
  syncToCalendar(word, gradeId, phaseType, success) {
    const safePhase  = normalizePhase(phaseType);
    const storeKey   = this.storageKeys.dailyLearningStats;
    const dateStr    = new Date().toISOString().split('T')[0];

    const calendarData = wx.getStorageSync(storeKey) || {};
    if (!calendarData[dateStr] || typeof calendarData[dateStr] !== 'object') {
      calendarData[dateStr] = { tests: 0, trains: 0, mistakes: 0, words: [], phases: {} };
    }

    const dayData = calendarData[dateStr];
    
    // 确保数据结构完整性
    if (!Array.isArray(dayData.words)) dayData.words = [];
    if (!dayData.phases || typeof dayData.phases !== 'object') dayData.phases = {};
    if (typeof dayData.phases[safePhase] !== 'number') dayData.phases[safePhase] = 0;
    if (typeof dayData.trains !== 'number') dayData.trains = 0;
    if (typeof dayData.tests !== 'number') dayData.tests = 0;
    if (typeof dayData.mistakes !== 'number') dayData.mistakes = 0;

    // 去重记录单词
    if (!safeIncludes(dayData.words, word)) dayData.words.push(word);

    // 计数
    dayData.trains += 1;
    dayData.phases[safePhase] += 1;
    if (!success) dayData.mistakes += 1;

    try {
      wx.setStorageSync(storeKey, calendarData);
    } catch (e) {
      console.error('写入日历数据失败:', e);
    }
  }

  syncToProgressModule(word, gradeId, phaseType, success) {
    const key = this.storageKeys.globalProgress;
    const globalProgress = wx.getStorageSync(key) || {};

    if (!globalProgress[word]) {
      globalProgress[word] = {
        word,
        grade: gradeId,
        firstSeen: Date.now(),
        lastSeen: Date.now(),
        totalAttempts: 0,
        correctAttempts: 0,
        questionTypes: [],
        scores: [],
        masteryLevel: 'poor',
        phases: {}
      };
    }

    const p = globalProgress[word];
    p.totalAttempts += 1;
    p.lastSeen = Date.now();
    p.phases[phaseType] = (p.phases[phaseType] || 0) + 1;

    if (success) {
      p.correctAttempts += 1;
      p.scores.push(1);
    } else {
      p.scores.push(0);
    }

    // 简单分级
    const recent = p.scores.slice(-10);
    const avg = recent.reduce((s, x) => s + x, 0) / recent.length;
    if (avg >= 0.8)       p.masteryLevel = 'mastered';
    else if (avg >= 0.6)  p.masteryLevel = 'good';
    else if (avg >= 0.4)  p.masteryLevel = 'fair';
    else                  p.masteryLevel = 'poor';

    wx.setStorageSync(key, globalProgress);
  }

  syncToLegacySystems(word, gradeId, phaseType, success) {
    // 训练历史
    let trainHistory = wx.getStorageSync('trainHistory') || [];
    if (!Array.isArray(trainHistory)) {
      console.warn('训练历史不是数组，重新初始化');
      trainHistory = [];
    }
    trainHistory.push({ word, grade: gradeId, phase: phaseType, success, timestamp: Date.now() });
    if (trainHistory.length > 500) trainHistory.splice(0, trainHistory.length - 500);
    wx.setStorageSync('trainHistory', trainHistory);

    // 全完成则放入 learned_<gradeId>
    const masteryMap = this.getWordMasteryMap();
    const wd = masteryMap[word];
    if (wd && this.isWordFullyLearned(wd)) {
      const learnedKey   = `learned_${gradeId}`;
      const learnedWords = wx.getStorageSync(learnedKey) || [];
      const arr = Array.isArray(learnedWords) ? learnedWords : [];
      if (!safeIncludes(arr, word)) {
        arr.push(word);
        wx.setStorageSync(learnedKey, arr);
      }
    }
  }

  // ========== 完成度判断 ==========
  /**
   * ✅ 完全学会：
   *  - 认识阶段直接标记为 'mastered'
   *  - 或四阶段均一次通过（attempts=1 & successes=1）
   */
  isWordFullyLearned(wordData) {
    if (!wordData || typeof wordData !== 'object') return false;
    ensureWordPhases(wordData);

    const p0 = wordData.phases && wordData.phases.phase0;
    if (p0 && p0.completed && p0.userAnswer === 'mastered') return true;

    const phasesToCheck = ['phase1','phase2','phase3','phase4'];
    return phasesToCheck.every(p => {
      const pd = wordData.phases[p];
      return pd && pd.completed && pd.attempts === 1 && pd.successes === 1;
    });
  }

  isWordMastered(wordData) {
    return this.isWordFullyLearned(wordData);
  }

  // ========== 查询/统计 ==========
  getWordStats(word) {
    const map = this.getWordMasteryMap();
    return map[word] || null;
  }

  // 获取本地存储的已掌握单词列表
  getLocalMasteredWords(gradeId) {
    const masteredKey = `MASTERED_WORDS_${gradeId}`;
    return wx.getStorageSync(masteredKey) || [];
  }

  getGradeLearningProgress(gradeId) {
    const masteryMap = this.getWordMasteryMap();
    const gradeWords = Object.values(masteryMap).filter(w => w.gradeId === gradeId);
    
    // 获取本地存储的已掌握单词列表
    const localMasteredWords = this.getLocalMasteredWords(gradeId);
    console.log(`📊 ${gradeId} 本地已掌握单词:`, localMasteredWords);

    const stats = {
      total: gradeWords.length,
      new: 0,
      learning: 0,
      familiar: 0,
      mastered: 0,
      expert: 0,
      phases: {
        phase1: { completed: 0, total: gradeWords.length },
        phase2: { completed: 0, total: gradeWords.length },
        phase3: { completed: 0, total: gradeWords.length },
        phase4: { completed: 0, total: gradeWords.length }
      },
      needReview: 0
    };

    const now = Date.now();

    gradeWords.forEach(word => {
      ensureWordPhases(word);
      
      // 检查是否为本地存储的已掌握单词
      const wordId = word.id || word.word;
      const isLocalMastered = localMasteredWords.includes(wordId);

      if (this.isWordMastered(word) || isLocalMastered) {
        stats.mastered += 1;
      } else {
        const completedPhases = ['phase1','phase2','phase3','phase4'].filter(p =>
          word.phases[p] && word.phases[p].completed
        ).length;

        if (completedPhases === 0)      stats.new += 1;
        else if (completedPhases <= 2)  stats.learning += 1;
        else                            stats.familiar += 1;
      }

      ['phase1','phase2','phase3','phase4'].forEach(p => {
        if (word.phases[p] && word.phases[p].completed) stats.phases[p].completed += 1;
      });

      if (word.nextReview && word.nextReview <= now) stats.needReview += 1;
    });

    return stats;
  }

  getWordsForReview(gradeId, limit = 20) {
    const masteryMap = this.getWordMasteryMap();
    const now = Date.now();

    return Object.values(masteryMap)
      .filter(w => w.gradeId === gradeId && w.nextReview && w.nextReview <= now)
      .sort((a, b) => a.nextReview - b.nextReview)
      .slice(0, limit);
  }

  // 获取特定年级的单词列表（按掌握状态分类）
  getGradeWordsByStatus(gradeId) {
    const masteryMap = this.getWordMasteryMap();
    const gradeWords = Object.values(masteryMap).filter(w => w.gradeId === gradeId);
    
    // 获取本地存储的已掌握单词列表
    const localMasteredWords = this.getLocalMasteredWords(gradeId);
    
    const result = {
      mastered: [],
      learning: [],
      familiar: [],
      new: [],
      withErrors: []
    };
    
    gradeWords.forEach(wordData => {
      ensureWordPhases(wordData);
      
      // 检查是否为本地存储的已掌握单词
      const wordId = wordData.id || wordData.word;
      const isLocalMastered = localMasteredWords.includes(wordId);
      
      if (this.isWordMastered(wordData) || isLocalMastered) {
        result.mastered.push(wordData);
      } else {
        const completedPhases = ['phase1','phase2','phase3','phase4'].filter(p =>
          wordData.phases[p] && wordData.phases[p].completed
        ).length;
        
        if (completedPhases === 0) {
          result.new.push(wordData);
        } else if (completedPhases <= 2) {
          result.learning.push(wordData);
        } else {
          result.familiar.push(wordData);
        }
      }
      
      // 检查是否有错误记录
      if (wordData.mistakes && wordData.mistakes.length > 0) {
        result.withErrors.push(wordData);
      }
    });
    
    return result;
  }

  // ========== 存取器 ==========
  getWordMasteryMap() {
    try {
      return wx.getStorageSync(this.storageKeys.wordMasteryMap) || {};
    } catch (e) {
      console.error('获取单词掌握映射失败:', e);
      return {};
    }
  }

  getLearningSessionHistory() {
    try {
      return wx.getStorageSync(this.storageKeys.learningSessionHistory) || [];
    } catch (e) {
      console.error('获取学习会话历史失败:', e);
      return [];
    }
  }

  getDailyLearningStats() {
    try {
      return wx.getStorageSync(this.storageKeys.dailyLearningStats) || {};
    } catch (e) {
      console.error('获取每日学习统计失败:', e);
      return {};
    }
  }

  // ========== 维护 ==========
  cleanupOldData(daysToKeep = 90) {
    const cutoff = Date.now() - daysToKeep * 24 * 60 * 60 * 1000;

    // 会话
    const sessions = this.getLearningSessionHistory();
    const filtered = sessions.filter(s => s.timestamp > cutoff);
    wx.setStorageSync(this.storageKeys.learningSessionHistory, filtered);

    // 每日统计
    const daily = this.getDailyLearningStats();
    Object.keys(daily).forEach(date => {
      const ts = new Date(date).getTime();
      if (Number.isFinite(ts) && ts < cutoff) delete daily[date];
    });
    wx.setStorageSync(this.storageKeys.dailyLearningStats, daily);

    console.log('数据清理完成');
  }

  // ========== 导出 ==========
  exportLearningData(gradeId = null) {
    const masteryMap = this.getWordMasteryMap();
    const sessions   = this.getLearningSessionHistory();
    const dailyStats = this.getDailyLearningStats();

    const filteredMap = gradeId
      ? Object.fromEntries(Object.entries(masteryMap).filter(([_, w]) => w.gradeId === gradeId))
      : masteryMap;

    const filteredSessions = gradeId
      ? sessions.filter(s => s.gradeId === gradeId)
      : sessions;

    return {
      timestamp: Date.now(),
      gradeId,
      masteryMap: filteredMap,
      sessions: filteredSessions,
      dailyStats,
      metadata: {
        totalWords: Object.keys(filteredMap).length,
        totalSessions: filteredSessions.length,
        exportDate: new Date().toISOString()
      }
    };
  }
}

// ===== 实例与导出 =====
const learningDataSync = new LearningDataSyncManager();

module.exports = {
  LearningDataSyncManager,
  learningDataSync
};
