import type { ThemeSelection } from "../shared/theme";
import type { AppInfo, ApplyPresetInput, ClearProjectResult, CreatePresetInput, CreateSkillInput, DeployProjectInput, DeploymentResult, FileExportResult, ImportExternalSkillInput, PresetSummary, ProjectScanResult, ProjectSummary, SettingsMap, SkillCategoryCount, SkillNavigationSnapshot, SkillQuery, SkillSummary, UpdatePresetInput, UpdateSkillInput } from "../shared/types";

declare global {
  interface Window {
    skillforge: {
      listSkills: (query?: SkillQuery) => Promise<SkillSummary[]>;
      listSkillCategories: () => Promise<SkillCategoryCount[]>;
      listSkillNavigation: () => Promise<SkillNavigationSnapshot>;
      importSkillFile: () => Promise<SkillSummary | null>;
      createSkill: (input: CreateSkillInput) => Promise<SkillSummary>;
      updateSkill: (input: UpdateSkillInput) => Promise<SkillSummary>;
      deleteSkill: (skillId: string) => Promise<void>;
      importSkillsFromDirectory: () => Promise<SkillSummary[]>;
      importSkillsFromGit: (repositoryUrl: string) => Promise<SkillSummary[]>;
      refreshExternalSkill: (skillId: string) => Promise<SkillSummary>;
      setSkillEnabled: (skillId: string, enabled: boolean) => Promise<SkillSummary | null>;
      setSkillTags: (skillId: string, tags: string[]) => Promise<SkillSummary | null>;
      setSkillsEnabled: (skillIds: string[], enabled: boolean) => Promise<SkillSummary[]>;
      setSkillsTags: (skillIds: string[], tags: string[]) => Promise<SkillSummary[]>;
      listProjects: () => Promise<ProjectSummary[]>;
      addProject: () => Promise<ProjectSummary | null>;
      deployProject: (input: DeployProjectInput) => Promise<DeploymentResult>;
      clearProjectSkills: (projectId: string) => Promise<ClearProjectResult>;
      scanProject: (projectId: string) => Promise<ProjectScanResult>;
      getDiscoveredProjectSkills: (projectId: string) => Promise<ProjectScanResult>;
      importExternalSkill: (input: ImportExternalSkillInput) => Promise<SkillSummary>;
      listPresets: () => Promise<PresetSummary[]>;
      createPreset: (input: CreatePresetInput) => Promise<PresetSummary>;
      updatePreset: (input: UpdatePresetInput) => Promise<PresetSummary>;
      deletePreset: (presetId: string) => Promise<void>;
      applyPreset: (input: ApplyPresetInput) => Promise<DeploymentResult>;
      getSettings: () => Promise<SettingsMap>;
      setSetting: (key: string, value: string) => Promise<void>;
      getSystemPrefersDark: () => Promise<boolean>;
      syncNativeTheme: (themeSelection: ThemeSelection) => Promise<void>;
      onSystemThemeChanged: (listener: (systemDark: boolean) => void) => () => void;
      getAppInfo: () => Promise<AppInfo>;
      backupDatabase: () => Promise<FileExportResult | null>;
      exportData: () => Promise<FileExportResult | null>;
    };
  }
}

export {};
