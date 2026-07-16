const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

/**
 * electron-builder afterPack hook.
 * Ensures the macOS .app receives a deep ad-hoc signature before DMG creation.
 */
exports.default = async function afterPack(context) {
  if (context.electronPlatformName !== "darwin") return;

  const appName = context.packager.appInfo.productFilename;
  const appPath = path.join(context.appOutDir, `${appName}.app`);
  const scriptPath = path.join(__dirname, "adhoc-sign-mac.sh");

  if (!fs.existsSync(appPath)) {
    throw new Error(`afterPack: app bundle missing at ${appPath}`);
  }
  if (!fs.existsSync(scriptPath)) {
    throw new Error(`afterPack: signing script missing at ${scriptPath}`);
  }

  execFileSync("bash", [scriptPath, appPath], {
    stdio: "inherit",
  });
};
