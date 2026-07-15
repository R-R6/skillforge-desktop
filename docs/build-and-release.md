# 构建、测试与发布

SkillForge Desktop 基于 **electron-vite** 编译应用代码，**electron-builder** 打包 Windows 安装程序。

## 首次环境

```bash
npm install
npm run import:skills          # 可选：从内置 resources/skills 或旧版 jwh-skill.db 导入
npm run rebuild:native         # 若 better-sqlite3 加载失败时执行
```

## 常用命令

| 场景 | 命令 | 产物 |
|------|------|------|
| 日常开发（热重载） | `npm run dev` | 内存运行，无安装包 |
| 仅验证编译 | `npm run build` | `out/` |
| 打正式安装包 | `npm run package` | `release/`（内含 build） |
| 类型检查 | `npm run typecheck` | — |
| 代码检查 | `npm run lint` | — |
| 单元测试 | `npm run test` | — |

发版前建议：`npm run typecheck && npm run lint && npm run package`

## 编译流程

```
源码 (src/, resources/)
    │
    ▼  npm run build  (electron-vite)
out/
├── main/index.js          # Electron 主进程
├── preload/index.cjs      # Preload（CommonJS）
└── renderer/              # React 前端静态资源
    │
    ▼  electron-builder  (npm run package 自动执行)
release/
├── SkillForge Desktop Setup 0.1.0.exe   # NSIS 安装程序（面向用户）
├── SkillForge Desktop Setup 0.1.0.exe.blockmap
├── latest.yml
├── builder-effective-config.yaml
└── win-unpacked/                        # 解压后的可运行目录（打包中间产物）
    └── SkillForge Desktop.exe
```

配置见 `package.json` 的 `build` 字段：输出目录 `release`，Windows 目标为 `nsis`。

## 怎么测

| 目的 | 做法 |
|------|------|
| 改 UI / 调功能 | `npm run dev` |
| 确认能编译 | `npm run build` |
| 测接近正式版的程序 | `npm run package` 后运行 `release/win-unpacked/SkillForge Desktop.exe` |
| 测安装流程 | 运行 `release/SkillForge Desktop Setup 0.1.0.exe` |

`npm run package` 已包含 `build`，无需先单独执行 `build`。

## 发布产物说明

**给用户的安装包**

- `release/SkillForge Desktop Setup 0.1.0.exe`
- 版本号随 `package.json` 的 `version` 变化

**win-unpacked**

- 免安装、可直接运行的解压目录，但必须保留整个文件夹（含 `resources/`、`.dll` 等）
- 打包过程的中间产物，**通常不单独发布**
- 本地自测可直接用，不必每次走安装程序

**代码签名**

- 未配置证书时日志会出现 `signing is skipped`，本地测试正常
- 正式发布给用户前建议配置 Authenticode 签名，否则 Windows 可能提示「未知发布者」

## 开源 / 发 Release 建议

提交到 Git 仓库：

- 源代码、`resources/`、配置文件

**不要**提交（已在 `.gitignore`）：

- `out/` — 编译中间产物
- `release/` — 打包产物
- `node_modules/`

GitHub Release 等对外分发：

- 上传 `SkillForge Desktop Setup x.y.z.exe` 即可
- 用户也可自行 `npm install && npm run package` 本地构建

## 项目部署产物（与打包无关）

Skill 部署到目标项目时，应用会写入 `.my-skills/`（源文件）及各 Agent 原生目录（如 `.codex/skills`）。本仓库根目录的 `.my-skills/` 是开发时的自部署示例，不是 Electron 打包内容。
