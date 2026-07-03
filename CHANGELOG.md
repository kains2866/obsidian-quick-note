# 更新日志

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/lang/zh-CN/).

## [0.3.0] - 2026-07-03

### 新增

- 右键菜单快捷入口：在网页任意位置、选中文本或链接上右键，点击 "Obsidian Quick Note" 即可打开扩展 popup
- Options 页面支持开发者区域完整国际化：
  - 微信支付 / WeChat Pay
  - 支付宝 / Alipay
  - GitHub ⭐ Star 鼓励文案
- 英文版 README（`README.en.md`）

### 修复

- 修复 Chrome 扩展管理页中 Obsidian Quick Note 显示为默认灰色图标的问题（补充 manifest 顶层 `icons` 字段）
- 将 Options 页面的"保存设置"按钮移至标题同一行右侧，避免用户误以为设置自动保存
- 修复 Frontmatter 区域中 "date 格式" 标签因选择条太长而换行的问题

### 变更

- manifest 新增 `contextMenus` 权限，用于右键菜单功能

## [0.2.0] - 2026-07-01

### 新增

- 初始完整版本：基于 Obsidian URI 实现一键保存 Markdown 笔记到 Obsidian
- 自动提取页面标题、URL、作者、描述、站点名到 YAML Frontmatter
- 支持将网页选中文本自动带入正文
- 可配置 Obsidian 仓库名、默认保存文件夹、日期子目录模板
- 临时覆盖目标文件夹、文件名和 Frontmatter 字段
- 保存失败时自动下载 Markdown 兜底文件
- 中英文 UI 自动切换
- 草稿自动保存与恢复
- 鼠尾草绿主题（`#65b687`）与自定义扩展图标
