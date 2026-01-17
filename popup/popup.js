/**
 * Popup脚本
 * 处理弹窗界面的交互逻辑
 */

// 日志记录器实例
const logger = new Logger('popup');

// 获取存储实例
function getStorage() {
  // 优先使用storage.js导出的storage实例
  if (typeof window !== 'undefined' && window.storage) {
    return window.storage;
  }
  
  // 如果没有找到，创建简化版存储工具
  return {
      getAll: () => {
        try {
          const data = localStorage.getItem('douyin_daren_data');
          return data ? JSON.parse(data) : [];
        } catch {
          return [];
        }
      },
      saveAll: (data) => {
        try {
          localStorage.setItem('douyin_daren_data', JSON.stringify(data));
          return true;
        } catch {
          return false;
        }
      },
      addBatch: (list) => {
        const self = getStorage();
        const all = self.getAll();
        const now = new Date().toISOString();
        list.forEach(item => {
          const index = all.findIndex(d => d.id === item.id);
          if (index >= 0) {
            all[index] = { ...all[index], ...item, updatedAt: now };
          } else {
            all.push({ ...item, createdAt: now });
          }
        });
        return self.saveAll(all);
      },
      count: () => {
        const self = getStorage();
        return self.getAll().length;
      },
      clear: () => {
        localStorage.removeItem('douyin_daren_data');
        return true;
      },
      exportAsJSON: () => {
        const self = getStorage();
        return JSON.stringify(self.getAll(), null, 2);
      },
      exportAsCSV: () => {
        const self = getStorage();
        const data = self.getAll();
        if (data.length === 0) return '';
        const headers = ['id', 'name', 'fans', 'category', 'region', 'priceRange', 'tags', 'avatar', 'contactAvailable', 'replyRate', 'capturedAt'];
        const rows = [headers.join(',')];
        data.forEach(item => {
          const row = headers.map(h => {
            let val = item[h];
            if (Array.isArray(val)) val = val.join(';');
            if (typeof val === 'object') val = JSON.stringify(val);
            if (typeof val === 'string' && (val.includes(',') || val.includes('\n'))) {
              val = `"${val.replace(/"/g, '""')}"`;
            }
            return val || '';
          });
          rows.push(row.join(','));
        });
        return rows.join('\n');
      }
    };
}

// DOM元素
const extractBtn = document.getElementById('extractBtn');
const viewDataBtn = document.getElementById('viewDataBtn');
const exportBtn = document.getElementById('exportBtn');
const viewLogsBtn = document.getElementById('viewLogsBtn');
const clearBtn = document.getElementById('clearBtn');
const statusDiv = document.getElementById('status');
const dataCountSpan = document.getElementById('dataCount');
const pageRowCountSpan = document.getElementById('pageRowCount');
const dataListDiv = document.getElementById('dataList');
const logsViewDiv = document.getElementById('logsView');
const listContainer = document.getElementById('listContainer');
const logsContainer = document.getElementById('logsContainer');

// 显示状态消息
function showStatus(message, type = 'info') {
  statusDiv.textContent = message;
  statusDiv.className = `status show ${type}`;
  setTimeout(() => {
    statusDiv.className = 'status';
  }, 3000);
}

// 更新统计数据
function updateStats() {
  const storageInstance = getStorage();
  const count = storageInstance.count();
  dataCountSpan.textContent = count;
  
  // 获取页面行数
  getPageInfo();
}

// 获取页面信息
async function getPageInfo() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    chrome.tabs.sendMessage(tab.id, { action: 'getPageInfo' }, (response) => {
      if (response && response.success) {
        pageRowCountSpan.textContent = response.rowCount || 0;
      }
    });
  } catch (error) {
    logger.error('获取页面信息失败', error);
  }
}

// 开始抓取数据
async function extractData() {
  extractBtn.disabled = true;
  showStatus('正在抓取数据...', 'info');
  logger.info('开始抓取数据');

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (!tab.url || !tab.url.includes('buyin.jinritemai.com/dashboard/servicehall/daren-square')) {
      showStatus('请先打开抖音精选联盟达人广场页面', 'error');
      extractBtn.disabled = false;
      return;
    }

    chrome.tabs.sendMessage(tab.id, { action: 'extractData' }, async (response) => {
      extractBtn.disabled = false;

      if (chrome.runtime.lastError) {
        const errorMsg = chrome.runtime.lastError.message;
        showStatus(`错误: ${errorMsg}`, 'error');
        logger.error('发送消息失败', { error: errorMsg });
        return;
      }

      if (response && response.success) {
        const data = response.data || [];
        
        if (data.length === 0) {
          showStatus('未找到数据，请确认页面已加载完成', 'error');
          logger.warn('未提取到数据');
          return;
        }

        // 保存数据
        const storageInstance = getStorage();
        if (storageInstance && storageInstance.addBatch) {
          const saved = storageInstance.addBatch(data);
          if (saved) {
            showStatus(`成功抓取 ${data.length} 条数据`, 'success');
            logger.info('数据抓取成功', { count: data.length });
            updateStats();
          } else {
            showStatus('数据保存失败', 'error');
            logger.error('数据保存失败');
          }
        } else {
          showStatus('存储模块未初始化', 'error');
        }
      } else {
        showStatus(`提取失败: ${response?.error || '未知错误'}`, 'error');
        logger.error('数据提取失败', response);
      }
    });
  } catch (error) {
    extractBtn.disabled = false;
    showStatus(`错误: ${error.message}`, 'error');
    logger.error('抓取数据异常', error);
  }
}

// 查看数据
function viewData() {
  const storageInstance = getStorage();
  const data = storageInstance.getAll();
  
  if (data.length === 0) {
    showStatus('暂无数据', 'info');
    return;
  }

  listContainer.innerHTML = '';
  
  data.slice(0, 50).forEach((item, index) => {
    const itemDiv = document.createElement('div');
    itemDiv.className = 'data-item';
    itemDiv.innerHTML = `
      <div class="data-item-name">${index + 1}. ${item.name || '未命名'}</div>
      <div class="data-item-info">
        <span>粉丝: ${item.fans || 0}</span>
        <span>类别: ${item.category || '-'}</span>
        <span>地区: ${item.region || '-'}</span>
        <span>价格: ${item.priceRange || '-'}</span>
        <span>标签: ${(item.tags || []).join(', ') || '-'}</span>
      </div>
    `;
    listContainer.appendChild(itemDiv);
  });

  if (data.length > 50) {
    const moreDiv = document.createElement('div');
    moreDiv.style.textAlign = 'center';
    moreDiv.style.padding = '8px';
    moreDiv.style.color = '#999';
    moreDiv.textContent = `共 ${data.length} 条数据，仅显示前 50 条`;
    listContainer.appendChild(moreDiv);
  }

  dataListDiv.style.display = 'block';
  logsViewDiv.style.display = 'none';
  logger.info('查看数据列表', { count: data.length });
}

// 导出数据
function exportData() {
  const storageInstance = getStorage();
  const data = storageInstance.getAll();
  
  if (data.length === 0) {
    showStatus('暂无数据可导出', 'info');
    return;
  }

  try {
    // 导出为JSON
    const jsonData = storageInstance.exportAsJSON();
    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `douyin_daren_${new Date().getTime()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    showStatus('数据导出成功', 'success');
    logger.info('导出数据', { count: data.length, format: 'JSON' });
  } catch (error) {
    showStatus(`导出失败: ${error.message}`, 'error');
    logger.error('导出数据失败', error);
  }
}

// 查看日志
function viewLogs() {
  const logs = Logger.getAllLogs();
  
  logsContainer.innerHTML = '';
  
  if (logs.length === 0) {
    logsContainer.innerHTML = '<div style="padding: 20px; text-align: center; color: #999;">暂无日志</div>';
  } else {
    logs.slice(-100).reverse().forEach(log => {
      const logDiv = document.createElement('div');
      logDiv.className = `log-entry ${log.level}`;
      logDiv.innerHTML = `
        <span class="log-timestamp">[${log.timestamp}]</span>
        <span class="log-module">[${log.module}]</span>
        <span>${log.message}</span>
        ${log.data ? `<div style="margin-top: 4px; color: #666; font-size: 11px;">${JSON.stringify(log.data)}</div>` : ''}
      `;
      logsContainer.appendChild(logDiv);
    });
  }

  logsViewDiv.style.display = 'block';
  dataListDiv.style.display = 'none';
  logger.info('查看日志');
}

// 导出日志
function exportLogs() {
  const logs = Logger.getAllLogs();
  
  if (logs.length === 0) {
    showStatus('暂无日志可导出', 'info');
    return;
  }

  try {
    const logText = Logger.exportLogsAsText();
    const blob = new Blob([logText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `douyin_logs_${new Date().getTime()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    
    showStatus('日志导出成功', 'success');
    logger.info('导出日志', { count: logs.length });
  } catch (error) {
    showStatus(`导出失败: ${error.message}`, 'error');
    logger.error('导出日志失败', error);
  }
}

// 清空数据
function clearData() {
  if (!confirm('确定要清空所有数据吗？此操作不可恢复！')) {
    return;
  }

  const storageInstance = getStorage();
  if (storageInstance && storageInstance.clear) {
    const cleared = storageInstance.clear();
    if (cleared) {
      showStatus('数据已清空', 'success');
      logger.info('清空数据');
      updateStats();
      if (dataListDiv.style.display === 'block') {
        listContainer.innerHTML = '';
      }
    } else {
      showStatus('清空失败', 'error');
    }
  }
}

// 清空日志
function clearLogs() {
  if (!confirm('确定要清空所有日志吗？此操作不可恢复！')) {
    return;
  }

  const cleared = Logger.clearLogs();
  if (cleared) {
    showStatus('日志已清空', 'success');
    logger.info('清空日志');
    if (logsViewDiv.style.display === 'block') {
      logsContainer.innerHTML = '<div style="padding: 20px; text-align: center; color: #999;">暂无日志</div>';
    }
  } else {
    showStatus('清空失败', 'error');
  }
}

// 事件监听
extractBtn.addEventListener('click', extractData);
viewDataBtn.addEventListener('click', viewData);
exportBtn.addEventListener('click', exportData);
viewLogsBtn.addEventListener('click', viewLogs);
clearBtn.addEventListener('click', clearData);
document.getElementById('closeListBtn').addEventListener('click', () => {
  dataListDiv.style.display = 'none';
});
document.getElementById('closeLogsBtn').addEventListener('click', () => {
  logsViewDiv.style.display = 'none';
});
document.getElementById('exportLogsBtn').addEventListener('click', exportLogs);
document.getElementById('clearLogsBtn').addEventListener('click', clearLogs);

// 初始化
document.addEventListener('DOMContentLoaded', () => {
  updateStats();
  logger.info('Popup已加载');
});
