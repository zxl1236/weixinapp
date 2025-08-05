// 词汇数据库
const wordDatabase = {
  primary: [
    { word: 'apple', meaning: '苹果', options: ['苹果', '香蕉', '橘子', '梨'], difficulty: 1, level: 'primary' },
    { word: 'book', meaning: '书', options: ['书', '笔', '尺子', '橡皮'], difficulty: 1, level: 'primary' },
    { word: 'cat', meaning: '猫', options: ['猫', '狗', '鸟', '鱼'], difficulty: 1, level: 'primary' },
    { word: 'dog', meaning: '狗', options: ['狗', '猫', '鸟', '鱼'], difficulty: 1, level: 'primary' }
  ],
  junior: [
    { word: 'beautiful', meaning: '美丽的', options: ['美丽的', '丑陋的', '高的', '矮的'], difficulty: 3, level: 'junior' },
    { word: 'important', meaning: '重要的', options: ['重要的', '次要的', '有趣的', '无聊的'], difficulty: 4, level: 'junior' }
  ],
  senior: [
    { word: 'language', meaning: '语言', options: ['语言', '数学', '科学', '历史'], difficulty: 5, level: 'senior' },
    { word: 'understand', meaning: '理解', options: ['理解', '忘记', '看见', '听见'], difficulty: 5, level: 'senior' }
  ],
  cet: [],
  ielts_toefl: []
};

// 重写的、健壮的题目生成函数
function getAdaptiveQuestions(count = 20) {
  const allWords = [
    ...(wordDatabase.primary || []),
    ...(wordDatabase.junior || []),
    ...(wordDatabase.senior || []),
    ...(wordDatabase.cet || []),
    ...(wordDatabase.ielts_toefl || [])
  ];

  if (allWords.length === 0) {
    console.error('词汇数据库为空，无法生成题目。');
    return [];
  }

  const questions = [];
  const usedIndices = new Set();

  for (let i = 0; i < count; i++) {
    if (usedIndices.size === allWords.length) {
      break; 
    }

    let randomIndex;
    do {
      randomIndex = Math.floor(Math.random() * allWords.length);
    } while (usedIndices.has(randomIndex));

    usedIndices.add(randomIndex);
    const word = allWords[randomIndex];

    // 确保options字段存在且是一个数组
    const options = Array.isArray(word.options) && word.options.length > 0 ? [...word.options] : generateSafeOptions(word);

    // 将正确答案添加到选项中（如果不存在）
    if (!options.includes(word.meaning)) {
      options[Math.floor(Math.random() * (options.length + 1))] = word.meaning;
    }
      
      questions.push({
      ...word,
      options: shuffleArray(options)
    });
  }
  
  return questions;
}

// 安全的选项生成器
function generateSafeOptions(word) {
    const dummies = ['选项A', '选项B', '选项C', '选项D'];
    const options = [word.meaning, ...dummies.slice(0, 3)];
    return shuffleArray(options);
}


// 打乱数组函数
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

// 占位函数，以防其他文件依赖
function getUserId() { return 'default_user'; }
function hashCode(s) { return s.split("").reduce(function(a,b){a=((a<<5)-a)+b.charCodeAt(0);return a&a},0); }
function getTestHistory() { return []; }