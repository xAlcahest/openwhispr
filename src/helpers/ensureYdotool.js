const { execSync, spawnSync } = require("child_process");
const debugLogger = require("./debugLogger");

/**
 * Ensures ydotool is installed on Linux Wayland systems.
 *
 * For AppImage and tar.gz distributions (which lack package manager
 * dependency resolution), this prompts for root via pkexec and
 * auto-installs ydotool using the detected package manager.
 *
 * For .deb and .rpm packages, ydotool is declared as a required
 * dependency in electron-builder.json, so this is a no-op.
 */
function ensureYdotool() {
  if (process.platform !== "linux") return;

  // Only needed on Wayland
  const sessionType = (process.env.XDG_SESSION_TYPE || "").toLowerCase();
  const waylandDisplay = process.env.WAYLAND_DISPLAY;
  if (sessionType !== "wayland" && !waylandDisplay) return;

  // Check if ydotool is already installed
  try {
    execSync("which ydotool", { stdio: "pipe" });
    debugLogger.debug("ydotool already installed", {}, "clipboard");
    return;
  } catch {
    // Not installed, proceed with auto-install
  }

  // Detect package manager and build install command
  const installCmd = detectInstallCommand();
  if (!installCmd) {
    debugLogger.warn(
      "Cannot auto-install ydotool: no supported package manager found",
      {},
      "clipboard"
    );
    return;
  }

  debugLogger.info(`Auto-installing ydotool via: pkexec ${installCmd}`, {}, "clipboard");

  try {
    const result = spawnSync("pkexec", installCmd.split(" "), {
      stdio: "pipe",
      timeout: 120000,
    });

    if (result.status === 0) {
      debugLogger.info("ydotool installed successfully", {}, "clipboard");
    } else {
      const stderr = result.stderr?.toString().trim();
      debugLogger.warn(
        "ydotool installation failed",
        { exitCode: result.status, stderr },
        "clipboard"
      );
    }
  } catch (error) {
    debugLogger.warn(
      "ydotool installation error",
      { error: error.message },
      "clipboard"
    );
  }
}

function detectInstallCommand() {
  const managers = [
    { check: "dnf", cmd: "dnf install -y ydotool" },
    { check: "apt-get", cmd: "apt-get install -y ydotool" },
    { check: "pacman", cmd: "pacman -S --noconfirm ydotool" },
    { check: "zypper", cmd: "zypper install -y ydotool" },
  ];

  for (const { check, cmd } of managers) {
    try {
      execSync(`which ${check}`, { stdio: "pipe" });
      return cmd;
    } catch {
      continue;
    }
  }
  return null;
}

module.exports = { ensureYdotool };
