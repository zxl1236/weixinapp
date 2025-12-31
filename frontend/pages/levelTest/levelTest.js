// 水平测试页面 - 独立实现，不依赖 learning.js
const cdnWordLoader = require('../../utils/cdnWordLoader.js');
const { userManager } = require('../../utils/userManager.js');

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
    gradeId: '',
    gradeName: '',
    quantity: 20, // 测试单词数量
    
    // 测试数据
    allWords: [], // 所有单词
    testWords: [], // 抽取的测试单词
    currentIndex: 0, // 当前测试单词索引
    currentWord: null, // 当前单词
    
    // 答案记录
    answers: [], // [{word, userAnswer, correctAnswer, isCorrect, timestamp}]
    testStartTime: 0, // 测试开始时间
    
    // 界面状态
    loading: true,
    userInput: '', // 用户输入的中文含义
    showResult: false, // 是否显示答案结果
    isCorrect: false, // 当前答案是否正确
  },

  onLoad(options) {
    const { grade, gradeName, quantity } = options;
    
    if (!grade) {
      wx.showModal({
        title: '参数错误',
        content: '缺少年级参数',
        showCancel: false,
        success: () => {
          wx.navigateBack();
        }
      });
      return;
    }

    // 非会员年级限制（防止直接打开本页绕过入口校验）
    const gradeNum = extractGradeNumber(grade);
    if (gradeNum !== null && !userManager.canAccessGrade(gradeNum)) {
      const membershipStatus = userManager.getMembershipStatus();
      const accessibleGrades = (membershipStatus.config.accessibleGrades || []).join('、') || '当前开放年级';
      showBlockedModal(`免费版仅支持访问 ${accessibleGrades} 年级内容`);
      return;
    }

    // 非会员每日测试次数限制（防止绕过 gradeTest 的校验）
    const canTest = userManager.canTakeTest();
    if (!canTest.allowed) {
      showBlockedModal(canTest.reason);
      return;
    }

    this.setData({
      gradeId: grade,
      gradeName: decodeURIComponent(gradeName || ''),
      quantity: quantity ? parseInt(quantity) : 20,
      testStartTime: Date.now()
    });

    this.loadWords();
  },

  // 加载年级词汇数据
  async loadWords() {
    try {
      wx.showLoading({
        title: '加载词汇中...'
      });

      // 从 cdn-data 加载年级词汇
      let allWords = await cdnWordLoader.getGradeWords(this.data.gradeId);
      
      if (!allWords || !Array.isArray(allWords) || allWords.length === 0) {
        wx.hideLoading();
        wx.showModal({
          title: '加载失败',
          content: '无法加载该年级的词汇数据',
          showCancel: false,
          success: () => {
            wx.navigateBack();
          }
        });
        return;
      }

      // 记录测试次数（仅当数据加载成功，认为测试已开始）
      if (!this._recordedTest) {
        userManager.recordTest();
        this._recordedTest = true;
      }

      // 去重处理：仅按唯一ID（优先 serialNumber）去重，避免按 word 误合并
      allWords = this.removeDuplicateWords(allWords);

      // 随机抽取测试单词
      const testWords = this.selectTestWords(allWords, this.data.quantity);
      
      if (testWords.length === 0) {
        wx.hideLoading();
        wx.showModal({
          title: '数据不足',
          content: '该年级词汇数量不足，无法进行测试',
          showCancel: false,
          success: () => {
            wx.navigateBack();
          }
        });
        return;
      }

      this.setData({
        allWords: allWords,
        testWords: testWords,
        currentWord: testWords[0],
        currentIndex: 0,
        loading: false
      });

      wx.hideLoading();
    } catch (error) {
      console.error('❌ 加载词汇失败:', error);
      wx.hideLoading();
      wx.showModal({
        title: '加载失败',
        content: '词汇数据加载失败，请稍后重试',
        showCancel: false,
        success: () => {
          wx.navigateBack();
        }
      });
    }
  },

  // 去重函数：根据 word 字段去除重复单词
  removeDuplicateWords(words) {
    const seen = new Set();
    return words.filter(word => {
      const id =
        (word && word.serialNumber !== undefined && word.serialNumber !== null) ? String(word.serialNumber) :
        (word && word.id !== undefined && word.id !== null) ? String(word.id) :
        (word && word.word ? String(word.word) : '');
      const key = id.trim();
      if (!key || seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  },

  // 随机抽取测试单词 - 改进版，确保每次抽取都有更好的随机性
  selectTestWords(allWords, count) {
    if (!allWords || allWords.length === 0) {
      return [];
    }

    if (allWords.length <= count) {
      // 如果单词总数少于需要的数量，返回所有单词的随机排列
      return this.shuffle([...allWords]);
    }

    // 使用改进的随机抽取算法，避免连续多次测试抽到相同组合
    const result = [];
    const availableWords = [...allWords];

    // 添加时间戳和用户相关因子作为随机种子，确保每次测试都有不同结果
    const timestamp = Date.now();
    const sessionSeed = (timestamp + Math.random() * 1000) % 1000; // 结合时间戳和随机数

    // 尝试获取用户相关信息作为额外种子（如果有的话）
    let userSeed = 0;
    try {
      const openid = wx.getStorageSync('openid') || '';
      // 将openid转换为数字种子
      for (let i = 0; i < Math.min(openid.length, 5); i++) {
        userSeed += openid.charCodeAt(i);
      }
    } catch (e) {
      // 如果获取失败，使用默认值
      userSeed = Math.floor(Math.random() * 100);
    }

    const combinedSeed = (sessionSeed + userSeed) / 1000;

    // 获取最近的测试历史，避免短时间内抽取相同单词
    const recentTestsKey = `recent_level_tests_${this.data.gradeId}`;
    let recentTestWords = [];
    try {
      recentTestWords = wx.getStorageSync(recentTestsKey) || [];
      // 只保留最近2次的测试记录
      recentTestWords = recentTestWords.slice(-2);
    } catch (e) {
      recentTestWords = [];
    }

    for (let i = 0; i < count; i++) {
      // 使用组合种子生成随机索引，确保每次都有不同的分布
      const randomValue = Math.random() + combinedSeed + i * 0.1;
      let randomIndex = Math.floor(randomValue * availableWords.length) % availableWords.length;

      // 如果可能的话，避免选择最近测试中出现过的单词
      if (availableWords.length > count && recentTestWords.length > 0) {
        const selectedWord = availableWords[randomIndex];
        const isRecent = recentTestWords.some(recentTest =>
          recentTest.some(word => word === selectedWord.word)
        );

        // 如果是最近测试过的单词，尝试找一个没测试过的
        if (isRecent) {
          for (let attempt = 0; attempt < Math.min(availableWords.length, 5); attempt++) {
            const newIndex = (randomIndex + attempt + 1) % availableWords.length;
            const newWord = availableWords[newIndex];
            const newIsRecent = recentTestWords.some(recentTest =>
              recentTest.some(word => word === newWord.word)
            );

            if (!newIsRecent) {
              randomIndex = newIndex;
              break;
            }
          }
        }
      }

      result.push(availableWords[randomIndex]);
      availableWords.splice(randomIndex, 1);
    }

    // 保存本次测试的单词到历史记录
    const currentTestWords = result.map(w => w.word);
    recentTestWords.push(currentTestWords);
    try {
      wx.setStorageSync(recentTestsKey, recentTestWords);
    } catch (e) {
      console.warn('保存测试历史失败:', e);
    }

    return result;
  },

  // 随机打乱数组
  shuffle(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  },

  // 用户输入变化
  onInputChange(e) {
    this.setData({
      userInput: e.detail.value
    });
  },

  // 提交答案
  submitAnswer() {
    const { currentWord, userInput, currentIndex, testWords } = this.data;
    
    if (!userInput || !userInput.trim()) {
      wx.showToast({
        title: '请输入答案',
        icon: 'none'
      });
      return;
    }

    if (!currentWord) {
      return;
    }

    // 标准化答案（去除空格、标点等）
    const normalizedUserAnswer = this.normalizeAnswer(userInput);
    const normalizedCorrectAnswer = this.normalizeAnswer(currentWord.meaning);
    
    // 判断是否正确（支持部分匹配，比如"蛋糕；糕点"可以匹配"蛋糕"）
    const isCorrect = this.checkAnswer(normalizedUserAnswer, normalizedCorrectAnswer);
    
    // 记录答案（只记录第一次尝试）
    const answerRecord = {
      word: currentWord.word,
      userAnswer: userInput.trim(),
      correctAnswer: currentWord.meaning,
      isCorrect: isCorrect,
      timestamp: Date.now()
    };

    const answers = [...this.data.answers, answerRecord];
    
    this.setData({
      answers: answers,
      showResult: true,
      isCorrect: isCorrect
    });

    // 显示结果提示
    if (isCorrect) {
      wx.showToast({
        title: '回答正确！',
        icon: 'success',
        duration: 800
      });
    } else {
      wx.showToast({
        title: '回答错误',
        icon: 'error',
        duration: 800
      });
    }

    // 答错自动跳转下一个，答对也跳转（水平测试不需要重试）
    setTimeout(() => {
      this.moveToNextWord();
    }, 1000);
  },

  // 标准化答案
  normalizeAnswer(answer) {
    if (!answer) return '';
    return answer
      .replace(/[，。、；：！？\s]/g, '') // 去除标点和空格
      .toLowerCase()
      .trim();
  },

  // 检查答案是否正确（支持部分匹配）
  checkAnswer(userAnswer, correctAnswer) {
    if (!userAnswer || !correctAnswer) return false;
    
    const normalizedUser = this.normalizeAnswer(userAnswer);
    const normalizedCorrect = this.normalizeAnswer(correctAnswer);
    
    // 完全匹配
    if (normalizedUser === normalizedCorrect) {
      return true;
    }
    
    // 部分匹配：如果正确答案包含多个含义（用分号、逗号或空格分隔），检查用户答案是否匹配其中一个
    // 例如："蛋糕；糕点" 可以匹配 "蛋糕" 或 "糕点"
    const correctParts = normalizedCorrect.split(/[；;，,\s]+/).filter(part => part.trim());
    
    return correctParts.some(part => {
      const trimmedPart = part.trim();
      if (!trimmedPart) return false;
      
      // 用户答案包含正确答案的一部分，或正确答案的一部分包含用户答案
      return normalizedUser === trimmedPart || 
             normalizedUser.includes(trimmedPart) || 
             trimmedPart.includes(normalizedUser);
    });
  },

  // 跳转到下一个单词
  moveToNextWord() {
    const { currentIndex, testWords, answers } = this.data;
    
    // 检查是否完成所有测试
    if (currentIndex >= testWords.length - 1) {
      // 完成测试，跳转到结果页面
      this.finishTest();
      return;
    }

    // 移动到下一个单词
    const nextIndex = currentIndex + 1;
    const nextWord = testWords[nextIndex];

    this.setData({
      currentIndex: nextIndex,
      currentWord: nextWord,
      userInput: '',
      showResult: false,
      isCorrect: false
    });
  },

  // 完成测试
  finishTest() {
    const { answers, testStartTime, gradeId, gradeName } = this.data;
    
    if (!answers || answers.length === 0) {
      wx.showModal({
        title: '测试数据异常',
        content: '测试答案数据不完整',
        showCancel: false,
        success: () => {
          wx.navigateBack();
        }
      });
      return;
    }

    const testDuration = Math.max(1, Math.floor((Date.now() - testStartTime) / 1000));
    const total = answers.length;
    const score = answers.filter(a => a.isCorrect === true).length;
    const percentage = total > 0 ? Math.round((score / total) * 100) : 0;

    // 构建测试结果对象
    const testResult = {
      score: score,
      total: total,
      percentage: percentage,
      duration: testDuration,
      answers: answers.map(a => ({
        question: a.word || '',
        userAnswer: a.userAnswer || '',
        correctAnswer: a.correctAnswer || '',
        isCorrect: a.isCorrect === true,
        phonetic: '' // 可以添加音标信息
      }))
    };

    // 跳转到结果页面
    wx.redirectTo({
      url: `/pages/result/result?result=${encodeURIComponent(JSON.stringify(testResult))}&grade=${gradeId || ''}&stage=test`
    });
  },

  // 跳过当前单词（可选功能）
  skipWord() {
    const { currentWord } = this.data;
    
    if (!currentWord) return;

    // 记录为错误（跳过视为错误）
    const answerRecord = {
      word: currentWord.word,
      userAnswer: '[跳过]',
      correctAnswer: currentWord.meaning,
      isCorrect: false,
      timestamp: Date.now()
    };

    const answers = [...this.data.answers, answerRecord];
    this.setData({ answers });

    // 跳转到下一个单词
    this.moveToNextWord();
  }
});

