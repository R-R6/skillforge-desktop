import { app, BrowserWindow, Menu, Tray } from "electron";
import fs from "node:fs";
import path from "node:path";
import { closeDatabase, initializeDatabase } from "./db";
import { registerIpcHandlers } from "./ipc";
import { logError, logInfo } from "./logger";
import { applyWindowBackground, getInitialTitleBarOverlay, initializeThemeBridge, isTitleBarOverlayEnabled, setMainWindowGetter } from "./theme";

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;

function getAssetPath(fileName: string) {
  const packagedPath = path.join(process.resourcesPath, fileName);
  if (fs.existsSync(packagedPath)) return packagedPath;
  return path.join(app.getAppPath(), "resources", fileName);
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
            { role: "quit", label: "退出 SkillForge" },
          ],
        },
        {
          label: "编辑",
          submenu: [{ role: "copy" }, { role: "paste" }, { role: "selectAll" }],
        },
        {
          label: "窗口",
          submenu: [{ role: "minimize" }, { role: "zoom" }, { role: "front" }],
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
    backgroundColor: "#13161c",
    icon: getAssetPath("icon.png"),
    autoHideMenuBar: true,
    ...(isMac ? { titleBarStyle: "hiddenInset" as const } : {}),
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
  const iconPath = getAssetPath("icon.png");
  if (!fs.existsSync(iconPath)) return;
  tray = new Tray(iconPath);
  tray.setToolTip("SkillForge Desktop");
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: "打开 SkillForge", click: () => mainWindow?.show() },
      { type: "separator" },
      { label: "退出", click: () => app.quit() },
    ]),
  );
  tray.on("double-click", () => mainWindow?.show());
}

app.whenReady().then(() => {
  configureApplicationMenu();
  initializeDatabase();
  registerIpcHandlers();
  setMainWindowGetter(() => mainWindow);
  initializeThemeBridge();
  logInfo("app_started", { version: app.getVersion() });
  createWindow();
  createTray();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("before-quit", () => {
  logInfo("app_stopping");
  tray?.destroy();
  closeDatabase();
});

process.on("uncaughtException", (error) => {
  logError("uncaught_exception", { message: error.message, stack: error.stack });
});
