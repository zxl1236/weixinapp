// pages/mistake/mistake.js
const AudioManager = require('../../utils/audioManager.js');

Page({
  data: {
    words: [], // 生词列表
    currentIndex: 0, // 当前生词索引
    showAnswer: false, // 是否显示答案
    retestMode: false,
    unmasteredCount: 0, // 未掌握生词数量
    isPlaying: false, // 播放状态
    isPaused: false, // 暂停状态
    touchStartX: 0,
    touchStartY: 0,
    swipeWordIndex: null,
    
    // 年级标签显示
    showGradeTags: true, // 是否显示年级标签
    isLongWord: false, // 单词是否超过7个字母
  },

  onLoad() {
    this.loadWords();
    this.setupAudioCallbacks();
  },

  onShow() {
    this.loadWords();
  },

  onUnload() {
    // 清理音频回调
    AudioManager.setCallbacks({});
  },

  // 设置音频播放回调
  setupAudioCallbacks() {
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
      }
    });
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
          wx.switchTab({
            url: '/pages/index/index'
          });
        }
      });
    } else {
      // 没有上一页，跳转到首页
      wx.switchTab({
      url: '/pages/index/index'
      });
    }
  },

  // 切换暂停状态
  togglePause() {
    this.setData({
      isPaused: !this.data.isPaused
    });
    
    // 这里可以添加暂停/恢复的具体逻辑
    // 比如暂停音频播放、暂停自动翻页等
    if (this.data.isPaused) {

    } else {

    }
  },

  // 加载生词数据
  loadWords() {
    try {
      // 从wordBook存储中读取生词数据
      const wordBook = wx.getStorageSync('wordBook') || {};
      
      // 将wordBook转换为生词数组格式，并过滤掉已掌握的单词
      const words = Object.values(wordBook)
        .filter(wordData => !wordData.mastered) // 过滤掉已掌握的单词
        .map(wordData => ({
          word: wordData.word,
          meaning: wordData.correctAnswer,
          pronunciation: wordData.pronunciation || '',
          gradeId: wordData.gradeId || '',
          gradeName: wordData.gradeName || '',
          masteryLevel: 1, // 未掌握为1
          studyCount: wordData.studyCount || 0,
          lastErrorTime: wordData.lastStudyTime || Date.now(),
          masteredTime: null
        }));
      
      if (words.length === 0) {
        wx.showModal({
          title: '暂无生词',
          content: '当前设备暂无生词，请先在本机完成几组练习。',
          confirmText: '去练习',
          cancelText: '知道了',
          success: (res) => {
            if (res.confirm) {
              // 跳转到水平测试页面选择年级
              wx.navigateTo({
                url: '/pages/gradeTest/gradeTest'
              });
            }
          }
        });
        return;
      }

      // 按最后错误时间排序，最新的在前
      const sortedWords = words.sort((a, b) => {
        if (!a.lastErrorTime && !b.lastErrorTime) return 0;
        if (!a.lastErrorTime) return 1;
        if (!b.lastErrorTime) return -1;
        return b.lastErrorTime - a.lastErrorTime;
      });
      
      const filteredWords = sortedWords;
      
      // 计算统计信息
      const stats = this.calculateWordStats(filteredWords);
      
      // 检查当前单词是否为长单词
      const firstWord = filteredWords[0];
      const isLongWord = firstWord && firstWord.word && firstWord.word.length > 7;

      this.setData({
        words: filteredWords,
        unmasteredCount: stats.unmasteredCount,
        currentIndex: 0,
        showAnswer: false,
        isLongWord: isLongWord
      });
      
    } catch (error) {
      console.error('加载生词失败:', error);
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      });
    }
  },

  // 计算生词统计信息
  calculateWordStats(words) {
    const totalCount = words.length;
    const masteredCount = words.filter(word => word.masteryLevel >= 3).length;
    const unmasteredCount = totalCount - masteredCount;
    
    return {
      totalCount,
      masteredCount,
      unmasteredCount
    };
  },

  // 获取当前生词
  getCurrentWord() {
    return this.data.words[this.data.currentIndex] || null;
  },

  // 显示/隐藏答案
  toggleAnswer() {
    this.setData({
      showAnswer: !this.data.showAnswer
    });
  },

  // 播放发音 - 快速响应版本
  playPronunciation(e) {
    let index = this.data.currentIndex;
    // 预留索引参数，方便未来支持列表多卡片
    if (e && e.currentTarget && typeof e.currentTarget.dataset.index !== 'undefined') {
      index = e.currentTarget.dataset.index;
    }
    const word = this.data.words[index] || this.getCurrentWord();
    if (!word) return;

    // 防止重复点击
    if (this.data.isPlaying) return;

    const wordId = word.id || word.wordId || word.word;
    const wordText = word.word;
    const gradeId = word.gradeId || '';
    
    // 立即播放，不等待异步操作
    AudioManager.playWord(wordId, {
      gradeId: gradeId,
      word: wordText
    });
  },

  // 标记为已掌握
  markAsMastered() {
    const word = this.getCurrentWord();
    if (!word) return;

    // 更新掌握状态
    word.masteryLevel = 3;
    word.masteredTime = Date.now();

    // 保存到本地存储
    this.saveWords();

    // 显示提示
    wx.showToast({
      title: '已标记为掌握',
      icon: 'success'
    });

    // 重新加载数据
    this.loadWords();
  },

  // 标记为未掌握
  markAsUnmastered() {
    const word = this.getCurrentWord();
    if (!word) return;

    // 更新掌握状态
    word.masteryLevel = 1;
    word.masteredTime = null;

    // 保存到本地存储
    this.saveWords();

    // 显示提示
    wx.showToast({
      title: '已标记为未掌握',
      icon: 'success'
    });

    // 重新加载数据
    this.loadWords();
  },

  // 下一个生词
  nextWord() {
    if (this.data.currentIndex >= this.data.words.length - 1) {
      return; // 按钮被禁用时直接返回
    }
    
    const nextIndex = this.data.currentIndex + 1;
    const nextWord = this.data.words[nextIndex];
    const isLongWord = nextWord && nextWord.word && nextWord.word.length > 7;
    
    this.setData({
      currentIndex: nextIndex,
      showAnswer: false,
      isLongWord: isLongWord
    });
  },

  // 上一个生词
  prevWord() {
    if (this.data.currentIndex <= 0) {
      return; // 按钮被禁用时直接返回
    }
    
    const prevIndex = this.data.currentIndex - 1;
    const prevWord = this.data.words[prevIndex];
    const isLongWord = prevWord && prevWord.word && prevWord.word.length > 7;
    
    this.setData({
      currentIndex: prevIndex,
      showAnswer: false,
      isLongWord: isLongWord
    });
  },

  // 重新测试
  startRetest() {
    this.setData({
      retestMode: true,
      currentIndex: 0,
      showAnswer: false
    });
  },

  // 退出重新测试
  exitRetest() {
    this.setData({
      retestMode: false
    });
    this.loadWords();
  },

  onWordTouchStart(e) {
    if (!e || !e.touches || !e.touches[0]) return;
    const touch = e.touches[0];
    this.setData({
      touchStartX: touch.clientX,
      touchStartY: touch.clientY,
      // 当前模式下一次只展示一张卡片，直接使用 currentIndex
      swipeWordIndex: this.data.currentIndex
    });
  },

  onWordTouchEnd(e) {
    if (!e || !e.changedTouches || !e.changedTouches[0]) return;
    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - this.data.touchStartX;
    const deltaY = touch.clientY - this.data.touchStartY;
    const index = this.data.swipeWordIndex != null ? this.data.swipeWordIndex : this.data.currentIndex;

    this.setData({ swipeWordIndex: null });

    if (index === null || typeof index === 'undefined') return;

    if (deltaX < -60 && Math.abs(deltaY) < 40) {
      this.markWordAsMasteredAndRemove(index);
    }
  },

  markWordAsMasteredAndRemove(index) {
    const words = [...this.data.words];
    const word = words[index];
    if (!word) return;

    word.masteryLevel = 3;
    word.masteredTime = Date.now();

    try {
      const wordBook = wx.getStorageSync('wordBook') || {};
      if (wordBook[word.word]) {
        wordBook[word.word].mastered = true;
        wordBook[word.word].masteredTime = word.masteredTime;
      }
      wx.setStorageSync('wordBook', wordBook);
    } catch (error) {
      console.error('更新生词本失败:', error);
    }

    words.splice(index, 1);
    const stats = this.calculateWordStats(words);

    this.setData({
      words,
      unmasteredCount: stats.unmasteredCount,
      currentIndex: 0,
      showAnswer: words.length > 0 ? this.data.showAnswer : false
    });

    wx.showToast({
      title: '已掌握，已移除',
      icon: 'success'
    });
  },

  // 保存生词数据
  saveWords() {
    try {
      // 同时更新wordBook存储以保持同步
      const wordBook = wx.getStorageSync('wordBook') || {};
      
      // 更新wordBook中的掌握状态
      this.data.words.forEach(word => {
        if (wordBook[word.word]) {
          wordBook[word.word].mastered = word.masteryLevel >= 3;
          if (word.masteryLevel >= 3) {
            wordBook[word.word].masteredTime = word.masteredTime;
          }
        }
      });
      
      // 保存更新后的wordBook
      wx.setStorageSync('wordBook', wordBook);
      
      // 同时保存到mistakeWords以保持向后兼容
      wx.setStorageSync('mistakeWords', this.data.words);
    } catch (error) {
      console.error('保存生词失败:', error);
    }
  },

  // =================== 年级标签显示 ===================
  
  // 获取生词的年级标签
  getWordGradeTag(word) {
    if (!word.gradeId) return '';
    
    const gradeMap = {
      'grade3_1': '三上', 'grade3_2': '三下',
      'grade4_1': '四上', 'grade4_2': '四下',
      'grade5_1': '五上', 'grade5_2': '五下',
      'grade6_1': '六上', 'grade6_2': '六下',
      'grade7_1': '初一上', 'grade7_2': '初一下',
      'grade8_1': '初二上', 'grade8_2': '初二下',
      'grade9_1': '初三上', 'grade9_2': '初三下'
    };
    
    return gradeMap[word.gradeId] || '';
  },
});