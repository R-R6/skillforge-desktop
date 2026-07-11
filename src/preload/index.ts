import { contextBridge, ipcRenderer } from "electron";
import type { AppInfo, ApplyPresetInput, ClearProjectResult, CreatePresetInput, CreateSkillInput, DeployProjectInput, DeploymentResult, FileExportResult, ImportExternalSkillInput, PresetSummary, ProjectScanResult, ProjectSummary, SettingsMap, SkillCategoryCount, SkillNavigationSnapshot, SkillQuery, SkillSummary, UpdatePresetInput, UpdateSkillInput } from "../shared/types";
import type { ThemeSelection } from "../shared/theme";
import type { ThemePack, ThemePackSummary } from "../shared/themePack";

contextBridge.exposeInMainWorld("skillforge", {
  listSkills: (query?: SkillQuery) => ipcRenderer.invoke("skills:list", query) as Promise<SkillSummary[]>,
  listSkillCategories: () => ipcRenderer.invoke("skills:list-categories") as Promise<SkillCategoryCount[]>,
  listSkillNavigation: () => ipcRenderer.invoke("skills:list-navigation") as Promise<SkillNavigationSnapshot>,
  importSkillFile: () => ipcRenderer.invoke("skills:import-file") as Promise<SkillSummary | null>,
  createSkill: (input: CreateSkillInput) => ipcRenderer.invoke("skills:create", input) as Promise<SkillSummary>,
  updateSkill: (input: UpdateSkillInput) => ipcRenderer.invoke("skills:update", input) as Promise<SkillSummary>,
  deleteSkill: (skillId: string) => ipcRenderer.invoke("skills:delete", skillId) as Promise<void>,
  importSkillsFromDirectory: () => ipcRenderer.invoke("skills:import-directory") as Promise<SkillSummary[]>,
  importSkillsFromGit: (repositoryUrl: string) => ipcRenderer.invoke("skills:import-git", repositoryUrl) as Promise<SkillSummary[]>,
  refreshExternalSkill: (skillId: string) => ipcRenderer.invoke("skills:refresh-external", skillId) as Promise<SkillSummary>,
  setSkillEnabled: (skillId: string, enabled: boolean) => ipcRenderer.invoke("skills:set-enabled", skillId, enabled) as Promise<SkillSummary | null>,
  setSkillTags: (skillId: string, tags: string[]) => ipcRenderer.invoke("skills:set-tags", skillId, tags) as Promise<SkillSummary | null>,
  setSkillsEnabled: (skillIds: string[], enabled: boolean) => ipcRenderer.invoke("skills:set-many-enabled", skillIds, enabled) as Promise<SkillSummary[]>,
  setSkillsTags: (skillIds: string[], tags: string[]) => ipcRenderer.invoke("skills:set-many-tags", skillIds, tags) as Promise<SkillSummary[]>,
  listProjects: () => ipcRenderer.invoke("projects:list") as Promise<ProjectSummary[]>,
  addProject: () => ipcRenderer.invoke("projects:add") as Promise<ProjectSummary | null>,
  deployProject: (input: DeployProjectInput) => ipcRenderer.invoke("projects:deploy", input) as Promise<DeploymentResult>,
  clearProjectSkills: (projectId: string) => ipcRenderer.invoke("projects:clear-skills", projectId) as Promise<ClearProjectResult>,
  scanProject: (projectId: string) => ipcRenderer.invoke("projects:scan", projectId) as Promise<ProjectScanResult>,
  getDiscoveredProjectSkills: (projectId: string) => ipcRenderer.invoke("projects:discovered-skills", projectId) as Promise<ProjectScanResult>,
  importExternalSkill: (input: ImportExternalSkillInput) => ipcRenderer.invoke("projects:import-skill", input) as Promise<SkillSummary>,
  listPresets: () => ipcRenderer.invoke("presets:list") as Promise<PresetSummary[]>,
  createPreset: (input: CreatePresetInput) => ipcRenderer.invoke("presets:create", input) as Promise<PresetSummary>,
  updatePreset: (input: UpdatePresetInput) => ipcRenderer.invoke("presets:update", input) as Promise<PresetSummary>,
  deletePreset: (presetId: string) => ipcRenderer.invoke("presets:delete", presetId) as Promise<void>,
  applyPreset: (input: ApplyPresetInput) => ipcRenderer.invoke("presets:apply", input) as Promise<DeploymentResult>,
  getSettings: () => ipcRenderer.invoke("settings:get") as Promise<SettingsMap>,
  setSetting: (key: string, value: string) => ipcRenderer.invoke("settings:set", key, value) as Promise<void>,
  getSystemPrefersDark: () => ipcRenderer.invoke("theme:get-system-prefers-dark") as Promise<boolean>,
  syncNativeTheme: (themeSelection: string) => ipcRenderer.invoke("theme:sync-native", themeSelection) as Promise<void>,
  onSystemThemeChanged: (listener: (systemDark: boolean) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, systemDark: boolean) => listener(systemDark);
    ipcRenderer.on("theme:system-changed", handler);
    return () => ipcRenderer.removeListener("theme:system-changed", handler);
  },
  listThemePacks: () => ipcRenderer.invoke("theme-packs:list") as Promise<ThemePackSummary[]>,
  getThemePack: (key: string) => ipcRenderer.invoke("theme-packs:get", key) as Promise<ThemePack | null>,
  importThemePackFile: () => ipcRenderer.invoke("theme-packs:import-file") as Promise<ThemePackSummary | null>,
  exportThemePackFile: (key: string) => ipcRenderer.invoke("theme-packs:export-file", key) as Promise<FileExportResult | null>,
  deleteThemePack: (key: string) => ipcRenderer.invoke("theme-packs:delete", key) as Promise<void>,
  getAppInfo: () => ipcRenderer.invoke("settings:info") as Promise<AppInfo>,
  backupDatabase: () => ipcRenderer.invoke("settings:backup") as Promise<FileExportResult | null>,
  exportData: () => ipcRenderer.invoke("settings:export") as Promise<FileExportResult | null>,
});
