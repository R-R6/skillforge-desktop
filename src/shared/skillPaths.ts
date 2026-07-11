export const MY_SKILLS_ROOT = ".my-skills";
export const MY_SKILLS_SKILLS_DIR = `${MY_SKILLS_ROOT}/skills`;
export const MY_SKILLS_INDEX_FILE = `${MY_SKILLS_ROOT}/index.md`;

/** 仅用于扫描旧项目中的历史目录，部署时不会写入此路径。 */
export const LEGACY_SKILLS_SKILLS_DIR = ".jwh-skills/skills";

export function mySkillsSkillPath(projectPath: string, skillFileName: string) {
  return `${projectPath}/${MY_SKILLS_SKILLS_DIR}/${skillFileName}`;
}

export function mySkillsAtReference(skillFileName: string) {
  return `@${MY_SKILLS_SKILLS_DIR}/${skillFileName}`;
}
