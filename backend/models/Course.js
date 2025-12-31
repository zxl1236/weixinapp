/**
 * 课程数据模型
 */

const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema({
  gradeId: {
    type: String,
    required: true,
    unique: true,
    index: true,
    trim: true
  },
  gradeName: {
    type: String,
    required: true
  },
  stage: {
    type: String,
    enum: ['primary', 'junior', 'senior'],
    required: true
  },
  level: {
    type: Number,
    required: true
  },
  targetWords: {
    type: Number,
    default: 0
  },
  description: {
    type: String,
    default: ''
  },
  enabled: {
    type: Boolean,
    default: true
  },
  wordCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// 索引
courseSchema.index({ gradeId: 1 });
courseSchema.index({ stage: 1 });
courseSchema.index({ level: 1 });
courseSchema.index({ enabled: 1 });

const Course = mongoose.model('Course', courseSchema);

module.exports = Course;

