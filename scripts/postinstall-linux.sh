#!/bin/sh
# Install udev rule for /dev/uinput access (enables native paste and ydotool)
RULES_SRC="/opt/OpenWhispr/resources/linux/99-openwhispr-uinput.rules"
RULES_DEST="/etc/udev/rules.d/99-openwhispr-uinput.rules"

if [ -f "$RULES_SRC" ]; then
  cp "$RULES_SRC" "$RULES_DEST"
  udevadm control --reload-rules 2>/dev/null || true
fi
