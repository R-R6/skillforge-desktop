# SkillForge Desktop

AI 编程工具 Skill 管理中心，面向 Codex、Cursor、Claude Code、Hermes 等编码 Agent。

当前版本是 Electron + React + SQLite 的可运行桌面版本，已经包含：

- Electron 主进程、Preload 和 React Renderer
- 本地 SQLite 数据库初始化
- 兼容 Jwh Skill 的 `.jwh-skills` 和 `jwh-skill.db` 数据命名
- 从 `resources/skills` 导入 Markdown Skill
- Skill 搜索、分类和详情展示
- 应用内创建和编辑自定义 Skill
- 安全删除外部/自定义 Skill，并保护仍被项目或 Preset 引用的 Skill
- 内置 Jwh Skill 只读；编辑外部 Skill 时自动转为本地副本，避免来源刷新覆盖修改
- 概览页、工具同步页和 Skill 标签管理
- Skill 批量选择、批量启用/禁用、批量设置标签和带到项目部署
- 项目扫描结果支持批量导入外部 Skill，并即时加入当前库
- 项目扫描可识别 `.skills-lock.json` 锁定文件，但不会猜测或修改其内部格式
- 支持直接导入 Jwh `.jwh-skills/skills` 或 `SKILL.md` 目录结构
- 支持从公开 GitHub HTTPS 仓库浅克隆并导入 Skill，来源保存在应用数据目录
- GitHub 来源 Skill 支持 `git pull --ff-only` 后刷新，编辑后自动解除远程来源
- GitHub 导入兼容仓库根地址及 `/tree/分支/子目录` 地址
- GitHub clone/pull 会复用设置页中的代理主机和端口
- 导入本地项目并选择目标 Agent
- 将 Skill 部署到 `.jwh-skills`、`AGENTS.md`、`CLAUDE.md`、`.cursor/rules` 和 `HERMES.md`
- 扫描项目中已有的 `.claude/skills`、`.codex/skills`、`.agents/skills`、`.cursor/rules` 和入口文件
- 将可识别的外部 Skill 导入本地库，并保留来源路径
- 外部 Skill 来源刷新回应用内库
- Preset 创建、编辑、删除，以及一键应用到项目
- 设置、代理配置、SQLite 备份、JSON 导出和 JSONL 日志
- Windows 应用图标、窗口菜单和托盘入口

## 开发

```bash
npm install
npm run dev
```

如果使用 Electron 运行时加载 better-sqlite3，首次安装后执行：

```bash
npm run rebuild:native
```

## 构建

```bash
npm run typecheck
npm run build
```

构建 Windows 安装包：

```bash
npm run package
```

安装包输出到 `release/SkillForge Desktop Setup 0.1.0.exe`。

代码检查：

```bash
npm run lint
```

本项目是独立实现的 AI Agent Skill 管理工具，与其他同名 SkillForge 项目无关联。

当前仓库只内置了本地可验证的 Jwh Skill 文件；如果来源目录没有提供完整的 Skill 数据，不会在应用中伪造 279 个 Skill。后续可以通过项目扫描和外部 Skill 导入逐步扩充本地库。
