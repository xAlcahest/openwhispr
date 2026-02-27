#!/bin/bash
# Install udev rule for /dev/uinput access (auto-paste on Wayland)
RULES_SRC="/opt/OpenWhispr/resources/linux/60-openwhispr-uinput.rules"
RULES_DST="/etc/udev/rules.d/60-openwhispr-uinput.rules"

if [ -f "$RULES_SRC" ]; then
  cp "$RULES_SRC" "$RULES_DST"
  udevadm control --reload-rules 2>/dev/null || true
  udevadm trigger --subsystem-match=misc --attr-match=name=uinput 2>/dev/null || true
fi
