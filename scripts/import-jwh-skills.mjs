import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");
const outputRoot = path.join(projectRoot, "resources", "skills");

const defaultSourceDb = path.join(
  process.env.APPDATA ?? "",
  "jwh-skill",
  "jwh-skill.db",
);

const sourceDb = process.argv[2] ? path.resolve(process.argv[2]) : defaultSourceDb;

function safeFileName(name) {
  return name.replace(/[<>:"/\\|?*]/g, "-").trim() || "skill";
}

function mapPlatforms(raw) {
  try {
    const platforms = JSON.parse(raw || "[]");
    if (!Array.isArray(platforms)) return [];
    return [...new Set(platforms.map((item) => String(item).trim()).filter(Boolean))];
  } catch {
    return [];
  }
}

function buildMarkdown(name, description, platforms, promptContent) {
  const platformLine = platforms.length ? platforms.join(", ") : "codex, cursor, claude, hermes";
  return [
    `# ${name}`,
    "",
    `> ${description?.trim() || "暂无描述"}`,
    "",
    `支持平台: ${platformLine}`,
    "",
    "## Prompt",
    "",
    promptContent.trim(),
    "",
  ].join("\n");
}

function resolveDisplayName(name, category, duplicateCounts) {
  if ((duplicateCounts.get(name) ?? 0) <= 1) return name;
  return `${name} · ${category}`;
}

function readSkills(sourcePath) {
  const sql = `
    SELECT s.id, s.name, s.description, s.prompt_content, s.supported_platforms, c.name AS category
    FROM skills s
    LEFT JOIN categories c ON c.id = s.category_id
    ORDER BY s.id ASC
  `;
  const output = execFileSync("sqlite3", ["-json", sourcePath, sql], {
    encoding: "utf8",
    maxBuffer: 1024 * 1024 * 64,
  }).trim();
  if (!output) return [];
  return JSON.parse(output);
}

function main() {
  if (!fs.existsSync(sourceDb)) {
    console.error(`找不到 Jwh Skill 数据库：${sourceDb}`);
    process.exit(1);
  }

  const rows = readSkills(sourceDb);
  if (rows.length === 0) {
    console.error("数据库中没有可导入的 Skill");
    process.exit(1);
  }

  const duplicateNames = rows.reduce((map, row) => {
    map.set(row.name, (map.get(row.name) ?? 0) + 1);
    return map;
  }, new Map());

  const usedPaths = new Set();
  fs.rmSync(outputRoot, { recursive: true, force: true });
  fs.mkdirSync(outputRoot, { recursive: true });

  let written = 0;
  for (const row of rows) {
    const category = row.category?.trim() || "未分类";
    const displayName = resolveDisplayName(row.name, category, duplicateNames);
    const categoryDir = path.join(outputRoot, safeFileName(category));
    fs.mkdirSync(categoryDir, { recursive: true });

    let fileName = `${safeFileName(displayName)}.md`;
    let filePath = path.join(categoryDir, fileName);
    let suffix = 2;
    while (usedPaths.has(filePath)) {
      fileName = `${safeFileName(displayName)} (${suffix}).md`;
      filePath = path.join(categoryDir, fileName);
      suffix += 1;
    }
    usedPaths.add(filePath);

    const markdown = buildMarkdown(
      displayName,
      row.description,
      mapPlatforms(row.supported_platforms),
      row.prompt_content ?? "",
    );
    fs.writeFileSync(filePath, markdown, "utf8");
    written += 1;
  }

  console.log(`已从 ${sourceDb} 导入 ${written} 个 Skill 到 ${outputRoot}`);
}

main();
