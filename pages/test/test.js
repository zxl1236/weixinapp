const { getRandomQuestions } = require('../../utils/wordDatabase.js');

Page({
  data: {
    questions: [],
    currentIndex: 0,
    currentQuestion: null,
    selectedAnswer: null,
    correctIndex: 0,
    showResult: false,
    score: 0,
    totalQuestions: 20,
    loading: true,
    showExitModal: false,
    startTime: 0,
    answers: [] // 记录所有答案
  },

  onLoad(options) {
    const count = parseInt(options.count) || 20;
    this.setData({
      totalQuestions: count,
      startTime: Date.now()
    });
    
    this.initializeTest();
  },

  // 初始化测试
  initializeTest() {
    try {
      const questions = getRandomQuestions(this.data.totalQuestions);
      if (questions.length === 0) {
        wx.showToast({
          title: '题目加载失败',
          icon: 'error'
        });
        return;
      }

      // 验证题目质量
      const validQuestions = questions.filter(question => {
        return question.word && 
               question.meaning && 
               question.options && 
               question.options.length >= 2 &&
               question.options.includes(question.meaning);
      });

      if (validQuestions.length === 0) {
        wx.showToast({
          title: '题目数据无效',
          icon: 'error'
        });
        return;
      }

      const firstQuestion = validQuestions[0];
      const correctIndex = firstQuestion.options.findIndex(option => option === firstQuestion.meaning);

      // 验证正确答案索引
      if (correctIndex === -1) {
        console.error('题目数据错误：找不到正确答案', firstQuestion);
        wx.showToast({
          title: '题目数据错误',
          icon: 'error'
        });
        return;
      }

      this.setData({
        questions: validQuestions,
        currentQuestion: firstQuestion,
        correctIndex,
        loading: false
      });
    } catch (error) {
      console.error('初始化测试失败:', error);
      wx.showToast({
        title: '初始化失败',
        icon: 'error'
      });
    }
  },

  // 选择选项
  selectOption(e) {
    if (this.data.showResult) return;
    
    const index = parseInt(e.currentTarget.dataset.index);
    this.setData({
      selectedAnswer: index
    });
  },

  // 提交答案
  submitAnswer() {
    if (this.data.selectedAnswer === null) {
      wx.showToast({
        title: '请先选择答案',
        icon: 'none'
      });
      return;
    }

    // 获取选择的答案内容和正确答案
    const selectedOption = this.data.currentQuestion.options[this.data.selectedAnswer];
    const correctOption = this.data.currentQuestion.meaning;
    const isCorrect = selectedOption === correctOption;
    const newScore = isCorrect ? this.data.score + 1 : this.data.score;
    
    // 记录详细的答案信息
    const answerRecord = {
      question: this.data.currentQuestion.word,
      selectedAnswer: selectedOption,
      correctAnswer: correctOption,
      selectedIndex: this.data.selectedAnswer,
      correctIndex: this.data.correctIndex,
      isCorrect,
      timestamp: Date.now(),
      level: this.data.currentQuestion.level
    };

    this.setData({
      showResult: true,
      score: newScore,
      answers: [...this.data.answers, answerRecord]
    });

    // 添加haptic反馈
    if (isCorrect) {
      wx.vibrateShort({ type: 'light' });
    } else {
      wx.vibrateShort({ type: 'medium' });
    }
  },

  // 下一题
  nextQuestion() {
    const nextIndex = this.data.currentIndex + 1;
    
    if (nextIndex >= this.data.totalQuestions) {
      this.finishTest();
      return;
    }

    const nextQuestion = this.data.questions[nextIndex];
    
    // 验证下一题的数据
    if (!nextQuestion || !nextQuestion.options || !nextQuestion.meaning) {
      console.error('下一题数据无效:', nextQuestion);
      wx.showToast({
        title: '题目数据错误',
        icon: 'error'
      });
      return;
    }
    
    const correctIndex = nextQuestion.options.findIndex(option => option === nextQuestion.meaning);
    
    // 验证正确答案索引
    if (correctIndex === -1) {
      console.error('下一题数据错误：找不到正确答案', nextQuestion);
      wx.showToast({
        title: '题目数据错误',
        icon: 'error'
      });
      return;
    }

    this.setData({
      currentIndex: nextIndex,
      currentQuestion: nextQuestion,
      correctIndex,
      selectedAnswer: null,
      showResult: false
    });
  },

  // 完成测试
  finishTest() {
    const endTime = Date.now();
    const duration = Math.floor((endTime - this.data.startTime) / 1000); // 秒

    const testResult = {
      score: this.data.score,
      total: this.data.totalQuestions,
      percentage: Math.round((this.data.score / this.data.totalQuestions) * 100),
      duration,
      answers: this.data.answers,
      timestamp: new Date().toISOString(),
      date: new Date().toLocaleDateString('zh-CN')
    };

    // 保存测试结果
    this.saveTestResult(testResult);

    // 导航到结果页面
    const resultQuery = encodeURIComponent(JSON.stringify(testResult));
    wx.redirectTo({
      url: `/pages/result/result?result=${resultQuery}`
    });
  },

  // 保存测试结果
  saveTestResult(result) {
    try {
      let history = wx.getStorageSync('testHistory') || [];
      history.push({
        score: result.score,
        total: result.total,
        level: this.calculateLevel(result.percentage),
        date: result.date,
        timestamp: result.timestamp
      });
      
      // 只保留最近10次记录
      if (history.length > 10) {
        history = history.slice(-10);
      }
      
      wx.setStorageSync('testHistory', history);
    } catch (error) {
      console.error('保存测试结果失败:', error);
    }
  },

  // 计算等级
  calculateLevel(percentage) {
    if (percentage >= 95) return '专家级';
    if (percentage >= 85) return '高级';
    if (percentage >= 75) return '中高级';
    if (percentage >= 65) return '中级';
    if (percentage >= 50) return '初中级';
    if (percentage >= 35) return '初级';
    return '入门级';
  },

  // 显示退出确认
  showExitModal() {
    this.setData({
      showExitModal: true
    });
  },

  // 隐藏退出确认
  hideExitModal() {
    this.setData({
      showExitModal: false
    });
  },

  // 确认退出
  confirmExit() {
    wx.navigateBack();
  },

  // 页面返回事件
  onBackPress() {
    this.showExitModal();
    return true; // 阻止默认返回行为
  },

  // 小程序隐藏时暂停
  onHide() {
    // 可以在这里暂停计时器等
  },

  // 分享功能
  onShareAppMessage() {
    return {
      title: `我正在测试英语词汇量，已完成${this.data.currentIndex}/${this.data.totalQuestions}题`,
      path: '/pages/index/index'
    };
  }
});