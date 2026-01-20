# 抖音精选联盟达人信息抓取 Chrome 扩展

这是一个Chrome浏览器扩展，用于从抖音精选联盟页面（https://buyin.jinritemai.com/dashboard/servicehall/daren-square）自动提取达人信息并存储到本地。

## 功能特性

- ✅ 从抖音精选联盟页面提取达人信息（名称、粉丝数、类别、地区、价格范围等）
- ✅ 数据本地存储（使用localStorage）
- ✅ 完整的日志记录系统，方便问题排查
- ✅ 数据导出功能（JSON格式，支持中英文字段名）
- ✅ 日志查看和导出功能
- ✅ 模块化架构，便于扩展
- ✅ 自动去重机制，基于达人ID避免重复存储

## 项目结构

```
chrome-extension-douyin/
├── manifest.json                 # Chrome扩展配置文件
├── popup/
│   ├── popup.html               # 插件弹窗界面
│   ├── popup.js                 # 弹窗逻辑
│   └── popup.css                # 弹窗样式
├── content/
│   └── content.js               # 内容脚本，用于提取页面数据
├── background/
│   └── background.js            # 后台脚本，处理数据存储和通信
├── utils/
│   ├── logger.js                # 日志模块
│   ├── storage.js               # 数据存储模块
│   └── dataExtractor.js         # 数据提取工具函数
├── README.md                    # 项目文档
└── icons/                       # 扩展图标（需要自行添加）
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

## 安装部署

### 1. 准备图标文件

在 `icons/` 目录下放置以下图标文件：
- `icon16.png` - 16x16像素
- `icon48.png` - 48x48像素  
- `icon128.png` - 128x128像素

如果暂时没有图标，可以使用占位图片或从网络下载临时图标。

### 2. 加载扩展

1. 打开Chrome浏览器，进入扩展管理页面：
   - 方法一：在地址栏输入 `chrome://extensions/`
   - 方法二：点击右上角三点菜单 → 更多工具 → 扩展程序

2. 启用"开发者模式"：
   - 在扩展管理页面右上角，打开"开发者模式"开关

3. 加载扩展：
   - 点击"加载已解压的扩展程序"按钮
   - 选择本项目的根目录（`chrome-extension-douyin`）
   - 点击"选择文件夹"

4. 验证安装：
   - 扩展应该出现在扩展列表中
   - 浏览器工具栏应该显示扩展图标

### 3. 使用扩展

1. 访问目标页面：
   - 打开 https://buyin.jinritemai.com/dashboard/servicehall/daren-square
   - 确保页面已完全加载（能看到达人列表表格）

2. 点击扩展图标：
   - 在浏览器工具栏点击扩展图标，打开弹窗

3. 开始抓取：
   - 点击"开始抓取"按钮
   - 等待抓取完成，会显示成功消息和抓取的数据条数

4. 查看数据：
   - 点击"查看数据"按钮，查看已抓取的数据列表
   - 点击"导出数据"按钮，将数据导出为JSON文件
   - 勾选"使用中文字段名"复选框，可导出中文字段名的JSON文件

5. 查看日志：
   - 点击"查看日志"按钮，查看操作日志
   - 点击"导出日志"按钮，将日志导出为文本文件

## 数据字段说明

提取的达人信息包含以下字段：

| 字段名 | 类型 | 说明 |
|--------|------|------|
| id | string | 达人唯一标识（使用data-row-key） |
| name | string | 达人名称 |
| fans | number | 粉丝数 |
| category | string | 类别（如：服饰内衣/美食） |
| style | string | 风格（如：生活记录） |
| region | string | 地区（如：宁夏·中卫） |
| priceRange | string | 销售总额（如：¥2.5万-5万） |
| liveSalesTotal | string | 直播销售总额 |
| imageSalesTotal | string | 图文销售总额 |
| videoSalesTotal | string | 视频销售总额 |
| showcaseSalesTotal | string | 橱窗销售总额 |
| tags | string[] | 标签数组（如有联系方式、回复率高） |
| contactAvailable | boolean | 是否有联系方式 |
| replyRate | string | 回复率 |
| capturedAt | string | 抓取时间戳（ISO格式） |
| createdAt | string | 创建时间戳（ISO格式） |
| updatedAt | string | 更新时间戳（ISO格式） |

### 导出格式说明

- **英文字段名**（默认）：使用原始英文字段名，便于程序处理
- **中文字段名**（可选）：勾选"使用中文字段名"后，导出的JSON文件使用中文字段名，便于阅读

导出文件命名规则：
- 英文格式：`douyin_daren_[时间戳].json`
- 中文格式：`douyin_daren_中文_[时间戳].json`

## 开发说明

### 模块说明

- **logger.js**: 日志模块，提供DEBUG、INFO、WARN、ERROR四个级别的日志记录，日志存储在localStorage中，最多保存1000条
- **storage.js**: 数据存储模块，封装localStorage操作，提供数据的增删改查和导出功能
- **dataExtractor.js**: 数据提取工具函数，包含从DOM元素中提取达人信息的辅助函数
- **content.js**: 内容脚本，在目标页面中运行，监听来自popup的消息，提取页面数据并返回
- **background.js**: 后台脚本（Service Worker），处理消息传递和扩展生命周期事件
- **popup.js/html/css**: 弹窗界面，提供用户交互界面

### 扩展性设计

1. **模块化架构**：各功能模块独立，便于后期扩展和维护
2. **配置化**：字段选择器和数据解析规则可以提取为配置文件
3. **插件系统**：预留扩展接口，可以扩展数据源和处理逻辑
4. **数据导出格式**：当前支持JSON格式（支持中英文字段名），CSV格式已实现但未在UI中暴露

### 修改配置

如果需要修改数据提取规则，可以编辑以下文件：

- `content/content.js` - 修改DOM选择器和数据提取逻辑
- `utils/dataExtractor.js` - 修改数据提取工具函数

## 常见问题

### Q: 抓取不到数据怎么办？

A: 
1. 确保页面已完全加载（能看到达人列表表格）
2. 检查是否在正确的页面（URL应包含 `buyin.jinritemai.com/dashboard/servicehall/daren-square`）
3. 查看日志，了解具体错误信息
4. 检查页面结构是否发生变化（可能网站更新了）

### Q: 存储空间不足怎么办？

A: 
- localStorage有5-10MB的容量限制
- 可以点击"清空数据"或"清空日志"释放空间
- 建议定期导出数据并清理旧数据

### Q: 如何更新扩展？

A: 
1. 修改代码后，在扩展管理页面点击扩展卡片的"刷新"按钮
2. 或者卸载后重新加载扩展

### Q: 数据存储在哪里？

A: 
- 达人数据存储在 `localStorage` 中，键名为 `douyin_daren_data`
- 日志数据存储在 `localStorage` 中，键名为 `douyin_extension_logs`

## 注意事项

1. **页面动态加载**：页面可能是动态加载的，扩展会等待DOM加载完成后再提取数据
2. **滚动加载**：当前版本只抓取当前页面可见的数据，不支持自动处理滚动加载的新数据。如需获取更多数据，请手动滚动页面后再次点击"开始抓取"按钮
3. **存储限制**：localStorage有容量限制（通常5-10MB），建议定期导出和清理数据
4. **日志管理**：日志最多保存1000条，采用FIFO策略自动清理旧日志
5. **页面更新**：如果抖音网站更新页面结构，可能需要更新选择器
6. **数据去重**：扩展会自动基于达人ID进行去重，重复抓取同一达人会更新数据而不是新增

## 许可证

本项目仅供学习和研究使用。

## 更新日志

详细的更新日志请查看 [CHANGELOG.md](./CHANGELOG.md)

### 最新版本 v1.2.2

- ✅ 修复价格列提取顺序问题
- ✅ 支持中英文字段名导出
- ✅ 新增多个销售总额字段（直播、图文、视频、橱窗）
- ✅ 优化数据提取逻辑

### 主要版本历史

- **v1.2.0**: 重构数据提取模块，提升代码模块化
- **v1.1.0**: 修复粉丝数提取，新增销售总额字段
- **v1.0.0**: 初始版本发布
