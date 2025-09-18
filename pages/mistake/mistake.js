// 生词本页面
const { userManager } = require('../../utils/userManager.js');
const { studyTracker } = require('../../utils/studyTracker.js');
const { learningDataSync } = require('../../utils/learningDataSync.js');

Page({
  data: {
    words: [], // 生词列表
    loading: true,
    isEmpty: true, // 默认为空状态，避免闪烁
    currentMistake: null,
    showDetail: false,
    reviewWords: [], // 复习词汇
    retestMode: false,
    unmasteredCount: 0, // 未掌握生词数量
    isPlaying: false, // 播放状态
    audioCache: {} // 音频缓存
  },

  onLoad() {
    this.loadWords();
  },

  onShow() {
    this.loadWords();
  },

  // 返回上一页
  goBack() {
    const pages = getCurrentPages();
    
    if (pages.length > 1) {
      // 有上一页，执行返回
      wx.navigateBack({
        delta: 1,
        fail: () => {
          // 如果返回失败，跳转到首页
          wx.reLaunch({
            url: '/pages/index/index'
          });
        }
      });
    } else {
      // 没有上一页，跳转到首页
      wx.reLaunch({
        url: '/pages/index/index'
      });
    }
  },





  // 加载生词数据 - 使用新的统一数据源
  loadWords() {
    try {
      // 从新的统一数据源获取生词
      const masteryMap = learningDataSync.getWordMasteryMap();
      const allWords = [];
      
      Object.values(masteryMap).forEach(wordData => {
        if (wordData.mistakes && wordData.mistakes.length > 0) {
          // 获取最新学习记录
          const latestMistake = wordData.mistakes[wordData.mistakes.length - 1];
          
          allWords.push({
            word: wordData.word,
            correctAnswer: wordData.word,
            grade: wordData.gradeId,
            gradeName: wordData.gradeName,
            errorCount: wordData.mistakes.length,
            lastErrorTime: latestMistake.timestamp,
            firstErrorTime: wordData.mistakes[0].timestamp,
            masteryLevel: wordData.masteryLevel,
            masteryScore: wordData.masteryScore,
            
            // 格式化时间显示
            lastErrorTimeStr: new Date(latestMistake.timestamp).toLocaleDateString(),
            firstErrorTimeStr: new Date(wordData.mistakes[0].timestamp).toLocaleDateString(),
            
            // 阶段学习详情
            phaseErrors: this.groupMistakesByPhase(wordData.mistakes),
            
            // 最近学习
            recentMistakes: wordData.mistakes.slice(-3),
            
            // 是否需要复习
            needsReview: wordData.nextReview && wordData.nextReview <= Date.now(),
            
            // 学习进度
            phaseProgress: this.calculatePhaseProgress(wordData.phases),
            
            // 学习类型分析
            errorAnalysis: this.analyzeErrors(wordData.mistakes),
            
            // 兼容旧格式
            level: 1,
            mastered: wordData.masteryLevel === 'mastered' || wordData.masteryLevel === 'expert',
            errorHistory: wordData.mistakes.map(m => ({
              selectedAnswer: m.userAnswer,
              timestamp: m.timestamp,
              phase: m.phase,
              level: 1
            })),
            source: 'new'
          });
        }
      });
      
      // 兼容旧生词本数据
      const traditionalWordBook = wx.getStorageSync('wordBook') || wx.getStorageSync('mistakeBook') || {};
      Object.values(traditionalWordBook).forEach(wordData => {
        // 检查是否已在新数据源中存在
        const existsInNew = allWords.find(w => w.word === wordData.word);
        if (!existsInNew && wordData.word) {
          allWords.push({
            word: wordData.word,
            correctAnswer: wordData.correctAnswer || wordData.word,
            grade: wordData.grade || wordData.gradeId || '',
            gradeName: wordData.gradeName || `${wordData.grade || '未知'}年级`,
            errorCount: wordData.errorCount || 1,
            lastErrorTime: wordData.lastErrorTime || Date.now(),
            firstErrorTime: wordData.firstErrorTime || Date.now(),
            masteryLevel: wordData.mastered ? 'mastered' : 'learning',
            masteryScore: wordData.mastered ? 0.8 : 0.3,
            
            // 格式化时间显示
            lastErrorTimeStr: new Date(wordData.lastErrorTime || Date.now()).toLocaleDateString(),
            firstErrorTimeStr: new Date(wordData.firstErrorTime || Date.now()).toLocaleDateString(),
            
            // 默认值
            phaseErrors: {},
            recentMistakes: [],
            needsReview: !wordData.mastered,
            phaseProgress: {},
            errorAnalysis: {},
            
            // 兼容旧格式
            level: wordData.level || 1,
            mastered: wordData.mastered || false,
            errorHistory: wordData.errorHistory || [],
            source: 'traditional'
          });
        }
      });
      
      // 按优先级排序：需要复习 > 学习次数 > 最近学习时间
      allWords.sort((a, b) => {
        if (a.needsReview !== b.needsReview) {
          return a.needsReview ? -1 : 1;
        }
        if (a.errorCount !== b.errorCount) {
          return b.errorCount - a.errorCount;
        }
        return b.lastErrorTime - a.lastErrorTime;
      });
      
      // 计算统计信息
      const stats = this.calculateWordStats(allWords);
      
      this.setData({
        words: allWords,
        loading: false,
        isEmpty: allWords.length === 0,
        unmasteredCount: allWords.filter(w => !w.mastered).length,
        needReviewCount: allWords.filter(w => w.needsReview).length,
        wordStats: stats,
        suggestions: this.getReviewSuggestions(allWords)
      });
      
      // 调试输出状态
      console.log('生词本状态:', {
        wordsCount: allWords.length,
        loading: false,
        isEmpty: allWords.length === 0,
        data: this.data
      });
      
      const newSourceCount = allWords.filter(w => w.source === 'new').length;
      const traditionalCount = allWords.filter(w => w.source === 'traditional').length;
      console.log(`加载生词: ${allWords.length}个（新数据源: ${newSourceCount}，传统数据源: ${traditionalCount}），需要复习: ${allWords.filter(w => w.needsReview).length}个`);
      
    } catch (error) {
      console.error('加载生词失败:', error);
      this.setData({
        loading: false,
        isEmpty: true,
        words: []
      });
      
      // 调试输出错误状态
      console.log('生词本错误状态:', {
        loading: false,
        isEmpty: true,
        error: error.message
      });
    }
  },

  // 🔍 按阶段分组学习记录
  groupMistakesByPhase(mistakes) {
    const phaseGroups = {
      phase1: { name: '四选一', count: 0, recent: null, rate: 0 },
      phase2: { name: '跟读', count: 0, recent: null, rate: 0 },
      phase3: { name: '拼写', count: 0, recent: null, rate: 0 },
      phase4: { name: '应用', count: 0, recent: null, rate: 0 }
    };
    
    mistakes.forEach(mistake => {
      if (phaseGroups[mistake.phase]) {
        phaseGroups[mistake.phase].count++;
        if (!phaseGroups[mistake.phase].recent || 
            mistake.timestamp > phaseGroups[mistake.phase].recent.timestamp) {
          phaseGroups[mistake.phase].recent = mistake;
        }
      }
    });
    
    // 计算各阶段学习率
    const totalMistakes = mistakes.length;
    Object.keys(phaseGroups).forEach(phase => {
      const group = phaseGroups[phase];
      group.rate = totalMistakes > 0 ? 
        Math.round((group.count / totalMistakes) * 100) : 0;
    });
    
    return phaseGroups;
  },

  // 📊 计算阶段进度
  calculatePhaseProgress(phases) {
    const progress = {
      completed: 0,
      total: 4,
      details: {}
    };
    
    Object.keys(phases).forEach(phase => {
      const phaseData = phases[phase];
      const phaseName = {
        phase1: '四选一',
        phase2: '跟读', 
        phase3: '拼写',
        phase4: '应用'
      }[phase];
      
      progress.details[phase] = {
        name: phaseName,
        completed: phaseData.completed,
        attempts: phaseData.attempts,
        successes: phaseData.successes,
        successRate: phaseData.attempts > 0 ? 
          Math.round((phaseData.successes / phaseData.attempts) * 100) : 0
      };
      
      if (phaseData.completed) {
        progress.completed++;
      }
    });
    
    progress.percentage = Math.round((progress.completed / progress.total) * 100);
    
    return progress;
  },

  // 🔬 分析学习类型
  analyzeErrors(mistakes) {
    const analysis = {
      commonErrors: {},
      timePattern: this.analyzeTimePattern(mistakes),
      difficulty: this.analyzeDifficulty(mistakes),
      improvement: this.analyzeImprovement(mistakes)
    };
    
    // 统计常见学习记录
    mistakes.forEach(mistake => {
      const key = `${mistake.phase}_${mistake.userAnswer || 'unknown'}`;
      if (!analysis.commonErrors[key]) {
        analysis.commonErrors[key] = {
          phase: mistake.phase,
          userAnswer: mistake.userAnswer,
          correctAnswer: mistake.correctAnswer,
          count: 0
        };
      }
      analysis.commonErrors[key].count++;
    });
    
    return analysis;
  },

  // ⏰ 分析时间模式
  analyzeTimePattern(mistakes) {
    const hours = mistakes.map(m => new Date(m.timestamp).getHours());
    const hourCounts = {};
    
    hours.forEach(hour => {
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    });
    
    // 找出学习最多的时间段
    let maxHour = 0;
    let maxCount = 0;
    Object.keys(hourCounts).forEach(hour => {
      if (hourCounts[hour] > maxCount) {
        maxCount = hourCounts[hour];
        maxHour = parseInt(hour);
      }
    });
    
    return {
      peakLearningHour: maxHour,
      peakLearningCount: maxCount,
      suggestion: this.getTimeAdvice(maxHour)
    };
  },

  // 💪 分析难度分布
  analyzeDifficulty(mistakes) {
    const recentMistakes = mistakes.slice(-10);
    const phases = recentMistakes.map(m => m.phase);
    
    const phaseCounts = {
      phase1: phases.filter(p => p === 'phase1').length,
      phase2: phases.filter(p => p === 'phase2').length,
      phase3: phases.filter(p => p === 'phase3').length,
      phase4: phases.filter(p => p === 'phase4').length
    };
    
    // 找出最常学习的阶段
    const maxPhase = Object.keys(phaseCounts).reduce((a, b) => 
      phaseCounts[a] > phaseCounts[b] ? a : b
    );
    
    return {
      mostStudiedPhase: maxPhase,
      mostStudiedPhaseName: {
        phase1: '四选一',
        phase2: '跟读',
        phase3: '拼写',
        phase4: '应用'
      }[maxPhase],
      distribution: phaseCounts
    };
  },

  // 📈 分析改进趋势
  analyzeImprovement(mistakes) {
    if (mistakes.length < 5) {
      return { trend: 'insufficient_data', suggestion: '继续学习以获取更多数据' };
    }
    
    const recent = mistakes.slice(-5);
    const earlier = mistakes.slice(-10, -5);
    
    const recentAvgTime = recent.reduce((sum, m) => sum + m.timestamp, 0) / recent.length;
    const earlierAvgTime = earlier.length > 0 ? 
      earlier.reduce((sum, m) => sum + m.timestamp, 0) / earlier.length : recentAvgTime;
    
    const timeDiff = recentAvgTime - earlierAvgTime;
    const daysDiff = timeDiff / (1000 * 60 * 60 * 24);
    
    let trend = 'stable';
    let suggestion = '保持当前学习节奏';
    
    if (daysDiff < 1) {
      trend = 'frequent_study';
      suggestion = '学习频率很高，建议适当休息';
    } else if (daysDiff > 7) {
      trend = 'improving';
      suggestion = '学习效果良好，可以适当增加难度';
    }
    
    return { trend, suggestion, daysSinceLastStudy: daysDiff };
  },

  // 💡 获取时间建议
  getTimeAdvice(hour) {
    if (hour >= 6 && hour < 9) {
      return '早晨学习效果好，建议进行新内容学习';
    } else if (hour >= 12 && hour < 14) {
      return '午休时间适合复习已学内容';
    } else if (hour >= 21) {
      return '晚上较晚时建议复习，避免学习新内容';
    } else {
      return '这个时间段学习效果不错，可以保持';
    }
  },

  // 📊 计算生词统计
  calculateWordStats(words) {
    const stats = {
      total: words.length,
      needReview: words.filter(w => w.needsReview).length,
      byGrade: {},
      byMasteryLevel: {
        new: 0,
        learning: 0,
        familiar: 0,
        mastered: 0,
        expert: 0
      },
      byPhase: {
        phase1: 0,
        phase2: 0,
        phase3: 0,
        phase4: 0
      },
      avgStudyCount: 0,
      recentTrend: this.calculateRecentTrend(words)
    };
    
    let totalStudyCount = 0;
    
    words.forEach(word => {
      // 按年级统计
      if (!stats.byGrade[word.grade]) {
        stats.byGrade[word.grade] = 0;
      }
      stats.byGrade[word.grade]++;
      
      // 按掌握度统计
      stats.byMasteryLevel[word.masteryLevel]++;
      
      // 按阶段统计
      Object.keys(word.phaseErrors).forEach(phase => {
        stats.byPhase[phase] += word.phaseErrors[phase].count;
      });
      
      totalStudyCount += word.errorCount;
    });
    
    stats.avgStudyCount = words.length > 0 ? 
      Math.round(totalStudyCount / words.length * 10) / 10 : 0;
    
    return stats;
  },

  // 📈 计算最近趋势
  calculateRecentTrend(words) {
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;
    
    const last7Days = words.filter(w => 
      now - w.lastErrorTime < 7 * dayMs
    ).length;
    
    const previous7Days = words.filter(w => 
      now - w.lastErrorTime >= 7 * dayMs && 
      now - w.lastErrorTime < 14 * dayMs
    ).length;
    
    let trend = 'stable';
    if (last7Days > previous7Days * 1.2) {
      trend = 'increasing';
    } else if (last7Days < previous7Days * 0.8) {
      trend = 'decreasing';
    }
    
    return {
      trend,
      last7Days,
      previous7Days,
      change: last7Days - previous7Days
    };
  },

  // 🎯 获取复习建议
  getReviewSuggestions(words) {
    const suggestions = [];
    const stats = this.calculateWordStats(words);
    
    // 基于学习数量的建议
    if (stats.needReview > 10) {
      suggestions.push({
        type: 'priority',
        title: '优先复习',
        content: `有${stats.needReview}个单词需要复习，建议优先处理`
      });
    }
    
    // 基于阶段的建议
    const maxPhaseStudies = Math.max(...Object.values(stats.byPhase));
    const focusPhase = Object.keys(stats.byPhase).find(
      phase => stats.byPhase[phase] === maxPhaseStudies
    );
    
    if (maxPhaseStudies > 0) {
      const phaseNames = {
        phase1: '四选一',
        phase2: '跟读',
        phase3: '拼写',
        phase4: '应用'
      };
      
      suggestions.push({
        type: 'focus',
        title: '重点练习',
        content: `${phaseNames[focusPhase]}阶段学习较多，建议加强练习`
      });
    }
    
    // 基于趋势的建议
    if (stats.recentTrend.trend === 'increasing') {
      suggestions.push({
        type: 'encouragement',
        title: '学习积极',
        content: '最近学习增多，继续保持良好的学习状态'
      });
    }
    
    return suggestions;
  },

  // 查看生词详情
  showWordDetail(e) {
    const index = e.currentTarget.dataset.index;
    const word = this.data.words[index];
    
    // 格式化学习历史的时间
    if (word.errorHistory) {
      word.errorHistory.forEach(history => {
        history.timeStr = new Date(history.timestamp).toLocaleString();
      });
    }
    
    this.setData({
      currentMistake: word,
      showDetail: true
    });
  },

  // 关闭生词详情
  closeWordDetail() {
    this.setData({
      showDetail: false,
      currentMistake: null
    });
  },

  // 标记为已掌握
  markAsMastered(e) {
    const index = e.currentTarget.dataset.index;
    const words = [...this.data.words];
    words[index].mastered = true;

    // 更新本地存储
    this.updateWordStatus(words[index].word, true);

    // 重新计算未掌握数量
    const unmasteredCount = words.filter(w => !w.mastered).length;

    this.setData({
      words: words,
      unmasteredCount: unmasteredCount
    });

    wx.showToast({
      title: '已标记为掌握',
      icon: 'success'
    });
  },

  // 更新生词状态到本地存储
  updateWordStatus(word, mastered) {
    try {
      const wordBook = wx.getStorageSync('wordBook') || {};
      wordBook[word] = {
        mastered: mastered,
        updateTime: Date.now()
      };
      wx.setStorageSync('wordBook', wordBook);
    } catch (error) {
      console.error('更新生词状态失败:', error);
    }
  },

  // 复习生词
  reviewWords() {
    const unmastered = this.data.words.filter(w => !w.mastered);
    
    if (unmastered.length === 0) {
      wx.showToast({
        title: '没有需要复习的生词',
        icon: 'none'
      });
      return;
    }

    // 准备复习数据
    const reviewWords = unmastered.map(word => ({
      word: word.word,
      meaning: word.correctAnswer,
      options: this.generateOptionsForWord(word.word, word.correctAnswer),
      level: word.level
    }));

    // 保存复习数据到临时存储
    wx.setStorageSync('reviewWords', reviewWords);

    // 跳转到测试页面
    wx.navigateTo({
      url: `/pages/test/test?review=true&count=${reviewWords.length}`
    });
  },

  // 为单词生成选项（使用词汇数据库）
  generateOptionsForWord(word, correctAnswer) {
    try {
      // 尝试从词汇数据库获取干扰项
      const { getPreprocessedGradeVocabulary } = require('../../utils/preprocessedWordDatabase.js');
      
      // 获取相关年级的词汇作为干扰项
      const allWords = [];
      ['grade3', 'grade4', 'grade5', 'grade6', 'grade7', 'grade8', 'grade9'].forEach(gradeId => {
        const gradeWords = getPreprocessedGradeVocabulary(gradeId, 50);
        allWords.push(...gradeWords);
      });
      
      // 筛选出不同的意思作为干扰项
      const possibleDistractors = allWords
        .filter(w => w.meaning && w.meaning !== correctAnswer && w.meaning.length > 2)
        .map(w => w.meaning)
        .filter((meaning, index, arr) => arr.indexOf(meaning) === index) // 去重
        .slice(0, 20); // 取前20个作为候选
      
      const options = [correctAnswer];
      
      // 随机选择3个干扰项
      while (options.length < 4 && possibleDistractors.length > 0) {
        const randomIndex = Math.floor(Math.random() * possibleDistractors.length);
        options.push(possibleDistractors.splice(randomIndex, 1)[0]);
      }
      
      // 如果词汇数据库没有足够的干扰项，使用默认选项
      if (options.length < 4) {
        const defaultOptions = ['重要的', '困难的', '简单的', '特殊的', '普通的', '复杂的', '基础的', '高级的'];
        const fallbackOptions = defaultOptions.filter(opt => !options.includes(opt));
        while (options.length < 4 && fallbackOptions.length > 0) {
          const randomIndex = Math.floor(Math.random() * fallbackOptions.length);
          options.push(fallbackOptions.splice(randomIndex, 1)[0]);
        }
      }

      // 打乱选项顺序
      return this.shuffleArray(options);
      
    } catch (error) {
      console.error('生成选项失败，使用默认选项:', error);
      // 兜底：使用默认选项
      const commonOptions = ['重要的', '困难的', '简单的', '特殊的', '普通的', '复杂的', '基础的', '高级的'];
      const options = [correctAnswer];
      const otherOptions = commonOptions.filter(opt => opt !== correctAnswer);
      while (options.length < 4 && otherOptions.length > 0) {
        const randomIndex = Math.floor(Math.random() * otherOptions.length);
        options.push(otherOptions.splice(randomIndex, 1)[0]);
      }
      return this.shuffleArray(options);
    }
  },

  // 打乱数组
  shuffleArray(array) {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
  },

  // 清空生词本
  clearWords() {
    wx.showModal({
      title: '确认清空',
      content: '确定要清空所有生词记录吗？此操作不可恢复。',
      success: (res) => {
        if (res.confirm) {
          try {
            wx.removeStorageSync('wordBook');
            wx.removeStorageSync('mistakeBook'); // 兼容旧数据
            this.setData({
              words: [],
              isEmpty: true,
              unmasteredCount: 0
            });
            wx.showToast({
              title: '已清空生词本',
              icon: 'success'
            });
          } catch (error) {
            console.error('清空生词本失败:', error);
          }
        }
      }
    });
  },

  // 跳转到测试页面
  goToTest() {
    wx.navigateBack();
  },

  // 调试：添加测试生词数据
  addTestWords() {
    try {
      const testWords = {
        'apple': {
          word: 'apple',
          correctAnswer: '苹果',
          grade: 'grade3',
          gradeName: '三年级',
          errorCount: 3,
          firstErrorTime: Date.now() - 86400000 * 7, // 7天前
          lastErrorTime: Date.now() - 86400000, // 1天前
          errorHistory: [
            { selectedAnswer: '香蕉', timestamp: Date.now() - 86400000 * 7, level: 1 },
            { selectedAnswer: '橙子', timestamp: Date.now() - 86400000 * 3, level: 1 },
            { selectedAnswer: '葡萄', timestamp: Date.now() - 86400000, level: 1 }
          ],
          mastered: false
        },
        'book': {
          word: 'book',
          correctAnswer: '书',
          grade: 'grade3',
          gradeName: '三年级',
          errorCount: 2,
          firstErrorTime: Date.now() - 86400000 * 5,
          lastErrorTime: Date.now() - 86400000 * 2,
          errorHistory: [
            { selectedAnswer: '笔', timestamp: Date.now() - 86400000 * 5, level: 1 },
            { selectedAnswer: '纸', timestamp: Date.now() - 86400000 * 2, level: 1 }
          ],
          mastered: false
        }
      };

      wx.setStorageSync('wordBook', testWords);
      wx.showToast({
        title: '测试生词已添加',
        icon: 'success'
      });
      
      // 重新加载生词列表
      this.loadWords();
    } catch (error) {
      console.error('添加测试生词失败:', error);
      wx.showToast({
        title: '添加失败',
        icon: 'error'
      });
    }
  },

  // 播放单词发音
  playWordPronunciation(e) {
    const word = e.currentTarget.dataset.word;
    const phonetic = e.currentTarget.dataset.phonetic || '';
    
    if (!word) {
      wx.showToast({
        title: '暂无单词可播放',
        icon: 'none'
      });
      return;
    }

    // 如果有缓存，则允许立即播放；如果没有缓存且正在播放，则防抖
    if (!this.data.audioCache[word] && this.data.isPlaying) {
      console.log('正在播放中，忽略重复点击');
      return;
    }

    try {
      this.playWordWithTTS(word, phonetic);
    } catch (error) {
      console.error('播放发音失败:', error);
      this.showPronunciationGuide(word, phonetic);
    }
  },

  // 使用在线TTS服务播放单词
  playWordWithTTS(word, phonetic) {
    // 检查缓存中是否已有该单词的音频
    if (this.data.audioCache[word]) {
      this.playFromCache(word, phonetic);
      return;
    }

    wx.showLoading({
      title: '正在加载发音...'
    });

    // 创建音频上下文
    const audioContext = wx.createInnerAudioContext();
    
    // 使用有道词典的TTS服务
    const ttsUrl = `https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(word)}&type=1`;
    
    audioContext.src = ttsUrl;
    audioContext.autoplay = true;
    
    audioContext.onPlay(() => {
      wx.hideLoading();
      this.setData({ isPlaying: true });
      
      // 播放成功时立即缓存这个URL
      const cache = this.data.audioCache;
      cache[word] = ttsUrl;
      this.setData({ audioCache: cache });
    });
    
    audioContext.onEnded(() => {
      this.setData({ isPlaying: false });
      audioContext.destroy();
    });
    
    audioContext.onError((err) => {
      wx.hideLoading();
      console.error('音频播放失败:', err);
      this.setData({ isPlaying: false });
      audioContext.destroy();
      // 回退到发音指导
      this.showPronunciationGuide(word, phonetic);
    });

    audioContext.onStop(() => {
      this.setData({ isPlaying: false });
      audioContext.destroy();
    });
  },

  // 从缓存播放音频
  playFromCache(word, phonetic) {
    const cachedUrl = this.data.audioCache[word];
    
    if (!cachedUrl) {
      this.playWordWithTTS(word, phonetic);
      return;
    }
    
    const audioContext = wx.createInnerAudioContext();
    audioContext.src = cachedUrl;
    audioContext.autoplay = true;
    
    audioContext.onPlay(() => {
      this.setData({ isPlaying: true });
    });
    
    audioContext.onEnded(() => {
      this.setData({ isPlaying: false });
      audioContext.destroy();
    });
    
    audioContext.onError((err) => {
      console.error('缓存播放失败:', err);
      this.setData({ isPlaying: false });
      audioContext.destroy();
      
      // 缓存失效，重新从网络加载
      const cache = this.data.audioCache;
      delete cache[word];
      this.setData({ audioCache: cache });
      this.playWordWithTTS(word, phonetic);
    });

    audioContext.onStop(() => {
      this.setData({ isPlaying: false });
      audioContext.destroy();
    });
  },



  // 显示发音指导
  showPronunciationGuide(word, phonetic) {
    wx.showModal({
      title: '🔊 发音指导',
      content: `单词：${word}\n音标：${phonetic || '暂无'}\n\n由于网络原因无法播放，请根据音标练习发音`,
      confirmText: '知道了',
      showCancel: false
    });
  },



  // 分享功能
  onShareAppMessage() {
    return {
      title: `我的生词本有${this.data.words.length}个单词，一起来学习吧！`,
      path: '/pages/index/index'
    };
  }
});