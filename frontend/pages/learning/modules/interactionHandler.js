// 用户交互处理模块

/**
 * 用户交互处理模块
 * @param {Object} page - 页面实例
 * @returns {Object} - 模块方法对象
 */
function createInteractionHandlerModule(page) {
  return {
    // 四选一选择答案
    selectChoice(e) {
      const answer = e.currentTarget.dataset.answer;
      const currentWord = page.data.currentWord;
      
      if (!currentWord) return;
      
      // 防抖检查
      if (!page.canPerformAction('selectChoice', 600)) {
        return;
      }
      
      // 只有第一阶段使用选择题
      const isCorrect = answer === currentWord.meaning;
      
      page.setData({
        selectedAnswer: answer,
        choiceCorrect: isCorrect
      });
      
      if (isCorrect) {
        // 记录学习进展
        page.recordLearningSync(
          page.data.currentWord.word, 
          'phase1', 
          true, 
          page.data.selectedAnswer, 
          page.data.currentWord.meaning
        );
        
        wx.showToast({ title: '回答正确！', icon: 'success' });
        setTimeout(() => {
          page.resetActionState(); // 先重置防抖状态
          page.completeCurrentPhase();
        }, 1200);
      } else {
        // 记录学习进展（错误）
        page.recordLearningSync(
          page.data.currentWord.word, 
          'phase1', 
          false, 
          page.data.selectedAnswer, 
          page.data.currentWord.meaning
        );
        
        wx.showToast({ title: '答案不正确，请重试', icon: 'error' });
        setTimeout(() => {
          page.setData({ selectedAnswer: '' });
          page.resetActionState();
        }, 1500);
      }
    },
    
    // 播放发音 - 快速响应版本
    playPronunciation() {
      const currentWord = page.data.currentWord;
      if (!currentWord) return;
      
      const AudioManager = require('../../../utils/audioManager');
      const wordId = currentWord.id || currentWord.wordId || currentWord.word;
      const word = currentWord.word;
      const gradeId = page.data.gradeId;
      
      // 立即播放，不等待异步操作
      AudioManager.playWord(wordId, {
        gradeId: gradeId,
        word: word
      });
    },
    
    // 处理填空输入
    onInput(e) {
      page.setData({ userInput: e.detail.value });
    },
    
    // 显示提示
    toggleHint() {
      page.setData({ showHint: !page.data.showHint });
    },
    
    // 获取当前阶段已完成的单词数量
    getCompletedWordsInCurrentPhase() {
      const currentPhase = page.data.currentPhase;
      let completedCount = 0;
      
      page.data.currentGroupWords.forEach(word => {
        const wordId = word.id || word.word;
        const status = page.data.wordPhaseStatus[wordId] || {};
        if (status[`phase${currentPhase}`]) {
          completedCount++;
        }
      });
      
      return completedCount;
    },
    
    // 跳过当前单词（仅跳过当前阶段）
    skipWord() {
      wx.showModal({
        title: '跳过确认',
        content: '确定要跳过当前阶段吗？',
        success: (res) => {
          if (res.confirm) {
            page.completeCurrentPhase();
          }
        }
      });
    }
  };
}

module.exports = createInteractionHandlerModule;

