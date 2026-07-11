import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, ChevronRight, Download, FolderPlus, FolderKanban, Rocket, RotateCw, Search } from "lucide-react";
import type { AgentTool, ExternalSkillRecord, ProjectSummary, SkillSummary } from "../shared/types";
import { getTopCategory, groupExternalSkills, groupLibrarySkills, isSkillCompatibleWithTools } from "./projectSkillGroups";

const toolOptions: Array<{ id: AgentTool; label: string; description: string }> = [
  { id: "codex", label: "Codex", description: "AGENTS.md" },
  { id: "cursor", label: "Cursor", description: ".cursor/skills · .cursor/rules" },
  { id: "claude-code", label: "Claude Code", description: "CLAUDE.md" },
  { id: "hermes", label: "Hermes", description: "HERMES.md" },
];

const toolLabels: Record<AgentTool, string> = {
  codex: "Codex",
  cursor: "Cursor",
  "claude-code": "Claude Code",
  hermes: "Hermes",
};

type WorkspaceTab = "import" | "deploy";

function formatToolList(tools: AgentTool[]) {
  return tools.map((tool) => toolLabels[tool]).join(" · ");
}

export default function ProjectWorkspace({ initialSkillIds = [] }: { initialSkillIds?: string[] }) {
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [librarySkills, setLibrarySkills] = useState<SkillSummary[]>([]);
  const [selectedProject, setSelectedProject] = useState<ProjectSummary | null>(null);
  const [deploySkillIds, setDeploySkillIds] = useState<string[]>([]);
  const [selectedTools, setSelectedTools] = useState<AgentTool[]>([]);
  const [projectSkills, setProjectSkills] = useState<ExternalSkillRecord[]>([]);
  const [globalSkills, setGlobalSkills] = useState<ExternalSkillRecord[]>([]);
  const [selectedProjectSkillIds, setSelectedProjectSkillIds] = useState<string[]>([]);
  const [importedSkillIds, setImportedSkillIds] = useState<string[]>([]);
  const [importingSelected, setImportingSelected] = useState(false);
  const [activeTab, setActiveTab] = useState<WorkspaceTab>("import");
  const [importSearch, setImportSearch] = useState("");
  const [deploySearch, setDeploySearch] = useState("");
  const [expandedImportGroups, setExpandedImportGroups] = useState<string[]>([]);
  const [expandedDeployGroups, setExpandedDeployGroups] = useState<string[]>([]);
  const [deployGroupsTouched, setDeployGroupsTouched] = useState(false);
  const [onlyCompatible, setOnlyCompatible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);
  const [autoScan, setAutoScan] = useState(true);
  const [scanning, setScanning] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    const [nextProjects, nextSkills] = await Promise.all([
      window.skillforge.listProjects(),
      window.skillforge.listSkills(),
    ]);
    setProjects(nextProjects);
    setLibrarySkills(nextSkills);
    setSelectedProject((current) =>
      current && nextProjects.some((project) => project.id === current.id)
        ? nextProjects.find((project) => project.id === current.id) ?? null
        : nextProjects[0] ?? null,
    );
    setDeploySkillIds((current) =>
      initialSkillIds.length > 0
        ? initialSkillIds.filter((id) => nextSkills.some((skill) => skill.id === id))
        : current.filter((id) => nextSkills.some((skill) => skill.id === id)),
    );
    setLoading(false);
  }, [initialSkillIds]);

  useEffect(() => {
    refresh().catch((error) => setNotice(error instanceof Error ? error.message : "项目数据读取失败"));
  }, [refresh]);

  useEffect(() => {
    window.skillforge.getSettings().then((settings) => setAutoScan(settings.autoScan !== "off")).catch(() => setAutoScan(true));
  }, []);

  const applyDiscoveredSkills = useCallback((skills: ExternalSkillRecord[], globals: ExternalSkillRecord[], project: ProjectSummary) => {
    setProjectSkills(skills);
    setGlobalSkills(globals);
    setSelectedProjectSkillIds(skills.map((item) => item.id));
    setImportedSkillIds([]);
    setSelectedTools((project.discoveredTools?.length ?? 0) > 0 ? (project.discoveredTools ?? []) : project.tools.length > 0 ? project.tools : ["codex"]);
    setSelectedProject(project);
    setExpandedImportGroups(["项目目录", ...(globals.length > 0 ? ["全局 Agent"] : [])]);
  }, []);

  const loadProjectSkills = useCallback(async (project: ProjectSummary, forceScan = false) => {
    setScanning(true);
    try {
      const result = forceScan || !project.lastScannedAt
        ? await window.skillforge.scanProject(project.id)
        : await window.skillforge.getDiscoveredProjectSkills(project.id);
      const nextProject = result.project;
      setProjects((current) => current.map((item) => (item.id === nextProject.id ? nextProject : item)));
      applyDiscoveredSkills(result.skills, result.globalSkills, nextProject);
      if (forceScan || !project.lastScannedAt) {
        setNotice(`扫描完成：识别到 ${result.skills.length} 个项目 Skill`);
      }
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "读取项目 Skill 失败");
    } finally {
      setScanning(false);
    }
  }, [applyDiscoveredSkills]);

  useEffect(() => {
    if (!selectedProject) {
      setProjectSkills([]);
      setGlobalSkills([]);
      setSelectedProjectSkillIds([]);
      setImportedSkillIds([]);
      return;
    }
    if (!autoScan) {
      window.skillforge.getDiscoveredProjectSkills(selectedProject.id).then((result) => {
        applyDiscoveredSkills(result.skills, result.globalSkills, result.project);
      }).catch(() => {
        setProjectSkills([]);
        setGlobalSkills([]);
      });
      return;
    }
    loadProjectSkills(selectedProject).catch(() => undefined);
  }, [selectedProject?.id, autoScan, loadProjectSkills, applyDiscoveredSkills]);

  const importSkillGroups = useMemo(
    () => groupExternalSkills([...projectSkills, ...globalSkills], importSearch),
    [projectSkills, globalSkills, importSearch],
  );
  const deploySkillGroups = useMemo(() => {
    const groups = groupLibrarySkills(librarySkills, deploySearch, selectedTools);
    if (!onlyCompatible) return groups;
    return groups
      .map((group) => ({
        ...group,
        skills: group.skills.filter((skill) => isSkillCompatibleWithTools(skill, selectedTools)),
      }))
      .filter((group) => group.skills.length > 0);
  }, [librarySkills, deploySearch, selectedTools, onlyCompatible]);

  const visibleImportSkillIds = useMemo(
    () => importSkillGroups.flatMap((group) => group.skills.map((skill) => skill.id)),
    [importSkillGroups],
  );
  const visibleDeploySkillIds = useMemo(
    () => deploySkillGroups.flatMap((group) => group.skills.map((skill) => skill.id)),
    [deploySkillGroups],
  );

  useEffect(() => {
    setDeployGroupsTouched(false);
    setExpandedDeployGroups([]);
  }, [selectedProject?.id]);

  useEffect(() => {
    if (activeTab === "deploy" && !deployGroupsTouched && deploySkillGroups.length > 0) {
      setExpandedDeployGroups(deploySkillGroups.slice(0, 5).map((group) => group.category));
    }
  }, [activeTab, deploySkillGroups, deployGroupsTouched]);

  const selectedProjectSkillCount = useMemo(() => selectedProjectSkillIds.length, [selectedProjectSkillIds]);
  const pendingImportCount = useMemo(
    () => [...projectSkills, ...globalSkills].filter((item) => !importedSkillIds.includes(item.id)).length,
    [projectSkills, globalSkills, importedSkillIds],
  );
  const allVisibleImportSelected = useMemo(
    () => visibleImportSkillIds.length > 0 && visibleImportSkillIds.every((id) => selectedProjectSkillIds.includes(id)),
    [visibleImportSkillIds, selectedProjectSkillIds],
  );
  const allVisibleDeploySelected = useMemo(
    () => visibleDeploySkillIds.length > 0 && visibleDeploySkillIds.every((id) => deploySkillIds.includes(id)),
    [visibleDeploySkillIds, deploySkillIds],
  );

  async function handleAddProject() {
    const project = await window.skillforge.addProject();
    if (!project) return;
    setProjects((current) => [project, ...current.filter((item) => item.id !== project.id)]);
    setSelectedProject(project);
    setActiveTab("import");
    setNotice(`已添加项目：${project.name}，识别到 ${project.discoveredSkillCount} 个 Skill`);
  }

  async function handleDeploy() {
    if (!selectedProject) return;
    if (selectedTools.length === 0) {
      setNotice("请至少选择一个目标工具");
      return;
    }
    if (deploySkillIds.length === 0) {
      setNotice("请先在“从 Skill 库部署”中选择要写入项目的 Skill");
      setActiveTab("deploy");
      return;
    }
    const result = await window.skillforge.deployProject({
      projectId: selectedProject.id,
      skillIds: deploySkillIds,
      tools: selectedTools,
    });
    setProjects((current) => current.map((project) => (project.id === result.project.id ? result.project : project)));
    setSelectedProject(result.project);
    setNotice(`已部署 ${result.files.length} 个文件到 ${result.project.name}`);
  }

  async function handleScan() {
    if (!selectedProject) return;
    await loadProjectSkills(selectedProject, true);
  }

  async function handleClearBindings() {
    if (!selectedProject || !window.confirm(`确认清空“${selectedProject.name}”的已部署 Skill 吗？已手动修改的文件会保留。`)) return;
    const result = await window.skillforge.clearProjectSkills(selectedProject.id);
    setSelectedProject(result.project);
    setDeploySkillIds([]);
    setNotice(`已清空部署文件，删除 ${result.removedFiles.length} 个，保留 ${result.preservedFiles.length} 个手动修改文件`);
  }

  async function handleImportSelected() {
    if (!selectedProject || importingSelected) return;
    const candidates = [...projectSkills, ...globalSkills].filter((item) => selectedProjectSkillIds.includes(item.id) && !importedSkillIds.includes(item.id));
    if (candidates.length === 0) {
      setNotice("请先勾选尚未收录到库的项目 Skill");
      return;
    }
    setImportingSelected(true);
    const results = await Promise.allSettled(candidates.map((item) => window.skillforge.importExternalSkill({
      projectId: selectedProject.id,
      relativePath: item.relativePath,
      sourcePath: item.scope === "global" ? item.path : undefined,
    })));
    const imported = results.flatMap((result, index) => result.status === "fulfilled" ? [{ item: candidates[index], skill: result.value }] : []);
    setLibrarySkills((current) => {
      const byId = new Map(current.map((skill) => [skill.id, skill]));
      for (const result of imported) byId.set(result.skill.id, result.skill);
      return [...byId.values()];
    });
    setImportedSkillIds((current) => [...new Set([...current, ...imported.map((result) => result.item.id)])]);
    const failedCount = results.length - imported.length;
    setNotice(`已将 ${imported.length} 个 Skill 保存到库${failedCount > 0 ? `，失败 ${failedCount} 个` : ""}`);
    setImportingSelected(false);
  }

  function toggleTool(tool: AgentTool) {
    setSelectedTools((current) => current.includes(tool) ? current.filter((item) => item !== tool) : [...current, tool]);
  }

  function toggleProjectSkill(skillId: string) {
    setSelectedProjectSkillIds((current) => current.includes(skillId) ? current.filter((id) => id !== skillId) : [...current, skillId]);
  }

  function toggleDeploySkill(skillId: string) {
    setDeploySkillIds((current) => current.includes(skillId) ? current.filter((id) => id !== skillId) : [...current, skillId]);
  }

  function toggleVisibleImportSkills() {
    setSelectedProjectSkillIds((current) =>
      allVisibleImportSelected
        ? current.filter((id) => !visibleImportSkillIds.includes(id))
        : [...new Set([...current, ...visibleImportSkillIds])],
    );
  }

  function toggleVisibleDeploySkills() {
    setDeploySkillIds((current) =>
      allVisibleDeploySelected
        ? current.filter((id) => !visibleDeploySkillIds.includes(id))
        : [...new Set([...current, ...visibleDeploySkillIds])],
    );
  }

  function toggleImportGroup(category: string) {
    setExpandedImportGroups((current) => current.includes(category) ? current.filter((item) => item !== category) : [...current, category]);
  }

  function toggleDeployGroup(category: string) {
    setDeployGroupsTouched(true);
    setExpandedDeployGroups((current) => current.includes(category) ? current.filter((item) => item !== category) : [...current, category]);
  }

  function toggleImportGroupSkills(skills: ExternalSkillRecord[]) {
    const ids = skills.map((skill) => skill.id);
    const allSelected = ids.every((id) => selectedProjectSkillIds.includes(id));
    setSelectedProjectSkillIds((current) =>
      allSelected
        ? current.filter((id) => !ids.includes(id))
        : [...new Set([...current, ...ids])],
    );
  }

  function expandAllImportGroups() {
    setExpandedImportGroups(importSkillGroups.map((group) => group.category));
  }

  function collapseAllImportGroups() {
    setExpandedImportGroups([]);
  }

  function expandAllDeployGroups() {
    setDeployGroupsTouched(true);
    setExpandedDeployGroups(deploySkillGroups.map((group) => group.category));
  }

  function collapseAllDeployGroups() {
    setDeployGroupsTouched(true);
    setExpandedDeployGroups([]);
  }

  function toggleDeployGroupSkills(skills: SkillSummary[]) {
    const ids = skills.map((skill) => skill.id);
    const allSelected = ids.every((id) => deploySkillIds.includes(id));
    setDeploySkillIds((current) =>
      allSelected
        ? current.filter((id) => !ids.includes(id))
        : [...new Set([...current, ...ids])],
    );
  }

  return (
    <section className="project-workspace">
      <div className="section-toolbar project-toolbar">
        <div><h2>项目工作区</h2><span>将项目中已有的 Skill 收录保存到库，或从 Skill 库筛选后部署到项目。</span></div>
        <div className="project-actions"><button className="ghost-button" onClick={() => refresh()}><RotateCw size={15} /> 刷新</button><button className="primary-button" onClick={handleAddProject}><FolderPlus size={16} /> 添加项目</button></div>
      </div>
      {notice && <div className="notice-bar"><Check size={15} /> {notice}</div>}
      <div className="project-layout">
        <div className="project-list">
          <div className="panel-title"><FolderKanban size={16} /> 已添加项目 <span>{projects.length}</span></div>
          {loading ? <div className="panel-empty">读取项目中…</div> : projects.length === 0 ? <div className="panel-empty">还没有添加项目。<br />先选择一个本地项目文件夹。</div> : projects.map((project) => (
            <button key={project.id} className={selectedProject?.id === project.id ? "project-item selected" : "project-item"} onClick={() => setSelectedProject(project)}>
              <div className="project-item-icon">⌂</div>
              <div className="project-item-copy">
                <strong>{project.name}</strong>
                <span>{project.path}</span>
                <small>{(project.discoveredSkillCount ?? 0)} 个 Skill · {(project.discoveredTools?.length ?? 0)} 个工具</small>
                {(project.discoveredTools?.length ?? 0) > 0 && <em className="project-item-tools">{formatToolList(project.discoveredTools ?? [])}</em>}
              </div>
            </button>
          ))}
        </div>
        <div className="project-detail">
          {!selectedProject ? <div className="project-placeholder"><FolderKanban size={34} /><h3>选择一个项目开始</h3><p>添加本地项目后，会自动识别其中已有的 Skill，并支持从项目收录到 Skill 库。</p></div> : <>
            <div className="project-detail-heading">
              <div>
                <span className="eyebrow">项目工作区</span>
                <h2>{selectedProject.name}</h2>
                <code>{selectedProject.path}</code>
                <div className="project-stat-row">
                  <span>项目 Skill <strong>{projectSkills.length}</strong></span>
                  <span>待收录 <strong>{pendingImportCount}</strong></span>
                  <span>已选收录 <strong>{selectedProjectSkillCount}</strong></span>
                  <span>已选部署 <strong>{deploySkillIds.length}</strong></span>
                </div>
              </div>
              <div className="project-detail-actions">
                <button className="ghost-button" onClick={handleScan} disabled={scanning}><RotateCw size={15} /> {scanning ? "扫描中…" : "重新扫描"}</button>
                <button className="ghost-button danger-ghost" onClick={handleClearBindings}>清空已部署</button>
                <button className="deploy-button" onClick={handleDeploy}><Rocket size={16} /> 部署到项目</button>
              </div>
            </div>

            <div className="workspace-block workspace-block-compact">
              <div className="workspace-block-heading"><strong>目标 Agent</strong><span>{selectedTools.length} 个已选择</span></div>
              <div className="tool-select-grid">{toolOptions.map((tool) => <button key={tool.id} className={selectedTools.includes(tool.id) ? "tool-select selected" : "tool-select"} onClick={() => toggleTool(tool.id)}><span className="tool-check">{selectedTools.includes(tool.id) && <Check size={12} />}</span><span><strong>{tool.label}</strong><small>{tool.description}</small></span></button>)}</div>
            </div>

            <div className="project-workspace-tabs">
              <button className={activeTab === "import" ? "project-tab active" : "project-tab"} onClick={() => setActiveTab("import")}>
                从项目收录到库
                <span>{pendingImportCount}</span>
              </button>
              <button className={activeTab === "deploy" ? "project-tab active" : "project-tab"} onClick={() => setActiveTab("deploy")}>
                从 Skill 库部署
                <span>{deploySkillIds.length} / {librarySkills.length}</span>
              </button>
            </div>

            {activeTab === "import" ? (
              <div className="project-workspace-panel">
                <div className="project-panel-toolbar">
                  <label className="project-search-field">
                    <Search size={14} />
                    <input value={importSearch} onChange={(event) => setImportSearch(event.target.value)} placeholder="搜索项目 Skill 名称、路径或来源…" />
                  </label>
                  <div className="project-panel-actions">
                    <button type="button" className="ghost-button compact-button" onClick={expandAllImportGroups}>全部展开</button>
                    <button type="button" className="ghost-button compact-button" onClick={collapseAllImportGroups}>全部收起</button>
                    <button className="ghost-button compact-button" onClick={toggleVisibleImportSkills} disabled={visibleImportSkillIds.length === 0}>
                      {allVisibleImportSelected ? "取消全选" : "全选"}
                    </button>
                    <button className="scan-import-all" onClick={handleImportSelected} disabled={importingSelected || selectedProjectSkillCount === 0}>
                      <Download size={13} /> {importingSelected ? "保存中…" : "将选中项保存到库"}
                    </button>
                  </div>
                </div>
                {importSkillGroups.length === 0 ? <div className="scan-empty">{scanning ? "正在识别项目 Skill…" : "没有匹配的项目 Skill。"}</div> : <div className="project-skill-groups">{importSkillGroups.map((group) => {
                  const expanded = expandedImportGroups.includes(group.category);
                  const selectedCount = group.skills.filter((skill) => selectedProjectSkillIds.includes(skill.id)).length;
                  return <section className="project-skill-group" key={group.category}>
                    <div className="project-skill-group-header">
                      <button className="project-skill-group-toggle" onClick={() => toggleImportGroup(group.category)}>
                        <ChevronRight size={14} className={expanded ? "group-chevron expanded" : "group-chevron"} />
                        <strong>{group.category}</strong>
                        <span>已选 {selectedCount}/{group.skills.length}</span>
                      </button>
                      <button className="ghost-button compact-button group-select-button" onClick={() => toggleImportGroupSkills(group.skills)}>
                        {group.skills.every((skill) => selectedProjectSkillIds.includes(skill.id)) ? "取消" : "全选"}
                      </button>
                    </div>
                    {expanded && <div className="workspace-skill-list">{group.skills.map((item) => <button key={item.id} className={selectedProjectSkillIds.includes(item.id) ? "workspace-skill selected" : "workspace-skill"} onClick={() => toggleProjectSkill(item.id)}><span className="skill-check">{selectedProjectSkillIds.includes(item.id) && <Check size={12} />}</span><span><strong>{item.name}</strong><small>{item.tool} · {item.relativePath}</small></span>{importedSkillIds.includes(item.id) && <em className="skill-imported-tag">已入库</em>}</button>)}</div>}
                  </section>;
                })}</div>}
              </div>
            ) : (
              <div className="project-workspace-panel">
                <div className="project-panel-toolbar">
                  <label className="project-search-field">
                    <Search size={14} />
                    <input value={deploySearch} onChange={(event) => setDeploySearch(event.target.value)} placeholder="搜索 Skill 名称、描述或分类…" />
                  </label>
                  <div className="project-panel-actions">
                    <label className="project-filter-toggle">
                      <input type="checkbox" checked={onlyCompatible} onChange={(event) => setOnlyCompatible(event.target.checked)} />
                      <span>仅显示当前工具可用</span>
                    </label>
                    <button type="button" className="ghost-button compact-button" onClick={expandAllDeployGroups}>全部展开</button>
                    <button type="button" className="ghost-button compact-button" onClick={collapseAllDeployGroups}>全部收起</button>
                    <button className="ghost-button compact-button" onClick={toggleVisibleDeploySkills} disabled={visibleDeploySkillIds.length === 0}>
                      {allVisibleDeploySelected ? "取消全选" : "全选"}
                    </button>
                  </div>
                </div>
                <p className="project-panel-hint">勾选后点击右上角“部署到项目”。目标工具不支持的 Skill 会标记为不可用。</p>
                {deploySkillGroups.length === 0 ? <div className="scan-empty">没有匹配的 Skill。</div> : <div className="project-skill-groups">{deploySkillGroups.map((group) => {
                  const expanded = expandedDeployGroups.includes(group.category);
                  const selectedCount = group.skills.filter((skill) => deploySkillIds.includes(skill.id)).length;
                  return <section className="project-skill-group" key={group.category}>
                    <div className="project-skill-group-header">
                      <button className="project-skill-group-toggle" onClick={() => toggleDeployGroup(group.category)}>
                        <ChevronRight size={14} className={expanded ? "group-chevron expanded" : "group-chevron"} />
                        <strong>{group.category}</strong>
                        <span>可用 {group.compatibleCount}/{group.skills.length} · 已选 {selectedCount}</span>
                      </button>
                      <button className="ghost-button compact-button group-select-button" onClick={() => toggleDeployGroupSkills(group.skills)}>
                        {group.skills.every((skill) => deploySkillIds.includes(skill.id)) ? "取消" : "全选"}
                      </button>
                    </div>
                    {expanded && <div className="workspace-skill-list">{group.skills.map((skill) => {
                      const compatible = isSkillCompatibleWithTools(skill, selectedTools);
                      return <button key={skill.id} className={deploySkillIds.includes(skill.id) ? "workspace-skill selected" : compatible ? "workspace-skill" : "workspace-skill disabled"} disabled={!compatible} onClick={() => compatible && toggleDeploySkill(skill.id)}><span className="skill-check">{deploySkillIds.includes(skill.id) && <Check size={12} />}</span><span><strong>{skill.name}</strong><small>{skill.description || getTopCategory(skill.category)}</small></span>{!compatible && <em className="skill-disabled-tag">不可用</em>}</button>;
                    })}</div>}
                  </section>;
                })}</div>}
              </div>
            )}
          </>}
        </div>
      </div>
    </section>
  );
}
