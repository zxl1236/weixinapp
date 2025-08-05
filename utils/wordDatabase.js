// 词汇数据库 - 包含不同难度级别的词汇
const wordDatabase = {
  // 基础级别 (1-1000)
  basic: [
    { word: 'apple', meaning: '苹果', options: ['苹果', '橙子', '香蕉', '梨'], level: 1 },
    { word: 'book', meaning: '书', options: ['书', '笔', '桌子', '椅子'], level: 1 },
    { word: 'water', meaning: '水', options: ['水', '火', '土', '空气'], level: 1 },
    { word: 'house', meaning: '房子', options: ['房子', '车', '树', '花'], level: 1 },
    { word: 'school', meaning: '学校', options: ['学校', '医院', '银行', '商店'], level: 1 },
    { word: 'friend', meaning: '朋友', options: ['朋友', '敌人', '老师', '学生'], level: 2 },
    { word: 'computer', meaning: '电脑', options: ['电脑', '电视', '冰箱', '洗衣机'], level: 2 },
    { word: 'beautiful', meaning: '美丽的', options: ['美丽的', '丑陋的', '高的', '矮的'], level: 2 },
    { word: 'important', meaning: '重要的', options: ['重要的', '简单的', '困难的', '容易的'], level: 3 },
    { word: 'information', meaning: '信息', options: ['信息', '新闻', '故事', '历史'], level: 3 }
  ],
  
  // 中级级别 (1001-3000)
  intermediate: [
    { word: 'appropriate', meaning: '合适的', options: ['合适的', '不当的', '完美的', '错误的'], level: 4 },
    { word: 'significant', meaning: '重要的，显著的', options: ['重要的', '微小的', '普通的', '特殊的'], level: 4 },
    { word: 'environment', meaning: '环境', options: ['环境', '社会', '文化', '历史'], level: 4 },
    { word: 'opportunity', meaning: '机会', options: ['机会', '困难', '挑战', '问题'], level: 5 },
    { word: 'development', meaning: '发展', options: ['发展', '退步', '停止', '开始'], level: 5 },
    { word: 'experience', meaning: '经验', options: ['经验', '知识', '技能', '能力'], level: 5 },
    { word: 'responsibility', meaning: '责任', options: ['责任', '权利', '义务', '职责'], level: 6 },
    { word: 'communication', meaning: '交流', options: ['交流', '对话', '讨论', '辩论'], level: 6 },
    { word: 'organization', meaning: '组织', options: ['组织', '公司', '团体', '机构'], level: 6 },
    { word: 'relationship', meaning: '关系', options: ['关系', '友谊', '爱情', '合作'], level: 6 }
  ],
  
  // 高级级别 (3001-6000)
  advanced: [
    { word: 'sophisticated', meaning: '复杂的，精密的', options: ['复杂的', '简单的', '基础的', '初级的'], level: 7 },
    { word: 'contemporary', meaning: '当代的', options: ['当代的', '古代的', '现代的', '未来的'], level: 7 },
    { word: 'comprehensive', meaning: '全面的', options: ['全面的', '部分的', '完整的', '详细的'], level: 7 },
    { word: 'establishment', meaning: '建立，机构', options: ['建立', '破坏', '创造', '发明'], level: 8 },
    { word: 'fundamental', meaning: '基本的', options: ['基本的', '高级的', '重要的', '关键的'], level: 8 },
    { word: 'characteristic', meaning: '特征', options: ['特征', '特点', '性质', '属性'], level: 8 },
    { word: 'implementation', meaning: '实施', options: ['实施', '计划', '设计', '理论'], level: 9 },
    { word: 'specification', meaning: '规格说明', options: ['规格', '标准', '要求', '条件'], level: 9 },
    { word: 'administration', meaning: '管理', options: ['管理', '领导', '控制', '指导'], level: 9 },
    { word: 'consideration', meaning: '考虑', options: ['考虑', '思考', '判断', '决定'], level: 9 }
  ],
  
  // 专家级别 (6001+)
  expert: [
    { word: 'ubiquitous', meaning: '无处不在的', options: ['无处不在的', '稀少的', '常见的', '罕见的'], level: 10 },
    { word: 'ostentatious', meaning: '炫耀的', options: ['炫耀的', '谦逊的', '显眼的', '隐蔽的'], level: 10 },
    { word: 'perspicacious', meaning: '洞察力强的', options: ['洞察力强的', '愚钝的', '聪明的', '智慧的'], level: 10 },
    { word: 'surreptitious', meaning: '秘密的', options: ['秘密的', '公开的', '隐藏的', '明显的'], level: 11 },
    { word: 'ephemeral', meaning: '短暂的', options: ['短暂的', '永久的', '临时的', '持久的'], level: 11 },
    { word: 'magnanimous', meaning: '宽宏大量的', options: ['宽宏大量的', '小气的', '慷慨的', '吝啬的'], level: 11 },
    { word: 'vicissitude', meaning: '变迁', options: ['变迁', '稳定', '变化', '不变'], level: 12 },
    { word: 'recalcitrant', meaning: '顽抗的', options: ['顽抗的', '服从的', '反抗的', '合作的'], level: 12 },
    { word: 'perspicacity', meaning: '洞察力', options: ['洞察力', '愚昧', '智慧', '理解力'], level: 12 },
    { word: 'obsequious', meaning: '谄媚的', options: ['谄媚的', '诚实的', '奉承的', '直率的'], level: 12 }
  ]
};

// 获取指定数量的随机题目
function getRandomQuestions(count = 20) {
  const allWords = [
    ...wordDatabase.basic,
    ...wordDatabase.intermediate,
    ...wordDatabase.advanced,
    ...wordDatabase.expert
  ];
  
  // 验证数据完整性
  if (allWords.length === 0) {
    console.error('词汇数据库为空');
    return [];
  }
  
  // 确保选项唯一性的函数
  function ensureUniqueOptions(word) {
    const options = [...word.options];
    const uniqueOptions = [...new Set(options)];
    
    // 如果选项不唯一，重新生成
    if (uniqueOptions.length !== options.length) {
      console.warn(`单词 ${word.word} 的选项有重复，重新生成选项`);
      // 这里可以添加更多选项来确保唯一性
      const additionalOptions = ['其他', '未知', '不同', '相似'];
      const allOptions = [...uniqueOptions, ...additionalOptions];
      return shuffleArray(allOptions.slice(0, 4));
    }
    
    return shuffleArray(options);
  }
  
  // 改进的题目生成逻辑
  const questions = [];
  const usedWords = new Set();
  
  // 按难度级别分配题目数量
  const levelDistribution = {
    1: Math.ceil(count * 0.2), // 20% 基础题
    2: Math.ceil(count * 0.2), // 20% 初级题
    3: Math.ceil(count * 0.2), // 20% 中级题
    4: Math.ceil(count * 0.15), // 15% 中高级题
    5: Math.ceil(count * 0.15), // 15% 高级题
    6: Math.ceil(count * 0.1)   // 10% 专家题
  };
  
  // 按难度级别选择题目
  for (const [level, targetCount] of Object.entries(levelDistribution)) {
    const levelWords = allWords.filter(word => word.level === parseInt(level));
    const selectedWords = shuffleArray(levelWords).slice(0, targetCount);
    
    for (const word of selectedWords) {
      if (questions.length >= count) break;
      if (!usedWords.has(word.word)) {
        usedWords.add(word.word);
        questions.push({
          ...word,
          options: ensureUniqueOptions(word)
        });
      }
    }
  }
  
  // 如果题目不够，从剩余词汇中补充
  const remainingWords = allWords.filter(word => !usedWords.has(word.word));
  while (questions.length < count && remainingWords.length > 0) {
    const randomWord = remainingWords.splice(Math.floor(Math.random() * remainingWords.length), 1)[0];
    questions.push({
      ...randomWord,
      options: ensureUniqueOptions(randomWord)
    });
  }
  
  // 最终打乱题目顺序
  return shuffleArray(questions.slice(0, count));
}

// 打乱数组
function shuffleArray(array) {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

// 计算词汇量等级
function calculateVocabularyLevel(score, totalQuestions) {
  const percentage = (score / totalQuestions) * 100;
  
  if (percentage >= 95) return { level: '专家级', range: '12000+', description: '您的词汇量达到了专家水平！' };
  if (percentage >= 85) return { level: '高级', range: '8000-12000', description: '您拥有很强的英语词汇基础。' };
  if (percentage >= 75) return { level: '中高级', range: '6000-8000', description: '您的词汇量相当不错。' };
  if (percentage >= 65) return { level: '中级', range: '4000-6000', description: '您有良好的词汇基础。' };
  if (percentage >= 50) return { level: '初中级', range: '2000-4000', description: '您的词汇量正在发展中。' };
  if (percentage >= 35) return { level: '初级', range: '1000-2000', description: '建议继续学习基础词汇。' };
  return { level: '入门级', range: '500-1000', description: '建议从基础词汇开始学习。' };
}

module.exports = {
  getRandomQuestions,
  calculateVocabularyLevel,
  wordDatabase
};