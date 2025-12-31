// 兼容性方法模块

/**
 * 兼容性方法模块
 * @param {Object} page - 页面实例
 * @returns {Object} - 模块方法对象
 */
function createCompatibilityHandlerModule(page) {
  return {
    confirmCompletion() {
      page.completeCurrentPhase();
    },
    
    goBack() {
      wx.showModal({
        title: '确认退出',
        content: '退出将保存当前学习进度，确定要退出吗？',
        success: (res) => {
          if (res.confirm) {
            page.saveGroupLearningProgress();
            wx.navigateBack();
          }
        }
      });
    },
    
    // 播放当前单词读音（认识阶段使用）- 快速响应版本
    playCurrentWordPronunciation() {
      if (!page.data.currentWord || !page.data.currentWord.word) {
        wx.showToast({
          title: '没有可播放的单词',
          icon: 'none'
        });
        return;
      }
      
      const AudioManager = require('../../../utils/audioManager');
      const wordId = page.data.currentWord.id || page.data.currentWord.wordId || page.data.currentWord.word;
      const word = page.data.currentWord.word;
      const gradeId = page.data.gradeId;
      
      // 立即播放，不等待异步操作
      AudioManager.playWord(wordId, {
        gradeId: gradeId,
        word: word
      });
    }
  };
}

module.exports = createCompatibilityHandlerModule;

