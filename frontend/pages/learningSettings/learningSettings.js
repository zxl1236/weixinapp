// pages/learningSettings/learningSettings.js
// 学习设置页面 - 让用户选择学习参数

Page({
  data: {
    gradeId: '',
    gradeName: '',
    
    // 学习设置选项
    quantityOptions: [
      { value: 10, label: '10个单词/组', desc: '标准学习' },
      { value: 20, label: '20个单词/组', desc: '高强度学习' },
      { value: 'custom', label: '自定义', desc: '自定义数量' }
    ],
    selectedQuantity: 10, // 默认选择10个
    customQuantity: '', // 自定义数量
    showCustomInput: false, // 是否显示自定义输入框
    isCustomQuantity: false, // 是否选择了自定义数量
    selectedQuantityValue: 10, // 实际选择的数量值（用于判断选中状态）
    
    // 学习模式选项
    learningModes: [
      { value: 'normal', label: '标准模式', desc: '认读 + 巩固练习' },
      { value: 'quick', label: '快速模式', desc: '仅认读练习' }
    ],
    selectedMode: 'normal', // 默认标准模式
    
    // 是否有继续学习的选项
    hasContinueLearning: false,
    continueLearningInfo: null,
    
    // 学习统计
    learningStats: {
      totalWords: 0,
      learnedWords: 0,
      progress: 0
    }
  },

  onLoad(options) {
    const gradeId = options.grade || '';
    const gradeName = decodeURIComponent(options.gradeName || '');
    
    this.setData({
      gradeId,
      gradeName
    });
    
    // 检查是否有继续学习的选项
    this.checkContinueLearning();
    
    // 加载学习统计
    this.loadLearningStats().catch(error => {
      console.error('加载学习统计失败:', error);
    });
  },

  // 检查是否有继续学习的选项
  checkContinueLearning() {
    try {
      const { gradeId } = this.data;
      const progressData = wx.getStorageSync(`LEARNING_PROGRESS_${gradeId}`);
      
      if (progressData && progressData.timestamp) {
        // 检查进度是否过期（24小时）
        const now = Date.now();
        const timeDiff = now - progressData.timestamp;
        const oneDay = 24 * 60 * 60 * 1000;
        
        if (timeDiff < oneDay) {
          const progress = this.calculateProgress(progressData);
          
          this.setData({
            hasContinueLearning: true,
            continueLearningInfo: {
              progress,
              lastUpdate: progressData.timestamp,
              currentPhase: progressData.currentPhase || 1,
              sessionDone: progressData.sessionDone || 0,
              sessionTarget: progressData.sessionTarget || 30
            }
          });
        }
      }
    } catch (error) {
      console.error('检查继续学习失败:', error);
    }
  },

  // 加载学习统计
  async loadLearningStats() {
    try {
      const { gradeId } = this.data;
      
      // 获取该年级的单词总数
      const { getGradeWords } = require('../../utils/gradeWordDatabase.js');
      const allWords = await getGradeWords(gradeId);
      
      // 获取已学习的单词
      const progressData = wx.getStorageSync(`LEARNING_PROGRESS_${gradeId}`);
      const learnedWords = progressData ? (progressData.learnedWords || []) : [];
      
      const progress = allWords.length > 0 ? Math.round((learnedWords.length / allWords.length) * 100) : 0;
      
      this.setData({
        learningStats: {
          totalWords: allWords.length,
          learnedWords: learnedWords.length,
          progress
        }
      });
    } catch (error) {
      console.error('加载学习统计失败:', error);
    }
  },

  // 计算学习进度
  calculateProgress(progressData) {
    const sessionDone = progressData.sessionDone || 0;
    const sessionTarget = progressData.sessionTarget || 30;
    return Math.round((sessionDone / sessionTarget) * 100);
  },

  // 选择学习数量
  selectQuantity(e) {
    const quantity = e.currentTarget.dataset.quantity;
    
    if (quantity === 'custom') {
      // 显示自定义输入框
      this.setData({
        showCustomInput: true,
        selectedQuantity: 'custom',
        selectedQuantityValue: 'custom',
        isCustomQuantity: false
      });
    } else {
      // 选择固定数量
      const quantityNum = parseInt(quantity);
      this.setData({
        selectedQuantity: quantityNum,
        selectedQuantityValue: quantityNum,
        showCustomInput: false,
        customQuantity: '',
        isCustomQuantity: false
      });
    }
  },
  
  // 输入自定义数量
  onCustomQuantityInput(e) {
    const value = e.detail.value;
    this.setData({
      customQuantity: value
    });
  },
  
  // 确认自定义数量
  confirmCustomQuantity() {
    const customQuantity = parseInt(this.data.customQuantity);
    
    if (!customQuantity || customQuantity < 1) {
      wx.showToast({
        title: '请输入有效数量',
        icon: 'none'
      });
      return;
    }
    
    if (customQuantity > 100) {
      wx.showToast({
        title: '数量不能超过100',
        icon: 'none'
      });
      return;
    }
    
    this.setData({
      selectedQuantity: customQuantity,
      selectedQuantityValue: customQuantity,
      showCustomInput: false,
      isCustomQuantity: true
    });
  },
  
  // 取消自定义输入
  cancelCustomQuantity() {
    this.setData({
      showCustomInput: false,
      customQuantity: '',
      selectedQuantity: 10, // 恢复默认值
      selectedQuantityValue: 10,
      isCustomQuantity: false
    });
  },

  // 选择学习模式
  selectMode(e) {
    const mode = e.currentTarget.dataset.mode;
    this.setData({
      selectedMode: mode
    });
  },

  // 开始新学习
  startNewLearning() {
    const { gradeId, gradeName, selectedQuantity, selectedMode } = this.data;
    
    // 检查是否有现有进度，如果有则询问是否重新开始
    if (this.data.hasContinueLearning) {
      wx.showModal({
        title: '重新开始学习',
        content: `您之前已经学习过${gradeName}，是否要重新开始学习？`,
        confirmText: '重新开始',
        cancelText: '取消',
        success: (res) => {
          if (res.confirm) {
            // 清除该年级的学习进度
            wx.removeStorageSync(`LEARNING_PROGRESS_${gradeId}`);
            // 跳转到学习页面
            this.navigateToLearning(false);
          }
        }
      });
    } else {
      // 直接开始新学习
      this.navigateToLearning(false);
    }
  },

  // 继续学习
  continueLearning() {
    this.navigateToLearning(true);
  },

  // 跳转到学习页面
  navigateToLearning(isContinue) {
    const { gradeId, gradeName, selectedQuantity, selectedMode } = this.data;
    
    // 确保数量是数字
    const quantity = typeof selectedQuantity === 'number' ? selectedQuantity : parseInt(selectedQuantity) || 10;
    
    const url = `/pages/learning/learning?grade=${gradeId}&gradeName=${encodeURIComponent(gradeName)}&quantity=${quantity}&mode=${selectedMode}&continue=${isContinue}`;
    
    wx.navigateTo({
      url: url
    });
  },

  // 查看学习进度
  viewProgress() {
    const { gradeId, gradeName } = this.data;
    
    wx.navigateTo({
      url: `/pages/progress/progress?gradeId=${gradeId}&gradeName=${encodeURIComponent(gradeName)}`
    });
  },

  // 返回首页
  goBack() {
    wx.navigateBack();
  }
});
