// 单词发音字母高亮和音标类型分析辅助函数

/**
 * 分析音标类型，返回类型字符串
 * @param {string} phonetic - 音标字符串，如 "/ˈhæpi/"
 * @returns {string} - 类型描述，如 "长元音、r组合"
 */
function analyzePhoneticType(phonetic) {
  if (!phonetic) return '';
  
  const types = [];
  const phoneticStr = phonetic.replace(/[\/\[\]]/g, ''); // 移除音标符号
  
  // 长元音检测（使用多个模式匹配）
  const longVowelPatterns = [/iː/, /uː/, /ɔː/, /ɑː/, /ɜː/, /eɪ/, /aɪ/, /ɔɪ/, /əʊ/, /aʊ/];
  if (longVowelPatterns.some(pattern => pattern.test(phoneticStr))) {
    types.push('长元音');
  }
  
  // 短元音检测
  const shortVowelPatterns = [/ɪ/, /ʊ/, /ɒ/, /ʌ/, /ə/, /e/, /æ/];
  if (shortVowelPatterns.some(pattern => pattern.test(phoneticStr))) {
    types.push('短元音');
  }
  
  // r组合检测（r音化）
  if (/r/.test(phoneticStr)) {
    types.push('r组合');
  }
  // 弱音检测
  if (/ə/.test(phoneticStr) && !types.includes('弱音')) {
    types.push('弱音');
  }
  
  // 双元音检测
  const diphthongPatterns = [/eɪ/, /aɪ/, /ɔɪ/, /əʊ/, /aʊ/, /ɪə/, /eə/, /ʊə/];
  if (diphthongPatterns.some(pattern => pattern.test(phoneticStr))) {
    if (!types.includes('双元音')) {
      types.push('双元音');
    }
  }
  
  return types.length > 0 ? types.join('、') : '';
}

/**
 * 生成带高亮标记的单词数据
 * @param {string} word - 单词
 * @param {string} phonetic - 音标
 * @param {string|Array<number>} highlightLetters - 需要高亮的字母（字符串如 "a" 或索引数组如 [1,2]）
 * @returns {Object} - { parts: Array<{text: string, highlight: boolean}>, phoneticType: string }
 */
function generateHighlightedWord(word, phonetic, highlightLetters) {
  if (!word) {
    return {
      parts: [{ text: word || '', highlight: false }],
      phoneticType: ''
    };
  }
  
  // 如果数据中提供了 highlightLetters，使用它
  let highlightIndices = [];
  if (highlightLetters !== undefined && highlightLetters !== null && highlightLetters !== '') {
    if (typeof highlightLetters === 'string') {
      const wordLower = word.toLowerCase();
      const letterLower = highlightLetters.toLowerCase();
      
      // 处理特殊格式，如 "第1个a"
      if (letterLower.startsWith('第') && letterLower.includes('个')) {
        const match = letterLower.match(/第(\d+)个(.+)/);
        if (match) {
          const position = parseInt(match[1]) - 1; // 转换为0-based索引
          const targetLetter = match[2].toLowerCase();
          let count = 0;
          for (let i = 0; i < wordLower.length; i++) {
            if (wordLower[i] === targetLetter) {
              if (count === position) {
                highlightIndices.push(i);
                break;
              }
              count++;
            }
          }
        }
      } else if (letterLower.length === 1) {
        // 单个字符：查找所有匹配的位置
        for (let i = 0; i < wordLower.length; i++) {
          if (wordLower[i] === letterLower) {
            highlightIndices.push(i);
          }
        }
      } else {
        // 多字符组合（如 "ow", "ee", "ar"）：先尝试查找连续的子字符串
        let startIndex = 0;
        let found = false;
        while (true) {
          const index = wordLower.indexOf(letterLower, startIndex);
          if (index === -1) break;
          found = true;
          // 添加整个组合的所有字符索引
          for (let i = 0; i < letterLower.length; i++) {
            highlightIndices.push(index + i);
          }
          startIndex = index + 1;
        }
        
        // 如果找不到连续匹配，尝试分别匹配每个字符（用于处理如 "ae" 在 "cake" 中的情况）
        if (!found && letterLower.length > 1) {
          for (let i = 0; i < letterLower.length; i++) {
            const singleChar = letterLower[i];
            for (let j = 0; j < wordLower.length; j++) {
              if (wordLower[j] === singleChar) {
                highlightIndices.push(j);
              }
            }
          }
        }
      }
    } else if (Array.isArray(highlightLetters)) {
      // 如果是数组，直接使用索引
      highlightIndices = highlightLetters.filter(idx => idx >= 0 && idx < word.length);
    }
  }
  
  // 如果没有提供 highlightLetters 或找不到，返回原单词（不进行高亮）
  if (highlightIndices.length === 0) {
    return {
      parts: [{ text: word, highlight: false }],
      phoneticType: ''
    };
  }
  
  // 生成分段数据
  const parts = [];
  let lastIndex = 0;
  
  for (let i = 0; i < word.length; i++) {
    if (highlightIndices.includes(i)) {
      // 如果之前有非高亮部分，先添加
      if (i > lastIndex) {
        parts.push({
          text: word.substring(lastIndex, i),
          highlight: false
        });
      }
      // 添加高亮字母
      parts.push({
        text: word[i],
        highlight: true
      });
      lastIndex = i + 1;
    }
  }
  
  // 添加剩余部分
  if (lastIndex < word.length) {
    parts.push({
      text: word.substring(lastIndex),
      highlight: false
    });
  }
  
  return {
    parts: parts,
    phoneticType: highlightLetters ? '字母音' : ''
  };
}

/**
 * 生成带高亮标记的音标数据
 * @param {string} phonetic - 音标字符串，如 "/ˈbeɪbi/"
 * @param {string} highlightPhonetic - 需要高亮的音标部分，如 "eɪ"
 * @returns {Array<{text: string, highlight: boolean}>} - 分段音标数据
 */
function generateHighlightedPhonetic(phonetic, highlightPhonetic) {
  if (!phonetic) {
    return [{ text: '', highlight: false }];
  }
  
  // 如果没有指定高亮部分，返回原音标
  if (!highlightPhonetic) {
    return [{ text: phonetic, highlight: false }];
  }
  
  // 保留原始音标字符串（包含所有字符）
  const phoneticStr = phonetic;
  
  // 转义正则表达式特殊字符，但保留音标字符
  const escapeRegex = (str) => {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  };
  
  // 先尝试直接匹配（区分大小写，用于精确匹配特殊字符）
  let highlightIndices = [];
  const escapedHighlight = escapeRegex(highlightPhonetic);
  
  // 使用正则表达式进行全局匹配
  // 注意：每次创建新的正则表达式对象，避免 lastIndex 问题
  const regex = new RegExp(escapedHighlight, 'g');
  let match;
  // 重置 lastIndex 确保从头开始匹配
  regex.lastIndex = 0;
  while ((match = regex.exec(phoneticStr)) !== null) {
    highlightIndices.push({ start: match.index, end: match.index + match[0].length });
    // 防止无限循环：如果匹配到空字符串，手动推进
    if (match[0].length === 0) {
      regex.lastIndex++;
    }
  }
  
  // 如果直接匹配失败，尝试不区分大小写匹配
  if (highlightIndices.length === 0) {
    const regexIgnoreCase = new RegExp(escapedHighlight, 'gi');
    regexIgnoreCase.lastIndex = 0;
    while ((match = regexIgnoreCase.exec(phoneticStr)) !== null) {
      highlightIndices.push({ start: match.index, end: match.index + match[0].length });
      // 防止无限循环
      if (match[0].length === 0) {
        regexIgnoreCase.lastIndex++;
      }
    }
  }
  
  // 如果还是没有找到匹配，返回原音标
  if (highlightIndices.length === 0) {
    return [{ text: phonetic, highlight: false }];
  }
  
  // 合并重叠的区间
  const mergedIndices = [];
  highlightIndices.sort((a, b) => a.start - b.start);
  for (const range of highlightIndices) {
    if (mergedIndices.length === 0 || mergedIndices[mergedIndices.length - 1].end < range.start) {
      mergedIndices.push({ start: range.start, end: range.end });
    } else {
      mergedIndices[mergedIndices.length - 1].end = Math.max(
        mergedIndices[mergedIndices.length - 1].end,
        range.end
      );
    }
  }
  
  // 生成分段数据
  const parts = [];
  let lastIndex = 0;
  
  for (const range of mergedIndices) {
    // 添加高亮前的部分
    if (range.start > lastIndex) {
      parts.push({
        text: phoneticStr.substring(lastIndex, range.start),
        highlight: false
      });
    }
    // 添加高亮部分（使用原始大小写）
    parts.push({
      text: phoneticStr.substring(range.start, range.end),
      highlight: true
    });
    lastIndex = range.end;
  }
  
  // 添加剩余部分
  if (lastIndex < phoneticStr.length) {
    parts.push({
      text: phoneticStr.substring(lastIndex),
      highlight: false
    });
  }
  
  return parts;
}

module.exports = {
  analyzePhoneticType,
  generateHighlightedWord,
  generateHighlightedPhonetic
};

