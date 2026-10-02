import { useAtomValue } from "@effect/atom-react";
import { LegendList, type LegendListRef } from "@legendapp/list/react";
import { useNavigate } from "@tanstack/react-router";
import type { ScopedAttentionItem } from "@t3tools/client-runtime/state/attention";
import type { EnvironmentId } from "@t3tools/contracts";
import { scopedProjectKey, scopeProjectRef } from "@t3tools/client-runtime/environment";
import { InboxIcon } from "lucide-react";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { environmentCatalog } from "../../connection/catalog";
import { isElectron } from "../../env";
import { cn } from "../../lib/utils";
import { attentionWorkspace } from "../../state/attention";
import { useProjects, useThreadShell } from "../../state/entities";
import { Button } from "../ui/button";
import { SidebarInset } from "../ui/sidebar";
import { toastManager } from "../ui/toast";
import { WorkspacePageHeader } from "../WorkspacePageHeader";
import { useAttentionSeen } from "./AttentionWorkspaceRetention";
import {
  ATTENTION_KINDS,
  ATTENTION_PRIORITIES,
  ATTENTION_STATUSES,
  EMPTY_ATTENTION_FILTERS,
  attentionKeyboardIndex,
  attentionThreadTarget,
  filterAttentionInbox,
  markAttentionSeen,
} from "./attentionInbox.logic";

function AttentionRowTitle({ row }: { row: ScopedAttentionItem }) {
  const shell = useThreadShell(row.ref);
  return <>{shell?.title ?? `Thread ${row.ref.threadId}`}</>;
}

export function AttentionInbox() {
  const workspace = useAtomValue(attentionWorkspace.valueAtom);
  const catalog = useAtomValue(environmentCatalog.catalogValueAtom);
  const projects = useProjects();
  const [filters, setFilters] = useState(EMPTY_ATTENTION_FILTERS);
  const [seen, setSeen] = useAttentionSeen();
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [mountedActiveId, setMountedActiveId] = useState<string | undefined>();
  const listRef = useRef<LegendListRef | null>(null);
  const listboxRef = useRef<HTMLDivElement | null>(null);
  const id = useId();
  const navigate = useNavigate();
  const all = useAtomValue(attentionWorkspace.aggregateAtom);
  const filtered = useMemo(() => filterAttentionInbox(all, filters), [all, filters]);
  const seenByKey = useMemo(
    () => new Map(seen.map((entry) => [entry.key, entry.revision])),
    [seen],
  );
  const activeIndex = Math.max(
    0,
    filtered.items.findIndex((row) => row.key === activeKey),
  );
  const active = filtered.items[activeIndex];
  const activeId = active ? `${id}-${active.key}` : undefined;
  const labels = useMemo(
    () =>
      new Map(
        projects.map((project) => [
          scopedProjectKey(scopeProjectRef(project.environmentId, project.id)),
          project.title,
        ]),
      ),
    [projects],
  );
  const environmentLabel = (environmentId: EnvironmentId) =>
    catalog.entries.get(environmentId)?.target.label ?? environmentId;
  const projectOptions = useMemo(
    () => [
      ...new Map(
        all.items
          .filter((row) => !filters.environment || row.ref.environmentId === filters.environment)
          .map((row) => {
            const key = scopedProjectKey(
              scopeProjectRef(row.ref.environmentId, row.item.projectId),
            );
            return [
              key,
              { key, projectId: row.item.projectId, environmentId: row.ref.environmentId },
            ];
          }),
      ).values(),
    ],
    [all.items, filters.environment],
  );
  const scrollTo = useCallback((index: number) => {
    void listRef.current
      ?.scrollIndexIntoView({ index, animated: false })
      .catch((error: unknown) => {
        console.error("Could not navigate attention list.", error);
        toastManager.add({ type: "error", title: "Could not navigate attention list" });
      });
  }, []);
  useEffect(() => {
    if (activeId) scrollTo(activeIndex);
  }, [activeId, activeIndex, scrollTo]);
  useEffect(() => {
    const listbox = listboxRef.current;
    if (!listbox) return;
    const update = () =>
      setMountedActiveId(activeId && document.getElementById(activeId) ? activeId : undefined);
    update();
    const observer = new MutationObserver(update);
    observer.observe(listbox, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [activeId]);

  const openRow = useCallback(
    async (row: ScopedAttentionItem) => {
      setSeen((current) => markAttentionSeen(current, row, true));
      try {
        await navigate(attentionThreadTarget(row));
      } catch (error) {
        console.error("Could not open attention thread.", error);
        toastManager.add({ type: "error", title: "Could not open thread" });
      }
    },
    [navigate, setSeen],
  );
  const selectClass =
    "h-8 max-w-64 rounded-md border border-input bg-background px-2 text-sm focus-visible:outline-2 focus-visible:outline-ring";
  return (
    <SidebarInset className="h-svh min-h-0 overflow-hidden bg-background text-foreground md:h-dvh">
      <WorkspacePageHeader electron={isElectron}>
        <InboxIcon className="size-4" aria-hidden="true" />
        <h1 className="text-sm font-medium">Attention inbox</h1>
      </WorkspacePageHeader>
      <div className="mx-auto flex min-h-0 w-full max-w-5xl flex-1 flex-col gap-4 px-5 py-5 sm:px-6">
        <div>
          <h2 className="text-lg font-semibold">Needs your attention</h2>
          <p className="text-sm text-muted-foreground" role="status">
            {all.threadCount} actionable threads · {all.itemCount} items
            {!all.complete ? " · Total incomplete" : ""}
            {` · ${all.liveThreadCount} live / ${all.staleThreadCount} stale threads`}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Open a thread to respond with its existing controls. Seen only changes emphasis on this
            device, not the actionable count.
          </p>
        </div>
        {(!all.complete || workspace.environments.size === 0) && (
          <div className="rounded-md border border-border bg-muted/30 p-3 text-sm">
            <p>
              {workspace.environments.size === 0
                ? workspace.isReady
                  ? "No enabled environments. Add or enable one in Settings → Connections."
                  : "Loading environments…"
                : "Some attention may be missing or stale. A frontend disconnection is not an agent failure."}
            </p>
            <ul className="mt-1 text-xs text-muted-foreground">
              {[...workspace.environments]
                .filter(([, state]) => state.status !== "live")
                .map(([environmentId, state]) => (
                  <li key={environmentId}>
                    {environmentLabel(environmentId)}: {ATTENTION_STATUSES[state.status]}
                    {state.reason ? ` (${state.reason})` : ""}
                  </li>
                ))}
            </ul>
          </div>
        )}
        <div className="flex flex-wrap gap-3" aria-label="Attention filters">
          <label className="flex flex-col gap-1 text-xs">
            Environment
            <select
              aria-label="Environment"
              className={selectClass}
              value={filters.environment}
              onChange={(event) => {
                setFilters((current) => ({
                  ...current,
                  environment: event.target.value,
                  project: "",
                }));
                setActiveKey(null);
              }}
            >
              <option value="">All environments</option>
              {[...workspace.environments.keys()].map((environmentId) => (
                <option key={environmentId} value={environmentId}>
                  {environmentLabel(environmentId)}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs">
            Project
            <select
              aria-label="Project"
              className={selectClass}
              value={filters.project}
              onChange={(event) => {
                setFilters((current) => ({ ...current, project: event.target.value }));
                setActiveKey(null);
              }}
            >
              <option value="">All projects</option>
              {projectOptions.map((project) => (
                <option key={project.key} value={project.key}>
                  {labels.get(project.key) ?? project.projectId} ·{" "}
                  {environmentLabel(project.environmentId)}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs">
            Kind
            <select
              aria-label="Kind"
              className={selectClass}
              value={filters.kind}
              onChange={(event) => {
                setFilters((current) => ({ ...current, kind: event.target.value }));
                setActiveKey(null);
              }}
            >
              <option value="">All kinds</option>
              {Object.entries(ATTENTION_KINDS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs">
            Severity
            <select
              aria-label="Severity"
              className={selectClass}
              value={filters.priority}
              onChange={(event) => {
                setFilters((current) => ({ ...current, priority: event.target.value }));
                setActiveKey(null);
              }}
            >
              <option value="">All severities</option>
              {Object.entries(ATTENTION_PRIORITIES).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <Button
            className="self-end"
            variant="outline"
            size="sm"
            onClick={() => {
              setFilters(EMPTY_ATTENTION_FILTERS);
              setActiveKey(null);
            }}
          >
            Clear filters
          </Button>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">
            {filtered.items.length} items in {filtered.threadCount} threads shown
          </p>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={!active}
              onClick={() => {
                if (active)
                  setSeen((current) =>
                    markAttentionSeen(
                      current,
                      active,
                      seenByKey.get(active.key) !== active.item.revision,
                    ),
                  );
              }}
            >
              {active && seenByKey.get(active.key) === active.item.revision
                ? "Mark unseen"
                : "Mark seen"}
            </Button>
            <Button
              size="sm"
              disabled={!active}
              onClick={() => {
                if (active) void openRow(active);
              }}
            >
              Open thread
            </Button>
          </div>
        </div>
        <p id={`${id}-help`} className="text-xs text-muted-foreground">
          Use Up/Down or Home/End to select; Enter opens the thread. Stale items may already be
          resolved; reconnect before responding.
        </p>
        {filtered.items.length === 0 ? (
          <div className="flex flex-1 items-center justify-center rounded-md border border-border p-6 text-center text-sm text-muted-foreground">
            {all.itemCount > 0
              ? "No items match these filters."
              : workspace.environments.size === 0
                ? "No enabled environments."
                : all.complete
                  ? "No open attention items."
                  : "No attention available yet. The total is incomplete."}
          </div>
        ) : (
          <div
            ref={listboxRef}
            role="listbox"
            aria-label="Attention items"
            aria-describedby={`${id}-help`}
            aria-activedescendant={mountedActiveId}
            tabIndex={0}
            className="min-h-0 flex-1 overflow-hidden rounded-md border border-border focus-visible:outline-2 focus-visible:outline-ring"
            onKeyDown={(event) => {
              const next = attentionKeyboardIndex(event.key, activeIndex, filtered.items.length);
              if (next !== null) {
                event.preventDefault();
                setActiveKey(filtered.items[next]?.key ?? null);
                scrollTo(next);
              } else if (event.key === "Enter" && active) {
                event.preventDefault();
                void openRow(active);
              }
            }}
          >
            <LegendList
              ref={listRef}
              data={filtered.items}
              keyExtractor={(row) => row.key}
              estimatedItemSize={100}
              drawDistance={300}
              style={{ height: "100%" }}
              extraData={{ activeKey: active?.key, seenByKey, labels, catalog }}
              renderItem={({ item: row, index }) => {
                const isSeen = seenByKey.get(row.key) === row.item.revision;
                return (
                  <div
                    id={`${id}-${row.key}`}
                    role="option"
                    aria-selected={row.key === active?.key}
                    aria-posinset={index + 1}
                    aria-setsize={filtered.items.length}
                    onMouseDown={(event) => {
                      event.preventDefault();
                      listboxRef.current?.focus();
                    }}
                    onClick={() => {
                      setActiveKey(row.key);
                      void openRow(row);
                    }}
                    className={cn(
                      "cursor-pointer border-b border-border px-4 py-3 text-sm",
                      row.key === active?.key ? "bg-accent" : "hover:bg-muted/50",
                    )}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className={cn("truncate", !isSeen && "font-semibold")}>
                        {ATTENTION_KINDS[row.item.kind]} · <AttentionRowTitle row={row} />
                      </span>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {isSeen ? "Seen" : "Unseen"}
                        {row.stale ? " · Stale" : ""}
                      </span>
                    </div>
                    <div className="mt-1 truncate text-xs text-muted-foreground">
                      {environmentLabel(row.ref.environmentId)} ·{" "}
                      {labels.get(
                        scopedProjectKey(
                          scopeProjectRef(row.ref.environmentId, row.item.projectId),
                        ),
                      ) ?? row.item.projectId}
                    </div>
                    <div className="mt-1 flex flex-wrap gap-x-3 text-xs text-muted-foreground">
                      <span>{ATTENTION_PRIORITIES[row.priority]}</span>
                      <time dateTime={row.item.openedAt}>
                        {new Date(row.item.openedAt).toLocaleString()}
                      </time>
                      {row.item.reasonCode === "response_failed" && (
                        <span>Response failed; still open</span>
                      )}
                    </div>
                  </div>
                );
              }}
            />
          </div>
        )}
      </div>
    </SidebarInset>
  );
}
