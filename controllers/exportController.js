/**
 * 导出控制器
 * 处理PDF导出等功能
 */

const PDFDocument = require('pdfkit');
const axios = require('axios');
const logger = require('../utils/logger');

// CDN基础URL（与前端保持一致）
const CDN_BASE = 'https://wex-1344106734.cos.ap-shanghai.myqcloud.com/Words';

/**
 * 从CDN加载年级单词数据
 */
async function loadGradeWords(gradeId) {
  try {
    // 构建CDN URL
    const gradePrefix = gradeId.startsWith('grade') ? gradeId : `grade${gradeId}`;
    const url = `${CDN_BASE}/${gradePrefix}.json`;
    
    logger.info('从CDN加载单词数据', { gradeId, url });
    
    const response = await axios.get(url, {
      timeout: 15000,
      headers: {
        'Cache-Control': 'no-cache'
      }
    });

    if (response.status === 200 && response.data) {
      // 解包数据：支持数组或对象格式
      let words = response.data;
      if (words.words) words = words.words;
      if (words.list) words = words.list;
      if (words.data) words = words.data;
      
      if (Array.isArray(words) && words.length > 0) {
        return words;
      }
    }
    
    throw new Error('数据格式错误或为空');
  } catch (error) {
    logger.error('从CDN加载单词数据失败', { gradeId, error: error.message });
    throw error;
  }
}

/**
 * 导出单词列表为PDF
 */
async function exportWordsToPDF(req, res, next) {
  try {
    const { gradeId } = req.query;
    
    if (!gradeId) {
      return res.status(400).json({
        success: false,
        message: '缺少年级ID参数'
      });
    }

    logger.info('开始生成PDF', { gradeId });

    // 加载单词数据
    let words = await loadGradeWords(gradeId);
    
    // 按序号排序
    words.sort((a, b) => {
      const serialA = parseInt(a.serialNumber || 0);
      const serialB = parseInt(b.serialNumber || 0);
      return serialA - serialB;
    });

    // 获取年级名称（从第一个单词或gradeId推断）
    const gradeName = words[0]?.gradeName || gradeId.replace('grade', '').replace('_', '年级') || '单词列表';

    // 创建PDF文档
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 50, bottom: 50, left: 50, right: 50 }
    });

    // 设置响应头
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(gradeName)}-单词表.pdf"`);

    // 将PDF流管道到响应
    doc.pipe(res);

    // 标题（使用系统字体以支持中文）
    doc.fontSize(24)
       .font('Helvetica-Bold')
       .text(gradeName + ' - 单词表', { align: 'center' });
    
    doc.moveDown(0.5);
    
    // 统计信息
    doc.fontSize(12)
       .font('Helvetica')
       .fillColor('#666666')
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
    doc.fontSize(10)
       .font('Helvetica-Bold')
       .fillColor('#000000');
    
    doc.rect(doc.page.margins.left, currentY, pageWidth, headerHeight)
       .fillAndStroke('#f0f0f0', '#cccccc');
    
    doc.text('序号', doc.page.margins.left + 5, currentY + 7, { width: colWidths.serial - 10 });
    doc.text('单词', doc.page.margins.left + colWidths.serial, currentY + 7, { width: colWidths.word - 10 });
    doc.text('音标', doc.page.margins.left + colWidths.serial + colWidths.word, currentY + 7, { width: colWidths.phonetic - 10 });
    doc.text('含义', doc.page.margins.left + colWidths.serial + colWidths.word + colWidths.phonetic, currentY + 7, { width: colWidths.meaning - 10 });
    
    currentY += headerHeight;

    // 单词列表
    doc.fontSize(9)
       .font('Helvetica')
       .fillColor('#000000');

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

    // 结束PDF
    doc.end();

    logger.info('PDF生成成功', { gradeId, wordCount: words.length });
  } catch (error) {
    logger.error('生成PDF失败', { error: error.message, stack: error.stack });
    
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: `生成PDF失败: ${error.message}`
      });
    } else {
      next(error);
    }
  }
}

module.exports = {
  exportWordsToPDF
};

