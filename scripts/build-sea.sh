#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BINARY_NAME="tunli-server"
BINARY="$SCRIPT_DIR/../dist-sea/$BINARY_NAME"

cd "$SCRIPT_DIR/.."
rm -rf dist-sea
mkdir -p dist-sea

echo "→ Bundling with esbuild..."
npx esbuild dist/sea-main.js \
  --bundle \
  --platform=node \
  --format=esm \
  --outfile=dist/tunli-bundle.js \
  --minify \
  --external:react-devtools-core \
  --external:fsevents \
  --define:process.env.NODE_ENV='"production"' \
  --banner:js="import { createRequire } from 'module'; const require = createRequire(import.meta.url);" \
  --alias:react-devtools-core=node:buffer

echo "→ Building SEA binary..."
node --build-sea sea-config.json

if [[ "$(uname)" == "Darwin" ]]; then
  echo "→ Signing binary (macOS)..."
  codesign --remove-signature "$BINARY"
  codesign --sign - "$BINARY"
fi

echo "→ Packaging..."
tar -czf "$BINARY.tar.gz" -C "$SCRIPT_DIR/../dist-sea" "$BINARY_NAME"

echo ""
echo "✓ Binary ready: dist-sea/$BINARY_NAME"
echo "  Size binary: $(du -sh "$BINARY" | cut -f1)"
echo "  Size packed: $(du -sh "$BINARY.tar.gz" | cut -f1)"
