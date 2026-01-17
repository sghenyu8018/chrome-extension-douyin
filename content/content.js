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
    let style = '';  // 风格
    let region = '';
    
    if (descElement) {
      // 获取所有span元素
      const spans = Array.from(descElement.querySelectorAll('span')).map(s => s.textContent.trim()).filter(s => s);
      
      // 查找包含"·"的span，这个通常是地区信息（如"江苏·南京"）
      const regionSpan = spans.find(s => s.includes('·'));
      if (regionSpan) {
        region = regionSpan.trim();
      }
      
      // 所有不包含"·"的span应该是类别信息，用"/"连接
      const categorySpans = spans.filter(s => !s.includes('·'));
      if (categorySpans.length > 0) {
        // 将类别span合并，用"/"分隔
        category = categorySpans.join('/');
      }
      
      // 如果没有找到region但有包含地区的文本，尝试从整个文本中提取
      if (!region) {
        const textContent = descElement.textContent.trim();
        // 查找包含"·"的部分
        const regionMatch = textContent.match(/([^·]+·[^·]+)/);
        if (regionMatch) {
          region = regionMatch[1].trim();
        }
      }
    }

    // 提取所有表格单元格
    const cells = Array.from(row.querySelectorAll('td.auxo-table-cell'));
    
    // 提取粉丝数（通常是第一个数字列，不包含¥符号，可能包含"万"单位）
    let fans = 0;
    // 跳过固定列（选择框列和达人信息列），从第2个单元格开始
    // 粉丝数通常在达人信息列之后的第一个数字列，带有ff-barlow类
    for (let i = 2; i < Math.min(10, cells.length); i++) {
      const cell = cells[i];
      const cellText = cell.textContent.trim();
      
      // 检查是否包含¥符号，如果包含则跳过（这是价格列）
      if (cellText && cellText.includes('¥')) {
        continue;
      }
      
      // 检查是否包含"-"符号，如果包含则跳过（这是价格范围列）
      if (cellText && cellText.includes('-') && !cellText.match(/[\d.]+万?[\s-]+[\d.]+万?/)) {
        continue;
      }
      
      // 匹配纯数字（可能包含逗号）
      const pureNumberMatch = cellText.match(/^(\d{1,3}(?:,\d{3})*)$/);
      if (pureNumberMatch) {
        fans = parseInt(pureNumberMatch[1].replace(/,/g, ''), 10) || 0;
        break;
      }
      
      // 匹配数字+"万"的格式（如"1.07万"、"10万"）
      const wanMatch = cellText.match(/^([\d.]+)万$/);
      if (wanMatch) {
        const num = parseFloat(wanMatch[1]);
        fans = Math.round(num * 10000); // 转换为实际数字
        break;
      }
      
      // 匹配数字+"千"的格式（如"1.5千"）
      const qianMatch = cellText.match(/^([\d.]+)千$/);
      if (qianMatch) {
        const num = parseFloat(qianMatch[1]);
        fans = Math.round(num * 1000);
        break;
      }
      
      // 匹配简单数字（不包含其他字符）
      const simpleMatch = cellText.match(/^(\d+)$/);
      if (simpleMatch) {
        fans = parseInt(simpleMatch[1], 10) || 0;
        break;
      }
    }

    // 提取所有价格相关的单元格（包含¥的元素）
    const priceCells = [];
    cells.forEach((cell, index) => {
      const pricePrefix = cell.querySelector('span.prefix');
      if (pricePrefix && cell.textContent.includes('¥')) {
        const priceText = cell.textContent.trim();
        if (priceText && priceText !== '-') {
          priceCells.push({
            index: index,
            text: priceText
          });
        }
      }
    });

    // 根据用户提供的信息，价格列的顺序大致是：
    // 销售总额（priceRange）、直播销售总额、图文销售总额、视频销售总额、橱窗销售总额
    const priceRange = priceCells[0]?.text || '-';           // 销售总额
    const liveSalesTotal = priceCells[1]?.text || '-';       // 直播销售总额
    const imageSalesTotal = priceCells[2]?.text || '-';      // 图文销售总额
    const videoSalesTotal = priceCells[3]?.text || '-';      // 视频销售总额
    const showcaseSalesTotal = priceCells[4]?.text || '-';   // 橱窗销售总额

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
      style: style,
      region: region,
      priceRange: priceRange,
      liveSalesTotal: liveSalesTotal,
      imageSalesTotal: imageSalesTotal,
      videoSalesTotal: videoSalesTotal,
      showcaseSalesTotal: showcaseSalesTotal,
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
