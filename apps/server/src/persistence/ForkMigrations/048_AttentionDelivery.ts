import * as Effect from "effect/Effect";
import * as SqlClient from "effect/unstable/sql/SqlClient";

const requestFields = {
  attentionId: "attention_id",
  projectId: "project_id",
  threadId: "thread_id",
  turnId: "turn_id",
  requestId: "request_id",
  kind: "kind",
  status: "status",
  reasonCode: "reason_code",
  revision: "revision",
  sourceEventId: "source_event_id",
  sourceSequence: "source_sequence",
  openedAt: "opened_at",
  updatedAt: "updated_at",
  resolvedAt: "resolved_at",
};
const summaryFields = {
  threadId: "thread_id",
  projectId: "project_id",
  turnId: "reported_turn_id",
  phase: "phase",
  approvalCount: "approval_count",
  inputCount: "input_count",
  failureCount: "failure_count",
  disconnectCount: "disconnect_count",
  revision: "revision",
  sourceEventId: "source_event_id",
  sourceSequence: "source_sequence",
  updatedAt: "updated_at",
};
const sources = [
  {
    table: "projection_thread_attention_current",
    type: "item",
    id: "attention_id",
    fields: requestFields,
  },
  {
    table: "projection_thread_attention_lifecycle",
    type: "item",
    id: "attention_id",
    fields: requestFields,
  },
  { table: "projection_thread_awareness", type: "summary", id: "thread_id", fields: summaryFields },
] as const;
export const ATTENTION_DELIVERY_TRIGGERS = [
  { name: "attention_delivery_retention", table: "attention_delivery_changes" },
  ...sources.flatMap((source) =>
    ["insert", "update", "delete"].map((action) => ({
      name: `delivery_${source.table}_${action}`,
      table: source.table,
    })),
  ),
];

export default Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient;
  yield* sql`CREATE TABLE attention_delivery_state (
    id INTEGER PRIMARY KEY CHECK (id = 1), generation TEXT NOT NULL, head INTEGER NOT NULL, floor INTEGER NOT NULL,
    ready INTEGER NOT NULL CHECK (ready IN (0,1))
  )`;
  yield* sql`INSERT INTO attention_delivery_state VALUES (1, lower(hex(randomblob(16))), 0, 0, 0)`;
  yield* sql`CREATE TABLE attention_delivery_rows (
    entity_key TEXT PRIMARY KEY NOT NULL, project_id TEXT NOT NULL, thread_id TEXT NOT NULL,
    status TEXT NOT NULL, data_json TEXT NOT NULL, version INTEGER NOT NULL, bytes INTEGER NOT NULL
  )`;
  yield* sql`CREATE INDEX idx_attention_delivery_scope ON attention_delivery_rows(project_id, thread_id, entity_key)`;
  yield* sql`CREATE TABLE attention_delivery_changes (
    sequence INTEGER PRIMARY KEY AUTOINCREMENT, entity_key TEXT NOT NULL,
    before_project TEXT, before_thread TEXT, before_status TEXT,
    project_id TEXT, thread_id TEXT, status TEXT, data_json TEXT, bytes INTEGER NOT NULL, oversized INTEGER NOT NULL
  )`;
  // This is a bounded derived journal, not another authoritative event history.
  yield* sql.unsafe(`CREATE TRIGGER attention_delivery_retention AFTER INSERT ON attention_delivery_changes BEGIN
    UPDATE attention_delivery_state SET head = NEW.sequence WHERE id = 1;
    DELETE FROM attention_delivery_changes WHERE sequence <= NEW.sequence - 1000;
    DELETE FROM attention_delivery_changes WHERE sequence IN (
      SELECT sequence FROM (
        SELECT sequence, SUM(bytes) OVER (ORDER BY sequence DESC) AS retained_bytes
        FROM attention_delivery_changes
      ) WHERE retained_bytes > 8388608
    );
    UPDATE attention_delivery_state SET floor = COALESCE((SELECT MIN(sequence) - 1 FROM attention_delivery_changes), head) WHERE id = 1;
  END`);
  for (const source of sources) {
    const json = (prefix: string) => {
      const pairs = Object.entries(source.fields).map(
        ([key, column]) =>
          `'${key}', ${source.table.endsWith("lifecycle") && key === "requestId" ? "NULL" : `${prefix}.${column}`}`,
      );
      if (source.type === "summary")
        pairs.push(
          `'countsOverflowed', json(CASE ${prefix}.counts_overflowed WHEN 1 THEN 'true' ELSE 'false' END)`,
        );
      if (source.table.endsWith("lifecycle"))
        pairs.push(
          `'title', CASE ${prefix}.kind WHEN 'failure' THEN 'Agent failed' ELSE 'Provider disconnected' END`,
        );
      return `json_object('type', '${source.type}', 'value', json_object(${pairs.join(", ")}))`;
    };
    const status = (prefix: string) =>
      source.type === "summary" ? "'summary'" : `${prefix}.status`;
    const key = (prefix: string) => `'${source.type}:' || ${prefix}.${source.id}`;
    const rowJson = json("source");
    yield* sql.unsafe(`INSERT INTO attention_delivery_rows
      SELECT ${key("source")}, source.project_id, source.thread_id, ${status("source")},
        ${rowJson}, 0, length(CAST(${rowJson} AS BLOB)) FROM ${source.table} source`);
    for (const action of ["INSERT", "UPDATE", "DELETE"] as const) {
      const before =
        action === "INSERT"
          ? ["NULL", "NULL", "NULL"]
          : ["OLD.project_id", "OLD.thread_id", status("OLD")];
      const value = action === "DELETE" ? "NULL" : json("NEW");
      const after =
        action === "DELETE"
          ? ["NULL", "NULL", "NULL"]
          : ["NEW.project_id", "NEW.thread_id", status("NEW")];
      const entityKey = key(action === "DELETE" ? "OLD" : "NEW");
      const size = `COALESCE(length(CAST(${value} AS BLOB)), 0) + length(CAST(${entityKey} AS BLOB))
        + ${[...before, ...after].map((field) => `COALESCE(length(CAST(${field} AS BLOB)),0)`).join(" + ")} + 1024`;
      const condition = action === "UPDATE" ? "WHEN NEW.revision != OLD.revision" : "";
      yield* sql.unsafe(`CREATE TRIGGER delivery_${source.table}_${action.toLowerCase()}
        AFTER ${action} ON ${source.table} ${condition} BEGIN
        INSERT INTO attention_delivery_changes
          (entity_key,before_project,before_thread,before_status,project_id,thread_id,status,data_json,bytes,oversized)
        VALUES (${entityKey},${before.join(",")},${after.join(",")},
          CASE WHEN ${size} > 65536 THEN NULL ELSE ${value} END, ${size}, CASE WHEN ${size} > 65536 THEN 1 ELSE 0 END);
        ${
          action === "DELETE"
            ? `DELETE FROM attention_delivery_rows WHERE entity_key = ${entityKey};`
            : `INSERT INTO attention_delivery_rows VALUES (
              ${entityKey}, NEW.project_id, NEW.thread_id, ${status("NEW")}, ${value},
              (SELECT head FROM attention_delivery_state WHERE id=1), ${size})
             ON CONFLICT(entity_key) DO UPDATE SET project_id=excluded.project_id,thread_id=excluded.thread_id,
               status=excluded.status,data_json=excluded.data_json,version=excluded.version,bytes=excluded.bytes;`
        }
      END`);
    }
  }
});
