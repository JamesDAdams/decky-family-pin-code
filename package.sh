#!/usr/bin/env bash
set -euo pipefail

PLUGIN_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PLUGIN_NAME=$(node -p "require('./package.json').name")
VERSION=$(node -p "require('./package.json').version")
ARTIFACT_DIR="$PLUGIN_DIR/artifact"
ZIP_NAME="$PLUGIN_NAME-v$VERSION.zip"

echo "==> Building frontend..."
pnpm run build

echo "==> Packaging plugin into $ZIP_NAME..."
rm -rf "$ARTIFACT_DIR" "$ZIP_NAME"
mkdir -p "$ARTIFACT_DIR/$PLUGIN_NAME"

cp -r dist "$ARTIFACT_DIR/$PLUGIN_NAME/"
cp main.py plugin.json package.json "$ARTIFACT_DIR/$PLUGIN_NAME/"
cp LICENSE* README* "$ARTIFACT_DIR/$PLUGIN_NAME/" 2>/dev/null || true

cd "$ARTIFACT_DIR"
zip -r "$PLUGIN_DIR/$ZIP_NAME" "$PLUGIN_NAME"
cd "$PLUGIN_DIR"
rm -rf "$ARTIFACT_DIR"

echo "==> Successfully created Decky plugin package: $ZIP_NAME"
