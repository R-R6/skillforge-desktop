export interface SkillSummary {
  id: string;
  name: string;
  description: string;
  category: string;
  platforms: string[];
  content: string;
  tags?: string[];
  enabled?: boolean;
  sourceType?: "builtin" | "external";
  sourcePath?: string | null;
  sourceUrl?: string | null;
}

export interface SkillQuery {
  search?: string;
  category?: string;
  navigationKey?: string;
}

export interface SkillCategoryCount {
  category: string;
  count: number;
}

export type { SkillNavigationSnapshot, SkillSourceGroup } from "./skillNavigation";

export interface CreateSkillInput {
  name: string;
  description?: string;
  category?: string;
  platforms: string[];
  content: string;
}

export interface UpdateSkillInput extends CreateSkillInput {
  skillId: string;
}

export type AgentTool = "codex" | "cursor" | "claude-code" | "hermes";

export interface ProjectSummary {
  id: string;
  name: string;
  path: string;
  tools: AgentTool[];
  skillCount: number;
  discoveredSkillCount: number;
  discoveredTools: AgentTool[];
  lastScannedAt: string | null;
  updatedAt: string;
}

export interface DeployProjectInput {
  projectId: string;
  skillIds: string[];
  tools: AgentTool[];
}

export interface DeploymentResult {
  project: ProjectSummary;
  files: string[];
}

export interface ClearProjectResult {
  project: ProjectSummary;
  removedFiles: string[];
  preservedFiles: string[];
}

export type SkillSourceTool = AgentTool | "agents" | "my-skills";

export interface ExternalSkillRecord {
  id: string;
  name: string;
  tool: SkillSourceTool;
  path: string;
  relativePath: string;
  format: "md" | "mdc" | "json";
  managed: boolean;
  importable: boolean;
  description: string;
  scope: "project" | "global";
}

export interface ProjectScanResult {
  project: ProjectSummary;
  skills: ExternalSkillRecord[];
  globalSkills: ExternalSkillRecord[];
  scannedAt: string;
}

export interface ImportExternalSkillInput {
  projectId: string;
  relativePath: string;
  sourcePath?: string;
}

export interface PresetSummary {
  id: string;
  name: string;
  description: string;
  skillIds: string[];
  tools: AgentTool[];
  createdAt: string;
  updatedAt: string;
}

export interface CreatePresetInput {
  name: string;
  description?: string;
  skillIds: string[];
  tools: AgentTool[];
}

export interface UpdatePresetInput extends CreatePresetInput {
  presetId: string;
}

export interface ApplyPresetInput {
  presetId: string;
  projectId: string;
}

export type SettingsMap = Record<string, string>;

export interface AppInfo {
  version: string;
  userDataPath: string;
  databasePath: string;
  platform: string;
  defaultUserDataPath: string;
  skillSourcesPath: string;
  bootstrapPath: string;
}

export type {
  CleanUnusedClonesResult,
  DataDirectoryMigrationResult,
  GitImportPreview,
  OnboardingState,
  SkillSourceCloneSummary,
  StorageEntrySummary,
  StorageSummary,
} from "./storage";

export interface FileExportResult {
  filePath: string;
  kind: "database" | "json";
}
