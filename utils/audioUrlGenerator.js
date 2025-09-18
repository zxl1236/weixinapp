// 音频URL生成工具
// 用于小程序端生成预生成音频文件的URL
// 支持单词和短语的音频播放

/**
 * 音频URL生成器
 * 支持预生成的音频文件和实时TTS回退
 */
class AudioUrlGenerator {
  constructor(config = {}) {
    // CDN配置
    this.cdnDomain = config.cdnDomain || "https://cdn.yourdomain.com";
    this.audioPath = config.audioPath || "audio";
    
    // 年级映射
    this.gradeMapping = {
      'grade3': 'grade3',
      'grade4': 'grade4', 
      'grade5': 'grade5',
      'grade6': 'grade6',
      'grade7': 'grade7',
      'grade8': 'grade8',
      'grade9': 'grade9',
      'grade10': 'grade10',
      'grade11': 'grade11',
      'grade12': 'grade12'
    };
    
    // 音频URL缓存
    this.urlCache = new Map();
    
    // 是否启用预生成音频（默认启用）
    this.enablePreGeneratedAudio = config.enablePreGeneratedAudio !== false;
  }

  /**
   * 生成音频文件名
   * @param {string} word - 单词或短语
   * @returns {string} 音频文件名
   */
  generateAudioKey(word) {
    if (!word) return '';
    
    return word.toLowerCase()
      .replace(/[^\w\s]/g, '')  // 移除标点符号
      .replace(/\s+/g, '_')     // 空格转下划线
      + '.mp3';
  }

  /**
   * 生成预生成音频的URL
   * @param {string} word - 单词
   * @param {string} grade - 年级ID
   * @returns {string} 音频URL
   */
  getPreGeneratedAudioUrl(word, grade) {
    if (!word || !grade) return null;
    
    const cacheKey = `${grade}:${word}`;
    if (this.urlCache.has(cacheKey)) {
      return this.urlCache.get(cacheKey);
    }
    
    const audioKey = this.generateAudioKey(word);
    const gradePath = this.gradeMapping[grade] || grade;
    const url = `${this.cdnDomain}/${this.audioPath}/${gradePath}/${audioKey}`;
    
    this.urlCache.set(cacheKey, url);
    return url;
  }

  /**
   * 检查音频文件是否存在（通过HEAD请求）
   * @param {string} url - 音频URL
   * @returns {Promise<boolean>} 是否存在
   */
  async checkAudioExists(url) {
    try {
      const response = await new Promise((resolve, reject) => {
        wx.request({
          url: url,
          method: 'HEAD',
          success: resolve,
          fail: reject
        });
      });
      
      return response.statusCode === 200;
    } catch (error) {
      console.warn('检查音频文件失败:', url, error);
      return false;
    }
  }

  /**
   * 获取最佳音频URL（优先预生成，回退到实时TTS）
   * @param {string} word - 单词
   * @param {string} grade - 年级ID
   * @param {Function} ttsFallback - TTS回退函数
   * @returns {Promise<string|null>} 音频URL
   */
  async getBestAudioUrl(word, grade, ttsFallback = null) {
    if (!this.enablePreGeneratedAudio) {
      // 如果禁用预生成音频，直接使用TTS
      return ttsFallback ? await ttsFallback(word) : null;
    }
    
    // 尝试预生成音频
    const preGeneratedUrl = this.getPreGeneratedAudioUrl(word, grade);
    if (preGeneratedUrl) {
      // 检查文件是否存在
      const exists = await this.checkAudioExists(preGeneratedUrl);
      if (exists) {
        console.log(`✅ 使用预生成音频: ${word} -> ${preGeneratedUrl}`);
        return preGeneratedUrl;
      }
    }
    
    // 预生成音频不存在，使用TTS回退
    if (ttsFallback) {
      console.log(`🔄 预生成音频不存在，使用TTS: ${word}`);
      return await ttsFallback(word);
    }
    
    return null;
  }

  /**
   * 批量检查多个单词的预生成音频
   * @param {Array} words - 单词列表 [{word, grade}, ...]
   * @returns {Promise<Object>} 检查结果
   */
  async batchCheckAudio(words) {
    const results = {
      available: [],
      missing: [],
      total: words.length
    };
    
    for (const {word, grade} of words) {
      const url = this.getPreGeneratedAudioUrl(word, grade);
      if (url) {
        const exists = await this.checkAudioExists(url);
        if (exists) {
          results.available.push({word, grade, url});
        } else {
          results.missing.push({word, grade, url});
        }
      } else {
        results.missing.push({word, grade, url: null});
      }
    }
    
    return results;
  }

  /**
   * 生成短语的音频URL列表（按词序）
   * @param {string} phrase - 短语
   * @param {string} grade - 年级ID
   * @returns {Array} 音频URL列表
   */
  async getPhraseAudioUrls(phrase, grade) {
    if (!phrase) return [];
    
    // 拆分短语为单词
    const words = phrase
      .replace(/[^\w'\-\s]/g, ' ')   // 去掉标点
      .split(/\s+/)
      .filter(Boolean);
    
    const urls = [];
    
    for (const word of words) {
      const url = await this.getBestAudioUrl(word, grade);
      if (url) {
        urls.push(url);
      } else {
        console.warn(`⚠️ 无法获取单词音频: ${word}`);
      }
    }
    
    return urls;
  }

  /**
   * 更新CDN域名配置
   * @param {string} domain - 新的CDN域名
   */
  updateCdnDomain(domain) {
    this.cdnDomain = domain;
    this.urlCache.clear(); // 清空缓存
  }

  /**
   * 清空URL缓存
   */
  clearCache() {
    this.urlCache.clear();
  }

  /**
   * 获取缓存统计
   * @returns {Object} 缓存统计信息
   */
  getCacheStats() {
    return {
      size: this.urlCache.size,
      keys: Array.from(this.urlCache.keys())
    };
  }
}

/**
 * 音频播放管理器
 * 集成预生成音频和TTS回退
 */
class AudioPlaybackManager {
  constructor(config = {}) {
    this.urlGenerator = new AudioUrlGenerator(config);
    this.isPlaying = false;
    this.currentAudioContext = null;
  }

  /**
   * 播放单词音频
   * @param {string} word - 单词
   * @param {string} grade - 年级ID
   * @param {Function} ttsFallback - TTS回退函数
   * @returns {Promise<boolean>} 播放是否成功
   */
  async playWord(word, grade, ttsFallback = null) {
    if (this.isPlaying) {
      console.warn('音频正在播放中，跳过新请求');
      return false;
    }

    try {
      this.isPlaying = true;
      
      // 获取最佳音频URL
      const audioUrl = await this.urlGenerator.getBestAudioUrl(word, grade, ttsFallback);
      
      if (!audioUrl) {
        throw new Error('无法获取音频URL');
      }

      // 播放音频
      await this.playAudio(audioUrl);
      
      console.log(`🎵 播放完成: ${word}`);
      return true;
      
    } catch (error) {
      console.error('播放单词失败:', word, error);
      return false;
    } finally {
      this.isPlaying = false;
    }
  }

  /**
   * 播放短语音频（按词序）
   * @param {string} phrase - 短语
   * @param {string} grade - 年级ID
   * @param {Function} ttsFallback - TTS回退函数
   * @param {number} gapMs - 词间间隔（毫秒）
   * @returns {Promise<boolean>} 播放是否成功
   */
  async playPhrase(phrase, grade, ttsFallback = null, gapMs = 120) {
    if (this.isPlaying) {
      console.warn('音频正在播放中，跳过新请求');
      return false;
    }

    try {
      this.isPlaying = true;
      
      // 获取短语的音频URL列表
      const urls = await this.urlGenerator.getPhraseAudioUrls(phrase, grade);
      
      if (urls.length === 0) {
        throw new Error('无法获取短语音频');
      }

      // 按顺序播放每个单词
      for (let i = 0; i < urls.length; i++) {
        const url = urls[i];
        console.log(`🎵 播放第 ${i + 1}/${urls.length} 个单词`);
        
        await this.playAudio(url);
        
        // 词间间隔
        if (i < urls.length - 1 && gapMs > 0) {
          await new Promise(resolve => setTimeout(resolve, gapMs));
        }
      }
      
      console.log(`🎵 短语播放完成: ${phrase}`);
      return true;
      
    } catch (error) {
      console.error('播放短语失败:', phrase, error);
      return false;
    } finally {
      this.isPlaying = false;
    }
  }

  /**
   * 播放单个音频文件
   * @param {string} url - 音频URL
   * @returns {Promise<void>}
   */
  async playAudio(url) {
    return new Promise((resolve, reject) => {
      // 停止当前播放
      if (this.currentAudioContext) {
        this.currentAudioContext.stop();
        this.currentAudioContext.destroy();
      }

      // 创建新的音频上下文
      this.currentAudioContext = wx.createInnerAudioContext();
      this.currentAudioContext.src = url;
      
      this.currentAudioContext.onPlay(() => {
        console.log('开始播放:', url);
      });
      
      this.currentAudioContext.onEnded(() => {
        console.log('播放结束:', url);
        resolve();
      });
      
      this.currentAudioContext.onError((error) => {
        console.error('播放错误:', url, error);
        reject(error);
      });
      
      // 开始播放
      this.currentAudioContext.play();
    });
  }

  /**
   * 停止播放
   */
  stop() {
    if (this.currentAudioContext) {
      this.currentAudioContext.stop();
      this.currentAudioContext.destroy();
      this.currentAudioContext = null;
    }
    this.isPlaying = false;
  }

  /**
   * 检查是否正在播放
   * @returns {boolean}
   */
  getPlaying() {
    return this.isPlaying;
  }
}

// 导出
module.exports = {
  AudioUrlGenerator,
  AudioPlaybackManager
};
