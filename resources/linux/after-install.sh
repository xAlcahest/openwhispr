#!/bin/sh
# OpenWhispr post-install script: automatic ydotool setup for Wayland paste
# Runs as root after .deb/.rpm installation. Must be POSIX sh (dash on Debian).
# Idempotent — safe to run on upgrades/reinstalls. Never fails the install.

set +e  # never abort package installation

log() {
    echo "openwhispr-postinst: $*"
}

# --- 1. Create /usr/bin symlink for terminal launch ---
if [ -x /opt/OpenWhispr/open-whispr ] && [ ! -e /usr/bin/openwhispr ]; then
    ln -sf /opt/OpenWhispr/open-whispr /usr/bin/openwhispr 2>/dev/null || log "warning: could not create /usr/bin/openwhispr symlink"
fi

# --- 2. Check if ydotool is installed (it's a suggested dependency, not required) ---
if ! command -v ydotool >/dev/null 2>&1; then
    exit 0
fi

log "ydotool detected, configuring for Wayland paste support..."

# --- 2. Setup /dev/uinput permissions ---
UDEV_RULE="/etc/udev/rules.d/80-uinput.rules"
UDEV_CONTENT='KERNEL=="uinput", GROUP="input", MODE="0660"'

if [ ! -f "$UDEV_RULE" ]; then
    log "creating udev rule for /dev/uinput"
    echo "$UDEV_CONTENT" > "$UDEV_RULE" 2>/dev/null || log "warning: could not create udev rule"
fi

# Load uinput module now
if ! lsmod 2>/dev/null | grep -q "^uinput"; then
    modprobe uinput 2>/dev/null || log "warning: could not load uinput module"
fi

# Persist uinput module across reboots
MODULES_CONF="/etc/modules-load.d/uinput.conf"
if [ ! -f "$MODULES_CONF" ]; then
    echo "uinput" > "$MODULES_CONF" 2>/dev/null || log "warning: could not persist uinput module"
fi

# Reload udev rules
udevadm control --reload-rules 2>/dev/null
udevadm trigger /dev/uinput 2>/dev/null

# --- 3. Add the installing user to the input group ---
TARGET_USER="${SUDO_USER:-}"
if [ -z "$TARGET_USER" ]; then
    # Fallback: find the user who owns the login session (UID 1000+)
    TARGET_USER=$(logname 2>/dev/null || echo "")
fi
if [ -z "$TARGET_USER" ] || [ "$TARGET_USER" = "root" ]; then
    # Last resort: first non-system user with UID >= 1000
    TARGET_USER=$(getent passwd 2>/dev/null | awk -F: '$3 >= 1000 && $3 < 65534 { print $1; exit }')
fi

if [ -n "$TARGET_USER" ] && [ "$TARGET_USER" != "root" ]; then
    if ! id -nG "$TARGET_USER" 2>/dev/null | grep -qw "input"; then
        log "adding $TARGET_USER to input group"
        usermod -aG input "$TARGET_USER" 2>/dev/null || log "warning: could not add user to input group"
    fi
fi

# --- 4. Enable and start ydotoold daemon ---
# Fedora/Arch: system service exists as /usr/lib/systemd/system/ydotool.service
if [ -f /usr/lib/systemd/system/ydotool.service ]; then
    log "enabling system ydotool service (Fedora/Arch)"
    systemctl enable ydotool 2>/dev/null || true
    systemctl start ydotool 2>/dev/null || true

# Debian/Ubuntu: no system service file in the package — create a systemd user service
elif [ -d /etc/systemd ]; then
    USER_SERVICE_DIR="/etc/systemd/user"
    USER_SERVICE="$USER_SERVICE_DIR/ydotoold.service"

    if [ ! -f "$USER_SERVICE" ]; then
        log "creating systemd user service for ydotoold (Debian/Ubuntu)"
        mkdir -p "$USER_SERVICE_DIR" 2>/dev/null

        cat > "$USER_SERVICE" 2>/dev/null <<'SERVICEEOF'
[Unit]
Description=ydotoold - ydotool daemon
Documentation=man:ydotoold(8)

[Service]
ExecStart=/usr/bin/ydotoold
Restart=on-failure
RestartSec=3

[Install]
WantedBy=default.target
SERVICEEOF
        systemctl daemon-reload 2>/dev/null || true
    fi

    # Enable the user service globally (all users)
    if [ -d /etc/systemd/user/default.target.wants ]; then
        WANTS_LINK="/etc/systemd/user/default.target.wants/ydotoold.service"
        if [ ! -L "$WANTS_LINK" ]; then
            ln -sf "$USER_SERVICE" "$WANTS_LINK" 2>/dev/null || true
        fi
    else
        mkdir -p /etc/systemd/user/default.target.wants 2>/dev/null
        ln -sf "$USER_SERVICE" /etc/systemd/user/default.target.wants/ydotoold.service 2>/dev/null || true
    fi
fi

# --- Done ---
log "ydotool setup complete."
if [ -n "$TARGET_USER" ] && [ "$TARGET_USER" != "root" ]; then
    if ! id -nG "$TARGET_USER" 2>/dev/null | grep -qw "input"; then
        log "NOTE: $TARGET_USER must log out and back in for input group membership to take effect."
    fi
fi

exit 0
