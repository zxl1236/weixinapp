// 本地JSON文件静态映射 - 使用动态导入避免require问题
// 编译期可解析，小程序环境友好

const LOCAL_FILES = {
  'grade3_1': () => {
    try {
      // 优先加载JSON文件（最新数据，326个词汇）
      return require('./grade3_1.json');
    } catch (jsonError) {
      try {
        // 备用：尝试JS模块
        return require('./js-modules/grade3_1.js');
      } catch (e) {
        console.warn('本地文件 grade3_1 加载失败:', jsonError.message || e.message);
        return null;
      }
    }
  },
  'grade3_2': () => {
    try {
      return require('./js-modules/grade3_2.js');
    } catch (e) {
      try {
        return require('./grade3_2.json');
      } catch (jsonError) {
        console.warn('本地文件 grade3_2 加载失败:', e.message);
        return null;
      }
    }
  },
  'grade4_1': () => {
    try {
      return require('./js-modules/grade4_1.js');
    } catch (e) {
      try {
        return require('./grade4_1.json');
      } catch (jsonError) {
        console.warn('本地文件 grade4_1 加载失败:', e.message);
        return null;
      }
    }
  },
  'grade4_2': () => {
    try {
      return require('./js-modules/grade4_2.js');
    } catch (e) {
      try {
        return require('./grade4_2.json');
      } catch (jsonError) {
        console.warn('本地文件 grade4_2 加载失败:', e.message);
        return null;
      }
    }
  },
  'grade5_1': () => {
    try {
      return require('./js-modules/grade5_1.js');
    } catch (e) {
      try {
        return require('./grade5_1.json');
      } catch (jsonError) {
        console.warn('本地文件 grade5_1 加载失败:', e.message);
        return null;
      }
    }
  },
  'grade5_2': () => {
    try {
      return require('./js-modules/grade5_2.js');
    } catch (e) {
      try {
        return require('./grade5_2.json');
      } catch (jsonError) {
        console.warn('本地文件 grade5_2 加载失败:', e.message);
        return null;
      }
    }
  },
  'grade6_1': () => {
    try {
      return require('./js-modules/grade6_1.js');
    } catch (e) {
      try {
        return require('./grade6_1.json');
      } catch (jsonError) {
        console.warn('本地文件 grade6_1 加载失败:', e.message);
        return null;
      }
    }
  },
  'grade6_2': () => {
    try {
      return require('./js-modules/grade6_2.js');
    } catch (e) {
      try {
        return require('./grade6_2.json');
      } catch (jsonError) {
        console.warn('本地文件 grade6_2 加载失败:', e.message);
        return null;
      }
    }
  },
  'grade7_1': () => {
    try {
      // 优先使用最新的 JSON 数据
      return require('./grade7_1.json');
    } catch (jsonError) {
      try {
        // 兜底使用 JS 模块（旧版或精简数据）
        return require('./js-modules/grade7_1.js');
      } catch (e) {
        console.warn('本地文件 grade7_1 加载失败:', jsonError.message || e.message);
        return null;
      }
    }
  },
  'grade7_2': () => {
    try {
      return require('./grade7_2.json');
    } catch (jsonError) {
      try {
        return require('./js-modules/grade7_2.js');
      } catch (e) {
        console.warn('本地文件 grade7_2 加载失败:', jsonError.message || e.message);
        return null;
      }
    }
  },
  'grade8_1': () => {
    try {
      return require('./grade8_1.json');
    } catch (jsonError) {
      try {
        return require('./js-modules/grade8_1.js');
      } catch (e) {
        console.warn('本地文件 grade8_1 加载失败:', jsonError.message || e.message);
        return null;
      }
    }
  },
  'grade8_2': () => {
    try {
      return require('./js-modules/grade8_2.js');
    } catch (e) {
      try {
        return require('./grade8_2.json');
      } catch (jsonError) {
        console.warn('本地文件 grade8_2 加载失败:', e.message);
        return null;
      }
    }
  },
  'grade9_1': () => {
    try {
      return require('./js-modules/grade9_1.js');
    } catch (e) {
      try {
        return require('./grade9_1.json');
      } catch (jsonError) {
        console.warn('本地文件 grade9_1 加载失败:', e.message);
        return null;
      }
    }
  },
  'grade9_2': () => {
    try {
      return require('./js-modules/grade9_2.js');
    } catch (e) {
      try {
        return require('./grade9_2.json');
      } catch (jsonError) {
        console.warn('本地文件 grade9_2 加载失败:', e.message);
        return null;
      }
    }
  }
};

module.exports = {
  LOCAL_FILES
};
