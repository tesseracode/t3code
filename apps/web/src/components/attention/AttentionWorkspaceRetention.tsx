import { useAtomValue } from "@effect/atom-react";
import { useEffect, useRef } from "react";
import type { EnvironmentId } from "@t3tools/contracts";
import { isCommandPaletteOpen } from "../../commandPaletteBus";
import { useLocalStorage } from "../../hooks/useLocalStorage";
import { resolveShortcutCommand } from "../../keybindings";
import { attentionWorkspace } from "../../state/attention";
import { primaryServerKeybindingsAtom } from "../../state/server";
import {
  ATTENTION_INBOX_COMMAND,
  AttentionSeen,
  EMPTY_ATTENTION_SEEN,
  pruneAttentionSeen,
} from "./attentionInbox.logic";
import { useOpenAttentionInbox } from "./useOpenAttentionInbox";

export function useAttentionSeen() {
  return useLocalStorage("t3code:attention-seen:v1", EMPTY_ATTENTION_SEEN, AttentionSeen);
}

export function AttentionWorkspaceRetention() {
  const workspace = useAtomValue(attentionWorkspace.valueAtom);
  const keybindings = useAtomValue(primaryServerKeybindingsAtom);
  const [seen, setSeen] = useAttentionSeen();
  const observedEnvironments = useRef(new Set<EnvironmentId>());
  const open = useOpenAttentionInbox();
  useEffect(() => {
    for (const id of workspace.environments.keys()) observedEnvironments.current.add(id);
    if (pruneAttentionSeen(seen, workspace, observedEnvironments.current) !== seen) {
      setSeen((current) => pruneAttentionSeen(current, workspace, observedEnvironments.current));
    }
  }, [seen, setSeen, workspace]);
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || isCommandPaletteOpen()) return;
      if (event.target instanceof HTMLElement && event.target.closest("[data-keybinding-capture]"))
        return;
      if (resolveShortcutCommand(event, keybindings) !== ATTENTION_INBOX_COMMAND) return;
      event.preventDefault();
      event.stopPropagation();
      void open();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [keybindings, open]);
  return null;
}
