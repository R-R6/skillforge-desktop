import type { ThemeSelection } from "../shared/theme";
import type { ThemePack, ThemePackSummary } from "../shared/themePack";
import type {
  AppInfo,
  ApplyPresetInput,
  CleanUnusedClonesResult,
  ClearProjectResult,
  CreatePresetInput,
  CreateSkillInput,
  DataDirectoryMigrationResult,
  DeployProjectInput,
  DeploymentResult,
  FileExportResult,
  GitImportPreview,
  ImportExternalSkillInput,
  OnboardingState,
  PresetSummary,
  ProjectScanResult,
  ProjectSummary,
  SettingsMap,
  SkillCategoryCount,
  SkillNavigationSnapshot,
  SkillQuery,
  SkillSummary,
  StorageSummary,
  UpdatePresetInput,
  UpdateSkillInput,
} from "../shared/types";

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
      previewGitImport: (repositoryUrl: string) => Promise<GitImportPreview>;
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
      getProjectBoundSkillIds: (projectId: string) => Promise<string[]>;
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
      listThemePacks: () => Promise<ThemePackSummary[]>;
      getThemePack: (key: string) => Promise<ThemePack | null>;
      importThemePackFile: () => Promise<ThemePackSummary | null>;
      exportThemePackFile: (key: string) => Promise<FileExportResult | null>;
      deleteThemePack: (key: string) => Promise<void>;
      getAppInfo: () => Promise<AppInfo>;
      getOnboardingState: () => Promise<OnboardingState>;
      completeOnboarding: (dataDirectory?: string | null) => Promise<OnboardingState>;
      getStorageSummary: () => Promise<StorageSummary>;
      openStoragePath: (targetPath: string) => Promise<void>;
      cleanUnusedSkillSourceClones: () => Promise<CleanUnusedClonesResult>;
      chooseDataDirectory: () => Promise<string | null>;
      chooseSkillSourcesDirectory: () => Promise<string | null>;
      setSkillSourcesDirectory: (directoryPath: string) => Promise<string>;
      requestDataDirectoryChange: (directoryPath: string) => Promise<{ requiresRestart: boolean; targetPath: string }>;
      migrateDataDirectory: (directoryPath: string) => Promise<DataDirectoryMigrationResult | null>;
      cleanPreviousDataDirectory: () => Promise<{ removedPath: string; freedBytes: number } | null>;
      dismissPreviousDataDirectory: () => Promise<StorageSummary>;
      restartApp: () => Promise<void>;
      backupDatabase: () => Promise<FileExportResult | null>;
      exportData: () => Promise<FileExportResult | null>;
    };
  }
}

export {};
