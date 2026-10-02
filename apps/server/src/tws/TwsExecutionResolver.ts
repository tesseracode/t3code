import { TwsContextError } from "@t3tools/contracts";
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as FileSystem from "effect/FileSystem";
import * as Layer from "effect/Layer";
import { ProcessRunner } from "../processRunner.ts";
import type { TwsExecution } from "./TwsContextModel.ts";

export class TwsExecutionResolver extends Context.Service<
  TwsExecutionResolver,
  {
    readonly resolve: (path: string) => Effect.Effect<TwsExecution, TwsContextError>;
  }
>()("t3/tws/TwsExecutionResolver") {}

export const TwsExecutionResolverLive = Layer.effect(
  TwsExecutionResolver,
  Effect.gen(function* () {
    const runner = yield* ProcessRunner;
    const fs = yield* FileSystem.FileSystem;
    const resolve = Effect.fn("TwsExecutionResolver.resolve")(
      function* (path: string) {
        const realPath = yield* fs.realPath(path);
        const run = (args: ReadonlyArray<string>) =>
          runner.run({
            command: "git",
            args: ["-C", realPath, ...args],
            timeout: "10 seconds",
            maxOutputBytes: 16 * 1024,
          });
        const top = yield* run(["rev-parse", "--path-format=absolute", "--show-toplevel"]);
        const common = yield* run(["rev-parse", "--path-format=absolute", "--git-common-dir"]);
        const branch = yield* run(["symbolic-ref", "--quiet", "--short", "HEAD"]);
        if (
          top.code !== 0 ||
          common.code !== 0 ||
          (branch.code !== 0 && branch.code !== 1) ||
          top.stdoutInvalidUtf8 ||
          common.stdoutInvalidUtf8 ||
          branch.stdoutInvalidUtf8 ||
          top.stdoutTruncated ||
          common.stdoutTruncated ||
          branch.stdoutTruncated
        )
          return yield* new TwsContextError({
            reason: "unavailable",
            message: "The owning environment could not verify the Git execution location.",
          });
        const stripLineEnding = (value: string) => value.replace(/\r?\n$/, "");
        return {
          path: realPath,
          root: yield* fs.realPath(stripLineEnding(top.stdout)),
          commonDirectory: yield* fs.realPath(stripLineEnding(common.stdout)),
          branch: branch.code === 0 ? stripLineEnding(branch.stdout) : null,
        } satisfies TwsExecution;
      },
      Effect.mapError(
        () =>
          new TwsContextError({
            reason: "unavailable",
            message: "The owning environment could not verify the Git execution location.",
          }),
      ),
    );
    return TwsExecutionResolver.of({ resolve });
  }),
);
