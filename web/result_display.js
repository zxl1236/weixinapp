// K12词汇测试结果展示逻辑

// 等级评定标准
const GRADE_STANDARDS = {
    primary: {
        excellent: { min: 90, label: "优秀", description: "词汇掌握非常出色，可以尝试更高年级的词汇" },
        good: { min: 75, label: "良好", description: "词汇掌握较好，继续保持并适当挑战" },
        average: { min: 60, label: "一般", description: "基础词汇掌握尚可，需要加强练习" },
        poor: { min: 0, label: "待提高", description: "需要重点学习基础词汇，建议从简单词汇开始" }
    },
    junior: {
        excellent: { min: 85, label: "优秀", description: "初中词汇掌握优秀，可以开始学习高中词汇" },
        good: { min: 70, label: "良好", description: "词汇水平良好，继续扩展词汇量" },
        average: { min: 55, label: "一般", description: "基础还可以，需要系统性地学习词汇" },
        poor: { min: 0, label: "待提高", description: "建议从小学高年级词汇开始复习" }
    },
    senior: {
        excellent: { min: 80, label: "优秀", description: "高中词汇掌握优秀，可以挑战大学词汇" },
        good: { min: 65, label: "良好", description: "词汇基础扎实，继续深化学习" },
        average: { min: 50, label: "一般", description: "需要系统复习高中词汇" },
        poor: { min: 0, label: "待提高", description: "建议从初中词汇开始系统复习" }
    }
};

// 学习建议模板
const LEARNING_ADVICE = {
    primary: {
        excellent: [
            "您的小学词汇掌握得非常好！可以开始学习初中词汇了",
            "建议每天阅读英语绘本，巩固已学词汇",
            "可以尝试简单的英语对话练习",
            "继续保持对英语学习的兴趣和热情"
        ],
        good: [
            "您的词汇基础很不错，继续加油！",
            "建议每天学习5-10个新单词",
            "多进行单词游戏和趣味练习",
            "可以开始接触一些简单的英语故事"
        ],
        average: [
            "基础还可以，需要加强练习",
            "建议每天复习已学单词15-20分钟",
            "重点练习日常生活中的常用词汇",
            "可以使用单词卡片进行记忆练习"
        ],
        poor: [
            "需要从基础开始系统学习",
            "建议每天学习3-5个简单单词",
            "多使用图片和实物帮助记忆",
            "家长可以陪同进行英语学习游戏"
        ]
    },
    junior: {
        excellent: [
            "初中词汇掌握优秀！可以开始挑战高中词汇",
            "建议阅读英语文章，在语境中学习词汇",
            "可以尝试写简单的英语作文",
            "参加英语角或口语练习活动"
        ],
        good: [
            "词汇水平良好，继续保持！",
            "建议每天学习10-15个新单词",
            "多做阅读理解练习",
            "注意词汇的不同用法和搭配"
        ],
        average: [
            "需要加强词汇积累",
            "建议制定系统的学习计划",
            "重点掌握教材中的核心词汇",
            "每天进行词汇复习和测试"
        ],
        poor: [
            "建议从小学高年级词汇开始复习",
            "制定详细的学习计划",
            "每天至少学习30分钟词汇",
            "寻求老师或同学的帮助"
        ]
    },
    senior: {
        excellent: [
            "高中词汇掌握优秀！可以开始准备大学英语",
            "建议阅读英语原版书籍",
            "准备英语等级考试(如四六级)",
            "可以开始学习专业领域词汇"
        ],
        good: [
            "词汇基础扎实，继续深化！",
            "建议每天学习15-20个新单词",
            "多做历年高考题练习",
            "注意词汇的深层含义和用法"
        ],
        average: [
            "需要系统复习高中词汇",
            "制定科学的复习计划",
            "重点掌握高考常考词汇",
            "加强词汇在语境中的应用"
        ],
        poor: [
            "建议从初中词汇开始系统复习",
            "寻求专业的辅导帮助",
            "每天至少学习45分钟词汇",
            "使用多种记忆方法提高效率"
        ]
    }
};

// 页面加载时获取测试结果
document.addEventListener('DOMContentLoaded', function() {
    console.log('📊 结果页面加载完成');
    
    // 从sessionStorage获取测试结果
    const testResult = getTestResult();
    
    if (testResult) {
        displayResults(testResult);
        setTimeout(() => {
            addFadeInAnimation();
        }, 100);
    } else {
        showErrorMessage();
    }
});

// 获取测试结果
function getTestResult() {
    try {
        const result = sessionStorage.getItem('testResult');
        if (result) {
            return JSON.parse(result);
        }
        
        // 备用：从URL参数获取
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.has('score')) {
            return {
                score: parseInt(urlParams.get('score')),
                totalQuestions: parseInt(urlParams.get('total')) || 20,
                level: urlParams.get('level') || 'primary',
                answers: []
            };
        }
        
        return null;
    } catch (error) {
        console.error('❌ 获取测试结果失败:', error);
        return null;
    }
}

// 显示测试结果
function displayResults(result) {
    console.log('📊 显示测试结果:', result);
    
    const score = result.score || 0;
    const totalQuestions = result.totalQuestions || 20;
    const percentage = Math.round((score / totalQuestions) * 100);
    const level = result.level || 'primary';
    const answers = result.answers || [];
    
    // 更新分数显示
    updateScoreDisplay(percentage, level);
    
    // 更新统计数据
    updateStatistics(result);
    
    // 更新学习建议
    updateAdvice(percentage, level);
    
    // 更新单词复习
    updateWordsReview(answers);
    
    // 保存结果到localStorage（用于历史记录）
    saveResultToHistory(result, percentage);
}

// 更新分数显示
function updateScoreDisplay(percentage, level) {
    const scoreCircle = document.getElementById('scoreCircle');
    const scoreText = document.getElementById('scoreText');
    const gradeInfo = document.getElementById('gradeInfo');
    const levelBadge = document.getElementById('levelBadge');
    
    // 确定等级
    const gradeLevel = determineGradeLevel(percentage, level);
    
    // 更新分数
    scoreText.textContent = `${percentage}%`;
    
    // 更新圆圈样式
    scoreCircle.className = `score-circle ${gradeLevel.level}`;
    
    // 更新年级信息
    const levelNames = {
        primary: '小学',
        junior: '初中', 
        senior: '高中'
    };
    gradeInfo.textContent = `${levelNames[level]}词汇测试 · 正确率 ${percentage}%`;
    
    // 更新等级标签
    levelBadge.textContent = gradeLevel.label;
    levelBadge.className = `level-badge ${gradeLevel.level}`;
}

// 确定等级
function determineGradeLevel(percentage, level) {
    const standards = GRADE_STANDARDS[level];
    
    if (percentage >= standards.excellent.min) {
        return { level: 'excellent', label: standards.excellent.label, description: standards.excellent.description };
    } else if (percentage >= standards.good.min) {
        return { level: 'good', label: standards.good.label, description: standards.good.description };
    } else if (percentage >= standards.average.min) {
        return { level: 'average', label: standards.average.label, description: standards.average.description };
    } else {
        return { level: 'poor', label: standards.poor.label, description: standards.poor.description };
    }
}

// 更新统计数据
function updateStatistics(result) {
    const statsGrid = document.getElementById('statsGrid');
    const score = result.score || 0;
    const totalQuestions = result.totalQuestions || 20;
    const answers = result.answers || [];
    
    // 计算统计数据
    const correctCount = score;
    const wrongCount = totalQuestions - score;
    const accuracy = Math.round((score / totalQuestions) * 100);
    const testTime = result.testTime || '--';
    
    // 计算平均响应时间
    const avgResponseTime = answers.length > 0 
        ? Math.round(answers.reduce((sum, ans) => sum + (ans.responseTime || 0), 0) / answers.length / 1000)
        : 0;
    
    const stats = [
        { icon: '✅', value: correctCount, label: '答对题数' },
        { icon: '❌', value: wrongCount, label: '答错题数' },
        { icon: '📊', value: `${accuracy}%`, label: '正确率' },
        { icon: '⏱️', value: testTime, label: '用时' },
        { icon: '⚡', value: `${avgResponseTime}s`, label: '平均用时' },
        { icon: '📝', value: totalQuestions, label: '总题数' }
    ];
    
    statsGrid.innerHTML = stats.map(stat => `
        <div class="stat-card">
            <div class="stat-icon">${stat.icon}</div>
            <div class="stat-value">${stat.value}</div>
            <div class="stat-label">${stat.label}</div>
        </div>
    `).join('');
}

// 更新学习建议
function updateAdvice(percentage, level) {
    const adviceContent = document.getElementById('adviceContent');
    const gradeLevel = determineGradeLevel(percentage, level);
    const advice = LEARNING_ADVICE[level][gradeLevel.level];
    
    let html = `<p style="margin-bottom: 15px;"><strong>${gradeLevel.description}</strong></p>`;
    html += '<ul class="advice-list">';
    advice.forEach(item => {
        html += `<li>${item}</li>`;
    });
    html += '</ul>';
    
    adviceContent.innerHTML = html;
}

// 更新单词复习
function updateWordsReview(answers) {
    const allWordsContainer = document.getElementById('allWords');
    const correctWordsContainer = document.getElementById('correctWords');
    const wrongWordsContainer = document.getElementById('wrongWords');
    
    if (!answers || answers.length === 0) {
        const noDataMessage = '<p style="text-align: center; color: #666; padding: 40px;">暂无测试数据</p>';
        allWordsContainer.innerHTML = noDataMessage;
        correctWordsContainer.innerHTML = noDataMessage;
        wrongWordsContainer.innerHTML = noDataMessage;
        return;
    }
    
    // 分类单词
    const correctWords = answers.filter(ans => ans.isCorrect);
    const wrongWords = answers.filter(ans => !ans.isCorrect);
    
    // 渲染所有单词
    allWordsContainer.innerHTML = answers.map(answer => renderWordCard(answer)).join('');
    
    // 渲染正确的单词
    correctWordsContainer.innerHTML = correctWords.length > 0 
        ? correctWords.map(answer => renderWordCard(answer)).join('')
        : '<p style="text-align: center; color: #666; padding: 40px;">没有答对的单词</p>';
    
    // 渲染错误的单词
    wrongWordsContainer.innerHTML = wrongWords.length > 0
        ? wrongWords.map(answer => renderWordCard(answer)).join('')
        : '<p style="text-align: center; color: #666; padding: 40px;">没有答错的单词，太棒了！</p>';
    
    // 更新标签页标题
    updateTabTitles(answers.length, correctWords.length, wrongWords.length);
}

// 渲染单词卡片
function renderWordCard(answer) {
    const question = answer.question;
    const isCorrect = answer.isCorrect;
    const cardClass = isCorrect ? 'correct' : 'wrong';
    const statusIcon = isCorrect ? '✅' : '❌';
    
    return `
        <div class="word-card ${cardClass}">
            <div class="word-header">
                <span class="word-text">${question.word}</span>
                <span class="word-status">${statusIcon}</span>
            </div>
            ${question.phonetic ? `<div class="word-phonetic">${question.phonetic}</div>` : ''}
            <div class="word-meaning">
                <strong>释义：</strong>${question.meaning || question.correctAnswerFull || '未知'}
            </div>
            ${question.partOfSpeech ? `<div class="word-meaning"><strong>词性：</strong>${question.partOfSpeech}</div>` : ''}
            <div class="word-actions">
                <button class="word-btn play-btn" onclick="playPronunciation('${question.word}')">
                    🔊 发音
                </button>
                ${!isCorrect ? `<button class="word-btn mistake-btn" onclick="addToMistakeBook('${question.word}')">
                    📝 加入错题本
                </button>` : ''}
            </div>
        </div>
    `;
}

// 更新标签页标题
function updateTabTitles(total, correct, wrong) {
    const tabButtons = document.querySelectorAll('.tab-button');
    if (tabButtons.length >= 3) {
        tabButtons[0].textContent = `全部单词 (${total})`;
        tabButtons[1].textContent = `答对的词 (${correct})`;
        tabButtons[2].textContent = `答错的词 (${wrong})`;
    }
}

// 标签页切换
function showTab(tabName) {
    // 更新按钮状态
    document.querySelectorAll('.tab-button').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    
    // 更新内容显示
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById(`tab-${tabName}`).classList.add('active');
}

// 添加到错题本
function addToMistakeBook(word) {
    // 从当前测试结果中找到该单词的详细信息
    const testResult = getTestResult();
    if (testResult && testResult.answers) {
        const answer = testResult.answers.find(ans => ans.question.word === word);
        if (answer) {
            if (typeof addWordToMistakeBook === 'function') {
                addWordToMistakeBook(answer.question);
                alert(`✅ "${word}" 已添加到错题本`);
            } else {
                console.error('❌ addWordToMistakeBook 函数未定义');
            }
        }
    }
}

// 操作按钮函数
function retakeTest() {
    const testResult = getTestResult();
    const level = testResult ? testResult.level : 'primary';
    window.location.href = `test.html?level=${level}`;
}

function viewMistakeBook() {
    window.location.href = 'index.html#mistakeBook';
}

function backToHome() {
    window.location.href = 'index.html';
}

// 保存结果到历史记录
function saveResultToHistory(result, percentage) {
    try {
        const history = JSON.parse(localStorage.getItem('testHistory') || '[]');
        const historyItem = {
            date: new Date().toISOString(),
            level: result.level,
            score: result.score,
            totalQuestions: result.totalQuestions,
            percentage: percentage,
            testTime: result.testTime
        };
        
        history.unshift(historyItem); // 添加到开头
        
        // 只保留最近10次记录
        if (history.length > 10) {
            history.length = 10;
        }
        
        localStorage.setItem('testHistory', JSON.stringify(history));
        console.log('💾 测试结果已保存到历史记录');
    } catch (error) {
        console.error('❌ 保存历史记录失败:', error);
    }
}

// 显示错误信息
function showErrorMessage() {
    document.getElementById('resultMain').innerHTML = `
        <div style="text-align: center; padding: 40px;">
            <h2 style="color: #f44336; margin-bottom: 20px;">⚠️ 未找到测试结果</h2>
            <p style="color: #666; margin-bottom: 30px;">请先完成测试后再查看结果</p>
            <button class="action-btn" onclick="backToHome()">返回首页</button>
        </div>
    `;
    
    // 隐藏其他部分
    document.getElementById('statsGrid').style.display = 'none';
    document.getElementById('adviceSection').style.display = 'none';
    document.getElementById('wordsReview').style.display = 'none';
    document.querySelector('.actions').style.display = 'none';
}

// 添加渐入动画
function addFadeInAnimation() {
    const elements = document.querySelectorAll('.fade-in');
    elements.forEach((element, index) => {
        setTimeout(() => {
            element.style.animationDelay = `${index * 0.1}s`;
        }, index * 100);
    });
}

// 确保函数在全局作用域中可用
window.showTab = showTab;
window.addToMistakeBook = addToMistakeBook;
window.retakeTest = retakeTest;
window.viewMistakeBook = viewMistakeBook;
window.backToHome = backToHome;