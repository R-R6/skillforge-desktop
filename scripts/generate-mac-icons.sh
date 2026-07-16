#!/usr/bin/env bash
# Generate resources/icon.icns and macOS tray Template Images from resources/icon.png.
# Requires only macOS built-ins: sips, iconutil.

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
SOURCE_PNG="${ROOT_DIR}/resources/icon.png"
ICONSET_DIR="${ROOT_DIR}/resources/icon.iconset"
OUTPUT_ICNS="${ROOT_DIR}/resources/icon.icns"
TRAY_TEMPLATE="${ROOT_DIR}/resources/trayTemplate.png"
TRAY_TEMPLATE_2X="${ROOT_DIR}/resources/trayTemplate@2x.png"
TMP_DIR="$(mktemp -d "${TMPDIR:-/tmp}/skillforge-icons.XXXXXX")"

cleanup() {
  rm -rf "${TMP_DIR}" "${ICONSET_DIR}"
}
trap cleanup EXIT

if [[ ! -f "${SOURCE_PNG}" ]]; then
  echo "error: missing source icon: ${SOURCE_PNG}" >&2
  exit 1
fi

for tool in sips iconutil; do
  if ! command -v "${tool}" >/dev/null 2>&1; then
    echo "error: required tool not found: ${tool}" >&2
    exit 1
  fi
done

rm -rf "${ICONSET_DIR}"
mkdir -p "${ICONSET_DIR}"

render_size() {
  local size="$1"
  local dest_name="$2"
  # Avoid writing filenames that contain '@' via sips directly (suffix warnings).
  local tmp_png="${TMP_DIR}/icon-${size}.png"
  sips -z "${size}" "${size}" "${SOURCE_PNG}" --out "${tmp_png}" >/dev/null
  cp "${tmp_png}" "${ICONSET_DIR}/${dest_name}"
}

# macOS iconutil expected filenames (16/32/128/256/512 and retina variants).
AT2X="@2x.png"
render_size 16   "icon_16x16.png"
render_size 32   "icon_16x16${AT2X}"
render_size 32   "icon_32x32.png"
render_size 64   "icon_32x32${AT2X}"
render_size 128  "icon_128x128.png"
render_size 256  "icon_128x128${AT2X}"
render_size 256  "icon_256x256.png"
render_size 512  "icon_256x256${AT2X}"
render_size 512  "icon_512x512.png"
render_size 1024 "icon_512x512${AT2X}"

iconutil -c icns "${ICONSET_DIR}" -o "${OUTPUT_ICNS}"

# Tray Template Images: 16px base + 32px retina. Electron loads retina automatically by name.
# App code marks these as Template Images at runtime.
sips -z 16 16 "${SOURCE_PNG}" --out "${TMP_DIR}/tray-1x.png" >/dev/null
sips -z 32 32 "${SOURCE_PNG}" --out "${TMP_DIR}/tray-2x.png" >/dev/null
cp "${TMP_DIR}/tray-1x.png" "${TRAY_TEMPLATE}"
cp "${TMP_DIR}/tray-2x.png" "${TRAY_TEMPLATE_2X}"

# Verify the .icns round-trips through iconutil.
VERIFY_ICONSET="${TMP_DIR}/verify.iconset"
iconutil -c iconset "${OUTPUT_ICNS}" -o "${VERIFY_ICONSET}" >/dev/null
COUNT="$(find "${VERIFY_ICONSET}" -type f | wc -l | tr -d ' ')"
if [[ "${COUNT}" -lt 5 ]]; then
  echo "error: unexpected iconset extraction count: ${COUNT}" >&2
  exit 1
fi

echo "wrote ${OUTPUT_ICNS}"
echo "wrote ${TRAY_TEMPLATE}"
echo "wrote ${TRAY_TEMPLATE_2X}"
echo "iconutil verified ${OUTPUT_ICNS}"
