import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Check, Terminal, Info, Shield } from "lucide-react";
import { Button } from "./button";
import { InfoBox } from "./InfoBox";
import type { PasteToolsResult } from "../../types/electron";

interface PasteToolsInfoProps {
  pasteToolsInfo: PasteToolsResult | null;
  isChecking: boolean;
  onCheck: () => void;
  onInstallUdevRule?: () => Promise<{ success: boolean; needsLogout?: boolean; error?: string } | null>;
}

export default function PasteToolsInfo({
  pasteToolsInfo,
  isChecking,
  onCheck,
  onInstallUdevRule,
}: PasteToolsInfoProps) {
  const { t } = useTranslation();
  const [udevInstalling, setUdevInstalling] = useState(false);
  const [udevResult, setUdevResult] = useState<{ success: boolean; error?: string } | null>(null);
  if (!pasteToolsInfo) {
    return (
      <div className="border border-border rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Terminal className="w-6 h-6 text-primary" />
            <div>
              <h3 className="font-semibold text-foreground">{t("pasteToolsInfo.title")}</h3>
              <p className="text-sm text-muted-foreground">{t("pasteToolsInfo.checking")}</p>
            </div>
          </div>
          {isChecking && (
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
          )}
        </div>
      </div>
    );
  }

  // Windows - always ready
  if (pasteToolsInfo.platform === "win32") {
    return (
      <InfoBox variant="success">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Terminal className="w-6 h-6 text-success dark:text-success" />
            <div>
              <h3 className="font-semibold text-success dark:text-success">
                {t("pasteToolsInfo.readyTitle")}
              </h3>
              <p className="text-sm text-success dark:text-success">
                {t("pasteToolsInfo.windowsReady")}
              </p>
            </div>
          </div>
          <div className="text-success dark:text-success">
            <Check className="w-5 h-5" />
          </div>
        </div>
      </InfoBox>
    );
  }

  const showUdevSection =
    pasteToolsInfo.platform === "linux" &&
    pasteToolsInfo.isWayland &&
    pasteToolsInfo.isPortableInstall &&
    pasteToolsInfo.hasPkexec &&
    !!onInstallUdevRule;

  const udevAlreadyInstalled = !!pasteToolsInfo.hasUinput;

  const handleInstallUdev = async () => {
    if (!onInstallUdevRule) return;
    setUdevInstalling(true);
    setUdevResult(null);
    const result = await onInstallUdevRule();
    setUdevResult(result ?? { success: false, error: "No response" });
    setUdevInstalling(false);
  };

  const udevSection = showUdevSection ? (
    <InfoBox variant={udevAlreadyInstalled ? "success" : "warning"} className="space-y-2">
      <div className="flex items-start gap-3">
        <Shield className={`w-5 h-5 flex-shrink-0 mt-0.5 ${udevAlreadyInstalled ? "text-success dark:text-success" : "text-warning dark:text-warning"}`} />
        <div className="flex-1">
          <h3 className={`font-semibold text-sm ${udevAlreadyInstalled ? "text-success dark:text-success" : "text-warning dark:text-warning"}`}>
            {t("pasteToolsInfo.udevInstallTitle")}
          </h3>
          <p className={`text-xs mt-1 ${udevAlreadyInstalled ? "text-success dark:text-success" : "text-warning dark:text-warning"}`}>
            {udevAlreadyInstalled
              ? t("pasteToolsInfo.udevAlreadyInstalled")
              : t("pasteToolsInfo.udevInstallDescription")}
          </p>
          {udevResult?.success && (
            <p className="text-xs text-success dark:text-success mt-2 font-medium">
              {t("pasteToolsInfo.udevSuccess")}
            </p>
          )}
          {udevResult && !udevResult.success && (
            <p className="text-xs text-destructive mt-2">
              {t("pasteToolsInfo.udevError", { error: udevResult.error })}
            </p>
          )}
        </div>
      </div>
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={handleInstallUdev} disabled={udevAlreadyInstalled || udevInstalling || udevResult?.success}>
          {udevInstalling ? t("pasteToolsInfo.udevInstalling") : udevAlreadyInstalled ? t("pasteToolsInfo.udevInstallButton") : t("pasteToolsInfo.udevInstallButton")}
        </Button>
      </div>
    </InfoBox>
  ) : null;

  // Linux with tools available
  if (pasteToolsInfo.platform === "linux" && pasteToolsInfo.available) {
    const method = pasteToolsInfo.method || "xdotool";
    const methodLabel = method === "xtest" ? "built-in (XTest)" : method;
    const methodSuffix =
      pasteToolsInfo.isWayland && method === "xdotool"
        ? t("pasteToolsInfo.xwaylandAppsOnly")
        : t("pasteToolsInfo.methodReady");

    return (
      <>
        <InfoBox variant="success">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Terminal className="w-6 h-6 text-success dark:text-success" />
              <div>
                <h3 className="font-semibold text-success dark:text-success">
                  {t("pasteToolsInfo.readyTitle")}
                </h3>
                <p className="text-sm text-success dark:text-success">
                  {t("pasteToolsInfo.usingMethodPrefix")}{" "}
                  <code className="bg-success/20 px-1 rounded">{methodLabel}</code> {methodSuffix}
                </p>
              </div>
            </div>
            <div className="text-success dark:text-success">
              <Check className="w-5 h-5" />
            </div>
          </div>
        </InfoBox>
        {udevSection}
      </>
    );
  }

  // Linux without tools - show helpful install instructions
  if (pasteToolsInfo.platform === "linux" && !pasteToolsInfo.available) {
    const isWayland = pasteToolsInfo.isWayland;
    const recommendedTool = pasteToolsInfo.recommendedInstall;
    const showInstall = !!recommendedTool;

    return (
    <>
      <InfoBox variant="warning" className="space-y-3">
        <div className="flex items-start gap-3">
          <Info className="w-6 h-6 text-warning dark:text-warning flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-semibold text-warning dark:text-warning">
              {showInstall
                ? t("pasteToolsInfo.optionalEnableTitle")
                : t("pasteToolsInfo.waylandClipboardTitle")}
            </h3>

            {showInstall ? (
              <>
                <p className="text-sm text-warning dark:text-warning mt-1">
                  {t("pasteToolsInfo.installPrefix")}{" "}
                  <code className="bg-warning/20 px-1 rounded font-mono">{recommendedTool}</code>:
                </p>

                <div className="mt-3 bg-card border border-border p-3 rounded-md font-mono text-xs overflow-x-auto">
                  {recommendedTool === "wtype" ? (
                    <>
                      <div className="text-muted-foreground">
                        {t("pasteToolsInfo.installCommands.fedoraRhel")}
                      </div>
                      <div className="text-foreground">sudo dnf install wtype</div>
                      <div className="text-muted-foreground mt-2">
                        {t("pasteToolsInfo.installCommands.debianUbuntu")}
                      </div>
                      <div className="text-foreground">sudo apt install wtype</div>
                      <div className="text-muted-foreground mt-2">
                        {t("pasteToolsInfo.installCommands.archLinux")}
                      </div>
                      <div className="text-foreground">sudo pacman -S wtype</div>
                    </>
                  ) : (
                    <>
                      <div className="text-muted-foreground">
                        {t("pasteToolsInfo.installCommands.debianUbuntuMint")}
                      </div>
                      <div className="text-foreground">sudo apt install xdotool</div>
                      <div className="text-muted-foreground mt-2">
                        {t("pasteToolsInfo.installCommands.fedoraRhel")}
                      </div>
                      <div className="text-foreground">sudo dnf install xdotool</div>
                      <div className="text-muted-foreground mt-2">
                        {t("pasteToolsInfo.installCommands.archLinux")}
                      </div>
                      <div className="text-foreground">sudo pacman -S xdotool</div>
                    </>
                  )}
                </div>

                {isWayland && recommendedTool === "wtype" && (
                  <p className="text-sm text-warning dark:text-warning mt-3">
                    {t("pasteToolsInfo.noteXwaylandAlso")}
                  </p>
                )}

                {isWayland && recommendedTool === "xdotool" && (
                  <p className="text-sm text-warning dark:text-warning mt-3">
                    {t("pasteToolsInfo.noteXwaylandOnly")}
                  </p>
                )}
              </>
            ) : (
              <p className="text-sm text-warning dark:text-warning mt-1">
                {t("pasteToolsInfo.waylandClipboardDescription")}{" "}
                <kbd className="bg-warning/20 px-1 rounded text-xs">Ctrl+V</kbd>.
              </p>
            )}

            {showInstall && (
              <p className="text-sm text-warning dark:text-warning mt-3">
                {t("pasteToolsInfo.withoutToolPrefix")}{" "}
                <kbd className="bg-warning/20 px-1 rounded text-xs">Ctrl+V</kbd>.
              </p>
            )}
          </div>
        </div>

        <div className="flex justify-end">
          <Button variant="outline" size="sm" onClick={onCheck} disabled={isChecking}>
            {isChecking ? t("pasteToolsInfo.recheckChecking") : t("pasteToolsInfo.recheck")}
          </Button>
        </div>
      </InfoBox>
      {udevSection}
    </>
    );
  }

  // Fallback for macOS (shouldn't normally render this component on macOS)
  return null;
}
