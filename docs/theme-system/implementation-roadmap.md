# Theme System — 实施路线图与决策分析

> 所有 Phase 的实现与验收，须对照 [design-philosophy.md](./design-philosophy.md) 设计宪法。

---

## 结论（TL;DR）

**建议：现在就开始做，但严格分期，第一阶段只做「地基 + 三主题 + Follow System + Appearance 页」。**

Visual System 2.0 刚落地，Token 意识已建立，正是把「临时 Dark/Light 反色开关」升级为 Theme Engine 的最佳窗口期。

**Phase 1 必须包含 Arctic Light 的独立 Token 设计** — 不能只是把现有 Light 模式换个文件名。

---

## 现在做 vs 未来做

| 维度 | 现在做 | 拖到未来 |
|------|--------|----------|
| **重构成本** | 低：仅 1 套组件、1 个 CSS 文件 | 高：`.theme-light` 覆盖持续膨胀 |
| **Arctic 品质** | 可按 design-philosophy 从零设计 | Light 继续像「廉价反色」 |
| **用户感知** | Follow System + 双人格主题 | 长期像 Electron 模板 |
| **Accent / Theme Pack** | Phase 2，不阻塞 | 无 Token 层则无法扩展 |

**不建议现在一次性做完：**

- ❌ 5 色 Accent + Theme Pack JSON + Acrylic 窗口

**建议现在做的最小可行 Theme Engine：**

- ✅ Token 三层拆分（design → semantic → theme）
- ✅ Graphite / **Arctic（独立设计）** / Midnight
- ✅ Follow System + Appearance 页
- ✅ 删除 `.theme-light` 反色覆盖
- ✅ Arctic 验收：**无 glow · gray hover · border 层级 · Warm White 背景**

---

## 分期实施计划

### Phase 1 — Theme Engine 地基（约 2~3 天）

| 任务 | 产出 |
|------|------|
| 创建 `src/renderer/theme/` | 目录骨架 |
| 拆分 Token 层 | `design-tokens.css` + `semantic-tokens.css` |
| `graphite-dark.css` | Visual System 2.0 快照 |
| **`arctic-light.css`** | **独立 Token，遵循 design-philosophy §6** |
| `midnight.css` | Near-black 变体 |
| `theme-manager.ts` | 运行时切换 + `data-theme` |
| Electron Follow System | `nativeTheme` + IPC |
| `AppearanceWorkspace.tsx` | 独立 Appearance 页 |
| 删除 `.theme-light` | 全文件清除反色覆盖 |

#### Phase 1 验收标准（通用）

- [ ] 切换 Graphite / Arctic / Midnight 全站一致
- [ ] Follow System 随 OS 切换
- [ ] 重启后偏好保持
- [ ] 无组件硬编码颜色

#### Phase 1 验收标准（Arctic Light 专项）

对照 [design-philosophy.md §9](./design-philosophy.md#9-dark-vs-light-决策对照表)：

- [ ] 页面背景为 `#F6F8FB` / `#F5F7FA`，非 `#FFFFFF`
- [ ] Sidebar 为 `#EFF2F7`，比背景深一级
- [ ] Card 为 `#FFFFFF` + 1px `#E5EAF2` border，无 heavy shadow
- [ ] Hover 为 `rgba(15,23,42,.04)` 浅灰，**非蓝色**
- [ ] Active / Selected 才出现蓝色；选中卡片有 `#EFF6FF` 极淡填充
- [ ] **全站无 glow**（ambient、nav、skill、hero 均无蓝光）
- [ ] Hero 为 `#FFFFFF` → `#F2F7FF` soft gradient
- [ ] Accent 为 `#2563EB` / `#3B82F6`，非 `#38BDF8`
- [ ] AI 状态色为 `#EA7A2F`，非 `#FF9F68`
- [ ] Icon 无 RGB 彩虹、无紫色渐变

#### Phase 1 验收标准（Graphite Dark 专项）

- [ ] 保持 Visual System 2.0 石墨灰基调
- [ ] Ambient glow 极 subtle（felt not seen）
- [ ] AI 状态色 `#FF9F68` 跨组件一致

### Phase 2 — 个性化层（1~2 周）

| 任务 | 产出 |
|------|------|
| Accent 5 色 | 仅替换 `--accent` 家族，不改 hover 哲学 |
| Density | `--spacing-*` scale |
| Motion 开关 | `data-motion="reduced"` |
| Appearance 页打磨 | 主题预览卡片（展示双人格差异） |

### Phase 3 — 生态扩展

| 任务 | 产出 |
|------|------|
| Theme JSON Schema | 须含 dark + light 独立 Token 集 |
| Theme Pack | Nord、Tokyo Night 等 |

---

## 与当前代码的映射

| 现状 | Phase 1 目标 |
|------|-------------|
| `settings.theme`: `"dark" \| "light"` | `appearanceMode` + `brandTheme` |
| `.theme-light { ... }` 覆盖 | **删除**，改用 `arctic-light.css` |
| Light = dark 颜色反色 | Arctic 独立 Token 文件 |
| Hero / glow 在 light 仍存在 | Arctic 强制 `--glow-*: none` |

**数据迁移：**

- `theme: light` → `appearanceMode: light, brandTheme: arctic`
- `theme: dark` → `appearanceMode: dark, brandTheme: graphite`

---

## 风险与缓解

| 风险 | 缓解 |
|------|------|
| Arctic 实现时偷懒做反色 | Phase 1 专项验收清单（§ Arctic Light 专项） |
| 组件仍写 blue hover | Code review 查 `--hover-overlay` |
| Glow 残留 | grep `--glow` 在 arctic-light 主题下全为 none |
| 范围蔓延 | Phase 1 禁止 Accent Pack |

---

## 推荐决策

```
┌──────────────────────────────────────────────────────────┐
│  ✅ 现在：Phase 1 — 地基 + 三主题 + Arctic 独立设计      │
│  ⏳ 稍后：Phase 2 — Accent + Density                     │
│  🔮 未来：Phase 3 — Theme Pack                           │
└──────────────────────────────────────────────────────────┘
```

**理由：** Visual System 2.0 解决了 Graphite「用什么颜色」；Theme System 必须解决「Dark 与 Light 是两个世界」——Arctic 若继续反色，品牌上限会被锁死。

---

## 下一步行动（确认启动 Phase 1）

1. 创建 `docs/theme-system/design-philosophy.md` ✅（已完成）
2. 创建 `src/renderer/theme/` 并拆分 Token
3. **独立编写** `arctic-light.css`（参照 design-philosophy §6）
4. 实现 `theme-manager.ts`
5. 添加 `AppearanceWorkspace`
6. 删除 `.theme-light`
7. Arctic 专项 QA checklist 逐项过

> 文档维护：Phase 完成后勾选验收清单。
