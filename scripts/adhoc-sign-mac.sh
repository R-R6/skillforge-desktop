#!/usr/bin/env bash
# Deep ad-hoc codesign for SkillForge Desktop.app (no Apple Developer identity).
# Usage: scripts/adhoc-sign-mac.sh "/path/to/SkillForge Desktop.app"

set -euo pipefail

if [[ $# -ne 1 ]]; then
  echo "usage: $0 \"/path/to/SkillForge Desktop.app\"" >&2
  exit 1
fi

APP_PATH="$1"

if [[ ! -d "${APP_PATH}" ]]; then
  echo "error: app bundle not found: ${APP_PATH}" >&2
  exit 1
fi

if [[ "$(uname -s)" != "Darwin" ]]; then
  echo "error: ad-hoc signing requires macOS" >&2
  exit 1
fi

sign_one() {
  local target="$1"
  codesign --force --sign - --timestamp=none "${target}"
}

is_mach_o() {
  local target="$1"
  local info
  info="$(file -b "${target}" 2>/dev/null || true)"
  [[ "${info}" == *"Mach-O"* ]]
}

echo "ad-hoc signing: ${APP_PATH}"

# 1) Sign nested Mach-O files (dylib / node / helpers / frameworks binaries).
while IFS= read -r -d '' binary; do
  if is_mach_o "${binary}"; then
    sign_one "${binary}"
  fi
done < <(find "${APP_PATH}/Contents" -type f -print0)

# 2) Sign nested bundles (helpers / frameworks) deepest-first.
while IFS= read -r target; do
  sign_one "${target}"
done < <(
  find "${APP_PATH}/Contents" \( -name "*.framework" -o -name "*.app" \) -print \
    | python3 -c 'import sys; paths=[line.rstrip("\n") for line in sys.stdin if line.strip()]; paths.sort(key=lambda p: p.count("/"), reverse=True); print("\n".join(paths))'
)

# 3) Sign the outer application bundle last.
sign_one "${APP_PATH}"

echo "verifying ad-hoc signature..."
codesign --verify --deep --strict --verbose=2 "${APP_PATH}"
echo "ad-hoc signature ok"
