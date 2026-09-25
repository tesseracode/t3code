const assert = require("node:assert/strict");
const { DatabaseSync } = require("node:sqlite");
const database = process.argv[2];
if (!database) throw new Error("Usage: migration-probe.cjs <disposable state.sqlite>");
const db = new DatabaseSync(database, { readOnly: true });
try {
  const upstream = db
    .prepare("SELECT migration_id, name FROM effect_sql_migrations ORDER BY migration_id")
    .all();
  const fork = db
    .prepare("SELECT migration_id, name FROM t3code_fork_migrations ORDER BY migration_id")
    .all();
  assert.deepEqual(
    upstream.map((row) => row.migration_id),
    Array.from({ length: 52 }, (_, i) => i + 1),
  );
  assert.equal(upstream[43].name, "ClearAutomaticProjectModelDefaults");
  assert.equal(upstream[44].name, "ProjectionProjectsAutoPull");
  assert.deepEqual(
    fork.map((row) => [row.migration_id, row.name]),
    [
      [44, "ProjectionThreadAttentionAudit"],
      [45, "TwsBindings"],
    ],
  );
  for (const table of [
    "projection_thread_attention_audit",
    "tws_workspace_bindings",
    "tws_workspace_project_bindings",
    "tws_feature_bindings",
    "tws_stack_node_bindings",
  ])
    assert.ok(
      db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?").get(table),
      table,
    );
  assert.equal(db.prepare("PRAGMA foreign_key_check").all().length, 0);
  console.log(
    JSON.stringify({
      upstreamCount: upstream.length,
      upstream44: upstream[43].name,
      upstream45: upstream[44].name,
      fork,
      foreignKeyViolations: 0,
    }),
  );
} finally {
  db.close();
}
