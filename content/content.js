/**
 * Content Script
 * 在目标页面中运行，用于提取达人信息
 */

// 引入日志模块和数据提取工具
// 注意：在content script中需要通过消息传递或直接内联代码

/**
 * 等待页面加载完成后提取数据
 */
async function waitAndExtract() {
  try {
    // 等待表格数据加载
    await new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        const rows = document.querySelectorAll('tr[data-row-key]');
        if (rows.length > 0) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 200);

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

/**
 * 提取单个达人行的数据
 */
function extractDarenData(row) {
  try {
    if (!row || !row.getAttribute('data-row-key')) {
      return null;
    }

    const id = row.getAttribute('data-row-key');
    
    // 提取名称
    const nameElement = row.querySelector('.index-module__title___MZNea');
    const name = nameElement ? nameElement.textContent.trim() : '';

    // 提取头像
    const avatarImg = row.querySelector('img[alt="达人头像"]');
    const avatar = avatarImg ? avatarImg.src : '';

    // 提取类别和地区
    const descElement = row.querySelector('._daren-cell-desc');
    let category = '';
    let region = '';
    if (descElement) {
      const textContent = descElement.textContent;
      const parts = textContent.split('·');
      if (parts.length === 2) {
        category = parts[0].trim();
        region = parts[1].trim();
      } else {
        category = textContent.trim();
      }
    }

    // 提取粉丝数
    const cells = row.querySelectorAll('td.auxo-table-cell');
    let fans = 0;
    if (cells.length > 1) {
      for (let i = 1; i < Math.min(3, cells.length); i++) {
        const cellText = cells[i].textContent.trim();
        const fanMatch = cellText.match(/^(\d+)$/);
        if (fanMatch && !cellText.includes('¥') && !cellText.includes('-')) {
          fans = parseInt(fanMatch[1], 10) || 0;
          break;
        }
      }
    }

    // 提取价格范围
    const priceRanges = [];
    const priceElements = row.querySelectorAll('span.prefix');
    priceElements.forEach(prefixEl => {
      const parent = prefixEl.parentElement;
      if (parent && parent.textContent.includes('¥')) {
        const priceText = parent.textContent.trim();
        if (priceText && !priceRanges.includes(priceText)) {
          priceRanges.push(priceText);
        }
      }
    });
    const priceRange = priceRanges[0] || '-';

    // 提取标签
    const tags = [];
    const tagElements = row.querySelectorAll('.auxo-sp-tag .sp-tag-content');
    tagElements.forEach(tagEl => {
      const tagText = tagEl.textContent.trim();
      if (tagText) {
        tags.push(tagText);
      }
    });

    // 判断是否有联系方式
    const contactAvailable = tags.some(tag => 
      tag.includes('联系方式') || tag.includes('联系')
    );

    // 提取回复率
    let replyRate = '';
    const replyRateTag = tags.find(tag => 
      tag.includes('回复率') || tag.includes('回复')
    );
    if (replyRateTag) {
      const rateMatch = replyRateTag.match(/(\d+(?:\.\d+)?%)/);
      if (rateMatch) {
        replyRate = rateMatch[1];
      } else {
        replyRate = replyRateTag;
      }
    }

    return {
      id: id,
      name: name,
      fans: fans,
      category: category,
      region: region,
      priceRange: priceRange,
      tags: tags,
      avatar: avatar,
      contactAvailable: contactAvailable,
      replyRate: replyRate,
      capturedAt: new Date().toISOString()
    };
  } catch (error) {
    console.error('提取达人数据失败:', error);
    return null;
  }
}

/**
 * 提取当前页面的所有达人数据
 */
function extractAllDarenData() {
  const darenList = [];
  
  try {
    const rows = document.querySelectorAll('tr[data-row-key]');
    
    rows.forEach(row => {
      const darenData = extractDarenData(row);
      if (darenData && darenData.id) {
        darenList.push(darenData);
      }
    });
  } catch (error) {
    console.error('提取所有达人数据失败:', error);
  }

  return darenList;
}

// 监听来自popup或background的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'extractData') {
    // 异步提取数据
    waitAndExtract().then(data => {
      sendResponse({ success: true, data: data });
    }).catch(error => {
      sendResponse({ success: false, error: error.message });
    });
    
    // 返回true表示将异步发送响应
    return true;
  }

  if (request.action === 'getPageInfo') {
    const rowCount = document.querySelectorAll('tr[data-row-key]').length;
    sendResponse({ 
      success: true, 
      rowCount: rowCount,
      url: window.location.href
    });
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
