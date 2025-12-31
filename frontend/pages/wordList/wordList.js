// 单词列表页面
const cdnWordLoader = require('../../utils/cdnWordLoader.js');
const { getApiUrl } = require('../../utils/apiConfig.js');
const AudioManager = require('../../utils/audioManager.js');

Page({
  data: {
    gradeId: '',
    gradeName: '',
    allWords: [],        // 所有单词
    filteredWords: [],  // 过滤后的单词
    searchKeyword: '',   // 搜索关键词
    sortType: 'serial',  // 排序类型：serial(序号), word(单词), meaning(含义)
    loading: true,
    totalCount: 0,
    showingCount: 0,
    playingWordId: null  // 当前正在播放的单词ID
  },

  onLoad(options) {
    const { grade, gradeName } = options;
    
    if (!grade) {
      wx.showModal({
        title: '参数错误',
        content: '缺少年级参数',
        showCancel: false,
        success: () => {
          wx.navigateBack();
        }
      });
      return;
    }

    this.setData({
      gradeId: grade,
      gradeName: decodeURIComponent(gradeName || '')
    });

    // 设置导航栏标题
    if (this.data.gradeName) {
      wx.setNavigationBarTitle({
        title: `${this.data.gradeName} - 单词列表`
      });
    }

    this.loadWords();
  },

  // 加载单词数据
  async loadWords() {
    try {
      wx.showLoading({
        title: '加载单词中...'
      });

      // 从 cdn-data 加载年级词汇
      let allWords = await cdnWordLoader.getGradeWords(this.data.gradeId);
      
      if (!allWords || !Array.isArray(allWords) || allWords.length === 0) {
        wx.hideLoading();
        wx.showModal({
          title: '加载失败',
          content: '无法加载该年级的词汇数据',
          showCancel: false,
          success: () => {
            wx.navigateBack();
          }
        });
        return;
      }

      // 去重处理：根据 serialNumber 去重
      allWords = this.removeDuplicateWords(allWords);

      // 按序号排序
      allWords.sort((a, b) => {
        const serialA = parseInt(a.serialNumber || 0);
        const serialB = parseInt(b.serialNumber || 0);
        return serialA - serialB;
      });

      this.setData({
        allWords: allWords,
        filteredWords: allWords,
        totalCount: allWords.length,
        showingCount: allWords.length,
        loading: false
      });

      wx.hideLoading();
    } catch (error) {
      console.error('❌ 加载词汇失败:', error);
      wx.hideLoading();
      wx.showModal({
        title: '加载失败',
        content: '词汇数据加载失败，请稍后重试',
        showCancel: false,
        success: () => {
          wx.navigateBack();
        }
      });
    }
  },

  // 去重函数：根据 serialNumber 去重
  removeDuplicateWords(words) {
    const seen = new Map();
    return words.filter(word => {
      const serialNumber = word.serialNumber || word.id || word.word;
      if (seen.has(serialNumber)) {
        return false;
      }
      seen.set(serialNumber, true);
      return true;
    });
  },

  // 搜索输入
  onSearchInput(e) {
    const keyword = e.detail.value.trim();
    this.setData({
      searchKeyword: keyword
    });
    this.filterWords();
  },

  // 过滤单词
  filterWords() {
    const { allWords, searchKeyword, sortType } = this.data;
    let filtered = [...allWords];

    // 搜索过滤
    if (searchKeyword) {
      const keyword = searchKeyword.toLowerCase();
      filtered = filtered.filter(word => {
        const wordText = (word.word || '').toLowerCase();
        const meaning = (word.meaning || '').toLowerCase();
        return wordText.includes(keyword) || meaning.includes(keyword);
      });
    }

    // 排序
    filtered = this.sortWords(filtered, sortType);

    this.setData({
      filteredWords: filtered,
      showingCount: filtered.length
    });
  },

  // 排序单词
  sortWords(words, sortType) {
    const sorted = [...words];
    
    switch (sortType) {
      case 'serial':
        sorted.sort((a, b) => {
          const serialA = parseInt(a.serialNumber || 0);
          const serialB = parseInt(b.serialNumber || 0);
          return serialA - serialB;
        });
        break;
      case 'word':
        sorted.sort((a, b) => {
          const wordA = (a.word || '').toLowerCase();
          const wordB = (b.word || '').toLowerCase();
          return wordA.localeCompare(wordB);
        });
        break;
      case 'meaning':
        sorted.sort((a, b) => {
          const meaningA = (a.meaning || '').toLowerCase();
          const meaningB = (b.meaning || '').toLowerCase();
          return meaningA.localeCompare(meaningB);
        });
        break;
    }
    
    return sorted;
  },

  // 切换排序方式
  changeSortType(e) {
    const sortType = e.currentTarget.dataset.type;
    this.setData({
      sortType: sortType
    });
    this.filterWords();
  },

  // 导出PDF
  async exportToPDF() {
    const { gradeId, gradeName } = this.data;
    
    if (!gradeId) {
      wx.showToast({
        title: '年级信息错误',
        icon: 'error'
      });
      return;
    }

    wx.showLoading({
      title: '生成PDF中...'
    });

    try {
      const apiUrl = getApiUrl(`/api/export/words-pdf?gradeId=${encodeURIComponent(gradeId)}`);
      
      // 下载PDF文件
      const downloadTask = wx.downloadFile({
        url: apiUrl,
        timeout: 60000, // 60秒超时
        success: (res) => {
          wx.hideLoading();

          if (res.statusCode === 200) {
            // 打开PDF文档
            wx.openDocument({
              filePath: res.tempFilePath,
              fileType: 'pdf',
              success: () => {
                wx.showToast({
                  title: 'PDF已生成',
                  icon: 'success'
                });
              },
              fail: (err) => {
                console.error('打开PDF失败:', err);
                wx.showModal({
                  title: '打开失败',
                  content: 'PDF已生成，但无法自动打开。请手动在文件管理器中查看下载的文件。',
                  showCancel: false,
                  confirmText: '知道了'
                });
              }
            });
          } else {
            console.error('PDF生成失败，HTTP状态码:', res.statusCode);

            let errorMessage = 'PDF生成失败';
            if (res.statusCode === 400) {
              errorMessage = '请求参数错误，请刷新页面重试';
            } else if (res.statusCode === 404) {
              errorMessage = '未找到单词数据，请稍后重试';
            } else if (res.statusCode === 500) {
              errorMessage = '服务器内部错误，请稍后重试';
            } else if (res.statusCode >= 500) {
              errorMessage = '服务器错误，请稍后重试';
            }

            wx.showModal({
              title: '生成失败',
              content: errorMessage,
              showCancel: false,
              confirmText: '确定'
            });
          }
        },
        fail: (err) => {
          wx.hideLoading();
          console.error('下载PDF失败:', err);

          let errorMessage = '网络连接失败，请检查网络后重试';
          if (err.errMsg && err.errMsg.includes('timeout')) {
            errorMessage = '请求超时，请检查网络连接后重试';
          } else if (err.errMsg && err.errMsg.includes('fail')) {
            errorMessage = '网络请求失败，请稍后重试';
          }

          wx.showModal({
            title: '导出失败',
            content: errorMessage,
            showCancel: false,
            confirmText: '确定'
          });
        }
      });

      // 监听下载进度
      downloadTask.onProgressUpdate((res) => {
        if (res.progress < 100) {
          wx.showLoading({
            title: `生成中 ${res.progress}%`
          });
        }
      });
    } catch (error) {
      wx.hideLoading();
      console.error('导出PDF异常:', error);
      wx.showToast({
        title: '导出失败',
        icon: 'error'
      });
    }
  },

  // 播放单词发音
  playWordPronunciation(e) {
    const word = e.currentTarget.dataset.word;
    const gradeId = e.currentTarget.dataset.grade || this.data.gradeId;
    
    if (!word) return;
    
    // 防止重复点击
    if (this.data.playingWordId === word) return;
    
    // 设置播放状态
    this.setData({
      playingWordId: word
    });
    
    // 设置音频回调
    AudioManager.setCallbacks({
      onEnded: () => {
        this.setData({
          playingWordId: null
        });
      },
      onError: () => {
        this.setData({
          playingWordId: null
        });
      }
    });
    
    // 播放音频
    AudioManager.playWord(word, {
      gradeId: gradeId,
      word: word
    });
  },

  // 返回上一页
  goBack() {
    wx.navigateBack();
  }
});

