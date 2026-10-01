import * as Layer from "effect/Layer";
import { layer as ProcessRunnerLive } from "../processRunner.ts";
import { TwsBindingRepositoryLive } from "../persistence/Layers/TwsBindings.ts";
import { TwsCliAdapterLive } from "./TwsCliAdapter.ts";
import { TwsContextServiceLive } from "./TwsContextService.ts";
import { TwsContextStoreLive } from "./TwsContextStore.ts";
import { TwsExecutionResolverLive } from "./TwsExecutionResolver.ts";

export const TwsContextLive = TwsContextServiceLive.pipe(
  Layer.provide(TwsContextStoreLive),
  Layer.provide(TwsBindingRepositoryLive),
  Layer.provide(TwsExecutionResolverLive),
  Layer.provide(TwsCliAdapterLive),
  Layer.provide(ProcessRunnerLive),
);
