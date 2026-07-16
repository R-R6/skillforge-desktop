# SkillForge Desktop

AI 编程工具 Skill 管理中心，面向 Codex、Cursor、Claude Code、Hermes 等编码 Agent。

当前版本是 Electron + React + SQLite 的可运行桌面版本，已经包含：

- Electron 主进程、Preload 和 React Renderer
- 本地 SQLite 数据库初始化
- 兼容旧版 `.jwh-skills` 目录的扫描识别，部署时统一写入 `.my-skills`
- 本地 SQLite 数据库使用 `skillforge.db`
- 从 `resources/skills` 导入 Markdown Skill
- Skill 搜索、分类和详情展示
- 应用内创建和编辑自定义 Skill
- 安全删除外部/自定义 Skill，并保护仍被项目或 Preset 引用的 Skill
- 内置 Skill 只读；编辑外部 Skill 时自动转为本地副本，避免来源刷新覆盖修改
- 概览页、工具同步页和 Skill 标签管理
- Skill 批量选择、批量启用/禁用、批量设置标签和带到项目部署
- 项目扫描结果支持批量导入外部 Skill，并即时加入当前库
- 项目扫描可识别 `.skills-lock.json` 锁定文件，但不会猜测或修改其内部格式
- 支持直接导入 `.my-skills/skills`、旧版 `.jwh-skills/skills` 或 `SKILL.md` 目录结构
- 支持从公开 GitHub HTTPS 仓库浅克隆并导入 Skill，来源保存在应用数据目录
- GitHub 来源 Skill 支持 `git pull --ff-only` 后刷新，编辑后自动解除远程来源
- GitHub 导入兼容仓库根地址及 `/tree/分支/子目录` 地址
- GitHub clone/pull 会复用设置页中的代理主机和端口
- 导入本地项目并选择目标 Agent
- 将 Skill 部署到 `.my-skills`、`AGENTS.md`、`CLAUDE.md`、`.cursor/rules` 和 `HERMES.md`
- 扫描项目中已有的 `.claude/skills`、`.codex/skills`、`.agents/skills`、`.cursor/rules` 和入口文件
- 将可识别的外部 Skill 导入本地库，并保留来源路径
- 外部 Skill 来源刷新回应用内库
- Preset 创建、编辑、删除，以及一键应用到项目
- 设置、代理配置、SQLite 备份、JSON 导出和 JSONL 日志
- Windows / macOS 应用图标、菜单和托盘入口

## 开发

```bash
npm install
npm run import:skills
npm run dev
```

如果使用 Electron 运行时加载 better-sqlite3，首次安装后执行：

```bash
npm run rebuild:native
```

macOS 如需重新生成 `.icns` 与托盘 Template Image：

```bash
npm run icons:mac
```

## 构建

```bash
npm run typecheck
npm run build
```

构建 Windows 安装包（`npm run package` 保持该语义）：

```bash
npm run package
# 或
npm run package:win
```

构建 macOS DMG（需要在对应架构的 Mac 上执行）：

```bash
npm run package:mac:arm64
npm run package:mac:x64
```

安装包输出示例：

- Windows：`release/SkillForge Desktop Setup 0.1.0.exe`
- macOS Apple Silicon：`release/SkillForge-0.1.0-macos-arm64.dmg`
- macOS Intel：`release/SkillForge-0.1.0-macos-x64.dmg`

推送 `v*` 版本标签后，GitHub Actions 会自动构建并发布上述三种产物。请按电脑架构选择 macOS 包：

- Apple Silicon（M1 / M2 / M3 / M4 等）：下载 `macos-arm64.dmg`
- Intel Mac：下载 `macos-x64.dmg`

### macOS 安装说明（未公证）

macOS 包使用 ad-hoc 临时签名，**未**使用 Apple 开发者证书，也**未**公证。这不代表应用已通过 Apple 认证。

1. 打开 DMG，将 `SkillForge Desktop.app` 拖到“应用程序”。
2. 优先在 Finder 中右键（或 Control 单击）应用，选择“打开”。
3. 若仍被 Gatekeeper 拦截，再执行：

```bash
xattr -dr com.apple.quarantine "/Applications/SkillForge Desktop.app"
```

默认不需要 `sudo`。更多本地构建、CI 发布与验证细节见 [`docs/build-and-release.md`](docs/build-and-release.md)。

首次在线发布前，请确认 `package.json` 版本号与 `v*` tag 一致，并已在 GitHub Actions 中验证三个平台产物均成功上传。

代码检查：

```bash
npm run lint
```

本项目是独立实现的 AI Agent Skill 管理工具，与其他同名 SkillForge 项目无关联。

当前仓库内置了完整的 Skill 资源库（`resources/skills`）。如需从旧版 Jwh Skill 数据库重新导入，可执行：

```bash
npm run import:skills
```

默认会读取 `%APPDATA%\\jwh-skill\\jwh-skill.db`，也可以传入自定义数据库路径：

```bash
node scripts/import-jwh-skills.mjs "D:\\path\\to\\jwh-skill.db"
```
