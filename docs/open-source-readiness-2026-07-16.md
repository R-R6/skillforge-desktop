# 开源就绪评估（2026-07-16）

> 评估结论快照。数据已通过 GitHub API（代理 `127.0.0.1:7897`）交叉核对；Star 数为当日近似值，会随时间变化。

## 一句话结论

**值得开源，也能服务一批真实用户；当前更适合发布为 v0.1.0 Alpha，不适合宣传成面向普通用户的稳定产品。**

产品已经成立，工程基础合格。当前最大障碍不是功能，而是：**许可证、内置 Skill 来源、安装包信任、首次发布验证**。

| 决策点 | 建议 |
|--------|------|
| 是否应该开源 | **应该** |
| 是否现在大规模推广 | **不建议** |
| 是否可先发 Alpha 找第一批用户 | **可以**，但须先解决下文 P0 |

---

## 综合评分

| 维度 | 评分 | 说明 |
|------|------|------|
| 产品价值 | 7/10 | 多 Agent 的 Skill 分散管理是真实痛点 |
| 功能完整度 | 7/10 | 搜索、编辑、导入、扫描、Preset、部署、备份已形成闭环 |
| 工程质量 | 7/10 | 测试 / TypeScript / ESLint 通过；生产依赖审计无已知漏洞 |
| 开源合规 | 2/10 | 无根许可证；大量内置 Skill 来源授权未系统整理 |
| 用户分发 | 4/10 | 尚无 GitHub Release；Windows 未签名，macOS 未公证 |
| 市场差异化 | 5/10 | 赛道成立，但已有较成熟竞品 |

发布口径建议：

> **SkillForge Desktop v0.1.0 Alpha**：面向 Codex、Cursor、Claude Code 和 Hermes 用户的本地 Skill 管理与项目部署工具。

完成许可证、第三方 Skill 来源清理、首次 CI Release、截图与安全提示后，可得出「可以面向开发者社区发布」；**目前**则是「产品可用，但开源合规和分发可信度尚未就绪」。

---

## 为什么有人会使用

核心用户不是普通电脑用户，而是同时使用 **Codex、Cursor、Claude Code、Hermes** 等工具的 AI 编程用户。

对这类用户，已有可实际使用的完整流程（非演示）：

1. 将分散的 Skill 集中管理  
2. 扫描项目已有 Skill，而非要求全部迁移  
3. 按项目和 Agent 部署  
4. 通过 Preset 保存常用组合  
5. 从 GitHub 或本地目录导入并保留来源  
6. 编辑外部 Skill 时转为本地副本，避免被更新覆盖  
7. 用受控标记更新 `AGENTS.md`、`CLAUDE.md` 等入口文件  
8. 本地 SQLite、备份和 JSON 导出，不需要云端账号  

README 对功能覆盖已有较完整说明。可主打差异：

> **面向中文 AI 编程用户的、本地优先、以「项目部署和 Preset」为核心的 Skill 工作台。**

### 卖点（应写）与误区（勿写）

**应写：**

- 中文体验  
- 项目级部署，而非只有全局软链接  
- 不依赖管理员权限的复制与受控写入  
- Hermes 支持  
- 内置精选库与本地自定义库  
- 数据完全本地化  
- 对已有项目的扫描、导入和兼容  

**勿写：**「又一个 Skills Manager」。竞品在工具数量、市场和同步方面已经领先；不能靠「支持多个 Agent」和「可导入 GitHub」形成壁垒。

---

## 竞品与赛道（2026-07-16 核对）

需求已得到市场验证；同时说明差异化必须靠定位与体验，而非功能清单。

| 项目 | Star（约） | 许可 | 备注 |
|------|------------|------|------|
| [xingkongliang/skills-manager](https://github.com/xingkongliang/skills-manager) | ~3077 | MIT | 最直接头部竞品：桌面端、15+ 工具、市场、Preset、Git 同步与备份 |
| [Dimillian/CodexSkillManager](https://github.com/Dimillian/CodexSkillManager) | ~1352 | MIT | 偏 macOS、Codex / Claude Code |
| [MoizIbnYousaf/Ai-Agent-Skills](https://github.com/MoizIbnYousaf/Ai-Agent-Skills) | ~1103 | MIT | 偏 CLI 与跨运行时包管理 |
| [jiweiyeah/Skills-Manager](https://github.com/jiweiyeah/Skills-Manager) | ~891 | MIT | Tauri；29+ 工具、市场、AI 翻译 |
| [tripleyak/SkillForge](https://github.com/tripleyak/SkillForge) | ~792 | MIT | 名称易混淆；同样服务 Claude Code / Codex |
| [wanghuan9/skill-manager](https://github.com/wanghuan9/skill-manager) | ~284 | （API 未识别） | 进一步覆盖 MCP、插件与 Git 协作 |
| [zunalabs/skills-manager](https://github.com/zunalabs/skills-manager) | ~64 | MIT | Electron；产品形态较接近 |

**品牌备注：**「SkillForge」重名多。`SkillForge Desktop` 暂时相对独特，长期建议考虑更易搜索、不易混淆的名称。

本仓库（核对当日）：`https://github.com/R-R6/skillforge-desktop` 为公开仓库，但 `licenseInfo` 为空（无 GitHub 可识别许可证）。

---

## 开源合规现状

### 现状：公开源码 ≠ 开源

根目录无 `LICENSE` 时，默认是「保留所有权利」：别人可以看代码，但原则上没有明确的复制、修改、分发授权。因此更接近「公开源码」，还不是标准意义上的开源项目。

`package.json` 的 `"private": true` **不是问题**——仅防止误发布到 npm，可保留。

### 许可证选型建议

| 目标 | 建议 |
|------|------|
| 传播与贡献优先 | **MIT**（推荐；同类产品普遍采用） |
| 修改后必须开源 | AGPL-3.0 |
| 未来可能商业闭源版 | Apache-2.0 或双许可证 |

### 最大风险：内置 Skill 版权与来源

仓库打包了完整 Skill 资源库（数百个 Markdown Skill）。其中至少部分注明来源于 `msitarzewski/agency-agents`（MIT，可用，但须保留版权与许可证声明）；更多文件缺少统一、可机器读取的来源信息。

**不能**简单地给整个仓库放一个 MIT，然后默认把所有第三方 Skill 也重新授权为 MIT。

**推荐处理：**

1. 应用核心代码使用 MIT  
2. 建立 `THIRD_PARTY_NOTICES.md`  
3. 为每个内置 Skill 记录：原始项目 / 文件 URL、原许可证、是否翻译或修改、原作者版权声明  
4. 来源不明或不允许再分发的 Skill **暂时移除**，不要随安装包分发  
5. 理想拆分：  
   - 核心应用仓库  
   - 经授权的官方 Skill Pack  
   - 用户通过 GitHub 导入其他社区内容  

这样能显著降低开源风险，也让产品定位更干净。

---

## 发布前 P0（必须处理）

1. **添加 LICENSE 与第三方内容声明**  
2. **完成内置 Skill 来源清单**；无法确认授权的内容不要随安装包分发  
3. **给 GitHub Skill 增加供应链警告**  
   - 应用会执行 `git clone` 与显式刷新时的 `git pull --ff-only`  
   - Skill 是给 AI Agent 的指令，恶意 Skill 可能诱导危险命令  
   - 至少需要：首次导入显示来源与风险提示；更新前显示变更摘要或 Diff；展示当前 commit；区分「官方内置 / 已知来源 / 未知来源」；明确提示用户审核内容  
4. **实跑第一次 GitHub Release**（仓库尚无 Release / Tag / Actions 运行记录；发布说明中「待首次实跑确认」须落地）  
5. **README 补产品截图与 30 秒上手流程**  
   - 解决什么问题、界面长什么样、三步怎么用  
   - 是否会修改项目文件、如何撤销与备份、是否上传数据  
6. **明确发布为 Alpha，并写清限制**  
   - Windows 未签名  
   - macOS 未公证  
   - 尚未支持 Linux  
   - 使用前建议备份项目  
   - 导入第三方 Skill 需自行审核  

### 工程侧已有基础（非阻塞，但需知晓）

- Electron：已启用 `contextIsolation`，关闭 `nodeIntegration`  
- 生产依赖审计：无已知漏洞（评估当日）  
- 测试主要覆盖共享逻辑；主进程文件操作、安装包启动与 UI 端到端测试仍不足  

相关文档：[build-and-release.md](./build-and-release.md)、[release-notes/v0.1.0.md](./release-notes/v0.1.0.md)。

---

## 捐赠 / 赞赏码

**可行**，同类项目（如 `jiweiyeah/Skills-Manager`）已有微信 / 支付宝 / Ko-fi 先例，社区接受度没问题。

### 写法原则

- 不要写成「等待施舍」——降低专业感，也易被理解为首要目的是收钱  
- 建议口径：若产品节省了你的时间，欢迎请作者喝杯咖啡；赞助完全自愿，不影响功能、Issue 处理或开源许可  
- **不承诺**「赞助后优先处理 Issue」，除非真的准备提供商业支持  

### 推荐结构

1. README 首屏 **不放** 二维码  
2. 在安装说明、贡献说明之后增加「支持项目」  
3. 二维码用折叠区域，避免 README 过长  
4. 国内：微信赞赏码、支付宝或爱发电  
5. 海外：Ko-fi、Buy Me a Coffee 或 GitHub Sponsors  
6. 添加 `.github/FUNDING.yml`  
7. 发布前检查付款码是否暴露个人实名信息，并遵守平台收款规则  

**心理预期：** 早期捐赠通常很少。对 0–100 Star 的项目，用户反馈、Issue、Star 和真实下载量远比捐赠金额重要。捐赠应是产品价值之后的附属入口，不是项目叙事核心。

---

## 最终建议（发布顺序）

1. LICENSE（倾向 MIT）+ `THIRD_PARTY_NOTICES.md` + 内置 Skill 来源清理  
2. GitHub Skill 导入 / 更新的安全提示与来源分级  
3. 首次 CI Release 实跑与安装包验收  
4. README 面向用户改写（截图、上手、数据与文件影响说明）  
5. 以 **v0.1.0 Alpha** 口径小范围发布，收集反馈  

完成以上后，再考虑面向开发者社区的公开推广。
