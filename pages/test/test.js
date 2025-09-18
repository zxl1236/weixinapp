const { getGradeWords, recordTrainedWords } = require('../../utils/gradeWordDatabase.js');
const { userManager } = require('../../utils/userManager.js');
const { studyTracker } = require('../../utils/studyTracker.js');

// 内联备用函数（替代已删除的wordDatabase.js）
function getRandomQuestions(count = 20, maxLevel = 9) {
  const fallbackWords = [
    { word: 'apple', meaning: '苹果', phonetic: '/ˈæpl/', level: 1, options: ['苹果', '橙子', '香蕉', '梨'] },
    { word: 'book', meaning: '书', phonetic: '/bʊk/', level: 1, options: ['书', '笔', '桌子', '椅子'] },
    { word: 'water', meaning: '水', phonetic: '/ˈwɔːtər/', level: 1, options: ['水', '火', '土', '空气'] },
    { word: 'house', meaning: '房子', phonetic: '/haʊs/', level: 1, options: ['房子', '车', '树', '花'] },
    { word: 'school', meaning: '学校', phonetic: '/skuːl/', level: 1, options: ['学校', '医院', '银行', '商店'] },
    { word: 'friend', meaning: '朋友', phonetic: '/frend/', level: 2, options: ['朋友', '敌人', '老师', '学生'] },
    { word: 'computer', meaning: '电脑', phonetic: '/kəmˈpjuːtər/', level: 2, options: ['电脑', '电视', '冰箱', '洗衣机'] },
    { word: 'beautiful', meaning: '美丽的', phonetic: '/ˈbjuːtɪfl/', level: 2, options: ['美丽的', '丑陋的', '高的', '矮的'] },
    { word: 'important', meaning: '重要的', phonetic: '/ɪmˈpɔːrtnt/', level: 3, options: ['重要的', '简单的', '困难的', '容易的'] },
    { word: 'information', meaning: '信息', phonetic: '/ˌɪnfərˈmeɪʃn/', level: 3, options: ['信息', '新闻', '故事', '历史'] },
    { word: 'appropriate', meaning: '合适的', phonetic: '/əˈprəʊpriət/', level: 4, options: ['合适的', '不当的', '完美的', '错误的'] },
    { word: 'significant', meaning: '重要的', phonetic: '/sɪɡˈnɪfɪkənt/', level: 4, options: ['重要的', '微小的', '普通的', '特殊的'] },
    { word: 'environment', meaning: '环境', phonetic: '/ɪnˈvaɪrənmənt/', level: 4, options: ['环境', '社会', '文化', '历史'] },
    { word: 'opportunity', meaning: '机会', phonetic: '/ˌɒpəˈtjuːnəti/', level: 5, options: ['机会', '困难', '挑战', '问题'] },
    { word: 'development', meaning: '发展', phonetic: '/dɪˈveləpmənt/', level: 5, options: ['发展', '退步', '停止', '开始'] },
    { word: 'experience', meaning: '经验', phonetic: '/ɪkˈspɪəriəns/', level: 5, options: ['经验', '知识', '技能', '能力'] },
    { word: 'responsibility', meaning: '责任', phonetic: '/rɪˌspɒnsəˈbɪləti/', level: 6, options: ['责任', '权利', '义务', '职责'] },
    { word: 'communication', meaning: '交流', phonetic: '/kəˌmjuːnɪˈkeɪʃn/', level: 6, options: ['交流', '对话', '讨论', '辩论'] },
    { word: 'organization', meaning: '组织', phonetic: '/ˌɔːɡənaɪˈzeɪʃn/', level: 6, options: ['组织', '公司', '团体', '机构'] },
    { word: 'relationship', meaning: '关系', phonetic: '/rɪˈleɪʃnʃɪp/', level: 6, options: ['关系', '友谊', '爱情', '合作'] }
  ];
  
  const filteredWords = fallbackWords.filter(word => word.level <= maxLevel);
  const shuffled = filteredWords.sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

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
    answers: [], // 记录所有答案
    isPlaying: false, // 播放状态
    audioCache: {} // 音频缓存
  },

  onLoad(options) {
    const count = parseInt(options.count) || 20;
    const isRetest = options.retest === 'true';
    const mode = options.mode || 'test'; // test, training, assessment
    const isTraining = mode === 'training';
    const isAssessment = mode === 'assessment';
    const grade = options.grade || '';
    const gradeName = decodeURIComponent(options.gradeName || '');
    const testStage = options.testStage || '';
    const stageDesc = decodeURIComponent(options.stageDesc || '');
    
    this.setData({
      totalQuestions: count,
      startTime: Date.now(),
      isRetest: isRetest,
      isTraining: isTraining,
      isAssessment: isAssessment,
      testMode: mode,
      currentGrade: grade,
      currentGradeName: gradeName,
      testStage: testStage,
      stageDescription: stageDesc
    });
    
    console.log('📋 水平测试初始化:', {
      mode: mode,
      grade: grade,
      gradeName: gradeName,
      testStage: testStage,
      stageDesc: stageDesc,
      count: count
    });
    
    this.initializeTest();
  },

  // 根据模式获取题目
  async getQuestionsForMode() {
    try {
      console.log('📋 测试模式检查:', {
        testMode: this.data.testMode,
        isTraining: this.data.isTraining,
        isAssessment: this.data.isAssessment,
        currentGrade: this.data.currentGrade,
        currentGradeName: this.data.currentGradeName,
        testStage: this.data.testStage,
        stageDescription: this.data.stageDescription
      });

      if ((this.data.isTraining || this.data.isAssessment) && this.data.currentGrade) {
        // 训练模式或评估模式：使用分级数据库
        const modeText = this.data.isAssessment ? '评估' : '训练';
        const dataType = this.data.isAssessment ? 'test' : 'training';
        console.log(`🎓 ${modeText}模式：加载 ${this.data.currentGrade} 年级词汇，数据类型: ${dataType}`);
        
        // 如果是水平测试模式，显示阶段描述信息
        if (this.data.isAssessment && this.data.stageDescription) {
          console.log(`📊 ${this.data.stageDescription}`);
        }
        
        const words = getGradeWords(this.data.currentGrade, this.data.totalQuestions, dataType);
        
        console.log(`✅ 成功加载 ${words.length} 个词汇:`, words.slice(0, 3).map(w => w.word));
        
        // 为词汇生成选项（如果没有options字段）
        const questionsWithOptions = words.map(word => {
          if (word.options && word.options.length > 0) {
            return word; // 已有选项，直接返回
          }
          
          // 生成选项
          const options = this.generateOptionsForWord(word, words);
          return {
            ...word,
            options: options
          };
        });
        
        console.log(`🎯 生成题目选项完成:`, questionsWithOptions.slice(0, 2).map(w => `${w.word}: [${w.options.join(', ')}]`));
        return questionsWithOptions;
      } else {
        // 普通测试模式：使用原有数据
        console.log('📝 普通测试模式：使用随机题目');
        const words = getRandomQuestions(this.data.totalQuestions);
        console.log(`📝 随机题目:`, words.slice(0, 3).map(w => w.word));
        return words;
      }
    } catch (error) {
      console.error('❌ 获取题目失败:', error);
      // 失败时回退到原有数据，但限制难度级别
      let maxLevel = 6; // 默认中等难度
      if ((this.data.isTraining || this.data.isAssessment) && this.data.currentGrade) {
        // 根据年级设置最大难度级别
        const gradeLevel = parseInt(this.data.currentGrade.replace('grade', ''));
        maxLevel = Math.min(gradeLevel + 1, 6); // 年级+1，最高6级
      }
      
      const fallbackWords = getRandomQuestions(this.data.totalQuestions, maxLevel);
      console.log(`🔄 回退到原有数据 (最大级别${maxLevel}):`, fallbackWords.slice(0, 3).map(w => w.word));
      return fallbackWords;
    }
  },

  // 为单词生成选项
  generateOptionsForWord(targetWord, allWords) {
    const correctAnswer = targetWord.meaning;
    const options = [correctAnswer];
    
    // 从同批次词汇中随机选择3个错误选项
    const otherWords = allWords.filter(w => w.word !== targetWord.word && w.meaning !== correctAnswer);
    const shuffledOthers = otherWords.sort(() => Math.random() - 0.5);
    
    // 取前3个作为错误选项
    for (let i = 0; i < Math.min(3, shuffledOthers.length); i++) {
      options.push(shuffledOthers[i].meaning);
    }
    
    // 如果选项不足4个，添加通用选项
    const genericOptions = ['其他含义', '不确定', '相似词汇', '近义词'];
    while (options.length < 4) {
      const generic = genericOptions[options.length - 1];
      if (!options.includes(generic)) {
        options.push(generic);
      } else {
        options.push(`选项${options.length}`);
      }
    }
    
    // 打乱选项顺序
    return options.sort(() => Math.random() - 0.5);
  },

  // 初始化测试
  async initializeTest() {
    try {
      let questions;
      
      // 检查是否是重测模式
      if (this.data.isRetest) {
        // 从临时存储获取重测题目
        questions = wx.getStorageSync('retestWords') || [];
        if (questions.length === 0) {
          // 如果没有重测题目，回退到普通模式
          questions = await this.getQuestionsForMode();
        }
        // 清除临时存储
        wx.removeStorageSync('retestWords');
      } else {
        // 根据模式获取题目
        questions = await this.getQuestionsForMode();
      }
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
        loading: false,
        questionStartTime: Date.now() // 设置第一题开始时间
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
    
    // 记录首次选择时间（用于计算答题时长）
    if (this.data.selectedAnswer === null && !this.data.questionStartTime) {
      this.setData({
        questionStartTime: Date.now()
      });
    }
    
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

    // 获取当前题目和选择的答案
    const currentQuestion = this.data.currentQuestion;
    const selectedIndex = this.data.selectedAnswer;
    const selectedOption = currentQuestion.options[selectedIndex];
    const correctAnswer = currentQuestion.meaning;
    
    // 数据完整性验证
    if (!currentQuestion || !selectedOption || !correctAnswer) {
      console.error('答案验证失败 - 数据不完整:', {
        question: currentQuestion?.word,
        selectedOption,
        correctAnswer,
        selectedIndex
      });
      wx.showToast({
        title: '数据异常，请重试',
        icon: 'error'
      });
      return;
    }
    
    // 核心验证逻辑：直接比较选择的选项内容与正确答案
    const normalizeText = (text) => text?.toString().trim().toLowerCase() || '';
    const selectedNormalized = normalizeText(selectedOption);
    const correctNormalized = normalizeText(correctAnswer);
    const isCorrect = selectedNormalized === correctNormalized;
    
    // 更新正确答案的索引（实时计算，确保准确）
    const realCorrectIndex = currentQuestion.options.findIndex(option => 
      normalizeText(option) === correctNormalized
    );
    
    // 详细的验证日志
    console.log('🔍 答案验证详情:', {
      word: currentQuestion.word,
      selectedOption: selectedOption,
      correctAnswer: correctAnswer,
      selectedIndex: selectedIndex,
      realCorrectIndex: realCorrectIndex,
      isCorrect: isCorrect,
      allOptions: currentQuestion.options
    });
    
          // 记录答案信息
      const answerRecord = {
        question: currentQuestion.word,
        phonetic: currentQuestion.phonetic || '', // 包含音标信息
        questionLevel: currentQuestion.level,
        selectedAnswer: selectedOption,
        correctAnswer: correctAnswer,
        selectedIndex: selectedIndex,
        correctIndex: realCorrectIndex,
        isCorrect: isCorrect,
        timestamp: Date.now(),
        duration: Date.now() - this.data.questionStartTime
      };

    // 更新状态
    this.setData({
      showResult: true,
      score: this.data.score + (isCorrect ? 1 : 0),
      answers: [...this.data.answers, answerRecord],
      correctIndex: realCorrectIndex, // 更新正确答案索引用于UI显示
      isLastAnswerCorrect: isCorrect // 记录最后一次答案是否正确
    });

    // 移除震动反馈，避免干扰用户
    
    // 显示验证结果提示
    if (isCorrect) {
      console.log('✅ 答案正确!');
      // 正确答案自动跳转下一题
      setTimeout(() => {
        this.nextQuestion();
      }, 1000); // 1秒后自动跳转，给用户足够时间看到正确提示
    } else {
      console.log('❌ 答案错误! 正确答案是:', correctAnswer);
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
    
    // 验证下一题的数据完整性
    if (!nextQuestion || !nextQuestion.options || !nextQuestion.meaning) {
      console.error('下一题数据无效:', nextQuestion);
      wx.showToast({
        title: '题目数据错误',
        icon: 'error'
      });
      return;
    }
    
    // 使用标准化文本比较找到正确答案索引
    const normalizeText = (text) => text?.toString().trim().toLowerCase() || '';
    const correctNormalized = normalizeText(nextQuestion.meaning);
    const correctIndex = nextQuestion.options.findIndex(option => 
      normalizeText(option) === correctNormalized
    );
    
    // 验证正确答案索引
    if (correctIndex === -1) {
      console.error('下一题数据错误：找不到正确答案', {
        word: nextQuestion.word,
        meaning: nextQuestion.meaning,
        options: nextQuestion.options
      });
      wx.showToast({
        title: '题目数据错误',
        icon: 'error'
      });
      return;
    }

    // 重置题目状态
    this.setData({
      currentIndex: nextIndex,
      currentQuestion: nextQuestion,
      correctIndex: correctIndex,
      selectedAnswer: null,
      showResult: false,
      isLastAnswerCorrect: false, // 重置答案状态
      questionStartTime: Date.now() // 重置题目开始时间
    });
    
    console.log('📝 下一题加载:', {
      index: nextIndex + 1,
      word: nextQuestion.word,
      correctAnswer: nextQuestion.meaning,
      correctIndex: correctIndex
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

    // 如果是训练模式，记录训练过的词汇
    if (this.data.isTraining && this.data.currentGrade) {
      const trainedWords = this.data.questions.map(q => q.word);
      recordTrainedWords(this.data.currentGrade, trainedWords);
      console.log(`📝 训练完成，记录 ${trainedWords.length} 个词汇到 ${this.data.currentGrade}`);
    }

    // 记录测试次数（用于会员权限管理）
    userManager.recordTest();

    // 保存测试结果
    this.saveTestResult(testResult);

    // 导航到结果页面，传递年级信息
    const resultQuery = encodeURIComponent(JSON.stringify(testResult));
    const gradeParam = this.data.currentGrade ? `&grade=${this.data.currentGrade}` : '';
    const stageParam = this.data.currentGrade ? `&stage=${this.getTestStageByGrade(this.data.currentGrade)}` : '';
    
    wx.redirectTo({
      url: `/pages/result/result?result=${resultQuery}${gradeParam}${stageParam}`
    });
  },

  // 保存测试结果
  saveTestResult(result) {
    try {
      // 使用学习追踪器保存测试记录
      const testData = {
        grade: this.data.selectedGrade || '未知',
        score: result.score,
        totalQuestions: result.total,
        correctAnswers: result.answers.filter(a => a.correct).length,
        wrongAnswers: result.answers.filter(a => !a.correct).length,
        words: result.answers.map(answer => ({
          word: answer.word,
          meaning: answer.meaning,
          correct: answer.correct,
          selectedAnswer: answer.selectedAnswer,
          correctAnswer: answer.correctAnswer
        })),
        startTime: this.data.startTime || new Date().toISOString(),
        endTime: new Date().toISOString(),
        duration: result.duration || 0
      };
      
      studyTracker.recordTestCompletion(testData);
      
      // 同时保存老版本格式以兼容现有功能
      let history = wx.getStorageSync('testHistory') || [];
      const testRecord = {
        score: result.score,
        total: result.total,
        level: this.calculateLevel(result.percentage),
        date: result.date,
        timestamp: result.timestamp,
        answers: result.answers,
        duration: result.duration,
        percentage: result.percentage
      };
      
      history.push(testRecord);
      if (history.length > 10) {
        history = history.slice(-10);
      }
      wx.setStorageSync('testHistory', history);
      
      // 同时保存错题到专门的错题存储
      this.saveMistakes(result.answers);
      
    } catch (error) {
      console.error('保存测试结果失败:', error);
    }
  },

  // 保存生词到生词本
  saveMistakes(answers) {
    try {
      const mistakes = answers.filter(answer => !answer.isCorrect);
      if (mistakes.length === 0) return;

      let mistakeBook = wx.getStorageSync('mistakeBook') || {};
      const currentMistakeCount = Object.keys(mistakeBook).length;
      
      // 检查会员权限和生词本容量
      const capacityCheck = userManager.canAddMistake(currentMistakeCount);
      if (!capacityCheck.allowed) {
        // 如果容量不足，只保存一部分错题（或给出提示）
        console.warn('生词本容量不足:', capacityCheck.reason);
        wx.showToast({
          title: '生词本已满，升级会员解锁',
          icon: 'none',
          duration: 3000
        });
        return;
      }
      
      mistakes.forEach(mistake => {
        const word = mistake.question;
        if (mistakeBook[word]) {
          // 更新已存在的错题
          mistakeBook[word].errorCount++;
          mistakeBook[word].lastErrorTime = mistake.timestamp;
          mistakeBook[word].errorHistory.push({
            selectedAnswer: mistake.selectedAnswer,
            timestamp: mistake.timestamp,
            level: mistake.questionLevel
          });
        } else {
          // 添加新错题
          mistakeBook[word] = {
            word: word,
            phonetic: mistake.phonetic || '', // 保存音标信息
            correctAnswer: mistake.correctAnswer,
            level: mistake.questionLevel || 1,
            errorCount: 1,
            firstErrorTime: mistake.timestamp,
            lastErrorTime: mistake.timestamp,
            errorHistory: [{
              selectedAnswer: mistake.selectedAnswer,
              timestamp: mistake.timestamp,
              level: mistake.questionLevel
            }],
            mastered: false
          };
        }
      });

      wx.setStorageSync('mistakeBook', mistakeBook);
      console.log('保存错题:', mistakes.length, '个');
      
    } catch (error) {
      console.error('保存错题失败:', error);
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

  // 播放单词发音
  playPronunciation() {
    if (!this.data.currentQuestion || !this.data.currentQuestion.word) {
      wx.showToast({
        title: '暂无单词可播放',
        icon: 'none'
      });
      return;
    }

    const word = this.data.currentQuestion.word;
    const phonetic = this.data.currentQuestion.phonetic || '';
    
    // 如果有缓存，则允许立即播放；如果没有缓存且正在播放，则防抖
    if (!this.data.audioCache[word] && this.data.isPlaying) {
      console.log('正在播放中，忽略重复点击');
      return;
    }
    
    try {
      // 尝试播放（缓存或网络）
      this.playWordWithTTS(word);
      
    } catch (error) {
      console.error('播放发音失败:', error);
      // 备用方案：提示用户自己朗读
      this.showPronunciationGuide(word, phonetic);
    }
  },

  // 使用在线TTS服务播放单词
  playWordWithTTS(word) {
    // 检查缓存中是否已有该单词的音频
    if (this.data.audioCache[word]) {
      this.playFromCache(word);
      return;
    }
    wx.showLoading({
      title: '正在加载发音...'
    });

    // 创建音频上下文
    const audioContext = wx.createInnerAudioContext();
    
    // 使用有道词典的TTS服务
    const ttsUrl = `https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(word)}&type=1`;
    
    audioContext.src = ttsUrl;
    audioContext.autoplay = true;
    
    audioContext.onPlay(() => {
      wx.hideLoading();
      this.setData({ isPlaying: true });
      
      // 播放成功时立即缓存这个URL
      const cache = this.data.audioCache;
      cache[word] = ttsUrl;
      this.setData({ audioCache: cache });
    });
    
    audioContext.onEnded(() => {
      this.setData({ isPlaying: false });
      audioContext.destroy();
    });
    
    audioContext.onError((err) => {
      wx.hideLoading();
      console.error('音频播放失败:', err);
      this.setData({ isPlaying: false });
      audioContext.destroy();
      
      // 如果失败，显示发音指导
      this.showPronunciationGuide(word, this.data.currentQuestion ? this.data.currentQuestion.phonetic || '' : '');
    });

    audioContext.onStop(() => {
      this.setData({ isPlaying: false });
      audioContext.destroy();
    });
  },

  // 从缓存播放音频
  playFromCache(word) {
    const cachedUrl = this.data.audioCache[word];
    
    if (!cachedUrl) {
      this.playWordWithTTS(word);
      return;
    }
    
    const audioContext = wx.createInnerAudioContext();
    audioContext.src = cachedUrl;
    audioContext.autoplay = true;
    
    audioContext.onPlay(() => {
      this.setData({ isPlaying: true });
    });
    
    audioContext.onEnded(() => {
      this.setData({ isPlaying: false });
      audioContext.destroy();
    });
    
    audioContext.onError((err) => {
      console.error('缓存播放失败:', err);
      this.setData({ isPlaying: false });
      audioContext.destroy();
      
      // 缓存失效，重新从网络加载
      const cache = this.data.audioCache;
      delete cache[word];
      this.setData({ audioCache: cache });
      this.playWordWithTTS(word);
    });

    audioContext.onStop(() => {
      this.setData({ isPlaying: false });
      audioContext.destroy();
    });
  },



  // 尝试备用TTS服务
  tryAlternativeTTS(word) {
    
    // 直接回退到发音指导，避免复杂的备用方案
    this.showPronunciationGuide(word, this.data.currentQuestion ? this.data.currentQuestion.phonetic || '' : '');
  },

  // 显示发音指导
  showPronunciationGuide(word, phonetic) {
    wx.showModal({
      title: '🔊 发音指导',
      content: `单词：${word}\n音标：${phonetic}\n\n由于网络原因无法播放，请根据音标练习发音`,
      confirmText: '知道了',
      showCancel: false
    });
  },

  // 页面返回事件
  onBackPress() {
    this.showExitModal();
    return true; // 阻止默认返回行为
  },



  // 根据年级获取测试阶段
  getTestStageByGrade(gradeId) {
    const gradeNum = parseInt(gradeId.replace('grade', ''));
    if (gradeNum <= 6) return 'primary';
    if (gradeNum <= 9) return 'junior';
    return 'senior';
  },

  // 分享功能
  onShareAppMessage() {
    return {
      title: `我正在测试英语词汇量，已完成${this.data.currentIndex}/${this.data.totalQuestions}题`,
      path: '/pages/index/index'
    };
  }
});