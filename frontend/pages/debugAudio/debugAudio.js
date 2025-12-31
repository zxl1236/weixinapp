const audioManager = require('../../utils/audioManager');
const {
  gradeStructure,
  getGradeWords,
  isGradeEnabled
} = require('../../utils/gradeWordDatabase');

function getAllEnabledGradeIds() {
  const ids = [];
  Object.keys(gradeStructure).forEach(stageKey => {
    const stage = gradeStructure[stageKey];
    Object.keys(stage).forEach(gradeId => {
      if (stage[gradeId] && stage[gradeId].enabled !== false) {
        ids.push(gradeId);
      }
    });
  });
  return ids;
}

Page({
  data: {
    gradeOptions: [],
    selectedGradeIds: [],
    total: 0,
    currentIndex: 0,
    currentTask: {},
    failures: []
  },

  onLoad() {
    this.tasks = [];
    this.isRunning = false;

    audioManager.setCallbacks({
      onEnded: () => {
        if (this.isRunning) this.next();
      },
      onError: (err) => {
        if (!this.isRunning) return;
        const idx = this.data.currentIndex - 1;
        const t = this.tasks[idx];
        const reason = (err && (err.errMsg || err.message)) || String(err || '未知错误');
        const failures = this.data.failures.concat([{ ...t, reason }]);
        this.setData({ failures });
        this.next();
      }
    });

    this.initGrades();
  },

  initGrades() {
    const allIds = getAllEnabledGradeIds();
    const opts = allIds.map(id => {
      const info = Object.keys(gradeStructure).reduce((acc, stageKey) => {
        if (gradeStructure[stageKey][id]) {
          return gradeStructure[stageKey][id];
        }
        return acc;
      }, null);
      return {
        gradeId: id,
        label: `${id}（${info && info.description ? info.description : '无描述'}）`,
        checked: true
      };
    });
    this.setData({
      gradeOptions: opts,
      selectedGradeIds: allIds
    });
    this.buildTasks(allIds);
  },

  async buildTasks(gradeIdsFromUI) {
    const gradeIds = Array.isArray(gradeIdsFromUI) && gradeIdsFromUI.length
      ? gradeIdsFromUI
      : getAllEnabledGradeIds();
    const tasks = [];

    for (const gradeId of gradeIds) {
      if (!isGradeEnabled(gradeId)) continue;
      try {
        const words = await getGradeWords(gradeId, 99999, 'all');
        if (!Array.isArray(words) || !words.length) continue;

        words.forEach((w, idx) => {
          const wordText = typeof w === 'string' ? w : (w.word || w.text || '');
          if (!wordText) return;
          const wordId = w.id || w.wordId || `${gradeId}_${idx}_${wordText}`;
          tasks.push({
            gradeId,
            wordId,
            word: wordText
          });
        });
      } catch (e) {
        console.warn('[DebugAudio] 加载年级词汇失败:', gradeId, e);
      }
    }

    console.log('[DebugAudio] 任务已构建，数量:', tasks.length);
    this.tasks = tasks;
    this.setData({
      selectedGradeIds: gradeIds,
      total: tasks.length,
      currentIndex: 0,
      currentTask: {},
      failures: []
    });
  },

  onGradeChange(e) {
    const values = e.detail.value || [];
    this.setData({
      selectedGradeIds: values
    });
    // 勾选年级后自动重新构建任务列表
    if (values.length > 0) {
      this.buildTasks(values);
    } else {
      this.setData({
        total: 0,
        currentIndex: 0,
        currentTask: {},
        failures: []
      });
      this.tasks = [];
    }
  },

  rebuildWithSelectedGrades() {
    if (!this.data.selectedGradeIds.length) {
      wx.showToast({ title: '请先勾选至少一个年级', icon: 'none' });
      return;
    }
    this.isRunning = false;
    this.buildTasks(this.data.selectedGradeIds);
  },

  start() {
    if (!this.tasks || !this.tasks.length) {
      wx.showToast({ title: '任务列表为空', icon: 'none' });
      return;
    }
    this.isRunning = true;
    this.setData({ currentIndex: 0, failures: [] });
    this.playAt(0);
  },

  stopAll() {
    this.isRunning = false;
    try {
      audioManager.stop();
    } catch (e) {}
    wx.showToast({ title: '已停止', icon: 'none' });
  },

  playAt(i) {
    if (!this.isRunning) return;
    if (i >= this.tasks.length) {
      this.isRunning = false;
      wx.showToast({ title: '测试完成', icon: 'success' });
      console.log('[DebugAudio] 全部播放完成，失败列表:', this.data.failures);
      this.setData({
        currentIndex: this.tasks.length,
        currentTask: {}
      });
      return;
    }

    const t = this.tasks[i];
    this.setData({
      currentIndex: i + 1,
      currentTask: t
    });

    try {
      audioManager.playWord(t.wordId, {
        gradeId: t.gradeId,
        word: t.word,
        forceRemote: false
      });
    } catch (e) {
      const reason = (e && (e.errMsg || e.message)) || String(e || '未知错误');
      const failures = this.data.failures.concat([{ ...t, reason }]);
      this.setData({ failures });
      this.next();
    }
  },

  next() {
    const nextIndex = this.data.currentIndex;
    this.playAt(nextIndex);
  },

  clearFailures() {
    this.setData({ failures: [] });
    wx.showToast({ title: '已清空失败列表', icon: 'none' });
  },

  exportFailures() {
    console.log('[DebugAudio] 失败列表(JSON):', JSON.stringify(this.data.failures, null, 2));
    wx.showToast({ title: '已输出到控制台', icon: 'none' });
  },

  onUnload() {
    this.isRunning = false;
    try {
      audioManager.stop();
      if (audioManager.destroy) audioManager.destroy();
    } catch (e) {}
  }
});


