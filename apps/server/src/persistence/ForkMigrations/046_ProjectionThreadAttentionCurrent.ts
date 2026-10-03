import * as Effect from "effect/Effect";
import * as SqlClient from "effect/unstable/sql/SqlClient";

export default Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient;
  yield* sql`
    CREATE TABLE projection_thread_attention_context (
      thread_id TEXT PRIMARY KEY NOT NULL,
      project_id TEXT NOT NULL,
      incarnation_event_id TEXT NOT NULL,
      is_deleted INTEGER NOT NULL CHECK (is_deleted IN (0, 1))
    )
  `;
  yield* sql`CREATE INDEX idx_attention_context_project
    ON projection_thread_attention_context(project_id)`;
  yield* sql`
    CREATE TABLE projection_thread_attention_current (
      attention_id TEXT PRIMARY KEY NOT NULL,
      project_id TEXT NOT NULL,
      thread_id TEXT NOT NULL,
      turn_id TEXT,
      request_id TEXT NOT NULL,
      kind TEXT NOT NULL CHECK (kind IN ('approval', 'user_input')),
      status TEXT NOT NULL CHECK (status IN ('open', 'resolved')),
      reason_code TEXT NOT NULL CHECK (reason_code IN (
        'approval_requested', 'user_input_requested', 'response_failed', 'request_resolved', 'thread_reverted'
      )),
      revision INTEGER NOT NULL CHECK (revision > 0),
      source_event_id TEXT NOT NULL,
      source_sequence INTEGER NOT NULL,
      opened_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      resolved_at TEXT,
      CHECK ((status = 'open' AND resolved_at IS NULL) OR (status = 'resolved' AND resolved_at IS NOT NULL))
    )
  `;
  yield* sql`CREATE INDEX idx_attention_current_thread
    ON projection_thread_attention_current(thread_id, attention_id)`;
  yield* sql`CREATE INDEX idx_attention_current_request
    ON projection_thread_attention_current(thread_id, kind, request_id, status, turn_id)`;
  yield* sql`CREATE INDEX idx_attention_current_sequence
    ON projection_thread_attention_current(source_sequence, attention_id)`;
  yield* sql`CREATE INDEX idx_attention_current_project
    ON projection_thread_attention_current(project_id)`;
});
