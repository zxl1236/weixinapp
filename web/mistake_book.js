
// 生词本核心功能
/**
 * 添加单词到生词本
 * @param {Object} question - 题目对象，包含word, meaning, phonetic等
 */
function addWordToWordBook(question) {
  if (!question || !question.word) {
    console.warn('⚠️ 无效的题目数据，无法添加到生词本');
    return;
  }
  
  const wordBook = getWordBook();
  
  // 检查是否已存在
  const existingIndex = wordBook.findIndex(item => item.word === question.word);
  
  const wordItem = {
    word: question.word,
    meaning: question.meaning || question.correctAnswerFull || '未知',
    phonetic: question.phonetic || '',
    partOfSpeech: question.partOfSpeech || '',
    addedAt: new Date().toISOString(),
    studyCount: 1
  };
  
  if (existingIndex >= 0) {
    // 更新学习次数
    wordBook[existingIndex].studyCount++;
    wordBook[existingIndex].addedAt = new Date().toISOString();
    console.log(`📝 更新生词: ${question.word} (学习次数: ${wordBook[existingIndex].studyCount})`);
  } else {
    // 添加新生词
    wordBook.push(wordItem);
    console.log(`📝 添加生词: ${question.word}`);
  }
  
  saveWordBook(wordBook);
}

/**
 * 获取生词本数据
 * @returns {Array} 生词数组
 */
function getWordBook() {
  try {
    const data = localStorage.getItem('wordBook');
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('❌ 读取生词本失败:', error);
    return [];
  }
}

/**
 * 保存生词本数据
 * @param {Array} wordBook - 生词数组
 */
function saveWordBook(wordBook) {
  try {
    localStorage.setItem('wordBook', JSON.stringify(wordBook));
    console.log(`💾 生词本已保存，共${wordBook.length}个生词`);
  } catch (error) {
    console.error('❌ 保存生词本失败:', error);
  }
}

/**
 * 从生词本中移除单词
 * @param {string} word - 要移除的单词
 */
function removeWordFromWordBook(word) {
  const wordBook = getWordBook();
  const newWordBook = wordBook.filter(item => item.word !== word);
  saveWordBook(newWordBook);
  console.log(`🗑️ 已从生词本移除: ${word}`);
}

/**
 * 清空生词本
 */
function clearWordBook() {
  localStorage.removeItem('wordBook');
  console.log('🗑️ 生词本已清空');
}

// 确保函数在全局作用域中可用
window.addWordToWordBook = addWordToWordBook;
window.getWordBook = getWordBook;
window.saveWordBook = saveWordBook;
window.removeWordFromWordBook = removeWordFromWordBook;
window.clearWordBook = clearWordBook;

// 兼容旧版本
window.addWordToMistakeBook = addWordToWordBook;
window.getMistakeBook = getWordBook;
window.saveMistakeBook = saveWordBook;
window.removeWordFromMistakeBook = removeWordFromWordBook;
window.clearMistakeBook = clearWordBook;

/**
 * 显示生词本页面并渲染生词列表。
 */
function showWordBookPage() {
  // 检查当前页面是否有wordBookPage元素
  const wordBookPage = document.getElementById('wordBookPage') || document.getElementById('mistakeBookPage');
  
  if (!wordBookPage) {
    // 如果当前页面没有生词本页面元素，跳转到首页的生词本
    console.log('🔄 当前页面无生词本元素，跳转到首页生词本');
    window.location.href = 'index.html#wordBook';
    return;
  }
  
  // 1. 切换到生词本页面
  if (typeof showPage === 'function') {
    showPage('wordBookPage');
  } else {
    // 如果showPage函数不存在，直接操作DOM
    // 隐藏首页
    const homePage = document.getElementById('homePage');
    if (homePage) {
      homePage.style.display = 'none';
    }
    
    // 显示生词本页面
    wordBookPage.classList.remove('hidden');
    wordBookPage.style.display = 'block';
  }

  // 2. 获取生词数据
  const wordBook = getWordBook();
  const container = document.getElementById('wordListContainer') || document.getElementById('mistakeListContainer');

  if (!container) {
    console.error("生词本容器 'wordListContainer' 未找到。");
    return;
  }

  // 3. 动态生成HTML
  if (wordBook.length === 0) {
    container.innerHTML = `
      <div class="no-words-message">
        <div class="no-words-icon">📚</div>
        <div class="no-words-title">暂无生词</div>
        <div class="no-words-text">继续学习，生词会自动收录到这里</div>
        <button class="btn btn-primary" onclick="goHome()" style="margin-top: 20px;">开始新的学习</button>
      </div>
    `;
    return;
  }
  
  // 添加功能按钮区域
  const actionButtons = `
    <div class="word-book-controls">
      <button class="btn btn-primary" onclick="startWordReview()">
        <span class="btn-icon">📖</span>
        开始复习 (${Math.min(wordBook.length, 20)}题)
      </button>
      <button class="btn btn-secondary" onclick="showWordBookStats()">
        <span class="btn-icon">📊</span>
        查看统计
      </button>
      <div class="word-count-badge">
        共 ${wordBook.length} 个生词
      </div>
    </div>
  `;

  // 为每个生词生成一个卡片
  const wordCards = wordBook.map(word => `
    <div class="word-item-card">
      <div class="word-word-section">
        <span class="word-word">${word.word}</span>
        <span class="word-phonetic">${word.phonetic || ''}</span>
      </div>
      <div class="word-details-section">
        <p class="word-meaning"><strong>中文意思：</strong> ${word.meaning}</p>
        <p class="word-added-time"><strong>添加时间：</strong> ${new Date(word.addedAt).toLocaleString()}</p>
        <p class="word-study-count"><strong>学习次数：</strong> ${word.studyCount || 1}</p>
      </div>
      <div class="word-actions-section">
        <button class="btn-pronounce" onclick="playPronunciation('${word.word}')">🔊 发音</button>
        <button class="btn-remove" onclick="removeWordAndRefresh('${word.word}')">移除</button>
      </div>
    </div>
  `).join('');
  
  // 组合完整的HTML
  container.innerHTML = actionButtons + wordCards;
}

/**
 * 移除一个单词后刷新生词本页面。
 * @param {string} word - 需要移除的单词。
 */
function removeWordAndRefresh(word) {
  removeWordFromWordBook(word);
  showWordBookPage(); // 刷新列表
}

/**
 * 弹出确认框，询问用户是否确定要清空生词本。
 */
function confirmClearWordBook() {
  const isConfirmed = confirm("你确定要清空所有生词记录吗？这个操作无法撤销。");
  if (isConfirmed) {
    clearWordBook();
    showWordBookPage(); // 刷新列表
  }
}

/**
 * 开始生词复习测试
 */
function startWordReview() {
  const wordBook = getWordBook();
  
  if (wordBook.length === 0) {
    alert('生词本为空，先去学习一些单词吧！');
    return;
  }
  
  if (wordBook.length < 5) {
    alert(`生词本只有${wordBook.length}个生词，建议至少有5个生词再开始复习。`);
    return;
  }
  
  // 跳转到复习页面，传递生词数据
  const reviewData = {
    type: 'word_review',
    words: wordBook.slice(0, Math.min(20, wordBook.length)), // 最多复习20个生词
    source: 'word_book'
  };
  
  sessionStorage.setItem('reviewData', JSON.stringify(reviewData));
  window.location.href = 'test.html?mode=review';
}

/**
 * 获取生词本统计信息
 */
function getWordBookStats() {
  const wordBook = getWordBook();
  
  if (wordBook.length === 0) {
    return {
      totalCount: 0,
      levelStats: {},
      averageStudyCount: 0,
      oldestWord: null,
      newestWord: null
    };
  }
  
  // 按级别统计
  const levelStats = {};
  let totalStudyCount = 0;
  let oldestDate = new Date();
  let newestDate = new Date(0);
  let oldestWord = null;
  let newestWord = null;
  
  wordBook.forEach(word => {
    // 统计级别（如果有的话）
    const level = word.level || 'unknown';
    levelStats[level] = (levelStats[level] || 0) + 1;
    
    // 统计学习次数
    totalStudyCount += word.studyCount || 1;
    
    // 找最早和最新的生词
    const wordDate = new Date(word.addedAt);
    if (wordDate < oldestDate) {
      oldestDate = wordDate;
      oldestWord = word;
    }
    if (wordDate > newestDate) {
      newestDate = wordDate;
      newestWord = word;
    }
  });
  
  return {
    totalCount: wordBook.length,
    levelStats: levelStats,
    averageStudyCount: (totalStudyCount / wordBook.length).toFixed(1),
    oldestWord: oldestWord,
    newestWord: newestWord
  };
}

/**
 * 显示生词本统计信息
 */
function showWordBookStats() {
  const stats = getWordBookStats();
  const container = document.getElementById('wordListContainer') || document.getElementById('mistakeListContainer');
  
  if (stats.totalCount === 0) {
    container.innerHTML = `
      <div class="no-words-message">
        <div class="no-words-icon">📚</div>
        <div class="no-words-title">暂无生词</div>
        <div class="no-words-text">继续学习，生词会自动收录到这里</div>
        <button class="btn btn-primary" onclick="goHome()" style="margin-top: 20px;">开始新的学习</button>
      </div>
    `;
    return;
  }
  
  const levelNames = {
    'primary': '小学词汇',
    'junior': '初中词汇',
    'senior': '高中词汇',
    'cet': '四六级词汇',
    'ielts_toefl': '雅思托福词汇',
    'unknown': '其他词汇'
  };
  
  const levelStatsHTML = Object.entries(stats.levelStats)
    .filter(([level, count]) => count > 0)
    .map(([level, count]) => `
      <div class="stats-item">
        <span class="stats-label">${levelNames[level] || level}:</span>
        <span class="stats-value">${count}个</span>
      </div>
    `).join('');
  
  container.innerHTML = `
    <div class="word-stats-container">
      <div class="stats-header">
        <h3>📊 生词本统计</h3>
        <button class="btn btn-secondary" onclick="showWordBookPage()">返回生词列表</button>
      </div>
      
      <div class="stats-grid">
        <div class="stats-card">
          <div class="stats-card-icon">📚</div>
          <div class="stats-card-value">${stats.totalCount}</div>
          <div class="stats-card-label">总生词数</div>
        </div>
        
        <div class="stats-card">
          <div class="stats-card-icon">🔢</div>
          <div class="stats-card-value">${stats.averageStudyCount}</div>
          <div class="stats-card-label">平均学习次数</div>
        </div>
        
        <div class="stats-card">
          <div class="stats-card-icon">📅</div>
          <div class="stats-card-value">${stats.oldestWord ? new Date(stats.oldestWord.addedAt).toLocaleDateString() : '-'}</div>
          <div class="stats-card-label">最早生词</div>
        </div>
        
        <div class="stats-card">
          <div class="stats-card-icon">🆕</div>
          <div class="stats-card-value">${stats.newestWord ? new Date(stats.newestWord.addedAt).toLocaleDateString() : '-'}</div>
          <div class="stats-card-label">最新生词</div>
        </div>
      </div>
      
      ${levelStatsHTML ? `
        <div class="level-stats-container">
          <h4>按级别分类</h4>
          <div class="level-stats-grid">
            ${levelStatsHTML}
          </div>
        </div>
      ` : ''}
      
      ${stats.oldestWord ? `
        <div class="recent-words">
          <h4>最早的生词</h4>
          <div class="word-preview">
            <span class="preview-word">${stats.oldestWord.word}</span>
            <span class="preview-meaning">${stats.oldestWord.meaning}</span>
            <span class="preview-date">${new Date(stats.oldestWord.addedAt).toLocaleString()}</span>
          </div>
        </div>
      ` : ''}
    </div>
  `;
}

// 确保新函数也可以全局访问
window.showWordBookPage = showWordBookPage;
window.startWordReview = startWordReview;
window.getWordBookStats = getWordBookStats;
window.showWordBookStats = showWordBookStats;
window.confirmClearWordBook = confirmClearWordBook;
window.removeWordAndRefresh = removeWordAndRefresh;

// 兼容旧版本
window.showMistakeBookPage = showWordBookPage;
window.startMistakeReview = startWordReview;
window.getMistakeBookStats = getWordBookStats;
window.showMistakeBookStats = showWordBookStats;
window.confirmClearMistakeBook = confirmClearWordBook;
