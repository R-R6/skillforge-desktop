import { describe, expect, it } from "vitest";
import { formatStorageSize } from "./storage";

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
