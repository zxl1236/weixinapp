// 数据同步测试页面
const { runQuickTest } = require('../../utils/syncTest.js');
const { learningDataSync } = require('../../utils/learningDataSync.js');

Page({
  data: {
    testing: false,
    testResults: null,
    currentStats: null
  },

  onLoad() {
    this.loadCurrentStats();
  },

  // 加载当前统计数据
  loadCurrentStats() {
    try {
      const stats = {
        // 数据源统计
        masteryMapSize: Object.keys(learningDataSync.getWordMasteryMap()).length,
        sessionHistorySize: learningDataSync.getLearningSessionHistory().length,
        dailyStatsSize: Object.keys(learningDataSync.getDailyLearningStats()).length,
        
        // 年级进度统计
        grade3Progress: learningDataSync.getGradeLearningProgress('grade3'),
        grade4Progress: learningDataSync.getGradeLearningProgress('grade4'),
        
        // 存储使用情况
        storageInfo: this.getStorageInfo()
      };
      
      this.setData({ currentStats: stats });
      
    } catch (error) {
      console.error('加载统计数据失败:', error);
    }
  },

  // 获取存储信息
  getStorageInfo() {
    try {
      const info = wx.getStorageInfoSync();
      return {
        keys: info.keys.filter(key => key.includes('mastery') || key.includes('learning') || key.includes('daily')),
        currentSize: info.currentSize,
        limitSize: info.limitSize
      };
    } catch (error) {
      console.error('获取存储信息失败:', error);
      return null;
    }
  },

  // 运行测试
  async runTest() {
    if (this.data.testing) return;
    
    this.setData({ testing: true, testResults: null });
    
    wx.showLoading({ title: '运行测试中...' });
    
    try {
      console.log('🚀 开始运行数据同步测试');
      
      const report = await runQuickTest();
      
      this.setData({ 
        testResults: report,
        testing: false 
      });
      
      // 刷新统计数据
      this.loadCurrentStats();
      
      wx.hideLoading();
      
      if (report.summary.successRate === 100) {
        wx.showToast({
          title: '✅ 所有测试通过',
          icon: 'success',
          duration: 2000
        });
      } else {
        wx.showModal({
          title: '测试完成',
          content: `通过率: ${report.summary.successRate}%\n通过: ${report.summary.passed}/${report.summary.total}`,
          showCancel: false
        });
      }
      
    } catch (error) {
      console.error('测试运行失败:', error);
      
      this.setData({ testing: false });
      wx.hideLoading();
      
      wx.showModal({
        title: '测试失败',
        content: `测试过程中出现错误: ${error.message}`,
        showCancel: false
      });
    }
  },

  // 清理测试数据
  clearTestData() {
    wx.showModal({
      title: '确认清理',
      content: '确定要清理所有测试数据吗？这将删除所有学习记录。',
      success: (res) => {
        if (res.confirm) {
          try {
            const keys = [
              'word_mastery_map',
              'learning_sessions', 
              'daily_learning_stats',
              'mistakeBook',
              'globalLearningProgress',
              'dailyStudyStats'
            ];
            
            keys.forEach(key => {
              wx.removeStorageSync(key);
            });
            
            // 刷新统计数据
            this.loadCurrentStats();
            
            wx.showToast({
              title: '数据已清理',
              icon: 'success'
            });
            
          } catch (error) {
            console.error('清理数据失败:', error);
            wx.showToast({
              title: '清理失败',
              icon: 'error'
            });
          }
        }
      }
    });
  },

  // 查看测试详情
  showTestDetails() {
    if (!this.data.testResults) return;
    
    const details = this.data.testResults.details;
    const failedTests = details.filter(t => !t.passed);
    
    let content = `总测试: ${details.length}\n`;
    content += `通过: ${details.filter(t => t.passed).length}\n`;
    content += `失败: ${failedTests.length}\n\n`;
    
    if (failedTests.length > 0) {
      content += '失败详情:\n';
      failedTests.forEach(test => {
        content += `• ${test.name}: ${test.message}\n`;
      });
    }
    
    wx.showModal({
      title: '测试详情',
      content: content,
      showCancel: false
    });
  },

  // 导出测试报告
  exportReport() {
    if (!this.data.testResults) {
      wx.showToast({
        title: '请先运行测试',
        icon: 'none'
      });
      return;
    }
    
    const reportData = JSON.stringify(this.data.testResults, null, 2);
    
    wx.setClipboardData({
      data: reportData,
      success: () => {
        wx.showToast({
          title: '报告已复制到剪贴板',
          icon: 'success'
        });
      }
    });
  },

  // 快速验证数据同步
  quickVerifySync() {
    wx.showModal({
      title: '快速验证同步',
      content: '此功能将创建一些测试数据并验证数据是否正确同步到生词本、学习日历等模块。确定要进行验证吗？',
      success: (res) => {
        if (res.confirm) {
          this.performQuickVerification();
        }
      }
    });
  },

  // 执行快速验证
  performQuickVerification() {
    try {
      wx.showLoading({ title: '验证同步中...' });
      
      // 生成测试数据
      const testWords = ['cat', 'dog', 'book'];
      const testGrade = 'grade3';
      const testGradeName = '三年级';
      
      console.log('🔍 开始数据同步验证');
      
      testWords.forEach((word, index) => {
        // 模拟学习过程：有对有错
        const success = index !== 1; // dog 设为错误
        
        learningDataSync.recordWordProgress(
          { word, gradeId: testGrade, gradeName: testGradeName },
          'phase1',
          success,
          {
            userAnswer: success ? word : 'wrong_answer',
            correctAnswer: word,
            questionType: 'phase1',
            duration: 2000,
            attempts: 1
          }
        );
      });
      
      // 检查同步结果
      setTimeout(() => {
        this.checkSyncResults(testWords);
      }, 1000);
      
    } catch (error) {
      console.error('验证失败:', error);
      wx.hideLoading();
      wx.showToast({
        title: '验证失败',
        icon: 'error'
      });
    }
  },

  // 检查同步结果
  checkSyncResults(testWords) {
    try {
      // 检查生词本
      const mistakeBook = wx.getStorageSync('mistakeBook') || {};
      const mistakeCount = testWords.filter(word => mistakeBook[word]).length;
      
      // 检查学习记录
      const sessionHistory = learningDataSync.getLearningSessionHistory();
      const sessionCount = sessionHistory.filter(session => 
        testWords.includes(session.word)
      ).length;
      
      // 检查掌握数据
      const wordMasteryMap = learningDataSync.getWordMasteryMap();
      const masteryCount = testWords.filter(word => wordMasteryMap[word]).length;
      
      wx.hideLoading();
      
      const result = `✅ 验证结果：\n\n` +
        `📚 测试单词：${testWords.join(', ')}\n` +
        `❌ 错题记录：${mistakeCount}个\n` +
        `📅 学习记录：${sessionCount}条\n` +
        `📊 掌握数据：${masteryCount}个\n\n` +
        `${mistakeCount > 0 && sessionCount > 0 && masteryCount > 0 ? 
          '🎉 数据同步正常！' : '⚠️ 可能存在同步问题'}`;
      
      wx.showModal({
        title: '同步验证完成',
        content: result,
        showCancel: false,
        confirmText: '查看详情',
        success: () => {
          this.loadCurrentStats();
        }
      });
      
    } catch (error) {
      console.error('检查同步结果失败:', error);
      wx.hideLoading();
      wx.showToast({
        title: '检查失败',
        icon: 'error'
      });
    }
  }
});
