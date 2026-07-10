import type { ApplyPresetInput, DeploymentResult } from "../shared/types";
import { getPreset } from "./db";
import { deployProject } from "./deployment";

export function applyPresetToProject(input: ApplyPresetInput): DeploymentResult {
  const preset = getPreset(input.presetId);
  if (!preset) throw new Error("Preset 不存在");
  return deployProject({
    projectId: input.projectId,
    skillIds: preset.skillIds,
    tools: preset.tools,
  });
}
