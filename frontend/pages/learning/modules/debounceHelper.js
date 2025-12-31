// 防抖辅助函数模块

/**
 * 防抖辅助函数模块
 * @param {Object} page - 页面实例
 * @returns {Object} - 模块方法对象
 */
function createDebounceHelperModule(page) {
  return {
    // 防抖检查：防止快速重复点击
    canPerformAction(actionName = 'default', minInterval = 800) {
      const now = Date.now();
      const timeSinceLastAction = now - page.data.lastActionTime;
      
      if (page.data.isProcessing) {
        return false;
      }
      
      if (page.data.isTransitioning) {
        return false;
      }
      
      if (timeSinceLastAction < minInterval) {
        return false;
      }
      
      // 设置防抖状态
      page.setData({ 
        isProcessing: true,
        lastActionTime: now 
      });

      return true;
    },
    
    // 重置防抖状态
    resetActionState() {
      page.setData({ isProcessing: false });
    },

    // 批量更新数据，减少setData调用次数
    batchUpdateData(updates) {
      // 合并所有更新到一次setData调用中
      page.setData(updates);
    }
  };
}

module.exports = createDebounceHelperModule;

