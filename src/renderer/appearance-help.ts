export const APPEARANCE_SECTION_HELP = {
  theme: "选择应用整体配色方案。Dark 与 Light 是两套独立设计，不是简单反色。切换后立即预览，点击「保存外观」后才会写入设置。",
  accent: "只替换按钮、链接、选中边框等交互色的色相，不改变布局、表面层级与 AI 语义色。",
  density: "调整全局间距、字号与控件高度。Comfortable 适合日常浏览；Compact 适合小屏或需要一屏展示更多内容时。",
  themePack: "在基础主题之上叠加 JSON 颜色包，覆盖背景、边框等 CSS Token，不影响布局结构。可与上方主题、强调色组合使用。",
  motion: "控制界面过渡动画与呼吸光效。若长时间使用感到眩晕，可关闭动画或启用「降低动态效果」。",
  preview: "用示例色块展示当前 Token 组合下的表面色、主按钮渐变与 AI 运行态语义色，便于快速确认效果。",
} as const;

export const APPEARANCE_OPTION_HELP = {
  themePackNone: "不使用任何 Theme Pack，仅保留上方选择的基础主题颜色与强调色。",
  importThemePack: "从本地选择 .json 主题包文件，校验后导入到用户数据目录，导入成功会自动选中并预览。",
  exportThemePack: "将当前选中的 Theme Pack 导出为 JSON 文件，便于备份或与团队分享。",
  exportPackItem: "导出该 Theme Pack 的 JSON 文件。",
  deletePackItem: "删除用户导入的 Theme Pack 文件；内置主题不可删除。",
  enableAnimation: "开启 Hover 过渡、选中光晕、卡片微动效与环境呼吸动画。关闭后界面切换更干脆。",
  reduceMotion: "强制减少动态效果，优先级高于系统「减少动态效果」无障碍设置。",
  previewSurface: "表面层 Token（--surface），用于卡片、面板等容器背景。",
  previewPrimary: "主操作按钮使用的品牌渐变（--brand-gradient）。",
  previewAi: "AI 相关状态使用的暖色语义 Token（--accent-ai），如运行中提示。",
  saveAppearance: "将当前所有外观偏好（主题、强调色、密度、Theme Pack、动效）写入本地设置。",
} as const;
