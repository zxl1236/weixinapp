// 学习进度列表页面
const learningDataSync = require('../../utils/learningDataSync.js');

Page({
  data: {
    loading: true,
    stages: [
      {
        id: 'primary',
        name: '小学阶段',
        description: '基础词汇学习',
        icon: '🎒',
        grades: [
          { id: 'grade3_1', name: '三年级上' },
          { id: 'grade3_2', name: '三年级下' },
          { id: 'grade4_1', name: '四年级上' },
          { id: 'grade4_2', name: '四年级下' },
          { id: 'grade5_1', name: '五年级上' },
          { id: 'grade5_2', name: '五年级下' },
          { id: 'grade6_1', name: '六年级上' },
          { id: 'grade6_2', name: '六年级下' }
        ]
      },
      {
        id: 'junior',
        name: '初中阶段',
        description: '进阶词汇学习',
        icon: '📚',
        grades: [
          { id: 'grade7_1', name: '初一上' },
          { id: 'grade7_2', name: '初一下' },
          { id: 'grade8_1', name: '初二上' },
          { id: 'grade8_2', name: '初二下' },
          { id: 'grade9_1', name: '初三上' },
          { id: 'grade9_2', name: '初三下' }
        ]
      }
    ]
  },

  onLoad() {
    this.loadAllGradeProgress();
  },

  onShow() {
    // 页面显示时刷新数据
    this.loadAllGradeProgress();
  },

  // 加载所有年级的学习进度
  loadAllGradeProgress() {
    this.setData({ loading: true });
    try {
      const { getGradeWordCount } = require('../../utils/gradeWordDatabase.js');

      // 更新所有阶段的年级进度
      const updatedStages = this.data.stages.map(stage => {
        const updatedGrades = stage.grades.map(grade => {
          // 获取实际的词汇总数
          const totalWords = getGradeWordCount(grade.id);

          // 使用学习数据同步管理器获取统计
          const learningProgress = learningDataSync.getGradeLearningProgress(grade.id);

          // 计算掌握率
          const masteryRate = totalWords > 0 ? Math.round((learningProgress.mastered / totalWords) * 100) : 0;
          return {
            ...grade,
            totalWords,
            mastered: learningProgress.mastered || 0,
            masteryRate
          };
        });

        return {
          ...stage,
          grades: updatedGrades
        };
      });

      this.setData({
        stages: updatedStages,
        loading: false
      });
    } catch (error) {
      console.error('❌ 加载年级学习进度失败:', error);
      this.setData({ loading: false });
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      });
    }
  },

  // 跳转到年级详细进度页面
  navigateToGradeProgress(e) {
    const { gradeid, gradename } = e.currentTarget.dataset;
    
    if (!gradeid) {
      wx.showToast({
        title: '参数错误',
        icon: 'none'
      });
      return;
    }

    const gradeName = gradename || this.getGradeName(gradeid);
    const url = `/pages/progress/progress?gradeId=${gradeid}&gradeName=${encodeURIComponent(gradeName)}`;

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
  },

  // 获取年级名称
  getGradeName(gradeId) {
    const gradeNames = {
      'grade3_1': '三年级上',
      'grade3_2': '三年级下',
      'grade4_1': '四年级上',
      'grade4_2': '四年级下',
      'grade5_1': '五年级上',
      'grade5_2': '五年级下',
      'grade6_1': '六年级上',
      'grade6_2': '六年级下',
      'grade7_1': '初一上',
      'grade7_2': '初一下',
      'grade8_1': '初二上',
      'grade8_2': '初二下',
      'grade9_1': '初三上',
      'grade9_2': '初三下'
    };
    return gradeNames[gradeId] || gradeId;
  },

  // 下拉刷新
  onPullDownRefresh() {
    this.loadAllGradeProgress();
    setTimeout(() => {
      wx.stopPullDownRefresh();
    }, 500);
  }
});

