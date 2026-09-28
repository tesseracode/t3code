import * as Effect from "effect/Effect";
import * as Migrator from "effect/unstable/sql/Migrator";
import * as SqlClient from "effect/unstable/sql/SqlClient";

import AttentionAudit from "./ForkMigrations/044_ProjectionThreadAttentionAudit.ts";
import TwsBindings from "./ForkMigrations/045_TwsBindings.ts";
import CurrentAttention from "./ForkMigrations/046_ProjectionThreadAttentionCurrent.ts";
import ThreadAwareness from "./ForkMigrations/047_ProjectionThreadAwareness.ts";
import Upstream0044 from "./Migrations/044_ClearAutomaticProjectModelDefaults.ts";
import Upstream0045 from "./Migrations/045_ProjectionProjectsAutoPull.ts";

const FORK_MIGRATIONS_TABLE = "t3code_fork_migrations";
const forkEntries = [
  [44, "ProjectionThreadAttentionAudit", AttentionAudit],
  [45, "TwsBindings", TwsBindings],
  [46, "ProjectionThreadAttentionCurrent", CurrentAttention],
  [47, "ProjectionThreadAwareness", ThreadAwareness],
] as const;
const run = Migrator.make({});

interface MigrationRow {
  readonly migration_id: number;
  readonly name: string;
  readonly created_at: string;
}

interface TableShape {
  readonly name: string;
  readonly migration: number;
  readonly columns: ReadonlyArray<string>;
  readonly nullable: ReadonlyArray<string>;
  readonly primaryKey: ReadonlyArray<string>;
  readonly integerColumns?: ReadonlyArray<string>;
  readonly parent?: { readonly table: string; readonly key: string };
  readonly indexes: ReadonlyArray<string>;
}

const locatorColumns = [
  "canonical_locator_kind",
  "canonical_locator_value",
  "locators_json",
  "repository_identity_json",
];
const lifecycleColumns = ["first_seen_at", "last_seen_at", "retired_at"];
const tables: ReadonlyArray<TableShape> = [
  {
    name: "projection_thread_attention_lifecycle",
    migration: 47,
    columns: [
      "attention_id",
      "project_id",
      "thread_id",
      "turn_id",
      "provider_key",
      "kind",
      "status",
      "reason_code",
      "revision",
      "source_event_id",
      "source_sequence",
      "opened_at",
      "updated_at",
      "resolved_at",
    ],
    nullable: ["resolved_at"],
    primaryKey: ["attention_id"],
    integerColumns: ["revision", "source_sequence"],
    indexes: [
      "idx_attention_lifecycle_thread",
      "idx_attention_lifecycle_open",
      "idx_attention_lifecycle_project",
    ],
  },
  {
    name: "projection_thread_awareness",
    migration: 47,
    columns: [
      "thread_id",
      "project_id",
      "turn_id",
      "reported_turn_id",
      "provider_key",
      "base_phase",
      "pending_start",
      "stop_requested",
      "lifecycle_observed_at",
      "phase",
      "approval_count",
      "input_count",
      "failure_count",
      "disconnect_count",
      "counts_overflowed",
      "revision",
      "source_event_id",
      "source_sequence",
      "updated_at",
    ],
    nullable: [
      "turn_id",
      "reported_turn_id",
      "provider_key",
      "base_phase",
      "phase",
      "lifecycle_observed_at",
    ],
    primaryKey: ["thread_id"],
    integerColumns: [
      "pending_start",
      "stop_requested",
      "approval_count",
      "input_count",
      "failure_count",
      "disconnect_count",
      "counts_overflowed",
      "revision",
      "source_sequence",
    ],
    indexes: ["idx_thread_awareness_project"],
  },
  {
    name: "projection_thread_attention_turns",
    migration: 47,
    columns: ["thread_id", "provider_key", "turn_id", "phase", "source_sequence"],
    nullable: [],
    primaryKey: ["thread_id", "provider_key", "turn_id"],
    integerColumns: ["source_sequence"],
    indexes: [],
  },
  {
    name: "projection_thread_attention_observations",
    migration: 47,
    columns: ["thread_id", "provider_key", "provider_event_id"],
    nullable: [],
    primaryKey: ["thread_id", "provider_key", "provider_event_id"],
    indexes: [],
  },
  {
    name: "projection_thread_attention_context",
    migration: 46,
    columns: ["thread_id", "project_id", "incarnation_event_id", "is_deleted"],
    nullable: [],
    primaryKey: ["thread_id"],
    integerColumns: ["is_deleted"],
    indexes: ["idx_attention_context_project"],
  },
  {
    name: "projection_thread_attention_current",
    migration: 46,
    columns: [
      "attention_id",
      "project_id",
      "thread_id",
      "turn_id",
      "request_id",
      "kind",
      "status",
      "reason_code",
      "revision",
      "source_event_id",
      "source_sequence",
      "opened_at",
      "updated_at",
      "resolved_at",
    ],
    nullable: ["turn_id", "resolved_at"],
    primaryKey: ["attention_id"],
    integerColumns: ["revision", "source_sequence"],
    indexes: [
      "idx_attention_current_thread",
      "idx_attention_current_request",
      "idx_attention_current_sequence",
      "idx_attention_current_project",
    ],
  },
  {
    name: "projection_thread_attention_audit",
    migration: 44,
    columns: ["event_id", "thread_id", "turn_id", "request_id", "kind", "sequence", "occurred_at"],
    nullable: ["event_id", "turn_id", "request_id"],
    primaryKey: ["event_id"],
    integerColumns: ["sequence"],
    indexes: ["idx_projection_thread_attention_audit_thread_sequence"],
  },
  {
    name: "tws_workspace_bindings",
    migration: 45,
    columns: ["environment_id", "workspace_binding_id", ...locatorColumns, ...lifecycleColumns],
    nullable: ["repository_identity_json", "retired_at"],
    primaryKey: ["environment_id", "workspace_binding_id"],
    indexes: [
      "idx_tws_workspace_bindings_environment_locator",
      "idx_tws_workspace_bindings_environment_retired",
      "idx_tws_workspace_bindings_environment_seen",
    ],
  },
  {
    name: "tws_workspace_project_bindings",
    migration: 45,
    columns: ["environment_id", "workspace_binding_id", "project_id", ...lifecycleColumns],
    nullable: ["retired_at"],
    primaryKey: ["environment_id", "workspace_binding_id", "project_id"],
    parent: { table: "tws_workspace_bindings", key: "workspace_binding_id" },
    indexes: [
      "idx_tws_workspace_project_bindings_workspace_retired",
      "idx_tws_workspace_project_bindings_workspace_seen",
      "idx_tws_workspace_project_bindings_project",
      "idx_tws_workspace_project_bindings_project_seen",
    ],
  },
  {
    name: "tws_feature_bindings",
    migration: 45,
    columns: [
      "environment_id",
      "feature_binding_id",
      "workspace_binding_id",
      ...locatorColumns,
      ...lifecycleColumns,
    ],
    nullable: ["repository_identity_json", "retired_at"],
    primaryKey: ["environment_id", "feature_binding_id"],
    parent: { table: "tws_workspace_bindings", key: "workspace_binding_id" },
    indexes: [
      "idx_tws_feature_bindings_workspace_locator",
      "idx_tws_feature_bindings_workspace_retired",
      "idx_tws_feature_bindings_workspace_seen",
    ],
  },
  {
    name: "tws_stack_node_bindings",
    migration: 45,
    columns: [
      "environment_id",
      "stack_node_binding_id",
      "feature_binding_id",
      "project_id",
      ...locatorColumns,
      "git_branch",
      "worktree_path",
      "archived",
      ...lifecycleColumns,
    ],
    nullable: ["project_id", "repository_identity_json", "worktree_path", "retired_at"],
    primaryKey: ["environment_id", "stack_node_binding_id"],
    integerColumns: ["archived"],
    parent: { table: "tws_feature_bindings", key: "feature_binding_id" },
    indexes: [
      "idx_tws_stack_node_bindings_feature_locator",
      "idx_tws_stack_node_bindings_project",
      "idx_tws_stack_node_bindings_feature_retired",
      "idx_tws_stack_node_bindings_feature_seen",
    ],
  },
];

const badState = (message: string) =>
  new Migrator.MigrationError({
    kind: "BadState",
    message: `Fork migration history is incompatible: ${message}. Use a compatible build or a consistent backup rather than guessing the schema.`,
  });

const validateForkSchema = Effect.fn("validateForkSchema")(function* (
  applied: ReadonlySet<number>,
) {
  const sql = yield* SqlClient.SqlClient;
  for (const table of tables) {
    const indexes =
      table.name === "projection_thread_attention_current" && applied.has(47)
        ? [...table.indexes, "idx_attention_current_open_counts"]
        : table.indexes;
    const objects = yield* sql<{
      readonly name: string;
      readonly type: string;
      readonly tbl_name: string;
    }>`
      SELECT name, type, tbl_name FROM sqlite_master
      WHERE name = ${table.name} OR ${sql.in("name", indexes)}
    `;
    if (!applied.has(table.migration)) {
      if (objects.length > 0) return yield* badState(`unrecorded objects for ${table.name}`);
      continue;
    }
    if (!objects.some((object) => object.name === table.name && object.type === "table")) {
      return yield* badState(`recorded table ${table.name} is missing`);
    }
    const columns = yield* sql<{
      readonly name: string;
      readonly type: string;
      readonly notnull: number;
      readonly pk: number;
    }>`SELECT name, type, "notnull", pk FROM pragma_table_info(${table.name}) ORDER BY cid`;
    const turnPolicyColumns =
      table.name === "projection_thread_attention_current" && applied.has(47)
        ? ["resolves_with_turn"]
        : [];
    const expectedColumns = [...table.columns, ...turnPolicyColumns];
    const integerColumns = new Set([...(table.integerColumns ?? []), ...turnPolicyColumns]);
    if (
      columns.length !== expectedColumns.length ||
      columns.some(
        (column, index) =>
          column.name !== expectedColumns[index] ||
          column.type !== (integerColumns.has(column.name) ? "INTEGER" : "TEXT") ||
          column.notnull !== (table.nullable.includes(column.name) ? 0 : 1) ||
          column.pk !== Math.max(0, table.primaryKey.indexOf(column.name) + 1),
      )
    ) {
      return yield* badState(`column or primary-key mismatch in ${table.name}`);
    }
    const foreignKeys = yield* sql<{
      readonly id: number;
      readonly seq: number;
      readonly table: string;
      readonly from: string;
      readonly to: string;
      readonly on_delete: string;
      readonly on_update: string;
    }>`SELECT id, seq, "table", "from", "to", on_delete, on_update FROM pragma_foreign_key_list(${table.name}) ORDER BY id, seq`;
    const parent = table.parent;
    if (
      parent
        ? foreignKeys.length !== 2 ||
          foreignKeys.some(
            (key, index) =>
              key.id !== 0 ||
              key.seq !== index ||
              key.table !== parent.table ||
              key.from !== (index === 0 ? "environment_id" : parent.key) ||
              key.to !== key.from ||
              key.on_delete !== "CASCADE" ||
              key.on_update !== "NO ACTION",
          )
        : foreignKeys.length !== 0
    ) {
      return yield* badState(`foreign-key mismatch in ${table.name}`);
    }
    if (
      indexes.some(
        (name) =>
          !objects.some(
            (object) =>
              object.name === name && object.type === "index" && object.tbl_name === table.name,
          ),
      )
    ) {
      return yield* badState(`required index missing from ${table.name}`);
    }
  }
});

const readForkHistory = Effect.fn("readForkHistory")(function* () {
  const sql = yield* SqlClient.SqlClient;
  const rows =
    yield* sql<MigrationRow>`SELECT migration_id, name, created_at FROM t3code_fork_migrations ORDER BY migration_id`;
  if (
    rows.length > forkEntries.length ||
    rows.some(
      (row, index) =>
        row.migration_id !== forkEntries[index]?.[0] || row.name !== forkEntries[index]?.[1],
    )
  )
    return yield* badState("unknown or noncontiguous fork ledger");
  return rows;
});

const validateMigrationLedger = Effect.fn("validateMigrationLedger")(function* (table: string) {
  const sql = yield* SqlClient.SqlClient;
  const columns = yield* sql<{
    readonly name: string;
    readonly type: string;
    readonly notnull: number;
    readonly pk: number;
  }>`SELECT name, type, "notnull", pk FROM pragma_table_info(${table})`;
  const expected = [
    ["migration_id", "INTEGER", 1],
    ["name", "VARCHAR(255)", 0],
    ["created_at", "DATETIME", 0],
  ] as const;
  if (
    columns.length !== expected.length ||
    expected.some(
      ([name, type, pk]) =>
        !columns.some(
          (column) =>
            column.name === name &&
            column.type.toUpperCase() === type &&
            column.pk === pk &&
            column.notnull === 1,
        ),
    )
  ) {
    return yield* badState(`invalid migration ledger schema for ${table}`);
  }
});

/**
 * Runs inside the same transaction as both migrators. Only exact legacy history
 * and schema can move namespaces; collided upstream migrations actually run.
 */
export const bridgeLegacyForkMigrations = Effect.fn("bridgeLegacyForkMigrations")(function* (
  upstreamManifest: ReadonlyArray<readonly [number, string]>,
  toMigrationInclusive?: number,
) {
  const sql = yield* SqlClient.SqlClient;
  yield* sql`
    CREATE TABLE IF NOT EXISTS t3code_fork_migrations (
      migration_id INTEGER PRIMARY KEY NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      name VARCHAR(255) NOT NULL
    )
  `;
  yield* validateMigrationLedger(FORK_MIGRATIONS_TABLE);
  const forkHistory = yield* readForkHistory();
  const ledger = yield* sql<{ readonly name: string }>`
    SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'effect_sql_migrations'
  `;
  if (ledger.length > 0) yield* validateMigrationLedger("effect_sql_migrations");
  const sharedHistory =
    ledger.length === 0
      ? []
      : yield* sql<MigrationRow>`SELECT migration_id, name, created_at FROM effect_sql_migrations ORDER BY migration_id`;
  const legacy = sharedHistory.filter(
    (row) =>
      (row.migration_id === 44 || row.migration_id === 45) &&
      forkEntries.some(([id, name]) => row.migration_id === id && row.name === name),
  );
  if (
    toMigrationInclusive !== undefined &&
    legacy.some((row) => row.migration_id > toMigrationInclusive)
  ) {
    return yield* badState("requested migration limit precedes a legacy collision");
  }
  if (
    sharedHistory.some(
      (row, index) =>
        row.migration_id !== upstreamManifest[index]?.[0] ||
        (row.name !== upstreamManifest[index]?.[1] && !legacy.includes(row)),
    )
  )
    return yield* badState("unknown or noncontiguous upstream ledger");
  const appliedForkIds = new Set([...forkHistory, ...legacy].map((row) => row.migration_id));
  if (appliedForkIds.size > 0 && sharedHistory.length < 43) {
    return yield* badState("foundation history has no complete upstream prerequisite");
  }
  if (appliedForkIds.has(45) && !appliedForkIds.has(44)) {
    return yield* badState("TWS migration is recorded without the attention migration");
  }
  yield* validateForkSchema(appliedForkIds);
  const repaired: Array<readonly [number, string]> = [];
  for (const row of legacy) {
    const previous = forkHistory.find((entry) => entry.migration_id === row.migration_id);
    if (previous && (previous.name !== row.name || previous.created_at !== row.created_at)) {
      return yield* badState(`conflicting provenance for migration ${row.migration_id}`);
    }
    if (!previous) {
      yield* sql`INSERT INTO t3code_fork_migrations (migration_id, name, created_at)
        VALUES (${row.migration_id}, ${row.name}, ${row.created_at})`;
    }
    // Remove only the verified namespace collision, after preserving its original evidence.
    yield* sql`DELETE FROM effect_sql_migrations WHERE migration_id = ${row.migration_id} AND name = ${row.name}`;
    const name =
      row.migration_id === 44 ? "ClearAutomaticProjectModelDefaults" : "ProjectionProjectsAutoPull";
    yield* row.migration_id === 44 ? Upstream0044 : Upstream0045;
    yield* sql`INSERT INTO effect_sql_migrations (migration_id, name) VALUES (${row.migration_id}, ${name})`;
    repaired.push([row.migration_id, name]);
  }
  if (legacy.length > 0) {
    yield* Effect.logDebug(
      "Prepared legacy fork history transfer and collided upstream migrations in startup transaction",
    ).pipe(Effect.annotateLogs({ migrationIds: legacy.map((row) => row.migration_id) }));
  }
  return repaired;
});

export const runForkMigrations = Effect.fn("runForkMigrations")(function* () {
  const executed = yield* run({
    table: FORK_MIGRATIONS_TABLE,
    loader: Migrator.fromRecord(
      Object.fromEntries(forkEntries.map(([id, name, migration]) => [`${id}_${name}`, migration])),
    ),
  });
  const history = yield* readForkHistory();
  if (history.length !== forkEntries.length) {
    return yield* badState("fork migrations did not reach the required version");
  }
  yield* validateForkSchema(new Set(history.map((row) => row.migration_id)));
  return executed;
});
