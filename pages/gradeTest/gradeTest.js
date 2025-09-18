// 水平测试页面
const { learningDataSync } = require('../../utils/learningDataSync.js');

Page({
  data: {
    showGradeList: false, // 是否显示年级列表
    selectedStageData: null, // 选中阶段的详细数据
    expandedGrade: '', // 当前展开进度详情的年级
    
    // K12三个阶段定义
    stages: [
      {
        id: 'primary',
        name: '小学阶段',
        description: '基础词汇学习',
        icon: '🎒',
        grades: [
          { id: 'grade3', name: '三年级', testWords: 15, totalWords: 96, mastery: 0, mastered: 0, incorrect: 2, unlearned: 94 },
          { id: 'grade4', name: '四年级', testWords: 20, totalWords: 175, mastery: 0, mastered: 0, incorrect: 0, unlearned: 175 },
          { id: 'grade5', name: '五年级', testWords: 20, totalWords: 285, mastery: 0, mastered: 0, incorrect: 0, unlearned: 285 },
          { id: 'grade6', name: '六年级', testWords: 20, totalWords: 312, mastery: 0, mastered: 0, incorrect: 0, unlearned: 312 }
        ]
      },
      {
        id: 'junior',
        name: '初中阶段',
        description: '进阶词汇学习',
        icon: '📚',
        grades: [
          { id: 'grade7', name: '初一', testWords: 20, totalWords: 458, mastery: 0, mastered: 0, incorrect: 0, unlearned: 458 },
          { id: 'grade8', name: '初二', testWords: 20, totalWords: 524, mastery: 0, mastered: 0, incorrect: 0, unlearned: 524 },
          { id: 'grade9', name: '初三', testWords: 25, totalWords: 687, mastery: 0, mastered: 0, incorrect: 0, unlearned: 687 }
        ]
      },
      {
        id: 'senior',
        name: '高中阶段',
        description: '高级词汇学习',
        icon: '🎓',
        grades: [
          { id: 'grade10', name: '高一', testWords: 25, totalWords: 835, mastery: 0, mastered: 0, incorrect: 0, unlearned: 835 },
          { id: 'grade11', name: '高二', testWords: 25, totalWords: 924, mastery: 0, mastered: 0, incorrect: 0, unlearned: 924 },
          { id: 'grade12', name: '高三', testWords: 30, totalWords: 1125, mastery: 0, mastered: 0, incorrect: 0, unlearned: 1125 }
        ]
      }
    ]
  },

  onLoad(options) {
    // 页面加载时的初始化
    this.loadGradeProgress();
  },

  onShow() {
    // 页面显示时刷新数据
    this.loadGradeProgress();
    
    // 如果当前显示年级列表，更新selectedStageData为最新的数据
    if (this.data.showGradeList && this.data.selectedStageData) {
      const currentStageId = this.data.selectedStageData.id;
      const updatedStageData = this.data.stages.find(stage => stage.id === currentStageId);
      
      console.log(`🔄 页面显示时更新已选择阶段数据: ${updatedStageData.name}`);
      
      this.setData({
        selectedStageData: updatedStageData
      });
    }
  },

  // 选择学习阶段
  selectStage(e) {
    const stageId = e.currentTarget.dataset.stage;
    const stageData = this.data.stages.find(stage => stage.id === stageId);
    
    console.log(`🎯 选择阶段: ${stageData.name}, 包含年级:`, stageData.grades.map(g => `${g.name}(${g.totalWords}词)`));
    
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

  // 开始年级测试
  startGradeTest(e) {
    const grade = e.currentTarget.dataset.grade;
    const { userManager } = require('../../utils/userManager.js');
    
    // 检查是否可以进行测试
    const canTest = userManager.canTakeTest();
    if (!canTest.allowed) {
      userManager.showPermissionModal(canTest.reason);
      return;
    }

    // 确定测试阶段
    let testStage = '';
    let stageDesc = '';
    
    if (grade >= 3 && grade <= 6) {
      testStage = 'primary';
      stageDesc = '小学阶段词汇测试（仅含小学词汇）';
    } else if (grade >= 7 && grade <= 9) {
      testStage = 'junior';
      stageDesc = '初中阶段词汇测试（含小学+初中词汇）';
    } else if (grade >= 10 && grade <= 12) {
      testStage = 'senior';
      stageDesc = '高中阶段词汇测试（含小学+初中+高中词汇）';
    }

    // 显示确认对话框
    wx.showModal({
      title: '开始水平测试',
      content: stageDesc + '\n\n确定要开始测试吗？',
      confirmText: '开始测试',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          // 记录测试次数（在用户确认后才记录）
          userManager.recordTest();
          
          // 跳转到测试页面
          wx.navigateTo({
            url: `/pages/test/test?mode=assessment&testStage=${testStage}&stageDesc=${encodeURIComponent(stageDesc)}&grade=${grade}`
          });
        }
      }
    });
  },

  // 开始年级训练
  startGradeTraining(e) {
    const grade = e.currentTarget.dataset.grade;
    wx.navigateTo({
      url: `/pages/training/training?grade=${grade}`
    });
  },

  /**
   * 加载各年级学习进度
   */
  loadGradeProgress() {
    try {
      const { getGradeWordCount } = require('../../utils/gradeWordDatabase.js');
      
      // 更新所有阶段的真实词汇数量和学习进度
      const updatedStages = this.data.stages.map(stage => {
        const updatedGrades = stage.grades.map(grade => {
          // 获取实际的词汇总数
          const actualWordCount = getGradeWordCount(grade.id);
          
          // 使用学习数据同步管理器获取统计
          const learningProgress = learningDataSync.getGradeLearningProgress(grade.id);
          
          // 计算掌握率
          const mastery = actualWordCount > 0 ? Math.round((learningProgress.mastered / actualWordCount) * 100) : 0;
          
          console.log(`📊 ${grade.id} 初始载入 - 实际词汇数:${actualWordCount}, 掌握数:${learningProgress.mastered}, 掌握率:${mastery}%`);
          
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
      
      console.log('✅ 已加载所有年级的真实词汇数量和学习进度');
    } catch (error) {
      console.error('❌ 加载年级学习进度失败:', error);
    }
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
    
    console.log('切换年级进度详情:', gradeId, this.data.expandedGrade);
  },

  /**
   * 开始年级训练
   */
  startGradeTraining(e) {
    const gradeId = e.currentTarget.dataset.grade;
    const gradeData = this.data.selectedStageData.grades.find(g => g.id === gradeId);
    
    if (!gradeData) {
      wx.showToast({
        title: '年级数据错误',
        icon: 'error'
      });
      return;
    }

    wx.showLoading({
      title: '准备训练...'
    });

    setTimeout(() => {
      wx.hideLoading();
      
      // 跳转到训练页面
      wx.navigateTo({
        url: `/pages/training/training?grade=${gradeId}&gradeName=${encodeURIComponent(gradeData.name)}`
      });
    }, 800);
  },

  // 开始年级测试
  startGradeTest(e) {
    const gradeId = e.currentTarget.dataset.grade;
    const gradeData = this.data.selectedStageData.grades.find(g => g.id === gradeId);
    
    if (!gradeData) {
      wx.showToast({
        title: '年级数据错误',
        icon: 'error'
      });
      return;
    }

    // 根据年级确定测试阶段
    const gradeNum = parseInt(gradeId.replace('grade', ''));
    let testStage = 'primary';
    let stageDescription = '小学阶段词汇测试';
    
    if (gradeNum <= 6) {
      testStage = 'primary';
      stageDescription = '小学阶段词汇测试（仅含小学词汇）';
    } else if (gradeNum <= 9) {
      testStage = 'junior';
      stageDescription = '初中阶段词汇测试（含小学+初中词汇）';
    } else {
      testStage = 'senior';
      stageDescription = '高中阶段词汇测试（含小学+初中+高中词汇）';
    }

    wx.showModal({
      title: '水平测试确认',
      content: `即将开始${gradeData.name}${stageDescription}，共${gradeData.testWords}题，确认开始吗？`,
      confirmText: '开始测试',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          wx.showLoading({
            title: '准备水平测试...'
          });

          setTimeout(() => {
            wx.hideLoading();
            
            // 跳转到测试页面，传递测试阶段信息
            wx.navigateTo({
              url: `/pages/test/test?mode=assessment&grade=${gradeId}&gradeName=${encodeURIComponent(gradeData.name)}&count=${gradeData.testWords}&testStage=${testStage}&stageDesc=${encodeURIComponent(stageDescription)}`
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