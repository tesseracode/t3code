import * as NodeServices from "@effect/platform-node/NodeServices";
import { assert, it } from "@effect/vitest";
import * as NodeSqliteClient from "@t3tools/shared/nodeSqliteClient";
import * as Effect from "effect/Effect";
import * as Exit from "effect/Exit";
import * as FileSystem from "effect/FileSystem";
import * as Path from "effect/Path";
import * as SqlClient from "effect/unstable/sql/SqlClient";

import { migrationManifest, runMigrations } from "./Migrations.ts";
import AttentionAudit from "./ForkMigrations/044_ProjectionThreadAttentionAudit.ts";
import TwsBindings from "./ForkMigrations/045_TwsBindings.ts";
import CurrentAttention from "./ForkMigrations/046_ProjectionThreadAttentionCurrent.ts";
import { ATTENTION_DELIVERY_TRIGGERS } from "./ForkMigrations/048_AttentionDelivery.ts";

const attentionName = "ProjectionThreadAttentionAudit";
const twsName = "TwsBindings";
const originalTimestamp = "2026-09-03 01:02:03";
const model = '{"instanceId":"copilot","model":"gpt-5.4"}';

const seedLegacy = Effect.fn("seedLegacy")(function* (head: 44 | 45 = 45) {
  const sql = yield* SqlClient.SqlClient;
  yield* sql`PRAGMA foreign_keys = ON`;
  yield* runMigrations({ toMigrationInclusive: 43 });
  // The old fork had only the shared ledger.
  yield* sql`DROP TABLE t3code_fork_migrations`;
  yield* AttentionAudit;
  yield* sql`INSERT INTO effect_sql_migrations (migration_id, name, created_at)
    VALUES (44, ${attentionName}, ${originalTimestamp})`;
  if (head === 45) {
    yield* TwsBindings;
    yield* sql`INSERT INTO effect_sql_migrations (migration_id, name, created_at)
      VALUES (45, ${twsName}, ${originalTimestamp})`;
  }
  yield* sql`INSERT INTO projection_thread_attention_audit
    (event_id, thread_id, turn_id, request_id, kind, sequence, occurred_at)
    VALUES ('audit-event', 'thread-1', 'turn-1', 'request-1', 'approval.requested', 91, '2026-09-03T01:00:00Z')`;
  yield* sql`INSERT INTO projection_state (projector, last_applied_sequence, updated_at)
    VALUES ('projection.thread-attention-audit', 91, '2026-09-03T01:00:00Z')`;
});

const seedProductRows = Effect.fn("seedProductRows")(function* () {
  const sql = yield* SqlClient.SqlClient;
  for (const project of ["automatic", "explicit"]) {
    yield* sql`INSERT INTO projection_projects
      (project_id, title, workspace_root, default_model_selection_json, scripts_json, created_at, updated_at)
      VALUES (${project}, ${project}, ${`/work/${project}`}, ${model}, '[]', '2026-09-03T00:00:00Z', '2026-09-03T00:00:00Z')`;
    yield* sql`INSERT INTO orchestration_events
      (event_id, aggregate_kind, stream_id, stream_version, event_type, occurred_at, actor_kind, payload_json, metadata_json)
      VALUES (${`created-${project}`}, 'project', ${project}, 1, 'project.created', '2026-09-03T00:00:00Z', 'user',
        '{"defaultModelSelection":{"instanceId":"copilot","model":"gpt-5.4"}}', '{}')`;
  }
  yield* sql`INSERT INTO orchestration_events
    (event_id, aggregate_kind, stream_id, stream_version, event_type, occurred_at, actor_kind, payload_json, metadata_json)
    VALUES ('configured-explicit', 'project', 'explicit', 2, 'project.meta-updated', '2026-09-03T01:00:00Z', 'user',
      '{"defaultModelSelection":{"instanceId":"copilot","model":"gpt-5.4"}}', '{}')`;
  yield* sql`INSERT INTO projection_thread_sessions
    (thread_id, status, provider_name, provider_instance_id, provider_session_id, updated_at)
    VALUES ('thread-1', 'ready', 'githubCopilot', 'copilot', 'native-session-unchanged', '2026-09-03T01:00:00Z')`;
  yield* sql`INSERT INTO provider_session_runtime
    (thread_id, provider_name, provider_instance_id, adapter_key, runtime_mode, status, last_seen_at, resume_cursor_json, runtime_payload_json)
    VALUES ('thread-1', 'githubCopilot', 'copilot', 'copilot', 'approval-required', 'ready',
      '2026-09-03T01:00:00Z', '{"schemaVersion":1,"sessionId":"native-session-unchanged"}', '{"cwd":"/work/explicit"}')`;
  for (const environment of ["environment-a", "environment-b"]) {
    yield* sql`INSERT INTO tws_workspace_bindings
      (environment_id, workspace_binding_id, canonical_locator_kind, canonical_locator_value, locators_json, repository_identity_json, first_seen_at, last_seen_at, retired_at)
      VALUES (${environment}, 'workspace-id', 'stable-id', 'workspace-stable', '[{"kind":"path","value":"/original/location"}]', NULL,
        '2026-09-01T00:00:00Z', '2026-09-03T00:00:00Z', NULL)`;
    yield* sql`INSERT INTO tws_workspace_project_bindings
      (environment_id, workspace_binding_id, project_id, first_seen_at, last_seen_at, retired_at)
      VALUES (${environment}, 'workspace-id', 'explicit', '2026-09-01T00:00:00Z', '2026-09-03T00:00:00Z', NULL)`;
    yield* sql`INSERT INTO tws_feature_bindings
      (environment_id, feature_binding_id, workspace_binding_id, canonical_locator_kind, canonical_locator_value, locators_json, repository_identity_json, first_seen_at, last_seen_at, retired_at)
      VALUES (${environment}, 'feature-id', 'workspace-id', 'name', 'Feature', '[]', NULL,
        '2026-09-01T00:00:00Z', '2026-09-03T00:00:00Z', NULL)`;
    yield* sql`INSERT INTO tws_stack_node_bindings
      (environment_id, stack_node_binding_id, feature_binding_id, project_id, canonical_locator_kind, canonical_locator_value,
       locators_json, repository_identity_json, git_branch, worktree_path, archived, first_seen_at, last_seen_at, retired_at)
      VALUES (${environment}, 'node-id', 'feature-id', NULL, 'git-branch', 'feature/archived', '[]', NULL, 'feature/archived', NULL,
        1, '2026-09-01T00:00:00Z', '2026-09-03T00:00:00Z', '2026-09-03T00:00:00Z')`;
  }
});

const snapshotPreservedRows = Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient;
  return {
    attention: yield* sql`SELECT * FROM projection_thread_attention_audit ORDER BY event_id`,
    cursors: yield* sql`SELECT * FROM projection_state ORDER BY projector`,
    sessions: yield* sql`SELECT * FROM projection_thread_sessions ORDER BY thread_id`,
    nativeRuntime: yield* sql`SELECT * FROM provider_session_runtime ORDER BY thread_id`,
    workspaces: yield* sql`SELECT * FROM tws_workspace_bindings ORDER BY environment_id`,
    projects: yield* sql`SELECT * FROM tws_workspace_project_bindings ORDER BY environment_id`,
    features: yield* sql`SELECT * FROM tws_feature_bindings ORDER BY environment_id`,
    nodes: yield* sql`SELECT * FROM tws_stack_node_bindings ORDER BY environment_id`,
  };
});

const assertUpstreamState = Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient;
  const history = yield* sql<{ readonly migration_id: number; readonly name: string }>`
    SELECT migration_id, name FROM effect_sql_migrations ORDER BY migration_id
  `;
  assert.deepEqual(
    history.map((row) => [row.migration_id, row.name] as const),
    migrationManifest,
  );
  const projects = yield* sql<{
    readonly project_id: string;
    readonly default_model_selection_json: string | null;
    readonly auto_pull: number;
  }>`
    SELECT project_id, default_model_selection_json, auto_pull FROM projection_projects ORDER BY project_id
  `;
  assert.deepEqual(projects, [
    { project_id: "automatic", default_model_selection_json: null, auto_pull: 0 },
    { project_id: "explicit", default_model_selection_json: model, auto_pull: 0 },
  ]);
  const events = yield* sql<{ readonly model: string | null }>`
    SELECT json_extract(payload_json, '$.defaultModelSelection') AS model
    FROM orchestration_events WHERE event_id = 'created-automatic'
  `;
  assert.isNull(events[0]?.model);
  const columns = yield* sql<{ readonly name: string }>`PRAGMA table_info(projection_threads)`;
  assert.isTrue(columns.some((column) => column.name === "title_state_json"));
});

it.effect("fresh installs keep upstream and fork histories in separate namespaces", () =>
  Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient;
    const executed = yield* runMigrations();
    assert.deepEqual(executed, migrationManifest);
    assert.deepEqual(
      yield* sql`SELECT migration_id, name FROM t3code_fork_migrations ORDER BY migration_id`,
      [
        { migration_id: 44, name: attentionName },
        { migration_id: 45, name: twsName },
        { migration_id: 46, name: "ProjectionThreadAttentionCurrent" },
        { migration_id: 47, name: "ProjectionThreadAwareness" },
        { migration_id: 48, name: "AttentionDelivery" },
      ],
    );
    assert.deepEqual(yield* runMigrations(), []);
  }).pipe(Effect.provide(NodeSqliteClient.layerMemory())),
);

it.effect("upstream-only databases add fork state without rerunning upstream migrations", () =>
  Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient;
    yield* runMigrations({ toMigrationInclusive: 52 });
    const original = yield* sql`SELECT * FROM effect_sql_migrations ORDER BY migration_id`;
    assert.deepEqual(yield* runMigrations(), []);
    assert.deepEqual(
      yield* sql`SELECT * FROM effect_sql_migrations ORDER BY migration_id`,
      original,
    );

    assert.lengthOf(yield* sql`SELECT * FROM t3code_fork_migrations`, 5);
  }).pipe(Effect.provide(NodeSqliteClient.layerMemory())),
);

it.effect(
  "upgrades the established fork ledger additively without changing the audit or its cursor",
  () =>
    Effect.gen(function* () {
      const sql = yield* SqlClient.SqlClient;
      yield* runMigrations({ toMigrationInclusive: 52 });
      yield* AttentionAudit;
      yield* TwsBindings;
      yield* sql`INSERT INTO t3code_fork_migrations (migration_id, name, created_at)
        VALUES (44, ${attentionName}, ${originalTimestamp}), (45, ${twsName}, ${originalTimestamp})`;
      yield* sql`INSERT INTO projection_thread_attention_audit
        (event_id, thread_id, kind, sequence, occurred_at)
        VALUES ('audit', 'thread', 'approval.requested', 3, '2026-09-27T00:00:00Z')`;
      yield* sql`INSERT INTO projection_state (projector, last_applied_sequence, updated_at)
        VALUES ('projection.thread-attention-audit', 3, '2026-09-27T00:00:00Z')`;
      const before = yield* snapshotPreservedRows;
      const upstream = yield* sql`SELECT * FROM effect_sql_migrations ORDER BY migration_id`;
      yield* runMigrations();
      assert.deepEqual(yield* snapshotPreservedRows, before);
      assert.deepEqual(
        yield* sql`SELECT * FROM effect_sql_migrations ORDER BY migration_id`,
        upstream,
      );
      assert.deepEqual(yield* sql`SELECT * FROM projection_thread_attention_current`, []);
      assert.deepEqual(yield* sql`SELECT * FROM projection_thread_attention_context`, []);
      assert.deepEqual(yield* runMigrations(), []);
    }).pipe(Effect.provide(NodeSqliteClient.layerMemory())),
);

it.effect("upgrades ATT-01 atomically and resets only its derived rows and replay cursor", () =>
  Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient;
    yield* runMigrations({ toMigrationInclusive: 52 });
    yield* AttentionAudit;
    yield* TwsBindings;
    yield* CurrentAttention;
    yield* sql`INSERT INTO t3code_fork_migrations (migration_id, name, created_at)
      VALUES (44, ${attentionName}, ${originalTimestamp}), (45, ${twsName}, ${originalTimestamp}),
        (46, 'ProjectionThreadAttentionCurrent', ${originalTimestamp})`;
    yield* sql`INSERT INTO projection_state (projector, last_applied_sequence, updated_at)
      VALUES ('projection.thread-attention-current', 12, '2026-09-27T00:00:00Z'),
        ('projection.thread-attention-audit', 12, '2026-09-27T00:00:00Z')`;
    yield* sql`INSERT INTO projection_thread_attention_audit
      (event_id, thread_id, kind, sequence, occurred_at)
      VALUES ('audit', 'thread', 'approval.requested', 12, '2026-09-27T00:00:00Z')`;
    yield* sql`INSERT INTO projection_thread_attention_context
      (thread_id, project_id, incarnation_event_id, is_deleted) VALUES ('thread', 'project', 'create', 0)`;
    yield* sql`INSERT INTO projection_thread_attention_current
      (attention_id, project_id, thread_id, turn_id, request_id, kind, status, reason_code, revision,
       source_event_id, source_sequence, opened_at, updated_at, resolved_at)
      VALUES (${"a".repeat(64)}, 'project', 'thread', 'turn', 'request', 'approval', 'open',
        'approval_requested', 1, 'audit', 12, '2026-09-27T00:00:00Z', '2026-09-27T00:00:00Z', NULL)`;
    const previous = yield* sql`SELECT * FROM projection_thread_attention_current`;
    const cursors = yield* sql`SELECT * FROM projection_state ORDER BY projector`;
    const history = yield* sql`SELECT * FROM t3code_fork_migrations ORDER BY migration_id`;
    yield* sql`CREATE TRIGGER reject_awareness BEFORE INSERT ON t3code_fork_migrations
      WHEN NEW.migration_id = 47 BEGIN SELECT RAISE(ABORT, 'blocked upgrade'); END`;
    assert.isTrue(Exit.isFailure(yield* runMigrations().pipe(Effect.exit)));
    assert.deepEqual(yield* sql`SELECT * FROM projection_thread_attention_current`, previous);
    assert.deepEqual(yield* sql`SELECT * FROM projection_state ORDER BY projector`, cursors);
    assert.deepEqual(
      yield* sql`SELECT * FROM t3code_fork_migrations ORDER BY migration_id`,
      history,
    );
    assert.deepEqual(
      yield* sql`SELECT name FROM sqlite_master WHERE name = 'projection_thread_awareness'`,
      [],
    );
    yield* sql`DROP TRIGGER reject_awareness`;
    yield* runMigrations();
    assert.deepEqual(yield* sql`SELECT * FROM projection_thread_attention_current`, []);
    assert.deepEqual(yield* sql`SELECT * FROM projection_thread_attention_context`, []);
    assert.deepEqual(
      yield* sql`SELECT * FROM projection_state WHERE projector = 'projection.thread-attention-current'`,
      [],
    );
    assert.lengthOf(yield* sql`SELECT * FROM projection_thread_attention_audit`, 1);
    assert.deepEqual(
      yield* sql`SELECT * FROM t3code_fork_migrations WHERE migration_id <= 46 ORDER BY migration_id`,
      history,
    );
    yield* sql`INSERT INTO projection_state (projector, last_applied_sequence, updated_at)
      VALUES ('projection.thread-attention-current', 12, '2026-09-27T00:00:00Z')`;
    yield* runMigrations();
    assert.deepEqual(yield* sql`SELECT * FROM projection_state ORDER BY projector`, cursors);
  }).pipe(Effect.provide(NodeSqliteClient.layerMemory())),
);

it.effect(
  "backfills delivery from ATT-02 projections atomically without resetting domain state",
  () =>
    Effect.gen(function* () {
      const sql = yield* SqlClient.SqlClient;
      yield* runMigrations();
      for (const trigger of ATTENTION_DELIVERY_TRIGGERS)
        yield* sql.unsafe(`DROP TRIGGER ${trigger.name}`);
      for (const table of [
        "attention_delivery_changes",
        "attention_delivery_rows",
        "attention_delivery_state",
      ])
        yield* sql.unsafe(`DROP TABLE ${table}`);
      yield* sql`DELETE FROM t3code_fork_migrations WHERE migration_id = 48`;
      yield* sql`INSERT INTO projection_thread_attention_current
      (attention_id, project_id, thread_id, turn_id, request_id, kind, status, reason_code, revision,
       source_event_id, source_sequence, opened_at, updated_at, resolved_at)
      VALUES (${"c".repeat(64)}, 'project', 'thread', 'turn', 'request', 'approval', 'open',
        'approval_requested', 1, 'source', 12, '2026-09-28T00:00:00Z', '2026-09-28T00:00:00Z', NULL)`;
      const domain = yield* sql`SELECT * FROM projection_thread_attention_current`;
      const ledger = yield* sql`SELECT * FROM t3code_fork_migrations ORDER BY migration_id`;
      yield* sql`CREATE TRIGGER reject_delivery BEFORE INSERT ON t3code_fork_migrations
      WHEN NEW.migration_id = 48 BEGIN SELECT RAISE(ABORT, 'blocked delivery upgrade'); END`;
      assert.isTrue(Exit.isFailure(yield* runMigrations().pipe(Effect.exit)));
      assert.deepEqual(yield* sql`SELECT * FROM projection_thread_attention_current`, domain);
      assert.deepEqual(
        yield* sql`SELECT * FROM t3code_fork_migrations ORDER BY migration_id`,
        ledger,
      );
      assert.deepEqual(
        yield* sql`SELECT name FROM sqlite_master WHERE name = 'attention_delivery_rows'`,
        [],
      );
      yield* sql`DROP TRIGGER reject_delivery`;
      yield* runMigrations();
      const delivery = yield* sql<{ readonly entity_key: string; readonly version: number }>`
      SELECT entity_key, version FROM attention_delivery_rows`;
      assert.deepEqual(delivery, [{ entity_key: `item:${"c".repeat(64)}`, version: 0 }]);
      assert.deepEqual(yield* sql`SELECT * FROM projection_thread_attention_current`, domain);
      assert.deepEqual(yield* sql`SELECT * FROM attention_delivery_changes`, []);
      yield* runMigrations();
      assert.deepEqual(
        yield* sql`SELECT entity_key, version FROM attention_delivery_rows`,
        delivery,
      );
      yield* sql`DROP TRIGGER delivery_projection_thread_attention_current_update`;
      assert.isTrue(Exit.isFailure(yield* runMigrations().pipe(Effect.exit)));
    }).pipe(Effect.provide(NodeSqliteClient.layerMemory())),
);

it.effect("does not reinterpret new fork migration IDs as historical upstream collisions", () =>
  Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient;
    yield* runMigrations({ toMigrationInclusive: 52 });
    yield* sql`UPDATE effect_sql_migrations SET name = 'ProjectionThreadAttentionCurrent' WHERE migration_id = 46`;
    const before = yield* sql`SELECT * FROM effect_sql_migrations ORDER BY migration_id`;
    assert.isTrue(Exit.isFailure(yield* runMigrations().pipe(Effect.exit)));
    assert.deepEqual(yield* sql`SELECT * FROM effect_sql_migrations ORDER BY migration_id`, before);
    assert.deepEqual(yield* sql`SELECT * FROM t3code_fork_migrations`, []);
  }).pipe(Effect.provide(NodeSqliteClient.layerMemory())),
);

it.effect(
  "moves verified legacy history intact, applies both collided migrations and preserves native/TWS/audit data",
  () =>
    Effect.gen(function* () {
      const sql = yield* SqlClient.SqlClient;
      yield* seedLegacy();
      yield* seedProductRows();
      const saved = yield* snapshotPreservedRows;
      const provenance =
        yield* sql`SELECT * FROM effect_sql_migrations WHERE migration_id >= 44 ORDER BY migration_id`;
      yield* runMigrations();
      assert.deepEqual(yield* snapshotPreservedRows, saved);
      assert.deepEqual(
        yield* sql`SELECT * FROM t3code_fork_migrations WHERE migration_id <= 45 ORDER BY migration_id`,
        provenance,
      );
      yield* assertUpstreamState;
      assert.deepEqual(yield* runMigrations(), []);
      assert.deepEqual(yield* snapshotPreservedRows, saved);
      assert.deepEqual(yield* sql`PRAGMA foreign_key_check`, []);
    }).pipe(Effect.provide(NodeSqliteClient.layerMemory())),
);

it.effect(
  "supports the audit-only legacy checkpoint without inventing a TWS migration record",
  () =>
    Effect.gen(function* () {
      const sql = yield* SqlClient.SqlClient;
      yield* seedLegacy(44);
      const rows = yield* sql`SELECT * FROM projection_thread_attention_audit`;
      yield* runMigrations();
      assert.deepEqual(yield* sql`SELECT * FROM projection_thread_attention_audit`, rows);
      const history = yield* sql<{
        readonly migration_id: number;
        readonly name: string;
        readonly created_at: string;
      }>`
      SELECT * FROM t3code_fork_migrations ORDER BY migration_id
    `;
      assert.equal(history[0]?.created_at, originalTimestamp);
      assert.equal(history[1]?.name, twsName);
      assert.notEqual(history[1]?.created_at, originalTimestamp);
      assert.deepEqual(yield* runMigrations(), []);
    }).pipe(Effect.provide(NodeSqliteClient.layerMemory())),
);

it.effect("repairs legacy collisions even below an already advanced upstream high-water mark", () =>
  Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient;
    yield* runMigrations({ toMigrationInclusive: 52 });
    yield* sql`DROP TABLE t3code_fork_migrations`;
    yield* AttentionAudit;
    yield* TwsBindings;
    yield* sql`UPDATE effect_sql_migrations SET name = ${attentionName}, created_at = ${originalTimestamp} WHERE migration_id = 44`;
    yield* sql`UPDATE effect_sql_migrations SET name = ${twsName}, created_at = ${originalTimestamp} WHERE migration_id = 45`;
    yield* sql`ALTER TABLE projection_projects DROP COLUMN auto_pull`;
    yield* seedProductRows();
    const saved = yield* snapshotPreservedRows;
    assert.deepEqual(yield* runMigrations(), [
      [44, "ClearAutomaticProjectModelDefaults"],
      [45, "ProjectionProjectsAutoPull"],
    ]);
    assert.deepEqual(yield* snapshotPreservedRows, saved);
    yield* assertUpstreamState;
  }).pipe(Effect.provide(NodeSqliteClient.layerMemory())),
);

it.effect(
  "rolls back bridge provenance and upstream effects when a later migration fails, then retries cleanly",
  () =>
    Effect.gen(function* () {
      const sql = yield* SqlClient.SqlClient;
      yield* seedLegacy();
      yield* seedProductRows();
      // Migration 52 must fail after the bridge and earlier upstream migrations ran.
      yield* sql`ALTER TABLE projection_threads ADD COLUMN title_state_json TEXT`;
      const history = yield* sql`SELECT * FROM effect_sql_migrations ORDER BY migration_id`;
      const rows = yield* snapshotPreservedRows;
      const failure = yield* runMigrations().pipe(Effect.exit);
      assert.isTrue(Exit.isFailure(failure));
      assert.deepEqual(
        yield* sql`SELECT * FROM effect_sql_migrations ORDER BY migration_id`,
        history,
      );
      assert.deepEqual(yield* snapshotPreservedRows, rows);
      assert.deepEqual(
        yield* sql`SELECT name FROM sqlite_master WHERE name = 't3code_fork_migrations'`,
        [],
      );
      assert.deepEqual(
        yield* sql`SELECT name FROM pragma_table_info('projection_projects') WHERE name = 'auto_pull'`,
        [],
      );
      assert.deepEqual(
        yield* sql`SELECT default_model_selection_json FROM projection_projects WHERE project_id = 'automatic'`,
        [{ default_model_selection_json: model }],
      );
      yield* sql`ALTER TABLE projection_threads DROP COLUMN title_state_json`;
      yield* runMigrations();
      yield* assertUpstreamState;
      assert.deepEqual(yield* snapshotPreservedRows, rows);
    }).pipe(Effect.provide(NodeSqliteClient.layerMemory())),
);

for (const scenario of [
  "unknown-name",
  "history-gap",
  "missing-column",
  "missing-index",
  "missing-table",
] as const) {
  it.effect(`refuses ${scenario} without changing history or audit rows`, () =>
    Effect.gen(function* () {
      const sql = yield* SqlClient.SqlClient;
      yield* seedLegacy();
      switch (scenario) {
        case "unknown-name":
          yield* sql`UPDATE effect_sql_migrations SET name = 'UnknownForkMigration' WHERE migration_id = 45`;
          break;
        case "history-gap":
          yield* sql`DELETE FROM effect_sql_migrations WHERE migration_id = 43`;
          break;
        case "missing-column":
          yield* sql`ALTER TABLE tws_stack_node_bindings DROP COLUMN archived`;
          break;
        case "missing-index":
          yield* sql`DROP INDEX idx_tws_workspace_bindings_environment_seen`;
          break;
        case "missing-table":
          yield* sql`DROP TABLE tws_stack_node_bindings`;
          break;
      }
      const history = yield* sql`SELECT * FROM effect_sql_migrations ORDER BY migration_id`;
      const audit = yield* sql`SELECT * FROM projection_thread_attention_audit`;
      const result = yield* runMigrations().pipe(Effect.exit);
      assert.isTrue(Exit.isFailure(result));
      assert.deepEqual(
        yield* sql`SELECT * FROM effect_sql_migrations ORDER BY migration_id`,
        history,
      );
      assert.deepEqual(yield* sql`SELECT * FROM projection_thread_attention_audit`, audit);
      assert.deepEqual(
        yield* sql`SELECT name FROM sqlite_master WHERE name = 't3code_fork_migrations'`,
        [],
      );
    }).pipe(Effect.provide(NodeSqliteClient.layerMemory())),
  );
}

it.effect("does not adopt existing unrecorded foundation tables via CREATE IF NOT EXISTS", () =>
  Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient;
    yield* runMigrations({ toMigrationInclusive: 52 });
    yield* AttentionAudit;
    const result = yield* runMigrations().pipe(Effect.exit);
    assert.isTrue(Exit.isFailure(result));
    assert.deepEqual(yield* sql`SELECT * FROM t3code_fork_migrations`, []);
  }).pipe(Effect.provide(NodeSqliteClient.layerMemory())),
);

it.effect(
  "rejects a partial target below a legacy collision without transferring its history",
  () =>
    Effect.gen(function* () {
      const sql = yield* SqlClient.SqlClient;
      yield* seedLegacy();
      const history = yield* sql`SELECT * FROM effect_sql_migrations ORDER BY migration_id`;
      const result = yield* runMigrations({ toMigrationInclusive: 44 }).pipe(Effect.exit);
      assert.isTrue(Exit.isFailure(result));
      assert.deepEqual(
        yield* sql`SELECT * FROM effect_sql_migrations ORDER BY migration_id`,
        history,
      );
      assert.deepEqual(
        yield* sql`SELECT name FROM sqlite_master WHERE name = 't3code_fork_migrations'`,
        [],
      );
    }).pipe(Effect.provide(NodeSqliteClient.layerMemory())),
);

it.effect("rejects conflicting provenance already present in the fork ledger", () =>
  Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient;
    yield* seedLegacy();
    yield* sql`CREATE TABLE t3code_fork_migrations (
      migration_id INTEGER PRIMARY KEY NOT NULL, name VARCHAR(255) NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`;
    yield* sql`INSERT INTO t3code_fork_migrations (migration_id, name, created_at)
      VALUES (44, ${attentionName}, '2026-01-01 00:00:00')`;
    const shared = yield* sql`SELECT * FROM effect_sql_migrations ORDER BY migration_id`;
    const fork = yield* sql`SELECT * FROM t3code_fork_migrations`;
    const error = yield* Effect.flip(runMigrations());
    assert.match(error.message, /conflicting provenance/);
    assert.deepEqual(yield* sql`SELECT * FROM effect_sql_migrations ORDER BY migration_id`, shared);
    assert.deepEqual(yield* sql`SELECT * FROM t3code_fork_migrations`, fork);
  }).pipe(Effect.provide(NodeSqliteClient.layerMemory())),
);

it.effect("refuses a fork ledger without a primary key before recording migrations", () =>
  Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient;
    yield* runMigrations({ toMigrationInclusive: 52 });
    yield* sql`DROP TABLE t3code_fork_migrations`;
    yield* sql`CREATE TABLE t3code_fork_migrations (
      migration_id INTEGER NOT NULL, name VARCHAR(255) NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`;
    const error = yield* Effect.flip(runMigrations());
    assert.match(error.message, /invalid migration ledger schema/);
    assert.deepEqual(yield* sql`SELECT * FROM t3code_fork_migrations`, []);
    assert.deepEqual(
      yield* sql`SELECT name FROM sqlite_master WHERE name = 'projection_thread_attention_audit'`,
      [],
    );
  }).pipe(Effect.provide(NodeSqliteClient.layerMemory())),
);

it.effect(
  "refuses unknown future migration IDs without interpreting them as foundation evidence",
  () =>
    Effect.gen(function* () {
      const sql = yield* SqlClient.SqlClient;
      yield* runMigrations({ toMigrationInclusive: 52 });
      yield* sql`INSERT INTO effect_sql_migrations (migration_id, name) VALUES (999, 'FutureMigration')`;
      const history = yield* sql`SELECT * FROM effect_sql_migrations ORDER BY migration_id`;
      const error = yield* Effect.flip(runMigrations());
      assert.match(error.message, /unknown or noncontiguous upstream ledger/);
      assert.deepEqual(
        yield* sql`SELECT * FROM effect_sql_migrations ORDER BY migration_id`,
        history,
      );
      assert.deepEqual(yield* sql`SELECT * FROM t3code_fork_migrations`, []);
    }).pipe(Effect.provide(NodeSqliteClient.layerMemory())),
);

it.effect("rejects matching TWS columns with a missing ownership foreign key", () =>
  Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient;
    yield* seedLegacy();
    yield* sql`DROP TABLE tws_workspace_project_bindings`;
    yield* sql`CREATE TABLE tws_workspace_project_bindings (
      environment_id TEXT NOT NULL, workspace_binding_id TEXT NOT NULL,
      project_id TEXT NOT NULL, first_seen_at TEXT NOT NULL, last_seen_at TEXT NOT NULL,
      retired_at TEXT, PRIMARY KEY (environment_id, workspace_binding_id, project_id)
    )`;
    const error = yield* Effect.flip(runMigrations());
    assert.match(error.message, /foreign-key mismatch/);
    assert.deepEqual(
      yield* sql`SELECT name FROM sqlite_master WHERE name = 't3code_fork_migrations'`,
      [],
    );
  }).pipe(Effect.provide(NodeSqliteClient.layerMemory())),
);

it.effect(
  "does not treat a failed upstream ledger insertion as a successful concurrent migration",
  () =>
    Effect.gen(function* () {
      const sql = yield* SqlClient.SqlClient;
      yield* seedLegacy();
      const history = yield* sql`SELECT * FROM effect_sql_migrations ORDER BY migration_id`;
      yield* sql`CREATE TRIGGER reject_upstream_migration BEFORE INSERT ON effect_sql_migrations
      WHEN NEW.migration_id = 46 BEGIN SELECT RAISE(ABORT, 'blocked by fixture'); END`;
      const result = yield* runMigrations().pipe(Effect.exit);
      assert.isTrue(Exit.isFailure(result));
      assert.deepEqual(
        yield* sql`SELECT * FROM effect_sql_migrations ORDER BY migration_id`,
        history,
      );
      assert.deepEqual(
        yield* sql`SELECT name FROM sqlite_master WHERE name = 't3code_fork_migrations'`,
        [],
      );
      yield* sql`DROP TRIGGER reject_upstream_migration`;
      yield* runMigrations();
      assert.deepEqual(yield* runMigrations(), []);
    }).pipe(Effect.provide(NodeSqliteClient.layerMemory())),
);

it.effect("does not treat a failed fork ledger insertion as a completed foundation", () =>
  Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient;
    yield* runMigrations({ toMigrationInclusive: 52 });
    yield* sql`CREATE TRIGGER reject_fork_migration BEFORE INSERT ON t3code_fork_migrations
      BEGIN SELECT RAISE(ABORT, 'blocked by fixture'); END`;
    const result = yield* runMigrations().pipe(Effect.exit);
    assert.isTrue(Exit.isFailure(result));
    assert.deepEqual(yield* sql`SELECT * FROM t3code_fork_migrations`, []);
    assert.deepEqual(
      yield* sql`SELECT name FROM sqlite_master WHERE name = 'projection_thread_attention_audit'`,
      [],
    );
  }).pipe(Effect.provide(NodeSqliteClient.layerMemory())),
);

it.effect("persists the bridge across closing and reopening a disposable database", () =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    const directory = yield* fs.makeTempDirectoryScoped({ prefix: "t3-fork-migration-" });
    const filename = path.join(directory, "state.sqlite");
    const saved = yield* Effect.gen(function* () {
      yield* seedLegacy();
      yield* seedProductRows();
      return yield* snapshotPreservedRows;
    }).pipe(Effect.provide(NodeSqliteClient.layer({ filename })));
    yield* runMigrations().pipe(Effect.provide(NodeSqliteClient.layer({ filename })));
    yield* Effect.gen(function* () {
      assert.deepEqual(yield* runMigrations(), []);
      assert.deepEqual(yield* snapshotPreservedRows, saved);
      yield* assertUpstreamState;
    }).pipe(Effect.provide(NodeSqliteClient.layer({ filename })));
  }).pipe(Effect.scoped, Effect.provide(NodeServices.layer)),
);
