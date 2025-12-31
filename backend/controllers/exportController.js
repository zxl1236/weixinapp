/**
 * 导出控制器
 * 处理PDF导出等功能
 */

const PDFDocument = require('pdfkit');
const axios = require('axios');
const logger = require('../utils/logger');
const path = require('path');
const fs = require('fs');

// 本地数据目录路径
const LOCAL_DATA_DIR = path.join(__dirname, '../../frontend/cdn-data/js-modules');

/**
 * 从本地文件加载年级单词数据
 */
async function loadGradeWords(gradeId) {
  try {
    // 构建本地文件路径
    const gradePrefix = gradeId.startsWith('grade') ? gradeId : `grade${gradeId}`;
    const filePath = path.join(__dirname, '../../frontend/cdn-data/js-modules', `${gradePrefix}.js`);

    logger.info('从本地文件加载单词数据', { gradeId, filePath });

    // 检查文件是否存在
    if (!fs.existsSync(filePath)) {
      throw new Error(`单词数据文件不存在: ${filePath}`);
    }

    // 动态加载JS模块
    delete require.cache[require.resolve(filePath)]; // 清除缓存，确保获取最新数据
    const gradeData = require(filePath);

    if (!gradeData || !gradeData.words) {
      throw new Error('单词数据格式错误：缺少words字段');
    }

    let words = gradeData.words;

    if (Array.isArray(words) && words.length > 0) {
      logger.info('成功加载单词数据', { gradeId, wordCount: words.length });
      return words;
    }

    throw new Error('单词数据为空或格式错误');
  } catch (error) {
    logger.error('从本地文件加载单词数据失败', { gradeId, error: error.message, stack: error.stack });
    throw error;
  }
}

/**
 * 导出单词列表为PDF
 */
async function exportWordsToPDF(req, res, next) {
  const { gradeId } = req.query;

  try {
    
    if (!gradeId) {
      return res.status(400).json({
        success: false,
        message: '缺少年级ID参数'
      });
    }

    logger.info('开始生成PDF', { gradeId });

    // 加载单词数据
    let words = await loadGradeWords(gradeId);
    logger.info('成功加载单词数据', { gradeId, wordCount: words.length });

    // 按序号排序
    words.sort((a, b) => {
      const serialA = parseInt(a.serialNumber || 0);
      const serialB = parseInt(b.serialNumber || 0);
      return serialA - serialB;
    });

    // 获取年级名称（从第一个单词或gradeId推断）
    const gradeName = words[0]?.gradeName || gradeId.replace('grade', '').replace('_', '年级') || '单词列表';
    logger.info('PDF信息', { gradeId, gradeName, wordCount: words.length });

    // 创建PDF文档
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 50, bottom: 50, left: 50, right: 50 },
      bufferPages: true // 启用页面缓冲以支持更好的字体处理
    });

    // 设置响应头
    res.setHeader('Content-Type', 'application/pdf');

    // 使用安全的英文文件名
    const safeFileName = `${gradeId.replace('grade', '')}-words`;
    res.setHeader('Content-Disposition', `attachment; filename="${safeFileName}.pdf"`);

    // 将PDF流管道到响应
    doc.pipe(res);

    // 设置错误处理，避免流写入错误
    let pdfError = null;
    doc.on('error', (error) => {
      pdfError = error;
      logger.error('PDF文档生成错误', { error: error.message });
    });

    // 暂时使用默认字体，避免字体兼容性问题
    const fontRegistered = false;

    // 标题
    doc.fontSize(24);
    if (fontRegistered) {
      doc.font('Chinese');
    } else {
      doc.font('Helvetica-Bold');
    }
    doc.text(gradeName + ' - 单词表', { align: 'center' });

    doc.moveDown(0.5);

    // 统计信息
    doc.fontSize(12);
    if (fontRegistered) {
      doc.font('Chinese');
    } else {
      doc.font('Helvetica');
    }
    doc.fillColor('#666666')
       .text(`共 ${words.length} 个单词`, { align: 'center' });
    
    doc.moveDown(1);

    // 设置表格样式
    const startY = doc.y;
    const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const colWidths = {
      serial: 50,
      word: 120,
      phonetic: 100,
      meaning: pageWidth - 270
    };

    let currentY = startY;
    const rowHeight = 30;
    const headerHeight = 25;

    // 表头
    doc.fontSize(10);
    if (fontRegistered) {
      doc.font('Chinese');
    } else {
      doc.font('Helvetica-Bold');
    }
    doc.fillColor('#000000');

    doc.rect(doc.page.margins.left, currentY, pageWidth, headerHeight)
       .fillAndStroke('#f0f0f0', '#cccccc');

    doc.text('序号', doc.page.margins.left + 5, currentY + 7, { width: colWidths.serial - 10 });
    doc.text('单词', doc.page.margins.left + colWidths.serial, currentY + 7, { width: colWidths.word - 10 });
    doc.text('音标', doc.page.margins.left + colWidths.serial + colWidths.word, currentY + 7, { width: colWidths.phonetic - 10 });
    doc.text('含义', doc.page.margins.left + colWidths.serial + colWidths.word + colWidths.phonetic, currentY + 7, { width: colWidths.meaning - 10 });
    
    currentY += headerHeight;

    // 单词列表
    doc.fontSize(9);
    if (fontRegistered) {
      doc.font('Chinese');
    } else {
      doc.font('Helvetica');
    }
    doc.fillColor('#000000');

    words.forEach((word, index) => {
      // 检查是否需要分页
      if (currentY + rowHeight > doc.page.height - doc.page.margins.bottom) {
        doc.addPage();
        currentY = doc.page.margins.top;
      }

      const serialNumber = word.serialNumber || (index + 1);
      const wordText = word.word || '';
      const phonetic = word.phonetic || '';
      const meaning = word.meaning || '';

      // 绘制行背景（交替颜色）
      if (index % 2 === 0) {
        doc.rect(doc.page.margins.left, currentY, pageWidth, rowHeight)
           .fill('#fafafa');
      }

      // 绘制边框
      doc.rect(doc.page.margins.left, currentY, pageWidth, rowHeight)
         .stroke('#e0e0e0');

      // 填充内容
      doc.text(String(serialNumber), doc.page.margins.left + 5, currentY + 8, { 
        width: colWidths.serial - 10,
        align: 'center'
      });
      
      doc.text(wordText, doc.page.margins.left + colWidths.serial, currentY + 8, { 
        width: colWidths.word - 10 
      });
      
      doc.text(phonetic, doc.page.margins.left + colWidths.serial + colWidths.word, currentY + 8, { 
        width: colWidths.phonetic - 10 
      });
      
      // 含义可能较长，需要换行处理
      doc.text(meaning, doc.page.margins.left + colWidths.serial + colWidths.word + colWidths.phonetic, currentY + 8, { 
        width: colWidths.meaning - 10,
        ellipsis: true
      });

      currentY += rowHeight;
    });

    // 检查是否有PDF生成错误
    if (pdfError) {
      throw pdfError;
    }

    // 结束PDF
    doc.end();

    logger.info('PDF生成成功', { gradeId, wordCount: words.length, gradeName });
  } catch (error) {
    logger.error('生成PDF失败', {
      error: error.message,
      stack: error.stack,
      gradeId: gradeId || 'unknown',
      errorType: error.constructor.name
    });

    if (!res.headersSent) {
      let statusCode = 500;
      let errorMessage = '生成PDF失败';

      // 根据错误类型返回不同的状态码和消息
      if (error.message && error.message.includes('数据格式错误')) {
        statusCode = 404;
        errorMessage = '未找到单词数据，请确认年级信息是否正确';
      } else if (error.message && error.message.includes('timeout')) {
        statusCode = 408;
        errorMessage = '数据加载超时，请稍后重试';
      } else if (error.message && error.message.includes('网络')) {
        statusCode = 503;
        errorMessage = '网络服务暂时不可用，请稍后重试';
      } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
        statusCode = 503;
        errorMessage = '无法连接到数据服务，请稍后重试';
      }

      res.status(statusCode).json({
        success: false,
        message: errorMessage,
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    } else {
      next(error);
    }
  }
}

module.exports = {
  exportWordsToPDF
};

