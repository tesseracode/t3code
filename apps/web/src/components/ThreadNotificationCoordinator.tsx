import {
  type EnvironmentThreadShell,
  type PendingSubagentRequest,
  presentThreadShell,
} from "@t3tools/client-runtime/state/models";
import { isShownUnderParent } from "@t3tools/client-runtime/state/threads";
import type { AnyRouter } from "@tanstack/react-router";
import type { EnvironmentId, OrchestrationV2ThreadShell, ThreadId } from "@t3tools/contracts";
import type { ClientSettings } from "@t3tools/contracts/settings";
import * as Option from "effect/Option";
import type { AtomRegistry } from "effect/reactivity";
import {
  canonicalNotificationCandidates,
  notificationAllowed,
  NOTIFICATION_CATEGORIES,
  takeNewNotifications,
  type AttentionNotification,
} from "../attentionNotificationPolicy";
import { getClientSettings, subscribeClientSettings } from "../hooks/useSettings";
import { isWindowsPlatform } from "../lib/utils";
import { attentionWorkspace } from "../state/attention";
import { environmentSummaries } from "../state/presentation";
import { environmentShell } from "../state/shell";
import { environmentThreadShells } from "../state/threads";
import {
  hasDesktopNotifications,
  hasNotificationSound,
  notificationPermissionIssue,
  playNotificationSound,
  reportNotificationDeliveryFailure,
  setNotificationBadge,
  threadNotificationTag,
  unlockNotificationAudio,
} from "../threadNotifications";
import { resolveSidebarThreadStatus, type SidebarThreadStatus } from "./Sidebar.logic";
import {
  createThreadNotificationGate,
  type ThreadNotificationKind,
  type ThreadNotificationObservation,
} from "./ThreadNotificationCoordinator.logic";
import { toastManager } from "./ui/toast";

interface NotificationState extends ThreadNotificationObservation {
  readonly raw: OrchestrationV2ThreadShell;
  readonly subagentRequest: PendingSubagentRequest | null;
  readonly thread: EnvironmentThreadShell;
  readonly status: SidebarThreadStatus;
}

interface WatchedEnvironment {
  unsubscribe: () => void;
  previous: Map<ThreadId, NotificationState>;
  readonly gate: ReturnType<typeof createThreadNotificationGate<ThreadId>>;
  observed: Map<string, string | number>;
  readonly completions: Map<ThreadId, AttentionNotification>;
  readonly completionReady: Map<ThreadId, string>;
  readonly failures: Map<ThreadId, { turnId: string; limited: boolean; canonical: boolean }>;
}

/**
 * Turns thread status transitions in every connected environment into sounds, in-app toasts,
 * and desktop notifications, and keeps the dock badge in step with the unread ones.
 */
export function startThreadNotifications(
  registry: AtomRegistry.AtomRegistry,
  router: AnyRouter,
): () => void {
  const pending = new Map<string, { alert: AttentionNotification; notification: Notification }>();
  const toasts = new Map<string, { alert: AttentionNotification; id: string }>();
  const watched = new Map<EnvironmentId, WatchedEnvironment>();
  let lastBadge: number | null = null;
  const updateBadge = () => {
    if (lastBadge === pending.size) return;
    lastBadge = pending.size;
    setNotificationBadge(pending.size);
  };

  const trackNotification = (alert: AttentionNotification, notification: Notification) => {
    pending.get(notification.tag)?.notification.close();
    pending.set(notification.tag, { alert, notification });
    updateBadge();
  };
  const clearPending = () => {
    for (const { notification } of pending.values()) notification.close();
    pending.clear();
    updateBadge();
  };

  const openDestination = async (alert: AttentionNotification): Promise<void> => {
    window.focus();
    try {
      if (window.desktopBridge?.revealWindow) {
        await window.desktopBridge
          .revealWindow()
          .catch((error) =>
            reportNotificationDeliveryFailure("Could not reveal the notification window.", error),
          );
      }
      const environment = registry
        .get(attentionWorkspace.valueAtom)
        .environments.get(alert.ref.environmentId);
      if (
        !watched.has(alert.ref.environmentId) ||
        !environment ||
        environment.status === "unauthorized"
      ) {
        toastManager.add({
          type: "warning",
          title: "Notification destination unavailable",
          description:
            "This environment is no longer connected or authorized. Review Connections in Settings.",
        });
        await router.navigate({ to: "/attention" });
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
      await router.navigate({ to: "/$environmentId/$threadId", params: alert.ref });
    } catch (error) {
      reportNotificationDeliveryFailure("Could not open the notification destination.", error);
    }
  };

  const activeThreadFocused = (alert: AttentionNotification) => {
    const active = (router.state.matches.at(-1)?.params ?? {}) as {
      environmentId?: string;
      threadId?: string;
    };
    return (
      document.visibilityState === "visible" &&
      document.hasFocus() &&
      active.environmentId === alert.ref.environmentId &&
      active.threadId === alert.ref.threadId
    );
  };

  const deliver = (
    alert: AttentionNotification,
    title = NOTIFICATION_CATEGORIES[alert.category],
  ) => {
    const settings = getClientSettings();
    if (!notificationAllowed(settings, alert, new Date()) || activeThreadFocused(alert)) return;
    const { notificationMode: mode, inAppNotificationsEnabled } = settings;
    const kind = alert.category === "completion" ? "completion" : "input";
    const description = "Open the owning thread in T3 Code to review its current state.";
    const tag = threadNotificationTag(alert.ref.environmentId, alert.ref.threadId);
    if (hasNotificationSound(mode)) {
      void playNotificationSound(kind, () => {
        const current = getClientSettings();
        const state = registry
          .get(attentionWorkspace.valueAtom)
          .environments.get(alert.ref.environmentId);
        return (
          !!state &&
          (state.status === "live" || state.status === "unsupported") &&
          hasNotificationSound(current.notificationMode) &&
          notificationAllowed(current, alert, new Date()) &&
          !activeThreadFocused(alert)
        );
      });
    }
    if (
      inAppNotificationsEnabled &&
      document.visibilityState === "visible" &&
      document.hasFocus()
    ) {
      const previous = toasts.get(tag);
      if (previous) toastManager.close(previous.id);
      const toastId = toastManager.add({
        type:
          kind === "completion" ? "success" : alert.category === "failure" ? "error" : "warning",
        title,
        description,
        data: { hideCopyButton: true },
        actionProps: {
          children: "Open thread",
          onClick: () => {
            toastManager.close(toastId);
            toasts.delete(tag);
            void openDestination(alert);
          },
        },
        onClose: () => {
          if (toasts.get(tag)?.id === toastId) toasts.delete(tag);
        },
      });
      toasts.set(tag, { alert, id: toastId });
      return;
    }
    if (
      !hasDesktopNotifications(mode) ||
      (document.visibilityState === "visible" && document.hasFocus())
    )
      return;
    const issue = notificationPermissionIssue();
    if (issue) {
      reportNotificationDeliveryFailure(issue);
      return;
    }
    try {
      const notification = new Notification(title, {
        body: description,
        tag,
        silent: true,
        // Windows drops clicks after a toast moves into Notification Center.
        requireInteraction: kind === "completion" && isWindowsPlatform(navigator.platform),
      });
      trackNotification(alert, notification);
      notification.addEventListener("click", () => {
        notification.close();
        void openDestination(alert);
      });
      notification.addEventListener("error", () => {
        if (pending.get(tag)?.notification === notification) {
          pending.delete(tag);
          updateBadge();
        }
        notification.close();
        reportNotificationDeliveryFailure(
          "The browser or operating system could not present a notification.",
        );
      });
    } catch (error) {
      reportNotificationDeliveryFailure(
        "The browser or operating system rejected notification delivery.",
        error,
      );
    }
  };

  const newFailureEpisode = (
    entry: WatchedEnvironment,
    alert: AttentionNotification,
    source: "limited" | "canonical",
  ) => {
    if (!alert.turnId) return true;
    const previous = entry.failures.get(alert.ref.threadId);
    const same = previous?.turnId === alert.turnId;
    const suppress =
      same &&
      (source === "limited"
        ? previous.limited || previous.canonical
        : previous.limited && !previous.canonical);
    entry.failures.set(alert.ref.threadId, {
      turnId: alert.turnId,
      limited: source === "limited" || (same && previous.limited),
      canonical: source === "canonical" || (same && previous.canonical),
    });
    return !suppress;
  };

  const present = (
    environmentId: EnvironmentId,
    entry: WatchedEnvironment,
    state: NotificationState,
    kind: ThreadNotificationKind,
  ) => {
    const attention = registry.get(attentionWorkspace.valueAtom).environments.get(environmentId);
    if (attention?.status !== "unsupported") {
      if (kind === "completion") {
        const runId = state.thread.latestRun?.runId;
        if (!runId) return;
        entry.completionReady.set(state.thread.id, runId);
        const alert = entry.completions.get(state.thread.id);
        if (alert?.revision === runId) {
          entry.completions.delete(state.thread.id);
          deliver(alert);
        }
        return;
      }
      if (
        attention?.status !== "live" ||
        (state.status !== "limited" && state.status !== "request")
      )
        return;
    }
    const category =
      kind === "completion"
        ? "completion"
        : state.status === "approval"
          ? "approval"
          : state.status === "failed" || state.status === "limited"
            ? "failure"
            : "user_input";
    const alert: AttentionNotification = {
      key: `${environmentId}:${state.thread.id}:${category}`,
      revision: state.attention ?? state.completedAt ?? 0,
      category,
      ref: { environmentId, threadId: state.thread.id },
      turnId: state.thread.latestRun?.runId ?? null,
    };
    if (state.status === "limited" && !newFailureEpisode(entry, alert, "limited")) return;
    deliver(
      alert,
      state.status === "limited"
        ? "Usage limit reached"
        : state.status === "request"
          ? "Guest request"
          : NOTIFICATION_CATEGORIES[category],
    );
  };

  const observeThreads = (
    environmentId: EnvironmentId,
    entry: WatchedEnvironment,
    threads: ReadonlyArray<OrchestrationV2ThreadShell>,
  ) => {
    const previous = entry.previous;
    const next = new Map<ThreadId, NotificationState>();
    // A parent here also hears of what its tasks on linked environments ask.
    const subagentRequests = registry.get(
      environmentThreadShells.pendingSubagentRequestsAtom(environmentId),
    );
    const delegatedUnderParent = registry.get(environmentThreadShells.delegatedUnderParentAtom);
    const changed: Array<[NotificationState | undefined, NotificationState]> = [];
    for (const rawThread of threads) {
      if (
        isShownUnderParent(
          { environmentId, threadId: rawThread.id },
          rawThread.lineage,
          delegatedUnderParent,
        )
      ) {
        continue;
      }
      const prior = previous.get(rawThread.id);
      const subagentRequest = subagentRequests.get(rawThread.id) ?? null;
      if (prior?.raw === rawThread && prior.subagentRequest === subagentRequest) {
        next.set(rawThread.id, prior);
        continue;
      }
      const thread = presentThreadShell(environmentId, rawThread, subagentRequest);
      let status = resolveSidebarThreadStatus(thread);
      if (status === "ready" && thread.latestRun?.status === "failed") status = "failed";
      const attention =
        status === "input" ||
        status === "request" ||
        status === "approval" ||
        status === "failed" ||
        status === "limited"
          ? `${thread.latestRun?.runId ?? ""}:${status}`
          : null;
      const completedAt = Date.parse(thread.latestRun?.completedAt ?? "");
      const settled = status === "ready" && thread.latestRun?.status === "completed";
      const state = {
        raw: rawThread,
        subagentRequest,
        thread,
        status,
        attention,
        settled,
        completedAt: settled && Number.isFinite(completedAt) ? completedAt : null,
      };
      next.set(thread.id, state);
      changed.push([prior, state]);
    }
    entry.previous = next;
    for (const threadId of entry.completionReady.keys()) {
      if (!next.get(threadId)?.settled) entry.completionReady.delete(threadId);
    }
    for (const threadId of entry.completions.keys()) {
      if (!next.has(threadId)) entry.completions.delete(threadId);
    }
    for (const threadId of entry.failures.keys()) {
      if (!next.has(threadId)) entry.failures.delete(threadId);
    }
    entry.gate.retain(new Set(next.keys()));
    for (const [prior, state] of changed) {
      entry.gate.observe(state.thread.id, prior, state, {
        archived: state.thread.archivedAt !== null,
        quiet: state.raw.latestRunStopRequested === true,
      });
    }
  };

  const watchEnvironment = (environmentId: EnvironmentId): WatchedEnvironment => {
    const entry: WatchedEnvironment = {
      previous: new Map(),
      observed: new Map(),
      completions: new Map(),
      completionReady: new Map(),
      failures: new Map(),
      unsubscribe: () => {},
      gate: createThreadNotificationGate<ThreadId>((threadId, kind) => {
        const state = entry.previous.get(threadId);
        if (state) present(environmentId, entry, state, kind);
      }),
    };
    let threads: ReadonlyArray<OrchestrationV2ThreadShell> | null = null;
    const unsubscribeShell = registry.subscribe(
      environmentShell.stateValueAtom(environmentId),
      (shell) => {
        threads =
          shell.status === "live" && Option.isSome(shell.snapshot)
            ? shell.snapshot.value.threads
            : null;
        if (threads !== null) {
          observeThreads(environmentId, entry, threads);
          return;
        }
        entry.gate.clear();
        entry.previous = new Map();
        entry.completions.clear();
        entry.completionReady.clear();
      },
      { immediate: true },
    );
    const reobserve = () => {
      if (threads !== null) observeThreads(environmentId, entry, threads);
    };
    const unsubscribeRequests = registry.subscribe(
      environmentThreadShells.pendingSubagentRequestsAtom(environmentId),
      reobserve,
    );
    const unsubscribeDelegated = registry.subscribe(
      environmentThreadShells.delegatedUnderParentAtom,
      reobserve,
    );
    entry.unsubscribe = () => {
      unsubscribeShell();
      unsubscribeRequests();
      unsubscribeDelegated();
      entry.gate.clear();
    };
    return entry;
  };

  const syncEnvironments = () => {
    const environmentIds = registry.get(environmentSummaries.environmentIdsAtom);
    const activeIds = new Set(environmentIds);
    for (const [environmentId, entry] of watched) {
      if (activeIds.has(environmentId)) continue;
      entry.unsubscribe();
      watched.delete(environmentId);
    }
    for (const environmentId of environmentIds) {
      if (!watched.has(environmentId)) watched.set(environmentId, watchEnvironment(environmentId));
    }
  };

  const pruneNotifications = () => {
    const settings = getClientSettings();
    const environments = registry.get(attentionWorkspace.valueAtom).environments;
    const accessible = (alert: AttentionNotification) => {
      const state = environments.get(alert.ref.environmentId);
      return (
        watched.has(alert.ref.environmentId) &&
        state !== undefined &&
        state.status !== "unauthorized" &&
        notificationAllowed(settings, alert, new Date())
      );
    };
    for (const [tag, entry] of pending) {
      if (hasDesktopNotifications(settings.notificationMode) && accessible(entry.alert)) continue;
      entry.notification.close();
      pending.delete(tag);
    }
    for (const [tag, entry] of toasts) {
      if (settings.inAppNotificationsEnabled && accessible(entry.alert)) continue;
      toastManager.close(entry.id);
      toasts.delete(tag);
    }
    updateBadge();
  };

  const observeCanonical = () => {
    const workspace = registry.get(attentionWorkspace.valueAtom);
    for (const [environmentId, entry] of watched) {
      const state = workspace.environments.get(environmentId);
      const candidates = state ? canonicalNotificationCandidates(environmentId, state) : [];
      const result = takeNewNotifications(entry.observed, candidates);
      entry.observed = result.observed;
      const completed = new Set(
        candidates
          .filter((alert) => alert.category === "completion")
          .map((alert) => alert.ref.threadId),
      );
      for (const threadId of entry.completions.keys()) {
        if (!completed.has(threadId)) entry.completions.delete(threadId);
      }
      for (const alert of result.alerts) {
        if (alert.category !== "completion") {
          if (alert.category === "failure" && !newFailureEpisode(entry, alert, "canonical"))
            continue;
          deliver(alert);
        } else if (entry.completionReady.get(alert.ref.threadId) === alert.revision) {
          deliver(alert);
        } else if (
          getClientSettings().notificationMode !== "off" ||
          getClientSettings().inAppNotificationsEnabled
        ) {
          entry.completions.set(alert.ref.threadId, alert);
        }
      }
    }
    pruneNotifications();
  };

  // Listeners that only exist for some notification modes, rebuilt when the mode changes.
  let appliedMode: ClientSettings["notificationMode"] | null = null;
  let stopModeListeners = () => {};
  const applyMode = () => {
    const nextMode = getClientSettings().notificationMode;
    if (nextMode === appliedMode) return;
    appliedMode = nextMode;
    stopModeListeners();
    clearPending();
    const stops: Array<() => void> = [];
    if (hasDesktopNotifications(nextMode)) {
      const unsubscribeBadgeClear = window.desktopBridge?.onNotificationBadgeClear(clearPending);
      window.addEventListener("focus", clearPending);
      stops.push(() => {
        unsubscribeBadgeClear?.();
        window.removeEventListener("focus", clearPending);
        clearPending();
      });
    }
    if (hasNotificationSound(nextMode)) {
      document.addEventListener("pointerdown", unlockNotificationAudio);
      document.addEventListener("keydown", unlockNotificationAudio);
      stops.push(() => {
        document.removeEventListener("pointerdown", unlockNotificationAudio);
        document.removeEventListener("keydown", unlockNotificationAudio);
      });
    }
    stopModeListeners = () => {
      for (const stop of stops) stop();
    };
  };

  let policyKey = "";
  const onSettings = () => {
    const settings = getClientSettings();
    const nextPolicyKey = JSON.stringify([
      settings.notificationMode,
      settings.inAppNotificationsEnabled,
      settings.notificationCategories,
      settings.notificationMutedEnvironments,
      settings.notificationQuietHours,
    ]);
    if (policyKey !== nextPolicyKey) {
      for (const entry of watched.values()) {
        entry.completions.clear();
        entry.gate.clear();
      }
      policyKey = nextPolicyKey;
    }
    applyMode();
    syncEnvironments();
    pruneNotifications();
  };
  const unsubscribeSettings = subscribeClientSettings(onSettings);
  const unsubscribeEnvironmentIds = registry.subscribe(
    environmentSummaries.environmentIdsAtom,
    () => {
      syncEnvironments();
      observeCanonical();
    },
  );
  onSettings();
  const unsubscribeAttention = registry.subscribe(attentionWorkspace.valueAtom, observeCanonical, {
    immediate: true,
  });

  return () => {
    unsubscribeSettings();
    unsubscribeEnvironmentIds();
    unsubscribeAttention();
    for (const entry of watched.values()) entry.unsubscribe();
    watched.clear();
    stopModeListeners();
    for (const { id } of toasts.values()) toastManager.close(id);
    toasts.clear();
  };
}
