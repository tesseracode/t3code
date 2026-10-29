import * as Effect from "effect/Effect";
import * as SqlClient from "effect/sql/SqlClient";

export default Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient;
  // V1 evidence stays in the copied database and immutable audit. Live state is V2-only.
  yield* sql`CREATE TABLE foundation_projection_cursor (
    id INTEGER PRIMARY KEY NOT NULL CHECK (id = 1),
    last_sequence INTEGER NOT NULL
  )`;
  yield* sql`INSERT INTO foundation_projection_cursor VALUES (1, 0)`;
  yield* sql`CREATE TABLE foundation_v2_nodes (
    thread_id TEXT NOT NULL, node_id TEXT NOT NULL, run_id TEXT, is_root INTEGER NOT NULL,
    provider_thread_id TEXT, provider_turn_id TEXT,
    PRIMARY KEY(thread_id, node_id)
  )`;
  yield* sql`CREATE TABLE foundation_v2_providers (
    thread_id TEXT NOT NULL, provider_thread_id TEXT NOT NULL,
    provider_key TEXT NOT NULL, provider_session_id TEXT,
    PRIMARY KEY(thread_id, provider_thread_id)
  )`;
  yield* sql`DELETE FROM projection_thread_attention_current`;
  yield* sql`DELETE FROM projection_thread_attention_context`;
  yield* sql`DELETE FROM projection_thread_attention_lifecycle`;
  yield* sql`DELETE FROM projection_thread_attention_turns`;
  yield* sql`DELETE FROM projection_thread_attention_observations`;
  yield* sql`DELETE FROM projection_thread_awareness`;
  yield* sql`DELETE FROM attention_delivery_rows`;
  yield* sql`DELETE FROM attention_delivery_changes`;
  yield* sql`UPDATE attention_delivery_state
    SET generation = lower(hex(randomblob(16))), ready = 0, floor = head WHERE id = 1`;
  // Context is recomputed from V2 identity; durable opaque bindings and topology are retained.
  yield* sql`DELETE FROM tws_thread_contexts`;
});
