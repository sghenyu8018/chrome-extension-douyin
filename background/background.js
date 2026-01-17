/**
 * Background Service Worker
 * 处理消息传递和数据协调
 */

// 日志功能（简化版，因为background中无法直接使用utils/logger.js）
function log(level, module, message, data = null) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    level: level,
    module: module,
    message: message,
    data: data
  };
  console.log(`[${module}]`, message, data || '');
  
  // 保存到storage
  chrome.storage.local.get(['logs'], (result) => {
    const logs = result.logs || [];
    logs.push(logEntry);
    // 限制日志数量
    if (logs.length > 1000) {
      logs.shift();
    }
    chrome.storage.local.set({ logs: logs });
  });
}

// 监听来自content script的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'contentScriptReady') {
    log('INFO', 'background', 'Content script已就绪', { tabId: sender.tab?.id });
  }

  // 转发消息到popup
  if (request.action === 'extractData' || request.action === 'getPageInfo') {
    // 这些消息应该由popup直接发送到content script，不需要在这里处理
  }

  return true;
});

// 监听扩展安装
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    log('INFO', 'background', '扩展已安装');
  } else if (details.reason === 'update') {
    log('INFO', 'background', '扩展已更新', { previousVersion: details.previousVersion });
  }
});

// 监听标签页更新（用于检测页面导航）
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    if (tab.url.includes('buyin.jinritemai.com/dashboard/servicehall/daren-square')) {
      log('DEBUG', 'background', '目标页面已加载', { tabId: tabId, url: tab.url });
    }
  }
});
