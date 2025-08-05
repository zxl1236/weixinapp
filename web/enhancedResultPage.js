// 🎨 增强的结果页面 - 包含图表、详细分析和PDF导出

// 生成详细的测试结果页面
function generateEnhancedResultPage(testData) {
  const { score, totalQuestions, answers, duration, levelInfo } = testData;
  
  // 生成各种图表数据
  const chartData = generateChartData(answers, levelInfo);
  
  const resultHTML = `
    <div class="enhanced-result-container">
      <!-- 顶部成绩卡片 -->
      <div class="result-header-card">
        <div class="score-display-large">
          <div class="score-circle">
            <svg width="120" height="120" viewBox="0 0 120 120">
              <circle cx="60" cy="60" r="54" fill="none" stroke="#e2e8f0" stroke-width="8"/>
              <circle cx="60" cy="60" r="54" fill="none" stroke="url(#scoreGradient)" 
                      stroke-width="8" stroke-linecap="round"
                      stroke-dasharray="${(levelInfo.percentage / 100) * 339.292} 339.292"
                      transform="rotate(-90 60 60)"/>
              <defs>
                <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" style="stop-color:#667eea"/>
                  <stop offset="100%" style="stop-color:#764ba2"/>
                </linearGradient>
              </defs>
            </svg>
            <div class="score-text">
              <div class="score-number">${score}</div>
              <div class="score-divider">/</div>
              <div class="score-total">${totalQuestions}</div>
            </div>
          </div>
          <div class="score-percentage">${levelInfo.percentage}%</div>
        </div>
        
        <div class="level-info-large">
          <div class="level-badge-large">${levelInfo.level}</div>
          <div class="level-range">${levelInfo.range}</div>
          <div class="level-description">${levelInfo.description}</div>
        </div>
      </div>

      <!-- 核心统计数据 -->
      <div class="stats-grid-enhanced">
        <div class="stat-card-enhanced correct">
          <div class="stat-icon">✅</div>
          <div class="stat-value">${score}</div>
          <div class="stat-label">正确题数</div>
        </div>
        <div class="stat-card-enhanced incorrect">
          <div class="stat-icon">❌</div>
          <div class="stat-value">${totalQuestions - score}</div>
          <div class="stat-label">错误题数</div>
        </div>
        <div class="stat-card-enhanced time">
          <div class="stat-icon">⏱️</div>
          <div class="stat-value">${formatDuration(duration)}</div>
          <div class="stat-label">总用时</div>
        </div>
        <div class="stat-card-enhanced difficulty">
          <div class="stat-icon">📊</div>
          <div class="stat-value">${levelInfo.avgDifficulty}</div>
          <div class="stat-label">平均难度</div>
        </div>
        <div class="stat-card-enhanced vocab">
          <div class="stat-icon">📚</div>
          <div class="stat-value">${levelInfo.estimatedVocab}</div>
          <div class="stat-label">预估词汇量</div>
        </div>
        <div class="stat-card-enhanced rank">
          <div class="stat-icon">🏆</div>
          <div class="stat-value">${levelInfo.percentile}</div>
          <div class="stat-label">同龄人对比</div>
        </div>
      </div>

      <!-- 图表分析区域 -->
      <div class="charts-section">
        <div class="chart-container">
          <h3>📈 答题表现分析</h3>
          <div class="chart-wrapper">
            <canvas id="performanceChart" width="400" height="200"></canvas>
          </div>
        </div>
        
        <div class="chart-container">
          <h3>🎯 难度分布分析</h3>
          <div class="chart-wrapper">
            <canvas id="difficultyChart" width="400" height="200"></canvas>
          </div>
        </div>
        
        <div class="chart-container">
          <h3>📚 词汇级别掌握度</h3>
          <div class="chart-wrapper">
            <canvas id="levelChart" width="400" height="200"></canvas>
          </div>
        </div>
      </div>

      <!-- 详细题目回顾 -->
      <div class="questions-review">
        <h3>📝 题目详细回顾</h3>
        <div class="questions-list">
          ${generateQuestionsReview(answers)}
        </div>
      </div>

      <!-- 学习建议 -->
      <div class="learning-advice-enhanced">
        <h3>💡 个性化学习建议</h3>
        <div class="advice-grid">
          ${generateLearningAdvice(levelInfo)}
        </div>
      </div>

      <!-- 词汇量对比雷达图 -->
      <div class="vocabulary-radar">
        <h3>🕸️ 词汇能力雷达图</h3>
        <div class="radar-wrapper">
          <canvas id="vocabularyRadar" width="300" height="300"></canvas>
        </div>
      </div>

      <!-- 操作按钮 -->
      <div class="action-buttons-enhanced">
        <button class="action-btn primary" onclick="restartTest()">
          <span class="btn-icon">🔄</span>
          <span class="btn-text">重新测试</span>
        </button>
        <button class="action-btn secondary" onclick="exportEnhancedPDF()">
          <span class="btn-icon">📄</span>
          <span class="btn-text">导出详细报告</span>
        </button>
        <button class="action-btn secondary" onclick="shareResult()">
          <span class="btn-icon">📤</span>
          <span class="btn-text">分享结果</span>
        </button>
        <button class="action-btn secondary" onclick="viewHistory()">
          <span class="btn-icon">📊</span>
          <span class="btn-text">历史记录</span>
        </button>
        <button class="action-btn tertiary" onclick="goHome()">
          <span class="btn-icon">🏠</span>
          <span class="btn-text">返回首页</span>
        </button>
      </div>
    </div>
  `;
  
  return { html: resultHTML, chartData };
}

// 生成图表数据
function generateChartData(answers, levelInfo) {
  const performanceData = [];
  const difficultyData = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0, 10: 0 };
  const levelData = { primary: 0, junior: 0, senior: 0, advanced: 0 };
  
  // 计算答题表现趋势
  let cumulativeCorrect = 0;
  answers.forEach((answer, index) => {
    if (answer.isCorrect) cumulativeCorrect++;
    performanceData.push({
      x: index + 1,
      y: (cumulativeCorrect / (index + 1)) * 100
    });
  });
  
  // 统计难度分布
  answers.forEach(answer => {
    const difficulty = answer.question.difficulty || 1;
    difficultyData[Math.min(10, Math.max(1, Math.round(difficulty)))]++;
  });
  
  // 统计级别分布
  answers.forEach(answer => {
    const level = answer.question.level || 'primary';
    if (level === 'primary' || level === 'junior' || level === 'senior') {
      levelData[level]++;
    } else {
      levelData.advanced++;
    }
  });
  
  return {
    performance: performanceData,
    difficulty: difficultyData,
    level: levelData,
    radar: generateRadarData(levelInfo)
  };
}

// 生成雷达图数据
function generateRadarData(levelInfo) {
  const stage = levelInfo.stage;
  const baseScores = {
    'beginner': { basic: 20, intermediate: 5, advanced: 0, academic: 0, creative: 10 },
    'primary_basic': { basic: 40, intermediate: 15, advanced: 5, academic: 5, creative: 20 },
    'primary_good': { basic: 60, intermediate: 25, advanced: 10, academic: 10, creative: 30 },
    'primary_excellent': { basic: 80, intermediate: 40, advanced: 20, academic: 15, creative: 45 },
    'junior_basic': { basic: 75, intermediate: 50, advanced: 25, academic: 20, creative: 40 },
    'junior_good': { basic: 85, intermediate: 65, advanced: 40, academic: 35, creative: 55 },
    'junior_excellent': { basic: 95, intermediate: 80, advanced: 60, academic: 50, creative: 70 },
    'senior_basic': { basic: 90, intermediate: 75, advanced: 65, academic: 60, creative: 65 },
    'senior_good': { basic: 95, intermediate: 85, advanced: 80, academic: 75, creative: 80 },
    'senior_excellent': { basic: 98, intermediate: 95, advanced: 90, academic: 85, creative: 90 },
    'senior_outstanding': { basic: 100, intermediate: 98, advanced: 95, academic: 95, creative: 95 }
  };
  
  return baseScores[stage] || baseScores['primary_basic'];
}

// 生成题目回顾
function generateQuestionsReview(answers) {
  return answers.map((answer, index) => {
    const isCorrect = answer.isCorrect;
    const question = answer.question;
    const userAnswer = answer.selectedAnswer;
    const correctAnswer = question.meaning;
    
    return `
      <div class="question-review-item ${isCorrect ? 'correct' : 'incorrect'}">
        <div class="question-number">${index + 1}</div>
        <div class="question-content">
          <div class="question-word">
            <span class="word">${question.word}</span>
            <span class="phonetic">${question.phonetic || ''}</span>
            <span class="difficulty-badge">难度${question.difficulty}</span>
          </div>
          <div class="question-result">
            <div class="user-answer">
              <span class="label">您的答案：</span>
              <span class="answer ${isCorrect ? 'correct' : 'incorrect'}">${userAnswer}</span>
            </div>
            ${!isCorrect ? `
              <div class="correct-answer">
                <span class="label">正确答案：</span>
                <span class="answer correct">${correctAnswer}</span>
              </div>
            ` : ''}
          </div>
        </div>
        <div class="question-status">
          ${isCorrect ? '✅' : '❌'}
        </div>
      </div>
    `;
  }).join('');
}

// 生成学习建议
function generateLearningAdvice(levelInfo) {
  const tips = levelInfo.improvementTips || [];
  
  return tips.map(tip => `
    <div class="advice-card">
      <div class="advice-icon">${tip.icon}</div>
      <div class="advice-content">
        <div class="advice-title">${tip.title}</div>
        <div class="advice-text">${tip.content}</div>
      </div>
    </div>
  `).join('');
}

// 时间格式化
function formatDuration(milliseconds) {
  const minutes = Math.floor(milliseconds / 60000);
  const seconds = Math.floor((milliseconds % 60000) / 1000);
  return `${minutes}分${seconds}秒`;
}

// 导出增强的PDF报告
function exportEnhancedPDF() {
  // PDF导出逻辑将在后面实现
  console.log('导出增强PDF报告...');
  generateDetailedPDFReport();
}

// 生成详细的PDF报告
function generateDetailedPDFReport() {
  if (typeof jsPDF === 'undefined') {
    alert('PDF库未加载，请刷新页面重试');
    return;
  }
  
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  
  // 设置中文字体（如果支持）
  try {
    doc.addFileToVFS('NotoSansCJK-Regular.ttf', 'base64字体数据');
    doc.addFont('NotoSansCJK-Regular.ttf', 'NotoSansCJK', 'normal');
    doc.setFont('NotoSansCJK');
  } catch (e) {
    console.log('中文字体加载失败，使用默认字体');
  }
  
  // PDF内容生成
  doc.setFontSize(20);
  doc.text('词汇量测试详细报告', 20, 30);
  
  doc.setFontSize(12);
  const testDate = new Date().toLocaleDateString('zh-CN');
  doc.text(`测试日期: ${testDate}`, 20, 50);
  
  if (currentTest && currentTest.answers) {
    const levelInfo = calculateImprovedK12VocabularyLevel(
      currentTest.score, 
      currentTest.totalQuestions, 
      currentTest.answers
    );
    
    // 基本信息
    doc.text(`测试成绩: ${currentTest.score}/${currentTest.totalQuestions} (${levelInfo.percentage}%)`, 20, 70);
    doc.text(`词汇水平: ${levelInfo.level}`, 20, 85);
    doc.text(`预估词汇量: ${levelInfo.estimatedVocab}词`, 20, 100);
    doc.text(`同龄人对比: ${levelInfo.percentile}`, 20, 115);
    
    // 详细题目
    doc.text('题目详情:', 20, 140);
    let yPos = 155;
    
    currentTest.answers.forEach((answer, index) => {
      if (yPos > 250) {
        doc.addPage();
        yPos = 30;
      }
      
      const status = answer.isCorrect ? '✓' : '✗';
      const questionText = `${index + 1}. ${answer.question.word} - ${status}`;
      doc.text(questionText, 20, yPos);
      yPos += 15;
    });
  }
  
  // 保存PDF
  doc.save(`词汇量测试报告_${new Date().toISOString().split('T')[0]}.pdf`);
}

// 导出到全局
if (typeof window !== 'undefined') {
  window.generateEnhancedResultPage = generateEnhancedResultPage;
  window.exportEnhancedPDF = exportEnhancedPDF;
  window.generateDetailedPDFReport = generateDetailedPDFReport;
}