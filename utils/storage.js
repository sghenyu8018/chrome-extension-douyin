/**
 * 数据存储模块
 * 封装localStorage操作，实现达人数据的增删改查
 */

const STORAGE_KEY = 'douyin_daren_data';

class Storage {
  constructor() {
    this.storageKey = STORAGE_KEY;
  }

  /**
   * 获取所有达人数据
   */
  getAll() {
    try {
      const dataJson = localStorage.getItem(this.storageKey);
      return dataJson ? JSON.parse(dataJson) : [];
    } catch (error) {
      console.error('获取数据失败:', error);
      return [];
    }
  }

  /**
   * 保存所有达人数据
   */
  saveAll(data) {
    try {
      if (!Array.isArray(data)) {
        throw new Error('数据必须是数组格式');
      }
      localStorage.setItem(this.storageKey, JSON.stringify(data));
      return true;
    } catch (error) {
      console.error('保存数据失败:', error);
      if (error.name === 'QuotaExceededError') {
        console.error('存储空间不足，请清理部分数据');
      }
      return false;
    }
  }

  /**
   * 添加单个达人数据
   */
  add(darenData) {
    const allData = this.getAll();
    
    // 检查是否已存在（根据id判断）
    const existingIndex = allData.findIndex(item => item.id === darenData.id);
    if (existingIndex >= 0) {
      // 如果已存在，更新数据
      allData[existingIndex] = {
        ...allData[existingIndex],
        ...darenData,
        updatedAt: new Date().toISOString()
      };
    } else {
      // 如果不存在，添加新数据
      allData.push({
        ...darenData,
        createdAt: new Date().toISOString()
      });
    }

    return this.saveAll(allData);
  }

  /**
   * 批量添加达人数据
   */
  addBatch(darenDataList) {
    const allData = this.getAll();
    const now = new Date().toISOString();

    darenDataList.forEach(darenData => {
      const existingIndex = allData.findIndex(item => item.id === darenData.id);
      if (existingIndex >= 0) {
        allData[existingIndex] = {
          ...allData[existingIndex],
          ...darenData,
          updatedAt: now
        };
      } else {
        allData.push({
          ...darenData,
          createdAt: now
        });
      }
    });

    return this.saveAll(allData);
  }

  /**
   * 根据ID查找达人数据
   */
  findById(id) {
    const allData = this.getAll();
    return allData.find(item => item.id === id) || null;
  }

  /**
   * 根据ID删除达人数据
   */
  deleteById(id) {
    const allData = this.getAll();
    const filteredData = allData.filter(item => item.id !== id);
    return this.saveAll(filteredData);
  }

  /**
   * 批量删除达人数据
   */
  deleteBatch(ids) {
    const allData = this.getAll();
    const filteredData = allData.filter(item => !ids.includes(item.id));
    return this.saveAll(filteredData);
  }

  /**
   * 更新达人数据
   */
  update(id, updates) {
    const allData = this.getAll();
    const index = allData.findIndex(item => item.id === id);
    
    if (index >= 0) {
      allData[index] = {
        ...allData[index],
        ...updates,
        updatedAt: new Date().toISOString()
      };
      return this.saveAll(allData);
    }
    
    return false;
  }

  /**
   * 清空所有数据
   */
  clear() {
    try {
      localStorage.removeItem(this.storageKey);
      return true;
    } catch (error) {
      console.error('清空数据失败:', error);
      return false;
    }
  }

  /**
   * 获取数据总数
   */
  count() {
    return this.getAll().length;
  }

  /**
   * 导出数据为JSON字符串
   */
  exportAsJSON() {
    const data = this.getAll();
    return JSON.stringify(data, null, 2);
  }

  /**
   * 导出数据为CSV格式
   */
  exportAsCSV() {
    const data = this.getAll();
    if (data.length === 0) {
      return '';
    }

    // 获取所有字段名
    const headers = ['id', 'name', 'fans', 'category', 'style', 'region', 'priceRange', 'liveSalesTotal', 'imageSalesTotal', 'videoSalesTotal', 'showcaseSalesTotal', 'tags', 'avatar', 'contactAvailable', 'replyRate', 'capturedAt'];
    
    // CSV头部
    const csvRows = [headers.join(',')];

    // 数据行
    data.forEach(item => {
      const row = headers.map(header => {
        let value = item[header];
        // 处理数组和对象
        if (Array.isArray(value)) {
          value = value.join(';');
        } else if (typeof value === 'object' && value !== null) {
          value = JSON.stringify(value);
        }
        // 处理包含逗号、换行符的值，需要用引号包裹
        if (typeof value === 'string' && (value.includes(',') || value.includes('\n') || value.includes('"'))) {
          value = `"${value.replace(/"/g, '""')}"`;
        }
        return value || '';
      });
      csvRows.push(row.join(','));
    });

    return csvRows.join('\n');
  }

  /**
   * 获取存储使用情况（估算）
   */
  getStorageSize() {
    try {
      const dataJson = localStorage.getItem(this.storageKey);
      if (!dataJson) return 0;
      // 使用UTF-16编码，每个字符2字节
      return dataJson.length * 2;
    } catch (error) {
      console.error('获取存储大小失败:', error);
      return 0;
    }
  }
}

// 创建单例实例并导出
// 使用 IIFE 避免变量声明冲突
(function() {
  'use strict';
  
  // 检查是否已经存在，避免重复创建
  let storageInstance;
  if (typeof window !== 'undefined' && window.storage) {
    // 如果已存在，使用现有的实例
    storageInstance = window.storage;
  } else {
    // 如果不存在，创建新实例
    storageInstance = new Storage();
  }

  // 导出Storage类和实例
  // 浏览器环境：设置为全局变量
  if (typeof window !== 'undefined') {
    // 只在不存在时才设置，避免覆盖
    if (!window.Storage) {
      window.Storage = Storage;
    }
    if (!window.storage) {
      window.storage = storageInstance;
    }
  }

  // Node.js环境
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Storage, storage: storageInstance };
  }
})();
