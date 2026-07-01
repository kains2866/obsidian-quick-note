# Obsidian Quick Note

Chrome 浏览器扩展：点击工具栏图标，快速记录 Markdown 笔记并保存到 Obsidian。

## 前置条件

1. 安装 Obsidian **Local REST API** 社区插件（作者 coddingtonbear）并启用。
2. 复制插件设置中的 **API Key**。

## 安装扩展

```bash
npm install
npm run build
```

打开 Chrome → `chrome:///extensions` → 开启 **Developer mode** → **Load unpacked** → 选择 `dist/` 文件夹。

## 配置

1. 右键扩展图标 → **Options**。
2. 填入 API Key。
3. 设置默认保存文件夹（例如 `速记`）。
4. 点击 **测试连接**。

## 使用

1. 点击扩展图标打开弹窗。
2. 输入 Markdown 内容。
3. 可选开启 URL / 标题 / 播放内容开关。
4. 点击 **保存到 Obsidian**。

## 开发

```bash
npm run dev      # 开发模式
npm test         # 运行测试
npm run coverage # 覆盖率
```

## 手动测试清单

1. Build and load extension in Chrome.
2. Open popup on a regular web page: verify title/URL toggles work.
3. Save a note and verify it appears in Obsidian vault at expected path.
4. Close Obsidian or stop plugin: verify error message and `.md` download.
5. Open options page: verify settings persist and test connection works.
6. Play a video on YouTube/Bilibili: verify media timestamp is captured.
