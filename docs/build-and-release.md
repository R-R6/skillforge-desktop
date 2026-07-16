# 构建、测试与发布

SkillForge Desktop 基于 **electron-vite** 编译应用代码，**electron-builder** 打包 Windows NSIS 安装程序与 macOS DMG。

当前阶段支持：

- Windows：`nsis` 安装包
- macOS：Apple Silicon（arm64）与 Intel（x64）各自独立的 DMG
- macOS 使用 ad-hoc 临时签名，**不**使用 Apple 开发者证书，也**不**做 notarization 公证

## 首次环境

### 通用

```bash
npm install
npm run import:skills          # 可选：从内置 resources/skills 或旧版 jwh-skill.db 导入
npm run rebuild:native         # 若 better-sqlite3 加载失败时执行
```

### macOS 额外要求

- Apple Silicon 或 Intel Mac
- Xcode Command Line Tools（提供 `codesign`、`iconutil`、`hdiutil`）
- 本机 `git`（GitHub Skill 导入需要）

如需重新生成 macOS 图标与托盘 Template Image：

```bash
npm run icons:mac
```

该脚本只依赖仓库内 `resources/icon.png` 以及系统自带的 `sips` / `iconutil`。

## 常用命令

| 场景 | 命令 | 产物 |
|------|------|------|
| 日常开发（热重载） | `npm run dev` | 内存运行，无安装包 |
| 仅验证编译 | `npm run build` | `out/` |
| Windows 安装包（默认 `package`） | `npm run package` 或 `npm run package:win` | `release/` NSIS |
| macOS Apple Silicon DMG | `npm run package:mac:arm64` | `release/SkillForge-<version>-macos-arm64.dmg` |
| macOS Intel DMG | `npm run package:mac:x64` | `release/SkillForge-<version>-macos-x64.dmg` |
| 类型检查 | `npm run typecheck` | — |
| 代码检查 | `npm run lint` | — |
| 单元测试 | `npm run test` | — |

发版前建议：

```bash
npm run typecheck && npm run lint && npm run test && npm run package:win
# 在对应架构的 Mac 上再执行：
npm run package:mac:arm64
# 或
npm run package:mac:x64
```

说明：

- `npm run package` **保持 Windows NSIS 语义**，等价于 `package:win`。
- 不要在同一台机器上交叉混用不同架构的预编译 `better-sqlite3` 二进制；请在目标架构本机或对应 CI runner 上打包。
- 当前不提供 Universal Binary，也不提供单一通用 DMG。

## 编译流程

```
源码 (src/, resources/)
    │
    ▼  npm run build  (electron-vite)
out/
├── main/index.js
├── preload/index.cjs
└── renderer/
    │
    ▼  electron-builder
release/
├── SkillForge Desktop Setup 0.1.0.exe          # Windows NSIS（面向用户）
├── SkillForge-0.1.0-macos-arm64.dmg            # Apple Silicon
├── SkillForge-0.1.0-macos-x64.dmg              # Intel
├── builder-effective-config.yaml
├── win-unpacked/
└── mac/ 或 mac-arm64/                          # macOS 解包中间产物
```

配置见 `package.json` 的 `build` 字段：

- Windows：`win.target = nsis`
- macOS：`mac.target = dmg`，`mac.identity = null`（禁用开发者证书自动发现）
- 打包后通过 `scripts/after-pack-mac.cjs` 调用 `scripts/adhoc-sign-mac.sh`，在创建 DMG 前对 `.app` 做由内到外的 ad-hoc 签名

## macOS 本地验证

```bash
npm run package:mac:arm64

# 签名校验（路径以实际解包目录为准）
codesign --verify --deep --strict --verbose=2 "release/mac-arm64/SkillForge Desktop.app"

# 挂载 DMG
hdiutil attach "release/SkillForge-0.1.0-macos-arm64.dmg"

# 检查 DMG 中存在应用和 /Applications 链接后卸载
hdiutil detach "/Volumes/SkillForge Desktop <version>"
```

再检查架构是否匹配：

```bash
file "release/mac-arm64/SkillForge Desktop.app/Contents/MacOS/SkillForge Desktop"
find "release/mac-arm64/SkillForge Desktop.app" -name better_sqlite3.node -print -exec file {} \;
```

Apple Silicon 包应显示 `arm64`；Intel 包应显示 `x86_64`。

## macOS 安装与 Gatekeeper

1. 打开 DMG，把 `SkillForge Desktop.app` 拖到 `Applications`。
2. 优先在 Finder 中对应用图标按住 Control 单击（或右键）选择“打开”。
3. 若仍被拦截，可在终端执行（通常不需要 `sudo`）：

```bash
xattr -dr com.apple.quarantine "/Applications/SkillForge Desktop.app"
```

本应用使用 ad-hoc 临时签名，**不是** Apple 公证或认证应用，也不能把“能启动”理解成已通过 Apple 开发者验证。

## 怎么测

| 目的 | 做法 |
|------|------|
| 改 UI / 调功能 | `npm run dev` |
| 确认能编译 | `npm run build` |
| 测接近正式版的 Windows 程序 | `npm run package:win` 后运行 `release/win-unpacked/SkillForge Desktop.exe` |
| 测接近正式版的 macOS 程序 | `npm run package:mac:arm64` 后运行解包目录中的 `.app` |
| 测安装流程 | Windows 运行 NSIS；macOS 挂载 DMG 并拖入 Applications |

## 发布产物说明

**给用户的安装包**

- Windows：`release/SkillForge Desktop Setup 0.1.0.exe`
- macOS Apple Silicon：`release/SkillForge-0.1.0-macos-arm64.dmg`
- macOS Intel：`release/SkillForge-0.1.0-macos-x64.dmg`
- 版本号随 `package.json` 的 `version` 变化

**解包目录**

- `win-unpacked/`、`mac/`、`mac-arm64/` 等是打包中间产物，通常不单独发布
- 本地自测可直接运行，但必须保留整个目录结构

**代码签名**

- Windows：未配置 Authenticode 时日志可能出现 `signing is skipped`
- macOS：使用 `codesign --sign -` 的 ad-hoc 签名；不会通过 Gatekeeper 的开发者认证，也不会执行 notarization

## 版本发布说明

对外用户可见的变更、Gatekeeper 说明、验收日志和 GitHub Release 正文模板见：

- [release-notes/v0.1.0.md](./release-notes/v0.1.0.md)

发版时请同步更新该目录下对应版本说明，并保证 `package.json` 的 `version` 与 `v*` tag 一致。

## GitHub Actions 发布

仓库已配置 `.github/workflows/release.yml`，用于在推送 `v*` 版本标签时自动构建并发布三个安装包：

- Windows x64 NSIS：`SkillForge Desktop Setup <version>.exe`
- macOS ARM64 DMG：`SkillForge-<version>-macos-arm64.dmg`
- macOS Intel x64 DMG：`SkillForge-<version>-macos-x64.dmg`

### 触发方式

| 触发 | 行为 |
|------|------|
| 推送 `v*` tag | 三个独立 job 分别构建，成功后汇总到同一个 GitHub Release |
| `workflow_dispatch` | 仅构建并上传临时 artifact，**不会**创建或覆盖正式 Release |

### Runner 与架构隔离

| Job | Runner 标签 | 目标架构 |
|-----|-------------|----------|
| Windows x64 | `windows-latest` | `x64` |
| macOS ARM64 | `macos-15` | `arm64` |
| macOS Intel | `macos-15-intel` | `x86_64` |

每个 job 都会独立 `checkout`、`npm ci`、重建 `better-sqlite3`，并在安装依赖前断言 runner / Node 架构。macOS job 设置 `CSC_IDENTITY_AUTO_DISCOVERY=false`，只使用 ad-hoc 签名，不配置 Apple 证书或 notarization。

### CI 产物校验

- Windows：确认只生成一个 `.exe` 安装程序
- macOS：执行 `scripts/verify-mac-dmg.sh`，检查 DMG、ad-hoc 签名、`/Applications` 链接、主程序与 `better_sqlite3.node` 架构

### 首次发版前注意

1. `package.json` 的 `version` 必须与 tag 去掉 `v` 前缀后的版本一致，例如 tag `v0.1.0` 对应 `0.1.0`。
2. 需要把 `resources/icon.icns` 与 tray Template Image 一并提交到仓库；CI 不会重新生成图标。
3. 本机已验证 ARM64 DMG，不代表 Intel DMG 或 Windows EXE 已在线验证；首次推送 tag 后请在 Actions 与 Release 页面确认三个产物都成功上传。

### 版本发布步骤

```bash
# 1. 更新 package.json 版本号，并确认文档与变更已提交
# 2. 创建并推送 tag（示例）
git tag v0.1.0
git push origin v0.1.0

# 3. 在 GitHub Actions 查看 Release workflow
# 4. 在 GitHub Releases 页面确认三个安装包都已上传
```

如需在不打 tag 的情况下验证 workflow，可在 GitHub Actions 页面手动运行 `Release` workflow；该运行只会保留 artifact，不会发布 Release。

### 私有仓库与计费

GitHub-hosted macOS runner 会消耗 Actions 分钟数；私有仓库中 macOS 分钟通常按更高倍率计费。若 ARM64 或 Intel runner 不可用，workflow 会按架构断言失败，而不会悄悄改成跨架构构建。

## 开源 / 发 Release 建议

提交到 Git 仓库：

- 源代码、`resources/`（含 `icon.icns` 与 tray Template Image）、配置文件
- `.github/workflows/release.yml`
- `scripts/verify-mac-dmg.sh`

**不要**提交（已在 `.gitignore`）：

- `out/`
- `release/`
- `node_modules/`

GitHub Release 等对外分发建议同时提供：

- Windows NSIS
- macOS `arm64` DMG
- macOS `x64` DMG

并在 Release Notes 写明：

- M1 / M2 / M3 / M4 等 Apple Silicon：下载 `macos-arm64.dmg`
- Intel Mac：下载 `macos-x64.dmg`
- Windows 10/11：下载 Windows 安装程序

## 项目部署产物（与打包无关）

Skill 部署到目标项目时，应用会写入 `.my-skills/`（源文件）及各 Agent 原生目录（如 `.codex/skills`）。本仓库根目录的 `.my-skills/` 是开发时的自部署示例，不是 Electron 打包内容。
