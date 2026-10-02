import { WS_METHODS } from "@t3tools/contracts";
import type { Atom } from "effect/unstable/reactivity";
import type { EnvironmentRegistry } from "../connection/registry.ts";
import { createEnvironmentRpcCommand, createEnvironmentRpcQueryAtomFamily } from "./runtime.ts";

/** All operations use the existing environment lease; callers mount only when the add-on is enabled. */
export function createTwsEnvironmentAtoms<R, E>(
  runtime: Atom.AtomRuntime<EnvironmentRegistry | R, E>,
) {
  return {
    refresh: createEnvironmentRpcCommand(runtime, {
      label: "tws:refresh",
      tag: WS_METHODS.twsRefresh,
    }),
    setContext: createEnvironmentRpcCommand(runtime, {
      label: "tws:set-context",
      tag: WS_METHODS.twsSetContext,
    }),
    contexts: createEnvironmentRpcQueryAtomFamily(runtime, {
      label: "tws:contexts",
      tag: WS_METHODS.twsGetContexts,
    }),
    topology: createEnvironmentRpcQueryAtomFamily(runtime, {
      label: "tws:topology",
      tag: WS_METHODS.twsQuery,
    }),
    provenance: createEnvironmentRpcQueryAtomFamily(runtime, {
      label: "tws:provenance",
      tag: WS_METHODS.twsProvenance,
    }),
  };
}
