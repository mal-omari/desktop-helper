#!/usr/bin/env bash
# Download default Tauri app icons into src-tauri/icons (run from repo root).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ICON_DIR="${ROOT}/src-tauri/icons"
BASE="https://raw.githubusercontent.com/tauri-apps/tauri/dev/crates/tauri-cli/templates/app/src-tauri/icons"

mkdir -p "$ICON_DIR"

icons=(
  "32x32.png"
  "128x128.png"
  "128x128@2x.png"
  "icon.png"
  "icon.ico"
  "icon.icns"
  "Square30x30Logo.png"
  "Square44x44Logo.png"
  "Square71x71Logo.png"
  "Square89x89Logo.png"
  "Square107x107Logo.png"
  "Square142x142Logo.png"
  "Square150x150Logo.png"
  "Square284x284Logo.png"
  "Square310x310Logo.png"
  "StoreLogo.png"
)

for name in "${icons[@]}"; do
  echo "Fetching ${name}..."
  curl -fsSL "${BASE}/${name}" -o "${ICON_DIR}/${name}"
done

echo "Icons saved to ${ICON_DIR}"
