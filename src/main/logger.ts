import { app } from "electron";
import fs from "node:fs";
import path from "node:path";

function write(level: "info" | "error", message: string, details?: unknown) {
  try {
    const logDir = path.join(app.getPath("userData"), "logs");
    fs.mkdirSync(logDir, { recursive: true });
    const line = JSON.stringify({
      timestamp: new Date().toISOString(),
      level,
      message,
      details: details ?? null,
    });
    fs.appendFileSync(path.join(logDir, "app.log"), `${line}\n`, "utf8");
  } catch {
    // Logging must never interrupt the operation being logged.
  }
}

export function logInfo(message: string, details?: unknown) {
  write("info", message, details);
}

export function logError(message: string, details?: unknown) {
  write("error", message, details);
}
