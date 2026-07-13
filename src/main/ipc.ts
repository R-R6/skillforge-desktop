import { app, dialog, ipcMain } from "electron";
import fs from "node:fs";
import path from "node:path";
import { addProject, backupDatabase, createPreset, createSkill, deletePreset, deleteSkill, exportData, getDatabasePath, getSettings, getSkillSourcesDirectory, importSkillFromFile, importSkillsFromDirectory, importSkillsFromGit, listPresets, listProjects, listSkillCategories, listSkillNavigation, listSkills, refreshExternalSkill, setSetting, setSkillEnabled, setSkillTags, setSkillsEnabled, setSkillsTags, updatePreset, updateSkill } from "./db";
import { clearProjectSkills, deployProject } from "./deployment";
import { importProjectSkill, loadDiscoveredProjectSkills, scanProject } from "./scanner";
import { applyPresetToProject } from "./presets";
import { logInfo } from "./logger";
import { applyWindowBackground, getSystemPrefersDark, syncNativeThemeSource } from "./theme";
import { deleteUserThemePack, exportThemePackJson, getThemePack, importThemePackFromJson, listThemePacks } from "./themePacks";
import { completeOnboarding, getBootstrapFilePath, getDefaultElectronUserDataPath } from "./bootstrap";
import {
  cleanUnusedSkillSourceClones,
  getOnboardingState,
  getStorageSummary,
  openStoragePath,
  previewGitImport,
  requestDataDirectoryChange,
  setSkillSourcesDirectory,
} from "./storage";
import type { ThemeSelection } from "../shared/theme";
import type { ApplyPresetInput, CreatePresetInput, CreateSkillInput, DeployProjectInput, SkillQuery, UpdatePresetInput, UpdateSkillInput } from "../shared/types";

export function registerIpcHandlers() {
  ipcMain.handle("skills:list", (_event, query?: SkillQuery) => listSkills(query));
  ipcMain.handle("skills:list-categories", () => listSkillCategories());
  ipcMain.handle("skills:list-navigation", () => listSkillNavigation());
  ipcMain.handle("skills:import-file", async () => {
    const result = await dialog.showOpenDialog({
      title: "导入 Skill 文件",
      properties: ["openFile"],
      filters: [{ name: "Skill Markdown", extensions: ["md", "mdc"] }],
    });
    if (result.canceled || !result.filePaths[0]) return null;
    return importSkillFromFile(result.filePaths[0]);
  });
  ipcMain.handle("skills:create", (_event, input: CreateSkillInput) => createSkill(input));
  ipcMain.handle("skills:update", (_event, input: UpdateSkillInput) => updateSkill(input));
  ipcMain.handle("skills:delete", (_event, skillId: string) => deleteSkill(skillId));
  ipcMain.handle("skills:import-directory", async () => {
    const result = await dialog.showOpenDialog({
      title: "导入 Skill 目录",
      properties: ["openDirectory"],
    });
    if (result.canceled || !result.filePaths[0]) return [];
    return importSkillsFromDirectory(result.filePaths[0]);
  });
  ipcMain.handle("skills:import-git", (_event, repositoryUrl: string) => importSkillsFromGit(repositoryUrl));
  ipcMain.handle("skills:preview-git-import", (_event, repositoryUrl: string) => previewGitImport(repositoryUrl));
  ipcMain.handle("skills:refresh-external", (_event, skillId: string) => refreshExternalSkill(skillId));
  ipcMain.handle("skills:set-enabled", (_event, skillId: string, enabled: boolean) => setSkillEnabled(skillId, enabled));
  ipcMain.handle("skills:set-tags", (_event, skillId: string, tags: string[]) => setSkillTags(skillId, tags));
  ipcMain.handle("skills:set-many-enabled", (_event, skillIds: string[], enabled: boolean) => setSkillsEnabled(skillIds, enabled));
  ipcMain.handle("skills:set-many-tags", (_event, skillIds: string[], tags: string[]) => setSkillsTags(skillIds, tags));
  ipcMain.handle("projects:list", () => listProjects());
  ipcMain.handle("projects:add", async () => {
    const result = await dialog.showOpenDialog({
      title: "选择要管理的项目文件夹",
      properties: ["openDirectory", "createDirectory"],
    });
    if (result.canceled || !result.filePaths[0]) return null;
    const project = addProject(result.filePaths[0]);
    return scanProject(project.id).project;
  });
  ipcMain.handle("projects:deploy", (_event, input: DeployProjectInput) => deployProject(input));
  ipcMain.handle("projects:clear-skills", (_event, projectId: string) => clearProjectSkills(projectId));
  ipcMain.handle("projects:scan", (_event, projectId: string) => scanProject(projectId));
  ipcMain.handle("projects:discovered-skills", (_event, projectId: string) => loadDiscoveredProjectSkills(projectId));
  ipcMain.handle("projects:import-skill", (_event, input) => importProjectSkill(input));
  ipcMain.handle("presets:list", () => listPresets());
  ipcMain.handle("presets:create", (_event, input: CreatePresetInput) => createPreset(input));
  ipcMain.handle("presets:update", (_event, input: UpdatePresetInput) => updatePreset(input));
  ipcMain.handle("presets:delete", (_event, presetId: string) => deletePreset(presetId));
  ipcMain.handle("presets:apply", (_event, input: ApplyPresetInput) => applyPresetToProject(input));
  ipcMain.handle("settings:get", () => getSettings());
  ipcMain.handle("settings:set", (_event, key: string, value: string) => {
    setSetting(key, value);
    logInfo("setting_updated", { key });
  });
  ipcMain.handle("theme:get-system-prefers-dark", () => getSystemPrefersDark());
  ipcMain.handle("theme:sync-native", (_event, themeSelection: ThemeSelection) => {
    syncNativeThemeSource(themeSelection);
    applyWindowBackground();
  });
  ipcMain.handle("theme-packs:list", () => listThemePacks());
  ipcMain.handle("theme-packs:get", (_event, key: string) => getThemePack(key));
  ipcMain.handle("theme-packs:import-file", async () => {
    const result = await dialog.showOpenDialog({
      title: "导入 Theme Pack",
      properties: ["openFile"],
      filters: [{ name: "Theme Pack JSON", extensions: ["json"] }],
    });
    if (result.canceled || !result.filePaths[0]) return null;
    const json = fs.readFileSync(result.filePaths[0], "utf8");
    return importThemePackFromJson(json);
  });
  ipcMain.handle("theme-packs:export-file", async (_event, key: string) => {
    const pack = getThemePack(key);
    if (!pack) return null;
    const result = await dialog.showSaveDialog({
      title: "导出 Theme Pack",
      defaultPath: path.join(app.getPath("documents"), `${pack.id}.theme.json`),
      filters: [{ name: "Theme Pack JSON", extensions: ["json"] }],
    });
    if (result.canceled || !result.filePath) return null;
    fs.writeFileSync(result.filePath, exportThemePackJson(key), "utf8");
    return { filePath: result.filePath, kind: "json" as const };
  });
  ipcMain.handle("theme-packs:delete", (_event, key: string) => {
    deleteUserThemePack(key);
  });
  ipcMain.handle("settings:info", () => ({
    version: app.getVersion(),
    userDataPath: app.getPath("userData"),
    databasePath: getDatabasePath(),
    platform: process.platform,
    defaultUserDataPath: getDefaultElectronUserDataPath(),
    skillSourcesPath: getSkillSourcesDirectory(),
    bootstrapPath: getBootstrapFilePath(),
  }));
  ipcMain.handle("storage:onboarding-state", () => getOnboardingState());
  ipcMain.handle("storage:complete-onboarding", (_event, dataDirectory?: string | null) => {
    const config = completeOnboarding({ dataDirectory: dataDirectory ?? null });
    logInfo("onboarding_completed", { dataDirectory: config.dataDirectory });
    return getOnboardingState();
  });
  ipcMain.handle("storage:summary", () => getStorageSummary());
  ipcMain.handle("storage:open-path", async (_event, targetPath: string) => openStoragePath(targetPath));
  ipcMain.handle("storage:clean-unused-clones", () => {
    const result = cleanUnusedSkillSourceClones();
    logInfo("storage_clean_unused_clones", { removed: result.removed.length, freedBytes: result.freedBytes });
    return result;
  });
  ipcMain.handle("storage:choose-data-directory", async () => {
    const result = await dialog.showOpenDialog({
      title: "选择 SkillForge 数据目录",
      properties: ["openDirectory", "createDirectory"],
    });
    if (result.canceled || !result.filePaths[0]) return null;
    return result.filePaths[0];
  });
  ipcMain.handle("storage:choose-skill-sources-directory", async () => {
    const result = await dialog.showOpenDialog({
      title: "选择 GitHub 克隆保存目录",
      properties: ["openDirectory", "createDirectory"],
    });
    if (result.canceled || !result.filePaths[0]) return null;
    return setSkillSourcesDirectory(result.filePaths[0]);
  });
  ipcMain.handle("storage:set-skill-sources-directory", (_event, directoryPath: string) => setSkillSourcesDirectory(directoryPath));
  ipcMain.handle("storage:request-data-directory-change", (_event, directoryPath: string) => requestDataDirectoryChange(directoryPath));
  ipcMain.handle("storage:restart-app", () => {
    app.relaunch();
    app.exit(0);
  });
  ipcMain.handle("settings:backup", async () => {
    const result = await dialog.showSaveDialog({
      title: "备份 SkillForge 数据库",
      defaultPath: path.join(app.getPath("documents"), `skillforge-backup-${Date.now()}.db`),
      filters: [{ name: "SQLite Database", extensions: ["db"] }],
    });
    if (result.canceled || !result.filePath) return null;
    await backupDatabase(result.filePath);
    logInfo("database_backup_created", { filePath: result.filePath });
    return { filePath: result.filePath, kind: "database" as const };
  });
  ipcMain.handle("settings:export", async () => {
    const result = await dialog.showSaveDialog({
      title: "导出 SkillForge 数据",
      defaultPath: path.join(app.getPath("documents"), `skillforge-export-${Date.now()}.json`),
      filters: [{ name: "JSON", extensions: ["json"] }],
    });
    if (result.canceled || !result.filePath) return null;
    fs.writeFileSync(result.filePath, JSON.stringify(exportData(), null, 2), "utf8");
    logInfo("json_export_created", { filePath: result.filePath });
    return { filePath: result.filePath, kind: "json" as const };
  });
}
