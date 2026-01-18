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
    //此处顺序错误，应该按照实际顺序提取
    // TODO: 修改价格列顺序
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
 * 提取当前页面所有达人数据
 * 此函数会遍历页面上所有满足"tr[data-row-key]"选择器的行元素（每一行通常对应一位达人），
 * 对每一行调用 extractDarenData(row)，将合法（有id）的达人数据对象加入最终数组。
 * 出错时会在控制台输出错误信息，保证主流程不中断。
 * @returns {Array<Object>} darenList - 本地提取到的所有达人数据对象数组
 */
function extractAllDarenData() {
  const darenList = []; // 用于存放所有达人数据的数组

  try {
    // 选中页面所有带有 data-row-key 属性的 tr 元素，这些元素通常表示达人数据行
    const rows = document.querySelectorAll('tr[data-row-key]');

    // 遍历每一行，提取达人数据
    rows.forEach(row => {
      // 调用 extractDarenData(row) 提取当前行的达人信息
      const darenData = extractDarenData(row);
      // 只有当抽取到的对象存在并且有 id 时，才推入结果数组
      if (darenData && darenData.id) {
        darenList.push(darenData);
      }
    });
  } catch (error) {
    // 捕获并记录提取过程中错误，保证整个程序健壮性
    console.error('提取所有达人数据失败:', error);
  }

  // 返回所有成功提取的达人数据对象
  return darenList;
}

// 导出函数（支持浏览器环境和Node.js环境）
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    extractDarenData,
    extractAllDarenData
  };
}