#!/bin/bash
set -e

INSTALL_DIR="$HOME/.catch"

echo ""
echo "  catching update..."
echo ""

if [ ! -d "$INSTALL_DIR" ]; then
  echo "  ✗ not installed. run the install script first."
  exit 1
fi

cd "$INSTALL_DIR"
git pull --quiet
npx tsc 2>/dev/null

echo ""
echo "  ✓ updated."
echo ""
