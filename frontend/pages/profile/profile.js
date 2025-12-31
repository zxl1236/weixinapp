Page({
  data: {
    userInfo: {},
    hasUserInfo: false,
    defaultAvatar: '/images/profile.png', // 默认头像
    loadingStats: true,
    showAuthModal: false, // 是否显示授权弹窗
    studyStats: {
      totalWords: 0, // 总词汇量（所有年级）
      learnedWords: 0, // 总掌握数（所有年级）
      currentGradeWords: 0, // 当前年级词汇量
      currentGradeMastered: 0, // 当前年级已掌握
      studyDays: 0
    },
    menuItems: [
      {
        icon: '/images/progress.png',
        title: '学习进度',
        subtitle: '查看学习统计',
        url: '/pages/progressList/progressList'
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
        url: '/pages/gradeTest/gradeTest'
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
    
      // 先设置默认值，确保界面显示
      this.setData({
        studyStats: {
          totalWords: 0,
          learnedWords: 0,
          currentGradeWords: 0,
          currentGradeMastered: 0,
          studyDays: 0
        },
        loadingStats: false,
        _isLoadingStats: false // 防止重复加载的标志
      });
    
    this.loadStudyStats();
    
    // 检查是否需要显示授权弹窗（延迟检查，确保用户信息已初始化）
    setTimeout(() => {
      this.checkAndShowAuthModal();
    }, 800);
    
    // 确保至少显示年级词汇总数
    setTimeout(() => {
      this.ensureStatsDisplay();
    }, 1000);
  },

  onShow() {
    // 更新tabbar选中状态
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({
        selected: 2 // 我的页面是第3个tab
      });
    }
    
    // 确保显示数字，即使为0
    this.setData({
      studyStats: {
        totalWords: this.data.studyStats.totalWords || 0,
        learnedWords: this.data.studyStats.learnedWords || 0,
        currentGradeWords: this.data.studyStats.currentGradeWords || 0,
        currentGradeMastered: this.data.studyStats.currentGradeMastered || 0,
        studyDays: this.data.studyStats.studyDays || 0
      },
      loadingStats: false
    });
    
    // 重新初始化用户信息
    this.initUserInfo();
    
    // 检查是否需要显示授权弹窗
    this.checkAndShowAuthModal();
    
    // 只在数据可能发生变化时重新加载统计（避免重复计算）
    if (!this.data._isLoadingStats) {
      this.loadStudyStats();
    }
  },

  formatNum(n) {
    if (n == null) return '0';
    const s = Number(n).toLocaleString('zh-CN');
    return s;
  },

  // 初始化用户信息 - 从全局数据或本地存储读取
  initUserInfo() {
    const app = getApp();
    // 优先从全局数据获取，其次从本地存储获取
    const userInfo = app.globalData.userInfo || wx.getStorageSync('userInfo');
    
    if (userInfo) {
      const normalizedInfo = {
        id: userInfo.id,
        openid: userInfo.openid,
        nickname: userInfo.nickname || userInfo.nickName || '微信用户',
        avatar: userInfo.avatar || userInfo.avatarUrl || this.data.defaultAvatar,
        // 兼容旧格式
        nickName: userInfo.nickname || userInfo.nickName,
        avatarUrl: userInfo.avatar || userInfo.avatarUrl
      };
      
      const hasBasicInfo = !!(normalizedInfo.nickname || normalizedInfo.avatar);
      
      this.setData({ 
        userInfo: normalizedInfo,
        hasUserInfo: hasBasicInfo 
      });
      
      // 确保全局和本地缓存也更新
      app.globalData.userInfo = normalizedInfo;
      wx.setStorageSync('userInfo', normalizedInfo);
    } else {
      const defaultInfo = {
        nickname: '微信用户',
        avatar: this.data.defaultAvatar
      };
      this.setData({ 
        userInfo: defaultInfo,
        hasUserInfo: false 
      });
      wx.setStorageSync('userInfo', defaultInfo);
    }
  },

  // 检查并显示授权弹窗
  checkAndShowAuthModal() {
    // 检查是否已授权用户信息
    const userInfo = this.data.userInfo;
    const hasUserInfo = this.data.hasUserInfo;
    
    // 检查用户信息中是否有昵称或头像（更准确的判断）
    const hasNicknameOrAvatar = userInfo && (userInfo.nickname || userInfo.nickName || userInfo.avatar || userInfo.avatarUrl);
    
    // 如果未授权（既没有 hasUserInfo 标志，也没有昵称或头像），且弹窗未显示过，则显示授权弹窗
    // 使用本地存储标记，避免每次进入都弹窗
    const authModalShown = wx.getStorageSync('profile_auth_modal_shown');
    
    if (!hasUserInfo && !hasNicknameOrAvatar && !authModalShown && !this.data.showAuthModal) {
      // 延迟显示，让页面先加载完成
      setTimeout(() => {
        this.setData({
          showAuthModal: true
        });
      }, 500);
    }
  },

  // 关闭授权弹窗
  closeAuthModal() {
    this.setData({
      showAuthModal: false
    });
    // 标记已显示过，避免重复弹出
    wx.setStorageSync('profile_auth_modal_shown', true);
  },

  // 选择头像（新API：chooseAvatar）
  onChooseAvatar(e) {
    const { avatarUrl } = e.detail;
    
    // 注意：这里的 avatarUrl 只是一个临时的本地路径
    // 只更新本地显示，等用户点击"保存并同步"按钮时再上传到服务器
    this.setData({
      'userInfo.avatar': avatarUrl,
      'userInfo.avatarUrl': avatarUrl
    });
    
    wx.showToast({ 
      title: '头像已选择，请点击保存', 
      icon: 'none',
      duration: 1500
    });
  },

  // 上传头像到服务器
  async uploadAvatar(avatarUrl) {
    try {
      const app = getApp();
      
      // 尝试从多个地方获取 openid
      let openid = null;
      let currentUserInfo = app.globalData.userInfo || wx.getStorageSync('userInfo');
      
      if (currentUserInfo?.openid) {
        openid = currentUserInfo.openid;
      }
      if (!openid) {
        openid = wx.getStorageSync('openid');
      }
      if (!openid) {
        try {
          const { userManager } = require('../../utils/userManager');
          if (userManager && userManager.userData && userManager.userData.openid) {
            openid = userManager.userData.openid;
          }
        } catch (e) {
          // userManager 可能不存在，忽略
        }
      }
      
      if (!openid) {
        console.warn('未找到 openid，头像仅保存到本地');
        // 即使没有openid，也保存到本地存储
        const localUserInfo = {
          ...this.data.userInfo,
          avatar: avatarUrl,
          avatarUrl: avatarUrl
        };
        app.globalData.userInfo = localUserInfo;
        wx.setStorageSync('userInfo', localUserInfo);
        return;
      }

      // 尝试上传文件到服务器（如果后端支持）
      // 如果后端不支持文件上传，则直接使用临时路径
      try {
        const { getApiUrl } = require('../../utils/apiConfig');
        const uploadRes = await new Promise((resolve, reject) => {
          wx.uploadFile({
            url: getApiUrl('/api/users/upload-avatar'),
            filePath: avatarUrl,
            name: 'avatar',
            formData: {
              openid: openid
            },
            success: (res) => {
              try {
                const data = JSON.parse(res.data);
                if (data.success && data.data && data.data.avatarUrl) {
                  resolve(data.data.avatarUrl);
                } else {
                  reject(new Error(data.message || '上传失败'));
                }
              } catch (e) {
                reject(new Error('解析响应失败'));
              }
            },
            fail: reject
          });
        });

        // 使用服务器返回的永久链接更新用户信息
        await this.syncUserInfoToBackend({
          avatarUrl: uploadRes,
          avatar: uploadRes
        });
      } catch (uploadError) {
        // 如果上传失败，直接使用临时路径更新用户信息
        console.warn('头像上传失败，使用临时路径:', uploadError);
        await this.syncUserInfoToBackend({
          avatarUrl: avatarUrl,
          avatar: avatarUrl
        });
      }
    } catch (error) {
      console.warn('处理头像失败（不影响使用）:', error);
      // 即使失败，也保存本地路径
      const app = getApp();
      const localUserInfo = {
        ...this.data.userInfo,
        avatar: avatarUrl,
        avatarUrl: avatarUrl
      };
      app.globalData.userInfo = localUserInfo;
      wx.setStorageSync('userInfo', localUserInfo);
    }
  },

  // 昵称输入变化事件（新API：bind:change）
  onInputChange(e) {
    const nickName = e.detail.value;
    // 只更新本地显示，不立即同步到后端
    this.setData({
      'userInfo.nickname': nickName,
      'userInfo.nickName': nickName
    });
  },

  // 昵称输入失焦事件
  onNicknameBlur(e) {
    const nickname = e.detail.value;
    // 失焦时不自动同步，等用户点击"保存并同步"按钮
    if (nickname && nickname.trim()) {
      this.setData({
        'userInfo.nickname': nickname.trim(),
        'userInfo.nickName': nickname.trim()
      });
    }
  },

  // 昵称提交事件
  onNicknameSubmit(e) {
    const nickname = e.detail.value.nickname;
    if (nickname && nickname.trim()) {
      this.updateNickname(nickname.trim());
    }
  },

  // 更新昵称
  async updateNickname(nickname) {
    let loadingShown = false;
    try {
      // 显示加载提示
      wx.showLoading({
        title: '更新中...',
        mask: true
      });
      loadingShown = true;
      
      // 先更新本地显示
      this.setData({
        'userInfo.nickname': nickname,
        'userInfo.nickName': nickname
      });

      // 同步到服务器
      await this.syncUserInfoToBackend({
        nickName: nickname,
        nickname: nickname
      });

      // 隐藏加载提示
      if (loadingShown) {
        wx.hideLoading();
        loadingShown = false;
      }

      wx.showToast({ 
        title: '昵称已更新', 
        icon: 'success',
        duration: 1500
      });
      
      // 触觉反馈
      wx.vibrateShort({
        type: 'light'
      });
    } catch (error) {
      // 确保隐藏加载提示
      if (loadingShown) {
        wx.hideLoading();
        loadingShown = false;
      }
      
      console.error('更新昵称失败:', error);
      wx.showToast({ 
        title: '昵称更新失败', 
        icon: 'none',
        duration: 1500
      });
    }
  },

  /**
   * 使用微信授权获取头像和昵称，并同步到后端 - 暂时禁用
   */
  async onGetUserProfile() {
    // 临时禁用登录功能，避免 getUserProfile TAP gesture 错误
    console.log('用户信息获取功能暂时禁用');
    return;
  },

  // 提交用户信息到后端（保存并同步）
  async submitUserInfo() {
    const { userInfo } = this.data;
    const nickName = userInfo.nickname || userInfo.nickName || '';
    const avatarUrl = userInfo.avatar || userInfo.avatarUrl || '';

    // 验证昵称
    if (!nickName || nickName.trim() === '' || nickName.trim() === '微信用户') {
      wx.showToast({ 
        title: '请填写昵称', 
        icon: 'none',
        duration: 1500
      });
      return;
    }

    const trimmedNickName = nickName.trim();

    try {
      wx.showLoading({
        title: '保存中...',
        mask: true
      });

      // 如果头像存在且是临时路径，先上传到服务器获取永久链接
      let finalAvatarUrl = avatarUrl;
      if (avatarUrl && avatarUrl.startsWith('http://tmp/') || avatarUrl.startsWith('wxfile://')) {
        // 临时路径，需要上传
        try {
          await this.uploadAvatar(avatarUrl);
          // uploadAvatar 内部会更新 userInfo.avatar
          finalAvatarUrl = this.data.userInfo.avatar || this.data.userInfo.avatarUrl || avatarUrl;
        } catch (uploadError) {
          console.warn('头像上传失败，使用临时路径:', uploadError);
          // 即使上传失败，也使用临时路径继续
        }
      }

      // 同步到后端
      await this.syncUserInfoToBackend({
        nickName: trimmedNickName,
        nickname: trimmedNickName,
        avatarUrl: finalAvatarUrl,
        avatar: finalAvatarUrl
      });

      wx.hideLoading();
      wx.showToast({ 
        title: '保存成功', 
        icon: 'success',
        duration: 1500
      });

      // 更新 hasUserInfo 状态
      this.setData({
        hasUserInfo: true
      });

    } catch (error) {
      wx.hideLoading();
      console.error('保存用户信息失败:', error);
      wx.showToast({ 
        title: '保存失败，请重试', 
        icon: 'none',
        duration: 1500
      });
    }
  },

  // 跳转到设置页面（关闭弹窗，让用户直接设置）
  goToSetProfile() {
    this.setData({
      showAuthModal: false
    });
    wx.removeStorageSync('profile_auth_modal_shown');
    // 页面滚动到用户卡片位置
    setTimeout(() => {
      wx.pageScrollTo({
        scrollTop: 0,
        duration: 300
      });
    }, 100);
  },

  // 同步用户信息到后台
  async syncUserInfoToBackend(userInfo) {
    try {
      const { getApiUrl } = require('../../utils/apiConfig');
      const app = getApp();
      
      // 尝试从多个地方获取 openid
      let openid = null;
      let currentUserInfo = app.globalData.userInfo || wx.getStorageSync('userInfo');
      
      // 1. 从 userInfo 对象中获取
      if (currentUserInfo?.openid) {
        openid = currentUserInfo.openid;
      }
      
      // 2. 从本地存储直接获取
      if (!openid) {
        openid = wx.getStorageSync('openid');
      }
      
      // 3. 从 userManager 获取
      if (!openid) {
        try {
          const { userManager } = require('../../utils/userManager');
          if (userManager && userManager.userData && userManager.userData.openid) {
            openid = userManager.userData.openid;
          }
        } catch (e) {
          // userManager 可能不存在，忽略
        }
      }
      
      // 4. 如果还是没有，尝试通过 code 登录获取
      if (!openid) {
        try {
          const loginRes = await new Promise((resolve, reject) => {
            wx.login({
              success: resolve,
              fail: reject
            });
          });
          
          if (loginRes.code) {
            const { getApiUrl } = require('../../utils/apiConfig');
            const registerRes = await new Promise((resolve, reject) => {
              wx.request({
                url: getApiUrl('/api/users/register'),
                method: 'POST',
                data: {
                  code: loginRes.code,
                  nickname: userInfo.nickName || userInfo.nickname || '微信用户',
                  avatar: userInfo.avatarUrl || userInfo.avatar || ''
                },
                success: (res) => {
                  if (res.statusCode === 200 && res.data.success) {
                    resolve(res.data);
                  } else {
                    reject(new Error(res.data.message || '登录失败'));
                  }
                },
                fail: reject
              });
            });
            
            if (registerRes.data && registerRes.data.openid) {
              openid = registerRes.data.openid;
              currentUserInfo = registerRes.data;
              // 保存到全局和本地存储
              app.globalData.userInfo = registerRes.data;
              wx.setStorageSync('userInfo', registerRes.data);
              wx.setStorageSync('openid', openid);
            }
          }
        } catch (loginError) {
          console.warn('尝试登录获取 openid 失败:', loginError);
        }
      }
      
      if (!openid) {
        console.warn('未找到 openid，仅更新本地显示');
        // 即使没有openid，也更新本地显示
        const localUserInfo = {
          ...this.data.userInfo,
          ...(userInfo.nickname && { nickname: userInfo.nickname, nickName: userInfo.nickname }),
          ...(userInfo.nickName && { nickname: userInfo.nickName, nickName: userInfo.nickName }),
          ...(userInfo.avatar && { avatar: userInfo.avatar, avatarUrl: userInfo.avatar }),
          ...(userInfo.avatarUrl && { avatar: userInfo.avatarUrl, avatarUrl: userInfo.avatarUrl })
        };
        app.globalData.userInfo = localUserInfo;
        wx.setStorageSync('userInfo', localUserInfo);
        this.setData({
          userInfo: localUserInfo,
          hasUserInfo: !!(localUserInfo.nickname || localUserInfo.avatar)
        });
        return;
      }

      // 准备更新的数据（只使用传入的参数，不使用 currentUserInfo）
      const updateData = {};
      
      // 优先使用 nickName（微信返回的字段），其次使用 nickname
      // 确保不使用 currentUserInfo 中的默认值
      if (userInfo.nickName) {
        updateData.nickname = userInfo.nickName;
      } else if (userInfo.nickname) {
        updateData.nickname = userInfo.nickname;
      }
      
      // 优先使用 avatarUrl（微信返回的字段），其次使用 avatar
      if (userInfo.avatarUrl) {
        updateData.avatar = userInfo.avatarUrl;
      } else if (userInfo.avatar) {
        updateData.avatar = userInfo.avatar;
      }

      // 调试日志：确认发送给后端的数据
      // 使用更新接口（PUT /api/users/:openid）
      const response = await new Promise((resolve, reject) => {
        wx.request({
          url: getApiUrl(`/api/users/${openid}`),
          method: 'PUT',
          data: updateData,
          success: (res) => {
            if (res.statusCode === 200 && res.data.success) {
              resolve(res.data);
            } else {
              // 如果更新接口失败，尝试使用注册接口
              reject(new Error(res.data.message || '更新失败'));
            }
          },
          fail: reject
        });
      });

      // 更新成功后，更新全局和本地存储的用户信息
      if (response && response.data) {
        // 优先使用我们传入的数据（微信返回的真实数据），其次使用后端返回的数据
        // 这样可以确保即使后端返回旧数据，我们也能使用最新的微信数据
        const backendData = response.data;
        const finalNickname = updateData.nickname || backendData.nickname || currentUserInfo.nickname;
        const finalAvatar = updateData.avatar || backendData.avatar || currentUserInfo.avatar;
        
        const updatedUserInfo = {
          ...currentUserInfo,
          ...backendData,
          // 确保使用最新的数据
          nickname: finalNickname,
          nickName: finalNickname,
          avatar: finalAvatar,
          avatarUrl: finalAvatar
        };
        
        // 更新全局和本地存储
        app.globalData.userInfo = updatedUserInfo;
        wx.setStorageSync('userInfo', updatedUserInfo);
        
        // 使用路径更新方式，确保 input 和 image 组件能够响应
        this.setData({
          'userInfo.nickname': finalNickname,
          'userInfo.nickName': finalNickname,
          'userInfo.avatar': finalAvatar,
          'userInfo.avatarUrl': finalAvatar,
          'userInfo.id': updatedUserInfo.id || this.data.userInfo.id,
          'userInfo.openid': updatedUserInfo.openid || openid,
          hasUserInfo: !!(finalNickname || finalAvatar)
        });
      }
    } catch (error) {
      // 如果更新接口失败，尝试使用注册接口
      try {
        const { getApiUrl } = require('../../utils/apiConfig');
        const app = getApp();
        
        // 重新获取 openid（使用相同的逻辑）
        let fallbackOpenid = null;
        let fallbackUserInfo = app.globalData.userInfo || wx.getStorageSync('userInfo');
        
        if (fallbackUserInfo?.openid) {
          fallbackOpenid = fallbackUserInfo.openid;
        }
        if (!fallbackOpenid) {
          fallbackOpenid = wx.getStorageSync('openid');
        }
        if (!fallbackOpenid) {
          try {
            const { userManager } = require('../../utils/userManager');
            if (userManager && userManager.userData && userManager.userData.openid) {
              fallbackOpenid = userManager.userData.openid;
            }
          } catch (e) {
            // userManager 可能不存在，忽略
          }
        }
        
        if (fallbackOpenid) {
          const response = await new Promise((resolve, reject) => {
            wx.request({
              url: getApiUrl('/api/users/register'),
              method: 'POST',
              data: {
                openid: fallbackOpenid,
                nickname: userInfo.nickName || userInfo.nickname || fallbackUserInfo?.nickname,
                avatar: userInfo.avatarUrl || userInfo.avatar || fallbackUserInfo?.avatar
              },
              success: (res) => {
                if (res.statusCode === 200 && res.data.success) {
                  resolve(res.data);
                } else {
                  reject(new Error(res.data.message || '同步失败'));
                }
              },
              fail: reject
            });
          });

          if (response.data) {
            const updatedUserInfo = response.data;
            app.globalData.userInfo = updatedUserInfo;
            wx.setStorageSync('userInfo', updatedUserInfo);
            
            this.setData({
              userInfo: {
                id: updatedUserInfo.id,
                openid: updatedUserInfo.openid,
                nickname: updatedUserInfo.nickname || '微信用户',
                avatar: updatedUserInfo.avatar || this.data.defaultAvatar,
                nickName: updatedUserInfo.nickname,
                avatarUrl: updatedUserInfo.avatar
              },
              hasUserInfo: true
            });
          }
        }
      } catch (fallbackError) {
        // 静默失败，不影响用户使用
        console.warn('同步用户信息失败（不影响使用）:', fallbackError.message || fallbackError);
        // 即使同步失败，也更新本地显示
        const app = getApp();
        const localUserInfo = {
          ...this.data.userInfo,
          ...(userInfo.nickname && { nickname: userInfo.nickname, nickName: userInfo.nickname }),
          ...(userInfo.nickName && { nickname: userInfo.nickName, nickName: userInfo.nickName }),
          ...(userInfo.avatar && { avatar: userInfo.avatar, avatarUrl: userInfo.avatar }),
          ...(userInfo.avatarUrl && { avatar: userInfo.avatarUrl, avatarUrl: userInfo.avatarUrl })
        };
        app.globalData.userInfo = localUserInfo;
        wx.setStorageSync('userInfo', localUserInfo);
        this.setData({
          userInfo: localUserInfo,
          hasUserInfo: !!(localUserInfo.nickname || localUserInfo.avatar)
        });
      }
    }
  },



  loadStudyStats() {
    // 🔧 优化：防止重复加载
    if (this.data._isLoadingStats) {
      return;
    }
    
    this.setData({ 
      loadingStats: true,
      _isLoadingStats: true 
    });
    try {
      // 引入学习数据同步工具和年级数据库
      const learningDataSync = require('../../utils/learningDataSync.js');
      const { getGradeWordCount } = require('../../utils/gradeWordDatabase.js');
      
      // 获取当前选中的年级
      const selectedGrade = wx.getStorageSync('SELECTED_GRADE');

      const allGradeIds = [
        'grade3_1', 'grade3_2', 'grade4_1', 'grade4_2', 
        'grade5_1', 'grade5_2', 'grade6_1', 'grade6_2',
        'grade7_1', 'grade7_2', 'grade8_1', 'grade8_2', 
        'grade9_1', 'grade9_2'
      ];
      
      // 计算全局总词汇数和全局已掌握数
      let globalTotalWords = 0;
      let globalMasteredWords = 0;
      
      // 遍历所有年级，统计全局数据
      allGradeIds.forEach(gradeId => {
        const gradeTotalWords = getGradeWordCount(gradeId);
        if (gradeTotalWords > 0) {
          globalTotalWords += gradeTotalWords;
          
          // 获取该年级的学习进度
          const gradeProgress = learningDataSync.getGradeLearningProgress(gradeId);
          globalMasteredWords += gradeProgress.mastered || 0;
        }
      });

      let currentGradeWords = 0;
      let currentGradeMastered = 0;
      
      if (selectedGrade) {
        try {
          currentGradeWords = getGradeWordCount(selectedGrade);
          const currentGradeProgress = learningDataSync.getGradeLearningProgress(selectedGrade);
          currentGradeMastered = currentGradeProgress.mastered || 0;
        } catch (e) {
        }
      }
      
      // 计算连续学习天数
      const dailyStats = learningDataSync.getDailyLearningStats();
      const continuousDays = this.calculateContinuousDays(dailyStats);

      if (globalMasteredWords === 0 && currentGradeMastered === 0 && continuousDays === 0) {

        const hasAnyLearning = this.checkForAnyLearningData();
        
        if (!hasAnyLearning) {

          const exampleData = this.getExampleData(selectedGrade);
          this.setData({
            'studyStats.totalWords': exampleData.totalWords || globalTotalWords,
            'studyStats.learnedWords': exampleData.learnedWords || 0,
            'studyStats.currentGradeWords': currentGradeWords || exampleData.totalWords || 0,
            'studyStats.currentGradeMastered': 0,
            'studyStats.studyDays': exampleData.studyDays || 0
          });
        } else {
          this.setData({
            'studyStats.totalWords': globalTotalWords,
            'studyStats.learnedWords': globalMasteredWords,
            'studyStats.currentGradeWords': currentGradeWords,
            'studyStats.currentGradeMastered': currentGradeMastered,
            'studyStats.studyDays': continuousDays
          });
        }
      } else {
        this.setData({
          'studyStats.totalWords': globalTotalWords,
          'studyStats.learnedWords': globalMasteredWords,
          'studyStats.currentGradeWords': currentGradeWords,
          'studyStats.currentGradeMastered': currentGradeMastered,
          'studyStats.studyDays': continuousDays
        });
      }
      
    } catch (e) {
      console.error('❌ 加载学习统计失败:', e);
      // 设置默认值
      this.setData({
        'studyStats.totalWords': 0,
        'studyStats.learnedWords': 0,
        'studyStats.currentGradeWords': 0,
        'studyStats.currentGradeMastered': 0,
        'studyStats.studyDays': 0
      });
    } finally {
      this.setData({ 
        loadingStats: false,
        _isLoadingStats: false // 重置加载标志
      });
    }
  },

  // 检查是否有任何学习数据
  checkForAnyLearningData() {
    try {
      // 检查各种可能的学习数据存储
      const keys = [
        'WORD_MASTERY_MAP',
        'DAILY_LEARNING_STATS', 
        'LEARNING_SESSION_HISTORY'
      ];
      
      for (const key of keys) {
        const data = wx.getStorageSync(key);
        if (data && (typeof data === 'object' ? Object.keys(data).length > 0 : data.length > 0)) {
          return true;
        }
      }
      
      // 检查年级学习进度
      const selectedGrade = wx.getStorageSync('SELECTED_GRADE');
      if (selectedGrade) {
        const gradeProgress = wx.getStorageSync(`LEARNING_PROGRESS_${selectedGrade}`);
        if (gradeProgress && Object.keys(gradeProgress).length > 0) {
          return true;
        }
      }
      
      return false;
    } catch (e) {
      return false;
    }
  },

  // 获取示例数据
  getExampleData(selectedGrade) {

    try {
      const { getGradeWordCount } = require('../../utils/gradeWordDatabase.js');
      const totalWords = getGradeWordCount(selectedGrade);
      if (totalWords > 0) {
        return { totalWords, learnedWords: 0, studyDays: 0 };
      }
    } catch (error) {
      console.warn('⚠️ 获取词汇总数失败，使用默认值:', error);
    }
    
    // 回退到默认值
    const gradeExamples = {
      'grade1': { totalWords: 50, learnedWords: 0, studyDays: 0 },
      'grade2': { totalWords: 80, learnedWords: 0, studyDays: 0 },
      'grade3': { totalWords: 100, learnedWords: 0, studyDays: 0 },
      'grade4': { totalWords: 120, learnedWords: 0, studyDays: 0 },
      'grade5': { totalWords: 150, learnedWords: 0, studyDays: 0 },
      'grade6': { totalWords: 180, learnedWords: 0, studyDays: 0 },
      'grade7': { totalWords: 200, learnedWords: 0, studyDays: 0 },
      'grade8': { totalWords: 220, learnedWords: 0, studyDays: 0 },
      'grade9': { totalWords: 250, learnedWords: 0, studyDays: 0 }
    };
    
    const exampleData = gradeExamples[selectedGrade] || { totalWords: 0, learnedWords: 0, studyDays: 0 };
    return exampleData;
  },

  // 计算连续学习天数 - 与日历保持一致
  calculateContinuousDays(dailyStats) {
    if (!dailyStats || Object.keys(dailyStats).length === 0) return 0;
    
    const today = this.formatDate(new Date());
    const studyDates = Object.keys(dailyStats).sort().reverse(); // 从最新到最旧
    
    if (studyDates.length === 0) return 0;
    
    // 找到最近的学习日期（可能是今天，也可能是昨天或更早）
    const latestStudyDate = studyDates[0];
    const latestDate = new Date(latestStudyDate);
    const todayDate = new Date(today);
    
    // 🔧 修复：如果最近的学习日期是今天或昨天，说明连续学习可能还在继续
    // 如果最近的学习日期是2天前或更早，说明连续学习已经中断
    const daysSinceLatestStudy = Math.floor((todayDate - latestDate) / (1000 * 60 * 60 * 24));
    
    // 如果最近的学习日期是2天前或更早，连续学习已经中断，返回0
    if (daysSinceLatestStudy > 1) {
      return 0;
    }
    
    // 从最近的学习日期开始往前计算连续天数
    let continuousDays = 0;
    let currentDate = new Date(latestDate);
    
    // 从最近的学习日期开始往前计算连续天数
    for (let i = 0; i < 365; i++) { // 最多检查365天
      const dateStr = this.formatDate(currentDate);
      
      if (studyDates.includes(dateStr)) {
        continuousDays++;
      } else {
        // 中断了连续学习
        break;
      }
      
      // 往前推一天
      currentDate.setDate(currentDate.getDate() - 1);
    }
    
    return continuousDays;
  },

  // 格式化日期为 YYYY-MM-DD
  formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  },

  navigateToPage(e) {
    const url = e.currentTarget.dataset.url;
    if (url) {
      // 学习进度页面直接跳转到进度列表页面（不需要年级参数）
      if (url.includes('/pages/progressList/progressList')) {
        wx.navigateTo({
          url: url,
          fail: (err) => {
            console.error('页面跳转失败:', err);
            wx.showToast({
              title: '页面跳转失败',
              icon: 'none'
            });
          }
        });
        return;
      }
      
      wx.navigateTo({
        url: url,
        fail: (err) => {
          console.error('页面跳转失败:', err);
          wx.showToast({
            title: '页面跳转失败',
            icon: 'none'
          });
        }
      });
    }
  },

  // 数据同步方法
  syncUserData() {
    try {
      // 只在非加载状态下才重新加载统计（避免重复计算）
      if (!this.data._isLoadingStats) {
        this.loadStudyStats();
      }
      
    } catch (error) {
      console.error('❌ 数据同步失败:', error);
    }
  },

  // 确保统计数据正确显示
  ensureStatsDisplay() {
    // 如果统计数据为空，强制设置年级词汇总数
    if (!this.data.studyStats || 
        (this.data.studyStats.totalWords === 0 && 
         this.data.studyStats.learnedWords === 0 && 
         this.data.studyStats.studyDays === 0)) {
      
      const selectedGrade = wx.getStorageSync('SELECTED_GRADE');
      if (selectedGrade) {
        try {
          const { getGradeWordCount } = require('../../utils/gradeWordDatabase.js');
          const totalWords = getGradeWordCount(selectedGrade);
          
          if (totalWords > 0) {
            this.setData({
              'studyStats.totalWords': totalWords,
              'studyStats.learnedWords': 0,
              'studyStats.currentGradeWords': totalWords,
              'studyStats.currentGradeMastered': 0,
              'studyStats.studyDays': 0
            });
          }
        } catch (e) {
          // 使用默认的年级词汇数
          const defaultCounts = {
            'grade1': 50, 'grade2': 80, 'grade3': 100, 'grade4': 120,
            'grade5': 150, 'grade6': 180, 'grade7': 200, 'grade8': 220, 'grade9': 250
          };
          const totalWords = defaultCounts[selectedGrade] || 100;
          
          this.setData({
            'studyStats.totalWords': totalWords,
            'studyStats.learnedWords': 0,
            'studyStats.currentGradeWords': totalWords,
            'studyStats.currentGradeMastered': 0,
            'studyStats.studyDays': 0
          });
        }
      }
    }
  },

  onPullDownRefresh() {
    this.initUserInfo();
    // 重置加载标志，允许刷新时重新加载
    this.setData({ _isLoadingStats: false });
    this.loadStudyStats();
    this.syncUserData();
    wx.stopPullDownRefresh();
  }
});