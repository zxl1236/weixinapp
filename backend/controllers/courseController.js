/**
 * 课程控制器
 */

const { Course } = require('../models');
const logger = require('../utils/logger');

/**
 * 获取所有课程列表
 */
async function getCourses(req, res, next) {
  try {
    const { stage, enabled } = req.query;
    
    const query = {};
    if (stage) query.stage = stage;
    if (enabled !== undefined) query.enabled = enabled === 'true';

    const courses = await Course.find(query).sort({ level: 1, gradeId: 1 });

    res.json({
      success: true,
      data: courses
    });
  } catch (error) {
    logger.error('获取课程列表失败', error);
    next(error);
  }
}

/**
 * 获取指定课程详情
 */
async function getCourse(req, res, next) {
  try {
    const { gradeId } = req.params;

    const course = await Course.findOne({ gradeId });

    if (!course) {
      return res.status(404).json({
        success: false,
        message: '课程不存在'
      });
    }

    res.json({
      success: true,
      data: course
    });
  } catch (error) {
    logger.error('获取课程详情失败', error);
    next(error);
  }
}

/**
 * 创建课程
 */
async function createCourse(req, res, next) {
  try {
    const courseData = req.body;

    // 检查是否已存在
    const existing = await Course.findOne({ gradeId: courseData.gradeId });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: '课程已存在'
      });
    }

    const course = await Course.create(courseData);

    res.status(201).json({
      success: true,
      data: course
    });
  } catch (error) {
    logger.error('创建课程失败', error);
    next(error);
  }
}

/**
 * 更新课程
 */
async function updateCourse(req, res, next) {
  try {
    const { gradeId } = req.params;
    const updateData = req.body;

    const course = await Course.findOneAndUpdate(
      { gradeId },
      updateData,
      { new: true, runValidators: true }
    );

    if (!course) {
      return res.status(404).json({
        success: false,
        message: '课程不存在'
      });
    }

    res.json({
      success: true,
      data: course
    });
  } catch (error) {
    logger.error('更新课程失败', error);
    next(error);
  }
}

/**
 * 删除课程
 */
async function deleteCourse(req, res, next) {
  try {
    const { gradeId } = req.params;

    const course = await Course.findOneAndDelete({ gradeId });

    if (!course) {
      return res.status(404).json({
        success: false,
        message: '课程不存在'
      });
    }

    res.json({
      success: true,
      message: '课程删除成功'
    });
  } catch (error) {
    logger.error('删除课程失败', error);
    next(error);
  }
}

module.exports = {
  getCourses,
  getCourse,
  createCourse,
  updateCourse,
  deleteCourse
};

