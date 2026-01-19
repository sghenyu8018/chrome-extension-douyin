/**
 * Popup脚本
 * 处理弹窗界面的交互逻辑
 */

// 日志记录器实例
// logger实例来自于 utils/logger.js，在popup.html中通过 <script src="../utils/logger.js"></script> 引入后，全局可用
// 检查 Logger 是否可用，避免重复声明错误
const logger = typeof Logger !== 'undefined' ? new Logger('popup') : {
  debug: (msg, data) => console.debug('[popup]', msg, data || ''),
  info: (msg, data) => console.info('[popup]', msg, data || ''),
  warn: (msg, data) => console.warn('[popup]', msg, data || ''),
  error: (msg, data) => console.error('[popup]', msg, data || '')
};

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
          // 从 localStorage 中获取 key 为 'douyin_daren_data' 的数据字符串
          // 如果本地存储中没有该 key，则返回 null
          const data = localStorage.getItem('douyin_daren_data');
          return data ? JSON.parse(data) : [];
        } catch {
          return [];
        }
      },
      saveAll: (data) => {
        try {
          /**
           * 将达人数据以JSON字符串形式保存到本地存储（localStorage）。
           * 键名 'douyin_daren_data'，value为data序列化后的字符串。
           * 字段解释：
           *   id:               唯一标识，例如达人ID
           */
          // localStorage.setItem 用于将指定键的数据（这里是 'douyin_daren_data'）保存到浏览器的本地存储（localStorage）中，值需要为字符串格式。
          // 本例中，将 data 对象序列化为 JSON 字符串后存储
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
        const headers = ['id', 'name', 'fans', 'category', 'style', 'region', 'priceRange', 'liveSalesTotal', 'imageSalesTotal', 'videoSalesTotal', 'showcaseSalesTotal', 'tags', 'avatar', 'contactAvailable', 'replyRate', 'capturedAt'];
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
/**
 * 在状态栏显示消息，并自动隐藏
 * @param {string} message - 要显示的消息文本
 * @param {string} [type='info'] - 消息类型, 如: 'info', 'error', 'success'
 */
function showStatus(message, type = 'info') {
  // 设置状态栏文本内容
  statusDiv.textContent = message;
  // 设置状态栏样式，包括显示(show)和类型(如: status show error)
  statusDiv.className = `status show ${type}`;
  // 3秒后自动移除'show'和类型, 恢复为默认的'status'，从而实现动画隐藏效果
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
/**
 * 获取当前活动标签页的页面信息，并更新页面的行数显示
 * 该函数会异步请求内容脚本，获取当前页面的可用数据行数量
 */
async function getPageInfo() {
  try {
    // 获取当前窗口中处于激活状态的标签页
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    // 发送消息到内容脚本，请求获取页面信息
    // 消息格式: { action: 'getPageInfo' }
    chrome.tabs.sendMessage(
      tab.id, // 目标标签页ID
      { action: 'getPageInfo' }, // 发送的消息对象，约定action为'getPageInfo'
      (response) => { // 消息响应的回调
        // 检查响应对象是否存在且success为true
        if (response && response.success) {
          // 从响应中获取行数，否则为0，更新到页面对应的span元素
          pageRowCountSpan.textContent = response.rowCount || 0;
        }
        // 如果响应失败，不做特殊处理(也可在此处增加错误提示)
      }
    );
  } catch (error) {
    // 捕获整个流程中的异常，并写入日志
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
    logger.info('tab.id', tab.id);
    if (!tab.url || !tab.url.includes('buyin.jinritemai.com/dashboard/servicehall/daren-square')) {
      showStatus('请先打开抖音精选联盟达人广场页面', 'error');
      extractBtn.disabled = false;
      return;
    }

    // 发送消息到内容脚本，请求开始抓取数据
    // chrome 是谷歌浏览器（Google Chrome）扩展程序环境下提供的全局对象，允许开发者调用 Chrome 提供的扩展API。
    // 下面这句代码的作用是向指定标签页（tab.id）注入消息（action: 'extractData'），并通过回调处理来自内容脚本的响应。
    // 这里注入的不是一个函数extractData，而是发送一条action为'extractData'的消息给content script，
    // 内容脚本收到这个消息后会执行对应的数据抓取函数，然后返回结果给popup页面。
    chrome.tabs.sendMessage(tab.id, { action: 'extractData' }, async (response) => {
          // 一旦收到内容脚本的响应，重新启用抓取按钮
      extractBtn.disabled = false;

      // 检查 Chrome Runtime 是否返回错误（如脚本注入失败或页面无内容脚本等）
      if (chrome.runtime.lastError) {
        const errorMsg = chrome.runtime.lastError.message;
        // 显示错误状态，并日志记录错误详情
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
        // 获取存储（Storage）实例，确保后续可以调用自定义存储方法
        // getStorage() 会返回当前用于达人数据存储的 Storage 实例对象。
        // Storage 实例可以用来进行数据的 增、删、改、查 以及批量添加等操作。
        // 比如 storageInstance.addBatch(data) 可用于批量添加达人数据到本地存储，
        // storageInstance.getAll() 可获取所有已保存的数据条目。
        // 详细操作方法由 utils/storage.js 中 Storage 类实现。
        const storageInstance = getStorage();
        // 检查存储实例是否已正确初始化，并且实现了 addBatch 批量添加方法
        if (storageInstance && storageInstance.addBatch) {
          // 尝试将获取到的数据批量保存到本地存储
          const saved = storageInstance.addBatch(data);
          if (saved) {
            // 保存成功，提示用户已成功抓取指定数量数据，并更新日志和统计信息
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

  // 清空列表容器内容，准备重新插入数据项
  // 将列表容器（listContainer）中的所有HTML内容清空（即删除已有数据项）
  // innerHTML 是 DOM 元素的一个属性，用于获取或设置元素的 HTML 内容。
  // 这里把它设置为 ''（空字符串），表示“清空”该容器的内容。
  listContainer.innerHTML = '';

  // 只显示前50条数据，避免过多数据显示造成卡顿
  data.slice(0, 50).forEach((item, index) => {
    // 创建数据项的父div
    const itemDiv = document.createElement('div');
    itemDiv.className = 'data-item';

    // 组装数据项的HTML结构
    // - 显示序号和达人名称，没有名称则显示“未命名”
    // - 展示粉丝数、类别、风格（可选）、地区、销售总额等关键信息
    // - 仅当相应销售数据存在且不为'-'时才添加对应内容
    // - 标签为数组，展示为用逗号分隔的字符串，若无则显示'-'
    itemDiv.innerHTML = `
      <div class="data-item-name">
        ${index + 1}. ${item.name || '未命名'}
      </div>
      <div class="data-item-info">
        <span>粉丝: ${item.fans || 0}</span>
        <span>类别: ${item.category || '-'}</span>
        ${item.style ? `<span>风格: ${item.style}</span>` : ''}
        <span>地区: ${item.region || '-'}</span>
        <span>销售总额: ${item.priceRange || '-'}</span>
        ${item.liveSalesTotal && item.liveSalesTotal !== '-' ? `<span>直播销售总额: ${item.liveSalesTotal}</span>` : ''}
        ${item.videoSalesTotal && item.videoSalesTotal !== '-' ? `<span>视频销售总额: ${item.videoSalesTotal}</span>` : ''}
        ${item.imageSalesTotal && item.imageSalesTotal !== '-' ? `<span>图文销售总额: ${item.imageSalesTotal}</span>` : ''}
        ${item.showcaseSalesTotal && item.showcaseSalesTotal !== '-' ? `<span>橱窗销售总额: ${item.showcaseSalesTotal}</span>` : ''}
        <span>标签: ${(item.tags || []).join(', ') || '-'}</span>
      </div>
    `;
    // 将当前数据div添加到列表容器中
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
// 当弹窗的DOM内容完全加载并解析完成后，执行以下初始化逻辑
document.addEventListener('DOMContentLoaded', () => {
  // 更新统计信息（如已抓取数据条数、页面行数等）
  updateStats();
  // 记录日志，表示弹窗页面已成功加载
  logger.info('Popup已加载');
});
