const { getApiUrl } = require('./utils/apiConfig');
const { userManager } = require('./utils/userManager');

App({
  onLaunch() {
    // 检查登录状态
    this.checkLoginAndRedirect();
    
    // 检查用户是否已授权用户信息
    try {
      const userInfo = wx.getStorageSync('userInfo');
      this.globalData.hasUserInfo = !!userInfo;
    } catch (error) {
      console.warn('检查用户信息授权状态失败:', error);
      this.globalData.hasUserInfo = false;
    }

    wx.onError((error) => {
      // 过滤掉不需要处理的错误
      const errorStr = typeof error === 'string' ? error : 
                      (error?.errMsg || error?.message || JSON.stringify(error) || '');
      
      // 过滤日志文件相关的错误
      if (errorStr.includes('miniprogramLog')) {
        return; // 忽略日志文件错误
      }
      
      // 过滤微信开发工具内部错误（access_token missing）
      if (errorStr.includes('access_token missing') || 
          errorStr.includes('webapi_getwxaasyncsecinfo') ||
          (errorStr.includes('err_code') && errorStr.includes('41001')) ||
          (error?.err_code === 41001)) {
        return; // 忽略微信开发工具内部错误
      }
      
      // 其他错误正常输出
      console.warn('应用错误:', error);
    });
  },

  /**
   * 检查登录状态并重定向
   * 如果未登录（没有openid或没有有效nickname），跳转到登录页
   * 注意：在onLaunch时，页面可能还未加载，所以延迟检查
   */
  checkLoginAndRedirect() {
    // 延迟检查，确保页面已加载
    setTimeout(() => {
      try {
        const userInfo = wx.getStorageSync('userInfo');
        const openid = wx.getStorageSync('openid') || userManager.userData.openid;
        
        // 检查是否已登录：必须有openid和有效的nickname（不是默认的"微信用户"）
        const isLoggedIn = openid && 
                          userInfo && 
                          userInfo.nickname && 
                          userInfo.nickname !== '微信用户' &&
                          userInfo.nickname.trim().length > 0;
        
        if (!isLoggedIn) {
          // 未登录：不在启动阶段强制跳转到登录页，允许用户先浏览首页内容。
          // 之后在访问需要登录的功能时再提示用户登录。
          console.log('用户未登录（启动时不强制跳转）');
          // 记录全局登录状态，供页面按需提示
          this.globalData.isLoggedIn = false;
        } else {
          // 已登录：更新全局状态，但不在启动阶段做页面跳转
          console.log('用户已登录（启动）');
          this.globalData.isLoggedIn = true;
        }
      } catch (error) {
        console.warn('检查登录状态失败:', error);
        // 出错时记录错误并保持不跳转，以免阻塞用户进入首页
        console.warn('检查登录状态失败（不跳转）:', error);
      }
    }, 100);
  },

  /**
   * 自动登录（已废弃，改为在登录页面手动登录）
   * 保留此方法以保持兼容性，但不再自动调用
   */
  async doLogin() {
    try {
      // 获取微信登录凭证
      const loginRes = await new Promise((resolve, reject) => {
        wx.login({
          success: resolve,
          fail: reject
        });
      });

      if (!loginRes.code) {
        console.warn('获取登录凭证失败');
        return;
      }

      // 调用后台接口，通过 code 获取 openid 并注册用户
      const apiUrl = getApiUrl('/api/users/register');
      console.log('准备调用注册接口:', apiUrl);
      
      const registerRes = await new Promise((resolve, reject) => {
        wx.request({
          url: apiUrl,
          method: 'POST',
          data: {
            code: loginRes.code
          },
          timeout: 30000, // 30秒超时（与服务器保持一致）
          success: (res) => {
            console.log('注册接口响应:', {
              statusCode: res.statusCode,
              data: res.data
            });
            if (res.statusCode === 200 && res.data && res.data.success) {
              resolve(res.data);
            } else {
              const errorMsg = res.data?.message || `登录失败: HTTP ${res.statusCode}`;
              console.error('注册接口返回错误:', errorMsg, res.data);
              reject(new Error(errorMsg));
            }
          },
          fail: (error) => {
            // 处理不同类型的错误
            console.error('注册接口请求失败:', error);
            let errorMessage = '登录失败';
            if (error.errMsg) {
              if (error.errMsg.includes('time out') || error.errMsg.includes('timeout')) {
                errorMessage = '连接超时，请检查网络或确认后端服务是否运行';
              } else if (error.errMsg.includes('fail') || error.errMsg.includes('502')) {
                errorMessage = '网络请求失败，请检查后端服务地址配置或服务器是否正常运行';
              } else if (error.errMsg.includes('502')) {
                errorMessage = '服务器网关错误(502)，请检查后端服务是否正常运行';
              } else {
                errorMessage = `网络错误: ${error.errMsg}`;
              }
            }
            reject(new Error(errorMessage));
          }
        });
      });

      // 保存完整的用户信息到全局和本地存储
      if (registerRes.data) {
        const userInfo = registerRes.data;
        
        // 保存到全局数据
        this.globalData.userInfo = userInfo;
        
        // 保存到本地存储
        wx.setStorageSync('userInfo', userInfo);
        
        // 更新 userManager（保持兼容）
        userManager.userData.openid = userInfo.openid;
        if (userInfo.membership) {
          userManager.userData.membership = userInfo.membership;
        }
        if (userInfo.membershipExpireTime) {
          userManager.userData.membershipExpireTime = userInfo.membershipExpireTime;
        }
        userManager.saveUserData();

        // 保存到本地存储（兼容其他可能使用的地方）
        wx.setStorageSync('openid', userInfo.openid);

        console.log('自动登录成功', { 
          id: userInfo.id,
          openid: userInfo.openid ? userInfo.openid.substring(0, 10) + '...' : 'unknown',
          nickname: userInfo.nickname || '微信用户'
        });
        
        // 🔧 修复：登录成功后，通知所有页面更新登录状态
        // 通过事件通知当前页面更新登录状态
        const pages = getCurrentPages();
        if (pages && pages.length > 0) {
          const currentPage = pages[pages.length - 1];
          if (currentPage && typeof currentPage.checkLoginStatus === 'function') {
            currentPage.checkLoginStatus();
          }
        }
      }
    } catch (error) {
      // 静默失败，不影响用户使用
      console.warn('自动登录失败（不影响使用）:', error.message || error);
    }
  },
  
  onError(error) {
    // 全局错误处理
    // 过滤掉不需要处理的错误
    const errorStr = typeof error === 'string' ? error : 
                    (error?.errMsg || error?.message || JSON.stringify(error) || '');
    
    // 过滤日志文件相关的错误
    if (errorStr.includes('miniprogramLog')) {
      return; // 忽略日志文件错误
    }
    
    // 过滤微信开发工具内部错误（access_token missing）
    if (errorStr.includes('access_token missing') || 
        errorStr.includes('webapi_getwxaasyncsecinfo') ||
        (errorStr.includes('err_code') && errorStr.includes('41001')) ||
        (error?.err_code === 41001)) {
      return; // 忽略微信开发工具内部错误
    }
    
    // 其他错误正常输出
    console.warn('全局错误捕获:', error);
  },
  
  globalData: {
    userInfo: null,
    testHistory: [],
    hasUserInfo: false  // 用户是否已授权用户信息
  }
})