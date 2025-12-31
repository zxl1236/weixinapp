// 数据同步功能模块
const learningDataSync = require('../../../utils/learningDataSync.js');

/**
 * 数据同步功能模块
 * @param {Object} page - 页面实例
 * @returns {Object} - 模块方法对象
 */
function createDataSyncModule(page) {
  return {
    // 📊 获取同步状态摘要
    getSyncStatusSummary() {
      try {
        const { currentGroupWords } = page.data;
        if (!currentGroupWords || currentGroupWords.length === 0) {
          return { mistakeCount: 0, sessionCount: 0, masteredCount: 0 };
        }

        // 统计生词本中的学习记录
        const mistakeBook = wx.getStorageSync('mistakeBook') || {};
        const mistakeCount = currentGroupWords.filter(word => 
          mistakeBook[word.word] && !mistakeBook[word.word].mastered
        ).length;

        // 从同步系统获取学习记录
        const sessionHistory = learningDataSync.getLearningSessionHistory();
        const sessionCount = sessionHistory.filter(session => 
          currentGroupWords.some(word => word.word === session.word)
        ).length;

        // 统计掌握的单词数量
        const wordMasteryMap = learningDataSync.getWordMasteryMap();
        const masteredCount = currentGroupWords.filter(word => {
          const mastery = wordMasteryMap[word.word];
          return mastery && (mastery.masteryLevel === 'mastered' || mastery.masteryLevel === 'expert');
        }).length;

        return { mistakeCount, sessionCount, masteredCount };
      } catch (error) {
        console.error('获取同步状态失败:', error);
        return { mistakeCount: 0, sessionCount: 0, masteredCount: 0 };
      }
    },

    // 返回上一个界面
    showMenuOptions() {
      try {
        wx.navigateBack();
      } catch (error) {
        console.error('返回失败:', error);
      }
    },

    showSyncStatusDetails() {
      try {
        const { currentGroupWords, gradeId, gradeName } = page.data;
        
        wx.showActionSheet({
          itemList: [
            '📖 查看生词本',
            '📅 查看学习日历', 
            '📊 查看学习进度',
            '🔄 返回训练页面'
          ],
          success: (res) => {
            switch (res.tapIndex) {
              case 0: // 查看生词本
                wx.navigateTo({
                  url: `/pages/mistake/mistake?from=learning&grade=${gradeId}&gradeName=${encodeURIComponent(gradeName)}`
                });
                break;
              case 1: // 查看学习日历
                wx.navigateTo({
                  url: `/pages/calendar/calendar?from=learning&grade=${gradeId}&gradeName=${encodeURIComponent(gradeName)}`
                });
                break;
              case 2: // 查看学习进度
                page.showProgressDetails();
                break;
              case 3: // 返回训练页面
                wx.navigateBack();
                break;
            }
          }
        });
      } catch (error) {
        console.error('显示同步状态详情失败:', error);
        wx.showToast({
          title: '获取状态失败',
          icon: 'error'
        });
      }
    },

    // 📈 显示学习进度详情
    showProgressDetails() {
      try {
        const { currentGroupWords, gradeId } = page.data;
        const wordMasteryMap = learningDataSync.getWordMasteryMap();
        const gradeProgress = learningDataSync.getGradeLearningProgress(gradeId);
        
        // 统计当前组单词的掌握情况
        const groupStats = {
          new: 0,
          learning: 0, 
          familiar: 0,
          mastered: 0,
          expert: 0
        };

        currentGroupWords.forEach(word => {
          const mastery = wordMasteryMap[word.word];
          if (mastery) {
            groupStats[mastery.masteryLevel] = (groupStats[mastery.masteryLevel] || 0) + 1;
          } else {
            groupStats.new++;
          }
        });

        const content = `📊 当前组掌握情况：\n` +
          `🆕 新学：${groupStats.new}个\n` +
          `📖 学习中：${groupStats.learning}个\n` +
          `👍 熟悉：${groupStats.familiar}个\n` +
          `✅ 掌握：${groupStats.mastered}个\n` +
          `🏆 精通：${groupStats.expert}个\n\n` +
          `🎯 年级总进度：\n` +
          `总词汇：${gradeProgress.total}个\n` +
          `已掌握：${gradeProgress.mastered + gradeProgress.expert}个\n` +
          `需复习：${gradeProgress.needReview}个`;

        wx.showModal({
          title: '学习进度详情',
          content: content,
          showCancel: false,
          confirmText: '继续',
          success: () => {
            // 用户选择继续学习，检查是否有下一组
            if (page.data.currentGroup < page.data.totalGroups) {
              page.startNextGroup();
            } else {
              wx.navigateBack();
            }
          }
        });
      } catch (error) {
        console.error('显示进度详情失败:', error);
        wx.showToast({
          title: '获取进度失败',
          icon: 'error'
        });
      }
    },
    
    // 🎯 记录学习进展到统一数据源
    recordLearningSync(word, phaseType, success, userAnswer = '', correctAnswer = '') {
      // 兜底：把传入的 word 统一规范为字符串 id
      const wordId = (word && typeof word === 'object')
        ? (word.id || word.word || '')
        : (word || '');
      if (!wordId || !phaseType) return;
      
      try {
        // 计算会话时长
        const duration = Date.now() - (page.data.sessionStartTime || Date.now());
        
        // 增加尝试次数
        page.setData({ phaseAttempts: page.data.phaseAttempts + 1 });
        
        // 记录到同步系统
        const result = learningDataSync.recordWordProgress(
          {
            word: wordId,
            gradeId: page.data.gradeId,
            gradeName: page.data.gradeName
          },
          phaseType,
          success,
          {
            userAnswer,
            correctAnswer,
            questionType: phaseType,
            duration,
            attempts: page.data.phaseAttempts,
            extra: {
              sessionId: `session_${page.data.sessionStartTime}`,
              currentGroup: page.data.currentGroup
            }
          }
        );
        
        if (result.success) {
          if (result.isNewLearning) {
            page.showNewLearningTip(phaseType);
          }
        }
        
        // 保持现有的记录方法（向后兼容）
        if (!success) {
          page.recordWord(word, userAnswer, correctAnswer, phaseType);
        }
        
        page.recordLearningProgress(word, success ? 3 : 0, phaseType);
        
        // 如果成功，重置尝试次数
        if (success) {
          page.setData({ phaseAttempts: 0 });
        }
        
      } catch (error) {
        console.error('记录学习进展失败:', error);
      }
    },
    
    // 💡 显示新学提示
    showNewLearningTip(phaseType) {
      const phaseNames = {
        phase1: '四选一'
      };
      
      wx.showToast({
        title: `🎉 ${phaseNames[phaseType]}学会了!`,
        icon: 'success',
        duration: 1500
      });
    }
  };
}

module.exports = createDataSyncModule;

