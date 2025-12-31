// 应用配置文件
// 定义CDN基础URL和其他配置

// CDN基础URL配置 - 词汇数据CDN
const CDN_BASE = 'https://wex-1344106734.cos.ap-shanghai.myqcloud.com/Words'; // 腾讯云COS存储桶

// 音频CDN基础URL配置
const AUDIO_CDN_BASE = 'https://wex-1344106734.cos.ap-shanghai.myqcloud.com/audio'; // 音频文件存储

// 备用本地数据配置
const FALLBACK_ENABLED = true;

// 数据加载超时配置
const REQUEST_TIMEOUT = 15000; // 15秒

// 缓存配置
const CACHE_ENABLED = true;
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24小时

module.exports = {
  CDN_BASE,
  AUDIO_CDN_BASE,
  FALLBACK_ENABLED,
  REQUEST_TIMEOUT,
  CACHE_ENABLED,
  CACHE_DURATION
};
