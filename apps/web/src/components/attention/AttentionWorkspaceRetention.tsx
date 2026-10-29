import { useAtomValue } from "@effect/atom-react";
import { useEffect, useRef } from "react";
import type { EnvironmentId } from "@t3tools/contracts";
import { isCommandPaletteOpen } from "../../commandPaletteBus";
import { useLocalStorage } from "../../hooks/useLocalStorage";
import { registerCommands } from "../../shortcuts/dispatcher";
import { attentionWorkspace } from "../../state/attention";
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
  const [seen, setSeen] = useAttentionSeen();
  const observedEnvironments = useRef(new Set<EnvironmentId>());
  const open = useOpenAttentionInbox();
  // oxlint-disable-next-line t3code/react-effect-budget -- Persist bounded seen-state cleanup as connected environment membership changes.
  useEffect(() => {
    for (const id of workspace.environments.keys()) observedEnvironments.current.add(id);
    if (pruneAttentionSeen(seen, workspace, observedEnvironments.current) !== seen) {
      setSeen((current) => pruneAttentionSeen(current, workspace, observedEnvironments.current));
    }
  }, [seen, setSeen, workspace]);
  // oxlint-disable-next-line t3code/react-effect-budget -- Register the client command and release its handler when this owner unmounts.
  useEffect(
    () =>
      registerCommands(
        {
          [ATTENTION_INBOX_COMMAND]: (event) => {
            event.preventDefault();
            event.stopPropagation();
            void open();
          },
        },
        {
          when: (event) =>
            !isCommandPaletteOpen() &&
            !(
              event.target instanceof HTMLElement &&
              event.target.closest("[data-keybinding-capture]")
            ),
        },
      ),
    [open],
  );
  return null;
}
