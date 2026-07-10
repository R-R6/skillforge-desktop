import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, Download, FolderPlus, FolderKanban, Rocket, RotateCw } from "lucide-react";
import type { AgentTool, ExternalSkillRecord, ProjectSummary, SkillSummary } from "../shared/types";

const toolOptions: Array<{ id: AgentTool; label: string; description: string }> = [
  { id: "codex", label: "Codex", description: "AGENTS.md" },
  { id: "cursor", label: "Cursor", description: ".cursor/rules" },
  { id: "claude-code", label: "Claude Code", description: "CLAUDE.md" },
  { id: "hermes", label: "Hermes", description: "HERMES.md" },
];

export default function ProjectWorkspace({ initialSkillIds = [] }: { initialSkillIds?: string[] }) {
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [skills, setSkills] = useState<SkillSummary[]>([]);
  const [selectedProject, setSelectedProject] = useState<ProjectSummary | null>(null);
  const [selectedSkillIds, setSelectedSkillIds] = useState<string[]>([]);
  const [selectedTools, setSelectedTools] = useState<AgentTool[]>(["codex"]);
  const [scanResults, setScanResults] = useState<ExternalSkillRecord[]>([]);
  const [importedSkillIds, setImportedSkillIds] = useState<string[]>([]);
  const [importingAll, setImportingAll] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);
  const [autoScan, setAutoScan] = useState(false);
  const [scanning, setScanning] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    const [nextProjects, nextSkills] = await Promise.all([
      window.skillforge.listProjects(),
      window.skillforge.listSkills(),
    ]);
    setProjects(nextProjects);
    setSkills(nextSkills);
    setSelectedProject((current) => current && nextProjects.some((project) => project.id === current.id) ? nextProjects.find((project) => project.id === current.id) ?? null : nextProjects[0] ?? null);
    setSelectedSkillIds((current) => initialSkillIds.length > 0 ? initialSkillIds.filter((id) => nextSkills.some((skill) => skill.id === id)) : current.length > 0 ? current.filter((id) => nextSkills.some((skill) => skill.id === id)) : nextSkills.map((skill) => skill.id));
    setLoading(false);
  }, [initialSkillIds]);

  useEffect(() => {
    refresh().catch((error) => setNotice(error instanceof Error ? error.message : "项目数据读取失败"));
  }, [refresh]);

  useEffect(() => {
    window.skillforge.getSettings().then((settings) => setAutoScan(settings.autoScan === "on")).catch(() => setAutoScan(false));
  }, []);

  useEffect(() => {
    if (!selectedProject) return;
    setSelectedTools(selectedProject.tools.length > 0 ? selectedProject.tools : ["codex"]);
    setScanResults([]);
    setImportedSkillIds([]);
  }, [selectedProject]);

  useEffect(() => {
    if (!selectedProject || !autoScan) return;
    let cancelled = false;
    setScanning(true);
    window.skillforge.scanProject(selectedProject.id).then((result) => {
      if (cancelled) return;
      setScanResults(result.skills);
      setNotice(`已自动扫描：发现 ${result.skills.length} 个外部入口或 Skill 文件`);
    }).catch((error) => {
      if (!cancelled) setNotice(error instanceof Error ? error.message : "自动扫描失败");
    }).finally(() => {
      if (!cancelled) setScanning(false);
    });
    return () => { cancelled = true; };
  }, [selectedProject, autoScan]);

  const selectedSkillCount = useMemo(() => selectedSkillIds.length, [selectedSkillIds]);

  async function handleAddProject() {
    const project = await window.skillforge.addProject();
    if (!project) return;
    setProjects((current) => [project, ...current.filter((item) => item.id !== project.id)]);
    setSelectedProject(project);
    setNotice(`已导入项目：${project.name}`);
  }

  async function handleDeploy() {
    if (!selectedProject) return;
    if (selectedTools.length === 0) {
      setNotice("请至少选择一个目标工具");
      return;
    }
    const result = await window.skillforge.deployProject({
      projectId: selectedProject.id,
      skillIds: selectedSkillIds,
      tools: selectedTools,
    });
    setProjects((current) => current.map((project) => project.id === result.project.id ? result.project : project));
    setSelectedProject(result.project);
    setNotice(`已部署 ${result.files.length} 个文件到 ${result.project.name}`);
  }

  async function handleScan() {
    if (!selectedProject) return;
    setScanning(true);
    try {
      const result = await window.skillforge.scanProject(selectedProject.id);
      setScanResults(result.skills);
      setImportedSkillIds([]);
      setNotice(`扫描完成：发现 ${result.skills.length} 个外部入口或 Skill 文件`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "扫描失败");
    } finally {
      setScanning(false);
    }
  }

  async function handleClearBindings() {
    if (!selectedProject || !window.confirm(`确认清空“${selectedProject.name}”的 Skill 绑定吗？已手动修改的文件会保留。`)) return;
    const result = await window.skillforge.clearProjectSkills(selectedProject.id);
    setSelectedProject(result.project);
    setSelectedSkillIds([]);
    setNotice(`已清空项目绑定，删除 ${result.removedFiles.length} 个文件，保留 ${result.preservedFiles.length} 个手动修改文件`);
  }

  async function handleImport(item: ExternalSkillRecord) {
    if (!selectedProject || !item.importable || item.managed) return;
    const imported = await window.skillforge.importExternalSkill({
      projectId: selectedProject.id,
      relativePath: item.relativePath,
    });
    setSkills((current) => current.some((skill) => skill.id === imported.id) ? current.map((skill) => skill.id === imported.id ? imported : skill) : [...current, imported]);
    setImportedSkillIds((current) => current.includes(item.id) ? current : [...current, item.id]);
    setNotice(`已导入 Skill：${item.name}`);
  }

  async function handleImportAll() {
    if (!selectedProject || importingAll) return;
    const candidates = scanResults.filter((item) => item.importable && !item.managed && !importedSkillIds.includes(item.id));
    if (candidates.length === 0) {
      setNotice("没有可批量导入的外部 Skill");
      return;
    }
    setImportingAll(true);
    const results = await Promise.allSettled(candidates.map((item) => window.skillforge.importExternalSkill({ projectId: selectedProject.id, relativePath: item.relativePath })));
    const imported = results.flatMap((result, index) => result.status === "fulfilled" ? [{ item: candidates[index], skill: result.value }] : []);
    setSkills((current) => {
      const byId = new Map(current.map((skill) => [skill.id, skill]));
      for (const result of imported) byId.set(result.skill.id, result.skill);
      return [...byId.values()];
    });
    setImportedSkillIds((current) => [...new Set([...current, ...imported.map((result) => result.item.id)])]);
    const failedCount = results.length - imported.length;
    setNotice(`批量导入完成：成功 ${imported.length} 个${failedCount > 0 ? `，失败 ${failedCount} 个` : ""}`);
    setImportingAll(false);
  }

  function toggleTool(tool: AgentTool) {
    setSelectedTools((current) => current.includes(tool) ? current.filter((item) => item !== tool) : [...current, tool]);
  }

  function toggleSkill(skillId: string) {
    setSelectedSkillIds((current) => current.includes(skillId) ? current.filter((id) => id !== skillId) : [...current, skillId]);
  }

  return (
    <section className="project-workspace">
      <div className="section-toolbar project-toolbar">
        <div><h2>项目工作区</h2><span>把 Skill 绑定到真实项目，并生成 Agent 可读取的入口文件。</span></div>
        <div className="project-actions"><button className="ghost-button" onClick={() => refresh()}><RotateCw size={15} /> 刷新</button><button className="primary-button" onClick={handleAddProject}><FolderPlus size={16} /> 导入项目</button></div>
      </div>
      {notice && <div className="notice-bar"><Check size={15} /> {notice}</div>}
      <div className="project-layout">
        <div className="project-list">
          <div className="panel-title"><FolderKanban size={16} /> 已导入项目 <span>{projects.length}</span></div>
          {loading ? <div className="panel-empty">读取项目中…</div> : projects.length === 0 ? <div className="panel-empty">还没有导入项目。<br />先选择一个本地项目文件夹。</div> : projects.map((project) => (
            <button key={project.id} className={selectedProject?.id === project.id ? "project-item selected" : "project-item"} onClick={() => setSelectedProject(project)}>
              <div className="project-item-icon">⌂</div><div className="project-item-copy"><strong>{project.name}</strong><span>{project.path}</span><small>{project.skillCount} 个 Skill · {project.tools.length} 个工具</small></div>
            </button>
          ))}
        </div>
        <div className="project-detail">
          {!selectedProject ? <div className="project-placeholder"><FolderKanban size={34} /><h3>选择一个项目开始</h3><p>导入本地项目后，在这里选择目标 Agent 和要部署的 Skill。</p></div> : <>
            <div className="project-detail-heading"><div><span className="eyebrow">PROJECT WORKSPACE</span><h2>{selectedProject.name}</h2><code>{selectedProject.path}</code></div><div className="project-detail-actions"><button className="ghost-button" onClick={handleScan} disabled={scanning}><RotateCw size={15} /> {scanning ? "扫描中…" : "扫描已有 Skill"}</button><button className="ghost-button danger-ghost" onClick={handleClearBindings}>清空绑定</button><button className="deploy-button" onClick={handleDeploy}><Rocket size={16} /> 部署到项目</button></div></div>
            <div className="workspace-block"><div className="workspace-block-heading"><strong>目标 Agent</strong><span>{selectedTools.length} 个已选择</span></div><div className="tool-select-grid">{toolOptions.map((tool) => <button key={tool.id} className={selectedTools.includes(tool.id) ? "tool-select selected" : "tool-select"} onClick={() => toggleTool(tool.id)}><span className="tool-check">{selectedTools.includes(tool.id) && <Check size={12} />}</span><span><strong>{tool.label}</strong><small>{tool.description}</small></span></button>)}</div></div>
            <div className="workspace-block"><div className="workspace-block-heading"><strong>部署 Skill</strong><span>{selectedSkillCount} / {skills.length} 个已选择</span></div><div className="workspace-skill-list">{skills.map((skill) => <button key={skill.id} className={selectedSkillIds.includes(skill.id) ? "workspace-skill selected" : "workspace-skill"} onClick={() => toggleSkill(skill.id)}><span className="skill-check">{selectedSkillIds.includes(skill.id) && <Check size={12} />}</span><span><strong>{skill.name}</strong><small>{skill.description}</small></span></button>)}</div></div>
            <div className="workspace-block"><div className="workspace-block-heading"><strong>项目现有 Skill</strong><div className="scan-heading-actions"><span>{scanResults.length} 个扫描结果</span>{scanResults.some((item) => item.importable && !item.managed && !importedSkillIds.includes(item.id)) && <button className="scan-import-all" onClick={handleImportAll} disabled={importingAll}><Download size={13} /> {importingAll ? "导入中…" : "批量导入"}</button>}</div></div>{scanResults.length === 0 ? <div className="scan-empty">点击“扫描已有 Skill”，识别项目中已有的 Skill 与入口文件。</div> : <div className="scan-result-list">{scanResults.map((item) => <div className="scan-result" key={item.id}><span className={item.managed ? "scan-source managed" : "scan-source"}>{item.managed ? "已管理" : item.tool}</span><span className="scan-result-copy"><strong>{item.name}</strong><small>{item.relativePath} · {item.description}</small></span>{item.importable && !item.managed && <button className={importedSkillIds.includes(item.id) ? "scan-import imported" : "scan-import"} disabled={importedSkillIds.includes(item.id) || importingAll} onClick={() => handleImport(item)}>{importedSkillIds.includes(item.id) ? "已导入" : "导入"}</button>}</div>)}</div>}</div>
          </>}
        </div>
      </div>
    </section>
  );
}
