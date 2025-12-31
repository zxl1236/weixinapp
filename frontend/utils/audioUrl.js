// 音频URL构建工具 - 热修复版本，统一入口避免手拼
const { AUDIO_CDN_BASE } = require('./config');
const CDN_AUDIO_BASE = AUDIO_CDN_BASE;

/**
 * 保留空格与大小写；去掉问号等标点；结尾补一个下划线
 * 匹配COS实际文件命名：How can John make friends at school_.mp3
 */
function toCosFilenameFromText(text) {
  return text
    .trim()
    .replace(/[?？！!.,，。:：;；'"""''()（）[\]{}]/g, '') // 去标点（特别是问号）
    + '_';
}

/**
 * 清理文本用于匹配音频文件名
 * 近似匹配：去掉末尾的连续点号（..），然后去掉其他标点符号
 */
function cleanTextForMatching(text) {
  return String(text)
    .trim()
    .replace(/\.+$/, '')  // 先去掉末尾的连续点号（.. 或 ...）
    .replace(/[?？！!.,，。:：;；'"'"()（）[\]{}]/g, ''); // 再去掉其他标点符号
}

/**
 * 构建音频URL - 单一路径结构
 * 🔥 修复：近似匹配，支持文件名末尾带双点号的情况（如 "句子..mp3"）
 * 注意：此函数返回第一个候选URL，如需精确匹配请使用 findExistingUrl + candidateAudioUrls
 */
function buildAudioUrl(gradeId, text) {
  if (!gradeId || !text) {
    console.warn('buildAudioUrl: 缺少必要参数', { gradeId, text });
    return null;
  }

  // 修复：COS上的目录是 grade3_1 格式，需要在 gradeId 前添加 grade 前缀
  const gradePrefix = gradeId.startsWith('grade') ? gradeId : `grade${gradeId}`;

  // 🔥 近似匹配：先去掉末尾连续点号，再去掉其他标点
  const cleaned = cleanTextForMatching(text);
  const file = `${cleaned}.mp3`;                           // 标准格式（优先）
  const url = `${CDN_AUDIO_BASE}/${gradePrefix}/${encodeURIComponent(file)}`;    // 单一路径结构
  return url;
}

/**
 * 构建音频URL（异步近似匹配版本）
 * 🔥 使用候选URL列表进行近似匹配，支持文件名末尾带双点号的情况
 * @param {string} gradeId - 年级ID
 * @param {string} text - 文本内容
 * @returns {Promise<string|null>} 找到的音频URL或null
 */
async function buildAudioUrlAsync(gradeId, text) {
  if (!gradeId || !text) {
    console.warn('buildAudioUrlAsync: 缺少必要参数', { gradeId, text });
    return null;
  }

  const candidates = candidateAudioUrls(gradeId, text);
  const found = await findExistingUrl(candidates);
  
  if (found) {
  } else {
    console.warn('⚠️ 近似匹配失败，所有候选URL都不存在:', { text, candidates: candidates.map(u => decodeURIComponent(u)) });
  }
  
  return found;
}

/**
 * 生成候选音频URL列表 - 兼容不同命名规则
 * 🔥 修复：近似匹配，支持文件名末尾带双点号的情况（如 "句子..mp3"）
 */
function candidateAudioUrls(gradeId, text) {
  // 修复：COS上的目录是 grade3_1 格式，需要在 gradeId 前添加 grade 前缀
  const gradePrefix = gradeId.startsWith('grade') ? gradeId : `grade${gradeId}`;
  const base = `${CDN_AUDIO_BASE}/${gradePrefix}`;  // 单一路径结构
  
  // 🔥 近似匹配：先去掉末尾连续点号，再去掉其他标点
  const cleaned = cleanTextForMatching(text);
  const dashSlug = cleaned.toLowerCase().replace(/\s+/g, '-');

  return [
    // 优先：标准格式（无点号后缀）
    `${base}/${encodeURIComponent(cleaned + '.mp3')}`,
    // 备用：带双点号格式（匹配上传后文件名带..的情况）
    `${base}/${encodeURIComponent(cleaned + '..mp3')}`,
    // 备用：带下划线格式
    `${base}/${encodeURIComponent(cleaned + '_.mp3')}`,
    // 备用：短横线格式
    `${base}/${encodeURIComponent(dashSlug + '.mp3')}`,
    // 备用：短横线带双点号格式
    `${base}/${encodeURIComponent(dashSlug + '..mp3')}`,
    // 备用：短横线带下划线格式
    `${base}/${encodeURIComponent(dashSlug + '_.mp3')}`
  ];
}

/**
 * 检查音频文件是否存在
 */
function headExists(url) {
  return new Promise(res => {
    if (typeof wx !== 'undefined' && wx.request) {
      // 微信小程序环境
      wx.request({
        url,
        method: 'HEAD',
        success: r => res(r.statusCode === 200),
        fail: () => res(false),
      });
    } else {
      // Node.js 或浏览器环境
      fetch(url, { method: 'HEAD' })
        .then(response => res(response.ok))
        .catch(() => res(false));
    }
  });
}

/**
 * 查找存在的音频URL
 */
async function findExistingUrl(urls) {
  for (const u of urls) {
    if (await headExists(u)) return u;
  }
  return null;
}

module.exports = {
  buildAudioUrl,
  buildAudioUrlAsync,
  candidateAudioUrls,
  findExistingUrl,
  headExists,
  toCosFilenameFromText
};
