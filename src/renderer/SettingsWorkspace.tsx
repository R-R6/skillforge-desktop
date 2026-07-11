import { useEffect, useState } from "react";
import { Archive, Check, Download, FolderCog, Save, ShieldCheck } from "lucide-react";
import type { AppInfo, SettingsMap } from "../shared/types";

const defaults: SettingsMap = {
  proxyHost: "127.0.0.1",
  proxyPort: "7897",
  autoScan: "on",
};

export default function SettingsWorkspace() {
  const [settings, setSettings] = useState<SettingsMap>(defaults);
  const [appInfo, setAppInfo] = useState<AppInfo | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([window.skillforge.getSettings(), window.skillforge.getAppInfo()])
      .then(([saved, info]) => {
        setSettings({ ...defaults, ...saved });
        setAppInfo(info);
      })
      .catch((error) => setNotice(error instanceof Error ? error.message : "设置读取失败"));
  }, []);

  function update(key: string, value: string) {
    setSettings((current) => ({ ...current, [key]: value }));
  }

  async function save() {
    setSaving(true);
    await Promise.all(Object.entries(settings).map(([key, value]) => window.skillforge.setSetting(key, value)));
    setSaving(false);
    setNotice("设置已保存");
  }

  async function backup() {
    const result = await window.skillforge.backupDatabase();
    if (result) setNotice(`数据库备份已保存：${result.filePath}`);
  }

  async function exportData() {
    const result = await window.skillforge.exportData();
    if (result) setNotice(`数据导出已保存：${result.filePath}`);
  }

  return (
    <section className="settings-workspace">
      <div className="section-toolbar project-toolbar">
        <div><h2>设置</h2><span>管理 SkillForge Desktop 的本地行为和数据。</span></div>
        <button className="primary-button" onClick={save} disabled={saving}><Save size={16} /> {saving ? "保存中…" : "保存设置"}</button>
      </div>
      {notice && <div className="notice-bar"><Check size={15} /> {notice}</div>}
      <div className="settings-grid">
        <div className="settings-card"><div className="settings-card-heading"><FolderCog size={18} /><div><strong>常规设置</strong><span>项目扫描与自动化行为</span></div></div><div className="settings-form"><label className="toggle-row"><span><strong>打开项目管理时自动扫描</strong><small>进入项目管理并选中项目后，自动识别项目内已有的 Skill</small></span><input type="checkbox" checked={settings.autoScan === "on"} onChange={(event) => update("autoScan", event.target.checked ? "on" : "off")} /></label></div><p className="settings-hint">主题、强调色与密度请前往侧边栏「外观」页面管理。</p></div>
        <div className="settings-card"><div className="settings-card-heading"><ShieldCheck size={18} /><div><strong>网络代理</strong><span>用于 GitHub 导入与外部 Skill 来源刷新</span></div></div><div className="settings-form proxy-form"><label>代理主机<input value={settings.proxyHost} onChange={(event) => update("proxyHost", event.target.value)} placeholder="127.0.0.1" /></label><label>端口<input value={settings.proxyPort} onChange={(event) => update("proxyPort", event.target.value)} placeholder="7897" /></label></div><p className="settings-hint">默认使用 Clash 常见端口 127.0.0.1:7897；GitHub 导入和来源刷新会使用这里保存的代理。</p></div>
        <div className="settings-card"><div className="settings-card-heading"><Archive size={18} /><div><strong>备份与导出</strong><span>保护本地 Skill 与预设数据</span></div></div><div className="settings-actions"><button className="outline-button" onClick={backup}><Archive size={15} /> 备份 SQLite 数据库</button><button className="outline-button" onClick={exportData}><Download size={15} /> 导出 JSON 数据</button></div></div>
        <div className="settings-card"><div className="settings-card-heading"><FolderCog size={18} /><div><strong>应用信息</strong><span>当前运行环境</span></div></div>{appInfo ? <div className="info-list"><div><span>版本</span><strong>{appInfo.version}</strong></div><div><span>平台</span><strong>{appInfo.platform}</strong></div><div><span>数据库</span><code>{appInfo.databasePath}</code></div><div><span>数据目录</span><code>{appInfo.userDataPath}</code></div></div> : <div className="panel-empty">读取应用信息中…</div>}</div>
      </div>
    </section>
  );
}
