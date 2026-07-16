/**
 * Dev-only: replace Electron.app's default dock icon with resources/icon.icns
 * so macOS never flashes the stock Electron atom on launch/quit.
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

if (process.platform !== "darwin") process.exit(0);

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = path.join(root, "resources", "icon.icns");
const electronApp = path.join(root, "node_modules", "electron", "dist", "Electron.app");
const dest = path.join(electronApp, "Contents", "Resources", "electron.icns");

if (!fs.existsSync(source) || !fs.existsSync(dest)) process.exit(0);

const sameSize =
  fs.statSync(source).size === fs.statSync(dest).size &&
  fs.readFileSync(source).equals(fs.readFileSync(dest));
if (sameSize) process.exit(0);

fs.copyFileSync(source, dest);

try {
  execFileSync("codesign", ["--force", "--deep", "--sign", "-", electronApp], {
    stdio: "ignore",
  });
} catch {
  // Ad-hoc resign is best-effort; local electron-vite still launches without it.
}
