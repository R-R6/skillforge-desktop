# SkillForge Desktop macOS 适配方案

## 1. 文档目的

本文给出 SkillForge Desktop 从当前 Windows 版本扩展到 macOS 的落地方案。目标是面向个人学习和开源分发，在 GitHub Releases 同时提供 Apple Silicon 与 Intel 两个 DMG 安装包。

本方案参考 CodexPlusPlus 的发布方式：使用不同架构的 macOS runner 构建独立 DMG，对 `.app` 执行 ad-hoc 临时签名，并将产物自动上传到 GitHub Release。

## 2. 已确认的产品边界

### 2.1 目标

- 保持现有 Electron、React、SQLite 技术栈，不重写应用。
- 保持 Windows NSIS 构建和现有功能可用。
- 发布两个安装包：
  - `SkillForge-<version>-macos-arm64.dmg`
  - `SkillForge-<version>-macos-x64.dmg`
- DMG 内提供 `SkillForge Desktop.app` 和指向 `/Applications` 的快捷入口。
- GitHub Release 创建后，自动构建并上传 Windows 与 macOS 产物。
- macOS 版本覆盖 Skill 库管理、项目扫描、Skill 部署、GitHub 导入、SQLite 数据、主题、菜单和托盘等现有能力。

### 2.2 非目标

- 不购买或配置 Apple Developer Program 账号。
- 不使用 `Developer ID Application` 证书。
- 不提交 Apple notarization 公证。
- 不提供 Mac App Store 版本。
- 第一阶段不合并 Universal Binary，不提供单一通用 DMG。
- 第一阶段不承诺应用内自动更新；GitHub Releases 是版本分发入口。
- 不为适配 macOS 重构与平台无关的业务模块。

### 2.3 已知用户体验限制

由于应用未使用 Apple 认可的开发者证书签名和公证，macOS Gatekeeper 可能提示“无法验证开发者”或“应用已损坏”。README 和 Release Notes 必须明确提供以下处理方式：

```bash
xattr -dr com.apple.quarantine "/Applications/SkillForge Desktop.app"
```

优先指导用户先尝试 Finder 中右键应用并选择“打开”。只有仍被 Gatekeeper 阻止时，才使用上述命令。命令不需要 `sudo`，除非目标目录的权限确实要求管理员权限。

## 3. 当前项目适配评估

### 3.1 已具备的跨平台基础

现有代码已经包含一部分 macOS 支持，适配工作不是从零开始：

- `src/main/bootstrap.ts` 已把默认数据目录映射到 `~/Library/Application Support`。
- `src/main/index.ts` 已使用 macOS 应用菜单、`hiddenInset` 标题栏和标准 `activate` 行为。
- 关闭全部窗口时，macOS 不会立即退出应用。
- `src/main/theme.ts` 已将 Windows 标题栏覆盖逻辑限制在 `win32`。
- 项目扫描、Skill 部署、全局 Agent Skill 目录主要使用 Node `path` 和 `os.homedir()`，可直接支持 POSIX 路径。
- Electron 文件选择器、`shell.openPath`、Git 子进程和 SQLite 数据访问均有跨平台基础。
- 现有 `resources/icon.png` 为 1024 x 1024，可作为生成 `.icns` 的源文件。

### 3.2 主要缺口

| 区域 | 当前状态 | macOS 落地点 |
|---|---|---|
| 打包配置 | 只有 Windows `nsis` | 增加 `mac`、`dmg`、架构和产物命名配置 |
| 原生模块 | `better-sqlite3` 随当前环境重建 | 在对应 macOS 架构 runner 上分别安装和重建 |
| 应用图标 | Windows 使用 `.ico`，窗口使用 PNG | 生成并配置 `.icns`，检查 Dock/Finder 显示 |
| CI 发布 | 仓库未配置 macOS Release 工作流 | 增加 GitHub Actions 构建矩阵和 Release 上传 |
| 签名 | 未配置 macOS | 对 `.app` 执行 ad-hoc 签名并验证包内原生二进制 |
| Hermes 发现 | 包含 Windows PowerShell 和安装目录探测 | macOS 使用 `$HERMES_HOME` 和 `~/.hermes`，不执行 PowerShell |
| 托盘 | 使用普通彩色 PNG和双击行为 | 提供 macOS Template Image，单击显示或恢复窗口 |
| 菜单 | 已有最小菜单 | 补齐隐藏、全部显示、关闭和标准编辑角色 |
| 文档 | 构建发布文档只描述 Windows | 增加 macOS 本地构建、安装和 Gatekeeper 指南 |

## 4. 推荐架构

### 4.1 平台分层

业务层继续保持平台无关，只在确实依赖操作系统的边界处分支：

```text
React Renderer
      |
Preload / IPC contracts
      |
Electron main process
      |
+----------------------+----------------------+
| shared business code | platform integration |
| DB / scan / deploy   | window / tray / path |
+----------------------+----------------------+
      |
macOS arm64 or x64 native runtime
```

平台判断集中保留在以下边界：

- 应用和数据目录：`bootstrap.ts`
- 窗口、菜单、Dock 与托盘：`index.ts`
- 原生主题桥接：`theme.ts`
- Hermes 安装发现：`hermesConfig.ts`
- 安装包定义：`package.json` 和 GitHub Actions

不在 React 业务组件中散布新的 `process.platform` 判断。Renderer 只在需要调整窗口顶部留白时继续使用主进程注入的 `platform-darwin` class。

### 4.2 构建产物策略

采用两个独立原生构建，不使用交叉编译或 Universal 合并：

| 架构 | GitHub runner | Electron Builder 参数 | 产物 |
|---|---|---|---|
| Apple Silicon | `macos-14` 或当前可用 ARM runner | `--mac dmg --arm64` | `macos-arm64.dmg` |
| Intel | 当前可用 Intel runner | `--mac dmg --x64` | `macos-x64.dmg` |

每个 runner 都独立执行依赖安装、类型检查、测试、构建和打包。这样 `better-sqlite3` 会针对 runner 的真实 CPU 架构生成或下载正确二进制，避免跨架构原生模块混装。

### 4.3 Electron Builder 配置

在现有 `build` 字段中增加：

- `mac.target = dmg`
- `mac.icon = resources/icon.icns`
- `mac.category = public.app-category.developer-tools`
- `mac.identity = null`，避免 Electron Builder 自动查找开发者证书
- `dmg` 窗口、应用图标和 `/Applications` 链接布局
- 带 `${arch}` 的 `artifactName`，避免两个架构互相覆盖

Windows 继续使用现有 `win.target = nsis`，并拆分脚本：

- `package:win`
- `package:mac:arm64`
- `package:mac:x64`
- `package` 保留为当前平台的默认打包入口，或者明确改名为 `package:win` 后同步文档

具体脚本名称在实施计划阶段以 Electron Builder 实际参数验证结果为准，但不得改变已有 Windows 产物语义。

### 4.4 ad-hoc 签名

参考 CodexPlusPlus，使用 `codesign --sign -` 进行 ad-hoc 签名。与该项目不同的是，SkillForge 包含 Electron Framework 和 `better-sqlite3.node`，不能只签最外层 `.app`。

优先让 Electron Builder 完成未证书打包，再通过 `afterSign` 或独立脚本按由内到外的顺序处理：

1. 签名 `better_sqlite3.node` 等 Mach-O 原生文件。
2. 签名 Electron Framework 内部 helper、framework 和 dylib。
3. 签名所有 Helper `.app`。
4. 最后签名 `SkillForge Desktop.app`。
5. 执行 `codesign --verify --deep --strict --verbose=2`。

ad-hoc 签名只保证包内代码结构一致，不会让 Gatekeeper 信任发布者，也不等同于 Apple 公证。

## 5. macOS 运行时适配

### 5.1 窗口和应用生命周期

- 保留 `titleBarStyle: hiddenInset` 和当前 28px 顶部安全区。
- 验证交通灯按钮不会覆盖侧边栏内容。
- `Cmd+W` 关闭窗口但不退出应用。
- 点击 Dock 图标且当前无窗口时重新创建窗口。
- 应用退出必须通过 `Cmd+Q`、应用菜单或托盘菜单触发。
- 增加 `hide`、`hideOthers`、`unhide`、`close` 等标准 macOS 菜单角色。

### 5.2 托盘和 Dock

- 为 macOS 增加单色 Template Image，例如 `trayTemplate.png` 与 `trayTemplate@2x.png`。
- macOS 托盘图标使用 `nativeImage.setTemplateImage(true)`，自动适配浅色和深色菜单栏。
- 单击托盘图标恢复或聚焦主窗口；不依赖 Windows 风格的双击。
- Windows 继续使用现有彩色托盘图标与行为。

### 5.3 路径与文件权限

- 默认数据目录保持 `~/Library/Application Support/skillforge-desktop`。
- 自定义数据目录、Git 克隆目录和项目目录由系统文件选择器授权。
- 所有路径比较继续通过 `path.resolve`、`path.relative` 和 `path.sep` 完成。
- 不把 POSIX 路径手工转换为 Windows 反斜杠。
- 检查部署到只读目录、外接盘和受保护目录时的错误提示，保留原始系统错误中的关键原因。

### 5.4 Agent 与 Hermes 兼容

- Codex、Claude Code、Cursor 的全局目录已经使用 `~/.codex`、`~/.claude`、`~/.cursor`，可直接复用。
- Hermes 在 macOS 上优先读取当前进程的 `HERMES_HOME`，否则使用 `~/.hermes`。
- Windows 的 PowerShell 环境变量读取和进程扫描必须继续受 `process.platform === "win32"` 保护。
- 第一阶段不猜测 Hermes Desktop 在 macOS 的私有安装数据位置；如果后续确认稳定路径，再单独补充发现逻辑。

### 5.5 Git 和代理

- GitHub 导入继续调用系统 `git`。
- 启动 Git 操作前不修改用户全局 Git 配置，只通过当前子进程环境或 `-c` 参数传递代理。
- Git 不存在时显示明确提示，并在文档中说明安装 Xcode Command Line Tools 或独立 Git。
- 验证包含空格和中文的项目路径、仓库路径与数据目录。

## 6. GitHub Release 流程

### 6.1 触发方式

参考 CodexPlusPlus，正式产物工作流在 GitHub Release 发布时触发：

```text
创建 tag -> 创建并发布 GitHub Release
                 |
                 +-> Windows NSIS job
                 +-> macOS arm64 DMG job
                 +-> macOS x64 DMG job
                              |
                              +-> 上传同一个 Release
```

PR 和普通 push 只执行类型检查、测试和应用构建，不创建 Release 产物。

### 6.2 macOS job 步骤

1. Checkout Release 对应 tag，而不是不稳定的默认分支 HEAD。
2. 安装项目声明的 Node 版本并启用 npm 缓存。
3. 执行 `npm ci`。
4. 执行类型检查、单元测试和生产构建。
5. 重建或验证当前架构的 `better-sqlite3`。
6. 使用 Electron Builder 生成当前架构 `.app` 和 DMG。
7. 执行 ad-hoc 签名校验和包结构校验。
8. 挂载 DMG，验证 `.app` 和 `/Applications` 链接存在。
9. 运行 `file` 检查主程序与 `better_sqlite3.node` 架构。
10. 计算 SHA-256，并将 DMG 上传到当前 GitHub Release。

### 6.3 产物命名

命名必须包含版本、平台和架构：

```text
SkillForge-0.1.0-macos-arm64.dmg
SkillForge-0.1.0-macos-x64.dmg
SkillForge-Desktop-Setup-0.1.0-windows-x64.exe
```

Release Notes 必须列出下载选择：

- M1、M2、M3、M4 及后续 Apple Silicon：下载 `arm64.dmg`
- Intel Mac：下载 `x64.dmg`
- Windows 10/11：下载 Windows 安装程序

## 7. 错误处理与可诊断性

- 应用启动失败时，日志继续写入用户数据目录的 `logs/app.log`。
- 数据库初始化失败必须包含数据库路径和原始错误原因，但不得记录 Skill 内容或用户凭据。
- Git 克隆失败区分 Git 未安装、网络不可达、代理错误和目标目录损坏。
- Skill 部署失败显示目标路径和权限原因，不自动提升权限。
- CI 在以下任一条件失败时不得上传 DMG：
  - 类型检查、测试或构建失败
  - 原生模块架构错误
  - `.app` 结构缺失
  - ad-hoc 签名验证失败
  - DMG 无法挂载或缺少 Applications 链接

## 8. 测试和验收

### 8.1 自动化检查

- 现有共享模块单元测试在 macOS ARM64 与 x64 runner 上通过。
- 为平台路径增加可注入平台参数的纯函数测试，覆盖 Windows、macOS 和 Linux 默认路径。
- 为 Hermes home 解析增加 macOS 环境变量和默认目录测试。
- Electron Builder 配置通过配置解析或一次最小打包验证。
- CI 检查 DMG 内的主程序和 `better_sqlite3.node` 均与目标架构一致。

### 8.2 Apple Silicon 手工验收

- 下载 Release 中的 ARM64 DMG，挂载并拖入 Applications。
- 按文档处理 Gatekeeper 后能启动。
- Dock、菜单栏、交通灯、托盘和 `Cmd+Q` 行为正确。
- 首次引导可选择默认或自定义数据目录。
- SQLite 初始化、备份和导出正常。
- GitHub Skill 导入、刷新和代理配置正常。
- 添加项目、扫描现有 Skill、部署到四类 Agent、清空部署正常。
- 深色、浅色和跟随系统主题正常。
- 重启应用后设置和数据保持。

### 8.3 Intel 手工验收

至少在真实 Intel Mac 或可信的 Intel macOS CI 环境完成：

- DMG 可挂载，`.app` 可复制并启动。
- 主程序和 `better_sqlite3.node` 为 `x86_64`。
- SQLite、Git 导入和项目部署主路径可用。

仅在 Apple Silicon 上通过 Rosetta 运行 x64 包可以作为补充检查，不能完全替代真实 Intel 环境验收。

### 8.4 完成标准

满足以下条件才视为 macOS 第一版可发布：

- Windows 现有测试和 NSIS 打包不回归。
- GitHub Release 同时包含 ARM64、x64 DMG 和 Windows EXE。
- 两个 DMG 的架构、包结构和 ad-hoc 签名验证通过。
- ARM64 主流程手工验收通过。
- Intel 至少完成 CI 包结构和原生架构验证，并明确记录手工验收状态。
- README 清晰说明架构选择和未公证安装方法。

## 9. 分阶段落地

### 阶段 A：本机可运行

- 安装 macOS Node 开发环境和依赖。
- 验证 Electron 开发模式、`better-sqlite3` 与核心功能。
- 修复窗口、菜单、托盘和 Hermes 的 macOS 差异。

输出：Apple Silicon 本机开发版本可稳定运行。

### 阶段 B：本机 DMG

- 生成 `.icns` 和托盘 Template Image。
- 扩展 Electron Builder macOS 配置。
- 完成 ARM64 DMG、ad-hoc 签名和挂载校验。

输出：本机可安装的 ARM64 DMG。

### 阶段 C：双架构 CI

- 增加 macOS ARM64/x64 构建矩阵。
- 增加原生模块架构、签名和 DMG 结构校验。
- 保留 Windows Release job。

输出：CI 自动产生三个平台产物。

### 阶段 D：GitHub Release 分发

- 按 Release tag 构建并上传产物。
- 更新 README、构建文档和 Release Notes 模板。
- 完成 ARM64 与 Intel 验收记录。

输出：用户可以从 GitHub Releases 下载对应 DMG 安装。

## 10. 风险与控制

| 风险 | 影响 | 控制方式 |
|---|---|---|
| Gatekeeper 阻止未公证应用 | 用户无法直接启动 | README、Release Notes 和应用下载说明同步提供处理步骤 |
| `better-sqlite3` 架构不匹配 | 启动时数据库模块加载失败 | 原生 runner 构建，并在上传前检查 Mach-O 架构 |
| Intel runner 可用性变化 | x64 构建中断 | 将 runner 标签集中在 workflow matrix，便于替换 |
| ad-hoc 签名遗漏嵌套二进制 | 应用启动或验证失败 | 由内到外签名，并执行严格验证和 DMG 挂载测试 |
| macOS 菜单栏图标不可见 | 深浅菜单栏下托盘失效 | 使用 Template Image，不复用 Windows 彩色图标 |
| 路径含空格或中文 | Git、部署或打开目录失败 | 所有子进程使用参数数组，增加相关手工用例 |
| Windows 构建被新配置影响 | 现有用户无法升级 | 分离平台脚本，Windows job 继续独立验证 |

## 11. 参考实现的取舍

从 CodexPlusPlus 直接借鉴：

- Release 发布事件触发产物构建。
- macOS ARM64 与 x64 使用不同 runner 和目标架构。
- 产物名显式包含架构。
- DMG 包含 `/Applications` 符号链接。
- 使用 ad-hoc 签名并在上传前校验应用包结构。
- 同一个 GitHub Release 聚合 Windows 和 macOS 产物。

不直接照搬：

- CodexPlusPlus 是 Rust/Tauri 和自定义 shell 打包；SkillForge 使用 Electron Builder，应优先复用现有工具链。
- Electron 应用包含多层 Framework、Helper 和 Node 原生模块，签名范围比两个独立 Rust 二进制更复杂。
- CodexPlusPlus 当前 README 使用 `sudo xattr`；SkillForge 文档默认先使用不带 `sudo` 的最小权限命令。

## 12. 方案结论

SkillForge Desktop 的核心业务已经具备较好的跨平台基础。第一版 macOS 适配应聚焦于原生模块构建、Electron 应用包、macOS 交互惯例和 GitHub Release 自动化，而不是重写扫描或部署逻辑。

采用双架构独立 DMG 可以把 `better-sqlite3` 的原生架构风险隔离在各自 runner 中。ad-hoc 签名符合个人学习和开源试用阶段的约束，但必须把 Gatekeeper 限制作为明确的产品边界，而不是视为已经完成正式 macOS 发布认证。
