/**
 * Dev-only: replace Electron.app's dock/Finder icon with resources/icon.icns
 * and refresh Launch Services so quit no longer flashes the stock Electron atom.
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
const marker = path.join(root, "node_modules", "electron", ".skillforge-dock-icon-patched");

if (!fs.existsSync(source) || !fs.existsSync(dest)) process.exit(0);

const sourceBuf = fs.readFileSync(source);
const alreadyCopied = fs.readFileSync(dest).equals(sourceBuf);
const markerOk =
  fs.existsSync(marker) &&
  fs.readFileSync(marker, "utf8").trim() === String(fs.statSync(source).mtimeMs);

if (alreadyCopied && markerOk) process.exit(0);

fs.copyFileSync(source, dest);

try {
  execFileSync(
    "swift",
    [
      "-e",
      `
import AppKit
let iconPath = ${JSON.stringify(source)}
let appPath = ${JSON.stringify(electronApp)}
guard let image = NSImage(contentsOfFile: iconPath) else { fatalError("icon") }
NSWorkspace.shared.setIcon(image, forFile: appPath, options: [])
`,
    ],
    { stdio: "ignore" },
  );
} catch {
  // NSWorkspace.setIcon is best-effort.
}

try {
  execFileSync("codesign", ["--force", "--deep", "--sign", "-", electronApp], {
    stdio: "ignore",
  });
} catch {
  // Ad-hoc resign is best-effort.
}

const lsregister =
  "/System/Library/Frameworks/CoreServices.framework/Frameworks/LaunchServices.framework/Support/lsregister";
try {
  execFileSync("touch", [electronApp], { stdio: "ignore" });
  if (fs.existsSync(lsregister)) {
    execFileSync(lsregister, ["-f", electronApp], { stdio: "ignore" });
  }
} catch {
  // Launch Services refresh is best-effort.
}

try {
  // Drop Dock's icon cache entries so the patched icns is what quit falls back to.
  execFileSync("killall", ["Dock"], { stdio: "ignore" });
} catch {
  // Dock restart is best-effort (only when we actually patched).
}

fs.writeFileSync(marker, `${fs.statSync(source).mtimeMs}\n`);
