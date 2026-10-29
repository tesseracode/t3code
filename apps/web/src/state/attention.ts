import { createAttentionWorkspaceAtoms } from "@t3tools/client-runtime/state/attention";
import { connectionAtomRuntime } from "../connection/runtime";

export const attentionWorkspace = createAttentionWorkspaceAtoms(connectionAtomRuntime);
