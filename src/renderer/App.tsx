import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Bot,
  Check,
  ChevronRight,
  FolderKanban,
  FolderOpen,
  Github,
  LayoutDashboard,
  Library,
  Plus,
  Trash2,
  Search,
  Settings,
  Sparkles,
  Tags,
  Upload,
  Wrench,
  X,
} from "lucide-react";
import type { CreateSkillInput, SkillSummary } from "../shared/types";
import DashboardWorkspace from "./DashboardWorkspace";
import GitImportDialog from "./GitImportDialog";
import ProjectWorkspace from "./ProjectWorkspace";
import PresetWorkspace from "./PresetWorkspace";
import SettingsWorkspace from "./SettingsWorkspace";
import SkillEditorDialog from "./SkillEditorDialog";
import SyncWorkspace from "./SyncWorkspace";

const agents = ["Codex", "Cursor", "Claude Code", "Hermes"];

function App() {
  const [skills, setSkills] = useState<SkillSummary[]>([]);
  const [selectedSkill, setSelectedSkill] = useState<SkillSummary | null>(null);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("全部");
  const [activeNav, setActiveNav] = useState("skill-library");
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [loading, setLoading] = useState(true);
  const [syncingSkillId, setSyncingSkillId] = useState<string | null>(null);
  const [promptSkill, setPromptSkill] = useState<SkillSummary | null>(null);
  const [projectCount, setProjectCount] = useState(0);
  const [presetCount, setPresetCount] = useState(0);
  const [libraryRefreshToken, setLibraryRefreshToken] = useState(0);
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkSelectedIds, setBulkSelectedIds] = useState<string[]>([]);
  const [bulkTagInput, setBulkTagInput] = useState("");
  const [pendingProjectSkillIds, setPendingProjectSkillIds] = useState<string[]>([]);
  const [skillEditorOpen, setSkillEditorOpen] = useState(false);
  const [editingSkill, setEditingSkill] = useState<SkillSummary | null>(null);
  const [gitImportOpen, setGitImportOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    window.skillforge
      .listSkills({
        search,
        category: activeCategory === "全部" ? undefined : activeCategory,
      })
      .then((nextSkills) => {
        if (cancelled) return;
        setSkills(nextSkills);
        setSelectedSkill((current) =>
          current && nextSkills.some((skill) => skill.id === current.id) ? current : nextSkills[0] ?? null,
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [search, activeCategory, libraryRefreshToken]);

  useEffect(() => {
    Promise.all([window.skillforge.listProjects(), window.skillforge.listPresets()]).then(([projects, presets]) => {
      setProjectCount(projects.length);
      setPresetCount(presets.length);
    }).catch(() => {
      // The library remains usable if the auxiliary counters are unavailable.
    });
  }, [activeNav]);

  useEffect(() => {
    window.skillforge.getSettings().then((settings) => setTheme(settings.theme === "light" ? "light" : "dark")).catch(() => setTheme("dark"));
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  const categories = useMemo(
    () => ["全部", ...Array.from(new Set(skills.map((skill) => skill.category)))],
    [skills],
  );

  useEffect(() => {
    setBulkSelectedIds((current) => current.filter((id) => skills.some((skill) => skill.id === id)));
  }, [skills]);

  async function handleRefreshExternalSkill(skillId: string) {
    setSyncingSkillId(skillId);
    try {
      const refreshed = await window.skillforge.refreshExternalSkill(skillId);
      setSkills((current) => current.map((skill) => skill.id === refreshed.id ? refreshed : skill));
      setSelectedSkill(refreshed);
    } finally {
      setSyncingSkillId(null);
    }
  }

  async function handleToggleSkill(skill: SkillSummary) {
    const updated = await window.skillforge.setSkillEnabled(skill.id, skill.enabled === false);
    if (!updated) return;
    setSkills((current) => current.map((item) => item.id === updated.id ? updated : item));
    setSelectedSkill(updated);
  }

  async function handleSetSkillTags(skillId: string, tags: string[]) {
    const updated = await window.skillforge.setSkillTags(skillId, tags);
    if (!updated) return;
    setSkills((current) => current.map((item) => item.id === updated.id ? updated : item));
    setSelectedSkill(updated);
  }

  async function handleImportSkill() {
    const imported = await window.skillforge.importSkillFile();
    if (!imported) return;
    setActiveNav("skill-library");
    setActiveCategory("全部");
    setSelectedSkill(imported);
    setLibraryRefreshToken((current) => current + 1);
  }

  async function handleImportSkillDirectory() {
    const imported = await window.skillforge.importSkillsFromDirectory();
    if (imported.length === 0) return;
    setActiveNav("skill-library");
    setActiveCategory("全部");
    setSelectedSkill(imported[0]);
    setLibraryRefreshToken((current) => current + 1);
  }

  async function handleImportSkillsFromGit(repositoryUrl: string) {
    const imported = await window.skillforge.importSkillsFromGit(repositoryUrl);
    if (imported.length === 0) throw new Error("仓库中没有找到可导入的 Skill 文件");
    setGitImportOpen(false);
    setActiveNav("skill-library");
    setActiveCategory("全部");
    setSelectedSkill(imported[0]);
    setLibraryRefreshToken((current) => current + 1);
  }

  async function handleSaveSkill(input: CreateSkillInput) {
    const saved = editingSkill
      ? await window.skillforge.updateSkill({ ...input, skillId: editingSkill.id })
      : await window.skillforge.createSkill(input);
    setSkillEditorOpen(false);
    setSearch("");
    setActiveCategory("全部");
    setSelectedSkill(saved);
    setLibraryRefreshToken((current) => current + 1);
  }

  async function handleDeleteSkill(skill: SkillSummary) {
    if (!window.confirm(`确认删除“${skill.name}”吗？源文件不会被删除。`)) return;
    try {
      await window.skillforge.deleteSkill(skill.id);
      setSkills((current) => current.filter((item) => item.id !== skill.id));
      setSelectedSkill((current) => current?.id === skill.id ? null : current);
      setLibraryRefreshToken((current) => current + 1);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Skill 删除失败");
    }
  }

  function toggleBulkSkill(skillId: string) {
    setBulkSelectedIds((current) => current.includes(skillId) ? current.filter((id) => id !== skillId) : [...current, skillId]);
  }

  function mergeBulkUpdates(updatedSkills: SkillSummary[]) {
    const updatedById = new Map(updatedSkills.map((skill) => [skill.id, skill]));
    setSkills((current) => current.map((skill) => updatedById.get(skill.id) ?? skill));
    setSelectedSkill((current) => current ? updatedById.get(current.id) ?? current : current);
  }

  async function handleBulkEnabled(enabled: boolean) {
    if (bulkSelectedIds.length === 0) return;
    const updatedSkills = await window.skillforge.setSkillsEnabled(bulkSelectedIds, enabled);
    mergeBulkUpdates(updatedSkills);
  }

  async function handleBulkTags() {
    if (bulkSelectedIds.length === 0) return;
    const updatedSkills = await window.skillforge.setSkillsTags(bulkSelectedIds, bulkTagInput.split(/[,，]/));
    mergeBulkUpdates(updatedSkills);
    setBulkTagInput("");
  }

  function openSelectedSkillsInProjects() {
    if (bulkSelectedIds.length === 0) return;
    setPendingProjectSkillIds(bulkSelectedIds);
    setBulkMode(false);
    setBulkSelectedIds([]);
    setActiveNav("projects");
  }

  return (
    <div className={`app-shell${theme === "light" ? " theme-light" : ""}`}>
      <aside className="sidebar">
        <div className="brand">
          <img src="/icon.png" alt="SkillForge" className="brand-icon" />
          <div>
            <strong>SkillForge</strong>
            <span>Desktop</span>
          </div>
        </div>

        <div className="sidebar-label">工作台</div>
        <nav className="nav-list">
          <NavItem icon={<LayoutDashboard size={17} />} label="概览" active={activeNav === "dashboard"} onClick={() => setActiveNav("dashboard")} />
          <NavItem icon={<Library size={17} />} label="Skill 库" active={activeNav === "skill-library"} onClick={() => setActiveNav("skill-library")} />
          <NavItem icon={<FolderKanban size={17} />} label="项目管理" active={activeNav === "projects"} onClick={() => setActiveNav("projects")} />
          <NavItem icon={<Tags size={17} />} label="Preset 预设" active={activeNav === "presets"} onClick={() => setActiveNav("presets")} />
        </nav>

        <div className="sidebar-label sidebar-label-spaced">配置</div>
        <nav className="nav-list">
          <NavItem icon={<Wrench size={17} />} label="工具同步" active={activeNav === "sync"} onClick={() => setActiveNav("sync")} />
          <NavItem icon={<Settings size={17} />} label="设置" active={activeNav === "settings"} onClick={() => setActiveNav("settings")} />
        </nav>

        <div className="sidebar-footer">
          <div className="sync-status"><span className="status-dot" /> 本地工作区已就绪</div>
          <div className="version">v0.1.0 · Electron</div>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div>
            <div className="breadcrumb">SkillForge Desktop <ChevronRight size={14} /> Skill 库</div>
          <h1>{activeNav === "dashboard" ? "概览" : activeNav === "skill-library" ? "技能库" : activeNav === "projects" ? "项目管理" : activeNav === "presets" ? "Preset 预设" : activeNav === "sync" ? "工具同步" : "设置"}</h1>
          </div>
          <button className="primary-button" onClick={handleImportSkill}><Upload size={17} /> 导入 Skill</button>
        </header>

        <section className="hero-strip">
          <div className="hero-copy">
            <div className="eyebrow"><Sparkles size={14} /> AI 编程能力工作台</div>
            <h2>把专业能力，装进每一个编码 Agent。</h2>
            <p>集中管理 Skill，再按项目同步到 Codex、Cursor、Claude Code 和 Hermes。</p>
          </div>
          <div className="agent-stack">
            {agents.map((agent) => <span key={agent} className="agent-pill"><Bot size={14} /> {agent}</span>)}
          </div>
        </section>

        <section className="stats-grid">
          <StatCard label="Skill 总数" value={skills.length} detail="已载入本地库" icon={<Library size={18} />} />
          <StatCard label="支持工具" value="4" detail="Codex · Cursor · Claude · Hermes" icon={<Bot size={18} />} />
          <StatCard label="已管理项目" value={projectCount} detail="可绑定并部署 Skill" icon={<FolderKanban size={18} />} />
          <StatCard label="Preset 预设" value={presetCount} detail="可一键应用到项目" icon={<Tags size={18} />} />
          <StatCard label="同步状态" value="就绪" detail="SQLite 本地数据库" icon={<Check size={18} />} />
        </section>

        {activeNav === "dashboard" ? <DashboardWorkspace onOpenLibrary={() => setActiveNav("skill-library")} onOpenProjects={() => setActiveNav("projects")} onOpenPresets={() => setActiveNav("presets")} /> : activeNav === "projects" ? <ProjectWorkspace initialSkillIds={pendingProjectSkillIds} /> : activeNav === "presets" ? <PresetWorkspace /> : activeNav === "sync" ? <SyncWorkspace onOpenProjects={() => setActiveNav("projects")} /> : activeNav === "settings" ? <SettingsWorkspace onThemeSaved={(nextTheme) => setTheme(nextTheme === "light" ? "light" : "dark")} /> : <section className="library-section">
          <div className="section-toolbar">
            <div>
              <h2>我的 Skill</h2>
              <span>{loading ? "正在读取…" : `${skills.length} 个技能`}</span>
            </div>
            <label className="search-box">
              <Search size={16} />
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="搜索 Skill 名称或描述" />
              <kbd>⌘ K</kbd>
            </label>
            <button className={bulkMode ? "ghost-button bulk-mode-active" : "ghost-button"} onClick={() => { setBulkMode((current) => !current); setBulkSelectedIds([]); }}><Tags size={15} /> {bulkMode ? "退出批量" : "批量操作"}</button>
            <button className="primary-button compact-button" onClick={() => { setEditingSkill(null); setSkillEditorOpen(true); }}><Plus size={15} /> 新建 Skill</button>
            <button className="ghost-button" onClick={handleImportSkillDirectory}><FolderOpen size={15} /> 导入目录</button>
            <button className="ghost-button" onClick={() => setGitImportOpen(true)}><Github size={15} /> GitHub 导入</button>
          </div>
          {bulkMode && <div className="bulk-toolbar"><strong>已选择 {bulkSelectedIds.length} 个 Skill</strong><button onClick={() => setBulkSelectedIds(skills.map((skill) => skill.id))}>全选当前</button><button onClick={() => setBulkSelectedIds([])}>清空</button><input value={bulkTagInput} onChange={(event) => setBulkTagInput(event.target.value)} placeholder="批量设置标签，用逗号分隔" /><button disabled={bulkSelectedIds.length === 0} onClick={handleBulkTags}>保存标签</button><button disabled={bulkSelectedIds.length === 0} onClick={() => handleBulkEnabled(true)}>批量启用</button><button disabled={bulkSelectedIds.length === 0} onClick={() => handleBulkEnabled(false)}>批量禁用</button><button disabled={bulkSelectedIds.length === 0} onClick={openSelectedSkillsInProjects}>带到项目</button></div>}
          <div className="category-row">
            {categories.map((category) => (
              <button key={category} className={activeCategory === category ? "category-chip active" : "category-chip"} onClick={() => setActiveCategory(category)}>{category}</button>
            ))}
          </div>

          {loading ? <div className="empty-state">正在初始化本地 Skill 数据库…</div> : skills.length === 0 ? <div className="empty-state">没有找到匹配的 Skill。</div> : (
            <div className="library-layout">
              <div className="skill-grid">
                {skills.map((skill) => (
                  <button key={skill.id} className={`${selectedSkill?.id === skill.id ? "skill-card selected" : "skill-card"}${skill.enabled === false ? " disabled" : ""}${bulkSelectedIds.includes(skill.id) ? " bulk-selected" : ""}`} onClick={() => bulkMode ? toggleBulkSkill(skill.id) : setSelectedSkill(skill)} aria-pressed={bulkMode ? bulkSelectedIds.includes(skill.id) : undefined}>
                    <div className="skill-card-top"><span className="skill-symbol">✦</span><span className="skill-category">{skill.category}</span></div>
                    <h3>{skill.name}</h3>
                    <p>{skill.description}</p>
                    <div className="skill-card-bottom"><span>{skill.platforms.length || 0} 个目标工具</span><ChevronRight size={16} /></div>
                  </button>
                ))}
              </div>
              {selectedSkill && <SkillDetail skill={selectedSkill} onRefreshExternal={handleRefreshExternalSkill} onOpenPrompt={setPromptSkill} onToggleEnabled={handleToggleSkill} syncing={syncingSkillId === selectedSkill.id} />}
            </div>
          )}
        </section>}
        {activeNav === "skill-library" && selectedSkill && !bulkMode && <SkillTagEditor skill={selectedSkill} onSave={handleSetSkillTags} onEdit={() => { setEditingSkill(selectedSkill); setSkillEditorOpen(true); }} onDelete={handleDeleteSkill} />}
        {promptSkill && <PromptDialog skill={promptSkill} onClose={() => setPromptSkill(null)} />}
        {skillEditorOpen && <SkillEditorDialog skill={editingSkill} onClose={() => setSkillEditorOpen(false)} onSave={handleSaveSkill} />}
        {gitImportOpen && <GitImportDialog onClose={() => setGitImportOpen(false)} onImport={handleImportSkillsFromGit} />}
      </main>
    </div>
  );
}

function NavItem({ icon, label, active, onClick }: { icon: ReactNode; label: string; active: boolean; onClick: () => void }) {
  return <button className={active ? "nav-item active" : "nav-item"} onClick={onClick}>{icon}<span>{label}</span>{active && <span className="nav-active-mark" />}</button>;
}

function StatCard({ label, value, detail, icon }: { label: string; value: string | number; detail: string; icon: ReactNode }) {
  return <div className="stat-card"><div className="stat-card-icon">{icon}</div><div className="stat-label">{label}</div><strong>{value}</strong><span>{detail}</span></div>;
}

function SkillDetail({ skill, onRefreshExternal, onOpenPrompt, onToggleEnabled, syncing }: { skill: SkillSummary; onRefreshExternal: (skillId: string) => Promise<void>; onOpenPrompt: (skill: SkillSummary) => void; onToggleEnabled: (skill: SkillSummary) => Promise<void>; syncing: boolean }) {
  const enabled = skill.enabled !== false;
  return <aside className="detail-panel"><div className="detail-heading"><div className="detail-symbol">✦</div><div><span className="eyebrow">SKILL DETAIL</span><h2>{skill.name}</h2></div></div><p className="detail-description">{skill.description}</p><div className="detail-block"><span className="detail-label">目标工具</span><div className="platform-list">{skill.platforms.length ? skill.platforms.map((platform) => <span key={platform}>{platform}</span>) : <span>尚未声明</span>}</div></div><div className="detail-block"><span className="detail-label">状态</span><div className="deploy-line"><span className={enabled ? "status-dot" : "status-dot muted"} /> {enabled ? "已启用，可部署" : "已禁用，不会部署"}</div></div><div className="detail-block"><span className="detail-label">来源</span><div className="deploy-line"><span className="status-dot" /> {skill.sourceType === "external" ? "外部 Skill，可从来源刷新" : "内置 Skill"}</div></div><div className="detail-actions-stack"><button className="outline-button" onClick={() => onOpenPrompt(skill)}>查看完整 Prompt <ChevronRight size={15} /></button><button className={enabled ? "outline-button secondary" : "outline-button"} onClick={() => onToggleEnabled(skill)}>{enabled ? "禁用此 Skill" : "启用此 Skill"} <ChevronRight size={15} /></button>{skill.sourceType === "external" && <button className="outline-button secondary" onClick={() => onRefreshExternal(skill.id)} disabled={syncing}>{syncing ? "同步中…" : "从来源同步最新内容"} <ChevronRight size={15} /></button>}</div></aside>;
}

function SkillTagEditor({ skill, onSave, onEdit, onDelete }: { skill: SkillSummary; onSave: (skillId: string, tags: string[]) => Promise<void>; onEdit: () => void; onDelete: (skill: SkillSummary) => Promise<void> }) {
  const [tagInput, setTagInput] = useState((skill.tags ?? []).join(", "));

  useEffect(() => {
    setTagInput((skill.tags ?? []).join(", "));
  }, [skill.id, skill.tags]);

  async function saveTags() {
    await onSave(skill.id, tagInput.split(/[,，]/));
  }

  const canDelete = skill.sourceType === "external" || skill.id.startsWith("custom:");
  const canEdit = canDelete;
  return <section className="tag-editor-panel"><div><span className="eyebrow">SKILL TAGS</span><h2>标签管理</h2><p>为「{skill.name}」添加标签，搜索时也会匹配标签。</p><div className="tag-management-actions">{canEdit ? <button className="tag-edit-skill" onClick={onEdit}><Plus size={13} /> 编辑 Skill</button> : <span className="tag-protected">内置 Skill 由资源文件维护</span>}{canDelete && <button className="tag-delete-skill" onClick={() => onDelete(skill)}><Trash2 size={13} /> 删除</button>}</div></div><div className="tag-list">{skill.tags?.length ? skill.tags.map((tag) => <span key={tag}>{tag}</span>) : <span className="tag-empty">暂无标签</span>}</div><div className="tag-editor"><input value={tagInput} onChange={(event) => setTagInput(event.target.value)} placeholder="用逗号分隔多个标签" aria-label="Skill 标签" /><button className="tag-save" onClick={saveTags}>保存标签</button></div></section>;
}

function PromptDialog({ skill, onClose }: { skill: SkillSummary; onClose: () => void }) {
  return <div className="prompt-overlay" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) onClose(); }}><section className="prompt-dialog" role="dialog" aria-modal="true" aria-labelledby="prompt-title"><header className="prompt-dialog-header"><div><span className="eyebrow">SKILL PROMPT</span><h2 id="prompt-title">{skill.name}</h2></div><button className="prompt-close" onClick={onClose} aria-label="关闭 Prompt 预览"><X size={17} /></button></header><pre className="prompt-content">{skill.content}</pre></section></div>;
}

export default App;
