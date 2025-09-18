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

  // 加载进度数据
  loadProgressData() {
    try {
      const { gradeId } = this.data;
      const { learningDataSync } = require('../../utils/learningDataSync.js');
      const { getGradeWordCount } = require('../../utils/gradeWordDatabase.js');
      
      // 使用统一的学习数据同步管理器获取统计
      const learningProgress = learningDataSync.getGradeLearningProgress(gradeId);
      
      // 使用实际的词汇总数
      const actualWordCount = getGradeWordCount(gradeId);
      
      // 计算掌握率
      const masteryRate = actualWordCount > 0 ? Math.round((learningProgress.mastered / actualWordCount) * 100) : 0;
      
      console.log(`📊 ${gradeId} 进度数据 - 总词汇:${actualWordCount}, 已掌握:${learningProgress.mastered}, 掌握率:${masteryRate}%`);
      
      const stats = {
        totalWords: actualWordCount,
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

  // 根据类型加载单词列表
  loadWordListByType(type) {
    try {
      const { gradeId } = this.data;
      const { learningDataSync } = require('../../utils/learningDataSync.js');
      
      // 获取该年级的所有单词
      const allWords = getGradeWords(gradeId, 10000, 'all') || [];
      
      // 获取进度数据（新旧系统合并）
      const oldProgressData = getGradeProgress(gradeId);
      const newProgressData = learningDataSync.getGradeWordsByStatus(gradeId);
      
      let filteredWords = [];
      let title = '';
      
      switch (type) {
        case 'mastered':
          title = '已掌握单词';
          // 合并新旧系统的已掌握单词
          const masteredWordsFromOld = allWords.filter(word => {
            const wordProgress = oldProgressData[word.word];
            return wordProgress && wordProgress.mastered;
          });
          const masteredWordsFromNew = newProgressData.mastered.map(wordData => {
            // 尝试从allWords中找到完整的单词信息
            const fullWordInfo = allWords.find(w => w.word === wordData.word);
            return fullWordInfo || {
              word: wordData.word,
              meaning: wordData.meaning || '暂无释义'
            };
          });
          
          // 去重合并
          const masteredWordsMap = new Map();
          masteredWordsFromOld.forEach(word => masteredWordsMap.set(word.word, word));
          masteredWordsFromNew.forEach(word => {
            if (!masteredWordsMap.has(word.word)) {
              masteredWordsMap.set(word.word, word);
            }
          });
          filteredWords = Array.from(masteredWordsMap.values());
          console.log(`📊 已掌握单词统计 - 旧系统:${masteredWordsFromOld.length}, 新系统:${masteredWordsFromNew.length}, 合并后:${filteredWords.length}`);
          break;
          
        case 'withErrors':
          title = '需要复习的单词';
          // 合并新旧系统的错误单词
          const errorWordsFromOld = allWords.filter(word => {
            const wordProgress = oldProgressData[word.word];
            return wordProgress && wordProgress.errors && wordProgress.errors.length > 0;
          });
          const errorWordsFromNew = newProgressData.withErrors.map(wordData => {
            const fullWordInfo = allWords.find(w => w.word === wordData.word);
            return fullWordInfo || {
              word: wordData.word,
              meaning: wordData.meaning || '暂无释义'
            };
          });
          
          const errorWordsMap = new Map();
          errorWordsFromOld.forEach(word => errorWordsMap.set(word.word, word));
          errorWordsFromNew.forEach(word => {
            if (!errorWordsMap.has(word.word)) {
              errorWordsMap.set(word.word, word);
            }
          });
          filteredWords = Array.from(errorWordsMap.values());
          break;
          
        case 'learning':
          title = '学习中的单词';
          // 合并新旧系统的学习中单词
          const learningWordsFromOld = allWords.filter(word => {
            const wordProgress = oldProgressData[word.word];
            return wordProgress && wordProgress.attempts > 0 && !wordProgress.mastered;
          });
          const learningWordsFromNew = [...newProgressData.learning, ...newProgressData.familiar].map(wordData => {
            const fullWordInfo = allWords.find(w => w.word === wordData.word);
            return fullWordInfo || {
              word: wordData.word,
              meaning: wordData.meaning || '暂无释义'
            };
          });
          
          const learningWordsMap = new Map();
          learningWordsFromOld.forEach(word => learningWordsMap.set(word.word, word));
          learningWordsFromNew.forEach(word => {
            if (!learningWordsMap.has(word.word)) {
              learningWordsMap.set(word.word, word);
            }
          });
          filteredWords = Array.from(learningWordsMap.values());
          break;
          
        case 'unlearned':
          title = '未学习单词';
          // 未学习的单词从全部单词中排除已有进度的
          const learnedWordsSet = new Set();
          Object.keys(oldProgressData).forEach(word => learnedWordsSet.add(word));
          Object.values(newProgressData).flat().forEach(wordData => {
            if (Array.isArray(wordData)) {
              wordData.forEach(w => learnedWordsSet.add(w.word));
            } else if (wordData && wordData.word) {
              learnedWordsSet.add(wordData.word);
            }
          });
          
          filteredWords = allWords.filter(word => !learnedWordsSet.has(word.word));
          break;
          
        default:
          title = '全部单词';
          filteredWords = allWords;
      }
      
      // 为每个单词添加状态信息
      const wordsWithStatus = filteredWords.map(word => {
        // 检查新旧系统的进度数据
        const oldWordProgress = oldProgressData[word.word];
        const newWordData = newProgressData.mastered.find(w => w.word === word.word) ||
                           newProgressData.learning.find(w => w.word === word.word) ||
                           newProgressData.familiar.find(w => w.word === word.word) ||
                           newProgressData.withErrors.find(w => w.word === word.word);
        
        let status = 'unlearned';
        
        // 优先使用新系统的状态判断
        if (newWordData) {
          if (newProgressData.mastered.find(w => w.word === word.word)) {
            status = 'mastered';
          } else if (newProgressData.withErrors.find(w => w.word === word.word)) {
            status = 'withErrors';
          } else if (newProgressData.learning.find(w => w.word === word.word) || 
                     newProgressData.familiar.find(w => w.word === word.word)) {
            status = 'learning';
          }
        } else if (oldWordProgress) {
          // 使用旧系统的状态判断
          if (oldWordProgress.mastered) {
            status = 'mastered';
          } else if (oldWordProgress.errors && oldWordProgress.errors.length > 0) {
            status = 'withErrors';
          } else if (oldWordProgress.attempts > 0) {
            status = 'learning';
          }
        }
        
        return {
          ...word,
          status: status
        };
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