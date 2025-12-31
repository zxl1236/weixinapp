/**
 * 用户状态管理工具
 * 处理会员状态、权限验证、本地存储等
 */

// 临时开关：测试阶段直接视为会员
const FORCE_PREMIUM = false;

// 会员类型定义
const MEMBERSHIP_TYPES = {
  FREE: 'free',
  PREMIUM: 'premium'
};

// 会员特权配置
const MEMBERSHIP_CONFIG = {
  free: {
    dailyTestLimit: 3,                    // 免费用户：每日测试次数上限
    maxMistakeCount: 20,                  // 免费用户：错题本容量上限
    // ✅ 改为：免费开放全部年级/阶段（不在这里做年级/阶段限制）
    accessibleGrades: [],                 // 空数组表示无限制
    accessibleStages: [],                 // 空数组表示无限制
    cloudSync: false,                     // 免费用户：不支持云同步
    detailedReport: false,                // 免费用户：不提供详细报告
    maxLearnedWords: 30                   // 免费用户：累计学习/掌握上限（达到即提示付费解锁）
  },
  premium: {
    dailyTestLimit: -1,                   // 无限制
    maxMistakeCount: -1,                  // 无限制
    accessibleGrades: ['3', '4', '5', '6', '7', '8', '9', '10', '11', '12'], // 全部年级
    accessibleStages: ['primary', 'junior', 'senior'], // 全部阶段
    cloudSync: true,                      // 支持云同步
    detailedReport: true,                 // 详细报告
    maxLearnedWords: -1                   // 无限制
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
        lastActiveTime: new Date().toISOString(),
        isActivated: false,
        activatedAt: null
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
        lastActiveTime: new Date().toISOString(),
        isActivated: false,
        activatedAt: null
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
      console.error('[UserManager] 保存用户数据失败:', error);
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
   * 获取用户信息
   */
  getUserInfo() {
    return {
      openid: this.userData.openid,
      membership: this.userData.membership,
      membershipExpireTime: this.userData.membershipExpireTime,
      registerTime: this.userData.registerTime,
      lastActiveTime: this.userData.lastActiveTime,
      isActivated: this.userData.isActivated || false,
      activatedAt: this.userData.activatedAt
    };
  }

  /**
   * 获取用户激活状态
   */
  isActivated() {
    return this.userData.isActivated === true;
  }

  /**
   * 更新激活状态
   */
  updateActivationStatus(isActivated, activatedAt = null) {
    this.userData.isActivated = isActivated;
    if (activatedAt) {
      this.userData.activatedAt = activatedAt;
    } else if (isActivated && !this.userData.activatedAt) {
      this.userData.activatedAt = new Date().toISOString();
    }
    return this.saveUserData();
  }

  /**
   * 获取用户会员状态
   */
  getMembershipStatus() {
    if (FORCE_PREMIUM) {
      this.userData.membership = MEMBERSHIP_TYPES.PREMIUM;
      this.userData.membershipExpireTime = null;
      return {
        type: MEMBERSHIP_TYPES.PREMIUM,
        isPremium: true,
        expireTime: null,
        config: MEMBERSHIP_CONFIG[MEMBERSHIP_TYPES.PREMIUM]
      };
    }

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
   * 更新会员状态
   * @param {Object} membershipStatus - 会员状态对象，包含 type 和 expireTime
   */
  updateMembershipStatus(membershipStatus) {
    if (membershipStatus) {
      if (membershipStatus.type) {
        this.userData.membership = membershipStatus.type;
      }
      if (membershipStatus.expireTime) {
        this.userData.membershipExpireTime = membershipStatus.expireTime;
      }
      return this.saveUserData();
    }
    return false;
  }

  /**
   * 检查是否可以进行测试
   */
  canTakeTest() {
    const status = this.getMembershipStatus();
    
    // 会员无限制
    if (status.isPremium) {
      return { allowed: true, reason: '' };
    }
    
    // 免费用户检查每日测试限制
    const used = this.userData.dailyUsage.testCount;
    const limit = status.config.dailyTestLimit;
    
    // limit 为 -1 表示无限制
    if (limit === -1) {
      return { allowed: true, reason: '' };
    }
    
    // 检查是否超过限制
    if (used >= limit) {
      return { 
        allowed: false, 
        reason: `免费用户每日只能进行 ${limit} 次测试，您今日已使用 ${used} 次。升级会员可享受无限制测试！` 
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
    
    // 会员可以访问所有年级
    if (status.isPremium) {
      return true;
    }
    
    // 免费用户检查年级限制
    const gradeStr = String(grade);
    const accessibleGrades = status.config.accessibleGrades || [];
    
    // 如果配置为空数组，表示无限制
    if (accessibleGrades.length === 0) {
      return true;
    }
    
    // 检查年级是否在可访问列表中
    return accessibleGrades.includes(gradeStr);
  }

  /**
   * 检查是否可以访问指定阶段
   */
  canAccessStage(stage) {
    const status = this.getMembershipStatus();
    
    // 会员可以访问所有阶段
    if (status.isPremium) {
      return true;
    }
    
    // 免费用户检查阶段限制
    const accessibleStages = status.config.accessibleStages || [];
    
    // 如果配置为空数组，表示无限制
    if (accessibleStages.length === 0) {
      return true;
    }
    
    // 检查阶段是否在可访问列表中
    return accessibleStages.includes(stage);
  }

  /**
   * 检查错题本容量
   */
  canAddMistake(currentCount) {
    const status = this.getMembershipStatus();
    
    // 会员无限制
    if (status.isPremium) {
      return { allowed: true, reason: '' };
    }
    
    // 免费用户检查错题本容量限制
    const limit = status.config.maxMistakeCount;
    
    // limit 为 -1 表示无限制
    if (limit === -1) {
      return { allowed: true, reason: '' };
    }
    
    // 检查是否超过限制
    if (currentCount >= limit) {
      return { 
        allowed: false, 
        reason: `免费用户错题本最多只能保存 ${limit} 个单词，您当前已有 ${currentCount} 个。升级会员可享受无限制错题本！` 
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

  /**
   * 获取累计已掌握的单词总数
   * @returns {number} 累计已掌握的单词数量
   */
  getTotalMasteredWordsCount() {
    try {
      const learningDataSync = require('./learningDataSync.js');
      const masteryMap = learningDataSync.getWordMasteryMap();
      
      let masteredCount = 0;
      Object.values(masteryMap).forEach(wordData => {
        if (wordData.masteryLevel === 'mastered' || wordData.masteryLevel === 'expert') {
          masteredCount++;
        }
      });
      
      return masteredCount;
    } catch (error) {
      console.error('获取累计已掌握单词数失败:', error);
      return 0;
    }
  }

  /**
   * 检查免费用户是否达到限制（30个单词）
   * @returns {boolean} 如果达到限制返回 true，否则返回 false
   */
  hasReachedFreeLimit() {
    const status = this.getMembershipStatus();
    if (status.isPremium) return false;

    const limit = status.config && typeof status.config.maxLearnedWords !== 'undefined'
      ? status.config.maxLearnedWords
      : 30;
    if (limit === -1) return false;

    const learned = this.getTotalMasteredWordsCount();
    return learned >= Number(limit);
  }

  /**
   * 从后端获取用户信息
   * @returns {Promise<Object>} 用户信息
   */
  async fetchUserFromBackend() {
    try {
      const { getApiUrl } = require('./apiConfig');
      const openid = this.userData.openid || wx.getStorageSync('openid');
      
      if (!openid) {
        throw new Error('未找到 openid，请先登录');
      }

      const response = await new Promise((resolve, reject) => {
        wx.request({
          url: getApiUrl(`/api/users/${openid}`),
          method: 'GET',
          timeout: 10000,
          success: (res) => {
            if (res.statusCode === 200 && res.data && res.data.success) {
              resolve(res.data);
            } else {
              reject(new Error(res.data?.message || '获取用户信息失败'));
            }
          },
          fail: (error) => {
            reject(new Error(error.errMsg || '网络请求失败'));
          }
        });
      });

      // 更新本地数据
      if (response.data) {
        const { membership, membershipExpireTime, totalTestCount, registerTime, lastActiveTime, isActivated, activatedAt } = response.data;
        if (membership !== undefined) this.userData.membership = membership;
        if (membershipExpireTime !== undefined) this.userData.membershipExpireTime = membershipExpireTime;
        if (totalTestCount !== undefined) this.userData.totalTestCount = totalTestCount;
        if (registerTime !== undefined) this.userData.registerTime = registerTime;
        if (lastActiveTime !== undefined) this.userData.lastActiveTime = lastActiveTime;
        if (isActivated !== undefined) this.userData.isActivated = isActivated;
        if (activatedAt !== undefined) this.userData.activatedAt = activatedAt;
        this.saveUserData();
      }

      return response.data;
    } catch (error) {
      console.error('从后端获取用户信息失败:', error);
      throw error;
    }
  }

  /**
   * 从后端获取用户统计信息
   * @returns {Promise<Object>} 用户统计信息
   */
  async fetchUserStatsFromBackend() {
    try {
      const { getApiUrl } = require('./apiConfig');
      const openid = this.userData.openid || wx.getStorageSync('openid');
      
      if (!openid) {
        throw new Error('未找到 openid，请先登录');
      }

      const response = await new Promise((resolve, reject) => {
        wx.request({
          url: getApiUrl(`/api/users/${openid}/stats`),
          method: 'GET',
          timeout: 10000,
          success: (res) => {
            if (res.statusCode === 200 && res.data && res.data.success) {
              resolve(res.data);
            } else {
              reject(new Error(res.data?.message || '获取用户统计失败'));
            }
          },
          fail: (error) => {
            reject(new Error(error.errMsg || '网络请求失败'));
          }
        });
      });

      // 更新本地数据
      if (response.data) {
        const { membership, dailyUsage, totalTestCount, registerTime, lastActiveTime } = response.data;
        if (membership) {
          if (membership.type !== undefined) this.userData.membership = membership.type;
          if (membership.expireTime !== undefined) this.userData.membershipExpireTime = membership.expireTime;
        }
        if (dailyUsage !== undefined) this.userData.dailyUsage = dailyUsage;
        if (totalTestCount !== undefined) this.userData.totalTestCount = totalTestCount;
        if (registerTime !== undefined) this.userData.registerTime = registerTime;
        if (lastActiveTime !== undefined) this.userData.lastActiveTime = lastActiveTime;
        this.saveUserData();
      }

      return response.data;
    } catch (error) {
      console.error('从后端获取用户统计失败:', error);
      throw error;
    }
  }
}

// 导出单例实例
const userManager = new UserManager();

module.exports = {
  userManager,
  MEMBERSHIP_TYPES,
  MEMBERSHIP_CONFIG
};
