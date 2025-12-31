// CDN词汇加载器 - 最小改动补丁版本
// 取消年级ID映射，直接使用原始gradeId读取同名JSON

const { CDN_BASE } = require('./config');
const { buildAudioUrl } = require('./audioUrl');

const isWeapp = () => typeof wx !== 'undefined' && !!wx.request;
const isAbsUrl = (u) => /^https?:\/\//i.test(u);

/** 统一把 gradeId → 最终URL（不再做任何"_1→总册"映射！） */
function buildCdnUrl(gradeId) {
  // 修复：COS上的文件是 grade3_1.json 格式，需要在 gradeId 前添加 grade 前缀
  const gradePrefix = gradeId.startsWith('grade') ? gradeId : `grade${gradeId}`;
  return `${CDN_BASE}/${gradePrefix}.json`; // 直指子册
}

async function getGradeWordsById(gradeId) {
  const url = isWeapp()
    ? buildCdnUrl(gradeId)   // ✅ 小程序必须绝对地址
    : buildCdnUrl(gradeId);  // Web 也用CDN更省事（也可改成本地）

  if (isWeapp()) {
    return new Promise((resolve, reject) => {
      // 添加时间戳参数防止缓存
      const timestamp = Date.now();
      const urlWithCache = `${url}?t=${timestamp}`;
      
      wx.request({
        url: urlWithCache,
        method: 'GET',
        timeout: 15000,
        enableHttp2: true,
        header: {
          'Cache-Control': 'no-cache'
        },
        success: (res) => {
          if (res.statusCode === 200 && res.data) return resolve(res.data);
          reject(new Error(`HTTP ${res.statusCode} for ${url}`));
        },
        fail: reject,
      });
    });
                } else {
    const r = await fetch(url, { cache: 'no-cache' });
    if (!r.ok) throw new Error(`HTTP ${r.status} for ${url}`);
    return await r.json();
  }
}

/** 解包：支持 数组 / {words|list|data: []} */
function unwrapPack(pack) {
  if (Array.isArray(pack)) return pack;
  if (pack?.words && Array.isArray(pack.words)) return pack.words;
  if (pack?.list  && Array.isArray(pack.list))  return pack.list;
  if (pack?.data  && Array.isArray(pack.data))  return pack.data;
  return null;
}

/** 为词汇数据添加音频URL */
function addAudioUrls(words, gradeId) {
  if (!Array.isArray(words)) return words;
  
  return words.map(word => {
    if (typeof word === 'string') {
      return {
        text: word,
        audioUrl: buildAudioUrl(gradeId, word)
      };
    } else if (typeof word === 'object') {
      // 处理已有的对象格式词汇数据
      const wordText = word.word || word.text || word;
      return {
        ...word,
        audioUrl: buildAudioUrl(gradeId, wordText)
      };
    }
    return word;
  });
}

/** 可选：离线本地包（静态映射，小程序友好） */
function tryLocal(gradeId) {
  try {
    // 修复：LOCAL_FILES的键是 grade3_1 格式，需要确保 gradeId 有 grade 前缀
    const gradePrefix = gradeId.startsWith('grade') ? gradeId : `grade${gradeId}`;
    const { LOCAL_FILES } = require('../cdn-data/localMap');
    const loader = LOCAL_FILES?.[gradePrefix];
    if (loader) {
      const pack = loader();           // 直接得到 JSON 对象
      return unwrapPack(pack);
    }
    return null;
  } catch (e) {
    console.warn('本地包载入失败(可忽略)：', e);
    return null;
  }
}

/** 主入口：严格用"传入的 gradeId"读取同名JSON */
async function getGradeWords(gradeId) {
  // 1) 优先使用本地离线文件（包括JS模块和JSON）
  const local = tryLocal(gradeId);
  if (local && local.length) {

    const wordsWithAudio = addAudioUrls(local, gradeId);
    return wordsWithAudio;
  }

  // 2) 如果本地文件不存在，尝试从 CDN 加载
  try {
    const cdnPack = await getGradeWordsById(gradeId);
    const cdnArr  = unwrapPack(cdnPack);
    if (cdnArr && cdnArr.length) {

      const wordsWithAudio = addAudioUrls(cdnArr, gradeId);
      return wordsWithAudio;
    } else {
      console.warn('⚠️ CDN格式非数组，尝试解包失败：', typeof cdnPack, cdnPack && Object.keys(cdnPack));
    }
  } catch (e) {
    console.warn(`🌧️ CDN加载失败 ${gradeId}:`, e.message || e);
  }

  // 3) 全部失败
  console.error(`❌ 所有数据源不可用，${gradeId} 年级词汇加载失败`);
  throw new Error(`All sources unavailable for ${gradeId}`);
}

/** 同步获取年级词汇总数（用于统计） */
function getGradeWordCountSync(gradeId) {
  try {
    const cacheKey = `grade_word_count_${gradeId}`;
    let cached = 0;
    
    // 检查是否在微信小程序环境
    if (typeof wx !== 'undefined' && wx.getStorageSync) {
      cached = wx.getStorageSync(cacheKey);
    }
    
    // 尝试从本地CDN数据获取（优先）
    try {
      // 通过localMap加载本地CDN数据文件
      // 修复：LOCAL_FILES的键是 grade3_1 格式，需要确保 gradeId 有 grade 前缀
      const gradePrefix = gradeId.startsWith('grade') ? gradeId : `grade${gradeId}`;
      const { LOCAL_FILES } = require('../cdn-data/localMap');
      const loader = LOCAL_FILES?.[gradePrefix];
      if (loader) {
        const localData = loader();
        if (localData) {
          // 诊断：检查数据来源

          let count = 0;
          if (localData.total && typeof localData.total === 'number' && localData.total > 0) {
            count = localData.total;
          } else if (localData.words && Array.isArray(localData.words)) {
            count = localData.words.length;
          }
          
          // 诊断：检查数据来源
          if (localData.lastUpdated) {
          }
          
          if (count > 0) {
            // 如果缓存值与实际数据不一致，强制更新缓存
            if (typeof wx !== 'undefined' && wx.getStorageSync) {
              const currentCache = wx.getStorageSync(cacheKey);
              if (currentCache !== count) {
                wx.setStorageSync(cacheKey, count);
              } else {
              }
            }
            return count;
          } else {
            console.warn(`⚠️ [数据源] ${gradeId} 无法获取有效数量`);
          }
        } else {
          console.warn(`⚠️ [数据源] ${gradeId} loader返回null`);
        }
      } else {
        console.warn(`⚠️ [数据源] ${gradeId} 找不到loader (gradePrefix: ${gradePrefix})`);
      }
    } catch (e) {
      console.warn(`本地CDN数据获取失败 ${gradeId}:`, e.message, e.stack);
    }
    
    // 如果数据源获取失败，但有缓存，返回缓存值
    if (cached && cached > 0) {
      return cached;
    }
    
    return 0;
  } catch (error) {
    console.warn(`获取 ${gradeId} 词汇总数失败:`, error.message);
    return 0;
  }
}

module.exports = {
  buildCdnUrl,
  getGradeWordsById,
  getGradeWords,
  getGradeWordCountSync
};