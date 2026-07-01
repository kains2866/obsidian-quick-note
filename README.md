# Obsidian Quick Note

Chrome 浏览器扩展：点击工具栏图标，快速记录 Markdown 笔记并保存到 Obsidian。

> 旧版（基于 Local REST API）已备份在：`obsidian-quick-note (old)/`

## 功能特性

- 一键保存 Markdown 笔记到 Obsidian
- 支持中英文界面自动切换
- 可配置 Obsidian 仓库名、默认保存文件夹、日期子目录模板
- 实时预览保存路径
- 支持 Frontmatter 字段：title、date、url、author、description、site、tags
- Popup 中可临时覆盖 Frontmatter 设置并预览实际值
- 页面标题 / URL 可用于生成文件名
- 选中文字可自动带入正文
- 保存失败时自动下载 Markdown 兜底文件
- 草稿自动保存与恢复
- 可临时覆盖目标文件夹和文件名

## 前置条件

- 安装 Obsidian 桌面版。
- 记住你的 **Obsidian 仓库名**（Obsidian 左下角显示的名称）。

## 安装扩展

```bash
npm install
npm run build
```

打开 Chrome → `chrome://extensions` → 开启 **Developer mode** → **Load unpacked** → 选择 `dist/` 文件夹。

## 配置扩展

1. 右键扩展图标 → **Options**（或点击 popup 中的「设置」）。
2. 填入 **Obsidian 仓库名**（必须与 Obsidian 中显示的名称完全一致，区分大小写）。
3. 设置默认保存文件夹（例如 `速记`），留空则保存到仓库根目录。
4. 设置日期子目录模板（例如 `{{YYYY}}/{{MM}}`），留空则不创建日期子目录。
5. 按需勾选 Frontmatter 字段和默认标签。
6. 保存设置。

> ⚠️ **仓库名必须正确**：如果填错仓库名，Obsidian 会弹出 "repository not found" 等错误，但扩展无法感知 Obsidian 内部是否保存成功，状态栏仍会显示「已保存到 Obsidian」。请务必与 Obsidian 左下角显示的仓库名完全一致。

## 使用

1. 点击扩展图标打开弹窗。
2. 输入 Markdown 内容；如果在页面上选中了文字，可自动带入正文。
3. 可选开启 URL / 标题开关，用于生成文件名。
4. 展开 Frontmatter 区域，查看/调整本次保存要包含的字段。
5. 点击 **保存到 Obsidian**。
6. 第一次在某个网站保存时，浏览器会询问「是否允许此网站打开 Obsidian」，请勾选 **始终允许**。
7. Obsidian 会自动打开/唤醒，并创建目标笔记。

## 保存原理

与官方 Obsidian Web Clipper 一致：

1. 扩展把 Markdown 内容复制到系统剪贴板。
2. 当前标签页跳转到 `obsidian://new?file=...&vault=...&clipboard`。
3. Obsidian 捕获该 URI，从剪贴板读取内容，写入仓库。

如果剪贴板写入失败，自动回退到通过 URI 参数传递内容。

## 语言

扩展根据 Chrome 的界面语言自动切换中文或英文：

- Chrome 界面为中文（`zh-CN`、`zh-TW`、`zh-HK` 等）时显示简体中文。
- 其他语言默认显示英文。

暂不提供手动切换。

## 开发

```bash
npm run dev      # 开发模式
npm test         # 运行测试
npm run build    # 生产构建
npm run coverage # 覆盖率
```

## 手动测试清单

1. Build 并加载扩展到 Chrome。
2. 打开设置页，填写仓库名，保存后刷新确认持久化。
3. 在普通网页打开 popup，验证标题/URL 开关影响文件名。
4. 展开 Frontmatter 区域，验证字段预览和临时覆盖生效。
5. 点击保存，验证浏览器询问是否打开 Obsidian。
6. 勾选「始终允许」后再次保存，验证是否不再弹窗。
7. 验证笔记按预期路径出现在 Obsidian 仓库中。
8. 将 Chrome 界面语言切换为英文，验证 popup 和 options 显示英文。
9. 断开当前标签页或关闭 Obsidian，验证保存失败时自动下载 `.md` 文件。

## 已知限制

- 首次在某个网站保存时需要授权该域名打开 Obsidian。
- **仓库名错误无法被扩展检测**：如果 Obsidian 仓库名填错，Obsidian 会报错，但扩展仍会显示保存成功。请务必核对仓库名。
- 目标文件夹必须已在 Obsidian 仓库中存在（`obsidian://new` 不会自动创建中间文件夹）。
- 文件名冲突时不会自动重命名。
- 语言切换基于 Chrome 界面语言，暂不支持手动切换。

## 支持开发者

如果这款工具帮到了你，可以扫码请作者喝杯咖啡 ☕

| 微信 | 支付宝 |
| :---: | :---: |
| ![微信支付](./public/assets/wechat-qr.jpg) | ![支付宝](./public/assets/alipay-qr.jpg) |

## 致谢

- 页面元数据（author、description、site 等）的提取思路参考了 [Obsidian Web Clipper](https://github.com/obsidianmd/obsidian-clipper) 所基于的开源库 [Defuddle](https://github.com/kepano/defuddle) 的启发式策略。本扩展独立实现了相关逻辑，未直接复制其源代码。
