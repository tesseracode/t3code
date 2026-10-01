import { useEffect, useState } from "react";
import type { TwsIntegrationState } from "@t3tools/contracts";
import type { EnvironmentPresentation } from "../../state/environments";
import { serverEnvironment } from "../../state/server";
import { twsEnvironment } from "../../state/tws";
import { useAtomCommand } from "../../state/use-atom-command";
import { useSettingsScope } from "./SettingsScopeContext";
import { SettingsRow, SettingsSection } from "./settingsLayout";
import { searchableSetting } from "./settingsSearch";
import { Switch } from "../ui/switch";
import { Button } from "../ui/button";

function TwsEnvironmentSetting({ environment }: { environment: EnvironmentPresentation }) {
  const save = useAtomCommand(serverEnvironment.updateSettings);
  const refresh = useAtomCommand(twsEnvironment.refresh, { reportFailure: false });
  const enabled = environment.serverConfig?.settings.twsIntegrationEnabled === true;
  const supported = environment.serverConfig?.environment.capabilities.twsContext === true;
  const connected = environment.connection.phase === "connected";
  const [pending, setPending] = useState(false);
  const [observation, setObservation] = useState<TwsIntegrationState | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (!enabled || !supported || !connected) return;
    let active = true;
    void refresh({ environmentId: environment.environmentId, input: {} }).then((result) => {
      if (!active) return;
      if (result._tag === "Success") {
        setObservation(result.value);
        setFailed(false);
      } else {
        setFailed(true);
      }
    });
    return () => {
      active = false;
    };
  }, [connected, enabled, environment.environmentId, refresh, supported]);
  return (
    <SettingsRow
      title={environment.label}
      description={
        !supported
          ? "Update this server to configure TWS."
          : !enabled
            ? "Disabled. T3 Code bypasses TWS and keeps any saved context inactive."
            : !connected
              ? "Environment disconnected; the last observation is stale."
              : failed || observation?.status === "unavailable"
                ? "TWS is unavailable. Install v1.2.14 on this environment; native Windows should use a WSL environment."
                : observation?.status === "degraded"
                  ? "Some TWS scopes are incomplete. Last-known context is retained without guessing associations."
                  : observation?.status === "ready"
                    ? `Last confirmed ${observation.observedAt}. TWS is not continuously watched.`
                    : "Waiting for a fresh TWS observation."
      }
      control={
        <div className="flex items-center gap-3">
          {enabled && supported && connected && (
            <Button
              size="sm"
              variant="outline"
              onClick={async () => {
                const result = await refresh({
                  environmentId: environment.environmentId,
                  input: {},
                });
                if (result._tag === "Success") {
                  setObservation(result.value);
                  setFailed(false);
                } else setFailed(true);
              }}
            >
              Refresh
            </Button>
          )}
          <Switch
            aria-label={`Enable TWS integration: ${environment.label}`}
            aria-checked={enabled}
            checked={enabled}
            disabled={pending || !connected || !supported}
            onCheckedChange={async (checked) => {
              setPending(true);
              setObservation(null);
              setFailed(false);
              try {
                await save({
                  environmentId: environment.environmentId,
                  input: { patch: { twsIntegrationEnabled: checked } },
                });
              } finally {
                setPending(false);
              }
            }}
          />
        </div>
      }
    />
  );
}

export function TwsIntegrationSettings() {
  const { environments } = useSettingsScope();
  return (
    <SettingsSection {...searchableSetting("tws-integration")}>
      <p className="text-sm text-muted-foreground">
        Optional, read-only Tesseraworkspaces integration. Enable separately on each environment.
        Disabling stops owned refresh work; it never changes checkouts, providers or TWS itself.
      </p>
      {environments.map((environment) => (
        <TwsEnvironmentSetting key={environment.environmentId} environment={environment} />
      ))}
      {environments.length === 0 && (
        <p className="text-sm text-muted-foreground">
          Connect an environment to configure this add-on.
        </p>
      )}
    </SettingsSection>
  );
}
