// modules/audioManager.js
// 音频管理模块（占位实现）
// 后续可将 learning.js 中与音频播放、TTS、预加载、缓存等相关的方法迁移到此模块

function createAudioManagerModule(page) {
  // 目前先返回空对象，保持行为不变
  // 后续迁移函数时，可在这里挂载：
  // return {
  //   buildTTSUrl: page.buildTTSUrl.bind(page),
  //   playLocal: page.playLocal.bind(page),
  //   playPronunciation: page.playPronunciation.bind(page),
  //   playCurrentWordPronunciation: page.playCurrentWordPronunciation.bind(page),
  //   playWordWithTTS: page.playWordWithTTS.bind(page),
  //   preloadAudioForCurrentSession: page.preloadAudioForCurrentSession.bind(page),
  //   prefetchWords: page.prefetchWords.bind(page),
  //   ...
  // };
  return {};
}

module.exports = createAudioManagerModule;



