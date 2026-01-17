/**
 * 数据提取工具函数
 * 从页面DOM中提取达人信息的辅助函数
 */

/**
 * 提取单个达人行的数据
 * @param {HTMLElement} row - 表格行元素 (tr[data-row-key])
 * @returns {Object|null} 达人数据对象
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

    // 提取类别和地区（从 _daren-cell-desc）
    const descElement = row.querySelector('._daren-cell-desc');
    let category = '';
    let region = '';
    if (descElement) {
      const spans = descElement.querySelectorAll('span');
      if (spans.length >= 1) {
        category = spans[0].textContent.trim();
      }
      // 找到包含地区信息的span（通常在分隔符之后）
      const textContent = descElement.textContent;
      const parts = textContent.split('·');
      if (parts.length === 2) {
        category = parts[0].trim();
        region = parts[1].trim();
      }
    }

    // 提取粉丝数（从表格单元格中查找）
    // 通常粉丝数在第一个数字列中
    const cells = row.querySelectorAll('td.auxo-table-cell');
    let fans = 0;
    if (cells.length > 1) {
      // 跳过第一个固定的单元格，通常粉丝数在第二个或第三个单元格
      for (let i = 1; i < Math.min(3, cells.length); i++) {
        const cellText = cells[i].textContent.trim();
        const fanMatch = cellText.match(/^(\d+)$/);
        if (fanMatch && !cellText.includes('¥') && !cellText.includes('-')) {
          fans = parseInt(fanMatch[1], 10) || 0;
          break;
        }
      }
    }

    // 提取价格范围（包含¥和万的元素）
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
    // 通常第一个价格范围是主要的
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

    // 判断回复率（从标签中提取）
    let replyRate = '';
    const replyRateTag = tags.find(tag => 
      tag.includes('回复率') || tag.includes('回复')
    );
    if (replyRateTag) {
      // 尝试从标签文本中提取百分比
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
    console.error('提取达人数据失败:', error, row);
    return null;
  }
}

/**
 * 提取当前页面的所有达人数据
 * @returns {Array} 达人数据数组
 */
function extractAllDarenData() {
  const darenList = [];
  
  try {
    // 查找所有包含data-row-key的表格行
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

/**
 * 等待页面加载完成
 * @param {number} timeout - 超时时间（毫秒）
 * @returns {Promise}
 */
function waitForPageLoad(timeout = 10000) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    
    const checkInterval = setInterval(() => {
      // 检查是否已有数据行
      const rows = document.querySelectorAll('tr[data-row-key]');
      
      if (rows.length > 0) {
        clearInterval(checkInterval);
        clearTimeout(timeoutId);
        resolve(rows.length);
      } else if (Date.now() - startTime > timeout) {
        clearInterval(checkInterval);
        clearTimeout(timeoutId);
        reject(new Error('页面加载超时'));
      }
    }, 200);

    const timeoutId = setTimeout(() => {
      clearInterval(checkInterval);
      reject(new Error('页面加载超时'));
    }, timeout);
  });
}

// 导出函数
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    extractDarenData,
    extractAllDarenData,
    waitForPageLoad
  };
}
