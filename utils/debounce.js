/**
 * 简单的按钮防抖处理器
 * 专门用于微信小程序按钮点击防抖
 */
function createButtonDebouncer() {
  var lastClickTimes = {};
  
  return {
    /**
     * 检查是否可以执行点击
     * @param {string} buttonId 按钮唯一标识
     * @param {number} delay 防抖延迟时间，默认500ms
     * @returns {boolean} 是否可以执行
     */
    canClick: function(buttonId, delay) {
      delay = delay || 500;
      var now = Date.now();
      var lastTime = lastClickTimes[buttonId] || 0;
      
      if (now - lastTime < delay) {
        return false; // 还在防抖期内
      }
      
      lastClickTimes[buttonId] = now;
      return true;
    },
    
    /**
     * 执行带防抖的点击处理
     * @param {string} buttonId 按钮唯一标识
     * @param {Function} callback 点击回调函数
     * @param {number} delay 防抖延迟时间，默认500ms
     */
    handleClick: function(buttonId, callback, delay) {
      if (this.canClick(buttonId, delay)) {
        callback();
      }
    },
    
    /**
     * 重置特定按钮的防抖状态
     * @param {string} buttonId 按钮唯一标识
     */
    reset: function(buttonId) {
      delete lastClickTimes[buttonId];
    },
    
    /**
     * 重置所有按钮的防抖状态
     */
    resetAll: function() {
      lastClickTimes = {};
    }
  };
}

// 创建全局按钮防抖实例
var buttonDebouncer = createButtonDebouncer();

module.exports = {
  buttonDebouncer: buttonDebouncer
};
