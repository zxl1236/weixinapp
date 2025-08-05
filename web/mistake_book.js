
// 错题本核心功能
/**
 * 添加单词到错题本
 * @param {Object} question - 题目对象，包含word, meaning, phonetic等
 */
function addWordToMistakeBook(question) {
  if (!question || !question.word) {
    console.warn('⚠️ 无效的题目数据，无法添加到错题本');
    return;
  }
  
  const mistakeBook = getMistakeBook();
  
  // 检查是否已存在
  const existingIndex = mistakeBook.findIndex(item => item.word === question.word);
  
  const mistakeWord = {
    word: question.word,
    meaning: question.meaning || question.correctAnswerFull || '未知',
    phonetic: question.phonetic || '',
    partOfSpeech: question.partOfSpeech || '',
    addedAt: new Date().toISOString(),
    wrongCount: 1
  };
  
  if (existingIndex >= 0) {
    // 更新错误次数
    mistakeBook[existingIndex].wrongCount++;
    mistakeBook[existingIndex].addedAt = new Date().toISOString();
    console.log(`📝 更新错题: ${question.word} (错误次数: ${mistakeBook[existingIndex].wrongCount})`);
  } else {
    // 添加新错题
    mistakeBook.push(mistakeWord);
    console.log(`📝 添加错题: ${question.word}`);
  }
  
  saveMistakeBook(mistakeBook);
}

/**
 * 获取错题本数据
 * @returns {Array} 错题数组
 */
function getMistakeBook() {
  try {
    const data = localStorage.getItem('mistakeBook');
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('❌ 读取错题本失败:', error);
    return [];
  }
}

/**
 * 保存错题本数据
 * @param {Array} mistakeBook - 错题数组
 */
function saveMistakeBook(mistakeBook) {
  try {
    localStorage.setItem('mistakeBook', JSON.stringify(mistakeBook));
    console.log(`💾 错题本已保存，共${mistakeBook.length}个错题`);
  } catch (error) {
    console.error('❌ 保存错题本失败:', error);
  }
}

/**
 * 从错题本中移除单词
 * @param {string} word - 要移除的单词
 */
function removeWordFromMistakeBook(word) {
  const mistakeBook = getMistakeBook();
  const newMistakeBook = mistakeBook.filter(item => item.word !== word);
  saveMistakeBook(newMistakeBook);
  console.log(`🗑️ 已从错题本移除: ${word}`);
}

/**
 * 清空错题本
 */
function clearMistakeBook() {
  localStorage.removeItem('mistakeBook');
  console.log('🗑️ 错题本已清空');
}

// 确保函数在全局作用域中可用
window.addWordToMistakeBook = addWordToMistakeBook;
window.getMistakeBook = getMistakeBook;
window.saveMistakeBook = saveMistakeBook;
window.removeWordFromMistakeBook = removeWordFromMistakeBook;
window.clearMistakeBook = clearMistakeBook;

/**
 * 显示错题本页面并渲染错题列表。
 */
function showMistakeBookPage() {
  // 检查当前页面是否有mistakeBookPage元素
  const mistakeBookPage = document.getElementById('mistakeBookPage');
  
  if (!mistakeBookPage) {
    // 如果当前页面没有错题本页面元素，跳转到首页的错题本
    console.log('🔄 当前页面无错题本元素，跳转到首页错题本');
    window.location.href = 'index.html#mistakeBook';
    return;
  }
  
  // 1. 切换到错题本页面
  if (typeof showPage === 'function') {
    showPage('mistakeBookPage');
  } else {
    // 如果showPage函数不存在，直接操作DOM
    // 隐藏首页
    const homePage = document.getElementById('homePage');
    if (homePage) {
      homePage.style.display = 'none';
    }
    
    // 显示错题本页面
    mistakeBookPage.classList.remove('hidden');
    mistakeBookPage.style.display = 'block';
  }

  // 2. 获取错题数据
  const mistakeBook = getMistakeBook();
  const container = document.getElementById('mistakeListContainer');

  if (!container) {
    console.error("错题本容器 'mistakeListContainer' 未找到。");
    return;
  }

  // 3. 动态生成HTML
  if (mistakeBook.length === 0) {
    container.innerHTML = `
      <div class="no-mistakes-message">
        <div class="no-mistakes-icon">🎉</div>
        <div class="no-mistakes-title">太棒了！</div>
        <div class="no-mistakes-text">你的错题本是空的，说明学习效果很好！</div>
        <button class="btn btn-primary" onclick="goHome()" style="margin-top: 20px;">开始新的测试</button>
      </div>
    `;
    return;
  }
  
  // 添加功能按钮区域
  const actionButtons = `
    <div class="mistake-book-controls">
      <button class="btn btn-primary" onclick="startMistakeReview()">
        <span class="btn-icon">📖</span>
        开始复习 (${Math.min(mistakeBook.length, 20)}题)
      </button>
      <button class="btn btn-secondary" onclick="showMistakeBookStats()">
        <span class="btn-icon">📊</span>
        查看统计
      </button>
      <div class="mistake-count-badge">
        共 ${mistakeBook.length} 个错题
      </div>
    </div>
  `;

  // 为每个错题生成一个卡片
  const mistakeCards = mistakeBook.map(word => `
    <div class="mistake-item-card">
      <div class="mistake-word-section">
        <span class="mistake-word">${word.word}</span>
        <span class="mistake-phonetic">${word.phonetic || ''}</span>
      </div>
      <div class="mistake-details-section">
        <p class="mistake-meaning"><strong>正确释义：</strong> ${word.meaning}</p>
        <p class="mistake-added-time"><strong>添加时间：</strong> ${new Date(word.addedAt).toLocaleString()}</p>
        <p class="mistake-wrong-count"><strong>错误次数：</strong> ${word.wrongCount || 1}</p>
      </div>
      <div class="mistake-actions-section">
        <button class="btn-pronounce" onclick="playPronunciation('${word.word}')">🔊 发音</button>
        <button class="btn-remove" onclick="removeWordAndRefresh('${word.word}')">移除</button>
      </div>
    </div>
  `).join('');
  
  // 组合完整的HTML
  container.innerHTML = actionButtons + mistakeCards;
}

/**
 * 移除一个单词后刷新错题本页面。
 * @param {string} word - 需要移除的单词。
 */
function removeWordAndRefresh(word) {
  removeWordFromMistakeBook(word);
  showMistakeBookPage(); // 刷新列表
}

/**
 * 弹出确认框，询问用户是否确定要清空错题本。
 */
function confirmClearMistakeBook() {
  const isConfirmed = confirm("你确定要清空所有错题记录吗？这个操作无法撤销。");
  if (isConfirmed) {
    clearMistakeBook();
    showMistakeBookPage(); // 刷新列表
  }
}

/**
 * 开始错题复习测试
 */
function startMistakeReview() {
  const mistakeBook = getMistakeBook();
  
  if (mistakeBook.length === 0) {
    alert('错题本为空，先去做几道题目吧！');
    return;
  }
  
  if (mistakeBook.length < 5) {
    alert(`错题本只有${mistakeBook.length}个错题，建议至少有5个错题再开始复习。`);
    return;
  }
  
  // 跳转到复习页面，传递错题数据
  const reviewData = {
    type: 'mistake_review',
    words: mistakeBook.slice(0, Math.min(20, mistakeBook.length)), // 最多复习20个错题
    source: 'mistake_book'
  };
  
  sessionStorage.setItem('reviewData', JSON.stringify(reviewData));
  window.location.href = 'test.html?mode=review';
}

/**
 * 获取错题本统计信息
 */
function getMistakeBookStats() {
  const mistakeBook = getMistakeBook();
  
  if (mistakeBook.length === 0) {
    return {
      totalCount: 0,
      levelStats: {},
      averageWrongCount: 0,
      oldestMistake: null,
      newestMistake: null
    };
  }
  
  // 按级别统计
  const levelStats = {};
  let totalWrongCount = 0;
  let oldestDate = new Date();
  let newestDate = new Date(0);
  let oldestWord = null;
  let newestWord = null;
  
  mistakeBook.forEach(mistake => {
    // 统计级别（如果有的话）
    const level = mistake.level || 'unknown';
    levelStats[level] = (levelStats[level] || 0) + 1;
    
    // 统计错误次数
    totalWrongCount += mistake.wrongCount || 1;
    
    // 找最早和最新的错题
    const mistakeDate = new Date(mistake.addedAt);
    if (mistakeDate < oldestDate) {
      oldestDate = mistakeDate;
      oldestWord = mistake;
    }
    if (mistakeDate > newestDate) {
      newestDate = mistakeDate;
      newestWord = mistake;
    }
  });
  
  return {
    totalCount: mistakeBook.length,
    levelStats: levelStats,
    averageWrongCount: (totalWrongCount / mistakeBook.length).toFixed(1),
    oldestMistake: oldestWord,
    newestMistake: newestWord
  };
}

/**
 * 显示错题本统计信息
 */
function showMistakeBookStats() {
  const stats = getMistakeBookStats();
  const container = document.getElementById('mistakeListContainer');
  
  if (stats.totalCount === 0) {
    container.innerHTML = `
      <div class="no-mistakes-message">
        <div class="no-mistakes-icon">🎉</div>
        <div class="no-mistakes-title">太棒了！</div>
        <div class="no-mistakes-text">你的错题本是空的，说明学习效果很好！</div>
        <button class="btn btn-primary" onclick="goHome()" style="margin-top: 20px;">开始新的测试</button>
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
    <div class="mistake-stats-container">
      <div class="stats-header">
        <h3>📊 错题本统计</h3>
        <button class="btn btn-secondary" onclick="showMistakeBookPage()">返回错题列表</button>
      </div>
      
      <div class="stats-grid">
        <div class="stats-card">
          <div class="stats-card-icon">📚</div>
          <div class="stats-card-value">${stats.totalCount}</div>
          <div class="stats-card-label">总错题数</div>
        </div>
        
        <div class="stats-card">
          <div class="stats-card-icon">🔢</div>
          <div class="stats-card-value">${stats.averageWrongCount}</div>
          <div class="stats-card-label">平均错误次数</div>
        </div>
        
        <div class="stats-card">
          <div class="stats-card-icon">📅</div>
          <div class="stats-card-value">${stats.oldestMistake ? new Date(stats.oldestMistake.addedAt).toLocaleDateString() : '-'}</div>
          <div class="stats-card-label">最早错题</div>
        </div>
        
        <div class="stats-card">
          <div class="stats-card-icon">🆕</div>
          <div class="stats-card-value">${stats.newestMistake ? new Date(stats.newestMistake.addedAt).toLocaleDateString() : '-'}</div>
          <div class="stats-card-label">最新错题</div>
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
      
      ${stats.oldestMistake ? `
        <div class="recent-mistakes">
          <h4>最早的错题</h4>
          <div class="mistake-preview">
            <span class="preview-word">${stats.oldestMistake.word}</span>
            <span class="preview-meaning">${stats.oldestMistake.meaning}</span>
            <span class="preview-date">${new Date(stats.oldestMistake.addedAt).toLocaleString()}</span>
          </div>
        </div>
      ` : ''}
    </div>
  `;
}

// 确保新函数也可以全局访问
window.showMistakeBookPage = showMistakeBookPage;
window.startMistakeReview = startMistakeReview;
window.getMistakeBookStats = getMistakeBookStats;
window.showMistakeBookStats = showMistakeBookStats;
window.confirmClearMistakeBook = confirmClearMistakeBook;
window.removeWordAndRefresh = removeWordAndRefresh;
