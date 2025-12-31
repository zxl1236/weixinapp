// 学习进度页面
const { buttonDebouncer } = require('../../utils/debounce.js');
const { getGradeWords } = require('../../utils/gradeWordDatabase.js');
const { getGradeProgress } = require('../../utils/progressSync.js');

Page({
  data: {
    gradeId: '',
    gradeName: '',
    stats: {
      totalWords: 0,
      masteredCount: 0,
      withErrorsCount: 0,
      learningCount: 0,
      unlearnedCount: 0,
      masteryRate: 0
    },
    showWordList: false,
    currentListTitle: '',
    currentWordList: [],
    suggestions: []
  },

  onLoad(options) {
    // 重置防抖状态
    buttonDebouncer.resetAll();
    
    if (options.gradeId) {
      // 对URL编码的gradeName进行解码
      const decodedGradeName = options.gradeName ? decodeURIComponent(options.gradeName) : options.gradeId;
      
      this.setData({
        gradeId: options.gradeId,
        gradeName: decodedGradeName
      });
      
      this.loadProgressData();
    } else {
      wx.showToast({
        title: '参数错误',
        icon: 'error'
      });
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
    }
  },

  onUnload() {
    // 页面卸载时清理防抖状态
    buttonDebouncer.resetAll();
  },

  onShow() {
    // 每次显示页面时刷新数据
    if (this.data.gradeId) {
      this.loadProgressData();
    }
  },

  // 下拉刷新
  onPullDownRefresh() {
    if (this.data.gradeId) {
      this.loadProgressData();
    }
    // 停止下拉刷新动画
    setTimeout(() => {
      wx.stopPullDownRefresh();
    }, 500);
  },

  // 加载进度数据
  loadProgressData() {
    try {
      const { gradeId } = this.data;
      const learningDataSync = require('../../utils/learningDataSync.js');
      
      // 使用统一的学习数据同步管理器获取统计
      const learningProgress = learningDataSync.getGradeLearningProgress(gradeId);
      
      // 计算掌握率（使用学习进度中的总词汇数）
      const masteryRate = learningProgress.total > 0 ? Math.round((learningProgress.mastered / learningProgress.total) * 100) : 0;
      const stats = {
        totalWords: learningProgress.total,
        masteredCount: learningProgress.mastered,
        withErrorsCount: 0, // 新统计中暂时不区分错误单词
        learningCount: learningProgress.learning + learningProgress.familiar,
        unlearnedCount: learningProgress.new,
        masteryRate: masteryRate
      };
      
      this.setData({
        stats: stats,
        suggestions: this.generateSuggestions(stats)
      });
      
    } catch (error) {
      console.error('加载进度数据失败:', error);
      wx.showToast({
        title: '数据加载失败',
        icon: 'error'
      });
    }
  },

  // 生成学习建议
  generateSuggestions(stats) {
    const suggestions = [];
    
    if (stats.masteryRate < 30) {
      suggestions.push({
        icon: '🚀',
        text: '建议先学习基础词汇，打好词汇基础'
      });
    } else if (stats.masteryRate < 60) {
      suggestions.push({
        icon: '📈',
        text: '继续努力！可以加强复习已学单词'
      });
    } else if (stats.masteryRate < 80) {
      suggestions.push({
        icon: '🎯',
        text: '很棒！继续保持学习节奏'
      });
    } else {
      suggestions.push({
        icon: '🏆',
        text: '优秀！可以挑战更高难度的词汇'
      });
    }
    
    if (stats.withErrorsCount > 0) {
      suggestions.push({
        icon: '🔄',
        text: `建议复习 ${stats.withErrorsCount} 个易错单词`
      });
    }
    
    if (stats.unlearnedCount > 0) {
      suggestions.push({
        icon: '📚',
        text: `还有 ${stats.unlearnedCount} 个新单词待学习`
      });
    }
    
    return suggestions;
  },

  // 显示单词列表
  showWordList(e) {
    const type = e.currentTarget.dataset.type;
    
    // 添加防抖处理
    buttonDebouncer.handleClick(`show-word-list-${type}`, () => {
      this.loadWordListByType(type);
    }, 300);
  },

  // 获取单词的唯一标识符（基于 serialNumber）
  getWordId(word) {
    if (!word) return null;
    if (word.serialNumber !== undefined && word.serialNumber !== null) {
      return String(word.serialNumber);
    }
    if (word.id !== undefined && word.id !== null) {
      return String(word.id);
    }
    return word.word || null;
  },

  // 根据类型加载单词列表
  async loadWordListByType(type) {
    try {
      const { gradeId } = this.data;
      const learningDataSync = require('../../utils/learningDataSync.js');
      
      // 获取该年级的所有单词
      const allWords = await getGradeWords(gradeId, 10000, 'all') || [];
      
      // 获取已掌握单词的 serialNumber 列表（从 learning.js 的存储中）
      const masteredKey = `MASTERED_WORDS_${gradeId}`;
      const masteredWordIds = new Set(wx.getStorageSync(masteredKey) || []);
      
      // 获取进度数据（新旧系统合并）
      const oldProgressData = getGradeProgress(gradeId);
      const newProgressData = learningDataSync.getGradeWordsByStatus(gradeId);
      
      // 为每个单词确定唯一状态（基于 serialNumber）
      // 状态优先级：已掌握 > 学习中 > 未学习
      const wordStatusMap = new Map(); // wordId -> { word, status }
      
      // 初始化所有单词为未学习状态
      allWords.forEach(word => {
        const wordId = this.getWordId(word);
        if (wordId) {
          wordStatusMap.set(wordId, {
            word: word,
            status: 'unlearned'
          });
        }
      });
      
      // 标记已掌握的单词（优先级最高）
      allWords.forEach(word => {
        const wordId = this.getWordId(word);
        if (!wordId) return;
        
        // 检查是否在已掌握列表中
        if (masteredWordIds.has(wordId)) {
          const entry = wordStatusMap.get(wordId);
          if (entry) {
            entry.status = 'mastered';
          }
        }
        
        // 检查旧系统
        const oldWordProgress = oldProgressData[word.word];
        if (oldWordProgress && oldWordProgress.mastered) {
          const entry = wordStatusMap.get(wordId);
          if (entry) {
            entry.status = 'mastered';
          }
        }
        
        // 检查新系统
        const newMasteredWord = newProgressData.mastered.find(w => {
          const wId = w.serialNumber ? String(w.serialNumber) : w.word;
          return wId === wordId;
        });
        if (newMasteredWord) {
          const entry = wordStatusMap.get(wordId);
          if (entry) {
            entry.status = 'mastered';
          }
        }
      });
      
      // 标记学习中的单词（如果还未标记为已掌握）
      allWords.forEach(word => {
        const wordId = this.getWordId(word);
        if (!wordId) return;
        
        const entry = wordStatusMap.get(wordId);
        if (!entry || entry.status !== 'unlearned') return; // 已掌握的不再标记为学习中
        
        // 检查旧系统
        const oldWordProgress = oldProgressData[word.word];
        if (oldWordProgress && oldWordProgress.attempts > 0 && !oldWordProgress.mastered) {
          entry.status = 'learning';
        }
        
        // 检查新系统
        const newLearningWord = newProgressData.learning.find(w => {
          const wId = w.serialNumber ? String(w.serialNumber) : w.word;
          return wId === wordId;
        });
        const newFamiliarWord = newProgressData.familiar.find(w => {
          const wId = w.serialNumber ? String(w.serialNumber) : w.word;
          return wId === wordId;
        });
        if (newLearningWord || newFamiliarWord) {
          entry.status = 'learning';
        }
      });
      
      // 根据类型筛选单词
      let filteredWords = [];
      let title = '';
      
      switch (type) {
        case 'mastered':
          title = '已掌握单词';
          filteredWords = Array.from(wordStatusMap.values())
            .filter(entry => entry.status === 'mastered')
            .map(entry => entry.word);
          break;
          
        case 'withErrors':
          title = '需要复习的单词';
          // 错误单词：在新系统中标记为 withErrors 的单词
          const errorWordIds = new Set();
          newProgressData.withErrors.forEach(w => {
            const wId = w.serialNumber ? String(w.serialNumber) : w.word;
            errorWordIds.add(wId);
          });
          
          filteredWords = Array.from(wordStatusMap.values())
            .filter(entry => {
              const wordId = this.getWordId(entry.word);
              return errorWordIds.has(wordId);
            })
            .map(entry => entry.word);
          break;
          
        case 'learning':
          title = '学习中的单词';
          filteredWords = Array.from(wordStatusMap.values())
            .filter(entry => entry.status === 'learning')
            .map(entry => entry.word);
          break;
          
        case 'unlearned':
          title = '未学习单词';
          filteredWords = Array.from(wordStatusMap.values())
            .filter(entry => entry.status === 'unlearned')
            .map(entry => entry.word);
          break;
          
        default:
          title = '全部单词';
          filteredWords = allWords;
      }
      
      // 为每个单词添加状态信息
      const wordsWithStatus = filteredWords.map(word => {
        const wordId = this.getWordId(word);
        const entry = wordStatusMap.get(wordId);
        const status = entry ? entry.status : 'unlearned';
        
        return {
          ...word,
          status: status,
          // 确保有正确的显示字段
          meaning: word.meaning || word.chinese || '暂无释义',
          word: word.word || '',
          phonetic: word.phonetic || ''
        };
      });
      
      // 按单词字母顺序排序，确保显示顺序一致
      wordsWithStatus.sort((a, b) => {
        const wordA = (a.word || '').toLowerCase();
        const wordB = (b.word || '').toLowerCase();
        return wordA.localeCompare(wordB);
      });
      
      console.log('📊 加载单词列表:', {
        type,
        title,
        count: wordsWithStatus.length,
        总单词数: allWords.length,
        前5个单词: wordsWithStatus.slice(0, 5).map(w => ({ word: w.word, meaning: w.meaning, serialNumber: w.serialNumber }))
      });
      
      this.setData({
        showWordList: true,
        currentListTitle: title,
        currentWordList: wordsWithStatus
      });
      
    } catch (error) {
      console.error('加载单词列表失败:', error);
      wx.showToast({
        title: '加载失败',
        icon: 'error'
      });
    }
  },

  // 隐藏单词列表
  hideWordList() {
    buttonDebouncer.handleClick('hide-word-list', () => {
      this.setData({
        showWordList: false,
        currentListTitle: '',
        currentWordList: []
      });
    }, 200);
  },

  // 阻止冒泡
  stopPropagation() {
    // 阻止点击模态框内容时关闭弹窗
  },

  // 返回上一页
  goBack() {
    buttonDebouncer.handleClick('go-back', () => {
      wx.navigateBack();
    }, 300);
  },

  // 开始学习新单词
  startLearning() {
    buttonDebouncer.handleClick('start-learning', () => {
      const { gradeId, gradeName } = this.data;
      wx.navigateTo({
        url: `/pages/learning/learning?grade=${gradeId}&gradeName=${encodeURIComponent(gradeName)}&quantity=20`
      });
    }, 500);
  },

  // 复习生词
  reviewWords() {
    buttonDebouncer.handleClick('review-words', () => {
      const { gradeId, gradeName } = this.data;
      wx.navigateTo({
        url: `/pages/mistake/mistake?grade=${gradeId}&gradeName=${encodeURIComponent(gradeName)}`
      });
    }, 500);
  },

  // 练习所有单词
  practiceAll() {
    buttonDebouncer.handleClick('practice-all', () => {
      const { gradeId, gradeName } = this.data;
      wx.navigateTo({
        url: `/pages/test/test?mode=training&grade=${gradeId}&gradeName=${encodeURIComponent(gradeName)}&count=30`
      });
    }, 500);
  },

  // 分享功能
  onShareAppMessage() {
    return {
      title: `我在${this.data.gradeName}的英语词汇掌握率达到了${this.data.stats.masteryRate}%！`,
      path: '/pages/index/index'
    };
  }
});