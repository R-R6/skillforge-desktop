import { useEffect, useRef, useState } from "react";
import {
  ChevronRight,
  FolderOpen,
  Github,
  Plus,
  Search,
  Tags,
  Trash2,
  X,
} from "lucide-react";
import type { CreateSkillInput, SkillNavigationSnapshot, SkillSummary } from "../shared/types";
import CategorySidebar from "./CategorySidebar";
import GitImportDialog from "./GitImportDialog";
import SkillEditorDialog from "./SkillEditorDialog";
import { getSkillSourceLabel, NAV_ALL, NAV_EXTERNAL_ALL } from "../shared/skillNavigation";

interface SkillLibraryWorkspaceProps {
  refreshToken: number;
  onNavigationChange?: (navigationKey: string, snapshot: SkillNavigationSnapshot | null) => void;
  onLibraryChanged?: () => void;
  onOpenProjects?: (skillIds: string[]) => void;
}

export default function SkillLibraryWorkspace({ refreshToken, onNavigationChange, onLibraryChanged, onOpenProjects }: SkillLibraryWorkspaceProps) {
  const [skills, setSkills] = useState<SkillSummary[]>([]);
  const [navigation, setNavigation] = useState<SkillNavigationSnapshot | null>(null);
  const [selectedSkill, setSelectedSkill] = useState<SkillSummary | null>(null);
  const [search, setSearch] = useState("");
  const [activeNavigationKey, setActiveNavigationKey] = useState(NAV_ALL);
  const [loading, setLoading] = useState(true);
  const [syncingSkillId, setSyncingSkillId] = useState<string | null>(null);
  const [promptSkill, setPromptSkill] = useState<SkillSummary | null>(null);
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkSelectedIds, setBulkSelectedIds] = useState<string[]>([]);
  const [bulkTagInput, setBulkTagInput] = useState("");
  const [skillEditorOpen, setSkillEditorOpen] = useState(false);
  const [editingSkill, setEditingSkill] = useState<SkillSummary | null>(null);
  const [gitImportOpen, setGitImportOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    window.skillforge.listSkillNavigation().then((nextNavigation) => {
      if (!cancelled) setNavigation(nextNavigation);
    }).catch(() => {
      if (!cancelled) setNavigation(null);
    });
    return () => {
      cancelled = true;
    };
  }, [refreshToken]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    window.skillforge
      .listSkills({
        search,
        navigationKey: activeNavigationKey,
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
  }, [search, activeNavigationKey, refreshToken]);

  useEffect(() => {
    setBulkSelectedIds((current) => current.filter((id) => skills.some((skill) => skill.id === id)));
  }, [skills]);

  useEffect(() => {
    onNavigationChange?.(activeNavigationKey, navigation);
  }, [activeNavigationKey, navigation, onNavigationChange]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  function handleNavigationSelect(navigationKey: string) {
    setActiveNavigationKey(navigationKey);
  }

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

  async function handleImportSkillDirectory() {
    const imported = await window.skillforge.importSkillsFromDirectory();
    if (imported.length === 0) return;
    setActiveNavigationKey(NAV_EXTERNAL_ALL);
    setSelectedSkill(imported[0]);
    onLibraryChanged?.();
  }

  async function handleImportSkillsFromGit(repositoryUrl: string) {
    const imported = await window.skillforge.importSkillsFromGit(repositoryUrl);
    if (imported.length === 0) throw new Error("仓库中没有找到可导入的 Skill 文件");
    setGitImportOpen(false);
    setActiveNavigationKey(NAV_EXTERNAL_ALL);
    setSelectedSkill(imported[0]);
    onLibraryChanged?.();
  }

  async function handleSaveSkill(input: CreateSkillInput) {
    const saved = editingSkill
      ? await window.skillforge.updateSkill({ ...input, skillId: editingSkill.id })
      : await window.skillforge.createSkill(input);
    setSkillEditorOpen(false);
    setSearch("");
    setActiveNavigationKey(NAV_ALL);
    setSelectedSkill(saved);
    onLibraryChanged?.();
  }

  async function handleDeleteSkill(skill: SkillSummary) {
    if (!window.confirm(`确认删除“${skill.name}”吗？源文件不会被删除。`)) return;
    try {
      await window.skillforge.deleteSkill(skill.id);
      setSkills((current) => current.filter((item) => item.id !== skill.id));
      setSelectedSkill((current) => current?.id === skill.id ? null : current);
      onLibraryChanged?.();
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

  const totalSkillCount = navigation?.totalCount ?? 0;
  const builtinCategoryCount = navigation?.builtinCategories.length ?? 0;
  const externalSourceCount = navigation?.externalSources.length ?? 0;

  return (
    <section className="library-section">
      <div className="section-toolbar">
        <div>
          <h2>我的 Skill</h2>
          <span>
            {loading
              ? "正在读取…"
              : `${skills.length} 个结果 · 共 ${totalSkillCount} 个技能 · ${builtinCategoryCount} 个内置分类 · ${externalSourceCount} 个外部来源`}
          </span>
        </div>
        <label className="search-box">
          <Search size={16} />
          <input
            ref={searchInputRef}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="@ 搜索名称、描述或分类"
          />
          <kbd>⌘ K</kbd>
        </label>
        <button
          className={bulkMode ? "ghost-button bulk-mode-active" : "ghost-button"}
          onClick={() => { setBulkMode((current) => !current); setBulkSelectedIds([]); }}
        >
          <Tags size={15} /> {bulkMode ? "退出批量" : "批量操作"}
        </button>
        <button className="primary-button compact-button" onClick={() => { setEditingSkill(null); setSkillEditorOpen(true); }}>
          <Plus size={15} /> 新建 Skill
        </button>
        <button className="ghost-button" onClick={handleImportSkillDirectory}>
          <FolderOpen size={15} /> 导入目录
        </button>
        <button className="ghost-button" onClick={() => setGitImportOpen(true)}>
          <Github size={15} /> GitHub 导入
        </button>
      </div>

      {bulkMode && (
        <div className="bulk-toolbar">
          <strong>已选择 {bulkSelectedIds.length} 个 Skill</strong>
          <button onClick={() => setBulkSelectedIds(skills.map((skill) => skill.id))}>全选当前</button>
          <button onClick={() => setBulkSelectedIds([])}>清空</button>
          <input value={bulkTagInput} onChange={(event) => setBulkTagInput(event.target.value)} placeholder="批量设置标签，用逗号分隔" />
          <button disabled={bulkSelectedIds.length === 0} onClick={handleBulkTags}>保存标签</button>
          <button disabled={bulkSelectedIds.length === 0} onClick={() => handleBulkEnabled(true)}>批量启用</button>
          <button disabled={bulkSelectedIds.length === 0} onClick={() => handleBulkEnabled(false)}>批量禁用</button>
          <button
            disabled={bulkSelectedIds.length === 0}
            onClick={() => {
              if (bulkSelectedIds.length === 0) return;
              onOpenProjects?.(bulkSelectedIds);
              setBulkMode(false);
              setBulkSelectedIds([]);
            }}
          >
            带到项目
          </button>
        </div>
      )}

      <div className="library-browser">
        <CategorySidebar
          navigation={navigation ?? { totalCount: 0, builtinCategories: [], externalTotal: 0, externalSources: [] }}
          activeNavigationKey={activeNavigationKey}
          onSelectNavigation={handleNavigationSelect}
        />

        <div className="skill-list-panel">
          {loading ? (
            <div className="empty-state">正在初始化本地 Skill 数据库…</div>
          ) : skills.length === 0 ? (
            <div className="empty-state">没有找到匹配的 Skill。</div>
          ) : (
            <div className="skill-list">
              {skills.map((skill) => (
                <button
                  key={skill.id}
                  className={[
                    "skill-row",
                    selectedSkill?.id === skill.id ? "selected" : "",
                    skill.enabled === false ? "disabled" : "",
                    bulkSelectedIds.includes(skill.id) ? "bulk-selected" : "",
                  ].filter(Boolean).join(" ")}
                  onClick={() => bulkMode ? toggleBulkSkill(skill.id) : setSelectedSkill(skill)}
                  aria-pressed={bulkMode ? bulkSelectedIds.includes(skill.id) : undefined}
                >
                  <div className="skill-row-main">
                    <strong>{skill.name}</strong>
                    <small>{skill.description}</small>
                  </div>
                  <span className="skill-row-meta">{getSkillSourceLabel(skill)}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {selectedSkill && !bulkMode ? (
          <SkillDetail
            skill={selectedSkill}
            onRefreshExternal={handleRefreshExternalSkill}
            onOpenPrompt={setPromptSkill}
            onToggleEnabled={handleToggleSkill}
            syncing={syncingSkillId === selectedSkill.id}
          />
        ) : (
          <aside className="detail-panel detail-panel-empty">
            <span className="eyebrow">SKILL DETAIL</span>
            <h2>选择一个 Skill</h2>
            <p>从列表中点击 Skill，查看详情、管理标签并预览 Prompt。</p>
          </aside>
        )}
      </div>

      {selectedSkill && !bulkMode && (
        <SkillTagEditor
          skill={selectedSkill}
          onSave={handleSetSkillTags}
          onEdit={() => { setEditingSkill(selectedSkill); setSkillEditorOpen(true); }}
          onDelete={handleDeleteSkill}
        />
      )}
      {promptSkill && <PromptDialog skill={promptSkill} onClose={() => setPromptSkill(null)} />}
      {skillEditorOpen && <SkillEditorDialog skill={editingSkill} onClose={() => setSkillEditorOpen(false)} onSave={handleSaveSkill} />}
      {gitImportOpen && <GitImportDialog onClose={() => setGitImportOpen(false)} onImport={handleImportSkillsFromGit} />}
    </section>
  );
}

function SkillDetail({ skill, onRefreshExternal, onOpenPrompt, onToggleEnabled, syncing }: { skill: SkillSummary; onRefreshExternal: (skillId: string) => Promise<void>; onOpenPrompt: (skill: SkillSummary) => void; onToggleEnabled: (skill: SkillSummary) => Promise<void>; syncing: boolean }) {
  const enabled = skill.enabled !== false;
  return (
    <aside className="detail-panel">
      <div className="detail-heading">
        <div className="detail-symbol">✦</div>
        <div>
          <span className="eyebrow">SKILL DETAIL</span>
          <h2>{skill.name}</h2>
        </div>
      </div>
      <p className="detail-description">{skill.description}</p>
      <div className="detail-block">
        <span className="detail-label">来源</span>
        <div className="deploy-line">{getSkillSourceLabel(skill)}</div>
        {skill.sourceUrl && <code className="detail-source-url">{skill.sourceUrl}</code>}
        {skill.sourcePath && !skill.sourceUrl && <code className="detail-source-url">{skill.sourcePath}</code>}
      </div>
      <div className="detail-block">
        <span className="detail-label">分类</span>
        <div className="deploy-line">{skill.category}</div>
      </div>
      <div className="detail-block">
        <span className="detail-label">目标工具</span>
        <div className="platform-list">
          {skill.platforms.length ? skill.platforms.map((platform) => <span key={platform}>{platform}</span>) : <span>尚未声明</span>}
        </div>
      </div>
      <div className="detail-block">
        <span className="detail-label">状态</span>
        <div className="deploy-line">
          <span className={enabled ? "status-dot" : "status-dot muted"} /> {enabled ? "已启用，可部署" : "已禁用，不会部署"}
        </div>
      </div>
      <div className="detail-block">
        <span className="detail-label">类型</span>
        <div className="deploy-line">
          <span className="status-dot" /> {skill.sourceType === "external" ? "外部 Skill，可从来源刷新" : "内置 Skill"}
        </div>
      </div>
      <div className="detail-actions-stack">
        <button className="outline-button" onClick={() => onOpenPrompt(skill)}>查看完整 Prompt <ChevronRight size={15} /></button>
        <button className={enabled ? "outline-button secondary" : "outline-button"} onClick={() => onToggleEnabled(skill)}>
          {enabled ? "禁用此 Skill" : "启用此 Skill"} <ChevronRight size={15} />
        </button>
        {skill.sourceType === "external" && (
          <button className="outline-button secondary" onClick={() => onRefreshExternal(skill.id)} disabled={syncing}>
            {syncing ? "同步中…" : "从来源同步最新内容"} <ChevronRight size={15} />
          </button>
        )}
      </div>
    </aside>
  );
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
  return (
    <section className="tag-editor-panel">
      <div>
        <span className="eyebrow">SKILL TAGS</span>
        <h2>标签管理</h2>
        <p>为「{skill.name}」添加标签，搜索时也会匹配标签。</p>
        <div className="tag-management-actions">
          {canEdit ? <button className="tag-edit-skill" onClick={onEdit}><Plus size={13} /> 编辑 Skill</button> : <span className="tag-protected">内置 Skill 由资源文件维护</span>}
          {canDelete && <button className="tag-delete-skill" onClick={() => onDelete(skill)}><Trash2 size={13} /> 删除</button>}
        </div>
      </div>
      <div className="tag-list">{skill.tags?.length ? skill.tags.map((tag) => <span key={tag}>{tag}</span>) : <span className="tag-empty">暂无标签</span>}</div>
      <div className="tag-editor">
        <input value={tagInput} onChange={(event) => setTagInput(event.target.value)} placeholder="用逗号分隔多个标签" aria-label="Skill 标签" />
        <button className="tag-save" onClick={saveTags}>保存标签</button>
      </div>
    </section>
  );
}

function PromptDialog({ skill, onClose }: { skill: SkillSummary; onClose: () => void }) {
  return (
    <div className="prompt-overlay" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) onClose(); }}>
      <section className="prompt-dialog" role="dialog" aria-modal="true" aria-labelledby="prompt-title">
        <header className="prompt-dialog-header">
          <div>
            <span className="eyebrow">SKILL PROMPT</span>
            <h2 id="prompt-title">{skill.name}</h2>
          </div>
          <button className="prompt-close" onClick={onClose} aria-label="关闭 Prompt 预览"><X size={17} /></button>
        </header>
        <pre className="prompt-content">{skill.content}</pre>
      </section>
    </div>
  );
}
