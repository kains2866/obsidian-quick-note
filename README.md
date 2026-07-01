# Obsidian Quick Note

Chrome 浏览器扩展：点击工具栏图标，快速记录 Markdown 笔记并保存到 Obsidian。

> 详细架构与方案决策见 [`docs/architecture.md`](./docs/architecture.md)。
> 旧版（基于 Local REST API）已备份在：`obsidian-quick-note (old)/`

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

1. 右键扩展图标 → **Options**。
2. 填入 **Obsidian 仓库名**（必须与 Obsidian 中显示的名称完全一致）。
3. 设置默认保存文件夹（例如 `速记`）。
4. 保存设置。

> ⚠️ **仓库名必须正确**：如果填错仓库名，Obsidian 会弹出 "repository not found" 之类的错误，但扩展无法感知这个错误，状态栏仍会显示「已保存到 Obsidian」。请务必与 Obsidian 左下角显示的仓库名完全一致（区分大小写）。

## 使用

1. 点击扩展图标打开弹窗。
2. 输入 Markdown 内容。
3. 可选开启 URL / 标题开关，用于生成文件名。
4. 点击 **保存到 Obsidian**。
5. 第一次在某个网站保存时，浏览器会询问「是否允许此网站打开 Obsidian」，请勾选 **始终允许**。
6. Obsidian 会自动打开/唤醒，并创建目标笔记。

## 保存原理

与官方 Obsidian Web Clipper 一致：

1. 扩展把 Markdown 内容复制到系统剪贴板。
2. 当前标签页跳转到 `obsidian://new?file=...&vault=...&clipboard`。
3. Obsidian 捕获该 URI，从剪贴板读取内容，写入仓库。

如果剪贴板写入失败，自动回退到通过 URI 参数传递内容。

## 开发

```bash
npm run dev      # 开发模式
npm test         # 运行测试
npm run coverage # 覆盖率
```

## 手动测试清单

1. Build and load extension in Chrome.
2. 打开设置页，填写仓库名，保存后刷新确认持久化。
3. 在普通网页打开 popup，验证标题/URL 开关影响文件名。
4. 点击保存，验证浏览器询问是否打开 Obsidian。
5. 勾选「始终允许」后再次保存，验证是否不再弹窗。
6. 验证笔记按预期路径出现在 Obsidian 仓库中。

## 已知限制

- 首次在某个网站保存时需要授权该域名打开 Obsidian。
- **仓库名错误无法被扩展检测**：如果 Obsidian 仓库名填错，Obsidian 会报错，但扩展仍会显示保存成功。请务必核对仓库名。
- 目标文件夹必须已在 Obsidian 仓库中存在。
- 文件名冲突时不会自动重命名。

详见 [`docs/architecture.md`](./docs/architecture.md)。
