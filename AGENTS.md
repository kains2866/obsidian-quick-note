# Obsidian Quick Note — 项目级 Agent 约定

> 本文件针对 `obsidian-quick-note` 浏览器扩展项目，补充全局规范中未覆盖的专属约定。
> 通用规范默认遵循：`~/Documents/ProgramCode/docs/superpowers/specs/2026-07-10-programcode-project-conventions.md`

---

## 一、项目信息

- **项目名称**：Obsidian Quick Note
- **仓库**：https://github.com/kains2866/obsidian-quick-note
- **作者**：Kains
- **联系邮箱**：kains3772@gmail.com
- **GitHub**：https://github.com/kains2866
- **授权**：MIT License

---

## 二、技术栈与目录

- **框架**：TypeScript + Vite
- **测试**：Vitest
- **产物**：Chrome 浏览器扩展（Manifest V3）
- **入口**：`src/popup/`、`src/options/`、`src/background/`、`src/content/`

```
obsidian-quick-note/
├── src/                  # 源码
├── public/               # 静态资源（图标等进仓库资源）
├── tests/                # 测试文件
├── dist/                 # 构建产物（.gitignore）
├── coverage/             # 覆盖率报告（.gitignore）
├── CHANGELOG.md          # 中文版变更日志（内部文档，不进 Git）
├── README.md             # 中文版说明
├── README.en.md          # 英文版说明
├── privacy.html          # 隐私政策页面
└── PRODUCT.md            # 产品定位与竞品对比（内部文档，不进 Git）
```

---

## 三、开发命令

```bash
npm install
npm run dev        # 开发构建
npm run build      # 生产构建
npm run test       # 运行测试
npm run coverage   # 生成覆盖率报告
```

---

## 四、版本与发布

- **版本号来源**：`package.json` 中的 `version` 字段。
- **语义化版本**：`major.minor.patch`
  - `major`：破坏性变更或重大重构
  - `minor`：新功能、UI 改版
  - `patch`：Bug 修复、小优化
- **发布产物**：`obsidian-quick-note-v{x.y.z}.zip`，存放于 `../assets/releases/`。
- **Git tag**：`v{x.y.z}`，由用户最终执行并推送。
- **Chrome Web Store**：Agent 准备文案、截图、宣传图、商店说明；实际上传与提交审核由用户操作。

---

## 五、素材管理

| 类型 | 位置 | 是否进 Git |
|---|---|---|
| 图标、运行时静态资源 | `public/` | 是 |
| 内部文档 `CHANGELOG.md`、`PRODUCT.md` | 仓库根目录 | 否（已列入 `.gitignore`，并已从历史中剔除） |
| 构建产物 zip | `../assets/releases/` | 否 |
| 商店截图/宣传图 | `../assets/` | 否 |
| 收款码等个人素材 | `../assets/` | 否 |
| 设计稿/源文件 | `../assets/` | 否 |

---

## 六、权限与确认清单

未经用户明确同意，Agent **不得**执行以下操作：

- 直接 `git push` 到任意分支
- 创建 Git tag 或 GitHub Release
- 回复 GitHub issue / PR review
- 向 Chrome Web Store 提交审核
- 修改作者信息、仓库地址、LICENSE、隐私政策
- 新增可能影响用户数据的权限（如 `host_permissions`、`storage` 等）
- 删除用户文件或历史产物

---

## 七、产品定位

- 与 Obsidian Web Clipper 是**互补关系**，不是替代关系。
- 强调「轻量、快速、本地化保存、标签自动勾选、选中即贴」。
- 对外说明参考 `PRODUCT.md`。

---

## 八、关联文档

- 通用规范：`~/Documents/ProgramCode/docs/superpowers/specs/2026-07-10-programcode-project-conventions.md`
- 文档版本化：`~/Documents/ProgramCode/docs/superpowers/specs/2026-07-07-document-versioning-design.md`
