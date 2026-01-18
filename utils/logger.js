/**
 * 日志模块
 * 提供日志记录功能，支持多级别日志，并存储到localStorage
 */

const LOG_STORAGE_KEY = 'douyin_extension_logs';
const MAX_LOG_COUNT = 1000; // 最大日志条数

const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3
};

class Logger {
  constructor(module = 'default') {
    this.module = module;
  }

  /**
   * 获取所有日志
   */
  static getAllLogs() {
    try {
      const logsJson = localStorage.getItem(LOG_STORAGE_KEY);
      return logsJson ? JSON.parse(logsJson) : [];
    } catch (error) {
      console.error('获取日志失败:', error);
      return [];
    }
  }

  /**
   * 保存日志到localStorage
   */
  static saveLog(logEntry) {
    try {
      let logs = Logger.getAllLogs();
      logs.push(logEntry);

      // 如果超过最大数量，删除最旧的日志（FIFO）
      if (logs.length > MAX_LOG_COUNT) {
        logs = logs.slice(logs.length - MAX_LOG_COUNT);
      }

      localStorage.setItem(LOG_STORAGE_KEY, JSON.stringify(logs));
    } catch (error) {
      console.error('保存日志失败:', error);
      // 如果存储失败，尝试清理旧日志后再保存
      if (error.name === 'QuotaExceededError') {
        try {
          const logs = Logger.getAllLogs();
          const reducedLogs = logs.slice(-Math.floor(MAX_LOG_COUNT * 0.5));
          reducedLogs.push(logEntry);
          localStorage.setItem(LOG_STORAGE_KEY, JSON.stringify(reducedLogs));
        } catch (e) {
          console.error('清理日志后仍保存失败:', e);
        }
      }
    }
  }

  /**
   * 格式化时间戳
   */
  static formatTimestamp() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const milliseconds = String(now.getMilliseconds()).padStart(3, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}.${milliseconds}`;
  }

  /**
   * 创建日志条目
   */
  createLogEntry(level, message, data = null) {
    return {
      timestamp: Logger.formatTimestamp(),
      level: level,
      module: this.module,
      message: message,
      data: data
    };
  }

  /**
   * DEBUG级别日志
   */
  debug(message, data = null) {
    const logEntry = this.createLogEntry('DEBUG', message, data);
    Logger.saveLog(logEntry);
    console.debug(`[${this.module}]`, message, data || '');
  }

  /**
   * INFO级别日志
   */
  info(message, data = null) {
    const logEntry = this.createLogEntry('INFO', message, data);
    Logger.saveLog(logEntry);
    console.info(`[${this.module}]`, message, data || '');
  }

  /**
   * WARN级别日志
   */
  warn(message, data = null) {
    const logEntry = this.createLogEntry('WARN', message, data);
    Logger.saveLog(logEntry);
    console.warn(`[${this.module}]`, message, data || '');
  }

  /**
   * ERROR级别日志
   */
  error(message, data = null) {
    const logEntry = this.createLogEntry('ERROR', message, data);
    Logger.saveLog(logEntry);
    console.error(`[${this.module}]`, message, data || '');
  }

  /**
   * 清除所有日志
   */
  static clearLogs() {
    try {
      localStorage.removeItem(LOG_STORAGE_KEY);
      return true;
    } catch (error) {
      console.error('清除日志失败:', error);
      return false;
    }
  }

  /**
   * 获取指定级别的日志
   */
  static getLogsByLevel(level) {
    const logs = Logger.getAllLogs();
    return logs.filter(log => log.level === level);
  }

  /**
   * 导出日志为JSON字符串
   */
  static exportLogs() {
    const logs = Logger.getAllLogs();
    return JSON.stringify(logs, null, 2);
  }

  /**
   * 导出日志为文本格式
   */
  static exportLogsAsText() {
    const logs = Logger.getAllLogs();
    return logs.map(log => {
      let line = `[${log.timestamp}] [${log.level}] [${log.module}] ${log.message}`;
      if (log.data) {
        line += ` | 数据: ${JSON.stringify(log.data)}`;
      }
      return line;
    }).join('\n');
  }
}

// 导出Logger类
// 浏览器环境：设置为全局变量
// 只在不存在时才设置，避免覆盖（如果脚本被加载多次）
if (typeof window !== 'undefined') {
  if (!window.Logger) {
    window.Logger = Logger;
  }
}

// Node.js环境
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Logger;
}
