import { useAtomValue } from "@effect/atom-react";
import { useNavigate, useParams } from "@tanstack/react-router";
import type { EnvironmentId, ThreadId } from "@t3tools/contracts";
import type { EnvironmentAttentionState } from "@t3tools/client-runtime/state/attention";
import * as Option from "effect/Option";
import { useCallback, useEffect, useLayoutEffect, useRef } from "react";

import {
  canonicalNotificationCandidates,
  notificationAllowed,
  NOTIFICATION_CATEGORIES,
  takeNewNotifications,
  type AttentionNotification,
} from "../attentionNotificationPolicy";
import { getClientSettings, useClientSettings } from "../hooks/useSettings";
import { attentionWorkspace } from "../state/attention";
import { environmentShell } from "../state/shell";
import {
  hasDesktopNotifications,
  hasNotificationSound,
  notificationPermissionIssue,
  playNotificationSound,
  reportNotificationDeliveryFailure,
  setNotificationBadge,
  unlockNotificationAudio,
} from "../threadNotifications";
import { resolveSidebarThreadStatus } from "./Sidebar.logic";
import { toastManager } from "./ui/toast";

export function ThreadNotificationCoordinator() {
  const workspace = useAtomValue(attentionWorkspace.valueAtom);
  const settings = useClientSettings();
  const mode = settings.notificationMode;
  const policyKey = JSON.stringify([
    mode,
    settings.inAppNotificationsEnabled,
    settings.notificationCategories,
    settings.notificationMutedEnvironments,
    settings.notificationQuietHours,
  ]);
  const navigate = useNavigate();
  const active = useParams({ strict: false });
  const latest = useRef({ workspace, active });
  useLayoutEffect(() => {
    latest.current = { workspace, active };
  }, [workspace, active]);
  const pending = useRef(
    new Map<string, { alert: AttentionNotification; notification: Notification }>(),
  );
  const toasts = useRef(new Map<string, { alert: AttentionNotification; id: string }>());
  const reported = useRef(new Set<string>());
  const lastBadge = useRef<number | null>(null);
  const updateBadge = useCallback((count: number) => {
    if (lastBadge.current === count) return;
    lastBadge.current = count;
    setNotificationBadge(count);
  }, []);
  const report = useCallback((message: string, error?: unknown) => {
    reportNotificationDeliveryFailure(message, error);
    if (reported.current.has(message)) return;
    reported.current.add(message);
    toastManager.add({
      type: "warning",
      title: "Notification delivery unavailable",
      description: message,
    });
  }, []);

  const open = useCallback(
    async function openDestination(alert: AttentionNotification): Promise<void> {
      window.focus();
      const environment = latest.current.workspace.environments.get(alert.ref.environmentId);
      try {
        if (!environment || environment.status === "unauthorized") {
          toastManager.add({
            type: "warning",
            title: "Notification destination unavailable",
            description:
              "This environment is no longer connected or authorized. Review Connections in Settings.",
          });
          await navigate({ to: "/attention" });
          return;
        }
        if (environment.status !== "live" && environment.status !== "unsupported") {
          const id = toastManager.add({
            type: "warning",
            title: "Environment disconnected",
            description: "Reconnect before opening this thread; its last known state may be stale.",
            timeout: 0,
            actionProps: {
              children: "Retry open thread",
              onClick: () => {
                toastManager.close(id);
                void openDestination(alert);
              },
            },
          });
          return;
        }
        await navigate({ to: "/$environmentId/$threadId", params: alert.ref });
      } catch (error) {
        report("Could not open the notification destination.", error);
      }
    },
    [navigate, report],
  );

  const deliver = useCallback(
    (alert: AttentionNotification) => {
      const current = getClientSettings();
      if (!notificationAllowed(current, alert, new Date())) return;
      const focused = document.visibilityState === "visible" && document.hasFocus();
      if (
        focused &&
        latest.current.active.environmentId === alert.ref.environmentId &&
        latest.current.active.threadId === alert.ref.threadId
      )
        return;
      const title = NOTIFICATION_CATEGORIES[alert.category];
      const description = "Open the owning thread in T3 Code to review its current state.";
      const tag = `${alert.ref.environmentId}:${alert.ref.threadId}`;
      if (hasNotificationSound(current.notificationMode)) {
        void playNotificationSound(alert.category === "completion" ? "completion" : "input", () => {
          const now = getClientSettings();
          const state = latest.current.workspace.environments.get(alert.ref.environmentId);
          const focusedNow = document.visibilityState === "visible" && document.hasFocus();
          return (
            !!state &&
            (state.status === "live" || state.status === "unsupported") &&
            hasNotificationSound(now.notificationMode) &&
            notificationAllowed(now, alert, new Date()) &&
            !(
              focusedNow &&
              latest.current.active.environmentId === alert.ref.environmentId &&
              latest.current.active.threadId === alert.ref.threadId
            )
          );
        });
      }
      if (focused && current.inAppNotificationsEnabled) {
        const previous = toasts.current.get(tag);
        if (previous) toastManager.close(previous.id);
        const id = toastManager.add({
          type:
            alert.category === "completion"
              ? "success"
              : alert.category === "failure"
                ? "error"
                : "warning",
          title,
          description,
          data: { hideCopyButton: true },
          actionProps: {
            children: "Open thread",
            onClick: () => {
              toastManager.close(id);
              toasts.current.delete(tag);
              void open(alert);
            },
          },
          onClose: () => {
            if (toasts.current.get(tag)?.id === id) toasts.current.delete(tag);
          },
        });
        toasts.current.set(tag, { alert, id });
        return;
      }
      if (focused || !hasDesktopNotifications(current.notificationMode)) return;
      const issue = notificationPermissionIssue();
      if (issue) {
        report(issue);
        return;
      }
      try {
        const notification = new Notification(title, { body: description, tag, silent: true });
        pending.current.get(tag)?.notification.close();
        pending.current.set(tag, { alert, notification });
        updateBadge(pending.current.size);
        notification.addEventListener("click", () => {
          notification.close();
          void open(alert);
        });
        notification.addEventListener("error", () => {
          if (pending.current.get(tag)?.notification === notification) {
            pending.current.delete(tag);
            updateBadge(pending.current.size);
          }
          notification.close();
          report("The browser or operating system could not present a notification.");
        });
      } catch (error) {
        report("The browser or operating system rejected notification delivery.", error);
      }
    },
    [open, report, updateBadge],
  );

  useEffect(() => {
    const accessible = (alert: AttentionNotification) => {
      const state = workspace.environments.get(alert.ref.environmentId);
      return (
        state !== undefined &&
        state.status !== "unauthorized" &&
        notificationAllowed(settings, alert, new Date())
      );
    };
    for (const [tag, { alert, notification }] of pending.current) {
      if (hasDesktopNotifications(mode) && accessible(alert)) continue;
      notification.close();
      pending.current.delete(tag);
    }
    for (const [tag, { alert, id }] of toasts.current) {
      if (settings.inAppNotificationsEnabled && accessible(alert)) continue;
      toastManager.close(id);
      toasts.current.delete(tag);
    }
    updateBadge(pending.current.size);
  }, [settings, mode, workspace, updateBadge]);

  useEffect(() => {
    const clear = () => {
      for (const { notification } of pending.current.values()) notification.close();
      pending.current.clear();
      updateBadge(0);
    };
    clear();
    if (!hasDesktopNotifications(mode)) return;
    const unsubscribe = window.desktopBridge?.onNotificationBadgeClear?.(clear);
    window.addEventListener("focus", clear);
    return () => {
      unsubscribe?.();
      window.removeEventListener("focus", clear);
      clear();
    };
  }, [mode, updateBadge]);
  useEffect(() => {
    if (!hasNotificationSound(mode)) return;
    document.addEventListener("pointerdown", unlockNotificationAudio);
    document.addEventListener("keydown", unlockNotificationAudio);
    return () => {
      document.removeEventListener("pointerdown", unlockNotificationAudio);
      document.removeEventListener("keydown", unlockNotificationAudio);
    };
  }, [mode]);
  useEffect(
    () => () => {
      for (const { id } of toasts.current.values()) toastManager.close(id);
      toasts.current.clear();
    },
    [],
  );

  return [...workspace.environments].map(([environmentId, attention]) => (
    <EnvironmentNotifications
      key={environmentId}
      environmentId={environmentId}
      attention={attention}
      deliver={deliver}
      policyKey={policyKey}
    />
  ));
}

function EnvironmentNotifications({
  environmentId,
  attention,
  deliver,
  policyKey,
}: {
  environmentId: EnvironmentId;
  attention: EnvironmentAttentionState;
  deliver: (alert: AttentionNotification) => void;
  policyKey: string;
}) {
  const shell = useAtomValue(environmentShell.stateValueAtom(environmentId));
  const observed = useRef(new Map<string, number | string>());
  const previousPolicy = useRef(policyKey);
  const previous = useRef(
    new Map<ThreadId, { attention: string | null; completion: number | null }>(),
  );
  useEffect(() => {
    const policyChanged = previousPolicy.current !== policyKey;
    previousPolicy.current = policyKey;
    if (attention.status !== "unsupported") {
      previous.current.clear();
      const result = takeNewNotifications(
        observed.current,
        canonicalNotificationCandidates(environmentId, attention),
      );
      observed.current = result.observed;
      if (!policyChanged) for (const alert of result.alerts) deliver(alert);
      return;
    }
    observed.current.clear();
    if (shell.status !== "live" || Option.isNone(shell.snapshot)) {
      previous.current.clear();
      return;
    }
    const next = new Map<ThreadId, { attention: string | null; completion: number | null }>();
    for (const thread of shell.snapshot.value.threads) {
      let status = resolveSidebarThreadStatus(thread);
      if (status === "ready" && thread.latestTurn?.state === "error") status = "failed";
      const prior = previous.current.get(thread.id);
      const attention =
        status === "input" || status === "approval" || status === "failed"
          ? `${thread.latestTurn?.turnId ?? ""}:${status}`
          : null;
      const completedAt = Date.parse(thread.latestTurn?.completedAt ?? "");
      const completion =
        status === "ready" &&
        thread.latestTurn?.state === "completed" &&
        Number.isFinite(completedAt)
          ? completedAt
          : (prior?.completion ?? null);
      next.set(thread.id, { attention, completion });
      if (!prior || thread.archivedAt !== null) continue;
      const category =
        attention && attention !== prior.attention
          ? status === "approval"
            ? "approval"
            : status === "failed"
              ? "failure"
              : "user_input"
          : completion !== null && (prior.completion === null || completion > prior.completion)
            ? "completion"
            : null;
      if (category && !policyChanged)
        deliver({
          key: `${environmentId}:${thread.id}:${category}`,
          revision: attention ?? completion ?? 0,
          category,
          ref: { environmentId, threadId: thread.id },
        });
    }
    previous.current = next;
  }, [attention, deliver, environmentId, policyKey, shell]);
  return null;
}
