/**
 * 日志工具
 */

const logLevels = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3
};

const currentLevel = process.env.LOG_LEVEL || 'INFO';

function log(level, message, data = {}) {
  const levelNum = logLevels[level] || 2;
  const currentLevelNum = logLevels[currentLevel] || 2;
  
  if (levelNum <= currentLevelNum) {
    const timestamp = new Date().toISOString();
    const logData = {
      timestamp,
      level,
      message,
      ...data
    };
    
    if (level === 'ERROR') {
      console.error(`[${timestamp}] ${level}: ${message}`, data);
    } else if (level === 'WARN') {
      console.warn(`[${timestamp}] ${level}: ${message}`, data);
    } else {
      console.log(`[${timestamp}] ${level}: ${message}`, data);
    }
  }
}

module.exports = {
  error: (message, data) => log('ERROR', message, data),
  warn: (message, data) => log('WARN', message, data),
  info: (message, data) => log('INFO', message, data),
  debug: (message, data) => log('DEBUG', message, data)
};

