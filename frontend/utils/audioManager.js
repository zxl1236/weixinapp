// utils/audioManager.js
// 重构版：快速响应、低延迟的音频播放系统

const { AUDIO_CDN_BASE } = require('./config');
const { buildAudioUrl, buildAudioUrlAsync } = require('./audioUrl');
const { buildBaiduTTSUrl } = require('./baiduTTS');

// ==================== 配置 ====================
const ENABLE_CDN_AUDIO = false; // ✅ 临时关闭腾讯云音频
const USE_BAIDU_TTS = true;     // ✅ TTS 优先百度（后端 /api/tts）
const BAIDU_TTS_TIMEOUT_MS = 600; // 百度TTS等待时间，超时回退有道
const MAX_CONCURRENT_DOWNLOADS = 3; // 最大并发下载数
const PLAY_DEBOUNCE_MS = 300; // 防抖间隔（毫秒）
const TTS_BASE_URL = 'https://dict.youdao.com/dictvoice?audio='; // 有道TTS服务地址（备用）

// ==================== 缓存管理 ====================
// wordId -> { url, localPath, status, lastAccess, ttsUrl }
const cache = new Map();

// 下载队列
let downloadQueue = [];
let activeDownloads = 0;

// ==================== 播放器管理 ====================
let audioCtx = null;
let lastPlayTime = 0;
let currentPlayingWordId = null;
let currentPlayingWord = null; // 当前播放的单词文本，用于错误回退

// 全局回调
let callbacks = {
  onPlay: null,
  onEnded: null,
  onStop: null,
  onError: null,
};

// ==================== 工具函数 ====================

/**
 * 确保音频上下文存在
 */
function ensureAudioCtx() {
  if (audioCtx) return audioCtx;

  const ctx = wx.createInnerAudioContext();
  ctx.autoplay = false;
  ctx.obeyMuteSwitch = true;

  // 绑定事件
  ctx.onPlay(() => {
    callbacks.onPlay && callbacks.onPlay();
  });

  ctx.onEnded(() => {
    callbacks.onEnded && callbacks.onEnded();
    currentPlayingWordId = null;
    currentPlayingWord = null;
  });

  ctx.onStop(() => {
    callbacks.onStop && callbacks.onStop();
    currentPlayingWordId = null;
    currentPlayingWord = null;
  });

  ctx.onError((err) => {
    console.warn('[AudioManager] 播放错误:', err);
    
    // 检查是否是解码错误，如果是且不是TTS URL，尝试回退到TTS
    if (isDecodeError(err) && currentPlayingWordId && currentPlayingWord) {
      const record = cache.get(currentPlayingWordId);
      const currentSrc = ctx.src || '';
      // 如果当前不是TTS URL，才回退
      if (!currentSrc.includes('dictvoice') && !currentSrc.includes('baidu.com')) {
        console.log('[AudioManager] 检测到解码错误，自动回退到TTS');
        handleAudioDecodeError(currentPlayingWordId, { word: currentPlayingWord });
        return; // 不调用用户回调，因为已经自动处理
      }
    }
    
    callbacks.onError && callbacks.onError(err);
    currentPlayingWordId = null;
    currentPlayingWord = null;
  });

  audioCtx = ctx;
  return audioCtx;
}

/**
 * 构建TTS URL（优先百度，回退有道）
 * 现在通过后端API获取百度TTS URL
 */
async function buildTTSUrl(word) {
  if (!word) return null;
  
  // 优先使用百度TTS（通过后端API）
  if (USE_BAIDU_TTS) {
    try {
      const baiduUrl = await buildBaiduTTSUrl(word);
      if (baiduUrl) {
        return baiduUrl;
      }
    } catch (error) {
      console.warn('[AudioManager] 百度TTS失败，回退有道:', error);
    }
  }
  
  // 回退到有道TTS
  return `${TTS_BASE_URL}${encodeURIComponent(word)}&type=1`;
}

/**
 * 构建TTS URL（同步版本，用于快速回退）
 * 注意：由于现在需要通过后端API，此方法无法同步获取百度TTS
 * 返回有道TTS作为快速回退方案
 */
function buildTTSUrlSync(word) {
  if (!word) return null;
  
  // 由于百度TTS现在需要通过后端API（异步），同步版本直接返回有道TTS
  // 这样可以保证快速响应，异步版本会尝试获取百度TTS
  return `${TTS_BASE_URL}${encodeURIComponent(word)}&type=1`;
}

/**
 * 构建音频URL（同步，快速）
 * 用于预加载和快速回退
 */
function buildAudioUrlSync(gradeId, word) {
  if (!gradeId || !word) return null;
  try {
    return buildAudioUrl(gradeId, word);
  } catch (error) {
    console.warn('[AudioManager] 构建URL失败:', error);
    return null;
  }
}

// ==================== 下载管理 ====================

/**
 * 将单词加入下载队列
 */
function enqueueDownload(wordId) {
  if (!downloadQueue.includes(wordId)) {
    downloadQueue.push(wordId);
  }
  pumpQueue();
}

/**
 * 下载调度器
 */
function pumpQueue() {
  if (activeDownloads >= MAX_CONCURRENT_DOWNLOADS) return;
  if (downloadQueue.length === 0) return;

  const wordId = downloadQueue.shift();
  const record = cache.get(wordId);

  if (!record || record.status === 'ready' || record.status === 'downloading') {
    return pumpQueue();
  }

  activeDownloads++;
  record.status = 'downloading';

  wx.downloadFile({
    url: record.url,
    success(res) {
      // 下载结果校验：检查 statusCode + Content-Type + tempFilePath 后缀
      const contentType = (res.header && (res.header['Content-Type'] || res.header['content-type'])) || '';
      const hasType = !!contentType;
      const isAudioType = /audio\/|mpeg|mp3|wav|octet-stream/i.test(contentType);
      const isXmlPath = (res.tempFilePath || '').toLowerCase().includes('.xml');

      // 有 content-type 就校验；没有就放行（避免误判）
      if (res.statusCode === 200 && res.tempFilePath && !isXmlPath && (!hasType || isAudioType)) {
        record.localPath = res.tempFilePath;
        record.status = 'ready';
      } else {
        console.warn('[AudioManager] 预下载疑似非音频，丢弃', {
          statusCode: res.statusCode,
          contentType,
          tempFilePath: res.tempFilePath
        });
        record.localPath = '';
        record.status = 'error';
      }
    },
    fail(err) {
      console.warn('[AudioManager] 下载失败:', wordId, err);
      record.status = 'error';
    },
    complete() {
      activeDownloads--;
      pumpQueue();
    }
  });
}

// ==================== 核心API ====================

/**
 * 设置回调函数
 */
function setCallbacks(customCallbacks = {}) {
  Object.assign(callbacks, customCallbacks);
}

/**
 * 预加载单词列表
 * @param {Array} words - 单词数组 [{ word, id, ... }, ...]
 * @param {string} gradeId - 年级ID
 */
function preloadWordList(words, gradeId) {
  if (!Array.isArray(words) || !gradeId) return;

  // ✅ 临时关闭 CDN 预下载，避免 404 + 队列浪费
  if (!ENABLE_CDN_AUDIO) return;

  // Token现在由后端管理，不需要预加载

  words.forEach((word) => {
    if (!word) return;

    const wordId = word.id || word.wordId || word.word;
    if (!wordId) return;

    // 如果已经在缓存中，跳过
    if (cache.has(wordId)) {
      const record = cache.get(wordId);
      record.lastAccess = Date.now();
      return;
    }

    // 快速构建URL（同步，不检查存在性）
    const url = buildAudioUrlSync(gradeId, word.word || wordId);
    if (!url) return;

    // 添加到缓存
    cache.set(wordId, {
      url,
      localPath: '',
      status: 'pending',
      lastAccess: Date.now(),
      ttsUrl: buildTTSUrlSync(word.word || wordId) || null,
      word: word.word || wordId // 保存word文本，用于错误回退
    });

    // 加入下载队列（后台下载，不阻塞）
    enqueueDownload(wordId);
  });
}

/**
 * 获取本地路径（如果已下载）
 */
function getLocalPath(wordId) {
  const record = cache.get(wordId);
  if (record && record.status === 'ready' && record.localPath) {
    return record.localPath;
  }
  return null;
}

/**
 * 获取远程URL（如果已缓存）
 */
function getRemoteUrl(wordId) {
  const record = cache.get(wordId);
  if (record && record.url) {
    return record.url;
  }
  return null;
}

/**
 * 获取TTS URL（如果已缓存）
 */
function getTTSUrl(wordId) {
  const record = cache.get(wordId);
  if (record && record.ttsUrl) {
    return record.ttsUrl;
  }
  return null;
}

/**
 * 播放单词音频（核心方法）
 * 策略：本地缓存 > 远程URL > TTS
 * 
 * @param {string} wordId - 单词ID
 * @param {Object} options - 选项
 * @param {string} options.gradeId - 年级ID（如果缓存中没有，用于构建URL）
 * @param {string} options.word - 单词文本（如果缓存中没有，用于构建URL和TTS）
 * @param {boolean} options.forceRemote - 强制使用远程URL（跳过本地缓存检查）
 */
async function playWord(wordId, options = {}) {
  if (!wordId) {
    console.warn('[AudioManager] wordId为空');
    return;
  }

  // 防抖检查
  const now = Date.now();
  if (now - lastPlayTime < PLAY_DEBOUNCE_MS) {
    console.log('[AudioManager] 防抖，忽略重复请求');
    return;
  }
  lastPlayTime = now;

  // 如果正在播放同一个单词，忽略
  if (currentPlayingWordId === wordId) {
    return;
  }

  const ctx = ensureAudioCtx();

  // 停止当前播放
  try {
    ctx.stop();
  } catch (e) {
    // 忽略停止错误
  }

  // 策略1 + 策略2：CDN 音频（本地缓存/远程URL）
  if (ENABLE_CDN_AUDIO) {
    // 策略1: 尝试使用本地缓存
    const localPath = getLocalPath(wordId);
    if (localPath && !options.forceRemote) {
      console.log('[AudioManager] 使用本地缓存:', wordId);
      playAudio(ctx, localPath, wordId, { word: options.word, fallbackToTTS: !!options.word });
      return;
    }

    // 策略2: 使用远程URL（快速响应）
    let remoteUrl = getRemoteUrl(wordId);
    if (!remoteUrl && options.gradeId && options.word) {
      // 如果缓存中没有，快速构建URL
      remoteUrl = buildAudioUrlSync(options.gradeId, options.word);
      if (remoteUrl) {
        // 添加到缓存（但不立即下载）
        const record = cache.get(wordId) || {
          url: remoteUrl,
          localPath: '',
          status: 'pending',
          lastAccess: Date.now(),
          ttsUrl: buildTTSUrl(options.word),
          word: options.word // 保存word文本，用于错误回退
        };
        record.url = remoteUrl;
        record.word = options.word; // 确保word被保存
        record.lastAccess = Date.now();
        cache.set(wordId, record);
        // 后台下载（不阻塞播放）
        enqueueDownload(wordId);
      }
    }

    if (remoteUrl) {
      console.log('[AudioManager] 使用远程URL:', wordId);
      playAudio(ctx, remoteUrl, wordId, { word: options.word, fallbackToTTS: !!options.word });
      return;
    }
  }

  // ✅ 直接走策略3：TTS（先等百度，超时才走有道）
  let ttsUrl = getTTSUrl(wordId);
  
  if (!ttsUrl && options.word) {
    // 1) 先尝试百度（带超时），成功就用百度
    const baiduPromise = USE_BAIDU_TTS ? buildBaiduTTSUrl(options.word) : Promise.resolve(null);
    
    const withTimeout = new Promise(resolve => {
      const timer = setTimeout(() => resolve(null), BAIDU_TTS_TIMEOUT_MS);
      baiduPromise
        .then(url => { clearTimeout(timer); resolve(url); })
        .catch(() => { clearTimeout(timer); resolve(null); });
    });
    
    const baiduUrl = await withTimeout;
    
    if (baiduUrl) {
      ttsUrl = baiduUrl;
    } else {
      // 2) 百度超时/失败，立刻回退有道
      ttsUrl = `${TTS_BASE_URL}${encodeURIComponent(options.word)}&type=1`;
      
      // 3) 继续后台拉百度，拉到就更新缓存并可选重播
      if (USE_BAIDU_TTS) {
        buildBaiduTTSUrl(options.word).then(asyncUrl => {
          if (asyncUrl) {
            const record = cache.get(wordId) || {};
            record.ttsUrl = asyncUrl;
            record.word = options.word;
            record.lastAccess = Date.now();
            cache.set(wordId, record);
          }
        }).catch(() => {});
      }
    }
    
    // 写入缓存
    const record = cache.get(wordId) || { url: '', localPath: '', status: 'error' };
    record.ttsUrl = ttsUrl;
    record.word = options.word;
    record.lastAccess = Date.now();
    cache.set(wordId, record);
  }

  if (ttsUrl) {
    console.log('[AudioManager] 使用TTS:', wordId, ttsUrl.includes('baidu.com') ? '(百度)' : '(有道)');
    playAudio(ctx, ttsUrl, wordId, { word: options.word, fallbackToTTS: false });
    return;
  }

  console.warn('[AudioManager] 无法播放，所有方案都失败:', wordId);
  callbacks.onError && callbacks.onError(new Error('无法获取音频URL'));
}

/**
 * 实际播放音频
 * @param {Object} ctx - 音频上下文
 * @param {string} src - 音频源（URL或本地路径）
 * @param {string} wordId - 单词ID
 * @param {Object} options - 选项 { word, fallbackToTTS }
 */
function playAudio(ctx, src, wordId, options = {}) {
  try {
    currentPlayingWordId = wordId;
    currentPlayingWord = options.word || null; // 保存当前播放的单词文本
    ctx.startTime = 0;

    // 如果是远程URL，先下载再播放，避免直接对着错误页面或XML解码
    if (typeof src === 'string' && /^https?:\/\//.test(src)) {
      console.log('[AudioManager] 远程音频，先下载再播放:', src);
      wx.downloadFile({
        url: src,
        success(res) {
          // 检查响应头 Content-Type，而不是只检查 .xml 后缀
          const contentType = (res.header && (res.header['Content-Type'] || res.header['content-type'])) || '';
          const hasType = !!contentType;
          const isAudioType = /audio\/|mpeg|mp3|wav|octet-stream/i.test(contentType);
          const isXmlPath = (res.tempFilePath || '').toLowerCase().includes('.xml');

          // 有 content-type 就校验；没有就放行（避免误判）
          if (res.statusCode === 200 && res.tempFilePath && !isXmlPath && (!hasType || isAudioType)) {
            console.log('[AudioManager] 下载成功，使用本地文件播放:', res.tempFilePath);
            try {
              ctx.src = res.tempFilePath;
              ctx.play();
            } catch (e) {
              console.error('[AudioManager] 本地文件播放异常:', e);
              // 检查是否是解码错误
              if (isDecodeError(e)) {
                handleAudioDecodeError(wordId, options);
              } else {
                currentPlayingWordId = null;
                currentPlayingWord = null;
                callbacks.onError && callbacks.onError(e);
                lastPlayTime = 0; // 允许重试
              }
            }
          } else {
            console.warn('[AudioManager] Content-Type 非音频或检测到XML，回退到TTS', {
              statusCode: res.statusCode,
              contentType,
              tempFilePath: res.tempFilePath
            });
            // 如果不是TTS URL，尝试回退到TTS
            if (options.fallbackToTTS && !src.includes('dictvoice') && !src.includes('baidu.com')) {
              handleAudioDecodeError(wordId, options);
            } else {
              currentPlayingWordId = null;
              currentPlayingWord = null;
              callbacks.onError && callbacks.onError(
                new Error(`下载音频失败: statusCode=${res.statusCode || 'unknown'}, contentType=${contentType}`)
              );
              lastPlayTime = 0; // 允许重试
            }
          }
        },
        fail(err) {
          console.error('[AudioManager] 下载音频网络错误:', src, err);
          // 网络错误时，如果不是TTS URL，尝试回退到TTS
          if (options.fallbackToTTS && !src.includes('dictvoice') && !src.includes('baidu.com')) {
            handleAudioDecodeError(wordId, options);
          } else {
            currentPlayingWordId = null;
            currentPlayingWord = null;
            callbacks.onError && callbacks.onError(err);
            lastPlayTime = 0; // 允许重试
          }
        }
      });
    } else {
      // 本地路径（包括之前缓存的 tempFilePath）直接播放
      ctx.src = src;
      ctx.play();
    }
  } catch (e) {
    console.error('[AudioManager] 播放异常:', e);
    // 检查是否是解码错误
    if (isDecodeError(e)) {
      handleAudioDecodeError(wordId, options);
    } else {
      currentPlayingWordId = null;
      currentPlayingWord = null;
      callbacks.onError && callbacks.onError(e);
      // 播放失败时重置防抖时间，允许重试
      lastPlayTime = 0;
    }
  }
}

/**
 * 检查是否是音频解码错误
 */
function isDecodeError(error) {
  if (!error) return false;
  const errMsg = String(error.errMsg || error.message || error).toLowerCase();
  return errMsg.includes('unable to decode audio data') || 
         errMsg.includes('decode audio') ||
         errMsg.includes('xml');
}

/**
 * 处理音频解码错误，回退到TTS
 */
function handleAudioDecodeError(wordId, options) {
  console.log('[AudioManager] 音频解码失败，尝试回退到TTS:', wordId);
  
  // 如果 options.word 为空，尝试从缓存中获取
  let word = options.word;
  if (!word && wordId) {
    // 尝试从缓存记录中获取word（如果之前保存过）
    const record = cache.get(wordId);
    if (record && record.word) {
      word = record.word;
    }
  }
  
  if (!word) {
    console.warn('[AudioManager] 无法回退到TTS，缺少word参数');
    currentPlayingWordId = null;
    currentPlayingWord = null;
    callbacks.onError && callbacks.onError(new Error('音频解码失败且无法回退到TTS'));
    lastPlayTime = 0;
    return;
  }

  // 获取TTS URL
  let ttsUrl = getTTSUrl(wordId);
  if (!ttsUrl) {
    // 先使用有道TTS作为快速回退方案（同步，立即可用）
    ttsUrl = buildTTSUrlSync(word);
    
    // 异步尝试获取百度TTS（通过后端API），成功后更新缓存并自动切换重播
    if (USE_BAIDU_TTS) {
      buildBaiduTTSUrl(word).then(asyncUrl => {
        if (asyncUrl && asyncUrl.includes('baidu.com')) {
          // 更新缓存
          const record = cache.get(wordId) || {};
          record.ttsUrl = asyncUrl;
          record.word = word;
          record.lastAccess = Date.now();
          cache.set(wordId, record);
          
          // ✅ 如果当前还在处理同一个词，就切到百度重播
          if (currentPlayingWordId === wordId) {
            const ctx = ensureAudioCtx();
            try { ctx.stop(); } catch (e) {}
            console.log('[AudioManager] 百度TTS已获取，切换为百度重播:', wordId);
            playAudio(ctx, asyncUrl, wordId, { word, fallbackToTTS: false });
          }
        }
      }).catch(() => {});
    }
    
    if (ttsUrl) {
      const record = cache.get(wordId) || {
        url: '',
        localPath: '',
        status: 'error',
        lastAccess: Date.now(),
        ttsUrl: ttsUrl,
        word: word // 保存word以便后续使用
      };
      record.ttsUrl = ttsUrl;
      record.word = word; // 保存word
      record.lastAccess = Date.now();
      cache.set(wordId, record);
    }
  }

  if (ttsUrl) {
    console.log('[AudioManager] 回退到TTS:', wordId, ttsUrl.includes('baidu.com') ? '(百度)' : '(有道)');
    const ctx = ensureAudioCtx();
    // 标记为TTS，不再回退
    playAudio(ctx, ttsUrl, wordId, { word: word, fallbackToTTS: false });
  } else {
    console.warn('[AudioManager] 无法获取TTS URL');
    currentPlayingWordId = null;
    currentPlayingWord = null;
    callbacks.onError && callbacks.onError(new Error('音频解码失败且无法获取TTS URL'));
    lastPlayTime = 0;
  }
}

/**
 * 停止播放
 */
function stop() {
  if (audioCtx) {
    try {
      audioCtx.stop();
      currentPlayingWordId = null;
    } catch (e) {
      console.warn('[AudioManager] 停止播放失败:', e);
    }
  }
}

/**
 * 销毁（页面卸载时调用）
 */
function destroy() {
  stop();
  
  if (audioCtx) {
    try {
      audioCtx.destroy();
    } catch (e) {
      console.warn('[AudioManager] 销毁失败:', e);
    }
    audioCtx = null;
  }

  // 清理缓存（保留最近访问的，清理旧的）
  const now = Date.now();
  const maxAge = 24 * 60 * 60 * 1000; // 24小时
  const entries = Array.from(cache.entries());
  
  entries.forEach(([wordId, record]) => {
    if (now - record.lastAccess > maxAge) {
      cache.delete(wordId);
    }
  });

  downloadQueue = [];
  activeDownloads = 0;
  lastPlayTime = 0;
  currentPlayingWordId = null;
  currentPlayingWord = null;
}

// ==================== 导出 ====================
module.exports = {
  setCallbacks,
  preloadWordList,
  playWord,
  getLocalPath,
  stop,
  destroy
};
