# 滚动加载数据处理分析

## 当前实现方式

### 1. 数据提取流程

**触发方式：** 用户手动点击"抓取数据"按钮

**执行流程：**
1. `popup.js` → `extractData()` 函数被调用
2. 发送消息到 `content.js`：`{ action: 'extractData' }`
3. `content.js` → `waitAndExtract()` 函数：
   - 每200ms检查一次页面是否存在 `tr[data-row-key]` 元素
   - 最多等待10秒超时
   - 找到数据后延迟200ms再提取（确保DOM渲染完成）
4. 调用 `extractAllDarenData()`：
   - 使用 `document.querySelectorAll('tr[data-row-key]')` 获取**当前页面所有可见**的行
   - 遍历每一行，调用 `extractDarenData(row)` 提取数据
5. 数据通过 `storage.addBatch(data)` 保存：
   - 自动去重（基于 `id` 字段）
   - 已存在的数据会更新，新数据会添加

### 2. 当前实现的局限性

**问题：**
- ❌ 只提取**当前页面可见**的数据行
- ❌ 如果页面使用无限滚动加载，新滚动出来的数据**不会自动提取**
- ❌ 用户需要**手动滚动页面**，然后**再次点击抓取按钮**才能获取新数据
- ❌ 无法一次性获取所有数据（如果数据量很大）

**优点：**
- ✅ 实现简单，逻辑清晰
- ✅ 通过 `addBatch()` 自动去重，避免重复数据
- ✅ 性能较好，只处理当前可见的数据

## 滚动加载场景分析

### 场景1：无限滚动加载
- 用户滚动到页面底部时，自动加载更多数据
- 新数据通过 AJAX/API 动态插入到 DOM
- 新插入的 `tr[data-row-key]` 元素不会自动被提取

### 场景2：分页加载
- 页面底部有"加载更多"或"下一页"按钮
- 需要用户点击才能加载新数据
- 新数据加载后，需要再次点击抓取按钮

## 解决方案建议

### 方案1：监听滚动事件（推荐）

**实现思路：**
- 在 `content.js` 中监听页面滚动事件
- 当滚动到底部附近时，自动提取新出现的 `tr[data-row-key]` 元素
- 记录已提取的 `id` 列表，只提取新数据

**优点：**
- 自动化程度高，用户体验好
- 可以持续提取新数据
- 通过去重机制避免重复

**缺点：**
- 需要持续监听，可能影响性能
- 需要判断滚动到底部的逻辑
- 需要维护已提取数据的记录

**实现要点：**
```javascript
// 在 content.js 中
let extractedIds = new Set(); // 记录已提取的id

// 监听滚动事件
window.addEventListener('scroll', debounce(() => {
  const rows = document.querySelectorAll('tr[data-row-key]');
  const newRows = Array.from(rows).filter(row => {
    const id = row.getAttribute('data-row-key');
    return !extractedIds.has(id);
  });
  
  if (newRows.length > 0) {
    // 提取新数据
    const newData = newRows.map(row => extractDarenData(row)).filter(Boolean);
    // 发送到popup或直接保存
  }
}, 500));
```

### 方案2：自动滚动抓取模式

**实现思路：**
- 提供"自动滚动抓取"按钮
- 自动滚动页面到底部，等待新数据加载
- 持续提取直到没有新数据

**优点：**
- 可以一次性获取所有数据
- 用户操作简单

**缺点：**
- 可能触发网站的反爬虫机制
- 滚动速度需要控制，避免过快
- 需要判断何时停止（没有新数据）

**实现要点：**
```javascript
async function autoScrollAndExtract() {
  let previousRowCount = 0;
  let noNewDataCount = 0;
  
  while (noNewDataCount < 3) { // 连续3次没有新数据则停止
    // 滚动到底部
    window.scrollTo(0, document.body.scrollHeight);
    await sleep(2000); // 等待新数据加载
    
    const currentRowCount = document.querySelectorAll('tr[data-row-key]').length;
    if (currentRowCount > previousRowCount) {
      // 有新数据，提取
      extractAndSave();
      previousRowCount = currentRowCount;
      noNewDataCount = 0;
    } else {
      noNewDataCount++;
    }
  }
}
```

### 方案3：增量提取模式

**实现思路：**
- 记录上次提取时的行数或最后一条数据的id
- 每次抓取时，只提取新增的数据行
- 通过 `storage.addBatch()` 自动去重

**优点：**
- 性能好，只处理新数据
- 利用现有的去重机制
- 实现相对简单

**缺点：**
- 需要维护提取状态
- 如果用户清空了数据，需要重新提取

**实现要点：**
```javascript
// 在 content.js 中
let lastExtractedCount = 0;

function extractNewData() {
  const allRows = document.querySelectorAll('tr[data-row-key]');
  const currentCount = allRows.length;
  
  if (currentCount > lastExtractedCount) {
    // 只提取新增的行
    const newRows = Array.from(allRows).slice(lastExtractedCount);
    const newData = newRows.map(row => extractDarenData(row)).filter(Boolean);
    lastExtractedCount = currentCount;
    return newData;
  }
  return [];
}
```

### 方案4：提示用户手动操作

**实现思路：**
- 在抓取按钮附近显示提示信息
- 提示用户需要滚动页面后再点击抓取
- 显示当前页面可见的数据行数

**优点：**
- 实现最简单
- 不改变现有逻辑
- 用户可控

**缺点：**
- 用户体验较差
- 需要用户多次操作

## 推荐方案

**建议采用方案1（监听滚动事件）+ 方案3（增量提取）的组合：**

1. **默认模式**：保持现有的手动抓取方式
2. **自动模式**（可选）：提供开关，开启后自动监听滚动并提取新数据
3. **增量提取**：记录已提取的数据id，只提取新数据，利用现有的 `addBatch()` 去重机制

**实现优先级：**
1. ✅ 当前实现（手动抓取）- 已完成
2. 🔄 增量提取优化 - 建议实现
3. 🔄 滚动监听自动提取 - 可选功能
4. 🔄 自动滚动抓取模式 - 可选功能

## 技术要点

### 1. 去重机制
- 当前已实现：`storage.addBatch()` 基于 `id` 自动去重
- 新数据会更新已存在的数据，新数据会添加

### 2. 性能考虑
- 使用防抖（debounce）或节流（throttle）限制滚动事件处理频率
- 批量提取，避免频繁操作 DOM
- 使用 `Set` 数据结构快速判断是否已提取

### 3. 用户体验
- 提供提取进度提示
- 显示已提取数据数量
- 允许用户停止自动提取
