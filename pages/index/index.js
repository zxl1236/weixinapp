const { userManager } = require('../../utils/userManager');

Page({
  data: {
    testHistory: [],
    remainingTests: 3,
    isPremium: false,
    membershipStatus: {},
    expireTimeText: ''
  },

  onLoad() {
    this.loadTestHistory();
    this.checkDailyLimit();
  },

  onShow() {
    // 更新tabbar选中状态
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({
        selected: 0 // 首页是第1个tab
      });
    }
    this.loadTestHistory();
    this.checkDailyLimit();
  },

  // 检查每日测试限制和会员状态
  checkDailyLimit() {
    const membershipStatus = userManager.getMembershipStatus();
    const remainingTests = userManager.getRemainingTests();
    
    this.setData({
      isPremium: membershipStatus.isPremium,
      membershipStatus: membershipStatus,
      remainingTests: remainingTests.unlimited ? '∞' : remainingTests.count
    });
  },

  // 加载测试历史
  loadTestHistory() {
    try {
      const history = wx.getStorageSync('testHistory') || [];
      this.setData({
        testHistory: history.slice(-5)
      });
    } catch (e) {
      console.error('加载历史记录失败:', e);
    }
  },

  // 跳转到分级训练
  goToGradeTraining(e) {
    const stage = e.currentTarget.dataset.stage;
    
    let gradeToCheck;
    switch(stage) {
      case 'primary':
        gradeToCheck = 3;
        break;
      case 'junior':
        gradeToCheck = 7;
        break;
      case 'senior':
        gradeToCheck = 10;
        break;
      default:
        gradeToCheck = 3;
    }
    
    if (!userManager.canAccessGrade(gradeToCheck)) {
      const membershipStatus = userManager.getMembershipStatus();
      const accessibleGrades = membershipStatus.config.accessibleGrades.join('、');
      userManager.showPermissionModal(`免费版只能访问${accessibleGrades}年级内容`);
      return;
    }
    
    wx.navigateTo({
      url: `/pages/training/training?stage=${stage}`
    });
  },

  // 跳转到水平测试
  goToLevelTest() {
    const canTest = userManager.canTakeTest();
    if (!canTest.allowed) {
      userManager.showPermissionModal(canTest.reason);
      return;
    }
    
    wx.navigateTo({
      url: '/pages/gradeTest/gradeTest'
    });
  },

  // 显示生词本
  showWordBook() {
    wx.switchTab({
      url: '/pages/mistake/mistake'
    });
  },

  // 跳转到升级页面
  goToUpgrade() {
    wx.navigateTo({
      url: '/pages/payment/payment'
    });
  },

  // 跳转到支付页面（会员管理）
  goToPayment() {
    wx.navigateTo({
      url: '/pages/payment/payment'
    });
  },

  // 清空所有历史记录
  clearAllHistory() {
    wx.showModal({
      title: '确认删除',
      content: '确定要清空所有历史记录吗？',
      success: (res) => {
        if (res.confirm) {
          try {
            wx.removeStorageSync('testHistory');
            this.setData({
              testHistory: []
            });
            wx.showToast({
              title: '已清空',
              icon: 'success'
            });
          } catch (error) {
            wx.showToast({
              title: '删除失败',
              icon: 'error'
            });
          }
        }
      }
    });
  },

  // 删除单条历史记录
  deleteHistory(e) {
    const id = e.currentTarget.dataset.id;
    try {
      const history = wx.getStorageSync('testHistory') || [];
      const newHistory = history.filter(item => item.id !== id);
      
      wx.setStorageSync('testHistory', newHistory);
      this.loadTestHistory();
      
      wx.showToast({
        title: '已删除',
        icon: 'success'
      });
    } catch (error) {
      wx.showToast({
        title: '删除失败',
        icon: 'error'
      });
    }
  }
});