import { useState } from "react";
import { NOTIFICATION_CATEGORIES } from "../../attentionNotificationPolicy";
import { useEnvironments } from "../../state/environments";
import { Switch } from "../ui/switch";
import { Input } from "../ui/input";

import {
  hasDesktopNotifications,
  hasNotificationSound,
  NOTIFICATION_MODE_LABELS,
  unlockNotificationAudio,
  notificationPermissionIssue,
  useNotificationDeliveryStatus,
} from "../../threadNotifications";
import { Select, SelectItem, SelectPopup, SelectTrigger, SelectValue } from "../ui/select";
import { SettingsRow } from "./settingsLayout";
import { searchableSetting } from "./settingsSearch";
import { useScopedSettings, useUpdateScopedSettings } from "./useScopedSettings";

export function NotificationSettings() {
  const mode = useScopedSettings((settings) => settings.notificationMode);
  const categories = useScopedSettings((settings) => settings.notificationCategories);
  const muted = useScopedSettings((settings) => settings.notificationMutedEnvironments);
  const quiet = useScopedSettings((settings) => settings.notificationQuietHours);
  const deliveryIssue = useNotificationDeliveryStatus((state) => state.issue);
  const { environments } = useEnvironments();
  const updateSettings = useUpdateScopedSettings();
  const [permissionMessage, setPermissionMessage] = useState<string | null>(null);
  const [requesting, setRequesting] = useState(false);
  const [timeIssue, setTimeIssue] = useState<string | null>(null);

  return (
    <>
      <SettingsRow
        {...searchableSetting("thread-notifications")}
        description={
          permissionMessage ??
          deliveryIssue ??
          (hasDesktopNotifications(mode) ? notificationPermissionIssue() : null) ??
          "Applies only to this client while T3 Code is open. System alerts contain static category text, never thread titles. The active focused thread is silent; other focused threads may toast or play sound."
        }
        control={
          <Select
            value={mode}
            disabled={requesting}
            onValueChange={async (value) => {
              if (
                value !== "off" &&
                value !== "notifications" &&
                value !== "sound" &&
                value !== "notifications-and-sound"
              )
                return;
              setPermissionMessage(null);
              if (hasNotificationSound(value)) unlockNotificationAudio();
              if (hasDesktopNotifications(value)) {
                if (typeof Notification === "undefined" || !window.isSecureContext) {
                  setPermissionMessage(
                    "Notifications need a supported browser over HTTPS, or the desktop app. Sound only is still available.",
                  );
                  return;
                }
                setRequesting(true);
                try {
                  const permission = await Notification.requestPermission();
                  if (permission !== "granted") {
                    setPermissionMessage(
                      "Allow notifications in your browser or system settings, then choose this option again. Sound only is still available.",
                    );
                    return;
                  }
                } catch {
                  setPermissionMessage(
                    "Notifications are unavailable in this browser. Sound only is still available.",
                  );
                  return;
                } finally {
                  setRequesting(false);
                }
              }
              updateSettings({ notificationMode: value });
              useNotificationDeliveryStatus.setState({ issue: null });
            }}
          >
            <SelectTrigger size="sm" className="w-full sm:w-56" aria-label="Thread notifications">
              <SelectValue>{NOTIFICATION_MODE_LABELS[mode]}</SelectValue>
            </SelectTrigger>
            <SelectPopup align="end" alignItemWithTrigger={false}>
              {Object.entries(NOTIFICATION_MODE_LABELS).map(([value, label]) => (
                <SelectItem key={value} hideIndicator value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectPopup>
          </Select>
        }
      />
      <SettingsRow
        {...searchableSetting("notification-categories")}
        description="Choose which events may use your enabled channels. Completion is optional awareness, not open attention. These choices also apply to in-app toasts."
        control={
          <div className="flex flex-col gap-2" role="group" aria-label="Notification categories">
            {Object.entries(NOTIFICATION_CATEGORIES).map(([category, label]) => {
              const value = category as keyof typeof NOTIFICATION_CATEGORIES;
              return (
                <div key={value} className="flex items-center justify-between gap-4 text-sm">
                  {label}
                  <Switch
                    aria-label={`Notify: ${label}`}
                    checked={categories.includes(value)}
                    aria-checked={categories.includes(value)}
                    onCheckedChange={(checked) =>
                      updateSettings({
                        notificationCategories: checked
                          ? [...categories, value]
                          : categories.filter((entry) => entry !== value),
                      })
                    }
                  />
                </div>
              );
            })}
          </div>
        }
      />
      <SettingsRow
        {...searchableSetting("notification-environment-mutes")}
        description="Mute all notification channels for an environment on this client. Muting never resolves or hides attention in the inbox."
        control={
          <div
            className="flex max-h-56 flex-col gap-2 overflow-auto"
            role="group"
            aria-label="Muted notification environments"
          >
            {environments.map((environment) => (
              <div
                key={environment.environmentId}
                className="flex items-center justify-between gap-4 text-sm"
              >
                {environment.label}
                <Switch
                  aria-label={`Mute notifications: ${environment.label}`}
                  checked={muted.includes(environment.environmentId)}
                  aria-checked={muted.includes(environment.environmentId)}
                  onCheckedChange={(checked) =>
                    updateSettings({
                      notificationMutedEnvironments: checked
                        ? [...muted, environment.environmentId]
                        : muted.filter((id) => id !== environment.environmentId),
                    })
                  }
                />
              </div>
            ))}
            {muted
              .filter((id) => !environments.some((environment) => environment.environmentId === id))
              .map((id) => (
                <div key={id} className="flex items-center justify-between gap-4 text-sm">
                  Unavailable environment {id}
                  <Switch
                    aria-label={`Mute notifications: ${id}`}
                    checked
                    aria-checked
                    onCheckedChange={() =>
                      updateSettings({
                        notificationMutedEnvironments: muted.filter((entry) => entry !== id),
                      })
                    }
                  />
                </div>
              ))}
          </div>
        }
      />
      <SettingsRow
        {...searchableSetting("notification-quiet-hours")}
        description={
          timeIssue ??
          "Mute every channel on this client's local clock. Start is inclusive, end is exclusive; equal times mean all day. Suppressed events are not replayed later."
        }
        control={
          <div className="flex flex-wrap items-center gap-2">
            <Switch
              aria-label="Quiet hours"
              checked={quiet.enabled}
              aria-checked={quiet.enabled}
              onCheckedChange={(enabled) =>
                updateSettings({ notificationQuietHours: { ...quiet, enabled } })
              }
            />
            {(["start", "end"] as const).map((field) => (
              <label key={field} className="flex flex-col gap-1 text-xs">
                {field === "start" ? "From" : "Until"}
                <Input
                  type="time"
                  aria-label={`Quiet hours ${field}`}
                  value={quiet[field]}
                  disabled={!quiet.enabled}
                  onChange={(event) => {
                    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(event.target.value)) {
                      setTimeIssue("Choose a valid start and end time.");
                      return;
                    }
                    setTimeIssue(null);
                    updateSettings({
                      notificationQuietHours: { ...quiet, [field]: event.target.value },
                    });
                  }}
                />
              </label>
            ))}
          </div>
        }
      />
    </>
  );
}
