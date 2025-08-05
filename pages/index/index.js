const app = getApp();

Page({
  data: {
    hasHistory: false,
    testHistory: []
  },

  onLoad() {
    this.loadTestHistory();
  },

  onShow() {
    this.loadTestHistory();
  },

  // 加载测试历史
  loadTestHistory() {
    try {
      const history = wx.getStorageSync('testHistory') || [];
      this.setData({
        hasHistory: history.length > 0,
        testHistory: history.slice(-3) // 只显示最近3次记录
      });
    } catch (e) {
      console.error('加载历史记录失败:', e);
    }
  },

  // 开始快速测试
  startQuickTest() {
    this.navigateToTest(10);
  },

  // 开始标准测试
  startStandardTest() {
    this.navigateToTest(20);
  },

  // 开始深度测试
  startExtendedTest() {
    this.navigateToTest(30);
  },

  // 新的分级测试启动函数
  startTest(e) {
    const level = e.currentTarget.dataset.level;
    console.log('启动测试，级别:', level);
    // 根据不同级别设置不同的题目数量
    const questionCount = level === 'primary' ? 15 : level === 'junior' ? 20 : 25;
    this.navigateToTest(questionCount);
  },

  // 显示错题本
  showMistakeBook() {
    // 这里可以跳转到错题本页面，或者显示错题本功能
    wx.showToast({
      title: '错题本功能开发中',
      icon: 'none'
    });
  },

  // 导航到测试页面
  navigateToTest(questionCount) {
    wx.showLoading({
      title: '正在准备题目...',
      mask: true
    });

    // 模拟加载时间，增强用户体验
    setTimeout(() => {
      wx.hideLoading();
      wx.navigateTo({
        url: `/pages/test/test?count=${questionCount}`
      });
    }, 800);
  },

  // 分享功能
  onShareAppMessage() {
    return {
      title: '英文词汇量测试 - 快速测试你的英语水平',
      path: '/pages/index/index',
      imageUrl: '' // 可以添加分享图片
    };
  },

  // 分享到朋友圈
  onShareTimeline() {
    return {
      title: '英文词汇量测试 - 快速测试你的英语水平',
      imageUrl: '' // 可以添加分享图片
    };
  }
});