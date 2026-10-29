import * as NodeServices from "@effect/platform-node/NodeServices";
import { assert, describe, it } from "@effect/vitest";
import * as NodeSqliteClient from "@t3tools/shared/nodeSqliteClient";
import * as Effect from "effect/Effect";
import * as Exit from "effect/Exit";
import * as FileSystem from "effect/FileSystem";
import * as Path from "effect/Path";
import * as SqlClient from "effect/sql/SqlClient";
import { migrationManifest, runMigrations } from "./Migrations.ts";
import AttentionAudit from "./ForkMigrations/044_ProjectionThreadAttentionAudit.ts";
import TwsBindings from "./ForkMigrations/045_TwsBindings.ts";
import { initializeV2Database } from "./initializeV2Database.ts";

const originalTimestamp = "2026-09-03 01:02:03";
const memory = NodeSqliteClient.layer({ filename: ":memory:" });
const legacyNames = ["ProjectionThreadAttentionAudit", "TwsBindings"] as const;
const seedLegacy = Effect.fn("seedLegacy")(function* (head: 44 | 45, advanced = false) {
  const sql = yield* SqlClient.SqlClient;
  yield* runMigrations({ toMigrationInclusive: advanced ? 52 : 43 });
  yield* sql`DROP TABLE t3code_fork_migrations`;
  yield* AttentionAudit;
  if (head === 45) yield* TwsBindings;
  for (const id of head === 45 ? [44, 45] : [44]) {
    if (advanced) {
      yield* sql`UPDATE effect_sql_migrations SET name = ${legacyNames[id - 44]}, created_at = ${originalTimestamp} WHERE migration_id = ${id}`;
    } else {
      yield* sql`INSERT INTO effect_sql_migrations (migration_id, name, created_at)
        VALUES (${id}, ${legacyNames[id - 44]}, ${originalTimestamp})`;
    }
  }
  if (advanced) yield* sql`ALTER TABLE projection_projects DROP COLUMN auto_pull`;
  yield* sql`INSERT INTO projection_thread_attention_audit
    (event_id, thread_id, turn_id, request_id, kind, sequence, occurred_at)
    VALUES ('audit', 'thread', 'turn', 'request', 'approval.requested', 91, '2026-09-03T01:00:00Z')`;
  yield* sql`INSERT INTO projection_state (projector, last_applied_sequence, updated_at)
    VALUES ('projection.thread-attention-audit', 91, '2026-09-03T01:00:00Z')`;
  yield* sql`INSERT INTO provider_session_runtime
    (thread_id, provider_name, provider_instance_id, adapter_key, runtime_mode, status, last_seen_at, resume_cursor_json, runtime_payload_json)
    VALUES ('thread', 'codex', 'codex', 'codex', 'approval-required', 'ready',
      '2026-09-03T01:00:00Z', '{"sessionId":"recoverable-native-session"}', '{}')`;
  if (head === 45)
    yield* sql`INSERT INTO tws_workspace_bindings
    (environment_id, workspace_binding_id, canonical_locator_kind, canonical_locator_value, locators_json, repository_identity_json, first_seen_at, last_seen_at, retired_at)
    VALUES ('environment', 'opaque-binding', 'stable-id', 'exact-marker', '[]', NULL,
      '2026-09-03T01:00:00Z', '2026-09-03T01:00:00Z', NULL)`;
});
const preserved = Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient;
  return {
    audit: yield* sql`SELECT * FROM projection_thread_attention_audit`,
    native: yield* sql`SELECT * FROM provider_session_runtime`,
    bindings: yield* sql`SELECT * FROM tws_workspace_bindings`,
  };
});

it.effect("installs separate histories on V2 and is idempotent", () =>
  Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient;
    assert.deepEqual(yield* runMigrations(), migrationManifest);
    assert.deepEqual(
      yield* sql`SELECT migration_id FROM t3code_fork_migrations ORDER BY migration_id`,
      [44, 45, 46, 47, 48, 49, 50].map((migration_id) => ({ migration_id })),
    );
    assert.deepEqual(yield* runMigrations(), []);
    assert.deepEqual(yield* sql`SELECT * FROM foundation_projection_cursor`, [
      { id: 1, last_sequence: 0 },
    ]);
  }).pipe(Effect.provide(memory)),
);

describe("legacy 44/45 bridge to V2", () => {
  it.effect.each([44, 45] as const)(
    "preserves checkpoint %s provenance and recovered data",
    (head) =>
      Effect.gen(function* () {
        const sql = yield* SqlClient.SqlClient;
        yield* seedLegacy(head);
        const audit = yield* sql`SELECT * FROM projection_thread_attention_audit`;
        const native = yield* sql`SELECT * FROM provider_session_runtime`;
        yield* runMigrations();
        assert.deepEqual(yield* sql`SELECT * FROM projection_thread_attention_audit`, audit);
        assert.deepEqual(yield* sql`SELECT * FROM provider_session_runtime`, native);
        const history = yield* sql<{
          readonly created_at: string;
        }>`SELECT created_at FROM t3code_fork_migrations WHERE migration_id <= ${head} ORDER BY migration_id`;
        assert.deepEqual(
          history.map((row) => row.created_at),
          head === 44 ? [originalTimestamp] : [originalTimestamp, originalTimestamp],
        );
        assert.deepEqual(
          yield* sql`SELECT last_applied_sequence FROM foundation_legacy_projection_state WHERE projector = 'projection.thread-attention-audit'`,
          [{ last_applied_sequence: 91 }],
        );
        assert.deepEqual(yield* runMigrations(), []);
      }).pipe(Effect.provide(memory)),
  );
  it.effect("executes collisions below an advanced upstream head", () =>
    Effect.gen(function* () {
      const sql = yield* SqlClient.SqlClient;
      yield* seedLegacy(45, true);
      const before = yield* preserved;
      const executed = yield* runMigrations();
      assert.deepEqual(executed.slice(0, 2), [
        [44, "ClearAutomaticProjectModelDefaults"],
        [45, "ProjectionProjectsAutoPull"],
      ]);
      assert.deepEqual(yield* preserved, before);
      assert.deepEqual(
        (yield* sql<{ readonly name: string }>`PRAGMA table_info(projection_projects)`)
          .filter((row) => row.name === "auto_pull")
          .map((row) => row.name),
        ["auto_pull"],
      );
    }).pipe(Effect.provide(memory)),
  );
  it.effect.each(["gap", "unknown", "schema", "provenance"] as const)(
    "rejects %s without committing a partial bridge",
    (failure) =>
      Effect.gen(function* () {
        const sql = yield* SqlClient.SqlClient;
        yield* seedLegacy(45);
        if (failure === "gap")
          yield* sql`DELETE FROM effect_sql_migrations WHERE migration_id = 12`;
        if (failure === "unknown")
          yield* sql`UPDATE effect_sql_migrations SET name = 'UnknownFork' WHERE migration_id = 45`;
        if (failure === "schema")
          yield* sql`DROP INDEX idx_tws_workspace_bindings_environment_locator`;
        if (failure === "provenance") {
          yield* sql`CREATE TABLE t3code_fork_migrations (migration_id INTEGER PRIMARY KEY NOT NULL, created_at DATETIME NOT NULL, name VARCHAR(255) NOT NULL)`;
          yield* sql`INSERT INTO t3code_fork_migrations VALUES (44, 'different timestamp', 'ProjectionThreadAttentionAudit')`;
        }
        const before = yield* sql`SELECT * FROM effect_sql_migrations ORDER BY migration_id`;
        assert.isTrue(Exit.isFailure(yield* runMigrations().pipe(Effect.exit)));
        assert.deepEqual(
          yield* sql`SELECT * FROM effect_sql_migrations ORDER BY migration_id`,
          before,
        );
        assert.deepEqual(
          yield* sql`SELECT name FROM sqlite_master WHERE name = 'foundation_projection_cursor'`,
          [],
        );
      }).pipe(Effect.provide(memory)),
  );
});

it.effect("rolls back a swallowed migrator ledger failure and retries cleanly", () =>
  Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient;
    yield* seedLegacy(45);
    const before = yield* sql`SELECT * FROM effect_sql_migrations ORDER BY migration_id`;
    yield* sql`CREATE TRIGGER reject_upstream BEFORE INSERT ON effect_sql_migrations
    WHEN NEW.migration_id = 46 BEGIN SELECT RAISE(ABORT, 'fixture'); END`;
    assert.isTrue(Exit.isFailure(yield* runMigrations().pipe(Effect.exit)));
    assert.deepEqual(yield* sql`SELECT * FROM effect_sql_migrations ORDER BY migration_id`, before);
    assert.deepEqual(
      yield* sql`SELECT name FROM sqlite_master WHERE name = 't3code_fork_migrations'`,
      [],
    );
    yield* sql`DROP TRIGGER reject_upstream`;
    yield* runMigrations();
    assert.deepEqual(yield* runMigrations(), []);
  }).pipe(Effect.provide(memory)),
);

it.effect("rolls back upstream schema and derived resets when fork installation fails", () =>
  Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient;
    yield* runMigrations({ toMigrationInclusive: 54 });
    const before = yield* sql`SELECT * FROM effect_sql_migrations ORDER BY migration_id`;
    yield* sql`CREATE TRIGGER reject_fork BEFORE INSERT ON t3code_fork_migrations
    WHEN NEW.migration_id = 50 BEGIN SELECT RAISE(ABORT, 'fixture'); END`;
    assert.isTrue(Exit.isFailure(yield* runMigrations().pipe(Effect.exit)));
    assert.deepEqual(yield* sql`SELECT * FROM effect_sql_migrations ORDER BY migration_id`, before);
    assert.deepEqual(
      yield* sql`SELECT name FROM sqlite_master WHERE name = 'orchestration_v2_projection_threads'`,
      [],
    );
    assert.deepEqual(yield* sql`SELECT * FROM t3code_fork_migrations`, []);
    yield* sql`DROP TRIGGER reject_fork`;
    yield* runMigrations();
  }).pipe(Effect.provide(memory)),
);

it.effect(
  "copies old state safely, bridges statev2 on disk, and leaves rollback source recoverable",
  () =>
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const path = yield* Path.Path;
      const directory = yield* fs.makeTempDirectoryScoped({
        directory: process.cwd(),
        prefix: ".foundation-lineage-",
      });
      const source = path.join(directory, "state.sqlite");
      const target = path.join(directory, "statev2.sqlite");
      yield* seedLegacy(45).pipe(Effect.provide(NodeSqliteClient.layer({ filename: source })));
      const before = yield* preserved.pipe(
        Effect.provide(NodeSqliteClient.layer({ filename: source })),
      );
      yield* initializeV2Database(target);
      yield* runMigrations().pipe(Effect.provide(NodeSqliteClient.layer({ filename: target })));
      yield* Effect.gen(function* () {
        assert.deepEqual(yield* runMigrations(), []);
        assert.deepEqual(yield* preserved, before);
      }).pipe(Effect.provide(NodeSqliteClient.layer({ filename: target })));
      yield* Effect.gen(function* () {
        const sql = yield* SqlClient.SqlClient;
        assert.deepEqual(yield* preserved, before);
        assert.deepEqual(
          yield* sql`SELECT name FROM effect_sql_migrations WHERE migration_id = 44`,
          [{ name: legacyNames[0] }],
        );
      }).pipe(Effect.provide(NodeSqliteClient.layer({ filename: source })));
    }).pipe(Effect.scoped, Effect.provide(NodeServices.layer)),
);
