#!/bin/bash
set -euo pipefail

CACHE_DIR="$HOME/.cache/openwhispr"
MODELS_DIR="$CACHE_DIR/models"

if [ -d "$MODELS_DIR" ]; then
  rm -rf "$MODELS_DIR"
  echo "Removed OpenWhispr cached models"
fi

if [ -d "$CACHE_DIR" ]; then
  rmdir "$CACHE_DIR" 2>/dev/null || true
fi

# Remove udev rule installed by OpenWhispr
UDEV_RULE="/etc/udev/rules.d/99-openwhispr-uinput.rules"
if [ -f "$UDEV_RULE" ]; then
  rm -f "$UDEV_RULE"
  udevadm control --reload-rules 2>/dev/null || true
  echo "Removed OpenWhispr udev rule"
fi
