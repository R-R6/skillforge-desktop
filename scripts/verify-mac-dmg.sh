#!/usr/bin/env bash
# Verify a packaged macOS DMG and unpacked .app for CI.
# Usage: scripts/verify-mac-dmg.sh arm64|x86_64

set -euo pipefail

EXPECTED_ARCH="${1:-}"
ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
RELEASE_DIR="${ROOT_DIR}/release"
APP_NAME="SkillForge Desktop.app"

if [[ "${EXPECTED_ARCH}" != "arm64" && "${EXPECTED_ARCH}" != "x86_64" ]]; then
  echo "usage: $0 arm64|x86_64" >&2
  exit 1
fi

if [[ "${EXPECTED_ARCH}" == "arm64" ]]; then
  DMG_GLOB="SkillForge-*-macos-arm64.dmg"
  APP_DIR="${RELEASE_DIR}/mac-arm64"
  ARCH_PATTERN="arm64"
else
  DMG_GLOB="SkillForge-*-macos-x64.dmg"
  APP_DIR="${RELEASE_DIR}/mac"
  ARCH_PATTERN="x86_64"
fi

DMG_PATH=""
while IFS= read -r candidate; do
  DMG_PATH="${candidate}"
done < <(find "${RELEASE_DIR}" -maxdepth 1 -name "${DMG_GLOB}" -type f | sort)

if [[ -z "${DMG_PATH}" || ! -f "${DMG_PATH}" ]]; then
  echo "error: expected exactly one DMG matching ${DMG_GLOB}" >&2
  exit 1
fi

if [[ "$(find "${RELEASE_DIR}" -maxdepth 1 -name "${DMG_GLOB}" -type f | wc -l | tr -d ' ')" != "1" ]]; then
  echo "error: expected exactly one DMG matching ${DMG_GLOB}" >&2
  exit 1
fi

echo "dmg: ${DMG_PATH}"

APP_PATH="${APP_DIR}/${APP_NAME}"

if [[ ! -d "${APP_PATH}" ]]; then
  echo "error: unpacked app not found at ${APP_PATH}" >&2
  ls -la "${RELEASE_DIR}" >&2 || true
  exit 1
fi

echo "app: ${APP_PATH}"

MAIN_BINARY="${APP_PATH}/Contents/MacOS/SkillForge Desktop"
if [[ ! -f "${MAIN_BINARY}" ]]; then
  echo "error: main executable missing: ${MAIN_BINARY}" >&2
  exit 1
fi

echo "verifying ad-hoc signature on unpacked app..."
codesign --verify --deep --strict --verbose=2 "${APP_PATH}"

echo "verifying dmg image..."
hdiutil verify "${DMG_PATH}"

ATTACH_PLIST="$(mktemp)"
MOUNT_POINT=""
cleanup() {
  if [[ -n "${MOUNT_POINT}" && -d "${MOUNT_POINT}" ]]; then
    hdiutil detach "${MOUNT_POINT}" >/dev/null 2>&1 || true
  fi
  rm -f "${ATTACH_PLIST}"
}
trap cleanup EXIT

hdiutil attach -plist -nobrowse -readonly "${DMG_PATH}" >"${ATTACH_PLIST}"
MOUNT_POINT="$(python3 - "${ATTACH_PLIST}" <<'PY'
import plistlib, sys
with open(sys.argv[1], "rb") as handle:
    plist = plistlib.load(handle)
for entity in plist.get("system-entities", []):
    mount_point = entity.get("mount-point")
    if mount_point:
        print(mount_point)
        break
PY
)"

if [[ -z "${MOUNT_POINT}" || ! -d "${MOUNT_POINT}" ]]; then
  echo "error: failed to mount DMG" >&2
  exit 1
fi

echo "mounted: ${MOUNT_POINT}"

DMG_APP="${MOUNT_POINT}/${APP_NAME}"
DMG_APPLICATIONS="${MOUNT_POINT}/Applications"
if [[ ! -d "${DMG_APP}" ]]; then
  echo "error: DMG missing ${APP_NAME}" >&2
  exit 1
fi
if [[ ! -L "${DMG_APPLICATIONS}" ]]; then
  echo "error: DMG missing Applications link" >&2
  exit 1
fi
if [[ "$(readlink "${DMG_APPLICATIONS}")" != "/Applications" ]]; then
  echo "error: Applications link target is not /Applications" >&2
  exit 1
fi

MAIN_INFO="$(file -b "${MAIN_BINARY}")"
echo "main executable: ${MAIN_INFO}"
if [[ "${MAIN_INFO}" != *"${ARCH_PATTERN}"* ]]; then
  echo "error: main executable architecture mismatch, expected ${ARCH_PATTERN}" >&2
  exit 1
fi

SQLITE_COUNT=0
while IFS= read -r node_path; do
  SQLITE_COUNT=$((SQLITE_COUNT + 1))
  node_info="$(file -b "${node_path}")"
  echo "native module: ${node_path}"
  echo "  ${node_info}"
  if [[ "${node_info}" != *"${ARCH_PATTERN}"* ]]; then
    echo "error: native module architecture mismatch, expected ${ARCH_PATTERN}" >&2
    exit 1
  fi
done < <(find "${APP_PATH}" \( -name "better_sqlite3.node" -o -name "better-sqlite3.node" \) -type f | sort)

if [[ "${SQLITE_COUNT}" -lt 1 ]]; then
  echo "error: better_sqlite3.node not found in app bundle" >&2
  exit 1
fi

RESOURCES_DIR="${APP_PATH}/Contents/Resources"
for resource in "trayTemplate.png" "trayTemplate@2x.png"; do
  if [[ ! -f "${RESOURCES_DIR}/${resource}" ]]; then
    echo "error: missing packaged tray resource: ${RESOURCES_DIR}/${resource}" >&2
    exit 1
  fi
  echo "tray resource ok: ${resource}"
done

echo "macOS ${EXPECTED_ARCH} DMG verification ok"
