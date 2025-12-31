/**
 * SQLite 课程模型
 */

class CourseQuery {
  constructor(model, query = {}) {
    this.model = model;
    this.query = query;
    this._sort = null;
  }

  sort(sortSpec = {}) {
    this._sort = sortSpec;
    return this;
  }

  async exec() {
    const { sql, params } = this.model._buildSelectQuery(this.query, {
      sort: this._sort
    });
    const rows = await this.model.db.all(sql, params);
    return rows.map(row => this.model._formatCourse(row));
  }

  then(resolve, reject) {
    return this.exec().then(resolve, reject);
  }

  catch(reject) {
    return this.exec().catch(reject);
  }
}

class Course {
  constructor(db) {
    this.db = db;
  }

  /**
   * 查找单个课程
   */
  async findOne(query) {
    let sql = 'SELECT * FROM courses WHERE 1=1';
    const params = [];
    
    if (query.gradeId) {
      sql += ' AND gradeId = ?';
      params.push(query.gradeId);
    }
    
    if (query._id || query.id) {
      sql += ' AND id = ?';
      params.push(query._id || query.id);
    }
    
    const row = await this.db.get(sql, params);
    return this._formatCourse(row);
  }

  /**
   * 查找多个课程
   */
  find(query = {}) {
    return new CourseQuery(this, query);
  }

  /**
   * 创建课程
   */
  async create(data) {
    const result = await this.db.run(
      `INSERT INTO courses (gradeId, gradeName, stage, level, targetWords, description, enabled, wordCount) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.gradeId,
        data.gradeName,
        data.stage,
        data.level,
        data.targetWords || 0,
        data.description || '',
        data.enabled !== false ? 1 : 0,
        data.wordCount || 0
      ]
    );
    
    return await this.findById(result.lastID);
  }

  /**
   * 根据ID查找
   */
  async findById(id) {
    const row = await this.db.get('SELECT * FROM courses WHERE id = ?', [id]);
    return this._formatCourse(row);
  }

  /**
   * 更新课程
   */
  async findByIdAndUpdate(id, update, options = {}) {
    const updates = [];
    const params = [];
    
    Object.keys(update).forEach(key => {
      if (key === '$set') {
        Object.keys(update.$set).forEach(k => {
          if (k === 'enabled') {
            updates.push(`${k} = ?`);
            params.push(update.$set[k] ? 1 : 0);
          } else {
            updates.push(`${k} = ?`);
            params.push(update.$set[k]);
          }
        });
      } else if (key !== '_id' && key !== 'id') {
        if (key === 'enabled') {
          updates.push(`${key} = ?`);
          params.push(update[key] ? 1 : 0);
        } else {
          updates.push(`${key} = ?`);
          params.push(update[key]);
        }
      }
    });
    
    if (updates.length === 0) {
      return await this.findById(id);
    }
    
    params.push(id);
    await this.db.run(
      `UPDATE courses SET ${updates.join(', ')} WHERE id = ?`,
      params
    );
    
    if (options.new !== false) {
      return await this.findById(id);
    }
  }

  /**
   * 格式化课程数据
   */
  _formatCourse(row) {
    if (!row) return null;
    
    return {
      _id: row.id,
      id: row.id,
      gradeId: row.gradeId,
      gradeName: row.gradeName,
      stage: row.stage,
      level: row.level,
      targetWords: row.targetWords,
      description: row.description,
      enabled: row.enabled === 1,
      wordCount: row.wordCount,
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt),
      save: async function() {
        return this;
      }
    };
  }

  _buildSelectQuery(query = {}, options = {}) {
    let sql = 'SELECT * FROM courses';
    const clauses = [];
    const params = [];

    if (query.gradeId) {
      clauses.push('gradeId = ?');
      params.push(query.gradeId);
    }

    if (query.stage) {
      clauses.push('stage = ?');
      params.push(query.stage);
    }

    if (query.enabled !== undefined) {
      clauses.push('enabled = ?');
      params.push(query.enabled ? 1 : 0);
    }

    if (clauses.length) {
      sql += ` WHERE ${clauses.join(' AND ')}`;
    }

    if (options.sort) {
      const orderClauses = [];
      Object.keys(options.sort).forEach(key => {
        const direction = options.sort[key] === -1 ? 'DESC' : 'ASC';
        orderClauses.push(`${this._mapFieldToColumn(key)} ${direction}`);
      });
      if (orderClauses.length) {
        sql += ` ORDER BY ${orderClauses.join(', ')}`;
      }
    } else {
      sql += ' ORDER BY level ASC, gradeId ASC';
    }

    return { sql, params };
  }

  _mapFieldToColumn(field) {
    const mapping = {
      level: 'level',
      gradeId: 'gradeId',
      createdAt: 'createdAt',
      updatedAt: 'updatedAt'
    };
    return mapping[field] || field;
  }
}

module.exports = Course;

