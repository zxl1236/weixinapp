// 发音功能 - 优化版本减少延迟
let voicesLoaded = false;
let cachedVoices = [];

// 预加载语音列表
function preloadVoices() {
  if (voicesLoaded) return;
  
  cachedVoices = speechSynthesis.getVoices();
  if (cachedVoices.length > 0) {
    voicesLoaded = true;
    console.log(`🎙️ 语音预加载完成，共${cachedVoices.length}个语音`);
  } else {
    // 监听语音加载事件
    speechSynthesis.addEventListener('voiceschanged', () => {
      cachedVoices = speechSynthesis.getVoices();
      voicesLoaded = true;
      console.log(`🎙️ 语音延迟加载完成，共${cachedVoices.length}个语音`);
    }, { once: true });
  }
}

function playPronunciation(word) {
  console.log(`🔊 播放单词: ${word}`);
  
  try {
    // 检查浏览器支持
    if (!('speechSynthesis' in window)) {
      console.warn('❌ 浏览器不支持语音合成功能');
      return;
    }
    
    // 立即停止当前播放
    if (speechSynthesis.speaking) {
      speechSynthesis.cancel();
    }
    
    // 创建语音实例
    const utterance = new SpeechSynthesisUtterance(word);
    
    // 快速设置基本参数
    utterance.lang = 'en-US';
    utterance.rate = 0.9; // 稍微快一点
    utterance.pitch = 1.0;
    utterance.volume = 1.0;
    
    // 尝试使用预加载的英语语音
    if (voicesLoaded && cachedVoices.length > 0) {
      const englishVoice = cachedVoices.find(voice => 
        voice.lang.startsWith('en-US') && voice.localService
      ) || cachedVoices.find(voice => 
        voice.lang.startsWith('en-')
      );
      
      if (englishVoice) {
        utterance.voice = englishVoice;
        console.log(`🎤 使用语音: ${englishVoice.name}`);
      }
    }
    
    // 简化事件监听
    utterance.onstart = () => console.log(`✅ 播放: ${word}`);
    utterance.onerror = (event) => console.error(`❌ 播放错误: ${word}`, event.error);
    
    // 立即播放
    speechSynthesis.speak(utterance);
    
    // 检查播放状态（减少延迟检查）
    setTimeout(() => {
      if (!speechSynthesis.speaking && !speechSynthesis.pending) {
        console.warn(`⚠️ ${word} 可能未播放`);
        // 备用播放方案
        const backup = new SpeechSynthesisUtterance(word);
        backup.rate = 1.0;
        backup.volume = 0.8;
        speechSynthesis.speak(backup);
      }
    }, 200); // 减少到200ms
    
  } catch (error) {
    console.error('❌ 播放失败:', error);
  }
}

// 页面加载时预加载语音
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', preloadVoices);
  // 也可以立即尝试预加载
  setTimeout(preloadVoices, 100);
}

// 手动播放测试函数
function manualPlayTest(word) {
  console.log(`🧪 手动测试播放: ${word}`);
  
  try {
    speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(word);
    utterance.rate = 0.8;
    utterance.volume = 1.0;
    utterance.lang = 'en-US';
    
    utterance.addEventListener('start', () => {
      console.log(`✅ 手动测试播放开始: ${word}`);
      alert(`✅ 开始播放: ${word}`);
    });
    
    utterance.addEventListener('end', () => {
      console.log(`✅ 手动测试播放结束: ${word}`);
    });
    
    utterance.addEventListener('error', (event) => {
      console.error(`❌ 手动测试播放错误: ${word}`, event);
      alert(`❌ 播放错误: ${event.error || '未知错误'}`);
    });
    
    speechSynthesis.speak(utterance);
    console.log(`🎵 发送手动播放请求: ${word}`);
    
  } catch (error) {
    console.error(`❌ 手动测试异常: ${word}`, error);
    alert(`手动测试失败: ${error.message}`);
  }
}

// 音频预热 - 减少首次播放延迟
function warmupAudio() {
  try {
    // 播放一个无声的短音频来激活音频上下文
    const warmup = new SpeechSynthesisUtterance('');
    warmup.volume = 0.01; // 几乎无声
    warmup.rate = 10; // 极快播放
    speechSynthesis.speak(warmup);
    console.log('🔥 音频预热完成');
  } catch (error) {
    console.log('⚠️ 音频预热失败:', error);
  }
}

// 快速播放函数 - 针对延迟优化
function quickPlay(word) {
  // 立即创建和播放，减少中间步骤
  const utterance = new SpeechSynthesisUtterance(word);
  utterance.lang = 'en-US';
  utterance.rate = 0.9;
  utterance.volume = 1.0;
  
  // 如果有缓存的本地语音，直接使用
  if (voicesLoaded && cachedVoices.length > 0) {
    const localVoice = cachedVoices.find(voice => 
      voice.localService && voice.lang.startsWith('en')
    );
    if (localVoice) utterance.voice = localVoice;
  }
  
  speechSynthesis.speak(utterance);
}

// 在用户首次交互时预热音频
let audioWarmedUp = false;
function ensureAudioReady() {
  if (!audioWarmedUp) {
    warmupAudio();
    audioWarmedUp = true;
  }
}

// 确保函数在全局作用域中可用
window.playPronunciation = playPronunciation;
window.manualPlayTest = manualPlayTest;
window.quickPlay = quickPlay;
window.ensureAudioReady = ensureAudioReady;

// 全局变量
let currentTest = {
  questions: [],
  currentIndex: 0,
  score: 0,
  totalQuestions: 20,
  selectedAnswer: null,
  showResult: false,
  startTime: 0,
  answers: [],
  questionStartTime: 0,
  correctIndex: -1,
  isRealTimeAdaptive: false,
  isPaused: false,
  pausedTime: 0,
  totalPausedTime: 0
};

// 显示测试加载动画
function showTestLoadingAnimation(questionCount, onComplete) {
  const questionCard = document.getElementById('modernQuestionCard');
  if (!questionCard) return;
  
  const loadingSteps = [
    { text: '📚 正在加载词汇库...', duration: 600 },
    { text: `🎯 正在生成 ${questionCount} 道题目...`, duration: 800 },
    { text: '🚀 准备开始测试...', duration: 400 }
  ];
  
  let currentStep = 0;
  let totalDuration = loadingSteps.reduce((sum, step) => sum + step.duration, 0);
  let elapsedTime = 0;
  
  function showLoadingStep() {
    if (currentStep >= loadingSteps.length) {
      // 动画完成，调用回调函数
      if (onComplete && typeof onComplete === 'function') {
        setTimeout(() => {
          onComplete();
        }, 200);
      }
      return;
    }
    
    const step = loadingSteps[currentStep];
    const progress = Math.round((elapsedTime / totalDuration) * 100);
    
    questionCard.innerHTML = `
      <div style="text-align: center; padding: 50px 40px;">
        <div style="font-size: 28px; margin-bottom: 35px; color: #2d3748; font-weight: 600; letter-spacing: 0.5px;">${step.text}</div>
        <div style="background: rgba(74, 144, 226, 0.1); border-radius: 20px; height: 24px; margin: 30px 0; overflow: hidden; box-shadow: inset 0 3px 6px rgba(0,0,0,0.1); border: 1px solid rgba(74, 144, 226, 0.2);">
          <div style="background: linear-gradient(90deg, #4A90E2, #357ABD, #4A90E2, #667eea); background-size: 200% 100%; animation: progressFlow 2s ease-in-out infinite; height: 100%; width: ${progress}%; border-radius: 20px; transition: width 0.5s ease; box-shadow: 0 3px 12px rgba(74, 144, 226, 0.4);"></div>
        </div>
        <div style="font-size: 18px; color: #718096; margin-bottom: 25px; font-weight: 500;">正在准备您的专属测试... ${progress}%</div>
        <div style="margin-top: 25px;">
          <div style="display: inline-block; width: 10px; height: 10px; border-radius: 50%; background: #4A90E2; margin: 0 5px; animation: loadingDot 1.4s infinite ease-in-out; animation-delay: -0.32s;"></div>
          <div style="display: inline-block; width: 10px; height: 10px; border-radius: 50%; background: #4A90E2; margin: 0 5px; animation: loadingDot 1.4s infinite ease-in-out; animation-delay: -0.16s;"></div>
          <div style="display: inline-block; width: 10px; height: 10px; border-radius: 50%; background: #4A90E2; margin: 0 5px; animation: loadingDot 1.4s infinite ease-in-out;"></div>
        </div>
      </div>
      <style>
        @keyframes loadingDot {
          0%, 80%, 100% { 
            transform: scale(0.8);
            opacity: 0.5;
          }
          40% { 
            transform: scale(1.2);
            opacity: 1;
          }
        }
        @keyframes progressFlow {
          0% { 
            background-position: 0% 50%; 
          }
          50% { 
            background-position: 100% 50%; 
          }
          100% { 
            background-position: 0% 50%; 
          }
        }
      </style>
    `;
    
    elapsedTime += step.duration;
    currentStep++;
    
    setTimeout(showLoadingStep, step.duration);
  }
  
  showLoadingStep();
}

// 计时器管理类
class TimerManager {
  constructor() {
    this.timerInterval = null;
    this.isRunning = false;
  }

  start() {
    if (this.isRunning) return;
    
    // 如果还没有开始时间，设置开始时间
    if (!currentTest.startTime) {
      currentTest.startTime = Date.now();
    }
    
    this.isRunning = true;
    this.timerInterval = setInterval(() => {
      this.updateDisplay();
    }, 1000);
  }

  pause() {
    if (!this.isRunning) return;
    
    currentTest.isPaused = true;
    currentTest.pausedTime = Date.now();
    this.incrementPauseCount();
    this.stop();
  }

  resume() {
    if (!currentTest.isPaused) return;
    
    currentTest.totalPausedTime += Date.now() - currentTest.pausedTime;
    currentTest.isPaused = false;
    this.start();
  }

  stop() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
    this.isRunning = false;
  }

  reset() {
    this.stop();
    currentTest.startTime = 0;
    currentTest.totalPausedTime = 0;
    currentTest.isPaused = false;
  }

  getElapsedTime() {
    if (!currentTest.startTime) return 0;
    
    const now = currentTest.isPaused ? currentTest.pausedTime : Date.now();
    return Math.floor((now - currentTest.startTime - currentTest.totalPausedTime) / 1000);
  }

  getQuestionTime() {
    if (!currentTest.questionStartTime) return 0;
    return Date.now() - currentTest.questionStartTime;
  }

  updateDisplay() {
    const testTimer = document.getElementById('testTimer');
    if (!testTimer) return;

    const elapsed = this.getElapsedTime();
    const minutes = Math.floor(elapsed / 60);
    const seconds = elapsed % 60;
    
    testTimer.textContent = `用时: ${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    
    // 添加暂停状态指示
    if (currentTest.isPaused) {
      testTimer.textContent += ' (已暂停)';
      testTimer.style.color = '#f59e0b';
    } else {
      testTimer.style.color = '';
    }
  }

  formatTime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}小时${minutes}分${secs}秒`;
    } else if (minutes > 0) {
      return `${minutes}分${secs}秒`;
    } else {
      return `${secs}秒`;
    }
  }

  // 获取统计信息
  getStats() {
    return {
      totalTime: this.getElapsedTime(),
      pausedTime: Math.floor(currentTest.totalPausedTime / 1000),
      activeTime: this.getElapsedTime() - Math.floor(currentTest.totalPausedTime / 1000),
      pauseCount: currentTest.pauseCount || 0
    };
  }

  // 记录暂停次数
  incrementPauseCount() {
    currentTest.pauseCount = (currentTest.pauseCount || 0) + 1;
  }
}

// 创建全局计时器实例
const timerManager = new TimerManager();

// 已删除：硬编码题目函数，现在使用Excel导入的数据

// 通用的测试初始化函数
function initializeTestWithQuestions(questions, questionCount) {
  try {
    const isAdaptive = questions.length < questionCount;
    
    // 确保实际题目数量
    const actualQuestionCount = Math.min(questions.length, questionCount);
    console.log(`📊 测试初始化: 请求${questionCount}题, 实际可用${questions.length}题, 最终使用${actualQuestionCount}题`);
    
    // 保留已存在的level信息
    const existingLevel = (typeof currentTest !== 'undefined' && currentTest) ? currentTest.level : undefined;
    
    currentTest = {
      questions: questions,
      currentIndex: 0,
      score: 0,
      totalQuestions: actualQuestionCount, // 使用实际可用的题目数量
      selectedAnswer: null,
      showResult: false,
      startTime: Date.now(),
      questionStartTime: Date.now(),
      answers: [],
      adaptiveMode: true,
      isRealTimeAdaptive: isAdaptive,
      testMode: isAdaptive ? 'unified_adaptive' : 'basic_static',
      testLength: actualQuestionCount, // 修正测试长度
      isPaused: false,
      pausedTime: 0,
      totalPausedTime: 0,
      level: existingLevel // 保留级别信息
    };
    
    // 重置并启动计时器
    timerManager.reset();
    timerManager.start();
    
    
    // 显示第一道题目
    console.log('✨ 开始显示题目');
    loadQuestion();
    
  } catch (error) {
    console.error('测试初始化失败:', error);
    alert('测试初始化失败，请刷新页面重试');
  }
}

// 页面元素
const homePage = document.getElementById('homePage');
const testPage = document.getElementById('testPage');
const resultPage = document.getElementById('resultPage');

// 已删除：旧的认知自适应测试函数，现在使用 startTestByLevel

// 已删除：旧的ECDICT扩展测试函数，现在使用 startTestByLevel

// 已删除：旧的基础词汇测试函数，现在使用 startTestByLevel

// 已删除：旧的统一自适应测试函数，现在使用 startTestByLevel

// 已删除：旧的兼容函数，现在使用 startTestByLevel

// 现代化反馈动画
function showModernFeedback(element, icon, type) {
  // 创建反馈元素
  const feedback = document.createElement('div');
  feedback.className = `modern-feedback ${type}`;
  feedback.innerHTML = icon;
  
  // 设置样式
  feedback.style.cssText = `
    position: absolute;
    top: 50%;
    right: 20px;
    transform: translateY(-50%);
    width: 36px;
    height: 36px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 18px;
    font-weight: bold;
    z-index: 10;
    animation: ${type === 'success' ? 'successPop' : type === 'error' ? 'errorShake' : 'correctAnswerPulse'} 0.6s ease-out;
  `;
  
  // 根据类型设置背景
  if (type === 'success' || type === 'correct-answer') {
    feedback.style.background = 'rgba(255, 255, 255, 0.95)';
    feedback.style.color = '#00c851';
    feedback.style.boxShadow = '0 4px 12px rgba(0, 200, 81, 0.4)';
    feedback.style.border = '2px solid rgba(0, 200, 81, 0.3)';
  } else {
    feedback.style.background = 'rgba(255, 255, 255, 0.95)';
    feedback.style.color = '#ff4444';
    feedback.style.boxShadow = '0 4px 12px rgba(255, 68, 68, 0.4)';
    feedback.style.border = '2px solid rgba(255, 68, 68, 0.3)';
  }
  
  element.style.position = 'relative';
  element.appendChild(feedback);
  
  // 清理
  setTimeout(() => {
    if (feedback.parentNode) {
      feedback.remove();
    }
  }, 3000);
}

// 显示页面
function showPage(pageId) {
  // 隐藏所有页面
  const allPages = document.querySelectorAll('[id$="Page"]');
  allPages.forEach(page => {
    page.classList.add('hidden');
    page.style.display = 'none';
  });
  
  // 显示目标页面
  const targetPage = document.getElementById(pageId);
  if (targetPage) {
    targetPage.classList.remove('hidden');
    if (pageId === 'testPage') {
      targetPage.style.display = 'flex';
    } else {
      targetPage.style.display = 'block';
    }
  } else {
    console.error('页面不存在:', pageId);
  }
}

// 加载题目 - 支持实时自适应
async function loadQuestion() {
  let question = null;
  
  // 检查题目索引是否超出范围
  if (currentTest.currentIndex >= currentTest.questions.length) {
    console.log(`⚠️ 题目索引超出范围: ${currentTest.currentIndex} >= ${currentTest.questions.length}`);
        finishTest();
        return;
      }
  
    // 使用预生成的题目
    question = currentTest.questions[currentTest.currentIndex];
  
  console.log(`📖 加载题目 ${currentTest.currentIndex + 1}/${currentTest.totalQuestions}: ${question?.word || '未知'}`)
  
  if (!question) {
    console.error('Question not found at index:', currentTest.currentIndex);
    return;
  }

  // 使用预先计算的correctIndex，如果没有则回退到查找逻辑
  let correctIndex = question.correctIndex;
  if (correctIndex === undefined || correctIndex === -1) {
    // 回退逻辑：查找匹配的选项
    correctIndex = question.options.findIndex(option => 
      option === question.meaning || 
      option === question.correctAnswerFull ||
      option.includes(question.meaning)
    );
  }
  const levelDisplay = getLevelDisplay(question.level, question.difficulty);
  
  // 更新现代界面的进度显示 - 使用安全DOM操作
  const progressPercentage = Math.round(((currentTest.currentIndex + 1) / currentTest.totalQuestions) * 100);
  
  const modernProgressText = document.getElementById('modernProgressText');
  const modernProgressBar = document.getElementById('modernProgressBar');
  const testTimer = document.getElementById('testTimer');
  
  if (modernProgressText) modernProgressText.textContent = `${progressPercentage}%`;
  if (modernProgressBar) modernProgressBar.style.width = `${progressPercentage}%`;
  
  // 更新计时器
  timerManager.updateDisplay();
  
  // 构建现代化的题目卡片 - 统一布局
  const modernQuestionHTML = `
    <div class="word-main">
      <div class="word-text">
        ${question.word}
        <button class="pronunciation-btn" onclick="ensureAudioReady(); playPronunciation('${question.word}')" title="播放发音">
          🔊
        </button>
      </div>
      ${question.phonetic ? `<div class="phonetic">${question.phonetic}</div>` : ''}
      ${question.partOfSpeech ? `<div class="part-of-speech"><span class="pos-tag">${question.partOfSpeech}</span></div>` : ''}
      ${getK12LevelTag(question)}
    </div>
    
    <div class="modern-options">
      ${question.options.map((option, index) => `
        <div class="modern-option" data-index="${index}" onclick="selectModernOption(${index})">
          <span class="option-text">${option}</span>
          <div class="option-feedback" style="display: none;"></div>
        </div>
      `).join('')}
    </div>
    

  `;
  
  // K12专用等级标签显示
  function getK12LevelTag(word) {
    let levelTag = '';
    
    if (word.level === 'primary') {
      levelTag = `<div class="level-tag primary">小学</div>`;
    } else if (word.level === 'junior') {
      levelTag = `<div class="level-tag junior">初中</div>`;
    } else if (word.level === 'senior') {
      levelTag = `<div class="level-tag senior">高中</div>`;
    }
    
    // 显示难度星级（1-8星）
    if (word.difficulty) {
      const stars = '★'.repeat(Math.min(word.difficulty, 5));
      const emptyStars = '☆'.repeat(Math.max(0, 5 - word.difficulty));
      levelTag += `<div class="difficulty-stars">${stars}${emptyStars}</div>`;
    }
    
    return levelTag;
  }
  
  const modernQuestionCard = document.getElementById('modernQuestionCard');
  if (modernQuestionCard) {  
  modernQuestionCard.innerHTML = modernQuestionHTML;
  
  // 为播放按钮添加事件监听器（备用方案）
  setTimeout(() => {
    const pronBtn = modernQuestionCard.querySelector('.pronunciation-btn');
    if (pronBtn) {
      console.log('🔧 为播放按钮添加事件监听器');
      pronBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        console.log(`🔊 通过事件监听器播放: ${question.word}`);
        playPronunciation(question.word);
      });
    }
  }, 100);
    
    // 确保卡片样式一致
    modernQuestionCard.className = 'word-display-card';
    modernQuestionCard.style.display = 'block';
    modernQuestionCard.style.maxWidth = '700px';
    modernQuestionCard.style.width = '90%';
    modernQuestionCard.style.margin = '0 auto 20px auto';
  }
  
  // 确保测试页面背景正确
  const testPage = document.getElementById('testPage');
  if (testPage) {
    testPage.style.background = '#fff';
    testPage.style.minHeight = '100vh';
  }
  
  // 重置状态
  currentTest.selectedAnswer = null;
  currentTest.showResult = false;
  currentTest.correctIndex = correctIndex;
  
  // 添加调试信息
  console.log(`🎯 题目 ${currentTest.currentIndex + 1}: ${question.word}`);
  console.log(`📝 正确答案: ${question.meaning} (${question.partOfSpeech || 'n.'})`);
  console.log(`📝 正确索引: ${correctIndex}`);
  console.log(`📚 选项:`, question.options);
  console.log(`✅ 正确选项:`, question.options[correctIndex]);
  currentTest.questionStartTime = Date.now(); // 记录题目开始时间
  
  // 重置所有选项状态
    setTimeout(() => {
      const modernQuestionCard = document.getElementById('modernQuestionCard');
    if (modernQuestionCard) {
        const options = modernQuestionCard.querySelectorAll('.modern-option');
        options.forEach(option => {
        if (option) {
            option.classList.remove('selected', 'correct', 'wrong', 'incorrect');
            option.style.pointerEvents = 'auto';
            option.style.background = '';
            option.style.border = '';
            option.style.color = '';
            option.style.transform = '';
            option.style.boxShadow = '';
          }
        });
      }
    }, 50);
}

// 获取级别显示文本
function getLevelDisplay(level, difficulty) {
  const levelMap = {
    'primary': '小学词汇',
    'junior': '初中词汇', 
    'senior': '高中词汇',
    'cet': '四六级词汇',
    'ielts_toefl': '雅思托福词汇'
  };
  
  const baseName = levelMap[level] || '词汇';
  return `${baseName} (难度${difficulty})`;
}

// 获取精确的响应时间（排除暂停时间）
function getAccurateResponseTime() {
  if (!currentTest.questionStartTime) return 0;
  
  const questionElapsed = Date.now() - currentTest.questionStartTime;
  // 计算在这道题期间的暂停时间
  const questionPausedTime = currentTest.isPaused ? 
    (currentTest.pausedTime - currentTest.questionStartTime) : 0;
  
  return Math.max(0, questionElapsed - questionPausedTime);
}

// 新的现代选项选择函数
function selectModernOption(index) {
  if (currentTest.showResult) return;
  
  const isCorrect = index === currentTest.correctIndex;
  const question = currentTest.questions[currentTest.currentIndex];
  
  // 记录答案
  currentTest.answers.push({
    question,
    selectedAnswer: index,
    correctAnswer: currentTest.correctIndex,
    isCorrect,
    responseTime: getAccurateResponseTime()
  });
  
  if (isCorrect) {
    currentTest.score++;
  }
  
  // 现代化反馈动效
  const options = document.querySelectorAll('.modern-option');
  const selectedOption = options[index];
  const correctOption = options[currentTest.correctIndex];
  
  // 禁用所有选项
  options.forEach(option => {
    option.style.pointerEvents = 'none';
  });
  
  if (isCorrect) {
    // 正确答案：透明绿色背景 + 成功动画
    selectedOption.style.background = 'rgba(0, 200, 81, 0.1)';
    selectedOption.style.border = '2px solid rgba(0, 200, 81, 0.8)';
    selectedOption.style.color = '#2d3748';
    selectedOption.style.transform = 'scale(1.02)';
    selectedOption.style.boxShadow = '0 4px 15px rgba(0, 200, 81, 0.2)';
    
    // 添加成功动画
    showModernFeedback(selectedOption, '✓', 'success');
  } else {
    // 错误答案：立即显示红色背景和X图标
    selectedOption.style.background = 'rgba(255, 68, 68, 0.1)';
    selectedOption.style.border = '2px solid rgba(255, 68, 68, 0.8)';
    selectedOption.style.color = '#2d3748';
    selectedOption.style.boxShadow = '0 4px 15px rgba(255, 68, 68, 0.2)';
    
    // 立即显示正确答案：绿色背景和✓图标
    if (correctOption) {
      correctOption.style.background = 'rgba(0, 200, 81, 0.1)';
      correctOption.style.border = '2px solid rgba(0, 200, 81, 0.8)';
      correctOption.style.color = '#2d3748';
      correctOption.style.transform = 'scale(1.02)';
      correctOption.style.boxShadow = '0 4px 15px rgba(0, 200, 81, 0.2)';
      showModernFeedback(correctOption, '✓', 'correct-answer');
    }
    
    // 为错误答案添加X图标
    showModernFeedback(selectedOption, '✗', 'error');

    // 将错题添加到错题本
    addWordToMistakeBook(question);
  }
  
  currentTest.showResult = true;
  
  // 根据答案正确性决定延迟时间
  const delay = isCorrect ? 1000 : 2000; // 正确1s，错误2s，缩短错误答案的延迟
  
  setTimeout(() => {
    
    
    // 判断测试是否结束
    const shouldFinish = (currentTest.currentIndex + 1) >= currentTest.totalQuestions || 
                        (currentTest.currentIndex + 1) >= currentTest.questions.length;
    
    if (shouldFinish) {
      // 最后一题：显示完成测试按钮而不是自动跳转
      showFinishTestButton();
    } else {
      nextQuestion();
    }
  }, delay);
}

// 处理完成测试按钮点击
function handleFinishTest() {
  console.log('🔘 开始处理完成测试');
  
  // 创建测试结果对象
  const testResult = {
    score: currentTest.score,
    totalQuestions: currentTest.totalQuestions,
    level: currentTest.level,
    answers: currentTest.answers,
    testTime: timerManager ? timerManager.formatTime(timerManager.getElapsedTime()) : '未知',
    endTime: new Date().toISOString(),
    isReviewMode: currentTest.isReviewMode || false,
    testMode: currentTest.testMode || 'normal'
  };
  
  try {
    // 保存到sessionStorage
    sessionStorage.setItem('testResult', JSON.stringify(testResult));
    console.log('💾 测试结果已保存:', testResult);
    
    // 直接跳转到结果页面
    console.log('🚀 准备跳转到结果页面...');
    window.location.href = 'result_display.html';
  } catch (error) {
    console.error('❌ 处理完成测试失败:', error);
    alert('跳转失败: ' + error.message);
  }
}

// 显示完成测试按钮
function showFinishTestButton() {
  const modernQuestionCard = document.getElementById('modernQuestionCard');
  if (modernQuestionCard) {
    // 在题目卡片下方添加完成测试按钮
    const finishButtonHTML = `
      <div style="text-align: center; margin-top: 30px; padding: 20px;">
        <div style="font-size: 18px; color: #2d3748; margin-bottom: 20px; font-weight: 600;">
          🎉 恭喜！您已完成所有题目
        </div>
        <button onclick="handleFinishTest();" 
                style="background: linear-gradient(135deg, #4A90E2, #357ABD); 
                       color: white; 
                       border: none; 
                       padding: 16px 32px; 
                       border-radius: 50px; 
                       font-size: 18px; 
                       font-weight: 600; 
                       cursor: pointer; 
                       box-shadow: 0 4px 15px rgba(74, 144, 226, 0.3);
                       transition: all 0.3s ease;
                       min-width: 200px;"
                onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 6px 20px rgba(74, 144, 226, 0.4)';"
                onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 15px rgba(74, 144, 226, 0.3)';">
          ✅ 查看测试结果
        </button>
      </div>
    `;
    
    // 将按钮添加到现有内容下方
    modernQuestionCard.innerHTML += finishButtonHTML;
  }
}

// 保留原有的选项选择函数以兼容旧界面
function selectOption(index) {
  return selectModernOption(index);
}

// 提交答案
function submitAnswer() {
  if (currentTest.selectedAnswer === null) return;
  
  const isCorrect = currentTest.selectedAnswer === currentTest.correctIndex;
  
  if (isCorrect) {
    currentTest.score++;
  }
  
  // 记录答案
  const question = currentTest.questions[currentTest.currentIndex];
  currentTest.answers.push({
    question,
    selectedAnswer: currentTest.selectedAnswer,
    correctAnswer: currentTest.correctIndex,
    isCorrect
  });
  
  // 显示结果
  const options = document.querySelectorAll('.option');
  if (options.length > currentTest.correctIndex) {
    const correctOption = options[currentTest.correctIndex];
    correctOption.classList.add('correct');
    const correctIndicator = correctOption.querySelector('.option-indicator');
    if (correctIndicator) {
      correctIndicator.style.display = 'inline';
      correctIndicator.textContent = '✓';
    }
  }
  
  if (!isCorrect && options.length > currentTest.selectedAnswer) {
    const wrongOption = options[currentTest.selectedAnswer];
    wrongOption.classList.add('wrong');
    const wrongIndicator = wrongOption.querySelector('.option-indicator');
    if (wrongIndicator) {
      wrongIndicator.style.display = 'inline';
      wrongIndicator.textContent = '✗';
      wrongIndicator.classList.add('wrong');
    }
  }
  
  // 显示解释
  const explanation = document.getElementById('explanation');
  const explanationText = document.getElementById('explanationText');
  if (explanation) {
    explanation.classList.remove('hidden');
  }
  if (explanationText) {
    explanationText.innerHTML = 
      `<span class="word-highlight">${question.word}</span> 的正确中文意思是 <span class="meaning-highlight">${question.meaning}</span>`;
  }
  
  // 更新得分显示
  const scoreText = document.getElementById('scoreText');
  if (scoreText) {
    scoreText.textContent = `得分: ${currentTest.score}`;
  }
  
  // 显示相应按钮
  const submitBtn = document.getElementById('submitBtn');
  const nextBtn = document.getElementById('nextBtn');
  const finishBtn = document.getElementById('finishBtn');
  
  if (submitBtn) submitBtn.classList.add('hidden');
  
  if (currentTest.currentIndex < currentTest.totalQuestions - 1) {
    if (nextBtn) nextBtn.classList.remove('hidden');
  } else {
    if (finishBtn) finishBtn.classList.remove('hidden');
  }
  
  currentTest.showResult = true;
}

// 下一题
function nextQuestion() {
  currentTest.currentIndex++;
  loadQuestion();
}



// 完成测试
function finishTest() {
  
  // 停止计时器
  timerManager.stop();
  
  const endTime = Date.now();
  // 使用计时器管理器获取准确的测试时间（排除暂停时间）
  const duration = timerManager.getElapsedTime();
  
  // 确保测试数据的完整性
  currentTest.score = currentTest.score || 0;
  currentTest.totalQuestions = currentTest.totalQuestions || 20;
  currentTest.answers = currentTest.answers || [];
  
  // 使用改进的评估算法（更友好，照顾基础薄弱学生）
  const levelInfo = typeof calculateImprovedK12VocabularyLevel === 'function' 
    ? calculateImprovedK12VocabularyLevel(currentTest.score, currentTest.totalQuestions, currentTest.answers)
    : calculateK12VocabularyLevel(currentTest.score, currentTest.totalQuestions, currentTest.answers);
  
  const learningAdvice = getK12LearningAdvice(levelInfo, currentTest.answers);
  
  // 🧠 获取认知自适应测试的特殊信息
  let cognitiveInfo = '';
  if (currentTest.isCognitiveAdaptive && typeof getTestQualityAssessment === 'function') {
    const assessment = getTestQualityAssessment();
    if (assessment) {
      cognitiveInfo = `
        <div class="cognitive-metrics">
          <div class="metric-grid">
            <div class="metric-item">
              <div class="metric-label">能力估计</div>
              <div class="metric-value">${(assessment.ability * 100).toFixed(1)}%</div>
            </div>
            <div class="metric-item">
              <div class="metric-label">置信度</div>
              <div class="metric-value">${(assessment.confidence * 100).toFixed(1)}%</div>
            </div>
            <div class="metric-item">
              <div class="metric-label">测试质量</div>
              <div class="metric-value">${assessment.testQuality}</div>
            </div>
            <div class="metric-item">
              <div class="metric-label">可靠性</div>
              <div class="metric-value">${assessment.reliability}</div>
            </div>
          </div>
        </div>
      `;
    }
  }

  // 尝试使用增强的结果页面
  let resultHTML;
  if (typeof generateEnhancedResultPage === 'function') {
    const testData = {
      score: currentTest.score,
      totalQuestions: currentTest.totalQuestions,
      answers: currentTest.answers,
      duration: duration,
      levelInfo: levelInfo
    };
    
    const enhancedResult = generateEnhancedResultPage(testData);
    resultHTML = enhancedResult.html;
    
    // 储存图表数据供后续使用
    window.currentChartData = enhancedResult.chartData;
  } else {
    // 降级到原始结果页面
    resultHTML = `
    <div class="result-container">
      <!-- 主要成绩展示 -->
      <div class="result-header">
        <div class="score-section">
          <div class="score-display">
            <div class="score-number">${currentTest.score}</div>
            <div class="score-divider">/</div>
            <div class="score-total">${currentTest.totalQuestions}</div>
          </div>
          <div class="score-percentage">${levelInfo.percentage}%</div>
        </div>
        
        <div class="level-section">
          <div class="level-badge">${levelInfo.level}</div>
          <div class="level-range">${levelInfo.range}</div>
          <div class="level-description">${levelInfo.description}</div>
        </div>
      </div>

      <!-- 核心数据卡片 -->
      <div class="result-stats">
        <div class="stat-card">
          <div class="stat-icon">✅</div>
          <div class="stat-value">${currentTest.score || 0}</div>
          <div class="stat-label">正确题数</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">❌</div>
          <div class="stat-value">${(currentTest.totalQuestions || 0) - (currentTest.score || 0)}</div>
          <div class="stat-label">错误题数</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">⏱️</div>
          <div class="stat-value">${timerManager.formatTime(duration || 0)}</div>
          <div class="stat-label">总用时</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">📊</div>
          <div class="stat-value">${(levelInfo.avgDifficulty || 0).toFixed(1)}</div>
          <div class="stat-label">平均难度</div>
        </div>
      </div>

      <!-- 认知自适应分析 -->
      ${cognitiveInfo ? `
        <div class="cognitive-analysis">
          <div class="analysis-header">
            <div class="analysis-icon">🧠</div>
            <div class="analysis-title">认知自适应分析</div>
          </div>
          <div class="analysis-content">
            ${cognitiveInfo}
          </div>
        </div>
      ` : ''}

      <!-- 同龄人对比 -->
      <div class="comparison-section">
        <div class="comparison-item">
          <div class="comparison-icon">👥</div>
          <div class="comparison-text">同龄人对比：${levelInfo.percentile}</div>
        </div>
        <div class="comparison-item">
          <div class="comparison-icon">📈</div>
          <div class="comparison-text">预估词汇：${levelInfo.estimatedVocab}词</div>
        </div>
      </div>

      <!-- 学习建议 -->
      <div class="advice-section">
        <div class="advice-header">
          <div class="advice-icon">💡</div>
          <div class="advice-title">学习建议</div>
        </div>
        <div class="advice-content">
          ${learningAdvice.slice(0, 3).map(advice => `
            <div class="advice-item">
              <div class="advice-item-icon">${advice.icon}</div>
              <div class="advice-item-text">${advice.content}</div>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- 操作按钮 -->
      <div class="result-actions">
        <button class="action-btn primary" onclick="restartTest()">
          <div class="btn-icon">🔄</div>
          <div class="btn-text">重新测试</div>
        </button>
        <button class="action-btn secondary" onclick="shareResult()">
          <div class="btn-icon">📤</div>
          <div class="btn-text">分享结果</div>
        </button>
        <button class="action-btn secondary" onclick="exportToPDF()">
          <div class="btn-icon">📄</div>
          <div class="btn-text">导出PDF</div>
        </button>
        <button class="action-btn secondary" onclick="goHome()">
          <div class="btn-icon">🏠</div>
          <div class="btn-text">返回首页</div>
        </button>
      </div>
    </div>
  `;
  
  // 清空结果页面并插入新内容
  const resultPage = document.getElementById('resultPage');
  if (!resultPage) {
    console.error('结果页面元素不存在！');
    // 尝试创建结果页面元素
    const container = document.querySelector('.container');
    if (container) {
      const newResultPage = document.createElement('div');
      newResultPage.id = 'resultPage';
      newResultPage.className = 'hidden';
      newResultPage.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 50%, #f1f5f9 100%); overflow-y: auto; z-index: 1000;';
      container.appendChild(newResultPage);
      return finishTest(); // 重新调用
    }
    return;
  }
  

  
  resultPage.innerHTML = resultHTML;
  
  // 跳转到结果展示页面
  if (typeof window !== 'undefined') {
    // 在test.html中，跳转到新的结果页面
    const testResult = {
      score: currentTest.score,
      totalQuestions: currentTest.totalQuestions,
      level: currentTest.level,
      answers: currentTest.answers,
      testTime: timerManager.formatTime(duration),
      endTime: new Date().toISOString(),
      isReviewMode: currentTest.isReviewMode || false,
      testMode: currentTest.testMode || 'normal'
    };
    
    try {
      sessionStorage.setItem('testResult', JSON.stringify(testResult));
      console.log('💾 测试结果已保存到sessionStorage:', testResult);
      console.log('🚀 跳转到结果页面...');
      window.location.href = 'result_display.html';
      return;
    } catch (error) {
      console.error('❌ 跳转失败:', error);
      // 如果跳转失败，尝试在当前页面显示结果
      alert('跳转失败，将在当前页面显示结果');
    }
  }
  
  // 确保结果页面显示（备用方案）
  showPage('resultPage');
  
  // 确保结果页面显示（备用方案）
  setTimeout(() => {
    const resultPage = document.getElementById('resultPage');
    if (resultPage && resultPage.classList.contains('hidden')) {
      resultPage.classList.remove('hidden');
      resultPage.style.display = 'block';
    }
    
    // 确保其他页面被隐藏
    const homePage = document.getElementById('homePage');
    const testPage = document.getElementById('testPage');
    if (homePage) homePage.classList.add('hidden');
    if (testPage) testPage.classList.add('hidden');
  }, 100);
  

  
  // 保存测试历史
  saveTestHistory();
}

// 生成K12学习阶段分布图表
function generateK12LevelChart(levelCounts) {
  const stageNames = {
    primary: '小学词汇',
    junior: '初中词汇', 
    senior: '高中词汇'
  };
  
  const stageColors = {
    primary: '#4CAF50',
    junior: '#2196F3',
    senior: '#FF9800'
  };
  
  const total = Object.values(levelCounts).reduce((sum, count) => sum + count, 0);
  
  if (total === 0) {
    return '<div class="no-data">暂无数据</div>';
  }
  
  const chartHTML = Object.entries(levelCounts)
    .filter(([stage, count]) => count > 0)
    .sort(([a], [b]) => {
      const order = { primary: 1, junior: 2, senior: 3 };
      return order[a] - order[b];
    })
    .map(([stage, count]) => {
      const percentage = Math.round((count / total) * 100);
      const width = Math.max(percentage, 5);
      
      return `
        <div class="chart-item">
          <div class="chart-label">${stageNames[stage]}</div>
          <div class="chart-bar">
            <div class="chart-fill" style="width: ${width}%; background-color: ${stageColors[stage]}"></div>
          </div>
          <div class="chart-value">${count}题 (${percentage}%)</div>
        </div>
      `;
    }).join('');
  
  return `<div class="difficulty-chart">${chartHTML}</div>`;
}

// 生成难度分布图表
function generateDifficultyChart() {
  const difficultyCount = {};
  currentTest.answers.forEach(answer => {
    const difficulty = answer.question.difficulty || 1;
    const level = answer.question.level || 'unknown';
    const key = `${level}_${difficulty}`;
    
    if (!difficultyCount[key]) {
      difficultyCount[key] = { correct: 0, total: 0, level, difficulty };
    }
    
    difficultyCount[key].total++;
    if (answer.isCorrect) {
      difficultyCount[key].correct++;
    }
  });
  
  const chartItems = Object.values(difficultyCount).map(item => {
    const accuracy = Math.round((item.correct / item.total) * 100);
    const levelMap = {
      'primary': '小学',
      'junior': '初中',
      'senior': '高中', 
      'cet': '四六级',
      'ielts_toefl': '雅思托福'
    };
    
    return `
      <div class="chart-item">
        <div class="chart-label">${levelMap[item.level] || item.level}</div>
        <div class="chart-bar">
          <div class="chart-fill" style="width: ${accuracy}%"></div>
        </div>
        <div class="chart-value">${accuracy}%</div>
      </div>
    `;
  }).join('');
  
  return `<div class="difficulty-chart">${chartItems}</div>`;
}

// 生成错题回顾
function generateMistakeReview() {
  const mistakes = currentTest.answers.filter(a => !a.isCorrect);
  
  if (mistakes.length === 0) {
    return `
      <div class="card perfect-card">
        <div class="subtitle">🎉 完美表现</div>
        <div class="text">恭喜！您答对了所有题目，表现非常出色！</div>
      </div>
    `;
  }
  
  return `
    <div class="card mistakes-card">
      <div class="subtitle">错题分析 (${mistakes.length}题)</div>
      ${mistakes.map(mistake => `
        <div class="mistake-item">
          <div class="mistake-header">
            <div class="mistake-word">${mistake.question.word}</div>
            <div class="mistake-level">${getLevelDisplay(mistake.question.level, mistake.question.difficulty)}</div>
          </div>
          <div class="mistake-details">
            <div class="mistake-line">
              <span class="mistake-label">正确答案:</span>
              <span class="mistake-correct">${mistake.question.meaning}</span>
            </div>
            <div class="mistake-line">
              <span class="mistake-label">您的答案:</span>
              <span class="mistake-wrong">${mistake.question.options[mistake.selectedAnswer]}</span>
            </div>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

// 生成进步对比
function generateProgressComparison() {
  const history = getTestHistory();
  if (history.length < 2) return '';
  
  const lastTest = history[history.length - 2];
  const improvement = currentTest.score - lastTest.score;
  
  return `
    <div class="card comparison-card">
      <div class="subtitle">进步对比</div>
      <div class="comparison-grid">
        <div class="comparison-item">
          <div class="comparison-label">本次得分</div>
          <div class="comparison-value current">${currentTest.score}/${currentTest.totalQuestions}</div>
        </div>
        <div class="comparison-item">
          <div class="comparison-label">上次得分</div>
          <div class="comparison-value previous">${lastTest.score}/${lastTest.total}</div>
        </div>
        <div class="comparison-item improvement">
          <div class="comparison-label">${improvement >= 0 ? '进步' : '变化'}</div>
          <div class="comparison-value ${improvement >= 0 ? 'positive' : 'negative'}">
            ${improvement >= 0 ? '+' : ''}${improvement}题
          </div>
        </div>
      </div>
    </div>
  `;
}

// 保存测试历史
function saveTestHistory() {
  const history = getTestHistory();
  const testRecord = {
    score: currentTest.score,
    total: currentTest.totalQuestions,
    percentage: Math.round((currentTest.score / currentTest.totalQuestions) * 100),
    level: calculateK12VocabularyLevel(currentTest.score, currentTest.totalQuestions, currentTest.answers).level,
    date: new Date().toLocaleDateString('zh-CN'),
    timestamp: Date.now(),
    duration: Math.floor((Date.now() - currentTest.startTime) / 1000),
    adaptiveMode: currentTest.adaptiveMode || false
  };
  
  history.push(testRecord);
  
  // 只保留最近10次记录
  if (history.length > 10) {
    history.splice(0, history.length - 10);
  }
  
  localStorage.setItem('test_history', JSON.stringify(history));
}

// 获取测试历史
function getTestHistory() {
  try {
    return JSON.parse(localStorage.getItem('test_history') || '[]');
  } catch (e) {
    return [];
  }
}

// formatTime 函数已移动到 TimerManager 类中，使用 timerManager.formatTime() 替代

// 重新测试
function restartTest() {
  startTest(currentTest.totalQuestions);
}

// 返回首页
function goHome() {
  console.log('返回首页');
  showPage('homePage');
  loadHomePage(); // 重新加载首页数据
}



// 分享结果
function shareResult() {
  const levelInfo = calculateK12VocabularyLevel(currentTest.score, currentTest.totalQuestions, currentTest.answers);
  const shareText = `我在英文词汇量测试中获得了${currentTest.score}/${currentTest.totalQuestions}分(${levelInfo.percentage}%)，达到${levelInfo.level}！你也来测试看看吧！`;
  
  if (navigator.share) {
    navigator.share({
      title: '英文词汇量测试结果',
      text: shareText,
      url: window.location.href
    });
  } else {
    // 复制到剪贴板
    navigator.clipboard.writeText(shareText).then(() => {
      alert('结果已复制到剪贴板！');
    }).catch(() => {
      // 降级方案
      const textArea = document.createElement('textarea');
      textArea.value = shareText;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      alert('结果已复制到剪贴板！');
    });
  }
}

// 导出精美PDF报告 - 包含词汇量金字塔
async function exportToPDF() {
  try {
    // 显示加载状态
    const button = event.target;
    const originalText = button.textContent;
    button.textContent = '生成中...';
    button.disabled = true;

    // 计算测试数据
    const testDate = new Date().toLocaleDateString('zh-CN');
    const testTime = new Date().toLocaleTimeString('zh-CN');
    const duration = Math.floor((Date.now() - currentTest.startTime) / 1000);
    const minutes = Math.floor(duration / 60);
    const seconds = duration % 60;
    const percentage = Math.round((currentTest.score / currentTest.totalQuestions) * 100);
    
    // 获取等级信息
    const levelInfo = calculateK12VocabularyLevel(currentTest.score, currentTest.totalQuestions, currentTest.answers);
    
    // 创建PDF内容
    const pdfContent = createPDFContent(testDate, testTime, duration, percentage, levelInfo);
    
    // 生成PDF
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    // 设置中文字体
    doc.addFont('https://cdn.jsdelivr.net/npm/noto-sans-sc@1.0.1/NotoSansSC-Regular.otf', 'NotoSansSC', 'normal');
    doc.setFont('NotoSansSC');
    
    // 添加内容
    addPDFContent(doc, pdfContent);
    
    // 下载PDF
    const fileName = `词汇测试报告_${testDate}_${levelInfo.level}.pdf`;
    doc.save(fileName);
    
    // 恢复按钮状态
    button.textContent = originalText;
    button.disabled = false;
    
    alert('PDF报告已生成并下载！');
    
  } catch (error) {
    console.error('PDF生成失败:', error);
    alert('PDF生成失败，请重试');
    
    // 恢复按钮状态
    const button = event.target;
    button.textContent = '📄 导出PDF';
    button.disabled = false;
  }
}

// 创建PDF内容
function createPDFContent(testDate, testTime, duration, percentage, levelInfo) {
  return {
    title: '英文词汇量测试报告',
    subtitle: '个性化学习评估',
    testInfo: {
      date: testDate,
      time: testTime,
      duration: formatTime(duration),
      score: `${currentTest.score}/${currentTest.totalQuestions}`,
      percentage: `${percentage}%`
    },
    levelInfo: levelInfo,
    vocabularyPyramid: generateVocabularyPyramid(levelInfo),
    learningAdvice: getK12LearningAdvice(levelInfo, currentTest.answers).slice(0, 3)
  };
}

// 生成词汇量金字塔数据
function generateVocabularyPyramid(levelInfo) {
  const pyramidLevels = [
    { name: '专业词汇', range: '8000-12000', color: '#FF6B6B', description: '学术、专业领域词汇' },
    { name: '高级词汇', range: '5000-8000', color: '#4ECDC4', description: '大学、工作常用词汇' },
    { name: '中级词汇', range: '3000-5000', color: '#45B7D1', description: '高中、日常交流词汇' },
    { name: '基础词汇', range: '1500-3000', color: '#96CEB4', description: '初中、基础交流词汇' },
    { name: '入门词汇', range: '500-1500', color: '#FFEAA7', description: '小学、简单词汇' }
  ];
  
  // 根据用户水平确定位置
  const userLevel = levelInfo.level;
  const userVocab = levelInfo.estimatedVocab;
  
  return {
    levels: pyramidLevels,
    userLevel: userLevel,
    userVocab: userVocab,
    userPosition: calculateUserPosition(userVocab, pyramidLevels)
  };
}

// 计算用户在金字塔中的位置
function calculateUserPosition(userVocab, pyramidLevels) {
  for (let i = 0; i < pyramidLevels.length; i++) {
    const level = pyramidLevels[i];
    const [min, max] = level.range.split('-').map(Number);
    if (userVocab >= min && userVocab <= max) {
      return {
        levelIndex: i,
        levelName: level.name,
        progress: (userVocab - min) / (max - min)
      };
    }
  }
  return { levelIndex: 2, levelName: '中级词汇', progress: 0.5 };
}

// 添加PDF内容
function addPDFContent(doc, content) {
  let yPosition = 20;
  
  // 标题
  doc.setFontSize(24);
  doc.setTextColor(74, 144, 226);
  doc.text(content.title, 105, yPosition, { align: 'center' });
  yPosition += 15;
  
  // 副标题
  doc.setFontSize(14);
  doc.setTextColor(100, 100, 100);
  doc.text(content.subtitle, 105, yPosition, { align: 'center' });
  yPosition += 25;
  
  // 测试信息
  doc.setFontSize(16);
  doc.setTextColor(50, 50, 50);
  doc.text('测试信息', 20, yPosition);
  yPosition += 10;
  
  doc.setFontSize(12);
  doc.text(`测试日期: ${content.testInfo.date}`, 20, yPosition);
  yPosition += 7;
  doc.text(`测试时间: ${content.testInfo.time}`, 20, yPosition);
  yPosition += 7;
  doc.text(`测试用时: ${content.testInfo.duration}`, 20, yPosition);
  yPosition += 7;
  doc.text(`测试成绩: ${content.testInfo.score} (${content.testInfo.percentage})`, 20, yPosition);
  yPosition += 15;
  
  // 等级信息
  doc.setFontSize(16);
  doc.setTextColor(50, 50, 50);
  doc.text('等级评估', 20, yPosition);
  yPosition += 10;
  
  doc.setFontSize(12);
  doc.text(`词汇水平: ${content.levelInfo.level}`, 20, yPosition);
  yPosition += 7;
  doc.text(`词汇范围: ${content.levelInfo.range}`, 20, yPosition);
  yPosition += 7;
  doc.text(`预估词汇: ${content.levelInfo.estimatedVocab}词`, 20, yPosition);
  yPosition += 7;
  doc.text(`同龄人对比: ${content.levelInfo.percentile}`, 20, yPosition);
  yPosition += 15;
  
  // 词汇量金字塔
  addVocabularyPyramid(doc, content.vocabularyPyramid, yPosition);
  yPosition += 80;
  
  // 学习建议
  doc.setFontSize(16);
  doc.setTextColor(50, 50, 50);
  doc.text('学习建议', 20, yPosition);
  yPosition += 10;
  
  doc.setFontSize(12);
  content.learningAdvice.forEach((advice, index) => {
    doc.text(`${index + 1}. ${advice.content}`, 20, yPosition);
    yPosition += 8;
  });
  
  // 页脚
  doc.setFontSize(10);
  doc.setTextColor(150, 150, 150);
  doc.text('本报告由英文词汇量测试系统生成', 105, 280, { align: 'center' });
}

// 添加词汇量金字塔到PDF
function addVocabularyPyramid(doc, pyramid, startY) {
  const centerX = 105;
  const baseWidth = 80;
  const levelHeight = 12;
  const userMarkerSize = 6;
  
  // 绘制金字塔
  pyramid.levels.forEach((level, index) => {
    const y = startY + index * levelHeight;
    const width = baseWidth * (1 - index * 0.15);
    const x = centerX - width / 2;
    
    // 绘制层级背景
    doc.setFillColor(level.color);
    doc.rect(x, y, width, levelHeight, 'F');
    
    // 绘制层级边框
    doc.setDrawColor(100, 100, 100);
    doc.rect(x, y, width, levelHeight, 'S');
    
    // 添加文字
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    doc.text(level.name, centerX, y + 8, { align: 'center' });
    
    // 添加词汇范围
    doc.setFontSize(6);
    doc.text(level.range, centerX, y + 11, { align: 'center' });
  });
  
  // 绘制用户位置标记
  const userY = startY + pyramid.userPosition.levelIndex * levelHeight + levelHeight / 2;
  const userX = centerX;
  
  // 绘制用户标记
  doc.setFillColor(255, 0, 0);
  doc.circle(userX, userY, userMarkerSize, 'F');
  
  // 添加用户标记说明
  doc.setFontSize(8);
  doc.setTextColor(255, 0, 0);
  doc.text(`您的水平: ${pyramid.userPosition.levelName}`, centerX + 50, userY);
  doc.text(`预估词汇: ${pyramid.userVocab}词`, centerX + 50, userY + 5);
}

// 清除历史记录
function clearHistory() {
  if (confirm('确定要清除所有历史记录吗？')) {
    localStorage.removeItem('test_history');
    loadHomePage();
  }
}

// 加载首页
function loadHomePage() {
  const history = getTestHistory();
  const historyCard = document.getElementById('historyCard');
  const historyList = document.getElementById('historyList');
  
  if (history.length > 0) {
    historyCard.style.display = 'block';
    historyList.innerHTML = history.slice(-5).reverse().map(record => `
      <div class="history-item">
        <div class="history-score">${record.score}/${record.total}</div>
        <div class="history-info">
          <div class="history-level">${record.level}</div>
          <div class="history-date">${record.date}</div>
        </div>
        <div class="history-badge ${record.adaptiveMode ? 'adaptive' : 'standard'}">
          ${record.adaptiveMode ? '智能' : '标准'}
        </div>
      </div>
    `).join('');
  } else {
    historyCard.style.display = 'none';
  }
}

// 重复函数已删除 - 使用文件顶部的版本

// performSpeech函数已删除 - 使用简化版播放

// 重复函数已删除 - 使用文件顶部的版本


// 级别选择交互
document.addEventListener('DOMContentLoaded', function() {
  showPage('homePage');
  loadHomePage();
  
  // 添加级别卡片点击交互
  document.addEventListener('click', function(e) {
    if (e.target.closest('.level-card')) {
      // 清除之前的选择
      document.querySelectorAll('.level-card').forEach(card => {
        card.classList.remove('selected');
      });
      
      // 选中当前卡片
      const clickedCard = e.target.closest('.level-card');
      clickedCard.classList.add('selected');
    }
  });
  
  // 启动计时器
  if (currentTest.startTime) {
    timerManager.start();
  }
});

function toggleTimer() {
  const pauseBtn = document.getElementById('pauseResumeBtn');
  const iconPause = pauseBtn.querySelector('.icon-pause');
  const iconPlay = pauseBtn.querySelector('.icon-play');
  
  if (currentTest.isPaused) {
    timerManager.resume();
    iconPause.style.display = 'block';
    iconPlay.style.display = 'none';
  } else {
    timerManager.pause();
    iconPause.style.display = 'none';
    iconPlay.style.display = 'block';
  }
}

// 页面可见性检测，自动暂停/恢复
let wasAutoPaused = false;

document.addEventListener('visibilitychange', function() {
  // 只在测试进行中才生效
  if (!currentTest.startTime || currentTest.showResult) return;
  
  if (document.hidden) {
    // 页面隐藏，自动暂停
    if (!currentTest.isPaused) {
      timerManager.pause();
      wasAutoPaused = true;
      console.log('页面切换，自动暂停计时');
    }
  } else {
    // 页面显示，恢复计时
    if (wasAutoPaused && currentTest.isPaused) {
      timerManager.resume();
      wasAutoPaused = false;
      // 更新按钮状态
      const pauseResumeBtn = document.getElementById('pauseResumeBtn');
      if (pauseResumeBtn) {
        pauseResumeBtn.textContent = '⏸️';
        pauseResumeBtn.title = '暂停';
        pauseResumeBtn.classList.remove('paused');
      }
      console.log('页面返回，自动恢复计时');
    }
  }
});}
// 已删除：重复的startTestByLevel和getQuestionsByLevel函数，使用app_enhancements.js中的版本

// 保留打乱数组的函数 (用于兼容)
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}
