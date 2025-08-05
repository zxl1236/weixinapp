const { calculateVocabularyLevel } = require('../../utils/wordDatabase.js');

Page({
  data: {
    result: {},
    levelInfo: {},
    wrongCount: 0,
    mistakes: [],
    suggestions: [],
    avgTimePerQuestion: '',
    showComparison: false,
    comparisonData: null,
    improvement: 0
  },

  onLoad(options) {
    try {
      const result = JSON.parse(decodeURIComponent(options.result));
      this.processTestResult(result);
    } catch (error) {
      console.error('解析结果数据失败:', error);
      wx.showToast({
        title: '数据加载失败',
        icon: 'error'
      });
      setTimeout(() => {
        wx.navigateBack();
      }, 2000);
    }
  },

  // 处理测试结果
  processTestResult(result) {
    const levelInfo = calculateVocabularyLevel(result.score, result.total);
    const wrongCount = result.total - result.score;
    const mistakes = result.answers.filter(answer => !answer.isCorrect);
    const avgTime = Math.round(result.duration / result.total);
    
    // 生成学习建议
    const suggestions = this.generateSuggestions(result.percentage, mistakes);
    
    // 获取历史对比数据
    const comparisonData = this.getComparisonData();
    
    this.setData({
      result,
      levelInfo,
      wrongCount,
      mistakes,
      suggestions,
      avgTimePerQuestion: `${avgTime}秒`,
      showComparison: !!comparisonData,
      comparisonData,
      improvement: comparisonData ? result.percentage - comparisonData.percentage : 0
    });
  },

  // 生成学习建议
  generateSuggestions(percentage, mistakes) {
    const suggestions = [];
    
    if (percentage >= 90) {
      suggestions.push({
        icon: '🎉',
        text: '恭喜！您的词汇量非常优秀，建议继续挑战更高难度的英语材料。'
      });
      suggestions.push({
        icon: '📚',
        text: '可以开始阅读英文原版书籍或学术文章来进一步提升。'
      });
    } else if (percentage >= 70) {
      suggestions.push({
        icon: '👍',
        text: '您有良好的词汇基础，建议通过阅读英文文章来巩固和扩展。'
      });
      suggestions.push({
        icon: '📝',
        text: '可以尝试英文写作练习，将词汇运用到实际表达中。'
      });
    } else if (percentage >= 50) {
      suggestions.push({
        icon: '📖',
        text: '建议每天背诵20-30个新单词，并通过例句加深理解。'
      });
      suggestions.push({
        icon: '🎯',
        text: '重点关注常用词汇，优先掌握高频单词的用法。'
      });
    } else {
      suggestions.push({
        icon: '💪',
        text: '建议从基础词汇开始，每天坚持学习15-20个单词。'
      });
      suggestions.push({
        icon: '🔄',
        text: '多做重复练习，通过多种方式接触同一个单词。'
      });
    }

    // 根据错题类型给出针对性建议
    if (mistakes.length > 0) {
      const highLevelMistakes = mistakes.filter(m => m.question.level >= 7);
      if (highLevelMistakes.length > 0) {
        suggestions.push({
          icon: '🎓',
          text: '注意学习词汇的多种含义和用法，特别是在不同语境中的含义。'
        });
      }
    }

    return suggestions;
  },

  // 获取对比数据
  getComparisonData() {
    try {
      const history = wx.getStorageSync('testHistory') || [];
      if (history.length >= 2) {
        // 获取倒数第二次测试结果
        return {
          percentage: Math.round((history[history.length - 2].score / history[history.length - 2].total) * 100)
        };
      }
    } catch (error) {
      console.error('获取历史数据失败:', error);
    }
    return null;
  },

  // 格式化时间
  formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    
    if (minutes > 0) {
      return `${minutes}分${remainingSeconds}秒`;
    }
    return `${seconds}秒`;
  },

  // 重新测试
  retakeTest() {
    wx.showModal({
      title: '重新测试',
      content: '确定要重新开始测试吗？',
      success: (res) => {
        if (res.confirm) {
          wx.redirectTo({
            url: `/pages/test/test?count=${this.data.result.total}`
          });
        }
      }
    });
  },

  // 分享结果
  shareResult() {
    // 构建分享文案
    const shareText = `我在英文词汇量测试中获得了${this.data.result.score}/${this.data.result.total}分(${this.data.result.percentage}%)，达到${this.data.levelInfo.level}水平！`;
    
    // 复制到剪贴板
    wx.setClipboardData({
      data: shareText,
      success: () => {
        wx.showToast({
          title: '结果已复制',
          icon: 'success'
        });
      }
    });
  },

  // 返回首页
  backToHome() {
    wx.reLaunch({
      url: '/pages/index/index'
    });
  },

  // 分享功能
  onShareAppMessage() {
    const levelInfo = this.data.levelInfo;
    return {
      title: `我的英语词汇量测试结果：${this.data.result.percentage}% - ${levelInfo.level}`,
      path: '/pages/index/index',
      imageUrl: '' // 可以添加结果截图
    };
  },

  // 分享到朋友圈
  onShareTimeline() {
    const levelInfo = this.data.levelInfo;
    return {
      title: `英语词汇量测试结果：${this.data.result.percentage}% - ${levelInfo.level}`,
      imageUrl: '' // 可以添加结果截图
    };
  }
});