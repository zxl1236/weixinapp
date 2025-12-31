/**
 * SQLite 激活码模型
 */

class ActivationCode {
  constructor(db) {
    this.db = db;
  }

  /**
   * 查找单个激活码
   */
  async findOne(query) {
    let sql = 'SELECT * FROM activation_codes WHERE 1=1';
    const params = [];
    
    if (query.code) {
      sql += ' AND UPPER(code) = UPPER(?)';
      params.push(query.code);
    }
    
    if (query._id || query.id) {
      sql += ' AND id = ?';
      params.push(query._id || query.id);
    }
    
    const row = await this.db.get(sql, params);
    return this._formatActivationCode(row);
  }

  /**
   * 查找多个激活码
   */
  async find(query = {}) {
    let sql = 'SELECT * FROM activation_codes WHERE 1=1';
    const params = [];
    
    if (query.code) {
      sql += ' AND UPPER(code) = UPPER(?)';
      params.push(query.code);
    }
    
    if (query.used !== undefined) {
      sql += ' AND used = ?';
      params.push(query.used ? 1 : 0);
    }
    
    sql += ' ORDER BY createdAt DESC';
    
    const rows = await this.db.all(sql, params);
    return rows.map(row => this._formatActivationCode(row));
  }

  /**
   * 创建激活码
   */
  async create(data) {
    const result = await this.db.run(
      `INSERT INTO activation_codes (code, used, usedBy, usedAt) 
       VALUES (?, ?, ?, ?)`,
      [
        data.code.toUpperCase(),
        data.used ? 1 : 0,
        data.usedBy || null,
        data.usedAt ? new Date(data.usedAt).toISOString() : null
      ]
    );
    
    return await this.findById(result.lastID);
  }

  /**
   * 根据ID查找
   */
  async findById(id) {
    const row = await this.db.get('SELECT * FROM activation_codes WHERE id = ?', [id]);
    return this._formatActivationCode(row);
  }

  /**
   * 更新激活码
   */
  async findByIdAndUpdate(id, update, options = {}) {
    const updates = [];
    const params = [];
    
    Object.keys(update).forEach(key => {
      if (key === '$set') {
        Object.keys(update.$set).forEach(k => {
          updates.push(`${k} = ?`);
          if (k === 'used') {
            params.push(update.$set[k] ? 1 : 0);
          } else if (k === 'usedAt') {
            params.push(update.$set[k] ? new Date(update.$set[k]).toISOString() : null);
          } else {
            params.push(update.$set[k]);
          }
        });
      } else if (key !== '_id' && key !== 'id') {
        if (key === 'used') {
          updates.push(`${key} = ?`);
          params.push(update[key] ? 1 : 0);
        } else if (key === 'usedAt') {
          updates.push(`${key} = ?`);
          params.push(update[key] ? new Date(update[key]).toISOString() : null);
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
      `UPDATE activation_codes SET ${updates.join(', ')} WHERE id = ?`,
      params
    );
    
    if (options.new !== false) {
      return await this.findById(id);
    }
  }

  /**
   * 格式化激活码数据
   */
  _formatActivationCode(row) {
    if (!row) return null;
    
    const activationCode = {
      _id: row.id,
      id: row.id,
      code: row.code,
      used: row.used === 1,
      usedBy: row.usedBy || null,
      usedAt: row.usedAt ? new Date(row.usedAt) : null,
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt),
      // 方法
      isValid: function() {
        return !this.used;
      },
      use: async function(openid) {
        if (this.used) {
          throw new Error('激活码已被使用');
        }
        
        const db = this.db || activationCode.db;
        await db.run(
          'UPDATE activation_codes SET used = 1, usedBy = ?, usedAt = CURRENT_TIMESTAMP WHERE id = ?',
          [openid, this.id]
        );
        this.used = true;
        this.usedBy = openid;
        this.usedAt = new Date();
        return this;
      },
      save: async function() {
        return this;
      }
    };
    
    // 绑定 db 到对象
    activationCode.db = this.db;
    
    return activationCode;
  }
}

module.exports = ActivationCode;

