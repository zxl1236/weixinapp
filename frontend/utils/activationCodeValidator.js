/**
 * 激活码验证工具（前端验证）
 * 不依赖后端，直接在前端验证激活码
 */

let activationCodes;
try {
  // 小程序环境不支持直接 require JSON 文件，使用 JS 模块
  activationCodes = require('./activationCodes.js');
} catch (error) {
  console.error('加载激活码列表失败:', error);
  // 使用默认的空列表
  activationCodes = { codes: [] };
}

class ActivationCodeValidator {
  constructor() {
    try {
      this.validCodes = new Set(activationCodes.codes.map(code => code.toUpperCase()));
    } catch (error) {
      console.error('初始化激活码列表失败:', error);
      this.validCodes = new Set();
    }
    this.loadUsedCodes();
  }

  /**
   * 从本地存储加载已使用的激活码
   */
  loadUsedCodes() {
    try {
      const usedCodesStr = wx.getStorageSync('usedActivationCodes');
      if (usedCodesStr) {
        this.usedCodes = new Set(JSON.parse(usedCodesStr));
      } else {
        this.usedCodes = new Set();
      }
    } catch (error) {
      console.error('加载已使用激活码失败:', error);
      this.usedCodes = new Set();
    }
  }

  /**
   * 保存已使用的激活码到本地存储
   */
  saveUsedCodes() {
    try {
      wx.setStorageSync('usedActivationCodes', JSON.stringify(Array.from(this.usedCodes)));
      return true;
    } catch (error) {
      console.error('保存已使用激活码失败:', error);
      return false;
    }
  }

  /**
   * 验证激活码
   * @param {string} code - 激活码
   * @returns {object} 验证结果 { valid: boolean, message: string }
   */
  verify(code) {
    if (!code || typeof code !== 'string') {
      return {
        valid: false,
        message: '请输入激活码'
      };
    }

    const upperCode = code.trim().toUpperCase();

    // 检查激活码格式（至少6个字符）
    if (upperCode.length < 6) {
      return {
        valid: false,
        message: '激活码格式不正确'
      };
    }

    // 检查激活码是否存在
    if (!this.validCodes.has(upperCode)) {
      return {
        valid: false,
        message: '激活码不存在'
      };
    }

    // 检查激活码是否已被使用
    if (this.usedCodes.has(upperCode)) {
      return {
        valid: false,
        message: '激活码已被使用'
      };
    }

    return {
      valid: true,
      message: '激活码有效',
      code: upperCode
    };
  }

  /**
   * 使用激活码（标记为已使用）
   * @param {string} code - 激活码
   * @returns {boolean} 是否成功标记
   */
  useCode(code) {
    const upperCode = code.trim().toUpperCase();
    
    // 先验证激活码
    const verifyResult = this.verify(upperCode);
    if (!verifyResult.valid) {
      return false;
    }

    // 标记为已使用
    this.usedCodes.add(upperCode);
    return this.saveUsedCodes();
  }

  /**
   * 检查激活码是否已被使用
   * @param {string} code - 激活码
   * @returns {boolean}
   */
  isUsed(code) {
    const upperCode = code.trim().toUpperCase();
    return this.usedCodes.has(upperCode);
  }

  /**
   * 获取已使用的激活码列表
   * @returns {Array<string>}
   */
  getUsedCodes() {
    return Array.from(this.usedCodes);
  }

  /**
   * 清除所有已使用的激活码记录（仅用于测试）
   */
  clearUsedCodes() {
    this.usedCodes.clear();
    try {
      wx.removeStorageSync('usedActivationCodes');
      return true;
    } catch (error) {
      console.error('清除已使用激活码失败:', error);
      return false;
    }
  }
}

// 创建单例实例
const activationCodeValidator = new ActivationCodeValidator();

module.exports = {
  activationCodeValidator
};

