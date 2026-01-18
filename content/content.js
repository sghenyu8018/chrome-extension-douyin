/**
 * Content Script
 * 在目标页面中运行，用于提取达人信息
 */

// 引入日志模块和数据提取工具
// 注意：在content script中需要通过消息传递或直接内联代码
// 数据提取函数 extractDarenData 和 extractAllDarenData 由 utils/dataExtractor.js 提供

// 创建日志记录器实例
// Logger 类由 utils/logger.js 提供（在 manifest.json 中已加载）
const logger = typeof Logger !== 'undefined' ? new Logger('content') : {
  debug: (msg, data) => console.debug('[content]', msg, data || ''),
  info: (msg, data) => console.info('[content]', msg, data || ''),
  warn: (msg, data) => console.warn('[content]', msg, data || ''),
  error: (msg, data) => console.error('[content]', msg, data || '')
};

/**
 * 等待页面加载完成后提取数据
 */
async function waitAndExtract() {
  try {
    // 使用Promise等待表格数据加载完成
    // new Promise会创建一个定时器，每200毫秒检查一次页面中是否存在<tr data-row-key>元素，这代表达人数据表格已经渲染
    // 如果找到了数据行，立即清除定时器并resolve，继续后续提取流程
    // Promise 是 JavaScript 提供的一种异步编程解决方案，用来表示一个可能还没完成但将来会完成的操作。当你 new Promise 时，你创建了一个新的Promise实例，需要提供一个 executor 函数（如这里的 resolve），它会在操作完成时“兑现”（resolve）或“拒绝”（reject）。
    await new Promise((resolve) => {
      // 定期检查表格行是否加载
      const checkInterval = setInterval(() => {
        // 查询页面所有data-row-key属性的tr行，代表达人数据行
        // document 是指当前内容脚本所运行的网页的 DOM（文档对象模型）。
        // 通过 document.querySelectorAll 查找所有属性为 data-row-key 的 tr 元素（达人表格行）。
        const rows = document.querySelectorAll('tr[data-row-key]');
        if (rows.length > 0) {
          // 取消已找到数据行时的200ms延迟，直接继续后续操作
          clearInterval(checkInterval);
          setTimeout(() => {
            resolve();
          }, 200);
        }
      }, 200); // 每200ms检查一次

      // 10秒超时
      setTimeout(() => {
        clearInterval(checkInterval);
        resolve();
      }, 10000);
    });

    return extractAllDarenData();
  } catch (error) {
    console.error('等待页面加载失败:', error);
    return [];
  }
}


// 监听来自popup或background的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'extractData') {
    // 异步提取数据
    // 异步等待页面数据抓取函数waitAndExtract的执行结果
    // waitAndExtract是一个Promise，处理页面动态数据渲染异步情况
    waitAndExtract()
      .then(data => {
        // 成功提取数据后，通过sendResponse将结果响应给popup脚本
        // { success: true, data: data }  其中data为提取到的达人数据数组
        sendResponse({ success: true, data: data });
      })
      .catch(error => {
        // 如果提取过程中出错，将错误信息通过sendResponse反馈
        // { success: false, error: error.message }
        sendResponse({ success: false, error: error.message });
      });
    
    // 返回true表示将异步发送响应
    return true;
  }

  // 处理来自 popup 或 background 的 "getPageInfo" 请求
  // 该消息的目的是让 popup 快速获取页面上达人表格的当前行数等信息（不需要全部采集数据）
  if (request.action === 'getPageInfo') {
    // 查询页面所有带有 data-row-key 属性的 <tr> 元素（即达人表格的每一行，通常一行表示一个达人）
    // 这是抖音精选联盟达人广场列表的标准结构，根据 className 和属性设计做适应性抓取
    const rowCount = document.querySelectorAll('tr[data-row-key]').length;
    logger.info('rowCount', rowCount);
    logger.info('window.location.href', window.location.href);
    // 携带页面当前的 URL 方便 popup/后台判断是否在正确的页面
    // 将获取到的信息通过 sendResponse 返回给发送消息方
    sendResponse({ 
      success: true,                // 表明操作成功
      rowCount: rowCount,           // 当前页面中达人数据行的数量
      url: window.location.href     // 页面当前地址，可以用作二次校验
    });

    // 返回 true，表明是异步响应（虽然这里其实是同步，但用于规避潜在异步用例）
    return true;
  }
});

// 页面加载完成后，向background发送就绪消息
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    chrome.runtime.sendMessage({ action: 'contentScriptReady' });
  });
} else {
  chrome.runtime.sendMessage({ action: 'contentScriptReady' });
}
