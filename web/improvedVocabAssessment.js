// 🎯 改进的词汇量评估系统 - 照顾基础薄弱学生

// 智能词汇量预估算法
function calculateSmartVocabularyEstimate(stage, percentage, avgDifficulty, levelCounts, allAnswers) {
  // 基础词汇量映射 - 更科学的基数
  const baseLevels = {
    'beginner': 200,
    'primary_basic': 450,
    'primary_good': 680,
    'primary_excellent': 920,
    'junior_basic': 1200,
    'junior_good': 1550,
    'junior_excellent': 2000,
    'senior_basic': 2400,
    'senior_good': 2900,
    'senior_excellent': 3600,
    'senior_outstanding': 4300
  };
  
  const baseVocab = baseLevels[stage] || 500;
  
  // 难度系数 - 更温和的调整
  const difficultyMultiplier = Math.max(0.85, Math.min(1.25, (avgDifficulty + 1) / 4));
  
  // 正确率系数 - 非线性调整，对低分更友好
  const percentageMultiplier = percentage >= 80 ? 
    Math.min(1.2, percentage / 80) : 
    Math.max(0.75, Math.pow(percentage / 60, 0.7));
  
  // 级别分布奖励 - 鼓励跨级别学习
  const levelBonus = (levelCounts.primary * 80) + 
                    (levelCounts.junior * 120) + 
                    (levelCounts.senior * 180) + 
                    (levelCounts.advanced * 250);
  
  // 题目接触度奖励 - 即使答错也有价值
  const exposureBonus = allAnswers.length * 15;
  
  const finalEstimate = Math.round(
    baseVocab * difficultyMultiplier * percentageMultiplier + 
    levelBonus + exposureBonus
  );
  
  return Math.max(150, finalEstimate); // 最低150词
}

// 改进的K12词汇水平评估 - 更友好的评估标准
function calculateImprovedK12VocabularyLevel(score, totalQuestions, answers = []) {
  const percentage = (score / totalQuestions) * 100;
  
  // 分析答题情况
  const correctAnswers = answers.filter(a => a.isCorrect);
  const allAnswers = answers.length > 0 ? answers : [];
  
  // 计算平均难度
  const avgCorrectDifficulty = correctAnswers.length > 0 
    ? correctAnswers.reduce((sum, a) => sum + (a.question.difficulty || 1), 0) / correctAnswers.length 
    : 1;
  
  const avgAttemptedDifficulty = allAnswers.length > 0 
    ? allAnswers.reduce((sum, a) => sum + (a.question.difficulty || 1), 0) / allAnswers.length 
    : 1;
  
  // 分析各级别词汇掌握情况
  const levelCounts = { primary: 0, junior: 0, senior: 0, advanced: 0 };
  const attemptedCounts = { primary: 0, junior: 0, senior: 0, advanced: 0 };
  
  correctAnswers.forEach(a => {
    const level = a.question.level || (a.question.difficulty >= 7 ? 'advanced' : 'primary');
    levelCounts[level] = (levelCounts[level] || 0) + 1;
  });
  
  allAnswers.forEach(a => {
    const level = a.question.level || (a.question.difficulty >= 7 ? 'advanced' : 'primary');
    attemptedCounts[level] = (attemptedCounts[level] || 0) + 1;
  });
  
  // 🎯 全新评估逻辑 - 更加友好和鼓励性
  let level, stage, description, percentile, nextGoal;
  
  // 高水平学生判断（保持高标准）
  if (percentage >= 95 && avgCorrectDifficulty >= 7) {
    level = '高中顶尖水平';
    stage = 'senior_outstanding';
    description = '🎉 惊艳！您的词汇水平已达到高中顶尖标准，具备冲击名校的实力！';
    percentile = '超过99%的同龄人';
    nextGoal = '可以开始学习四六级和托福雅思词汇，为国际化英语学习做准备';
  } else if (percentage >= 85 && avgCorrectDifficulty >= 6) {
    level = '高中优秀水平';
    stage = 'senior_excellent';
    description = '🌟 恭喜！您的词汇水平达到高中优秀标准，已具备学习更高难度词汇的能力！';
    percentile = '超过95%的同龄人';
    nextGoal = '建议增加高中难词和部分四级词汇的学习，挑战更高难度';
  } else if (percentage >= 70 && (avgCorrectDifficulty >= 5 || levelCounts.senior >= 2)) {
    level = '高中良好水平';
    stage = 'senior_good';
    description = '👍 很棒！您的词汇水平达到高中良好标准，继续保持就能达到优秀水平。';
    percentile = '超过80%的同龄人';
    nextGoal = '继续积累高中核心词汇，提高词汇的深度理解';
  } else if (percentage >= 55 && (avgCorrectDifficulty >= 4 || levelCounts.senior >= 1 || (levelCounts.junior >= 5 && percentage >= 60))) {
    level = '高中基础水平';
    stage = 'senior_basic';
    description = '💪 不错！您已经具备高中基础词汇水平，有了很好的起点。';
    percentile = '超过60%的同龄人';
    nextGoal = '重点学习高中必修词汇，提高词汇运用能力';
  
  // 初中水平评估 - 大幅降低门槛
  } else if (percentage >= 65 && (avgCorrectDifficulty >= 3.5 || levelCounts.junior >= 4)) {
    level = '初中优秀水平';
    stage = 'junior_excellent';
    description = '🎊 太棒了！您的词汇水平达到初中优秀标准，可以开始挑战高中词汇了！';
    percentile = '超过85%的初中同龄人';
    nextGoal = '可以开始接触高中词汇，为高中英语学习做准备';
  } else if (percentage >= 50 && (avgCorrectDifficulty >= 3 || levelCounts.junior >= 3 || (levelCounts.primary >= 6 && percentage >= 55))) {
    level = '初中良好水平';
    stage = 'junior_good';
    description = '😊 很好！您的词汇水平达到初中良好标准，继续努力就能达到优秀水平。';
    percentile = '超过65%的初中同龄人';
    nextGoal = '继续巩固初中核心词汇，提高词汇记忆的准确性';
  } else if (percentage >= 35 && (avgCorrectDifficulty >= 2.5 || levelCounts.junior >= 1 || levelCounts.primary >= 4)) {
    level = '初中基础水平';
    stage = 'junior_basic';
    description = '✨ 好的开始！您已经具备初中基础词汇水平，继续加油会有很大进步！';
    percentile = '超过45%的初中同龄人';
    nextGoal = '重点学习初中必修词汇，打好词汇基础';
  
  // 小学水平评估 - 非常友好的标准
  } else if (percentage >= 60 && (levelCounts.primary >= 5 || avgCorrectDifficulty >= 2.5)) {
    level = '小学优秀水平';
    stage = 'primary_excellent';
    description = '🌈 太棒了！您的词汇水平达到小学优秀标准，可以开始学习初中词汇了！';
    percentile = '超过80%的小学同龄人';
    nextGoal = '可以开始接触初中词汇，扩大词汇量';
  } else if (percentage >= 45 && (levelCounts.primary >= 3 || avgCorrectDifficulty >= 2)) {
    level = '小学良好水平';
    stage = 'primary_good';
    description = '🎈 很好！您的词汇水平达到小学良好标准，继续努力就能达到优秀水平！';
    percentile = '超过60%的小学同龄人';
    nextGoal = '继续学习小学核心词汇，为初中英语学习做准备';
  } else if (percentage >= 25 && (levelCounts.primary >= 2 || avgCorrectDifficulty >= 1.5)) {
    level = '小学基础水平';
    stage = 'primary_basic';
    description = '🌱 不错的开始！您已经具备小学基础词汇水平，每一步都是进步！';
    percentile = '超过35%的小学同龄人';
    nextGoal = '重点学习小学基础词汇，建立良好的词汇基础';
  } else if (percentage >= 15) {
    level = '词汇入门水平';
    stage = 'beginner';
    description = '🎯 每个人都有起点！您已经开始了词汇学习的旅程，坚持下去会有很大进步！';
    percentile = '正在起步阶段';
    nextGoal = '从最基础的日常词汇开始，每天学习5-10个新单词';
  } else {
    level = '需要从基础开始';
    stage = 'beginner';
    description = '🌟 不要气馁！英语学习是一个过程，从基础开始，稳步前进，一定会有收获！';
    percentile = '建议从基础开始';
    nextGoal = '建议先学习最基础的词汇，可以从图片单词卡片开始';
  }
  
  // 使用智能算法计算词汇量
  const estimatedVocab = calculateSmartVocabularyEstimate(
    stage, percentage, avgCorrectDifficulty, levelCounts, allAnswers
  );
  
  // 生成合理的词汇量范围
  const rangeMap = {
    'beginner': `${Math.max(100, estimatedVocab - 100)}-${estimatedVocab + 150}`,
    'primary_basic': `${Math.max(350, estimatedVocab - 150)}-${estimatedVocab + 200}`,
    'primary_good': `${Math.max(550, estimatedVocab - 180)}-${estimatedVocab + 250}`,
    'primary_excellent': `${Math.max(750, estimatedVocab - 200)}-${estimatedVocab + 300}`,
    'junior_basic': `${Math.max(1000, estimatedVocab - 250)}-${estimatedVocab + 350}`,
    'junior_good': `${Math.max(1300, estimatedVocab - 300)}-${estimatedVocab + 400}`,
    'junior_excellent': `${Math.max(1700, estimatedVocab - 350)}-${estimatedVocab + 450}`,
    'senior_basic': `${Math.max(2100, estimatedVocab - 400)}-${estimatedVocab + 500}`,
    'senior_good': `${Math.max(2600, estimatedVocab - 450)}-${estimatedVocab + 600}`,
    'senior_excellent': `${Math.max(3300, estimatedVocab - 500)}-${estimatedVocab + 700}`,
    'senior_outstanding': `${Math.max(4000, estimatedVocab - 600)}-${estimatedVocab + 800}`
  };
  
  const range = `${rangeMap[stage]} 词汇量` || `约 ${estimatedVocab} 词汇量`;
  
  return {
    level,
    range,
    description,
    stage,
    percentage: Math.round(percentage),
    avgDifficulty: Math.round(avgCorrectDifficulty * 10) / 10,
    estimatedVocab,
    percentile,
    nextGoal,
    levelCounts,
    attemptedCounts,
    improvementTips: generateImprovementTips(stage, percentage, levelCounts)
  };
}

// 生成个性化改进建议
function generateImprovementTips(stage, percentage, levelCounts) {
  const tips = [];
  
  if (stage.includes('beginner') || stage.includes('primary_basic')) {
    tips.push({
      icon: '📚',
      title: '基础词汇优先',
      content: '重点学习日常生活中最常用的词汇，如家庭、食物、颜色等主题词汇'
    });
    tips.push({
      icon: '🎵',
      title: '趣味学习法',
      content: '通过英文儿歌、动画片和游戏来学习，让学习过程更有趣'
    });
  } else if (stage.includes('primary')) {
    tips.push({
      icon: '📖',
      title: '阅读练习',
      content: '开始阅读简单的英文绘本和故事书，在语境中学习新词汇'
    });
    tips.push({
      icon: '✍️',
      title: '写作练习',
      content: '尝试用学过的词汇写简单的句子和日记'
    });
  } else if (stage.includes('junior')) {
    tips.push({
      icon: '🔍',
      title: '词汇拓展',
      content: '学习同义词和反义词，丰富词汇表达方式'
    });
    tips.push({
      icon: '🎬',
      title: '影视学习',
      content: '观看英文电影和电视剧（带字幕），在真实语境中学习'
    });
  } else {
    tips.push({
      icon: '📰',
      title: '新闻阅读',
      content: '阅读英文新闻和杂志，学习更正式和学术的词汇'
    });
    tips.push({
      icon: '🌍',
      title: '国际交流',
      content: '参加英语角或在线交流，在实际使用中巩固词汇'
    });
  }
  
  // 通用建议
  tips.push({
    icon: '⏰',
    title: '坚持复习',
    content: '制定词汇复习计划，定期回顾已学词汇，防止遗忘'
  });
  
  return tips;
}

// 导出函数供其他模块使用
if (typeof window !== 'undefined') {
  window.calculateImprovedK12VocabularyLevel = calculateImprovedK12VocabularyLevel;
  window.calculateSmartVocabularyEstimate = calculateSmartVocabularyEstimate;
}