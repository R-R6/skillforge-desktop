import { app, dialog, ipcMain } from "electron";
import fs from "node:fs";
import path from "node:path";
import { addProject, backupDatabase, createPreset, createSkill, deletePreset, deleteSkill, exportData, getDatabasePath, getSettings, importSkillFromFile, importSkillsFromDirectory, importSkillsFromGit, listPresets, listProjects, listSkillCategories, listSkillNavigation, listSkills, refreshExternalSkill, setSetting, setSkillEnabled, setSkillTags, setSkillsEnabled, setSkillsTags, updatePreset, updateSkill } from "./db";
import { clearProjectSkills, deployProject } from "./deployment";
import { importProjectSkill, loadDiscoveredProjectSkills, scanProject } from "./scanner";
import { applyPresetToProject } from "./presets";
import { logInfo } from "./logger";
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
    return scanProject(project.id).then((scanResult) => scanResult.project);
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
  ipcMain.handle("settings:info", () => ({
    version: app.getVersion(),
    userDataPath: app.getPath("userData"),
    databasePath: getDatabasePath(),
    platform: process.platform,
  }));
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
