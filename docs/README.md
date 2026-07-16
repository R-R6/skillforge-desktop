# SkillForge Desktop 文档

本目录用于沉淀产品与技术方案，供设计与开发对齐。

## 目录

| 文档 | 说明 |
|------|------|
| [build-and-release.md](./build-and-release.md) | 开发、编译、测试、本地打包与 GitHub Actions 发布 |
| [release-notes/v0.1.0.md](./release-notes/v0.1.0.md) | **v0.1.0 发布说明** — 下载选择、变更摘要、Gatekeeper、验收日志与 Release 正文模板 |
| [macOS 适配方案](./superpowers/specs/2026-07-15-macos-adaptation-design.md) | 双架构未公证 DMG、运行时适配与 GitHub Release 落地设计 |
| [theme-system/design-philosophy.md](./theme-system/design-philosophy.md) | **设计宪法** — Dark/Light 双人格、Arctic 完整规范、决策对照表 |
| [theme-system/vision.md](./theme-system/vision.md) | Theme System 1.0 产品愿景与体系结构 |
| [theme-system/architecture.md](./theme-system/architecture.md) | 技术架构：Token 分层与 Arctic Token 参考值 |
| [theme-system/implementation-roadmap.md](./theme-system/implementation-roadmap.md) | 分期路线图 + Arctic 专项验收清单 |

## 核心设计原则（摘要）

> **Light Theme 不是 Dark Theme 的反色。**

- **Graphite Dark** → 深夜 AI 实验室（contrast · glow · calm）
- **Arctic Light** → 白天设计工作室（border · whitespace · precision）
- 布局 / 间距 / 排版 / 交互 **永远不变**；主题只换 Token
- **Warm Orange** 跨主题保留，作为 AI 语义色（Dark `#FF9F68` · Light `#EA7A2F`）
- Arctic Light **禁止 glow**；用 border + Warm White `#F6F8FB` 制造层级

完整规范见 [design-philosophy.md](./theme-system/design-philosophy.md)。

## 当前状态（2026-07）

- 已实现 **Visual System 2.0**（Graphite 石墨灰 + 交互点缀色）
- 主题能力仍为 **Dark / Light 二元反色切换**，待升级为 Theme Engine
- Theme System 方案与 design-philosophy 已写入 `theme-system/` 子目录
- macOS 适配与双架构 Release workflow 已落地；对外发版说明见 [release-notes/v0.1.0.md](./release-notes/v0.1.0.md)
- 本机已验证 ARM64 DMG；Windows EXE 与 macOS Intel DMG 待首次 `v*` tag 的 GitHub Actions 实跑确认
