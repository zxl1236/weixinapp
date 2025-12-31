/**
 * SQLite 用户模型
 */

class UserQuery {
  constructor(model, query = {}) {
    this.model = model;
    this.query = query;
    this._sort = null;
    this._skip = null;
    this._limit = null;
  }

  sort(sortSpec = {}) {
    this._sort = sortSpec;
    return this;
  }

  skip(skip = 0) {
    this._skip = skip;
    return this;
  }

  limit(limit = null) {
    this._limit = limit;
    return this;
  }

  async exec() {
    const { sql, params } = this.model._buildSelectQuery(this.query, {
      sort: this._sort,
      skip: this._skip,
      limit: this._limit
    });
    const rows = await this.model.db.all(sql, params);
    return rows.map(row => this.model._formatUser(row));
  }

  then(resolve, reject) {
    return this.exec().then(resolve, reject);
  }

  catch(reject) {
    return this.exec().catch(reject);
  }
}

class User {
  constructor(db) {
    this.db = db;
  }

  /**
   * 查找或创建用户
   */
  async findOrCreate(openid, userData = {}) {
    let user = await this.findOne({ openid });
    
    if (!user) {
      const today = new Date();
      const dateStr = `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}-${today.getDate().toString().padStart(2, '0')}`;
      
      const result = await this.db.run(
        `INSERT INTO users (openid, nickname, avatar, dailyUsageDate, lastActiveTime, isActivated) 
         VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, ?)`,
        [
          openid,
          userData.nickname || '',
          userData.avatar || '',
          dateStr,
          userData.isActivated ? 1 : 0
        ]
      );
      
      user = await this.findById(result.lastID);
    } else {
      // 更新用户信息
      const updates = [];
      const params = [];
      
      if (userData.nickname) {
        updates.push('nickname = ?');
        params.push(userData.nickname);
      }
      if (userData.avatar) {
        updates.push('avatar = ?');
        params.push(userData.avatar);
      }
      updates.push('lastActiveTime = CURRENT_TIMESTAMP');
      params.push(user.id);
      
      await this.db.run(
        `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
        params
      );
      
      user = await this.findById(user.id);
    }
    
    return user;
  }

  /**
   * 根据ID查找
   */
  async findById(id) {
    const row = await this.db.get('SELECT * FROM users WHERE id = ?', [id]);
    return this._formatUser(row);
  }

  /**
   * 查找单个用户
   */
  async findOne(query) {
    if (query.openid) {
      const row = await this.db.get('SELECT * FROM users WHERE openid = ?', [query.openid]);
      return this._formatUser(row);
    }
    if (query._id || query.id) {
      const id = query._id || query.id;
      return await this.findById(id);
    }
    return null;
  }

  /**
   * 查找多个用户（支持排序/分页）
   */
  find(query = {}) {
    return new UserQuery(this, query);
  }

  /**
   * 创建用户
   */
  async create(data) {
    const today = new Date();
    const dateStr = `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}-${today.getDate().toString().padStart(2, '0')}`;
    
    const result = await this.db.run(
      `INSERT INTO users (openid, nickname, avatar, membership, membershipExpireTime, dailyUsageDate, totalTestCount, isActivated) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.openid,
        data.nickname || '',
        data.avatar || '',
        data.membership || 'free',
        data.membershipExpireTime || null,
        dateStr,
        data.totalTestCount || 0,
        data.isActivated ? 1 : 0
      ]
    );
    
    return await this.findById(result.lastID);
  }

  /**
   * 统计文档数量
   */
  async countDocuments(query = {}) {
    const { sql, params } = this._buildCountQuery(query);
    const row = await this.db.get(sql, params);
    return row?.count || 0;
  }

  /**
   * 更新用户
   */
  async findByIdAndUpdate(id, update, options = {}) {
    const updates = [];
    const params = [];
    
    Object.keys(update).forEach(key => {
      if (key === '$set') {
        Object.keys(update.$set).forEach(k => {
          updates.push(`${k} = ?`);
          params.push(update.$set[k]);
        });
      } else if (key !== '_id' && key !== 'id') {
        updates.push(`${key} = ?`);
        params.push(update[key]);
      }
    });
    
    if (updates.length === 0) {
      return await this.findById(id);
    }
    
    params.push(id);
    await this.db.run(
      `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
      params
    );
    
    if (options.new !== false) {
      return await this.findById(id);
    }
  }

  /**
   * 更新用户（Mongoose兼容方法）
   */
  async updateOne(query, update) {
    const user = await this.findOne(query);
    if (!user) {
      return { matchedCount: 0, modifiedCount: 0 };
    }
    
    await this.findByIdAndUpdate(user.id, update);
    return { matchedCount: 1, modifiedCount: 1 };
  }

  /**
   * 格式化用户数据
   */
  _formatUser(row) {
    if (!row) return null;
    
    // 安全地转换日期，处理 null/undefined 情况
    const safeDate = (dateStr) => {
      if (!dateStr) return null;
      const date = new Date(dateStr);
      return isNaN(date.getTime()) ? null : date;
    };
    
    const user = {
      _id: row.id,
      id: row.id,
      openid: row.openid,
      nickname: row.nickname || '',
      avatar: row.avatar || '',
      membership: row.membership || 'free',
      membershipExpireTime: safeDate(row.membershipExpireTime),
      dailyUsage: {
        date: row.dailyUsageDate || null,
        testCount: row.dailyUsageTestCount || 0
      },
      totalTestCount: row.totalTestCount || 0,
      registerTime: safeDate(row.registerTime) || new Date(),
      lastActiveTime: safeDate(row.lastActiveTime) || new Date(),
      isActivated: row.isActivated === 1,
      activatedAt: safeDate(row.activatedAt),
      createdAt: safeDate(row.createdAt) || new Date(),
      updatedAt: safeDate(row.updatedAt) || new Date(),
      // 方法
      checkMembershipExpired: function() {
        if (this.membership === 'premium' && this.membershipExpireTime) {
          return new Date() > this.membershipExpireTime;
        }
        return false;
      },
      updateLastActive: async function() {
        const db = this.db || user.db;
        if (db) {
          await db.run(
            'UPDATE users SET lastActiveTime = CURRENT_TIMESTAMP WHERE id = ?',
            [this.id]
          );
        }
        this.lastActiveTime = new Date();
        return this;
      },
      save: async function() {
        // SQLite 需要显式 UPDATE，不能像 Mongoose 一样自动持久化
        const db = this.db || user.db;
        if (!db) return this;

        const toIsoOrNull = (v) => {
          if (!v) return null;
          if (v instanceof Date) return isNaN(v.getTime()) ? null : v.toISOString();
          const d = new Date(v);
          return isNaN(d.getTime()) ? null : d.toISOString();
        };

        const membershipExpireTime = toIsoOrNull(this.membershipExpireTime);
        const activatedAt = toIsoOrNull(this.activatedAt);
        const lastActiveTime = toIsoOrNull(this.lastActiveTime) || new Date().toISOString();

        await db.run(
          `UPDATE users SET 
            nickname = ?, 
            avatar = ?, 
            membership = ?, 
            membershipExpireTime = ?, 
            dailyUsageDate = ?, 
            dailyUsageTestCount = ?, 
            totalTestCount = ?, 
            lastActiveTime = ?, 
            isActivated = ?, 
            activatedAt = ?
           WHERE id = ?`,
          [
            this.nickname || '',
            this.avatar || '',
            this.membership || 'free',
            membershipExpireTime,
            (this.dailyUsage && this.dailyUsage.date) ? this.dailyUsage.date : null,
            (this.dailyUsage && typeof this.dailyUsage.testCount === 'number') ? this.dailyUsage.testCount : 0,
            typeof this.totalTestCount === 'number' ? this.totalTestCount : 0,
            lastActiveTime,
            this.isActivated ? 1 : 0,
            activatedAt,
            this.id
          ]
        );

        // 让内存对象保持一致
        this.membershipExpireTime = membershipExpireTime ? new Date(membershipExpireTime) : null;
        this.activatedAt = activatedAt ? new Date(activatedAt) : null;
        this.lastActiveTime = lastActiveTime ? new Date(lastActiveTime) : new Date();

        return this;
      }
    };
    
    // 将 db 实例附加到 user 对象，供方法使用
    user.db = this.db;
    
    // 重新绑定方法，确保 this 指向 user 对象
    const self = this;
    user.updateLastActive = async function() {
      await self.db.run(
        'UPDATE users SET lastActiveTime = CURRENT_TIMESTAMP WHERE id = ?',
        [this.id]
      );
      this.lastActiveTime = new Date();
      return this;
    };
    
    return user;
  }

  /**
   * 构建查询语句
   */
  _buildSelectQuery(query = {}, options = {}) {
    let sql = 'SELECT * FROM users';
    const buildResult = this._buildWhereClause(query);
    sql += buildResult.where;

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
      sql += ' ORDER BY createdAt DESC';
    }

    if (options.limit != null) {
      sql += ' LIMIT ?';
      buildResult.params.push(parseInt(options.limit, 10));
    }

    if (options.skip) {
      if (options.limit == null) {
        // SQLite requires LIMIT with OFFSET, use a large LIMIT when only OFFSET specified
        sql += ' LIMIT -1';
      }
      sql += ' OFFSET ?';
      buildResult.params.push(parseInt(options.skip, 10));
    }

    return { sql, params: buildResult.params };
  }

  _buildCountQuery(query = {}) {
    let sql = 'SELECT COUNT(*) as count FROM users';
    const { where, params } = this._buildWhereClause(query);
    sql += where;
    return { sql, params };
  }

  _buildWhereClause(query = {}) {
    const clauses = [];
    const params = [];

    if (query.membership) {
      clauses.push('membership = ?');
      params.push(query.membership);
    }

    if (query.openid && typeof query.openid === 'string') {
      clauses.push('openid = ?');
      params.push(query.openid);
    }

    if (query.nickname && typeof query.nickname === 'string') {
      clauses.push('nickname = ?');
      params.push(query.nickname);
    }

    if (Array.isArray(query.$or)) {
      const orClauses = [];
      query.$or.forEach(condition => {
        const [field, spec] = Object.entries(condition)[0] || [];
        if (!field || !spec) return;

        if (spec && typeof spec === 'object' && spec.$regex) {
          const likeValue = `%${spec.$regex}%`;
          if (field === 'openid') {
            orClauses.push('openid LIKE ?');
            params.push(likeValue);
          } else if (field === 'nickname') {
            orClauses.push('nickname LIKE ?');
            params.push(likeValue);
          }
        } else if (typeof spec === 'string') {
          if (field === 'openid') {
            orClauses.push('openid = ?');
            params.push(spec);
          } else if (field === 'nickname') {
            orClauses.push('nickname = ?');
            params.push(spec);
          }
        }
      });
      if (orClauses.length) {
        clauses.push(`(${orClauses.join(' OR ')})`);
      }
    }

    const where = clauses.length ? ` WHERE ${clauses.join(' AND ')}` : '';
    return { where, params };
  }

  _mapFieldToColumn(field) {
    const mapping = {
      createdAt: 'createdAt',
      updatedAt: 'updatedAt',
      nickname: 'nickname',
      openid: 'openid',
      membership: 'membership',
      registerTime: 'registerTime'
    };
    return mapping[field] || field;
  }
}

module.exports = User;

