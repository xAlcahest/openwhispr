#!/bin/bash
set -euo pipefail

# Remove terminal symlink
if [ -L /usr/bin/openwhispr ]; then
  rm -f /usr/bin/openwhispr
fi

# Remove udev rule
RULES_FILE="/etc/udev/rules.d/60-openwhispr-uinput.rules"
if [ -f "$RULES_FILE" ]; then
  rm -f "$RULES_FILE"
  udevadm control --reload-rules 2>/dev/null || true
fi

# Remove cached models
CACHE_DIR="$HOME/.cache/openwhispr"
MODELS_DIR="$CACHE_DIR/models"

if [ -d "$MODELS_DIR" ]; then
  rm -rf "$MODELS_DIR"
  echo "Removed OpenWhispr cached models"
fi

if [ -d "$CACHE_DIR" ]; then
  rmdir "$CACHE_DIR" 2>/dev/null || true
fi
