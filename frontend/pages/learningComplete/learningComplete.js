// pages/learningComplete/learningComplete.js
const { userManager } = require('../../utils/userManager');

Page({
  data: {
    gradeId: '',
    gradeName: '',
    totalWords: 0,
    masteredWords: 0,
    studyDays: 0,
    completionTime: '',
    showStats: false,
    showUpgradePrompt: false
  },

  onLoad(options) {
    const { gradeId, gradeName, totalWords, masteredWords, studyDays } = options;
    
    // 解码年级名称，解决乱码问题
    const decodedGradeName = gradeName ? decodeURIComponent(gradeName) : '';
    
    this.setData({
      gradeId: gradeId || '',
      gradeName: decodedGradeName,
      totalWords: parseInt(totalWords) || 0,
      masteredWords: parseInt(masteredWords) || 0,
      studyDays: parseInt(studyDays) || 0,
      completionTime: this.formatTime(new Date())
    });

    // 检查是否达到免费版限制
    const hasReachedLimit = userManager.hasReachedFreeLimit();
    
    if (hasReachedLimit) {
      // 达到限制，显示升级提示
      this.setData({
        showUpgradePrompt: true,
        showStats: false
      });
    } else {
      // 未达到限制，正常显示完成页面
      this.showCompletionAnimation();
    }
  },

  // 格式化时间
  formatTime(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hour = String(date.getHours()).padStart(2, '0');
    const minute = String(date.getMinutes()).padStart(2, '0');
    
    return `${year}-${month}-${day} ${hour}:${minute}`;
  },

  // 显示完成动画
  showCompletionAnimation() {
    // 延迟显示统计信息，让用户先看到恭喜信息
    setTimeout(() => {
      this.setData({ showStats: true });
    }, 1500);
  },

  // 重新学习当前年级
  restartLearning() {
    wx.showModal({
      title: '重新学习',
      content: '确定要重新学习当前年级的所有单词吗？这将重置学习进度。',
      confirmText: '确定',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          // 重置当前年级的学习进度
          this.resetGradeProgress();
          
          // 跳转到学习页面
          wx.redirectTo({
            url: `/pages/learning/learning?grade=${this.data.gradeId}&gradeName=${encodeURIComponent(this.data.gradeName)}`
          });
        }
      }
    });
  },

  // 重置年级学习进度
  resetGradeProgress() {
    try {
      const gradeId = this.data.gradeId;
      
      // 1. 清除该年级的已掌握单词列表
      const masteredKey = `MASTERED_WORDS_${gradeId}`;
      wx.removeStorageSync(masteredKey);
      
      // 2. 重置该年级所有单词的掌握状态为未学过
      const masteryMap = wx.getStorageSync('MASTERY_MAP') || {};
      Object.keys(masteryMap).forEach(word => {
        if (masteryMap[word].gradeId === gradeId) {
          masteryMap[word].mastered = false;
          masteryMap[word].masteredTime = null;
        }
      });
      wx.setStorageSync('MASTERY_MAP', masteryMap);
      
      // 3. 清除该年级的学习记录
      const studyRecords = wx.getStorageSync('STUDY_RECORDS') || {};
      delete studyRecords[gradeId];
      wx.setStorageSync('STUDY_RECORDS', studyRecords);
      
      wx.showToast({
        title: '进度已重置',
        icon: 'success'
      });
    } catch (error) {
      console.error('重置进度失败:', error);
      wx.showToast({
        title: '重置失败',
        icon: 'none'
      });
    }
  },

  // 去生词本学习
  goToMistakeWords() {
    wx.switchTab({
      url: '/pages/mistake/mistake'
    });
  },

  // 选择其他年级
  selectOtherGrade() {
    wx.navigateBack({
      delta: 2 // 返回到年级选择页面
    });
  },

  // 查看学习统计
  viewStats() {
    wx.navigateTo({
      url: `/pages/progress/progress?gradeId=${this.data.gradeId}`
    });
  },

  // 返回首页
  goHome() {
    wx.switchTab({
      url: '/pages/index/index'
    });
  },

  // 跳转到激活码激活页面
  goToActivation() {
    wx.navigateTo({
      url: '/pages/payment/payment?focus=activation'
    });
  },

  // 跳转到支付页面
  goToPayment() {
    wx.navigateTo({
      url: '/pages/payment/payment'
    });
  }
});
