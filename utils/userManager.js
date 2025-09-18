/**
 * 用户状态管理工具
 * 处理会员状态、权限验证、本地存储等
 */

// 会员类型定义
const MEMBERSHIP_TYPES = {
  FREE: 'free',
  PREMIUM: 'premium'
};

// 会员特权配置
const MEMBERSHIP_CONFIG = {
  free: {
    dailyTestLimit: 3,                    // 每日测试限制
    maxMistakeCount: 20,                  // 错题本最大数量
    accessibleGrades: ['3', '4'],         // 可访问年级（小学3-4年级）
    accessibleStages: ['primary'],       // 可访问阶段
    cloudSync: false,                     // 云同步功能
    detailedReport: false                 // 详细报告
  },
  premium: {
    dailyTestLimit: -1,                   // 无限制
    maxMistakeCount: -1,                  // 无限制
    accessibleGrades: ['3', '4', '5', '6', '7', '8', '9', '10', '11', '12'], // 全部年级
    accessibleStages: ['primary', 'junior', 'senior'], // 全部阶段
    cloudSync: true,                      // 支持云同步
    detailedReport: true                  // 详细报告
  }
};

class UserManager {
  constructor() {
    this.userData = this.loadUserData();
    this.initDailyUsage();
  }

  /**
   * 加载用户数据
   */
  loadUserData() {
    try {
      const defaultData = {
        openid: '',
        membership: MEMBERSHIP_TYPES.FREE,
        membershipExpireTime: null,
        dailyUsage: {
          date: this.getTodayString(),
          testCount: 0
        },
        totalTestCount: 0,
        registerTime: new Date().toISOString(),
        lastActiveTime: new Date().toISOString()
      };

      const savedData = wx.getStorageSync('userData');
      return savedData ? { ...defaultData, ...savedData } : defaultData;
    } catch (error) {
      console.error('加载用户数据失败:', error);
      return {
        openid: '',
        membership: MEMBERSHIP_TYPES.FREE,
        membershipExpireTime: null,
        dailyUsage: {
          date: this.getTodayString(),
          testCount: 0
        },
        totalTestCount: 0,
        registerTime: new Date().toISOString(),
        lastActiveTime: new Date().toISOString()
      };
    }
  }

  /**
   * 保存用户数据
   */
  saveUserData() {
    try {
      this.userData.lastActiveTime = new Date().toISOString();
      wx.setStorageSync('userData', this.userData);
      return true;
    } catch (error) {
      console.error('保存用户数据失败:', error);
      return false;
    }
  }

  /**
   * 获取今日日期字符串
   */
  getTodayString() {
    const today = new Date();
    return `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}-${today.getDate().toString().padStart(2, '0')}`;
  }

  /**
   * 初始化每日使用统计
   */
  initDailyUsage() {
    const today = this.getTodayString();
    if (this.userData.dailyUsage.date !== today) {
      this.userData.dailyUsage = {
        date: today,
        testCount: 0
      };
      this.saveUserData();
    }
  }

  /**
   * 获取用户会员状态
   */
  getMembershipStatus() {
    // 检查会员是否过期
    if (this.userData.membershipExpireTime) {
      const expireTime = new Date(this.userData.membershipExpireTime);
      const now = new Date();
      
      if (now > expireTime) {
        // 会员已过期，降级为免费用户
        this.userData.membership = MEMBERSHIP_TYPES.FREE;
        this.userData.membershipExpireTime = null;
        this.saveUserData();
      }
    }

    return {
      type: this.userData.membership,
      isPremium: this.userData.membership === MEMBERSHIP_TYPES.PREMIUM,
      expireTime: this.userData.membershipExpireTime,
      config: MEMBERSHIP_CONFIG[this.userData.membership]
    };
  }

  /**
   * 升级为会员
   */
  upgradeToPremium(duration = 365) {
    const expireTime = new Date();
    expireTime.setDate(expireTime.getDate() + duration);
    
    this.userData.membership = MEMBERSHIP_TYPES.PREMIUM;
    this.userData.membershipExpireTime = expireTime.toISOString();
    
    return this.saveUserData();
  }

  /**
   * 检查是否可以进行测试
   */
  canTakeTest() {
    const status = this.getMembershipStatus();
    
    if (status.isPremium) {
      return { allowed: true, reason: '' };
    }

    // 免费用户检查每日限制
    const dailyLimit = status.config.dailyTestLimit;
    if (this.userData.dailyUsage.testCount >= dailyLimit) {
      return { 
        allowed: false, 
        reason: `免费用户每日限制${dailyLimit}次测试，已达上限。升级会员获得无限测试机会！` 
      };
    }

    return { allowed: true, reason: '' };
  }

  /**
   * 记录测试次数
   */
  recordTest() {
    this.initDailyUsage(); // 确保日期正确
    this.userData.dailyUsage.testCount++;
    this.userData.totalTestCount++;
    return this.saveUserData();
  }

  /**
   * 检查是否可以访问指定年级
   */
  canAccessGrade(grade) {
    const status = this.getMembershipStatus();
    return status.config.accessibleGrades.includes(grade.toString());
  }

  /**
   * 检查是否可以访问指定阶段
   */
  canAccessStage(stage) {
    const status = this.getMembershipStatus();
    return status.config.accessibleStages.includes(stage);
  }

  /**
   * 检查错题本容量
   */
  canAddMistake(currentCount) {
    const status = this.getMembershipStatus();
    const maxCount = status.config.maxMistakeCount;
    
    if (maxCount === -1) return { allowed: true, reason: '' };
    
    if (currentCount >= maxCount) {
      return { 
        allowed: false, 
        reason: `免费用户错题本最多保存${maxCount}个错题，请升级会员获得无限容量！` 
      };
    }
    
    return { allowed: true, reason: '' };
  }

  /**
   * 获取用户统计信息
   */
  getUserStats() {
    const status = this.getMembershipStatus();
    return {
      membership: status,
      dailyUsage: this.userData.dailyUsage,
      totalTestCount: this.userData.totalTestCount,
      registerTime: this.userData.registerTime,
      lastActiveTime: this.userData.lastActiveTime
    };
  }

  /**
   * 显示权限限制提示
   */
  showPermissionModal(message, showUpgrade = true) {
    const content = showUpgrade ? 
      `${message}\n\n升级会员即可解锁全部功能！` : 
      message;

    wx.showModal({
      title: '功能限制',
      content: content,
      confirmText: showUpgrade ? '立即升级' : '确定',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm && showUpgrade) {
          // 跳转到支付页面
          wx.navigateTo({
            url: '/pages/payment/payment'
          });
        }
      }
    });
  }

  /**
   * 获取剩余测试次数
   */
  getRemainingTests() {
    const status = this.getMembershipStatus();
    
    if (status.isPremium) {
      return { unlimited: true, count: -1 };
    }

    const used = this.userData.dailyUsage.testCount;
    const limit = status.config.dailyTestLimit;
    
    return { 
      unlimited: false, 
      count: Math.max(0, limit - used),
      used: used,
      limit: limit
    };
  }
}

// 导出单例实例
const userManager = new UserManager();

module.exports = {
  userManager,
  MEMBERSHIP_TYPES,
  MEMBERSHIP_CONFIG
};
