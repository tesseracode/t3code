import { createTwsEnvironmentAtoms } from "@t3tools/client-runtime/state/tws";
import { connectionAtomRuntime } from "../connection/runtime";

export const twsEnvironment = createTwsEnvironmentAtoms(connectionAtomRuntime);
