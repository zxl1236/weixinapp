/**
 * 🧪 数据同步测试工具
 * 用于验证四阶段学习数据同步功能
 */

const { learningDataSync } = require('./learningDataSync.js');

/**
 * 数据同步测试类
 */
class SyncTestSuite {
  constructor() {
    this.testResults = [];
  }

  /**
   * 运行所有测试
   */
  async runAllTests() {
    console.log('🧪 开始数据同步测试...');
    
    try {
      // 清理测试数据
      this.clearTestData();
      
      // 基础功能测试
      await this.testBasicSync();
      
      // 四阶段学习测试
      await this.testFourPhases();
      
      // 数据一致性测试
      await this.testDataConsistency();
      
      // 统计功能测试
      await this.testStatistics();
      
      // 复习功能测试
      await this.testReviewSystem();
      
      console.log('🎉 所有测试完成');
      this.printResults();
      
      return this.testResults;
      
    } catch (error) {
      console.error('❌ 测试过程出错:', error);
      return this.testResults;
    }
  }

  /**
   * 清理测试数据
   */
  clearTestData() {
    console.log('🧹 清理测试数据...');
    
    const keys = [
      'word_mastery_map',
      'learning_sessions',
      'daily_learning_stats'
    ];
    
    keys.forEach(key => {
      wx.setStorageSync(key, {});
    });
  }

  /**
   * 测试基础同步功能
   */
  async testBasicSync() {
    console.log('📝 测试基础同步功能...');
    
    const testWord = {
      word: 'test',
      gradeId: 'grade3',
      gradeName: '三年级'
    };
    
    // 测试记录学习进展
    const result = learningDataSync.recordWordProgress(
      testWord,
      'phase1',
      true,
      {
        userAnswer: 'test_answer',
        correctAnswer: 'correct_answer',
        questionType: 'phase1',
        duration: 5000
      }
    );
    
    this.assert(result.success, '基础同步功能', '应该成功记录学习进展');
    this.assert(result.isNewLearning, '新学检测', '首次学习应该标记为新学');
    
    // 验证数据存储
    const masteryMap = learningDataSync.getWordMasteryMap();
    this.assert(masteryMap['test'], '数据存储', '单词数据应该被正确存储');
    this.assert(masteryMap['test'].phases.phase1.completed, '阶段完成', 'phase1应该标记为已完成');
  }

  /**
   * 测试四阶段学习
   */
  async testFourPhases() {
    console.log('🎯 测试四阶段学习...');
    
    const testWord = {
      word: 'hello',
      gradeId: 'grade3',
      gradeName: '三年级'
    };
    
    const phases = ['phase1', 'phase2', 'phase3', 'phase4'];
    
    // 依次完成四个阶段
    for (let i = 0; i < phases.length; i++) {
      const phase = phases[i];
      const result = learningDataSync.recordWordProgress(
        testWord,
        phase,
        true,
        {
          userAnswer: 'hello',
          correctAnswer: 'hello',
          questionType: phase,
          duration: 3000
        }
      );
      
      this.assert(result.success, `${phase}记录`, `${phase}应该成功记录`);
      
      // 检查是否为新学（除了第一阶段，其他阶段都应该是新学）
      if (i > 0) {
        this.assert(result.isNewLearning, `${phase}新学`, `${phase}应该标记为新学`);
      }
    }
    
    // 验证四阶段全部完成
    const masteryMap = learningDataSync.getWordMasteryMap();
    const wordData = masteryMap['hello'];
    
    phases.forEach(phase => {
      this.assert(
        wordData.phases[phase].completed, 
        `${phase}完成状态`, 
        `${phase}应该标记为已完成`
      );
    });
    
    // 验证单词是否完全学会
    const fullyLearned = learningDataSync.isWordFullyLearned(wordData);
    this.assert(fullyLearned, '四阶段完成', '单词应该标记为完全学会');
    
    // 验证掌握度计算
    this.assert(
      wordData.masteryScore > 0.8, 
      '掌握度计算', 
      '四阶段全部完成后掌握度应该很高'
    );
  }

  /**
   * 测试数据一致性
   */
  async testDataConsistency() {
    console.log('🔄 测试数据一致性...');
    
    const testWord = {
      word: 'world',
      gradeId: 'grade4',
      gradeName: '四年级'
    };
    
    // 记录一次错误
    learningDataSync.recordWordProgress(
      testWord,
      'phase1',
      false,
      {
        userAnswer: 'wrong_answer',
        correctAnswer: 'world',
        questionType: 'phase1'
      }
    );
    
    // 检查错题本是否同步
    const mistakeBook = wx.getStorageSync('mistakeBook') || {};
    this.assert(mistakeBook['world'], '错题本同步', '错误应该同步到错题本');
    
    // 检查日历数据是否同步
    const today = new Date().toISOString().split('T')[0];
    const calendarData = wx.getStorageSync('dailyStudyStats') || {};
    this.assert(calendarData[today], '日历数据同步', '应该有今日学习数据');
    this.assert(calendarData[today].mistakes > 0, '错误统计', '错误次数应该大于0');
    
    // 检查全局进度是否同步
    const globalProgress = wx.getStorageSync('globalLearningProgress') || {};
    this.assert(globalProgress['world'], '全局进度同步', '应该有单词的全局进度数据');
  }

  /**
   * 测试统计功能
   */
  async testStatistics() {
    console.log('📊 测试统计功能...');
    
    // 测试年级进度统计
    const gradeProgress = learningDataSync.getGradeLearningProgress('grade3');
    
    this.assert(typeof gradeProgress === 'object', '年级进度类型', '应该返回对象');
    this.assert(typeof gradeProgress.total === 'number', '总数统计', '总数应该是数字');
    this.assert(typeof gradeProgress.phases === 'object', '阶段统计', '阶段统计应该是对象');
    
    // 测试日常统计
    const dailyStats = learningDataSync.getDailyLearningStats();
    this.assert(typeof dailyStats === 'object', '日常统计类型', '应该返回对象');
    
    // 测试学习会话历史
    const sessions = learningDataSync.getLearningSessionHistory();
    this.assert(Array.isArray(sessions), '会话历史类型', '应该返回数组');
  }

  /**
   * 测试复习系统
   */
  async testReviewSystem() {
    console.log('📅 测试复习系统...');
    
    const testWord = {
      word: 'review_test',
      gradeId: 'grade3',
      gradeName: '三年级'
    };
    
    // 记录学习进展
    learningDataSync.recordWordProgress(
      testWord,
      'phase1',
      true,
      {
        userAnswer: 'review_test',
        correctAnswer: 'review_test',
        questionType: 'phase1'
      }
    );
    
    // 获取单词数据
    const wordStats = learningDataSync.getWordStats('review_test');
    
    this.assert(wordStats, '单词统计', '应该能获取单词统计数据');
    this.assert(wordStats.nextReview, '复习时间', '应该设置下次复习时间');
    this.assert(typeof wordStats.reviewInterval === 'number', '复习间隔', '复习间隔应该是数字');
    
    // 测试获取需要复习的单词
    const reviewWords = learningDataSync.getWordsForReview('grade3', 10);
    this.assert(Array.isArray(reviewWords), '复习单词列表', '应该返回数组');
  }

  /**
   * 断言工具
   */
  assert(condition, testName, message) {
    const result = {
      name: testName,
      message: message,
      passed: !!condition,
      timestamp: Date.now()
    };
    
    this.testResults.push(result);
    
    if (result.passed) {
      console.log(`✅ ${testName}: ${message}`);
    } else {
      console.log(`❌ ${testName}: ${message}`);
    }
  }

  /**
   * 打印测试结果
   */
  printResults() {
    const total = this.testResults.length;
    const passed = this.testResults.filter(r => r.passed).length;
    const failed = total - passed;
    
    console.log('\n📋 测试结果总结:');
    console.log(`总测试数: ${total}`);
    console.log(`通过: ${passed} ✅`);
    console.log(`失败: ${failed} ❌`);
    console.log(`成功率: ${Math.round((passed / total) * 100)}%`);
    
    if (failed > 0) {
      console.log('\n❌ 失败的测试:');
      this.testResults
        .filter(r => !r.passed)
        .forEach(r => console.log(`  - ${r.name}: ${r.message}`));
    }
  }

  /**
   * 导出测试报告
   */
  exportReport() {
    const report = {
      timestamp: Date.now(),
      date: new Date().toISOString(),
      summary: {
        total: this.testResults.length,
        passed: this.testResults.filter(r => r.passed).length,
        failed: this.testResults.filter(r => !r.passed).length,
        successRate: Math.round((this.testResults.filter(r => r.passed).length / this.testResults.length) * 100)
      },
      details: this.testResults
    };
    
    return report;
  }
}

/**
 * 快速测试方法
 */
const runQuickTest = async () => {
  const testSuite = new SyncTestSuite();
  const results = await testSuite.runAllTests();
  return testSuite.exportReport();
};

module.exports = {
  SyncTestSuite,
  runQuickTest
};
