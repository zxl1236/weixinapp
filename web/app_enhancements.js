// 新增函数：根据指定的级别（小学、初中、高中）开始测试
async function startTestByLevel(level) {
  // 设定每个级别的测试题量
  const questionCount = 2; 

  // 显示加载动画
  showTestLoadingAnimation(questionCount, async () => {
    try {
      // 1. 根据级别从词库获取问题
      const questions = getQuestionsByLevel(level, questionCount);
      
      if (!questions || questions.length === 0) {
        console.error(`错误：无法为级别 "${level}" 获取到题目。请检查词库。`);
        alert(`抱歉，无法加载【${level}】的词汇，请稍后重试。`);
        loadHomePage(); // 加载失败，返回首页
        return;
      }

      // 2. 初始化并开始测试
      // 我们将level信息也存入currentTest全局状态，方便后续使用
      if (typeof currentTest === 'undefined') {
        window.currentTest = {};
      }
      currentTest.level = level; 
      await initializeTestWithQuestions(questions, questionCount);

    } catch (error) {
      console.error(`启动级别测试时发生错误 (级别: ${level}):`, error);
      alert('测试启动失败，请刷新页面后重试。');
      loadHomePage();
    }
  });
}

// 新增函数：根据级别从词库获取指定数量的题目
function getQuestionsByLevel(level, count) {
  console.log(`🎯 开始生成题目，级别: ${level}, 数量: ${count}`);
  
  // 优先使用导入的Excel数据
  if (level === 'primary') {
    // 检查是否有Excel导入数据
    if (typeof importedPrimaryVocab !== 'undefined') {
      console.log('✅ 发现Excel导入数据，直接使用');
      return generateQuestionsFromImportedData(count);
    }
    
    // 使用小学分年级词库
    if (typeof window !== 'undefined' && window.getPrimaryMixedVocab) {
      console.log('🎯 使用小学分年级词库生成题目');
      const questions = window.getPrimaryMixedVocab(count);
      if (questions && questions.length > 0) {
        return questions;
      }
    }
  }
  
  // 回退到原始词库
  if (!wordDatabase || !wordDatabase[level] || wordDatabase[level].length === 0) {
    console.warn(`词库级别 ${level} 不存在或为空，尝试使用硬编码题目`);
    return getHardcodedQuestions(count); // 使用硬编码题目作为最后的回退
  }

  const levelWords = wordDatabase[level];
  const questions = [];
  const usedIndices = new Set();
  
  // 如果请求的数量大于该级别词库的总量，则返回所有单词
  const numQuestions = Math.min(count, levelWords.length);

  for (let i = 0; i < numQuestions; i++) {
    if (usedIndices.size >= levelWords.length) {
      break; // 所有单词都用过了
    }

    let randomIndex;
    do {
      randomIndex = Math.floor(Math.random() * levelWords.length);
    } while (usedIndices.has(randomIndex));

    usedIndices.add(randomIndex);
    const word = levelWords[randomIndex];

    // 确保选项是安全的
    const options = Array.isArray(word.options) && word.options.length > 0
      ? [...word.options]
      : generateSafeOptions(word);

    // 确保正确答案在选项中
    if (!options.includes(word.meaning)) {
      // 随机替换一个选项为正确答案
      options[Math.floor(Math.random() * options.length)] = word.meaning;
    }

    questions.push({
      ...word,
      options: shuffleArray(options)
    });
  }

  return questions;
}

// 一个辅助函数，用于生成安全的选项（如果词库中没有提供）
function generateSafeOptions(word) {
    // 这里可以从一个更大的备用词库中随机抽取，暂时用虚拟数据代替
    const dummyMeanings = ['一个定义', '另一个定义', '某个定义', '某个解释']; 
    const options = [word.meaning, ...dummyMeanings.slice(0, 3)];
    return shuffleArray(options);
}

// 直接从Excel导入数据生成题目
function generateQuestionsFromImportedData(count = 20) {
  console.log(`📊 从Excel导入数据生成题目，目标数量: ${count}`);
  
  // 收集所有年级的词汇
  const allWords = [];
  Object.keys(importedPrimaryVocab).forEach(gradeKey => {
    const grade = gradeKey.replace('grade', '');
    const gradeWords = importedPrimaryVocab[gradeKey];
    console.log(`📚 ${gradeKey}: ${gradeWords.length}个词汇`);
    
    gradeWords.forEach((word, index) => {
      // 验证词汇数据完整性
      if (!word.word || !word.meaning) {
        console.warn(`⚠️ 跳过无效词汇 ${gradeKey}[${index}]:`, word);
        return;
      }
      
      allWords.push({
        ...word,
        grade: parseInt(grade),
        level: 'primary'
      });
    });
  });
  
  if (allWords.length === 0) {
    console.warn('❌ Excel数据为空');
    return [];
  }
  
  console.log(`📚 有效词汇总数: ${allWords.length}`);
  
  // 随机选择词汇
  const questions = [];
  const usedIndices = new Set();
  const maxCount = Math.min(count, allWords.length);
  
  console.log(`🎯 开始生成${maxCount}题...`);
  
  for (let i = 0; i < maxCount; i++) {
    let attempts = 0;
    let randomIndex;
    
    // 防止无限循环
    do {
      randomIndex = Math.floor(Math.random() * allWords.length);
      attempts++;
      if (attempts > allWords.length * 2) {
        console.error(`❌ 无法找到未使用的词汇，已生成${questions.length}题`);
        break;
      }
    } while (usedIndices.has(randomIndex));
    
    if (attempts > allWords.length * 2) {
      break;
    }
    
    usedIndices.add(randomIndex);
    const word = allWords[randomIndex];
    
    console.log(`🔍 处理第${i+1}题: ${word.word} → ${word.meaning}`);
    
    try {
      // 生成选项
      const options = generateOptionsFromImportedData(word, allWords);
      
      if (!options || options.length < 4) {
        console.warn(`⚠️ 选项生成失败，跳过: ${word.word}`);
        i--; // 重试这一题
        continue;
      }
      
      // 记录正确答案的完整格式（含词性）
      const correctAnswerWithPOS = `${word.meaning} (${word.partOfSpeech || 'n.'})`;
      
      // 打乱选项
      const shuffledOptions = shuffleArray([...options]);
      
      // 找到正确答案在打乱后选项中的位置
      const correctIndex = shuffledOptions.findIndex(option => option === correctAnswerWithPOS);
      
      const questionData = {
        word: word.word,
        meaning: word.meaning, // 保持原意思（不含词性）
        correctAnswerFull: correctAnswerWithPOS, // 完整格式（含词性）
        options: shuffledOptions,
        correctIndex: correctIndex, // 直接存储正确答案索引
        grade: word.grade,
        level: 'primary',
        difficulty: calculateGradeDifficulty(word.grade),
        phonetic: word.phonetic || word.usPhonetic || word.ukPhonetic || '',
        partOfSpeech: word.partOfSpeech || 'n.'
      };
      
      questions.push(questionData);
      console.log(`✅ 成功生成题目 ${questions.length}: ${word.word} (${word.grade}年级)`);
      
    } catch (error) {
      console.error(`❌ 生成题目时出错: ${word.word}`, error);
      i--; // 重试这一题
    }
  }
  
  console.log(`🎉 题目生成完成，实际生成: ${questions.length}题`);
  return questions;
}

// 从导入数据生成选项
function generateOptionsFromImportedData(correctWord, allWords) {
  console.log(`🔍 开始为 ${correctWord.word} 生成选项...`);
  console.log(`📝 正确词汇: ${correctWord.word} → ${correctWord.meaning}`);
  console.log(`📊 总词汇数: ${allWords.length}`);
  
  try {
    // 确保有正确的meaning
    if (!correctWord.meaning || correctWord.meaning.trim() === '') {
      console.warn(`⚠️ ${correctWord.word} 没有meaning字段`);
      return ['未知词汇', '选项A', '选项B', '选项C'];
    }
    
    const options = [`${correctWord.meaning} (${correctWord.partOfSpeech || 'n.'})`];
    const used = new Set([`${correctWord.meaning} (${correctWord.partOfSpeech || 'n.'})`]);
    
    // 从同年级和相邻年级选择干扰项
    const targetGrades = [correctWord.grade];
    if (correctWord.grade > 3) targetGrades.push(correctWord.grade - 1);
    if (correctWord.grade < 6) targetGrades.push(correctWord.grade + 1);
    
    console.log(`🎯 目标年级: ${targetGrades.join(',')}`);
    
    // 过滤出可用的干扰项
    const potentialDistractors = allWords
      .filter(w => {
        const isValid = w.word !== correctWord.word && 
                       w.meaning && 
                       w.meaning.trim() !== '' && 
                       targetGrades.includes(w.grade);
        if (!isValid) {
          console.log(`❌ 排除干扰项: ${w.word} (原因: ${w.word === correctWord.word ? '相同词汇' : '无meaning或年级不匹配'})`);
        }
        return isValid;
      })
      .map(w => `${w.meaning} (${w.partOfSpeech || 'n.'})`)
      .filter(meaning => !used.has(meaning));
    
    console.log(`📝 可用干扰项: ${potentialDistractors.length}个`);
    console.log(`📝 干扰项示例: ${potentialDistractors.slice(0, 3).join(', ')}`);
    
    // 随机添加干扰项
    let attempts = 0;
    while (options.length < 4 && potentialDistractors.length > 0 && attempts < 20) {
      const randomIndex = Math.floor(Math.random() * potentialDistractors.length);
      const distractor = potentialDistractors.splice(randomIndex, 1)[0];
      if (distractor && !used.has(distractor)) {
        options.push(distractor);
        used.add(distractor);
        console.log(`✅ 添加干扰项: ${distractor}`);
      }
      attempts++;
    }
    
    console.log(`📝 已添加 ${options.length - 1} 个年级干扰项`);
    
    // 如果还不够，添加通用干扰项
    const fallbackDistractors = [
      '苹果 (n.)', '学校 (n.)', '朋友 (n.)', '家庭 (n.)', '老师 (n.)', '学生 (n.)', '书本 (n.)', '铅笔 (n.)',
      '桌子 (n.)', '椅子 (n.)', '黑板 (n.)', '窗户 (n.)', '门 (n.)', '花 (n.)', '树 (n.)', '太阳 (n.)',
      '月亮 (n.)', '星星 (n.)', '水 (n.)', '火 (n.)', '风 (n.)', '雨 (n.)', '雪 (n.)', '冰 (n.)',
      '动物 (n.)', '植物 (n.)', '房子 (n.)', '汽车 (n.)', '飞机 (n.)', '船 (n.)', '食物 (n.)', '衣服 (n.)',
      '快乐的 (adj.)', '悲伤的 (adj.)', '美丽的 (adj.)', '重要的 (adj.)', '困难的 (adj.)', '简单的 (adj.)',
      '大的 (adj.)', '小的 (adj.)', '新的 (adj.)', '旧的 (adj.)', '好的 (adj.)', '坏的 (adj.)', '热的 (adj.)', '冷的 (adj.)'
    ];
    
    let fallbackAttempts = 0;
    while (options.length < 4 && fallbackAttempts < 100) {
      const randomDistractor = fallbackDistractors[Math.floor(Math.random() * fallbackDistractors.length)];
      if (!used.has(randomDistractor)) {
        options.push(randomDistractor);
        used.add(randomDistractor);
        console.log(`✅ 添加备用干扰项: ${randomDistractor}`);
      }
      fallbackAttempts++;
    }
    
    console.log(`✅ 选项生成完成: ${options.length}个选项`);
    console.log(`📝 最终选项: ${options.join(', ')}`);
    
    if (options.length < 4) {
      console.warn(`⚠️ 选项不足4个，只有${options.length}个，强制补齐`);
      // 强制补齐到4个
      while (options.length < 4) {
        const placeholder = `选项${String.fromCharCode(65 + options.length)}`; // A, B, C, D
        options.push(placeholder);
        console.log(`🔧 添加占位符: ${placeholder}`);
      }
    }
    
    return options;
    
  } catch (error) {
    console.error('❌ 选项生成出错:', error);
    console.error('错误详情:', error.stack);
    // 返回基本选项
    return [
      correctWord.meaning || '未知',
      '选项A',
      '选项B', 
      '选项C'
    ];
  }
}

// 根据年级计算难度
function calculateGradeDifficulty(grade) {
  const difficultyMap = { 3: 1, 4: 2, 5: 3, 6: 4 };
  return difficultyMap[grade] || 1;
}



// 打乱数组的函数 (确保它在app.js中也存在)
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}
