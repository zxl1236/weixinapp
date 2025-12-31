/**
 * SQLite 订单模型
 */

class OrderQuery {
  constructor(model, query = {}) {
    this.model = model;
    this.query = query;
    this._sort = null;
    this._skip = null;
    this._limit = null;
    this._populate = [];
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

  populate(field, select) {
    this._populate.push({ field, select });
    return this;
  }

  async exec() {
    const { sql, params } = this.model._buildSelectQuery(this.query, {
      sort: this._sort,
      skip: this._skip,
      limit: this._limit
    });
    const rows = await this.model.db.all(sql, params);
    let orders = rows.map(row => this.model._formatOrder(row));

    if (this._populate.length) {
      orders = await this.model._populateOrders(orders, this._populate);
    }

    return orders;
  }

  then(resolve, reject) {
    return this.exec().then(resolve, reject);
  }

  catch(reject) {
    return this.exec().catch(reject);
  }
}

class OrderDocumentQuery {
  constructor(model, finder, criteria) {
    this.model = model;
    this.finder = finder; // 'findById' | 'findOne'
    this.criteria = criteria;
    this._populate = [];
  }

  populate(field, select) {
    this._populate.push({ field, select });
    return this;
  }

  async exec() {
    const order =
      this.finder === 'findById'
        ? await this.model._findByIdRaw(this.criteria)
        : await this.model._findOneRaw(this.criteria);

    if (!order) {
      return null;
    }

    let formatted = this.model._formatOrder(order);

    if (this._populate.length) {
      const populated = await this.model._populateOrders([formatted], this._populate);
      formatted = populated[0] || null;
    }

    return formatted;
  }

  then(resolve, reject) {
    return this.exec().then(resolve, reject);
  }

  catch(reject) {
    return this.exec().catch(reject);
  }
}

class Order {
  constructor(db) {
    this.db = db;
  }

  /**
   * 生成订单号
   */
  static generateOrderId() {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `K12${timestamp}${random}`;
  }

  /**
   * 查找单个订单
   */
  findOne(query) {
    return new OrderDocumentQuery(this, 'findOne', query);
  }

  /**
   * 查找多个订单
   */
  find(query = {}) {
    return new OrderQuery(this, query);
  }

  /**
   * 创建订单
   */
  async create(data) {
    const expireTime = data.expireTime || new Date(Date.now() + 30 * 60 * 1000);
    
    const result = await this.db.run(
      `INSERT INTO orders (orderId, userId, openid, planId, planName, amount, originalAmount, discountAmount, discountCode, duration, status, expireTime) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.orderId,
        data.userId || null,
        data.openid,
        data.planId,
        data.planName,
        data.amount,
        data.originalAmount || 0,
        data.discountAmount || 0,
        data.discountCode || null,
        data.duration,
        data.status || 'pending',
        expireTime.toISOString()
      ]
    );
    
    return await this.findById(result.lastID);
  }

  /**
   * 根据ID查找
   */
  findById(id) {
    return new OrderDocumentQuery(this, 'findById', id);
  }

  /**
   * 更新订单
   */
  async findByIdAndUpdate(id, update, options = {}) {
    const updates = [];
    const params = [];
    
    Object.keys(update).forEach(key => {
      if (key === '$set') {
        Object.keys(update.$set).forEach(k => {
          updates.push(`${k} = ?`);
          if (k === 'paidTime' && update.$set[k]) {
            params.push(new Date(update.$set[k]).toISOString());
          } else {
            params.push(update.$set[k]);
          }
        });
      } else if (key !== '_id' && key !== 'id') {
        updates.push(`${key} = ?`);
        if (key === 'paidTime' && update[key]) {
          params.push(new Date(update[key]).toISOString());
        } else {
          params.push(update[key]);
        }
      }
    });
    
    if (updates.length === 0) {
      return await this.findById(id);
    }
    
    params.push(id);
    await this.db.run(
      `UPDATE orders SET ${updates.join(', ')} WHERE id = ?`,
      params
    );
    
    if (options.new !== false) {
      return await this.findById(id);
    }
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
   * 聚合（简化版，支持匹配与总和）
   */
  async aggregate(pipeline = []) {
    const matchStage = pipeline.find(stage => stage.$match);
    const groupStage = pipeline.find(stage => stage.$group);

    if (!groupStage) {
      return [];
    }

    const matchQuery = matchStage ? matchStage.$match : {};
    const { where, params } = this._buildWhereClause(matchQuery);
    let sql = `SELECT SUM(amount) as total FROM orders${where}`;
    const row = await this.db.get(sql, params);
    return [
      {
        _id: groupStage.$group._id ?? null,
        total: row?.total || 0
      }
    ];
  }

  /**
   * 格式化订单数据
   */
  _formatOrder(row) {
    if (!row) return null;
    
    const order = {
      _id: row.id,
      id: row.id,
      orderId: row.orderId,
      userId: row.userId,
      openid: row.openid,
      planId: row.planId,
      planName: row.planName,
      amount: row.amount,
      originalAmount: row.originalAmount,
      discountAmount: row.discountAmount,
      discountCode: row.discountCode,
      duration: row.duration,
      status: row.status,
      wxTransactionId: row.wxTransactionId,
      wxPrepayId: row.wxPrepayId,
      paidTime: row.paidTime ? new Date(row.paidTime) : null,
      expireTime: row.expireTime ? new Date(row.expireTime) : null,
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt),
      // 方法
      isExpired: function() {
        return this.expireTime && new Date() > this.expireTime;
      },
      markAsPaid: async function(transactionId) {
        await this.db.run(
          'UPDATE orders SET status = ?, wxTransactionId = ?, paidTime = CURRENT_TIMESTAMP WHERE id = ?',
          ['paid', transactionId, this.id]
        );
        this.status = 'paid';
        this.wxTransactionId = transactionId;
        this.paidTime = new Date();
        return this;
      },
      save: async function() {
        return this;
      }
    };
    
    // 绑定 db 到方法
    order.markAsPaid = order.markAsPaid.bind({ db: this.db, ...order });
    
    return order;
  }

  async _populateOrders(orders, populateConfigs = []) {
    if (!populateConfigs.length || !orders.length) {
      return orders;
    }

    let populatedOrders = orders;

    for (const config of populateConfigs) {
      if (config.field === 'userId') {
        const userIds = populatedOrders
          .map(order => order.userId)
          .filter(id => id);

        if (!userIds.length) continue;

        const uniqueIds = [...new Set(userIds)];
        const placeholders = uniqueIds.map(() => '?').join(', ');
        const selectFields = this._ensureUserIdIncluded(
          this._parseSelectFields(config.select, ['id', 'openid', 'nickname', 'avatar'])
        );
        const columns = selectFields.map(field => this._mapUserFieldToColumn(field));

        const rows = await this.db.all(
          `SELECT ${columns.join(', ')} FROM users WHERE id IN (${placeholders})`,
          uniqueIds
        );

        const userMap = new Map();
        rows.forEach(row => {
          const user = {};
          selectFields.forEach((field, idx) => {
            const column = columns[idx];
            if (column === 'id') {
              user._id = row[column];
              user.id = row[column];
            } else {
              user[field] = row[column];
            }
          });
          userMap.set(row.id, user);
        });

        populatedOrders = populatedOrders.map(order => ({
          ...order,
          userId: userMap.get(order.userId) || null
        }));
      }
    }

    return populatedOrders;
  }

  _parseSelectFields(select, fallback) {
    if (!select) {
      return fallback;
    }

    if (typeof select === 'string') {
      return select.split(/\s+/).filter(Boolean);
    }

    if (Array.isArray(select)) {
      return select;
    }

    return fallback;
  }

  _mapUserFieldToColumn(field) {
    const mapping = {
      id: 'id',
      _id: 'id',
      openid: 'openid',
      nickname: 'nickname',
      avatar: 'avatar'
    };
    return mapping[field] || field;
  }

  _ensureUserIdIncluded(fields = []) {
    if (!fields.includes('id') && !fields.includes('_id')) {
      return ['id', ...fields];
    }
    return fields;
  }

  _buildSelectQuery(query = {}, options = {}) {
    let sql = 'SELECT * FROM orders';
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
        sql += ' LIMIT -1';
      }
      sql += ' OFFSET ?';
      buildResult.params.push(parseInt(options.skip, 10));
    }

    return { sql, params: buildResult.params };
  }

  _buildCountQuery(query = {}) {
    let sql = 'SELECT COUNT(*) as count FROM orders';
    const { where, params } = this._buildWhereClause(query);
    sql += where;
    return { sql, params };
  }

  _buildWhereClause(query = {}) {
    const clauses = [];
    const params = [];

    if (query.orderId) {
      clauses.push('orderId = ?');
      params.push(query.orderId);
    }

    if (query._id || query.id) {
      clauses.push('id = ?');
      params.push(query._id || query.id);
    }

    if (query.openid) {
      clauses.push('openid = ?');
      params.push(query.openid);
    }

    if (query.userId) {
      clauses.push('userId = ?');
      params.push(query.userId);
    }

    if (query.status) {
      clauses.push('status = ?');
      params.push(query.status);
    }

    if (query.createdAt) {
      if (query.createdAt.$gte) {
        clauses.push('createdAt >= ?');
        params.push(new Date(query.createdAt.$gte).toISOString());
      }
      if (query.createdAt.$lte) {
        clauses.push('createdAt <= ?');
        params.push(new Date(query.createdAt.$lte).toISOString());
      }
    }

    const where = clauses.length ? ` WHERE ${clauses.join(' AND ')}` : '';
    return { where, params };
  }

  _mapFieldToColumn(field) {
    const mapping = {
      createdAt: 'createdAt',
      updatedAt: 'updatedAt',
      paidTime: 'paidTime',
      amount: 'amount'
    };
    return mapping[field] || field;
  }

  async _findByIdRaw(id) {
    return await this.db.get('SELECT * FROM orders WHERE id = ?', [id]);
  }

  async _findOneRaw(query = {}) {
    const { sql, params } = this._buildSelectQuery(query, { limit: 1 });
    return await this.db.get(sql, params);
  }
}

module.exports = Order;

