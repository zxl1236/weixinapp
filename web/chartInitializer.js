// 📊 图表初始化器 - 用于增强结果页面的图表展示

// 初始化所有结果页面图表
function initializeResultCharts(chartData) {
  if (typeof Chart === 'undefined') {
    console.warn('Chart.js 未加载，跳过图表初始化');
    return;
  }
  
  try {
    // 初始化答题表现图表
    initializePerformanceChart(chartData.performance);
    
    // 初始化难度分布图表
    initializeDifficultyChart(chartData.difficulty);
    
    // 初始化级别掌握图表
    initializeLevelChart(chartData.level);
    
    // 初始化雷达图
    initializeRadarChart(chartData.radar);
    
    console.log('✅ 所有图表初始化完成');
  } catch (error) {
    console.error('图表初始化失败:', error);
  }
}

// 答题表现趋势图
function initializePerformanceChart(performanceData) {
  const canvas = document.getElementById('performanceChart');
  if (!canvas) return;
  
  const ctx = canvas.getContext('2d');
  
  new Chart(ctx, {
    type: 'line',
    data: {
      labels: performanceData.map((_, index) => `第${index + 1}题`),
      datasets: [{
        label: '正确率趋势',
        data: performanceData.map(point => point.y),
        borderColor: 'rgb(102, 126, 234)',
        backgroundColor: 'rgba(102, 126, 234, 0.1)',
        fill: true,
        tension: 0.4,
        pointBackgroundColor: 'rgb(102, 126, 234)',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              return `正确率: ${context.parsed.y.toFixed(1)}%`;
            }
          }
        }
      },
      scales: {
        x: {
          display: true,
          title: {
            display: true,
            text: '题目进度'
          }
        },
        y: {
          display: true,
          title: {
            display: true,
            text: '累计正确率 (%)'
          },
          min: 0,
          max: 100
        }
      }
    }
  });
}

// 难度分布柱状图
function initializeDifficultyChart(difficultyData) {
  const canvas = document.getElementById('difficultyChart');
  if (!canvas) return;
  
  const ctx = canvas.getContext('2d');
  const labels = Object.keys(difficultyData);
  const data = Object.values(difficultyData);
  
  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels.map(d => `难度${d}`),
      datasets: [{
        label: '题目数量',
        data: data,
        backgroundColor: [
          'rgba(34, 197, 94, 0.8)',   // 绿色 - 简单
          'rgba(34, 197, 94, 0.7)',
          'rgba(59, 130, 246, 0.8)',   // 蓝色 - 中等
          'rgba(59, 130, 246, 0.7)',
          'rgba(168, 85, 247, 0.8)',   // 紫色 - 较难
          'rgba(168, 85, 247, 0.7)',
          'rgba(239, 68, 68, 0.8)',    // 红色 - 困难
          'rgba(239, 68, 68, 0.7)',
          'rgba(239, 68, 68, 0.9)',
          'rgba(239, 68, 68, 1.0)'
        ],
        borderColor: [
          'rgba(34, 197, 94, 1)',
          'rgba(34, 197, 94, 1)',
          'rgba(59, 130, 246, 1)',
          'rgba(59, 130, 246, 1)',
          'rgba(168, 85, 247, 1)',
          'rgba(168, 85, 247, 1)',
          'rgba(239, 68, 68, 1)',
          'rgba(239, 68, 68, 1)',
          'rgba(239, 68, 68, 1)',
          'rgba(239, 68, 68, 1)'
        ],
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        }
      },
      scales: {
        x: {
          title: {
            display: true,
            text: '难度级别'
          }
        },
        y: {
          title: {
            display: true,
            text: '题目数量'
          },
          beginAtZero: true
        }
      }
    }
  });
}

// 级别掌握度饼图
function initializeLevelChart(levelData) {
  const canvas = document.getElementById('levelChart');
  if (!canvas) return;
  
  const ctx = canvas.getContext('2d');
  const labels = ['小学词汇', '初中词汇', '高中词汇', '高级词汇'];
  const data = [levelData.primary, levelData.junior, levelData.senior, levelData.advanced];
  
  new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: labels,
      datasets: [{
        data: data,
        backgroundColor: [
          'rgba(34, 197, 94, 0.8)',   // 小学 - 绿色
          'rgba(59, 130, 246, 0.8)',   // 初中 - 蓝色
          'rgba(168, 85, 247, 0.8)',   // 高中 - 紫色
          'rgba(239, 68, 68, 0.8)'     // 高级 - 红色
        ],
        borderColor: [
          'rgba(34, 197, 94, 1)',
          'rgba(59, 130, 246, 1)',
          'rgba(168, 85, 247, 1)',
          'rgba(239, 68, 68, 1)'
        ],
        borderWidth: 2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            padding: 20,
            usePointStyle: true
          }
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              const total = context.dataset.data.reduce((a, b) => a + b, 0);
              const percentage = total > 0 ? ((context.parsed / total) * 100).toFixed(1) : 0;
              return `${context.label}: ${context.parsed}题 (${percentage}%)`;
            }
          }
        }
      }
    }
  });
}

// 词汇能力雷达图
function initializeRadarChart(radarData) {
  const canvas = document.getElementById('vocabularyRadar');
  if (!canvas) return;
  
  const ctx = canvas.getContext('2d');
  
  new Chart(ctx, {
    type: 'radar',
    data: {
      labels: ['基础词汇', '中级词汇', '高级词汇', '学术词汇', '创意表达'],
      datasets: [{
        label: '词汇能力',
        data: [
          radarData.basic,
          radarData.intermediate,
          radarData.advanced,
          radarData.academic,
          radarData.creative
        ],
        backgroundColor: 'rgba(102, 126, 234, 0.2)',
        borderColor: 'rgb(102, 126, 234)',
        borderWidth: 2,
        pointBackgroundColor: 'rgb(102, 126, 234)',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        }
      },
      scales: {
        r: {
          beginAtZero: true,
          max: 100,
          ticks: {
            stepSize: 20
          }
        }
      }
    }
  });
}

// 导出到全局
if (typeof window !== 'undefined') {
  window.initializeResultCharts = initializeResultCharts;
}