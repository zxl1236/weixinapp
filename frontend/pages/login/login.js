const { getApiUrl } = require('../../utils/apiConfig');
const { userManager } = require('../../utils/userManager');

Page({
  data: {
    nickname: '',
    avatarUrl: '',
    canLogin: false,
    isLogging: false
  },

  onLoad() {
    // 检查是否已经登录
    this.checkLoginStatus();
  },

  onShow() {
    // 每次显示时也检查登录状态（防止从其他页面返回时已登录）
    this.checkLoginStatus();
  },

  // 检查登录状态
  checkLoginStatus() {
    const app = getApp();
    const userInfo = app.globalData.userInfo || wx.getStorageSync('userInfo');
    const openid = wx.getStorageSync('openid') || userManager.userData.openid;
    
    // 如果已有openid和有效的nickname，说明已登录，直接跳转到首页
    if (openid && 
        userInfo && 
        userInfo.nickname && 
        userInfo.nickname !== '微信用户' &&
        userInfo.nickname.trim().length > 0) {
      console.log('用户已登录，跳转到首页');
      wx.switchTab({
        url: '/pages/index/index'
      });
      return;
    }

    // 如果有缓存的昵称（即使是默认的），也预填充
    if (userInfo && userInfo.nickname) {
      this.setData({
        nickname: userInfo.nickname === '微信用户' ? '' : userInfo.nickname,
        avatarUrl: userInfo.avatar || userInfo.avatarUrl || ''
      });
      this.checkCanLogin();
    }
  },

  // 选择头像
  onChooseAvatar(e) {
    const { avatarUrl } = e.detail;
    this.setData({
      avatarUrl: avatarUrl
    });
  },

  // 昵称输入
  onNicknameInput(e) {
    const nickname = e.detail.value.trim();
    this.setData({
      nickname: nickname
    });
    this.checkCanLogin();
  },

  // 检查是否可以登录
  checkCanLogin() {
    const canLogin = this.data.nickname && this.data.nickname.length > 0;
    this.setData({
      canLogin: canLogin
    });
  },

  // 处理登录
  async handleLogin() {
    if (!this.data.canLogin || this.data.isLogging) {
      return;
    }

    const nickname = this.data.nickname.trim();
    if (!nickname || nickname.length === 0) {
      wx.showToast({
        title: '请输入昵称',
        icon: 'none'
      });
      return;
    }

    this.setData({ isLogging: true });

    try {
      // 1. 获取微信登录凭证
      const loginRes = await new Promise((resolve, reject) => {
        wx.login({
          success: resolve,
          fail: reject
        });
      });

      if (!loginRes.code) {
        throw new Error('获取登录凭证失败');
      }

      // 2. 调用后端注册接口
      const registerRes = await new Promise((resolve, reject) => {
        wx.request({
          url: getApiUrl('/api/users/register'),
          method: 'POST',
          data: {
            code: loginRes.code,
            nickname: nickname,
            avatar: this.data.avatarUrl || ''
          },
          timeout: 30000,
          success: (res) => {
            if (res.statusCode === 200 && res.data && res.data.success) {
              resolve(res.data);
            } else {
              const errorMsg = res.data?.message || `登录失败: HTTP ${res.statusCode}`;
              reject(new Error(errorMsg));
            }
          },
          fail: (error) => {
            let errorMessage = '登录失败';
            if (error.errMsg) {
              if (error.errMsg.includes('time out') || error.errMsg.includes('timeout')) {
                errorMessage = '连接超时，请检查网络';
              } else if (error.errMsg.includes('fail') || error.errMsg.includes('502')) {
                errorMessage = '网络请求失败，请检查网络连接';
              } else {
                errorMessage = `网络错误: ${error.errMsg}`;
              }
            }
            reject(new Error(errorMessage));
          }
        });
      });

      // 3. 保存用户信息
      if (registerRes.data) {
        const userInfo = registerRes.data;
        
        // 保存到全局数据
        const app = getApp();
        app.globalData.userInfo = userInfo;
        
        // 保存到本地存储
        wx.setStorageSync('userInfo', userInfo);
        wx.setStorageSync('openid', userInfo.openid);
        
        // 更新 userManager
        userManager.userData.openid = userInfo.openid;
        if (userInfo.membership) {
          userManager.userData.membership = userInfo.membership;
        }
        if (userInfo.membershipExpireTime) {
          userManager.userData.membershipExpireTime = userInfo.membershipExpireTime;
        }
        userManager.saveUserData();

        console.log('登录成功', {
          id: userInfo.id,
          nickname: userInfo.nickname,
          openid: userInfo.openid ? userInfo.openid.substring(0, 10) + '...' : 'unknown'
        });

        // 4. 显示成功提示并跳转
        wx.showToast({
          title: '登录成功',
          icon: 'success',
          duration: 1500
        });

        // 延迟跳转，让用户看到成功提示
        setTimeout(() => {
          wx.switchTab({
            url: '/pages/index/index'
          });
        }, 1500);
      } else {
        throw new Error('登录响应数据异常');
      }
    } catch (error) {
      console.error('登录失败:', error);
      this.setData({ isLogging: false });
      
      wx.showModal({
        title: '登录失败',
        content: error.message || '登录失败，请重试',
        showCancel: false,
        confirmText: '确定'
      });
    }
  }
});

