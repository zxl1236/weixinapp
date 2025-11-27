// 管理后台JavaScript

let apiKey = localStorage.getItem('admin_api_key') || '';

// 设置API密钥
function setApiKey() {
    const key = document.getElementById('apiKey').value.trim();
    if (key) {
        apiKey = key;
        localStorage.setItem('admin_api_key', key);
        alert('API密钥已设置');
    }
}

// 加载时恢复API密钥
if (apiKey) {
    document.getElementById('apiKey').value = apiKey;
}

// API请求函数
async function apiRequest(url, options = {}) {
    if (!apiKey) {
        alert('请先设置API密钥');
        return null;
    }

    const response = await fetch(`/api/admin${url}`, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            'X-API-Key': apiKey,
            ...options.headers
        }
    });

    if (!response.ok) {
        const error = await response.json();
        alert(error.message || '请求失败');
        return null;
    }

    return await response.json();
}

// Tab切换
function showTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });

    document.getElementById(`${tabName}-tab`).classList.add('active');
    event.target.classList.add('active');

    // 加载对应数据
    if (tabName === 'stats') {
        loadStats();
    } else if (tabName === 'users') {
        loadUsers();
    } else if (tabName === 'courses') {
        loadCourses();
    } else if (tabName === 'orders') {
        loadOrders();
    } else if (tabName === 'discount') {
        loadDiscountCodes();
    }
}

// 加载统计数据
async function loadStats() {
    const result = await apiRequest('/stats');
    if (result && result.success) {
        const data = result.data;
        document.getElementById('totalUsers').textContent = data.users.total;
        document.getElementById('premiumUsers').textContent = data.users.premium;
        document.getElementById('totalOrders').textContent = data.orders.total;
        document.getElementById('totalRevenue').textContent = `¥${(data.orders.revenue / 100).toFixed(2)}`;

        // 显示最近订单
        const tbody = document.querySelector('#recentOrdersTable tbody');
        tbody.innerHTML = data.recentOrders.map(order => `
            <tr>
                <td>${order.orderId}</td>
                <td>${order.userId?.nickname || order.userId?.openid || '-'}</td>
                <td>¥${(order.amount / 100).toFixed(2)}</td>
                <td><span class="status-badge status-${order.status}">${getStatusText(order.status)}</span></td>
                <td>${new Date(order.paidTime).toLocaleString()}</td>
            </tr>
        `).join('');
    }
}

// 加载用户列表
let currentUserPage = 1;
async function loadUsers(page = 1) {
    currentUserPage = page;
    const keyword = document.getElementById('userSearch').value;
    const membership = document.getElementById('membershipFilter').value;

    const params = new URLSearchParams({
        page,
        limit: 20,
        ...(keyword && { keyword }),
        ...(membership && { membership })
    });

    const result = await apiRequest(`/users?${params}`);
    if (result && result.success) {
        const tbody = document.querySelector('#usersTable tbody');
        tbody.innerHTML = result.data.users.map(user => {
            // 格式化日期时间
            const formatDateTime = (date) => {
                if (!date) return '-';
                const d = new Date(date);
                return d.toLocaleString('zh-CN', { 
                    year: 'numeric', 
                    month: '2-digit', 
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit'
                });
            };
            
            // 格式化日期
            const formatDate = (date) => {
                if (!date) return '-';
                return new Date(date).toLocaleDateString('zh-CN');
            };
            
            // 头像显示
            const avatarHtml = user.avatar 
                ? `<img src="${user.avatar}" alt="头像" style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover;" onerror="this.style.display='none'; this.nextElementSibling.style.display='inline-flex';">
                   <span style="display: none; width: 40px; height: 40px; border-radius: 50%; background: #ddd; align-items: center; justify-content: center; font-size: 18px;">${(user.nickname || '用户').charAt(0)}</span>`
                : `<span style="width: 40px; height: 40px; border-radius: 50%; background: #ddd; display: inline-flex; align-items: center; justify-content: center; font-size: 18px;">${(user.nickname || '用户').charAt(0)}</span>`;
            
            // 订单统计
            const orderStats = user.orderStats || { totalOrders: 0, paidOrders: 0, totalSpent: 0 };
            const totalSpentYuan = (orderStats.totalSpent / 100).toFixed(2);
            
            // 今日测试次数
            const todayTestCount = user.dailyUsage?.testCount || 0;
            const isToday = user.dailyUsage?.date === new Date().toISOString().split('T')[0];
            
            return `
            <tr>
                <td style="text-align: center;">${avatarHtml}</td>
                <td title="${user.openid}">${user.openid.substring(0, 20)}...</td>
                <td>${user.nickname || '-'}</td>
                <td><span class="status-badge ${user.membership === 'premium' ? 'status-paid' : ''}">${user.membership === 'premium' ? '会员' : '免费'}</span></td>
                <td>${formatDate(user.membershipExpireTime)}</td>
                <td>${user.totalTestCount || 0}</td>
                <td>${isToday ? todayTestCount : '-'}</td>
                <td>${orderStats.totalOrders || 0} <span style="color: #666; font-size: 12px;">(${orderStats.paidOrders || 0}已付)</span></td>
                <td>¥${totalSpentYuan}</td>
                <td title="${formatDateTime(user.lastActiveTime)}">${formatDateTime(user.lastActiveTime)}</td>
                <td>${formatDate(user.registerTime)}</td>
                <td>
                    <button class="btn-edit" onclick="editUser('${user._id}')">编辑</button>
                </td>
            </tr>
        `;
        }).join('');

        // 分页
        renderPagination('usersPagination', result.data.pagination, loadUsers);
    }
}

// 加载课程列表
async function loadCourses() {
    const result = await apiRequest('/courses');
    if (result && result.success) {
        const tbody = document.querySelector('#coursesTable tbody');
        tbody.innerHTML = result.data.map(course => `
            <tr>
                <td>${course.gradeId}</td>
                <td>${course.gradeName}</td>
                <td>${course.stage}</td>
                <td>${course.level}</td>
                <td>${course.targetWords}</td>
                <td>${course.enabled ? '启用' : '禁用'}</td>
                <td>
                    <button class="btn-edit" onclick="editCourse('${course._id}')">编辑</button>
                </td>
            </tr>
        `).join('');
    }
}

// 加载订单列表
let currentOrderPage = 1;
async function loadOrders(page = 1) {
    currentOrderPage = page;
    const status = document.getElementById('orderStatusFilter').value;

    const params = new URLSearchParams({
        page,
        limit: 20,
        ...(status && { status })
    });

    const result = await apiRequest(`/orders?${params}`);
    if (result && result.success) {
        const tbody = document.querySelector('#ordersTable tbody');
        tbody.innerHTML = result.data.orders.map(order => `
            <tr>
                <td>${order.orderId}</td>
                <td>${order.userId?.nickname || order.openid || '-'}</td>
                <td>${order.planName}</td>
                <td>¥${(order.amount / 100).toFixed(2)}</td>
                <td><span class="status-badge status-${order.status}">${getStatusText(order.status)}</span></td>
                <td>${new Date(order.createdAt).toLocaleString()}</td>
                <td>
                    <button class="btn-edit" onclick="viewOrder('${order._id}')">查看</button>
                </td>
            </tr>
        `).join('');

        renderPagination('ordersPagination', result.data.pagination, loadOrders);
    }
}

// 加载优惠码列表
async function loadDiscountCodes() {
    const result = await apiRequest('/discount-codes');
    if (result && result.success) {
        const tbody = document.querySelector('#discountTable tbody');
        tbody.innerHTML = result.data.map(code => `
            <tr>
                <td>${code.code}</td>
                <td>${code.type === 'amount' ? '金额' : '百分比'}</td>
                <td>${code.type === 'amount' ? `¥${code.discountAmount}` : `${code.discountPercent}%`}</td>
                <td>${code.usedCount}${code.maxUsage === -1 ? '/∞' : `/${code.maxUsage}`}</td>
                <td>${new Date(code.validFrom).toLocaleDateString()} - ${new Date(code.validUntil).toLocaleDateString()}</td>
                <td>${code.enabled ? '启用' : '禁用'}</td>
                <td>-</td>
            </tr>
        `).join('');
    }
}

// 分页渲染
function renderPagination(containerId, pagination, callback) {
    const container = document.getElementById(containerId);
    if (!container) return;

    let html = '';
    for (let i = 1; i <= pagination.pages; i++) {
        html += `<button class="${i === pagination.page ? 'active' : ''}" onclick="${callback.name}(${i})">${i}</button>`;
    }
    container.innerHTML = html;
}

// 状态文本
function getStatusText(status) {
    const map = {
        'pending': '待支付',
        'paid': '已支付',
        'failed': '失败',
        'cancelled': '已取消'
    };
    return map[status] || status;
}

// 模态框控制
function openModal(modalId) {
    document.getElementById(modalId).style.display = 'block';
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

// 点击模态框外部关闭
window.onclick = function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.style.display = 'none';
    }
}

// 编辑用户
async function editUser(userId) {
    const result = await apiRequest(`/users/${userId}`);
    if (result && result.success) {
        const user = result.data;
        document.getElementById('userId').value = user._id;
        document.getElementById('userMembership').value = user.membership || 'free';
        
        if (user.membershipExpireTime) {
            const expireDate = new Date(user.membershipExpireTime);
            const localDate = new Date(expireDate.getTime() - expireDate.getTimezoneOffset() * 60000);
            document.getElementById('userExpireTime').value = localDate.toISOString().slice(0, 16);
        } else {
            document.getElementById('userExpireTime').value = '';
        }
        
        openModal('userModal');
    }
}

// 保存用户
async function saveUser(event) {
    event.preventDefault();
    const userId = document.getElementById('userId').value;
    const membership = document.getElementById('userMembership').value;
    const expireTime = document.getElementById('userExpireTime').value;

    const result = await apiRequest(`/users/${userId}/membership`, {
        method: 'PUT',
        body: JSON.stringify({
            membership,
            expireTime: expireTime || null
        })
    });

    if (result && result.success) {
        alert('用户信息已更新');
        closeModal('userModal');
        loadUsers(currentUserPage);
    }
}

// 显示创建课程模态框
function showCreateCourseModal() {
    document.getElementById('courseModalTitle').textContent = '创建课程';
    document.getElementById('courseForm').reset();
    document.getElementById('courseId').value = '';
    document.getElementById('courseGradeId').disabled = false;
    openModal('courseModal');
}

// 编辑课程
async function editCourse(courseId) {
    const result = await apiRequest(`/courses/${courseId}`);
    if (result && result.success) {
        const course = result.data;
        document.getElementById('courseModalTitle').textContent = '编辑课程';
        document.getElementById('courseId').value = course._id;
        document.getElementById('courseGradeId').value = course.gradeId;
        document.getElementById('courseGradeId').disabled = true; // 编辑时不允许修改gradeId
        document.getElementById('courseGradeName').value = course.gradeName || '';
        document.getElementById('courseStage').value = course.stage || 'primary';
        document.getElementById('courseLevel').value = course.level || '';
        document.getElementById('courseTargetWords').value = course.targetWords || 0;
        document.getElementById('courseWordCount').value = course.wordCount || 0;
        document.getElementById('courseDescription').value = course.description || '';
        document.getElementById('courseEnabled').checked = course.enabled !== false;
        openModal('courseModal');
    }
}

// 保存课程
async function saveCourse(event) {
    event.preventDefault();
    const courseId = document.getElementById('courseId').value;
    const isEdit = !!courseId;

    const courseData = {
        gradeId: document.getElementById('courseGradeId').value,
        gradeName: document.getElementById('courseGradeName').value,
        stage: document.getElementById('courseStage').value,
        level: parseInt(document.getElementById('courseLevel').value),
        targetWords: parseInt(document.getElementById('courseTargetWords').value) || 0,
        wordCount: parseInt(document.getElementById('courseWordCount').value) || 0,
        description: document.getElementById('courseDescription').value,
        enabled: document.getElementById('courseEnabled').checked
    };

    let result;
    if (isEdit) {
        result = await apiRequest(`/courses/${courseId}`, {
            method: 'PUT',
            body: JSON.stringify(courseData)
        });
    } else {
        result = await apiRequest(`/courses`, {
            method: 'POST',
            body: JSON.stringify(courseData)
        });
    }

    if (result && result.success) {
        alert(isEdit ? '课程已更新' : '课程已创建');
        closeModal('courseModal');
        loadCourses();
    }
}

// 查看订单详情
async function viewOrder(orderId) {
    const result = await apiRequest(`/orders/${orderId}`);
    if (result && result.success) {
        const order = result.data;
        const content = document.getElementById('orderDetailContent');
        
        const formatDate = (date) => {
            if (!date) return '-';
            return new Date(date).toLocaleString('zh-CN');
        };

        content.innerHTML = `
            <div class="detail-row">
                <div class="detail-label">订单号：</div>
                <div class="detail-value">${order.orderId}</div>
            </div>
            <div class="detail-row">
                <div class="detail-label">用户：</div>
                <div class="detail-value">${order.userId?.nickname || order.openid || '-'}</div>
            </div>
            <div class="detail-row">
                <div class="detail-label">OpenID：</div>
                <div class="detail-value">${order.openid || '-'}</div>
            </div>
            <div class="detail-row">
                <div class="detail-label">套餐：</div>
                <div class="detail-value">${order.planName || '-'}</div>
            </div>
            <div class="detail-row">
                <div class="detail-label">金额：</div>
                <div class="detail-value">¥${(order.amount / 100).toFixed(2)}</div>
            </div>
            <div class="detail-row">
                <div class="detail-label">状态：</div>
                <div class="detail-value"><span class="status-badge status-${order.status}">${getStatusText(order.status)}</span></div>
            </div>
            <div class="detail-row">
                <div class="detail-label">微信交易号：</div>
                <div class="detail-value">${order.wxTransactionId || '-'}</div>
            </div>
            <div class="detail-row">
                <div class="detail-label">创建时间：</div>
                <div class="detail-value">${formatDate(order.createdAt)}</div>
            </div>
            <div class="detail-row">
                <div class="detail-label">支付时间：</div>
                <div class="detail-value">${formatDate(order.paidTime)}</div>
            </div>
            <div class="detail-row">
                <div class="detail-label">优惠码：</div>
                <div class="detail-value">${order.discountCode || '-'}</div>
            </div>
            <div class="detail-row">
                <div class="detail-label">实际支付：</div>
                <div class="detail-value">¥${(order.finalAmount ? order.finalAmount / 100 : order.amount / 100).toFixed(2)}</div>
            </div>
        `;
        
        openModal('orderModal');
    }
}

// 显示创建优惠码模态框
function showCreateDiscountModal() {
    document.getElementById('discountForm').reset();
    document.getElementById('discountMaxUsage').value = '-1';
    document.getElementById('discountEnabled').checked = true;
    toggleDiscountFields();
    openModal('discountModal');
}

// 切换优惠码字段显示
function toggleDiscountFields() {
    const type = document.getElementById('discountType').value;
    const amountGroup = document.getElementById('discountAmountGroup');
    const percentGroup = document.getElementById('discountPercentGroup');
    
    if (type === 'amount') {
        amountGroup.style.display = 'block';
        percentGroup.style.display = 'none';
        document.getElementById('discountAmount').required = true;
        document.getElementById('discountPercent').required = false;
    } else {
        amountGroup.style.display = 'none';
        percentGroup.style.display = 'block';
        document.getElementById('discountAmount').required = false;
        document.getElementById('discountPercent').required = true;
    }
}

// 保存优惠码
async function saveDiscountCode(event) {
    event.preventDefault();
    
    const type = document.getElementById('discountType').value;
    const codeData = {
        code: document.getElementById('discountCode').value.toUpperCase(),
        type: type,
        maxUsage: parseInt(document.getElementById('discountMaxUsage').value) || -1,
        validFrom: new Date(document.getElementById('discountValidFrom').value),
        validUntil: new Date(document.getElementById('discountValidUntil').value),
        enabled: document.getElementById('discountEnabled').checked
    };

    if (type === 'amount') {
        codeData.discountAmount = parseInt(document.getElementById('discountAmount').value) || 0;
        codeData.discountPercent = 0;
    } else {
        codeData.discountPercent = parseInt(document.getElementById('discountPercent').value) || 0;
        codeData.discountAmount = 0;
    }

    const result = await apiRequest(`/discount-codes`, {
        method: 'POST',
        body: JSON.stringify(codeData)
    });

    if (result && result.success) {
        alert('优惠码已创建');
        closeModal('discountModal');
        loadDiscountCodes();
    }
}

// 页面加载时加载统计数据
window.addEventListener('load', () => {
    if (apiKey) {
        loadStats();
    }
});

