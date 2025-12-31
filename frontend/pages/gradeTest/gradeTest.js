// 水平测试页面
const learningDataSync = require('../../utils/learningDataSync.js');
const { gradeStructure, getGradeWordCount } = require('../../utils/gradeWordDatabase.js');
const { userManager } = require('../../utils/userManager.js');

const STAGE_META = {
  primary: {
    id: 'primary',
    name: '小学阶段',
    description: '基础词汇学习',
    icon: '🎒',
    defaultTestWords: 10
  },
  junior: {
    id: 'junior',
    name: '初中阶段',
    description: '进阶词汇学习',
    icon: '📚',
    defaultTestWords: 12
  }
};

const GRADE_NAME_MAP = {
  grade3_1: '三年级上',
  grade3_2: '三年级下',
  grade4_1: '四年级上',
  grade4_2: '四年级下',
  grade5_1: '五年级上',
  grade5_2: '五年级下',
  grade6_1: '六年级上',
  grade6_2: '六年级下',
  grade7_1: '初一上',
  grade7_2: '初一下',
  grade8_1: '初二上',
  grade8_2: '初二下',
  grade9_1: '初三上',
  grade9_2: '初三下'
};

function extractGradeNumber(gradeId) {
  const m = String(gradeId || '').match(/^grade(\d+)_/);
  return m ? Number(m[1]) : null;
}

function showBlockedModal(message) {
  wx.showModal({
    title: '功能限制',
    content: `${message}\n\n升级会员即可解锁全部功能！`,
    confirmText: '立即升级',
    cancelText: '返回',
    success: (res) => {
      if (res.confirm) {
        wx.navigateTo({ url: '/pages/payment/payment' });
      } else {
        wx.navigateBack();
      }
    }
  });
}

Page({
  data: {
    showGradeList: false, // 是否显示年级列表
    selectedStageData: null, // 选中阶段的详细数据
    expandedGrade: '', // 当前展开进度详情的年级
    stages: []
  },

  onLoad(options) {
    this.initializeStages();
  },

  onShow() {
    // 页面显示时刷新数据
    this.loadGradeProgress();
    
    // 如果当前显示年级列表，更新selectedStageData为最新的数据
    if (this.data.showGradeList && this.data.selectedStageData) {
      const currentStageId = this.data.selectedStageData.id;
      const updatedStageData = this.data.stages.find(stage => stage.id === currentStageId);
      this.setData({
        selectedStageData: updatedStageData
      });
    }
  },

  // 选择学习阶段
  selectStage(e) {
    const stageId = e.currentTarget.dataset.stage;
    const stageData = this.data.stages.find(stage => stage.id === stageId);

    // 移除阶段限制检查，现在免费用户可以访问所有阶段
    this.setData({
      selectedStageData: stageData,
      showGradeList: true
    });

    // 确保显示的是最新的数据（因为loadGradeProgress已经在onLoad/onShow中更新了stages）
    // 不需要再次调用loadStageProgress，直接使用已更新的stageData即可
  },

  // 返回阶段选择
  backToStages() {
    this.setData({
      showGradeList: false,
      selectedStageData: null,
      expandedGrade: ''
    });
  },

  /**
   * 加载各年级学习进度
   */
  loadGradeProgress() {
    try {
      // 更新所有阶段的真实词汇数量和学习进度
      const updatedStages = this.data.stages.map(stage => {
        const updatedGrades = stage.grades.map(grade => {
          // 获取实际的词汇总数
          const actualWordCount = getGradeWordCount(grade.id);
          
          // 使用学习数据同步管理器获取统计
          const learningProgress = learningDataSync.getGradeLearningProgress(grade.id);
          
          // 计算掌握率
          const mastery = actualWordCount > 0 ? Math.round((learningProgress.mastered / actualWordCount) * 100) : 0;
          return {
            ...grade,
            totalWords: actualWordCount,
            mastery,
            mastered: learningProgress.mastered,
            incorrect: learningProgress.incorrect,
            unlearned: actualWordCount - learningProgress.mastered - learningProgress.incorrect
          };
        });
        
        return {
          ...stage,
          grades: updatedGrades
        };
      });
      
      this.setData({
        stages: updatedStages
      });
      
      // 如果当前有选中的阶段，也要更新
      if (this.data.selectedStageData) {
        const updatedSelectedStage = updatedStages.find(stage => stage.id === this.data.selectedStageData.id);
        this.setData({
          selectedStageData: updatedSelectedStage
        });
      }
    } catch (error) {
      console.error('❌ 加载年级学习进度失败:', error);
    }
  },

  initializeStages() {
    const stages = Object.keys(STAGE_META).map(stageKey => {
      const meta = STAGE_META[stageKey];
      const stageGrades = gradeStructure[stageKey] || {};
      const gradeIds = Object.keys(stageGrades)
        .filter(gradeId => stageGrades[gradeId].enabled !== false)
        .sort((a, b) => (stageGrades[a].level || 0) - (stageGrades[b].level || 0));

      const grades = gradeIds.map(gradeId => ({
        id: gradeId,
        name: GRADE_NAME_MAP[gradeId] || gradeId,
        testWords: meta.defaultTestWords,
        totalWords: 0,
        mastery: 0,
        mastered: 0,
        incorrect: 0,
        unlearned: 0
      }));

      return {
        ...meta,
        grades
      };
    });

    this.setData({
      stages
    }, () => {
      this.loadGradeProgress();
    });
  },

  /**
   * 切换进度详情展开/折叠
   */
  toggleProgress(e) {
    const gradeId = e.currentTarget.dataset.grade;
    const currentExpanded = this.data.expandedGrade;
    
    // 如果点击的是当前展开的年级，则折叠；否则展开新的年级
    this.setData({
      expandedGrade: currentExpanded === gradeId ? '' : gradeId
    });
  },

  /**
   * 查看单词列表
   */
  viewWordList(e) {
    const gradeId = e.currentTarget.dataset.grade;
    const gradeData = this.data.selectedStageData?.grades?.find(g => g.id === gradeId);
    
    if (!gradeData) {
      wx.showToast({
        title: '年级数据错误',
        icon: 'error'
      });
      return;
    }

    // 跳转到单词列表页面
    wx.navigateTo({
      url: `/pages/wordList/wordList?grade=${gradeId}&gradeName=${encodeURIComponent(gradeData.name)}`
    });
  },

  /**
   * 开始年级训练
   */
  startGradeTraining(e) {
    const gradeId = e.currentTarget.dataset.grade;
    const gradeData = this.data.selectedStageData?.grades?.find(g => g.id === gradeId);
    
    if (!gradeData) {
      wx.showToast({
        title: '年级数据错误',
        icon: 'error'
      });
      return;
    }

    // 非会员年级限制
    const gradeNum = extractGradeNumber(gradeId);
    if (gradeNum !== null && !userManager.canAccessGrade(gradeNum)) {
      const membershipStatus = userManager.getMembershipStatus();
      const accessibleGrades = (membershipStatus.config.accessibleGrades || []).join('、') || '当前开放年级';
      showBlockedModal(`免费版仅支持访问 ${accessibleGrades} 年级内容`);
      return;
    }

    wx.showLoading({
      title: '准备训练...'
    });

    setTimeout(() => {
      wx.hideLoading();
      
      // 跳转到 learning 页面进行训练
      wx.navigateTo({
        url: `/pages/learning/learning?grade=${gradeId}&gradeName=${encodeURIComponent(gradeData.name)}&quantity=20&mode=normal`
      });
    }, 800);
  },

  // 开始年级测试
  startGradeTest(e) {
    const gradeId = e.currentTarget.dataset.grade;
    const gradeData = this.data.selectedStageData?.grades?.find(g => g.id === gradeId);
    
    if (!gradeData) {
      wx.showToast({
        title: '年级数据错误',
        icon: 'error'
      });
      return;
    }

    // 非会员年级限制
    const gradeNum = extractGradeNumber(gradeId);
    if (gradeNum !== null && !userManager.canAccessGrade(gradeNum)) {
      const membershipStatus = userManager.getMembershipStatus();
      const accessibleGrades = (membershipStatus.config.accessibleGrades || []).join('、') || '当前开放年级';
      showBlockedModal(`免费版仅支持访问 ${accessibleGrades} 年级内容`);
      return;
    }

    const canTest = userManager.canTakeTest();
    if (!canTest.allowed) {
      showBlockedModal(canTest.reason);
      return;
    }

    // 水平测试：抽取20-30个单词进行四选一测试
    const testCount = Math.min(Math.max(gradeData.testWords || 20, 20), 30); // 限制在20-30之间
    
    wx.showModal({
      title: '水平测试确认',
      content: `即将开始${gradeData.name}水平测试，共${testCount}题，通过小样本检测来估算您对这本书的掌握情况，确认开始吗？`,
      confirmText: '开始测试',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          wx.showLoading({
            title: '准备水平测试...'
          });

          setTimeout(() => {
            wx.hideLoading();
            
            // 跳转到独立的水平测试页面
            wx.navigateTo({
              url: `/pages/levelTest/levelTest?grade=${gradeId}&gradeName=${encodeURIComponent(gradeData.name)}&quantity=${testCount}`
            });
          }, 800);
        }
      }
    });
  },

  // 返回首页
  goHome() {
    wx.navigateBack();
  },

  // 分享功能
  onShareAppMessage() {
    return {
      title: 'K12词汇水平测试 - 精准评估词汇水平',
      path: '/pages/index/index'
    };
  }
});