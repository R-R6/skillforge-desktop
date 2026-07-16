import { describe, expect, it } from "vitest";
import {
  formatStorageSize,
  getPathDriveLabel,
  isPathInsideOrEqual,
  isSystemDrivePath,
  pathsEqual,
  remapPathUnderRoot,
} from "./storage";

describe("formatStorageSize", () => {
  it("formats zero and bytes", () => {
    expect(formatStorageSize(0)).toBe("0 B");
    expect(formatStorageSize(512)).toBe("512 B");
  });

  it("formats kilobytes and megabytes", () => {
    expect(formatStorageSize(2048)).toBe("2.00 KB");
    expect(formatStorageSize(5 * 1024 * 1024)).toBe("5.00 MB");
  });
});

describe("getPathDriveLabel", () => {
  it("reads Windows drive letters", () => {
    expect(getPathDriveLabel("C:\\Users\\admin\\AppData", "win32")).toBe("C:");
    expect(getPathDriveLabel("d:/data/skillforge", "win32")).toBe("D:");
  });

  it("reads macOS volumes", () => {
    expect(getPathDriveLabel("/Users/me/Library", "darwin")).toBe("/");
    expect(getPathDriveLabel("/Volumes/Data/SkillForge", "darwin")).toBe("Data");
  });
});

describe("isSystemDrivePath", () => {
  it("flags Windows system drive", () => {
    expect(isSystemDrivePath("C:\\Users\\admin\\AppData", { platform: "win32", systemDrive: "C:" })).toBe(true);
    expect(isSystemDrivePath("D:\\SkillForge", { platform: "win32", systemDrive: "C:" })).toBe(false);
  });
});

describe("pathsEqual / isPathInsideOrEqual", () => {
  it("compares Windows paths case-insensitively", () => {
    expect(pathsEqual("C:\\Data\\App", "c:\\data\\app", "win32")).toBe(true);
    expect(isPathInsideOrEqual("C:\\Data\\App\\db", "c:\\data\\app", "win32")).toBe(true);
    expect(isPathInsideOrEqual("C:\\Data", "c:\\data\\app", "win32")).toBe(false);
  });
});

describe("remapPathUnderRoot", () => {
  it("remaps nested paths", () => {
    const from = "C:\\Users\\admin\\AppData\\Roaming\\skillforge-desktop";
    const to = "D:\\SkillForge\\data";
    expect(remapPathUnderRoot(`${from}\\skill-sources\\abc`, from, to)).toBe("D:\\SkillForge\\data\\skill-sources\\abc");
  });

  it("leaves external paths unchanged", () => {
    expect(remapPathUnderRoot("E:\\clones\\repo", "C:\\old", "D:\\new")).toBe("E:\\clones\\repo");
  });
});
