import { app, BrowserWindow, Menu, Tray, nativeImage } from "electron";
import fs from "node:fs";
import path from "node:path";
import { applyBootstrapPaths } from "./bootstrap";
import { closeDatabase, initializeDatabase } from "./db";
import { registerIpcHandlers } from "./ipc";
import { logError, logInfo } from "./logger";
import {
  applyWindowBackground,
  getInitialTitleBarOverlay,
  getInitialWindowBackgroundColor,
  initializeThemeBridge,
  isTitleBarOverlayEnabled,
  setMainWindowGetter,
} from "./theme";

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;

applyBootstrapPaths();

function getAssetPath(fileName: string) {
  const packagedPath = path.join(process.resourcesPath, fileName);
  if (fs.existsSync(packagedPath)) return packagedPath;
  return path.join(app.getAppPath(), "resources", fileName);
}

/** macOS Dock 图标来自 .app 包；dev 跑的是 Electron.app，需运行时覆盖。 */
function applyMacDockIcon() {
  if (process.platform !== "darwin" || !app.dock) return;
  const iconPath = getAssetPath("icon.png");
  if (!fs.existsSync(iconPath)) return;
  app.dock.setIcon(nativeImage.createFromPath(iconPath));
}

function showMainWindow() {
  if (!mainWindow || mainWindow.isDestroyed()) {
    createWindow();
    return;
  }
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.show();
  mainWindow.focus();
}

function configureApplicationMenu() {
  if (process.platform === "darwin") {
    Menu.setApplicationMenu(
      Menu.buildFromTemplate([
        {
          label: app.name,
          submenu: [
            { role: "about" },
            { type: "separator" },
            { role: "services" },
            { type: "separator" },
            { role: "hide" },
            { role: "hideOthers" },
            { role: "unhide" },
            { type: "separator" },
            { role: "quit" },
          ],
        },
        {
          label: "编辑",
          submenu: [
            { role: "undo" },
            { role: "redo" },
            { type: "separator" },
            { role: "cut" },
            { role: "copy" },
            { role: "paste" },
            { role: "selectAll" },
          ],
        },
        {
          label: "窗口",
          submenu: [
            { role: "close" },
            { role: "minimize" },
            { role: "zoom" },
            { type: "separator" },
            { role: "front" },
          ],
        },
      ]),
    );
    return;
  }
  Menu.setApplicationMenu(null);
}

function createWindow() {
  const isMac = process.platform === "darwin";
  const isWin = process.platform === "win32";

  mainWindow = new BrowserWindow({
    width: 1320,
    height: 840,
    minWidth: 1080,
    minHeight: 680,
    title: "SkillForge",
    backgroundColor: getInitialWindowBackgroundColor(),
    icon: getAssetPath("icon.png"),
    autoHideMenuBar: true,
    ...(isMac
      ? {
          titleBarStyle: "hiddenInset" as const,
          trafficLightPosition: { x: 14, y: 14 },
        }
      : {}),
    ...(isWin ? { titleBarOverlay: getInitialTitleBarOverlay() } : {}),
    webPreferences: {
      preload: path.join(__dirname, "../preload/index.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, "../renderer/index.html"));
  }

  mainWindow.webContents.on("did-finish-load", () => {
    const classes = [`platform-${process.platform}`];
    if (isTitleBarOverlayEnabled()) classes.push("platform-win32-overlay");
    const script = `document.body.classList.add(${classes.map((name) => JSON.stringify(name)).join(", ")})`;
    mainWindow?.webContents.executeJavaScript(script).catch(() => undefined);
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  applyWindowBackground();
}

function createTray() {
  const isMac = process.platform === "darwin";
  const iconPath = isMac ? getAssetPath("trayTemplate.png") : getAssetPath("icon.png");
  if (!fs.existsSync(iconPath)) return;

  if (isMac) {
    const trayImage = nativeImage.createFromPath(iconPath);
    trayImage.setTemplateImage(true);
    tray = new Tray(trayImage);
  } else {
    tray = new Tray(iconPath);
  }

  tray.setToolTip("SkillForge Desktop");
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: "打开 SkillForge", click: () => showMainWindow() },
      { type: "separator" },
      { label: "退出", click: () => app.quit() },
    ]),
  );

  if (isMac) {
    tray.on("click", () => showMainWindow());
  } else {
    tray.on("double-click", () => showMainWindow());
  }
}

app.whenReady().then(() => {
  configureApplicationMenu();
  applyMacDockIcon();
  initializeDatabase();
  registerIpcHandlers();
  setMainWindowGetter(() => mainWindow);
  initializeThemeBridge();
  logInfo("app_started", { version: app.getVersion() });
  createWindow();
  createTray();

  app.on("activate", () => {
    showMainWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("before-quit", () => {
  // Avoid a one-frame flash of Electron.app's stock dock icon while quitting.
  if (process.platform === "darwin" && app.dock) app.dock.hide();
  logInfo("app_stopping");
  tray?.destroy();
  closeDatabase();
});

process.on("uncaughtException", (error) => {
  logError("uncaught_exception", { message: error.message, stack: error.stack });
});
