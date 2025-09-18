// 训练模块页面
const { learningDataSync } = require('../../utils/learningDataSync.js');
const { buttonDebouncer } = require('../../utils/debounce.js');

Page({
  data: {
    currentStage: '', // 当前选择的阶段
    currentGrade: '', // 当前选择的年级
    showGradeList: false, // 是否显示年级列表
    
    // K12三个阶段定义
    stages: [
      {
        id: 'primary',
        name: '小学阶段',
        description: '基础词汇学习',
        icon: '🎓',
        grades: [
          { id: 'grade3', name: '三年级', wordCount: 300 },
          { id: 'grade4', name: '四年级', wordCount: 400 },
          { id: 'grade5', name: '五年级', wordCount: 500 },
          { id: 'grade6', name: '六年级', wordCount: 600 }
        ]
      },
      {
        id: 'junior',
        name: '初中阶段',
        description: '进阶词汇训练',
        icon: '📚',
        grades: [
          { id: 'grade7', name: '初一', wordCount: 1000 },
          { id: 'grade8', name: '初二', wordCount: 1200 },
          { id: 'grade9', name: '初三', wordCount: 1500 }
        ]
      },
      {
        id: 'senior',
        name: '高中阶段',
        description: '高级词汇掌握',
        icon: '🎯',
        grades: [
          { id: 'grade10', name: '高一', wordCount: 2000 },
          { id: 'grade11', name: '高二', wordCount: 2500 },
          { id: 'grade12', name: '高三', wordCount: 3000 }
        ]
      }
    ],
    
    selectedStageData: null, // 选中阶段的详细数据
    loading: false
  },

  onLoad(options) {
    // 重置防抖状态
    buttonDebouncer.resetAll();
    
    // 检查是否从首页传递了年级参数
    if (options.grade) {
      const gradeId = options.grade;
      
      // 根据年级ID确定对应的阶段
      let targetStage = null;
      if (['grade3', 'grade4', 'grade5', 'grade6'].includes(gradeId)) {
        targetStage = this.data.stages.find(stage => stage.id === 'primary');
      } else if (['grade7', 'grade8', 'grade9'].includes(gradeId)) {
        targetStage = this.data.stages.find(stage => stage.id === 'junior');
      } else if (['grade10', 'grade11', 'grade12'].includes(gradeId)) {
        targetStage = this.data.stages.find(stage => stage.id === 'senior');
      }
      
      if (targetStage) {
        this.setData({
          currentStage: targetStage.id,
          selectedStageData: targetStage,
          showGradeList: true,
          currentGrade: gradeId
        });
        
        // 加载该阶段的进度数据
        this.loadStageProgress(targetStage);
      }
    }
    // 检查是否从首页传递了阶段参数
    else if (options.stage) {
      const stageId = options.stage;
      const stageData = this.data.stages.find(stage => stage.id === stageId);
      
      if (stageData) {
        this.setData({
          currentStage: stageId,
          selectedStageData: stageData,
          showGradeList: true,
          currentGrade: ''
        });
        
        // 加载该阶段的进度数据
        this.loadStageProgress(stageData);
      }
    }
  },

  onUnload() {
    // 页面卸载时清理防抖状态
    buttonDebouncer.resetAll();
  },

  onShow() {
    // 如果当前显示年级列表，刷新进度
    if (this.data.showGradeList && this.data.selectedStageData) {
      this.loadStageProgress(this.data.selectedStageData);
    }
  },

  // 加载阶段进度数据
  loadStageProgress(stageData) {
    try {
      const { getGradeWordCount } = require('../../utils/gradeWordDatabase.js');
      
      const grades = stageData.grades.map(grade => {
        // 使用新的学习数据同步管理器获取统计
        const learningProgress = learningDataSync.getGradeLearningProgress(grade.id);
        
        // 使用实际的词汇总数（从数据库直接获取，而不是通过查询词汇列表）
        const actualWordCount = getGradeWordCount(grade.id);
        
        // 计算掌握数（使用新的严格掌握定义）
        const masteredCount = learningProgress.mastered;
        
        console.log(`📊 ${grade.id} 载入数据 - 实际词汇数:${actualWordCount}, 掌握数:${masteredCount}`);
        
        return {
          ...grade,
          wordCount: actualWordCount, // 使用从数据库获取的实际词汇数量
          masteredCount: masteredCount, // 使用新的严格掌握标准统计的数量
          learningProgress: learningProgress
        };
      });
      
      this.setData({
        selectedStageData: {
          ...stageData,
          grades: grades
        }
      });
      
    } catch (error) {
      console.error('加载阶段进度失败:', error);
    }
  },

  // 选择学习阶段
  selectStage(e) {
    const stageId = e.currentTarget.dataset.stage;
    
    // 添加防抖处理
    buttonDebouncer.handleClick(`select-stage-${stageId}`, () => {
      const stageData = this.data.stages.find(stage => stage.id === stageId);
      
      this.setData({
        currentStage: stageId,
        selectedStageData: stageData,
        showGradeList: true,
        currentGrade: ''
      });
    }, 300);
  },

  // 返回阶段选择
  backToStages() {
    // 添加防抖处理
    buttonDebouncer.handleClick('back-to-stages', () => {
      this.setData({
        showGradeList: false,
        currentStage: '',
        selectedStageData: null,
        currentGrade: ''
      });
    }, 300);
  },

  // 选择年级并开始训练
  startTraining(e) {
    console.log('startTraining 被调用', e);
    
    // 先显示一个简单的提示，确认按钮点击有效
    wx.showToast({
      title: '按钮点击有效',
      icon: 'success',
      duration: 1000
    });
    
    const gradeId = e.currentTarget.dataset.grade;
    console.log('gradeId:', gradeId);
    
    // 添加防抖处理
    buttonDebouncer.handleClick(`start-training-${gradeId}`, () => {
      console.log('防抖通过，开始处理');
      const gradeData = this.data.selectedStageData.grades.find(grade => grade.id === gradeId);
      console.log('gradeData:', gradeData);
      
      if (!gradeData) {
        console.log('年级数据错误');
        wx.showToast({
          title: '年级数据错误',
          icon: 'error'
        });
        return;
      }

      console.log('显示数量选择对话框');
      // 显示学习数量选择对话框
      this.showQuantitySelection(gradeId, gradeData);
    }, 500); // 训练按钮使用更长的防抖时间
  },

  // 显示学习数量选择
  showQuantitySelection(gradeId, gradeData) {
    console.log('showQuantitySelection 被调用', gradeId, gradeData);
    const that = this;
    
    // 直接显示数量选择选项
    wx.showActionSheet({
      itemList: ['2个单词', '10个单词', '20个单词', '30个单词', '40个单词', '50个单词'],
      success(res) {
        console.log('用户选择了:', res.tapIndex);
        let quantity = 30;
        switch (res.tapIndex) {
          case 0: quantity = 2; break;
          case 1: quantity = 10; break;
          case 2: quantity = 20; break;
          case 3: quantity = 30; break;
          case 4: quantity = 40; break;
          case 5: quantity = 50; break;
        }
        console.log('开始训练，数量:', quantity);
        that.startTrainingWithQuantity(gradeId, gradeData, quantity);
      },
      fail(err) {
        console.log('ActionSheet 失败:', err);
      }
    });
  },

  // 根据选择的数量开始训练
  startTrainingWithQuantity(gradeId, gradeData, quantity) {
    console.log('startTrainingWithQuantity 被调用', gradeId, gradeData, quantity);
    this.setData({
      currentGrade: gradeId,
      loading: true
    });

    // 加载对应年级的词汇数据
    this.loadGradeWords(gradeId, gradeData.name, quantity);
  },

  // 加载年级词汇数据
  async loadGradeWords(gradeId, gradeName, quantity = 30) {
    try {
      wx.showLoading({
        title: '加载词汇中...'
      });

      // 使用分级词汇数据库
      const { getGradeWords, isGradeEnabled } = require('../../utils/gradeWordDatabase.js');
      
      // 检查年级是否开设英语课
      if (!isGradeEnabled(gradeId)) {
        wx.hideLoading();
        wx.showModal({
          title: '提示',
          content: '该年级未开设英语课程',
          showCancel: false
        });
        this.setData({ loading: false });
        return;
      }
      
      // 加载该年级的所有词汇用于训练
      const allWords = getGradeWords(gradeId, 1000, 'training'); // 获取所有可用词汇
      console.log(`📚 ${gradeName} 获取到的词汇数据:`, allWords);
      
      // 检查词汇数据是否有效
      if (!allWords || !Array.isArray(allWords)) {
        console.error('❌ 获取词汇数据失败或格式错误:', allWords);
        wx.hideLoading();
        this.setData({ loading: false });
        wx.showModal({
          title: '词汇加载失败',
          content: '无法加载该年级的词汇数据，请稍后重试',
          showCancel: false
        });
        return;
      }
      
      const actualWordCount = allWords.length;
      console.log(`📚 ${gradeName} 训练词汇总数: ${actualWordCount}`);
      
      wx.hideLoading();
      this.setData({
        loading: false
      });

      if (actualWordCount === 0) {
        wx.showModal({
          title: '暂无词汇',
          content: '该年级暂无可用的训练词汇',
          showCancel: false
        });
        return;
      }

      // 跳转到专门的训练页面（传递选择的学习数量）
      wx.navigateTo({
        url: `/pages/learning/learning?grade=${gradeId}&gradeName=${encodeURIComponent(gradeName)}&totalWords=${actualWordCount}&quantity=${quantity}`
      });

    } catch (error) {
      console.error('❌ 加载年级词汇失败:', error);
      wx.hideLoading();
      this.setData({
        loading: false
      });
      
      wx.showModal({
        title: '加载失败',
        content: '词汇数据加载失败，是否使用备用数据继续？',
        success: (res) => {
          if (res.confirm) {
            // 使用备用数据继续
            wx.navigateTo({
              url: `/pages/test/test?mode=training&grade=${gradeId}&gradeName=${encodeURIComponent(gradeName)}&count=20`
            });
          }
        }
      });
    }
  },

  // 查看学习进度
  viewProgress(e) {
    const gradeId = e.currentTarget.dataset.grade;
    
    // 添加防抖处理
    buttonDebouncer.handleClick(`view-progress-${gradeId}`, () => {
      const gradeData = this.data.selectedStageData.grades.find(grade => grade.id === gradeId);
      const gradeName = gradeData ? gradeData.name : gradeId;
      
      wx.navigateTo({
        url: `/pages/progress/progress?gradeId=${gradeId}&gradeName=${encodeURIComponent(gradeName)}`
      });
    }, 300);
  },

  // 返回首页
  goHome() {
    wx.navigateBack();
  },

  // 接收学习页面的进度更新通知
  onLearningProgressUpdate(data) {
    console.log('接收到学习进度更新:', data);
    
    // 如果当前显示的是该年级的数据，则刷新进度
    if (this.data.showGradeList && this.data.selectedStageData) {
      const updatedGradeId = data.gradeId;
      const currentGrades = this.data.selectedStageData.grades;
      
      // 检查是否需要更新当前显示的年级进度
      const needUpdate = currentGrades.some(grade => grade.id === updatedGradeId);
      
      if (needUpdate) {
        console.log(`更新${updatedGradeId}的进度显示`);
        this.loadStageProgress(this.data.selectedStageData);
        
        // 显示进度更新提示
        wx.showToast({
          title: '学习进度已更新',
          icon: 'success',
          duration: 2000
        });
      }
    }
  },

  // 分享功能
  onShareAppMessage() {
    return {
      title: '英语词汇分级训练，快来提升你的词汇量！',
      path: '/pages/index/index'
    };
  }
});