// 引入分级数据库的词汇量计算函数
const { calculateVocabularyRange, getTestStageByGrade } = require('../../utils/gradeWordDatabase.js');

// 内联词汇水平计算函数（兼容旧版本）
function calculateVocabularyLevel(score, total, gradeId = null) {
  const percentage = (score / total) * 100;
  
  // 如果有年级信息，使用新的分级计算
  if (gradeId) {
    const testStage = getTestStageByGrade(gradeId);
    return calculateVocabularyRange(score, total, testStage);
  }
  
  // 原有的通用计算逻辑（兼容旧数据）
  if (percentage >= 90) {
    return { level: '优秀', range: '90-100%', description: '您的词汇量非常优秀！', color: '#4CAF50' };
  } else if (percentage >= 80) {
    return { level: '良好', range: '80-89%', description: '您的词汇量良好，继续保持！', color: '#8BC34A' };
  } else if (percentage >= 70) {
    return { level: '中等', range: '70-79%', description: '您的词汇量中等，还有提升空间。', color: '#FFC107' };
  } else if (percentage >= 60) {
    return { level: '及格', range: '60-69%', description: '您的词汇量刚好及格，需要加强学习。', color: '#FF9800' };
  } else {
    return { level: '待提高', range: '0-59%', description: '您的词汇量需要大幅提升，建议系统学习。', color: '#F44336' };
  }
}

Page({
  data: {
    result: {},
    levelInfo: {},
    wrongCount: 0,
    mistakes: [],
    correctAnswers: [],
    suggestions: [],
    avgTimePerQuestion: '',
    showComparison: false,
    comparisonData: null,
    improvement: 0,
    showCorrectAnswers: false,  // 是否显示正确答案
    showMistakes: true,         // 是否显示错题
    testGrade: null,            // 测试年级
    testStage: null             // 测试阶段
  },

  onLoad(options) {
    try {
      const result = JSON.parse(decodeURIComponent(options.result));
      const testGrade = options.grade || null;
      const testStage = options.stage || null;
      
      this.setData({
        testGrade,
        testStage
      });
      
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
    const levelInfo = calculateVocabularyLevel(result.score, result.total, this.data.testGrade);
    const wrongCount = result.total - result.score;
    const mistakes = result.answers.filter(answer => !answer.isCorrect);
    const correctAnswers = result.answers.filter(answer => answer.isCorrect);
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
      correctAnswers,
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

  // 切换显示正确答案
  toggleCorrectAnswers() {
    this.setData({
      showCorrectAnswers: !this.data.showCorrectAnswers
    });
  },

  // 切换显示生词
  toggleWords() {
    this.setData({
      showMistakes: !this.data.showMistakes
    });
  },

  // 导出PDF报告
  exportPDF() {
    wx.showLoading({
      title: '正在生成PDF...'
    });
    
    try {
      const pdfContent = this.generatePDFContent();
      
      // 将PDF内容保存到本地文件
      wx.getFileSystemManager().writeFile({
        filePath: `${wx.env.USER_DATA_PATH}/test_result_${Date.now()}.txt`,
        data: pdfContent,
        encoding: 'utf8',
        success: (res) => {
          wx.hideLoading();
          wx.showModal({
            title: '导出成功',
            content: 'PDF报告已生成，您可以将以下内容复制到电脑上生成PDF文件。',
            confirmText: '复制内容',
            success: (modalRes) => {
              if (modalRes.confirm) {
                wx.setClipboardData({
                  data: pdfContent,
                  success: () => {
                    wx.showToast({
                      title: '内容已复制',
                      icon: 'success'
                    });
                  }
                });
              }
            }
          });
        },
        fail: (err) => {
          wx.hideLoading();
          console.error('导出PDF失败:', err);
          // 备用方案：直接复制内容
          wx.setClipboardData({
            data: pdfContent,
            success: () => {
              wx.showToast({
                title: 'PDF内容已复制',
                icon: 'success'
              });
            }
          });
        }
      });
    } catch (error) {
      wx.hideLoading();
      console.error('生成PDF失败:', error);
      wx.showToast({
        title: 'PDF生成失败',
        icon: 'error'
      });
    }
  },

  // 生成PDF内容
  generatePDFContent() {
    const { result, levelInfo, mistakes, correctAnswers } = this.data;
    const currentTime = new Date().toLocaleString('zh-CN');
    
    let content = `
=== 英语词汇量测试报告 ===

测试时间：${currentTime}
测试成绩：${result.score}/${result.total} (正确率: ${result.percentage}%)
词汇水平：${levelInfo.level}
`;
    
    if (levelInfo.range && levelInfo.range.includes('-')) {
      content += `词汇量区间：${levelInfo.range}个单词\n`;
    }
    
    if (levelInfo.stageName) {
      content += `测试阶段：${levelInfo.stageName}\n`;
    }
    
    content += `用时：${this.formatTime(result.duration)}
平均每题：${this.data.avgTimePerQuestion}
`;
    
    content += `\n=== 水平评价 ===\n${levelInfo.description}\n`;
    
    // 学习建议
    if (this.data.suggestions.length > 0) {
      content += `\n=== 学习建议 ===\n`;
      this.data.suggestions.forEach((suggestion, index) => {
        content += `${index + 1}. ${suggestion.text}\n`;
      });
    }
    
    // 错题列表
    if (mistakes.length > 0) {
      content += `\n=== 错题列表 (${mistakes.length}题) ===\n`;
      mistakes.forEach((mistake, index) => {
        content += `${index + 1}. ${mistake.question}\n`;
        content += `   正确答案：${mistake.correctAnswer}\n`;
        content += `   您的答案：${mistake.selectedAnswer}\n`;
        if (mistake.phonetic) {
          content += `   音标：${mistake.phonetic}\n`;
        }
        content += `\n`;
      });
    }
    
    // 正确题列表
    if (correctAnswers.length > 0) {
      content += `\n=== 正确题列表 (${correctAnswers.length}题) ===\n`;
      correctAnswers.forEach((correct, index) => {
        content += `${index + 1}. ${correct.question} - ${correct.correctAnswer}\n`;
      });
    }
    
    content += `\n=== 报告统计 ===\n`;
    content += `总题数：${result.total}\n`;
    content += `正确题数：${result.score}\n`;
    content += `错误题数：${mistakes.length}\n`;
    content += `正确率：${result.percentage}%\n`;
    
    content += `\n报告生成时间：${currentTime}\n`;
    content += `由 K12词汇学习系统 生成`;
    
    return content;
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