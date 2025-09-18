Page({
  data: {
    userInfo: {},
    hasUserInfo: false,
    defaultAvatar: '/images/profile.png', // 默认头像
    studyStats: {
      totalWords: 0,
      learnedWords: 0,
      studyDays: 0
    },
    menuItems: [
      {
        icon: '/images/progress.png',
        title: '学习进度',
        subtitle: '查看学习统计',
        url: '/pages/progress/progress'
      },
      {
        icon: '/images/mistake.png', 
        title: '生词本',
        subtitle: '复习生词',
        url: '/pages/mistake/mistake'
      },
      {
        icon: '/images/training.png',
        title: '专项训练',
        subtitle: '强化练习',
        url: '/pages/training/training'
      },
      {
        icon: '/images/vip.png',
        title: '会员中心',
        subtitle: '升级会员权益',
        url: '/pages/payment/payment'
      }
    ]
  },

  onLoad() {
    this.initUserInfo();
  },

  onShow() {
    // 更新tabbar选中状态
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({
        selected: 2 // 我的页面是第3个tab
      });
    }
    this.loadStudyStats();
  },

  // 初始化用户信息
  initUserInfo() {
    // 1) 先读本地缓存（最快）
    const cached = wx.getStorageSync('userInfo');
    if (cached && cached.nickName) {
      this.setData({ 
        userInfo: cached, 
        hasUserInfo: true 
      });
      return;
    }

    // 2) 若无缓存，检测是否已授权过用户信息
    wx.getSetting({
      success: (res) => {
        if (res.authSetting['scope.userInfo']) {
          // 已授权：静默获取
          wx.getUserInfo({
            success: (r) => {
              this.setData({ 
                userInfo: r.userInfo, 
                hasUserInfo: true 
              });
              wx.setStorageSync('userInfo', r.userInfo);
            },
            fail: () => {
              // 理论上不太会进来；失败则保持未登录状态
              this.setData({ hasUserInfo: false });
            }
          });
        } else {
          // 未授权
          this.setData({ hasUserInfo: false });
        }
      }
    });
  },

  // 登录授权（必须点按钮）
  getUserProfile() {
    wx.getUserProfile({
      desc: '用于完善个人资料',
      success: (res) => {
        const info = res.userInfo;
        this.setData({ 
          userInfo: info, 
          hasUserInfo: true 
        });
        wx.setStorageSync('userInfo', info); // 写缓存，便于下次自动显示
        wx.showToast({ 
          title: '登录成功', 
          icon: 'success' 
        });
      },
      fail: () => {
        wx.showToast({ 
          title: '授权被取消', 
          icon: 'none' 
        });
      }
    });
  },

  // 更换账号（清缓存 + 重新授权）
  reAuth() {
    wx.showModal({
      title: '更换账号',
      content: '确定要清除当前登录信息并重新授权吗？',
      success: (r) => {
        if (r.confirm) {
          wx.removeStorageSync('userInfo');
          this.setData({ 
            userInfo: {}, 
            hasUserInfo: false 
          });
        }
      }
    });
  },

  loadStudyStats() {
    // 从缓存获取学习统计
    try {
      const totalWords = wx.getStorageSync('totalWords') || 0;
      const learnedWords = wx.getStorageSync('learnedWords') || 0;
      const studyDays = wx.getStorageSync('studyDays') || 0;
      
      this.setData({
        'studyStats.totalWords': totalWords,
        'studyStats.learnedWords': learnedWords,
        'studyStats.studyDays': studyDays
      });
    } catch (e) {
      console.log('获取学习统计失败', e);
    }
  },

  navigateToPage(e) {
    const url = e.currentTarget.dataset.url;
    if (url) {
      wx.navigateTo({
        url: url,
        fail: (err) => {
          console.log('页面跳转失败', err);
          wx.showToast({
            title: '页面跳转失败',
            icon: 'none'
          });
        }
      });
    }
  },

  onPullDownRefresh() {
    this.initUserInfo();
    this.loadStudyStats();
    wx.stopPullDownRefresh();
  }
});