// 通用工具函数

// onOnce：给没有 once 的 API 用
function onOnce(ctx, evt, handler) {
  const on = ctx[`on${evt}`], off = ctx[`off${evt}`];
  if (typeof on !== 'function') return;
  const wrap = (...args) => {
    if (typeof off === 'function') off.call(ctx, wrap);
    handler(...args);
  };
  on.call(ctx, wrap);
}

/**
 * 规范化词义字段
 * @param {*} meaning - 词义，可能是字符串、对象或数组
 * @returns {string} - 规范化后的字符串
 */
function normalizeMeaning(meaning) {
  if (!meaning) return '';
  
  // 如果是字符串，直接返回
  if (typeof meaning === 'string') {
    return meaning;
  }
  
  // 如果是对象，尝试提取文本内容
  if (typeof meaning === 'object') {
    // 如果是数组，取第一个元素
    if (Array.isArray(meaning)) {
      return meaning.length > 0 ? String(meaning[0]) : '';
    }
    
    // 如果是对象，尝试提取常见字段
    if (meaning.text) return String(meaning.text);
    if (meaning.definition) return String(meaning.definition);
    if (meaning.translation) return String(meaning.translation);
    if (meaning.meaning) return String(meaning.meaning);
    if (meaning.chinese) return String(meaning.chinese);
    if (meaning.zh) return String(meaning.zh);
    if (meaning.cn) return String(meaning.cn);
    
    // 尝试获取对象的第一个字符串值
    for (const key in meaning) {
      if (meaning.hasOwnProperty(key)) {
        const value = meaning[key];
        if (typeof value === 'string' && value.trim()) {
          return value.trim();
        }
      }
    }
    
    // 如果对象有toString方法，使用toString
    if (typeof meaning.toString === 'function') {
      const str = meaning.toString();
      if (str !== '[object Object]') {
        return str;
      }
    }
    
    // 最后尝试JSON.stringify，但限制深度避免循环引用
    try {
      const jsonStr = JSON.stringify(meaning, null, 2);
      // 如果JSON字符串太长，截取前200个字符
      return jsonStr.length > 200 ? jsonStr.substring(0, 200) + '...' : jsonStr;
    } catch (e) {
      console.warn('无法序列化含义对象:', meaning, e);
      return '含义数据格式异常';
    }
  }
  
  // 其他类型，转换为字符串
  return String(meaning);
}

/**
 * 处理长文本释义，添加换行符
 * @param {string} text - 文本
 * @returns {string} - 处理后的文本
 */
function processLongText(text) {
  if (!text || text.length <= 6) return text;
  
  // 如果包含括号，在括号后换行
  if (text.includes('(') && text.includes(')')) {
    return text.replace(/\)/g, ')\n');
  }
  
  // 如果包含逗号，在逗号后换行
  if (text.includes('，')) {
    return text.replace(/，/g, '，\n');
  }
  
  // 如果包含顿号，在顿号后换行
  if (text.includes('、')) {
    return text.replace(/、/g, '、\n');
  }
  
  // 如果包含斜杠，在斜杠后换行
  if (text.includes('/')) {
    return text.replace(/\//g, '/\n');
  }
  
  // 如果包含分号，在分号后换行
  if (text.includes('；')) {
    return text.replace(/；/g, '；\n');
  }
  
  // 如果包含冒号，在冒号后换行
  if (text.includes('：')) {
    return text.replace(/：/g, '：\n');
  }
  
  // 如果文本很长但没有标点，在中间位置截断
  if (text.length > 20) {
    const midPoint = Math.floor(text.length / 2);
    return text.substring(0, midPoint) + '\n' + text.substring(midPoint);
  }
  
  return text;
}

/**
 * 数组随机打乱
 * @param {Array} a - 数组
 * @returns {Array} - 打乱后的数组
 */
function shuffle(a) {
  if (!a || !Array.isArray(a)) return [];
  return a.map(x => [Math.random(), x]).sort((p, q) => p[0] - q[0]).map(p => p[1]);
}

/**
 * 自动评分：比较用户输入和正确答案
 * @param {string} user - 用户输入
 * @param {string} truth - 正确答案
 * @returns {number} - 评分：0-3，3为完全正确
 */
function autoGrade(user, truth) {
  const clean = s => (s || '').toLowerCase().replace(/[^a-z]/g, '').trim();
  const u = clean(user), t = clean(truth);
  if (!u) return 0;
  if (u === t) return 3;
  const d = lev(u, t);
  if (d <= 1 && t.length > 4) return 2;
  if (d <= 2) return 1;
  return 0;
}

/**
 * 计算两个字符串的编辑距离（Levenshtein距离）
 * @param {string} a - 字符串a
 * @param {string} b - 字符串b
 * @returns {number} - 编辑距离
 */
function lev(a, b) {
  if (!a || !b || typeof a !== 'string' || typeof b !== 'string') return 999;
  
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const c = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + c);
    }
  }
  return dp[m][n];
}

/**
 * 自动判断词性（改进规则）
 * @param {string} word - 单词
 * @param {string} meaning - 含义
 * @param {Object} dataSource - 数据源对象
 * @returns {string} - 词性标识
 */
function getWordType(word, meaning, dataSource = null) {
  // 优先使用数据源的类型信息
  if (dataSource && dataSource.partOfSpeech) {
    const partOfSpeech = dataSource.partOfSpeech;
    // 将中文类型转换为英文标识
    if (partOfSpeech === '句子') return 'sentence';
    if (partOfSpeech === '短语') return 'phrase';
    if (partOfSpeech === '名词') return 'noun';
    if (partOfSpeech === '动词') return 'verb';
    if (partOfSpeech === '形容词') return 'adjective';
    if (partOfSpeech === '名词短语') return 'noun_phrase';
    // 如果已经是英文标识，直接返回
    return partOfSpeech;
  }
  
  // 回退到原有逻辑：优先检查是否为短语（多个单词组合）
  if (word.includes(' ') || word.includes('-')) {
    return 'phrase';
  }
  
  // 检查含义中的词性提示
  if (meaning.includes('短语') || meaning.includes('词组')) return 'phrase';
  
  // 动词识别（扩展关键词）
  const verbKeywords = [
    '着', '了', '过', '做', '进行', '执行', '去', '来', '走', '跑', '看', '听', '说', '吃', '喝',
    '玩', '学', '教', '写', '读', '画', '唱', '跳', '飞', '游', '骑', '开', '关', '打', '拿',
    '给', '买', '卖', '找', '想', '爱', '喜欢', '帮助', '工作', '睡觉', '起床', '洗澡', '刷牙'
  ];
  
  for (let keyword of verbKeywords) {
    if (meaning.includes(keyword)) {
      return 'verb';
    }
  }
  
  // 形容词识别（扩展关键词）
  const adjKeywords = [
    '的', '地', '很', '非常', '漂亮', '好', '坏', '大', '小', '高', '矮', '长', '短',
    '新', '旧', '快', '慢', '热', '冷', '暖', '凉', '干', '湿', '干净', '脏', '亮', '暗',
    '红', '蓝', '绿', '黄', '黑', '白', '甜', '酸', '辣', '苦', '咸', '香', '臭',
    '年轻', '老', '胖', '瘦', '强', '弱', '聪明', '笨', '勇敢', '害怕', '开心', '难过'
  ];
  
  for (let keyword of adjKeywords) {
    if (meaning.includes(keyword)) {
      return 'adjective';
    }
  }
  
  // 特殊单词词性判断
  const specialWords = {
    // 动词
    'need': 'verb', 'want': 'verb', 'like': 'verb', 'love': 'verb', 'hate': 'verb',
    'can': 'verb', 'will': 'verb', 'should': 'verb', 'must': 'verb', 'may': 'verb',
    'go': 'verb', 'come': 'verb', 'get': 'verb', 'make': 'verb', 'take': 'verb',
    'give': 'verb', 'put': 'verb', 'see': 'verb', 'know': 'verb', 'think': 'verb',
    'feel': 'verb', 'look': 'verb', 'find': 'verb', 'use': 'verb', 'work': 'verb',
    'play': 'verb', 'run': 'verb', 'walk': 'verb', 'sit': 'verb', 'stand': 'verb',
    'eat': 'verb', 'drink': 'verb', 'sleep': 'verb', 'wake': 'verb', 'live': 'verb',
    
    // 形容词
    'good': 'adjective', 'bad': 'adjective', 'big': 'adjective', 'small': 'adjective',
    'new': 'adjective', 'old': 'adjective', 'hot': 'adjective', 'cold': 'adjective',
    'fast': 'adjective', 'slow': 'adjective', 'easy': 'adjective', 'hard': 'adjective',
    'happy': 'adjective', 'sad': 'adjective', 'beautiful': 'adjective', 'ugly': 'adjective',
    'tall': 'adjective', 'short': 'adjective', 'long': 'adjective', 'wide': 'adjective',
    'narrow': 'adjective', 'thick': 'adjective', 'thin': 'adjective', 'heavy': 'adjective',
    'light': 'adjective', 'strong': 'adjective', 'weak': 'adjective', 'rich': 'adjective',
    'poor': 'adjective', 'clean': 'adjective', 'dirty': 'adjective', 'full': 'adjective',
    'empty': 'adjective', 'open': 'adjective', 'closed': 'adjective', 'free': 'adjective',
    'busy': 'adjective', 'ready': 'adjective', 'sure': 'adjective', 'right': 'adjective',
    'wrong': 'adjective', 'true': 'adjective', 'false': 'adjective', 'same': 'adjective',
    'different': 'adjective', 'important': 'adjective', 'special': 'adjective', 'normal': 'adjective'
  };
  
  if (specialWords[word.toLowerCase()]) {
    return specialWords[word.toLowerCase()];
  }
  
  // 默认为名词
  return 'noun';
}

/**
 * 判断是否应该显示词性标签
 * @param {Object} word - 单词对象
 * @returns {boolean} 是否显示词性标签
 */
function shouldShowWordType(word) {
  if (!word || !word.word) return false;
  
  // 如果 wordType 是短语/句子类型，不显示
  if (word.wordType === 'phrase' || 
      word.wordType === 'sentence' || 
      word.wordType === 'noun_phrase') {
    return false;
  }
  
  // 如果单词中包含空格或连字符（两个以上单词），不显示
  const wordText = word.word.trim();
  if (wordText.includes(' ') || wordText.includes('-')) {
    // 检查单词数量：按空格或连字符分割
    const wordCount = wordText.split(/[\s-]+/).filter(w => w.length > 0).length;
    if (wordCount >= 2) {
      return false;
    }
  }
  
  // 其他情况（单个单词的词性）显示
  return true;
}

module.exports = {
  onOnce,
  normalizeMeaning,
  processLongText,
  shuffle,
  autoGrade,
  lev,
  getWordType,
  shouldShowWordType
};

