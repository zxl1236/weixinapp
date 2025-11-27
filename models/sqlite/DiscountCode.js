/**
 * SQLite 优惠码模型
 */

class DiscountCode {
  constructor(db) {
    this.db = db;
  }

  /**
   * 查找单个优惠码
   */
  async findOne(query) {
    let sql = 'SELECT * FROM discount_codes WHERE 1=1';
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
    return this._formatDiscountCode(row);
  }

  /**
   * 查找多个优惠码
   */
  async find(query = {}) {
    let sql = 'SELECT * FROM discount_codes WHERE 1=1';
    const params = [];
    
    if (query.code) {
      sql += ' AND UPPER(code) = UPPER(?)';
      params.push(query.code);
    }
    
    if (query.enabled !== undefined) {
      sql += ' AND enabled = ?';
      params.push(query.enabled ? 1 : 0);
    }
    
    sql += ' ORDER BY createdAt DESC';
    
    const rows = await this.db.all(sql, params);
    return rows.map(row => this._formatDiscountCode(row));
  }

  /**
   * 创建优惠码
   */
  async create(data) {
    const result = await this.db.run(
      `INSERT INTO discount_codes (code, discountAmount, discountPercent, type, maxUsage, validFrom, validUntil, enabled) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.code.toUpperCase(),
        data.discountAmount || 0,
        data.discountPercent || 0,
        data.type,
        data.maxUsage !== undefined ? data.maxUsage : -1,
        data.validFrom ? new Date(data.validFrom).toISOString() : new Date().toISOString(),
        new Date(data.validUntil).toISOString(),
        data.enabled !== false ? 1 : 0
      ]
    );
    
    return await this.findById(result.lastID);
  }

  /**
   * 根据ID查找
   */
  async findById(id) {
    const row = await this.db.get('SELECT * FROM discount_codes WHERE id = ?', [id]);
    return this._formatDiscountCode(row);
  }

  /**
   * 更新优惠码
   */
  async findByIdAndUpdate(id, update, options = {}) {
    const updates = [];
    const params = [];
    
    Object.keys(update).forEach(key => {
      if (key === '$set') {
        Object.keys(update.$set).forEach(k => {
          updates.push(`${k} = ?`);
          if (k === 'enabled') {
            params.push(update.$set[k] ? 1 : 0);
          } else if (k === 'validFrom' || k === 'validUntil') {
            params.push(new Date(update.$set[k]).toISOString());
          } else {
            params.push(update.$set[k]);
          }
        });
      } else if (key !== '_id' && key !== 'id') {
        if (key === 'enabled') {
          updates.push(`${key} = ?`);
          params.push(update[key] ? 1 : 0);
        } else if (key === 'validFrom' || key === 'validUntil') {
          updates.push(`${key} = ?`);
          params.push(new Date(update[key]).toISOString());
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
      `UPDATE discount_codes SET ${updates.join(', ')} WHERE id = ?`,
      params
    );
    
    if (options.new !== false) {
      return await this.findById(id);
    }
  }

  /**
   * 格式化优惠码数据
   */
  _formatDiscountCode(row) {
    if (!row) return null;
    
    const discountCode = {
      _id: row.id,
      id: row.id,
      code: row.code,
      discountAmount: row.discountAmount,
      discountPercent: row.discountPercent,
      type: row.type,
      maxUsage: row.maxUsage,
      usedCount: row.usedCount,
      validFrom: new Date(row.validFrom),
      validUntil: new Date(row.validUntil),
      enabled: row.enabled === 1,
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt),
      // 方法
      isValid: function() {
        const now = new Date();
        return this.enabled &&
               now >= this.validFrom &&
               now <= this.validUntil &&
               (this.maxUsage === -1 || this.usedCount < this.maxUsage);
      },
      calculateDiscount: function(originalAmount) {
        if (!this.isValid()) {
          return 0;
        }
        
        if (this.type === 'amount') {
          // 🔧 修复：数据库存储的是分，需要转换为元
          const discountAmountInYuan = this.discountAmount / 100;
          return Math.min(discountAmountInYuan, originalAmount);
        } else if (this.type === 'percent') {
          return Math.round(originalAmount * this.discountPercent / 100 * 100) / 100;
        }
        
        return 0;
      },
      use: async function() {
        if (this.maxUsage !== -1 && this.usedCount >= this.maxUsage) {
          throw new Error('优惠码使用次数已达上限');
        }
        
        await this.db.run(
          'UPDATE discount_codes SET usedCount = usedCount + 1 WHERE id = ?',
          [this.id]
        );
        this.usedCount += 1;
        return this;
      },
      save: async function() {
        return this;
      }
    };
    
    // 绑定 db 到方法
    discountCode.use = discountCode.use.bind({ db: this.db, ...discountCode });
    
    return discountCode;
  }
}

module.exports = DiscountCode;

