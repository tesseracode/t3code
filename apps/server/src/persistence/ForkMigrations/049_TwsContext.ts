import * as Effect from "effect/Effect";
import * as SqlClient from "effect/unstable/sql/SqlClient";

export default Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient;
  yield* sql`CREATE INDEX idx_tws_context_incarnation
    ON orchestration_events(aggregate_kind, stream_id, event_type, sequence DESC)
    WHERE event_type = 'thread.created' OR event_type = 'project.created'`;
  yield* sql`CREATE TABLE tws_context_observations (
    environment_id TEXT PRIMARY KEY NOT NULL,
    generation INTEGER NOT NULL,
    data_json TEXT NOT NULL
  )`;
  yield* sql`CREATE TABLE tws_context_topology (
    environment_id TEXT NOT NULL,
    binding_id TEXT NOT NULL,
    workspace_binding_id TEXT NOT NULL,
    feature_binding_id TEXT,
    summary_json TEXT NOT NULL,
    data_json TEXT NOT NULL,
    PRIMARY KEY(environment_id, binding_id)
  )`;
  yield* sql`CREATE INDEX idx_tws_context_topology_workspace ON tws_context_topology(environment_id, workspace_binding_id, binding_id)`;
  yield* sql`CREATE INDEX idx_tws_context_topology_feature ON tws_context_topology(environment_id, feature_binding_id, binding_id)`;
  yield* sql`CREATE TABLE tws_thread_contexts (
    environment_id TEXT NOT NULL,
    thread_id TEXT NOT NULL,
    data_json TEXT NOT NULL,
    PRIMARY KEY(environment_id, thread_id)
  )`;
});
