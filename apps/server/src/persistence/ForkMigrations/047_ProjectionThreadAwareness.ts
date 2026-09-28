import * as Effect from "effect/Effect";
import * as SqlClient from "effect/unstable/sql/SqlClient";

export default Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient;
  yield* sql`ALTER TABLE projection_thread_attention_current
    ADD COLUMN resolves_with_turn INTEGER NOT NULL DEFAULT 1 CHECK (resolves_with_turn IN (0, 1))`;
  yield* sql`CREATE TABLE projection_thread_attention_lifecycle (
    attention_id TEXT PRIMARY KEY NOT NULL, project_id TEXT NOT NULL, thread_id TEXT NOT NULL,
    turn_id TEXT NOT NULL, provider_key TEXT NOT NULL,
    kind TEXT NOT NULL CHECK (kind IN ('failure', 'disconnect')),
    status TEXT NOT NULL CHECK (status IN ('open', 'resolved')),
    reason_code TEXT NOT NULL CHECK (reason_code IN (
      'provider_failed', 'runtime_failed', 'provider_disconnected', 'provider_recovered',
      'turn_completed', 'turn_interrupted', 'thread_reverted'
    )),
    revision INTEGER NOT NULL CHECK (revision > 0), source_event_id TEXT NOT NULL,
    source_sequence INTEGER NOT NULL, opened_at TEXT NOT NULL, updated_at TEXT NOT NULL,
    resolved_at TEXT,
    CHECK ((status = 'open' AND resolved_at IS NULL) OR (status = 'resolved' AND resolved_at IS NOT NULL))
  )`;
  yield* sql`CREATE INDEX idx_attention_lifecycle_thread ON projection_thread_attention_lifecycle(thread_id, attention_id)`;
  yield* sql`CREATE UNIQUE INDEX idx_attention_lifecycle_open ON projection_thread_attention_lifecycle(thread_id, provider_key, turn_id, kind) WHERE status = 'open'`;
  yield* sql`CREATE INDEX idx_attention_lifecycle_project ON projection_thread_attention_lifecycle(project_id)`;
  yield* sql`CREATE INDEX idx_attention_current_open_counts ON projection_thread_attention_current(thread_id, status, kind)`;
  yield* sql`CREATE TABLE projection_thread_awareness (
    thread_id TEXT PRIMARY KEY NOT NULL, project_id TEXT NOT NULL, turn_id TEXT, reported_turn_id TEXT,
    provider_key TEXT, base_phase TEXT, pending_start INTEGER NOT NULL, stop_requested INTEGER NOT NULL,
    lifecycle_observed_at TEXT,
    phase TEXT, approval_count INTEGER NOT NULL, input_count INTEGER NOT NULL,
    failure_count INTEGER NOT NULL, disconnect_count INTEGER NOT NULL, counts_overflowed INTEGER NOT NULL,
    revision INTEGER NOT NULL, source_event_id TEXT NOT NULL, source_sequence INTEGER NOT NULL,
    updated_at TEXT NOT NULL
  )`;
  yield* sql`CREATE INDEX idx_thread_awareness_project ON projection_thread_awareness(project_id)`;
  yield* sql`CREATE TABLE projection_thread_attention_turns (
    thread_id TEXT NOT NULL, provider_key TEXT NOT NULL, turn_id TEXT NOT NULL,
    phase TEXT NOT NULL CHECK (phase IN ('running','completed','failed','stale','interrupted')),
    source_sequence INTEGER NOT NULL,
    PRIMARY KEY (thread_id, provider_key, turn_id)
  )`;
  yield* sql`CREATE TABLE projection_thread_attention_observations (
    thread_id TEXT NOT NULL, provider_key TEXT NOT NULL, provider_event_id TEXT NOT NULL,
    PRIMARY KEY (thread_id, provider_key, provider_event_id)
  )`;
  // The expanded reducer must replay from the event stream, not consume ATT-01's final rows as historical state.
  yield* sql`DELETE FROM projection_thread_attention_current`;
  yield* sql`DELETE FROM projection_thread_attention_context`;
  yield* sql`DELETE FROM projection_state WHERE projector = 'projection.thread-attention-current'`;
});
