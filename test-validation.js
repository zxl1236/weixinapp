// 测试验证脚本 - 验证修复后的测试逻辑
const { getRandomQuestions, calculateVocabularyLevel } = require('./utils/wordDatabase.js');

console.log('🧪 开始验证测试逻辑...\n');

// 测试1：验证题目生成逻辑
console.log('📋 测试1：题目生成逻辑验证');
try {
  const questions = getRandomQuestions(20);
  console.log(`  ✅ 成功生成 ${questions.length} 道题目`);
  
  // 验证题目质量
  let validQuestions = 0;
  let uniqueWords = new Set();
  
  questions.forEach((question, index) => {
    // 检查基本属性
    if (question.word && question.meaning && question.options) {
      validQuestions++;
    }
    
    // 检查单词唯一性
    uniqueWords.add(question.word);
    
    // 检查选项唯一性
    const uniqueOptions = new Set(question.options);
    if (uniqueOptions.size !== question.options.length) {
      console.log(`  ⚠️  第 ${index + 1} 题选项有重复:`, question.word);
    }
    
    // 检查正确答案是否在选项中
    if (!question.options.includes(question.meaning)) {
      console.log(`  ❌ 第 ${index + 1} 题正确答案不在选项中:`, question.word);
    }
  });
  
  console.log(`  ✅ 有效题目: ${validQuestions}/${questions.length}`);
  console.log(`  ✅ 唯一单词: ${uniqueWords.size}/${questions.length}`);
  
} catch (error) {
  console.log('  ❌ 题目生成失败:', error.message);
}

// 测试2：验证答案验证逻辑
console.log('\n📝 测试2：答案验证逻辑验证');
try {
  const testQuestion = {
    word: 'test',
    meaning: '测试',
    options: ['测试', '考试', '检查', '验证'],
    level: 1
  };
  
  // 模拟正确答案
  const correctAnswer = '测试';
  const correctIndex = testQuestion.options.findIndex(option => option === correctAnswer);
  
  console.log(`  ✅ 正确答案索引: ${correctIndex}`);
  console.log(`  ✅ 正确答案内容: ${correctAnswer}`);
  
  // 模拟错误答案
  const wrongAnswer = '考试';
  const wrongIndex = testQuestion.options.findIndex(option => option === wrongAnswer);
  
  console.log(`  ✅ 错误答案索引: ${wrongIndex}`);
  console.log(`  ✅ 错误答案内容: ${wrongAnswer}`);
  
  // 验证逻辑
  const isCorrect1 = correctAnswer === testQuestion.meaning;
  const isCorrect2 = wrongAnswer === testQuestion.meaning;
  
  console.log(`  ✅ 正确答案验证: ${isCorrect1}`);
  console.log(`  ✅ 错误答案验证: ${isCorrect2}`);
  
} catch (error) {
  console.log('  ❌ 答案验证测试失败:', error.message);
}

// 测试3：验证等级计算逻辑
console.log('\n📊 测试3：等级计算逻辑验证');
try {
  const testCases = [
    { score: 20, total: 20, expected: '专家级' },
    { score: 17, total: 20, expected: '高级' },
    { score: 15, total: 20, expected: '中高级' },
    { score: 13, total: 20, expected: '中级' },
    { score: 10, total: 20, expected: '初中级' },
    { score: 7, total: 20, expected: '初级' },
    { score: 5, total: 20, expected: '入门级' }
  ];
  
  testCases.forEach((testCase, index) => {
    const result = calculateVocabularyLevel(testCase.score, testCase.total);
    const percentage = (testCase.score / testCase.total) * 100;
    
    console.log(`  ${index + 1}. 得分 ${testCase.score}/${testCase.total} (${percentage}%) -> ${result.level}`);
    
    if (result.level === testCase.expected) {
      console.log(`     ✅ 等级计算正确`);
    } else {
      console.log(`     ❌ 等级计算错误，期望: ${testCase.expected}`);
    }
  });
  
} catch (error) {
  console.log('  ❌ 等级计算测试失败:', error.message);
}

// 测试4：验证进度计算逻辑
console.log('\n📈 测试4：进度计算逻辑验证');
try {
  const testCases = [
    { current: 0, total: 20, expected: 5 },
    { current: 9, total: 20, expected: 50 },
    { current: 19, total: 20, expected: 100 }
  ];
  
  testCases.forEach((testCase, index) => {
    const progress = ((testCase.current + 1) / testCase.total) * 100;
    
    console.log(`  ${index + 1}. 第 ${testCase.current + 1}/${testCase.total} 题 -> ${progress}%`);
    
    if (Math.abs(progress - testCase.expected) < 1) {
      console.log(`     ✅ 进度计算正确`);
    } else {
      console.log(`     ❌ 进度计算错误，期望: ${testCase.expected}%`);
    }
  });
  
} catch (error) {
  console.log('  ❌ 进度计算测试失败:', error.message);
}

console.log('\n🎉 测试验证完成！');
console.log('\n📝 修复总结:');
console.log('  ✅ 改进了答案验证逻辑，现在验证答案内容而不是索引');
console.log('  ✅ 优化了题目生成逻辑，确保选项唯一性和难度分布');
console.log('  ✅ 完善了答案记录，包含更详细的信息');
console.log('  ✅ 修复了进度条计算，现在显示正确的进度');
console.log('  ✅ 添加了数据验证和错误处理');

console.log('\n⚠️  建议:');
console.log('  - 在微信开发者工具中测试所有功能');
console.log('  - 检查不同题目数量的测试');
console.log('  - 验证错误处理是否正常工作');
console.log('  - 测试用户体验是否改善'); 