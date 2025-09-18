App({
  onLaunch() {
    // 初始化应用
    console.log('K12词汇学习系统启动');
    
    // 错误处理
    wx.onError((error) => {
      console.warn('应用错误:', error);
      // 过滤掉日志文件相关的错误
      if (error.includes && error.includes('miniprogramLog')) {
        return; // 忽略日志文件错误
      }
    });
  },
  
  onError(error) {
    // 全局错误处理
    console.warn('全局错误捕获:', error);
    if (typeof error === 'string' && error.includes('miniprogramLog')) {
      return; // 忽略日志相关错误
    }
  },
  
  globalData: {
    userInfo: null,
    testHistory: []
  }
})