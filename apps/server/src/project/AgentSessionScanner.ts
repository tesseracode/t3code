import * as NodeOS from "node:os";

import {
  AgentSessionScanError,
  ClaudeSettings,
  CodexSettings,
  ProviderDriverKind,
  ProviderInstanceId,
  resolveProviderInstanceEnabled,
  type AgentSessionImportSource,
  type AgentSessionProjectCandidate,
  type AgentSessionProjectGit,
  type AgentSessionScanResult,
  type ProviderInstanceConfig,
} from "@t3tools/contracts";
import * as Context from "effect/Context";
import * as DateTime from "effect/DateTime";
import * as Effect from "effect/Effect";
import * as FileSystem from "effect/FileSystem";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";
import * as Path from "effect/Path";
import * as Schema from "effect/Schema";
import * as Semaphore from "effect/Semaphore";
import * as Stream from "effect/Stream";

import { isBareGitConfig, parseOriginUrlFromGitConfig } from "@t3tools/shared/git";
import * as HostProcess from "@t3tools/shared/HostProcess";
import { normalizeProjectPathForComparison } from "@t3tools/shared/path";
import { CopilotSettings } from "@t3tools/provider-copilot/settings";
import { repositoryPathFromRemoteUrl } from "@t3tools/source-control-core/server/SourceControlProvider";

import * as ServerConfig from "../config.ts";
import * as ProjectStore from "../orchestration-v2/ProjectStore.ts";
import { resolveCodexHomeLayout } from "../provider/Drivers/CodexHomeLayout.ts";
import { expandHomePath } from "@t3tools/provider-core/server/pathExpansion";
import * as ServerSettings from "../serverSettings.ts";
import { sourceControlDefinitions } from "../sourceControl/sourceControlDefinitions.ts";
import {
  createTranscriptJsonReader,
  createTranscriptJsonSelector,
  TranscriptJsonLimitError,
} from "./AgentSessionJson.ts";

const TRANSCRIPT_PREFIX_BYTES = 32 * 1024;
const METADATA_READ_BYTES = 8 * 1024;
const MAX_TRANSCRIPT_SCAN_BYTES = 1024 * 1024;

const MAX_TRANSCRIPTS_PER_SOURCE = 5000;

const MAX_DISCOVERY_OPERATIONS_PER_SOURCE = MAX_TRANSCRIPTS_PER_SOURCE * 4;
const MAX_METADATA_BYTES_PER_SOURCE = 64 * 1024 * 1024;
const MAX_METADATA_OPERATIONS_PER_SOURCE = MAX_TRANSCRIPTS_PER_SOURCE * 4;
const MAX_METADATA_RECORDS_PER_SOURCE = 100_000;
const MAX_METADATA_RECORDS_PER_TRANSCRIPT = 1_000;
const RECENT_THREAD_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;
// Screenshot-heavy transcripts can reach GiB; select fields while streaming to avoid allocating payloads.
const MAX_IMPORTED_TRANSCRIPT_BYTES = 4 * 1024 * 1024 * 1024;
const MAX_IMPORTED_MESSAGES = 200;
const MAX_IMPORT_HISTORY_BYTES = 32 * 1024 * 1024;
const MAX_IMPORT_BYTES = 4 * 1024 * 1024 * 1024;
const MAX_IMPORT_TRANSCRIPTS = 100;
const MAX_IMPORT_RECORDS = 100_000;

const TranscriptContentBlock = Schema.Struct({
  type: Schema.optional(Schema.String),
  text: Schema.optional(Schema.String),
});

const TranscriptMessage = Schema.Struct({
  role: Schema.optional(Schema.String),
  content: Schema.optional(Schema.Union([Schema.String, Schema.Array(TranscriptContentBlock)])),
  model: Schema.optional(Schema.String),
});

const CodexTurnMetadata = Schema.Struct({
  turn_id: Schema.optional(Schema.Union([Schema.String, Schema.Null])),
});

const TranscriptRecord = Schema.Struct({
  id: Schema.optional(Schema.String),
  parentId: Schema.optional(Schema.NullOr(Schema.String)),
  agentId: Schema.optional(Schema.String),
  ephemeral: Schema.optional(Schema.Boolean),
  type: Schema.optional(Schema.String),
  timestamp: Schema.optional(Schema.String),
  cwd: Schema.optional(Schema.String),
  sessionId: Schema.optional(Schema.String),
  aiTitle: Schema.optional(Schema.String),
  customTitle: Schema.optional(Schema.String),
  isSidechain: Schema.optional(Schema.Boolean),
  isMeta: Schema.optional(Schema.Boolean),
  isCompactSummary: Schema.optional(Schema.Boolean),
  message: Schema.optional(TranscriptMessage),
  data: Schema.optional(
    Schema.Struct({
      sessionId: Schema.optional(Schema.String),
      version: Schema.optional(Schema.Number),
      selectedModel: Schema.optional(Schema.String),
      newModel: Schema.optional(Schema.String),
      model: Schema.optional(Schema.String),
      title: Schema.optional(Schema.String),
      content: Schema.optional(Schema.String),
      context: Schema.optional(Schema.Struct({ cwd: Schema.optional(Schema.String) })),
      fusion: Schema.optional(
        Schema.Struct({
          commitId: Schema.optional(Schema.String),
          conversationScope: Schema.optional(Schema.String),
        }),
      ),
    }),
  ),
  payload: Schema.optional(
    Schema.Struct({
      id: Schema.optional(Schema.String),
      session_id: Schema.optional(Schema.String),
      type: Schema.optional(Schema.String),
      role: Schema.optional(Schema.String),
      message: Schema.optional(Schema.String),
      model: Schema.optional(Schema.String),
      cwd: Schema.optional(Schema.String),
      content: Schema.optional(Schema.Array(TranscriptContentBlock)),
      internal_chat_message_metadata_passthrough: Schema.optional(Schema.Unknown),
    }),
  ),
});

const decodeClaudeSettings = Schema.decodeUnknownOption(ClaudeSettings);
const decodeCodexSettings = Schema.decodeUnknownOption(CodexSettings);
const decodeCopilotSettings = Schema.decodeUnknownOption(CopilotSettings);
const decodeTranscriptRecord = Schema.decodeUnknownOption(Schema.fromJsonString(TranscriptRecord));
const decodeTranscriptValue = Schema.decodeUnknownOption(TranscriptRecord);
const selectTranscriptPath = createTranscriptJsonSelector(TranscriptRecord);
const decodeCodexTurnMetadata = Schema.decodeUnknownOption(CodexTurnMetadata);
const decodeCopilotEnvelope = Schema.decodeUnknownOption(
  Schema.Struct({
    id: Schema.NonEmptyString,
    parentId: Schema.NullOr(Schema.NonEmptyString),
    timestamp: Schema.DateTimeUtcFromString,
    type: Schema.NonEmptyString,
  }),
);

type DecodedTranscriptRecord = typeof TranscriptRecord.Type;

const CopilotTranscriptRecord = Schema.Struct({
  id: TranscriptRecord.fields.id,
  parentId: TranscriptRecord.fields.parentId,
  agentId: TranscriptRecord.fields.agentId,
  ephemeral: TranscriptRecord.fields.ephemeral,
  type: TranscriptRecord.fields.type,
  timestamp: TranscriptRecord.fields.timestamp,
  data: Schema.optional(Schema.Unknown),
});
const decodeCopilotRecord = Schema.decodeUnknownOption(CopilotTranscriptRecord);
const decodeCopilotJsonRecord = Schema.decodeUnknownOption(
  Schema.fromJsonString(CopilotTranscriptRecord),
);
const copilotDataSchemas = {
  "session.start": Schema.Struct({
    sessionId: Schema.String,
    version: Schema.Number,
    selectedModel: Schema.optional(Schema.String),
    context: Schema.optional(Schema.Struct({ cwd: Schema.optional(Schema.String) })),
  }),
  "session.resume": Schema.Struct({ selectedModel: Schema.optional(Schema.String) }),
  "session.model_change": Schema.Struct({ newModel: Schema.NonEmptyString }),
  "session.title_changed": Schema.Struct({ title: Schema.NonEmptyString }),
  "user.message": Schema.Struct({ content: Schema.String }),
  "assistant.message": Schema.Struct({
    content: Schema.String,
    fusion: Schema.optional(
      Schema.Struct({
        commitId: Schema.optional(Schema.String),
        conversationScope: Schema.optional(Schema.String),
      }),
    ),
  }),
};

function normalizeCopilotRecord(
  record: typeof CopilotTranscriptRecord.Type,
): Option.Option<DecodedTranscriptRecord> {
  const { data: rawData, ...envelope } = record;
  const schema = Object.hasOwn(copilotDataSchemas, record.type ?? "")
    ? copilotDataSchemas[record.type as keyof typeof copilotDataSchemas]
    : undefined;
  if (schema === undefined || (record.ephemeral && record.type !== "session.title_changed")) {
    return Option.some(envelope);
  }
  return Schema.decodeUnknownOption(schema)(rawData).pipe(
    Option.map((data) => ({ ...envelope, data })),
  );
}

function decodeSessionRecord(
  source: AgentSessionSource,
  value: unknown,
  json = false,
): Option.Option<DecodedTranscriptRecord> {
  return source === "githubCopilot"
    ? (json ? decodeCopilotJsonRecord : decodeCopilotRecord)(value).pipe(
        Option.flatMap(normalizeCopilotRecord),
      )
    : (json ? decodeTranscriptRecord : decodeTranscriptValue)(value);
}

interface AgentSessionTranscriptMetadata {
  readonly source: AgentSessionSource;
  readonly providerInstanceId: ProviderInstanceId;
  readonly fallbackSessionId: string;
  readonly lastActiveAtMs: number;
}

export interface AgentSessionThreadMessage {
  readonly role: "user" | "assistant";
  readonly text: string;
  readonly createdAt: string;
}

export interface AgentSessionThread {
  readonly source: AgentSessionSource;
  readonly providerInstanceId: ProviderInstanceId;
  readonly providerSessionId: string;
  readonly title: string;
  readonly model: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly messages: ReadonlyArray<AgentSessionThreadMessage>;
}

export type AgentSessionRecentThread =
  | {
      readonly _tag: "Importable";
      readonly thread: AgentSessionThread;
      readonly source: AgentSessionImportSource;
    }
  | { readonly _tag: "AlreadyImported"; readonly source: AgentSessionImportSource }
  | { readonly _tag: "Duplicate"; readonly source: AgentSessionImportSource }
  | { readonly _tag: "Skipped" };

export class AgentSessionScanner extends Context.Service<
  AgentSessionScanner,
  {
    readonly scan: Effect.Effect<AgentSessionScanResult, AgentSessionScanError>;
    readonly recentThreads: (
      workspaceRoot: string,
      completedSources?: ReadonlyArray<AgentSessionImportSource>,
    ) => Stream.Stream<AgentSessionRecentThread, AgentSessionScanError>;
  }
>()("t3/project/AgentSessionScanner") {}

type AgentSessionSource = AgentSessionProjectCandidate["sources"][number];

interface RawCandidate {
  readonly cwd: string;
  readonly source: AgentSessionSource;
  readonly providerInstanceId: ProviderInstanceId;
  readonly threadCount: number;
  readonly lastActiveAtMs: number | null;
  readonly transcripts: ReadonlyArray<{
    readonly filePath: string;
    readonly mtimeMs: number | null;
    readonly copilotOrigin?: CopilotTranscriptOrigin;
  }>;
}

interface CopilotTranscriptOrigin {
  readonly canonicalRoot: string;
  readonly identity: TranscriptIdentity;
}

interface TranscriptCandidate {
  readonly filePath: string;
  readonly mtimeMs: number;
  readonly providerInstanceId: ProviderInstanceId;
  readonly size: number;
  readonly copilotOrigin?: CopilotTranscriptOrigin;
}

interface MetadataReadBudget {
  bytesRemaining: number;
  operationsRemaining: number;
  recordsRemaining: number;
  truncated: boolean;
}

function selectMetadataTranscripts(transcripts: ReadonlyArray<TranscriptCandidate>) {
  const selected: Array<TranscriptCandidate> = [];
  let pending = Array.from(
    Map.groupBy(transcripts, (transcript) => transcript.providerInstanceId).values(),
    (entries) => entries.values(),
  );
  while (pending.length > 0 && selected.length < MAX_TRANSCRIPTS_PER_SOURCE) {
    const nextRound: typeof pending = [];
    for (const iterator of pending) {
      if (selected.length === MAX_TRANSCRIPTS_PER_SOURCE) break;
      const next = iterator.next();
      if (next.done) continue;
      selected.push(next.value);
      nextRound.push(iterator);
    }
    pending = nextRound;
  }
  return selected;
}

function splitTranscriptRecords(contents: string, limit: number): string[] {
  const records = contents.endsWith("\n") ? contents.slice(0, -1) : contents;
  return records.split("\n", limit);
}

function isTextContentBlock(block: typeof TranscriptContentBlock.Type): boolean {
  return block.type === "text" || block.type === "input_text" || block.type === "output_text";
}

function extractText(
  content: string | ReadonlyArray<typeof TranscriptContentBlock.Type> | undefined,
): string {
  if (typeof content === "string") return content.trim();
  if (content === undefined) return "";
  return content
    .filter(isTextContentBlock)
    .map((block) => block.text?.trim() ?? "")
    .filter((text) => text.length > 0)
    .join("\n");
}

function normalizeTimestamp(value: string | undefined, fallback: string): string {
  if (value === undefined) return fallback;
  const parsed = DateTime.make(value);
  return Option.isSome(parsed) ? DateTime.formatIso(parsed.value) : fallback;
}

function codexTurnId(metadata: unknown): string | null {
  const decoded = decodeCodexTurnMetadata(metadata);
  if (
    Option.isNone(decoded) ||
    typeof decoded.value.turn_id !== "string" ||
    decoded.value.turn_id.trim().length === 0
  ) {
    return null;
  }
  return decoded.value.turn_id;
}

function isHiddenClaudeRecord(record: DecodedTranscriptRecord): boolean {
  return record.isSidechain === true || record.isMeta === true || record.isCompactSummary === true;
}

// Claude repeats session fields on records that need not be retained.
interface ClaudeFields {
  readonly sessionId: string | undefined;
  readonly title: string | undefined;
  readonly customTitle: string | null;
  readonly model: string | undefined;
}

const emptyClaudeFields: ClaudeFields = {
  sessionId: undefined,
  title: undefined,
  customTitle: null,
  model: undefined,
};

function foldClaudeFields(fields: ClaudeFields, record: DecodedTranscriptRecord): ClaudeFields {
  if (isHiddenClaudeRecord(record)) return fields;
  const model = record.message?.model?.trim();
  return {
    sessionId: record.sessionId?.trim() || fields.sessionId,
    title: record.aiTitle?.trim() || fields.title,
    // Claude flushes the AI title after the user's rename; an empty rename clears it.
    customTitle:
      record.customTitle === undefined ? fields.customTitle : record.customTitle.trim() || null,
    // Claude uses this sentinel for local error responses. It is not a
    // model ID that can be selected when the imported session resumes.
    model: model && model !== "<synthetic>" ? model : fields.model,
  };
}

// Codex records setup context as user text ahead of the real request. Skip
// these leading blocks when deriving a title; imported messages keep them.
const CODEX_TITLE_PREAMBLE =
  /^(?:\s*(?:<(recommended_plugins|environment_context|user_instructions|INSTRUCTIONS|in-app-browser-context)(?:\s[^>]*)?>[\s\S]*?<\/\1>|# AGENTS\.md instructions\b[^\n]*|## My request for Codex:))+/;

function deriveTitle(source: AgentSessionSource, text: string): string | undefined {
  const request = source === "codex" ? text.replace(CODEX_TITLE_PREAMBLE, "") : text;
  return request.trim().split("\n")[0]?.slice(0, 100).trim() || undefined;
}

export function parseAgentSessionTranscript(
  input: AgentSessionTranscriptMetadata & {
    readonly contents: string;
  },
  lines = splitTranscriptRecords(input.contents, MAX_IMPORT_RECORDS + 1),
): AgentSessionThread | null {
  if (lines.length > MAX_IMPORT_RECORDS) return null;
  const decoded = lines
    .filter((line) => line.trim().length > 0)
    .map((line) => decodeSessionRecord(input.source, line, true));
  if (input.source === "githubCopilot" && decoded.some(Option.isNone)) return null;
  const records = decoded.flatMap(Option.toArray);
  const claudeFields =
    input.source === "claudeAgent"
      ? records.reduce(foldClaudeFields, emptyClaudeFields)
      : emptyClaudeFields;
  return parseAgentSessionRecords(input, records, claudeFields);
}

function parseAgentSessionRecords(
  input: AgentSessionTranscriptMetadata,
  records: ReadonlyArray<DecodedTranscriptRecord>,
  claudeFields: ClaudeFields,
): AgentSessionThread | null {
  if (input.source === "githubCopilot") return parseCopilotRecords(input, records);
  const fallbackTimestamp = DateTime.formatIso(DateTime.makeUnsafe(input.lastActiveAtMs));
  // Claude filenames are session IDs. Codex rollout filenames include extra
  // timestamp text, so only transcript metadata can provide a resumable ID.
  let providerSessionId =
    input.source === "codex" ? "" : (claudeFields.sessionId ?? input.fallbackSessionId);
  const title = claudeFields.title ?? null;
  let model = claudeFields.model ?? null;
  let derivedTitle: string | undefined;
  let hasCodexSessionId = false;
  const messages: Array<AgentSessionThreadMessage & { readonly codexResponseUser: boolean }> = [];
  let firstUserMessage:
    | (AgentSessionThreadMessage & { readonly codexResponseUser: boolean })
    | undefined;
  const canonicalCodexResponseUserIndices = new Set<number>();
  let canonicalUserTextsInTurn = new Set<string>();
  let responseUsersInTurn: Array<{
    readonly index: number;
    readonly turnId: string;
    readonly text: string;
  }> = [];
  const finishCodexTurn = () => {
    const canonicalTurnIds = new Set(
      responseUsersInTurn.flatMap((responseUser) =>
        canonicalUserTextsInTurn.has(responseUser.text) ? [responseUser.turnId] : [],
      ),
    );
    for (const responseUser of responseUsersInTurn) {
      if (canonicalTurnIds.has(responseUser.turnId)) {
        canonicalCodexResponseUserIndices.add(responseUser.index);
      }
    }
    canonicalUserTextsInTurn = new Set();
    responseUsersInTurn = [];
  };
  if (input.source === "codex") {
    let recordIndex = -1;
    for (const record of records) {
      recordIndex += 1;
      if (
        record.type === "response_item" &&
        record.payload?.type === "message" &&
        record.payload.role === "assistant"
      ) {
        finishCodexTurn();
        continue;
      }
      if (record.type === "event_msg" && record.payload?.type === "user_message") {
        const text = record.payload.message?.trim() ?? "";
        if (text.length > 0) canonicalUserTextsInTurn.add(text);
        continue;
      }
      if (
        record.type === "response_item" &&
        record.payload?.type === "message" &&
        record.payload.role === "user"
      ) {
        const turnId = codexTurnId(record.payload.internal_chat_message_metadata_passthrough);
        const text = extractText(record.payload.content);
        if (turnId !== null && text.length > 0) {
          responseUsersInTurn.push({ index: recordIndex, turnId, text });
        }
      }
    }
    finishCodexTurn();
  }

  const retainMessage = (
    message: AgentSessionThreadMessage & { readonly codexResponseUser: boolean },
  ) => {
    if (firstUserMessage === undefined && message.role === "user") {
      firstUserMessage = message;
    }
    if (derivedTitle === undefined && message.role === "user") {
      derivedTitle = deriveTitle(input.source, message.text);
    }
    messages.push(message);
    if (messages.length > MAX_IMPORTED_MESSAGES) messages.shift();
  };

  const hasMatchingCodexEventInTurn = (text: string) => {
    const comparisonText = text.trim();
    for (let index = messages.length - 1; index >= 0; index--) {
      const message = messages[index];
      if (message?.role === "assistant") return false;
      if (
        message?.role === "user" &&
        !message.codexResponseUser &&
        message.text.trim() === comparisonText
      ) {
        return true;
      }
    }
    return false;
  };

  let recordIndex = -1;
  for (const record of records) {
    recordIndex += 1;
    if (input.source === "claudeAgent") {
      if (isHiddenClaudeRecord(record)) continue;
      if (record.type !== "user" && record.type !== "assistant") continue;
      const text = extractText(record.message?.content);
      if (text.length === 0) continue;
      retainMessage({
        role: record.type,
        text,
        createdAt: normalizeTimestamp(record.timestamp, fallbackTimestamp),
        codexResponseUser: false,
      });
      continue;
    }

    if (record.type === "session_meta") {
      const sessionId = record.payload?.id?.trim() || record.payload?.session_id?.trim();
      if (!hasCodexSessionId && sessionId) {
        providerSessionId = sessionId;
        hasCodexSessionId = true;
      }
      continue;
    }
    if (record.type === "turn_context" && record.payload?.model?.trim()) {
      model = record.payload.model.trim();
      continue;
    }
    if (record.type === "event_msg" && record.payload?.type === "user_message") {
      const text = record.payload.message ?? "";
      if (text.trim().length === 0) continue;
      // Codex can duplicate prompts across formats; remove only matching response copies.
      for (let index = messages.length - 1; index >= 0; index--) {
        const message = messages[index];
        if (message?.role === "assistant") break;
        if (message?.codexResponseUser === true && message.text.trim() === text.trim()) {
          if (firstUserMessage === message) firstUserMessage = undefined;
          messages.splice(index, 1);
          break;
        }
      }
      retainMessage({
        role: "user",
        text,
        createdAt: normalizeTimestamp(record.timestamp, fallbackTimestamp),
        codexResponseUser: false,
      });
      continue;
    }
    if (
      record.type !== "response_item" ||
      record.payload?.type !== "message" ||
      (record.payload.role !== "user" && record.payload.role !== "assistant")
    ) {
      continue;
    }

    const extractedText = extractText(record.payload.content);
    if (extractedText.length === 0) continue;
    if (record.payload.role === "user" && canonicalCodexResponseUserIndices.has(recordIndex)) {
      continue;
    }
    if (record.payload.role === "user" && hasMatchingCodexEventInTurn(extractedText)) {
      continue;
    }
    retainMessage({
      role: record.payload.role,
      text: extractedText,
      createdAt: normalizeTimestamp(record.timestamp, fallbackTimestamp),
      codexResponseUser: record.payload.role === "user",
    });
  }

  const visibleMessages = messages.map(
    ({ codexResponseUser: _codexResponseUser, ...message }) => message,
  );
  if (providerSessionId.trim().length === 0 || firstUserMessage === undefined) return null;
  const firstUserMessageRetained = messages.includes(firstUserMessage);
  const { codexResponseUser: _codexResponseUser, ...visibleFirstUserMessage } = firstUserMessage;
  const retainedMessages = firstUserMessageRetained
    ? visibleMessages
    : [visibleFirstUserMessage, ...visibleMessages.slice(-(MAX_IMPORTED_MESSAGES - 1))];

  return {
    source: input.source,
    providerInstanceId: input.providerInstanceId,
    providerSessionId,
    title: claudeFields.customTitle ?? title ?? derivedTitle ?? "Imported thread",
    model,
    createdAt: retainedMessages[0]?.createdAt ?? fallbackTimestamp,
    updatedAt: fallbackTimestamp,
    messages: retainedMessages,
  };
}

function parseCopilotRecords(
  input: AgentSessionTranscriptMetadata,
  records: ReadonlyArray<DecodedTranscriptRecord>,
): AgentSessionThread | null {
  const start = records.find((record) => record.type === "session.start" && !record.agentId);
  if (
    records[0] !== start ||
    start?.data?.version !== 1 ||
    start.data.sessionId !== input.fallbackSessionId ||
    records.some((record) => record.type === "session.snapshot_rewind")
  )
    return null;
  let title: string | undefined;
  let model = start.data.selectedModel ?? null;
  const messages: Array<AgentSessionThreadMessage> = [];
  const seen = new Set<string>();
  const fallback = DateTime.formatIso(DateTime.makeUnsafe(input.lastActiveAtMs));
  let predecessor: string | null = null;
  for (const record of records) {
    const envelope = decodeCopilotEnvelope(record);
    if (Option.isNone(envelope)) return null;
    if (record.ephemeral) {
      if (record.type === "session.title_changed" && !record.agentId) {
        if (!record.data?.title?.trim()) return null;
        title = record.data.title.trim();
      }
      continue;
    }
    const event = envelope.value;
    if (seen.has(event.id) || event.parentId !== predecessor) return null;
    seen.add(event.id);
    predecessor = event.id;
    if (
      (record.type === "user.message" || record.type === "assistant.message") &&
      record.data?.content === undefined
    )
      return null;
    if (record.agentId) continue;
    if (record.type === "session.start" && record !== start) return null;
    if (record.type === "session.title_changed") {
      if (!record.data?.title?.trim()) return null;
      title = record.data.title.trim();
    }
    if (record.type === "session.model_change") {
      if (!record.data?.newModel?.trim()) return null;
      model = record.data.newModel;
    }
    if (record.type === "session.model_deselected") model = null;
    if (record.type === "session.resume") {
      if (record.data === undefined) return null;
      model = record.data.selectedModel ?? model;
    }
    if (record.type !== "user.message" && record.type !== "assistant.message") continue;
    const text = record.data?.content;
    if (text === undefined || !text.trim()) continue;
    const fusion = record.data?.fusion;
    if (
      record.type === "assistant.message" &&
      fusion !== undefined &&
      (fusion.commitId === undefined ||
        (fusion.conversationScope !== undefined && fusion.conversationScope !== "root"))
    )
      continue;
    messages.push({
      role: record.type === "user.message" ? "user" : "assistant",
      text,
      createdAt: DateTime.formatIso(event.timestamp),
    });
  }
  const firstUser = messages.find((message) => message.role === "user");
  if (firstUser === undefined) return null;
  const retained =
    messages.length <= MAX_IMPORTED_MESSAGES
      ? messages
      : [firstUser, ...messages.slice(-(MAX_IMPORTED_MESSAGES - 1))];
  return {
    source: input.source,
    providerInstanceId: input.providerInstanceId,
    providerSessionId: input.fallbackSessionId,
    title: title ?? deriveTitle(input.source, firstUser.text) ?? "Imported Copilot history",
    model,
    createdAt: normalizeTimestamp(start.timestamp, retained[0]?.createdAt ?? fallback),
    updatedAt: fallback,
    messages: retained,
  };
}

function extractDecodedCwd(record: DecodedTranscriptRecord): string | null {
  const cwd =
    record.cwd?.trim() ||
    record.payload?.cwd?.trim() ||
    (record.type === "session.start" && !record.agentId
      ? record.data?.context?.cwd?.trim()
      : undefined);
  return cwd && cwd.length > 0 ? cwd : null;
}

function shouldRetainDecodedRecord(
  source: AgentSessionSource,
  record: DecodedTranscriptRecord,
): boolean {
  if (source === "githubCopilot") return true;
  if (source === "claudeAgent") {
    if (isHiddenClaudeRecord(record) || (record.type !== "user" && record.type !== "assistant")) {
      return false;
    }
    const content = record.message?.content;
    return typeof content === "string"
      ? content.trim().length > 0
      : (content?.some(
          (block) => isTextContentBlock(block) && (block.text?.trim().length ?? 0) > 0,
        ) ?? false);
  }
  if (extractDecodedCwd(record) !== null) return true;
  return (
    record.type === "session_meta" ||
    record.type === "turn_context" ||
    (record.type === "event_msg" && record.payload?.type === "user_message") ||
    (record.type === "response_item" &&
      record.payload?.type === "message" &&
      (record.payload.role === "user" || record.payload.role === "assistant"))
  );
}

function normalizeForWorktreeMatch(value: string, caseFold: boolean): string {
  const normalized = `${value.replaceAll("\\", "/")}/`;
  return caseFold ? normalized.toLowerCase() : normalized;
}

function isT3ManagedWorktree(
  candidatePath: string,
  worktreesDir: string,
  caseFold: boolean,
): boolean {
  const normalized = normalizeForWorktreeMatch(candidatePath, caseFold);
  return (
    normalized.startsWith(normalizeForWorktreeMatch(worktreesDir, caseFold)) ||
    normalized.includes("/.t3/worktrees/")
  );
}

// false stops metadata scanning for an excluded rollout, even if later records contain a cwd.
function extractCwd(line: string, source: AgentSessionSource): string | null | false {
  let parsed: unknown;
  try {
    parsed = JSON.parse(line);
  } catch {
    return null;
  }
  if (typeof parsed !== "object" || parsed === null) return null;

  const record = parsed as Record<string, unknown>;
  if (source === "githubCopilot") {
    const decoded = decodeSessionRecord(source, record);
    return Option.isSome(decoded) ? extractDecodedCwd(decoded.value) : null;
  }
  if (typeof record.cwd === "string" && record.cwd.trim().length > 0) {
    return record.cwd;
  }
  const payload = record.payload;
  if (typeof payload === "object" && payload !== null) {
    if (source === "codex" && record.type === "session_meta") {
      const sessionSource = (payload as Record<string, unknown>).source;
      if (
        typeof sessionSource === "object" &&
        sessionSource !== null &&
        !Array.isArray(sessionSource) &&
        (Object.hasOwn(sessionSource, "subagent") || Object.hasOwn(sessionSource, "subAgent"))
      ) {
        return false;
      }
    }
    const nested = (payload as Record<string, unknown>).cwd;
    if (typeof nested === "string" && nested.trim().length > 0) {
      return nested;
    }
  }
  return null;
}

function transcriptIdentity(filePath: string, stats: FileSystem.File.Info) {
  return {
    filePath,
    size: Number(stats.size),
    mtimeMs: Option.match(stats.mtime, { onNone: () => null, onSome: (date) => date.getTime() }),
    device: Number(stats.dev),
    inode: Option.match(stats.ino, { onNone: () => null, onSome: String }),
    birthtimeMs: Option.match(stats.birthtime, {
      onNone: () => null,
      onSome: (date) => date.getTime(),
    }),
  };
}

type TranscriptIdentity = Pick<
  AgentSessionImportSource,
  "filePath" | "size" | "mtimeMs" | "device" | "inode" | "birthtimeMs"
>;

const fileIdKey = (inode: TranscriptIdentity["inode"]) => (inode === null ? null : String(inode));

function sameTranscriptIdentity(left: TranscriptIdentity, right: TranscriptIdentity): boolean {
  // Unsafe legacy numbers may already have lost file ID precision.
  if (
    (typeof left.inode === "number" && !Number.isSafeInteger(left.inode)) ||
    (typeof right.inode === "number" && !Number.isSafeInteger(right.inode))
  ) {
    return false;
  }
  return (
    left.filePath === right.filePath &&
    left.size === right.size &&
    left.mtimeMs === right.mtimeMs &&
    left.device === right.device &&
    fileIdKey(left.inode) === fileIdKey(right.inode) &&
    left.birthtimeMs === right.birthtimeMs
  );
}

/** @public */
export const make = Effect.gen(function* () {
  const fileSystem = yield* FileSystem.FileSystem;
  // Concurrent client imports must not hold multiple selected-history budgets.
  const importReadLock = yield* Semaphore.make(1);
  const path = yield* Path.Path;
  const serverConfig = yield* ServerConfig.ServerConfig;
  const serverSettings = yield* ServerSettings.ServerSettingsService;
  const projectStore = yield* ProjectStore.ProjectStoreV2;
  const baseDir = path.resolve(serverConfig.baseDir);
  const worktreesDir = path.resolve(serverConfig.worktreesDir);
  const foldWorktreeCase = (yield* HostProcess.Platform) === "win32";
  const hostEnvironment = yield* HostProcess.Environment;
  const homeDir = yield* HostProcess.HomeDirectory;
  // `/private/tmp` is what macOS reports for sessions started in `/tmp`.
  const excludedProjectRoots = new Set(
    [homeDir, NodeOS.tmpdir(), "/tmp", "/private/tmp"].map((directory) =>
      normalizeProjectPathForComparison(path.resolve(directory)),
    ),
  );
  const excludedProjectAncestors = [
    path.join(homeDir, "Downloads"),
    path.join(homeDir, "Documents", "Codex"),
    yield* fileSystem.realPath(baseDir).pipe(Effect.orElseSucceed(() => baseDir)),
    yield* fileSystem.realPath(worktreesDir).pipe(Effect.orElseSucceed(() => worktreesDir)),
  ];

  const isExcludedProjectPath = (candidatePath: string) =>
    excludedProjectRoots.has(normalizeProjectPathForComparison(candidatePath)) ||
    excludedProjectAncestors.some((ancestor) =>
      normalizeForWorktreeMatch(candidatePath, foldWorktreeCase).startsWith(
        normalizeForWorktreeMatch(ancestor, foldWorktreeCase),
      ),
    ) ||
    normalizeForWorktreeMatch(candidatePath, foldWorktreeCase).startsWith(
      normalizeForWorktreeMatch(baseDir, foldWorktreeCase),
    ) ||
    isT3ManagedWorktree(candidatePath, worktreesDir, foldWorktreeCase);

  const listDirectory = (directory: string) =>
    fileSystem.readDirectory(directory).pipe(Effect.orElseSucceed((): ReadonlyArray<string> => []));

  const statOption = (target: string) =>
    fileSystem.stat(target).pipe(Effect.asSome, Effect.orElseSucceed(Option.none));

  const directoryIdentity = Effect.fn("AgentSessionScanner.directoryIdentity")(function* (
    target: string,
    knownStats?: FileSystem.File.Info,
  ) {
    const resolved = path.resolve(target);
    const stats = knownStats === undefined ? yield* statOption(resolved) : Option.some(knownStats);
    if (Option.isSome(stats) && Option.isSome(stats.value.ino) && stats.value.ino.value > 0n) {
      return `inode:${stats.value.dev}:${stats.value.ino.value}`;
    }
    const realPath = yield* fileSystem
      .realPath(resolved)
      .pipe(Effect.orElseSucceed(() => resolved));
    return `path:${normalizeProjectPathForComparison(realPath)}`;
  });

  const readGitIdentity = Effect.fn("AgentSessionScanner.readGitIdentity")(function* (
    directory: string,
  ): Effect.fn.Return<
    | { readonly _tag: "Repository"; readonly git: AgentSessionProjectGit | null }
    | { readonly _tag: "Worktree" }
    | { readonly _tag: "NotGit" }
  > {
    const gitPath = path.join(directory, ".git");
    const gitStats = yield* statOption(gitPath);
    if (Option.isNone(gitStats)) return { _tag: "NotGit" } as const;
    let gitDir = gitPath;
    if (gitStats.value.type !== "Directory") {
      const pointer = yield* fileSystem
        .readFileString(gitPath)
        .pipe(Effect.orElseSucceed(() => ""));
      const target = /^gitdir:\s*(.+)$/m.exec(pointer)?.[1]?.trim();
      if (target === undefined || target.length === 0) return { _tag: "NotGit" } as const;
      gitDir = path.resolve(directory, target);
    }
    const linkedWorktree =
      gitStats.value.type !== "Directory" && /[\\/]worktrees[\\/][^\\/]+[\\/]?$/.test(gitDir);
    if (linkedWorktree) {
      const commonDir = yield* fileSystem
        .readFileString(path.join(gitDir, "commondir"))
        .pipe(Effect.orElseSucceed(() => ""));
      if (commonDir.trim().length === 0) return { _tag: "Worktree" } as const;
      gitDir = path.resolve(gitDir, commonDir.trim());
    }
    const configText = yield* fileSystem
      .readFileString(path.join(gitDir, "config"))
      .pipe(Effect.orElseSucceed(() => ""));
    // Bare repositories have no main checkout, so offer their linked worktrees independently.
    if (linkedWorktree && !isBareGitConfig(configText)) return { _tag: "Worktree" } as const;
    const originUrl = parseOriginUrlFromGitConfig(configText);
    return {
      _tag: "Repository",
      git: {
        remoteKey:
          originUrl === null ? null : sourceControlDefinitions.repositoryKeyFromRemote(originUrl),
        repository: repositoryPathFromRemoteUrl(originUrl),
      },
    } as const;
  });

  const validateCopilotOrigin = Effect.fn("AgentSessionScanner.validateCopilotOrigin")(function* (
    filePath: string,
    origin: CopilotTranscriptOrigin | undefined,
    stats: FileSystem.File.Info,
  ) {
    if (origin === undefined) return true;
    const realFile = yield* fileSystem.realPath(filePath).pipe(Effect.option);
    const currentStats = yield* statOption(filePath);
    if (
      Option.isSome(realFile) &&
      Option.isSome(currentStats) &&
      realFile.value === filePath &&
      path.dirname(path.dirname(realFile.value)) === origin.canonicalRoot &&
      sameTranscriptIdentity(origin.identity, transcriptIdentity(filePath, stats)) &&
      sameTranscriptIdentity(origin.identity, transcriptIdentity(filePath, currentStats.value))
    )
      return true;
    yield* Effect.logWarning("Copilot transcript changed or escaped its discovered session root", {
      filePath,
    });
    return false;
  });

  const readCwd = Effect.fn("AgentSessionScanner.readCwd")(function* (
    source: AgentSessionSource,
    transcript: TranscriptCandidate,
    budget: MetadataReadBudget,
  ) {
    if (transcript.size === 0) return null;
    if (
      budget.bytesRemaining === 0 ||
      budget.operationsRemaining < 2 ||
      budget.recordsRemaining === 0
    ) {
      budget.truncated = true;
      return null;
    }
    budget.operationsRemaining -= 1;
    return yield* Effect.scoped(
      fileSystem.open(transcript.filePath, { flag: "r" }).pipe(
        Effect.flatMap((file) =>
          Effect.gen(function* () {
            if (
              !(yield* validateCopilotOrigin(
                transcript.filePath,
                transcript.copilotOrigin,
                yield* file.stat,
              ))
            )
              return null;
            const decoder = new TextDecoder();
            let remaining = "";
            let bytesRead = 0;
            let recordsRead = 0;
            const maxBytes = Math.min(MAX_TRANSCRIPT_SCAN_BYTES, transcript.size);
            const reserveRecord = () => {
              if (
                recordsRead === MAX_METADATA_RECORDS_PER_TRANSCRIPT ||
                budget.recordsRemaining === 0
              ) {
                budget.truncated = true;
                return false;
              }
              recordsRead += 1;
              budget.recordsRemaining -= 1;
              return true;
            };
            const readLastRecord = () => {
              const record = remaining + decoder.decode();
              return record.length === 0 || !reserveRecord()
                ? null
                : extractCwd(record.trim(), source);
            };

            while (bytesRead < maxBytes) {
              if (budget.bytesRemaining === 0 || budget.operationsRemaining === 0) {
                budget.truncated = true;
                return null;
              }
              const readSize = Math.min(
                METADATA_READ_BYTES,
                maxBytes - bytesRead,
                budget.bytesRemaining,
              );
              budget.operationsRemaining -= 1;
              budget.bytesRemaining -= readSize;
              const next = yield* file.readAlloc(readSize);
              if (Option.isNone(next)) {
                return readLastRecord();
              }

              bytesRead += next.value.byteLength;
              remaining += decoder.decode(next.value, { stream: true });
              const lines = remaining.split("\n");
              remaining = lines.pop() ?? "";

              for (const line of lines) {
                if (!reserveRecord()) return null;
                const cwd = extractCwd(line.trim(), source);
                if (cwd !== null) return cwd;
              }
            }

            if (bytesRead < transcript.size) {
              budget.truncated = true;
              return null;
            }
            return readLastRecord();
          }),
        ),
      ),
    ).pipe(Effect.orElseSucceed(() => null));
  });

  const readTranscript = Effect.fn("AgentSessionScanner.readTranscript")(function* (
    filePath: string,
    expected: ReturnType<typeof transcriptIdentity>,
    recordLimit: number,
    source: AgentSessionSource,
    copilotOrigin?: CopilotTranscriptOrigin,
  ) {
    if (expected.size > MAX_IMPORTED_TRANSCRIPT_BYTES) return null;

    return yield* Effect.scoped(
      fileSystem.open(filePath, { flag: "r" }).pipe(
        Effect.flatMap((file) =>
          Effect.gen(function* () {
            const openedStats = yield* file.stat;
            if (
              !sameTranscriptIdentity(expected, transcriptIdentity(filePath, openedStats)) ||
              !(yield* validateCopilotOrigin(filePath, copilotOrigin, openedStats))
            ) {
              return null;
            }
            const records: Array<DecodedTranscriptRecord> = [];
            let cwd = Option.none<string>();
            let claudeFields = emptyClaudeFields;
            let historyBytes = 0;
            let recordBytes = 0;
            let recordCount = 0;
            let bytesRead = 0;
            const reserve = (bytes: number) => {
              recordBytes += bytes;
              if (historyBytes + recordBytes > MAX_IMPORT_HISTORY_BYTES) {
                throw new TranscriptJsonLimitError(
                  "Transcript selected history exceeds the 32 MiB memory budget",
                );
              }
            };
            let reader = createTranscriptJsonReader(reserve, selectTranscriptPath);
            let decoder = new TextDecoder();
            let recordStarted = false;

            const finishRecord = () => {
              reader.write(decoder.decode());
              recordCount += 1;
              if (recordCount > recordLimit) return false;
              const decoded = decodeSessionRecord(source, reader.finish());
              if (source === "githubCopilot" && Option.isNone(decoded)) return false;
              if (Option.isSome(decoded)) {
                if (Option.isNone(cwd)) cwd = Option.fromNullOr(extractDecodedCwd(decoded.value));
                if (source === "claudeAgent") {
                  claudeFields = foldClaudeFields(claudeFields, decoded.value);
                }
                if (shouldRetainDecodedRecord(source, decoded.value)) {
                  records.push(decoded.value);
                  historyBytes += recordBytes;
                }
              }
              recordBytes = 0;
              reader = createTranscriptJsonReader(reserve, selectTranscriptPath);
              decoder = new TextDecoder();
              recordStarted = false;
              return true;
            };

            while (bytesRead < expected.size) {
              const next = yield* file.readAlloc(
                Math.min(TRANSCRIPT_PREFIX_BYTES, expected.size - bytesRead),
              );
              if (Option.isNone(next)) {
                return null;
              }

              bytesRead += next.value.byteLength;
              const withinBudget = yield* Effect.try(() => {
                let start = 0;
                while (start < next.value.byteLength) {
                  const newline = next.value.indexOf(10, start);
                  const end = newline === -1 ? next.value.byteLength : newline;
                  recordStarted = true;
                  reader.write(decoder.decode(next.value.subarray(start, end), { stream: true }));
                  if (newline === -1) break;
                  if (!finishRecord()) return false;
                  start = newline + 1;
                }
                return true;
              });
              if (!withinBudget) return null;
            }

            if (recordStarted && !(yield* Effect.try(finishRecord))) return null;
            const finalStats = yield* file.stat;
            return sameTranscriptIdentity(expected, transcriptIdentity(filePath, finalStats)) &&
              (yield* validateCopilotOrigin(filePath, copilotOrigin, finalStats))
              ? { records, recordCount, cwd, claudeFields }
              : null;
          }),
        ),
      ),
    ).pipe(
      Effect.catch((cause) =>
        Effect.logWarning("Could not read imported transcript", { filePath, cause }).pipe(
          Effect.as(null),
        ),
      ),
    );
  });

  const resolveClaudeConfigDir = (homePath: string, environmentHome?: string): string => {
    const configured = homePath.trim();
    if (configured.length > 0) {
      return path.resolve(expandHomePath(configured, homeDir));
    }
    const fromEnvironment = environmentHome?.trim() ?? "";
    if (fromEnvironment.length > 0) {
      return path.resolve(expandHomePath(fromEnvironment, homeDir));
    }
    return path.join(homeDir, ".claude");
  };

  const discoverClaudeTranscripts = Effect.fn("AgentSessionScanner.discoverClaudeTranscripts")(
    function* (homePath: string, providerInstanceId: ProviderInstanceId, operationBudget: number) {
      const projectsDir = path.join(homePath, "projects");
      let operationsRemaining = operationBudget;
      let truncated = false;
      const readDirectory = (directory: string) => {
        if (operationsRemaining <= 0) {
          truncated = true;
          return Effect.succeed<ReadonlyArray<string>>([]);
        }
        operationsRemaining -= 1;
        return listDirectory(directory);
      };
      const projectDirectories = yield* readDirectory(projectsDir);
      const transcripts: Array<TranscriptCandidate> = [];

      for (const projectDirectory of projectDirectories) {
        if (operationsRemaining <= 0) {
          truncated = true;
          break;
        }
        const directory = path.join(projectsDir, projectDirectory);
        const directoryTranscripts = (yield* readDirectory(directory))
          .filter((entry) => entry.endsWith(".jsonl"))
          .map((entry) => path.join(directory, entry));

        for (const filePath of directoryTranscripts) {
          if (operationsRemaining <= 0) {
            truncated = true;
            break;
          }
          operationsRemaining -= 1;
          const stats = yield* statOption(filePath);
          if (
            Option.isNone(stats) ||
            stats.value.type !== "File" ||
            Option.isNone(stats.value.mtime)
          ) {
            continue;
          }
          transcripts.push({
            filePath,
            mtimeMs: stats.value.mtime.value.getTime(),
            providerInstanceId,
            size: Number(stats.value.size),
          });
        }
      }
      return { transcripts, truncated };
    },
  );

  const discoverCodexTranscripts = Effect.fn("AgentSessionScanner.discoverCodexTranscripts")(
    function* (homePath: string, providerInstanceId: ProviderInstanceId, operationBudget: number) {
      const sessionsDir = path.join(homePath, "sessions");

      const transcripts: Array<TranscriptCandidate> = [];
      let operationsRemaining = operationBudget;
      let truncated = false;
      const readDirectory = (directory: string) => {
        if (operationsRemaining <= 0) {
          truncated = true;
          return Effect.succeed<ReadonlyArray<string>>([]);
        }
        operationsRemaining -= 1;
        return listDirectory(directory);
      };
      for (const year of (yield* readDirectory(sessionsDir)).toSorted().toReversed()) {
        if (operationsRemaining <= 0) {
          truncated = true;
          break;
        }
        for (const month of (yield* readDirectory(path.join(sessionsDir, year)))
          .toSorted()
          .toReversed()) {
          if (operationsRemaining <= 0) {
            truncated = true;
            break;
          }
          for (const day of (yield* readDirectory(path.join(sessionsDir, year, month)))
            .toSorted()
            .toReversed()) {
            if (operationsRemaining <= 0) {
              truncated = true;
              break;
            }
            const directory = path.join(sessionsDir, year, month, day);
            for (const entry of (yield* readDirectory(directory)).toSorted().toReversed()) {
              if (!entry.startsWith("rollout-") || !entry.endsWith(".jsonl")) continue;
              if (operationsRemaining <= 0) {
                truncated = true;
                break;
              }
              const filePath = path.join(directory, entry);
              operationsRemaining -= 1;
              const stats = yield* statOption(filePath);
              if (
                Option.isSome(stats) &&
                stats.value.type === "File" &&
                Option.isSome(stats.value.mtime)
              ) {
                transcripts.push({
                  filePath,
                  mtimeMs: stats.value.mtime.value.getTime(),
                  providerInstanceId,
                  size: Number(stats.value.size),
                });
              }
            }
          }
        }
      }
      return { transcripts, truncated };
    },
  );

  const discoverCopilotTranscripts = Effect.fn("AgentSessionScanner.discoverCopilotTranscripts")(
    function* (homePath: string, providerInstanceId: ProviderInstanceId, operationBudget: number) {
      const sessionsDir = path.join(homePath, "session-state");
      const root = yield* fileSystem.realPath(sessionsDir).pipe(Effect.option);
      if (Option.isNone(root)) return { transcripts: [], truncated: false };
      const entries = yield* listDirectory(root.value);
      const transcripts: Array<TranscriptCandidate> = [];
      let remaining = operationBudget - 1;
      for (const entry of entries) {
        if (remaining < 2) break;
        remaining -= 2;
        const filePath = path.join(root.value, entry, "events.jsonl");
        const realFile = yield* fileSystem.realPath(filePath).pipe(Effect.option);
        if (Option.isNone(realFile) || realFile.value !== filePath) continue;
        const stats = yield* statOption(filePath);
        if (Option.isNone(stats) || stats.value.type !== "File" || Option.isNone(stats.value.mtime))
          continue;
        transcripts.push({
          filePath,
          mtimeMs: stats.value.mtime.value.getTime(),
          providerInstanceId,
          size: Number(stats.value.size),
          copilotOrigin: {
            canonicalRoot: root.value,
            identity: transcriptIdentity(filePath, stats.value),
          },
        });
      }
      return { transcripts, truncated: entries.length * 2 > operationBudget - 1 };
    },
  );

  const groupTranscriptsByCwd = Effect.fn("AgentSessionScanner.groupTranscriptsByCwd")(function* (
    source: AgentSessionSource,
    transcripts: ReadonlyArray<TranscriptCandidate>,
    budget: MetadataReadBudget,
  ) {
    const byOwnerAndCwd = new Map<
      string,
      {
        cwd: string;
        providerInstanceId: ProviderInstanceId;
        lastActiveAtMs: number;
        transcripts: Array<TranscriptCandidate>;
      }
    >();

    for (const transcript of transcripts) {
      const cwd = yield* readCwd(source, transcript, budget);
      if (cwd === null || cwd === false) continue;
      const key = `${transcript.providerInstanceId}\0${cwd}`;
      const existing = byOwnerAndCwd.get(key);
      if (existing) {
        existing.lastActiveAtMs = Math.max(existing.lastActiveAtMs, transcript.mtimeMs);
        existing.transcripts.push(transcript);
      } else {
        byOwnerAndCwd.set(key, {
          cwd,
          providerInstanceId: transcript.providerInstanceId,
          lastActiveAtMs: transcript.mtimeMs,
          transcripts: [transcript],
        });
      }
    }

    return Array.from(byOwnerAndCwd.values(), (group): RawCandidate => ({
      cwd: group.cwd,
      source,
      providerInstanceId: group.providerInstanceId,
      threadCount: group.transcripts.length,
      lastActiveAtMs: group.lastActiveAtMs,
      transcripts: group.transcripts,
    }));
  });

  const collectCandidates = Effect.fn("AgentSessionScanner.collectCandidates")(function* () {
    const settings = yield* serverSettings.getSettings.pipe(
      Effect.mapError((cause) => new AgentSessionScanError({ operation: "read-settings", cause })),
    );

    const raw: Array<RawCandidate> = [];
    let truncated = false;

    for (const source of ["claudeAgent", "codex", "githubCopilot"] as const) {
      const instances: Array<{
        readonly instanceId: ProviderInstanceId;
        readonly config: ProviderInstanceConfig;
      }> = Object.entries(settings.providerInstances)
        .filter(
          ([, instance]) => instance.driver === source && resolveProviderInstanceEnabled(instance),
        )
        .map(([instanceId, config]) => ({
          instanceId: ProviderInstanceId.make(instanceId),
          config,
        }));
      if (!Object.hasOwn(settings.providerInstances, source)) {
        const defaultInstance = {
          instanceId: ProviderInstanceId.make(source),
          config: { driver: ProviderDriverKind.make(source) },
        };
        if (resolveProviderInstanceEnabled(defaultInstance.config)) {
          instances.push(defaultInstance);
        }
      }

      instances.sort((left, right) => {
        const leftDefault = left.instanceId === source ? 0 : 1;
        const rightDefault = right.instanceId === source ? 0 : 1;
        return leftDefault - rightDefault;
      });
      const homes: Array<{ homePath: string; providerInstanceId: ProviderInstanceId }> = [];
      const seenHomes = new Set<string>();
      for (const { instanceId, config: instance } of instances) {
        const homeVariable =
          source === "claudeAgent"
            ? "CLAUDE_CONFIG_DIR"
            : source === "codex"
              ? "CODEX_HOME"
              : "COPILOT_HOME";
        const environmentHome =
          instance.environment?.findLast((variable) => variable.name === homeVariable)?.value ??
          hostEnvironment[homeVariable];

        let homePath: string;
        if (source === "claudeAgent") {
          const config = decodeClaudeSettings(instance.config ?? {});
          if (Option.isNone(config)) continue;
          homePath = resolveClaudeConfigDir(config.value.homePath, environmentHome);
        } else if (source === "codex") {
          const config = decodeCodexSettings(instance.config ?? {});
          if (Option.isNone(config)) continue;
          const codexSettings =
            config.value.homePath.trim().length === 0 &&
            config.value.shadowHomePath.trim().length === 0 &&
            environmentHome?.trim()
              ? { ...config.value, homePath: environmentHome }
              : config.value;
          const layout = yield* resolveCodexHomeLayout(codexSettings).pipe(
            Effect.provideService(Path.Path, path),
          );
          homePath = layout.sharedHomePath;
        } else {
          const config = decodeCopilotSettings(instance.config ?? {});
          if (Option.isNone(config)) continue;
          const environment = {
            ...hostEnvironment,
            ...Object.fromEntries(
              instance.environment?.map(({ name, value }) => [name, value]) ?? [],
            ),
          };
          const hostHome = environment.HOME || environment.USERPROFILE || homeDir;
          const configured =
            config.value.homePath.trim() ||
            environmentHome?.trim() ||
            path.join(hostHome, ".copilot");
          homePath = path.resolve(expandHomePath(configured, hostHome));
        }

        const homeKey = `${source}\0${yield* directoryIdentity(homePath)}`;
        if (seenHomes.has(homeKey)) continue;
        seenHomes.add(homeKey);
        homes.push({ homePath, providerInstanceId: instanceId });
      }

      const transcriptCandidates: Array<TranscriptCandidate> = [];
      const baseOperationBudget = Math.floor(
        MAX_DISCOVERY_OPERATIONS_PER_SOURCE / Math.max(1, homes.length),
      );
      const extraOperationBudgets = MAX_DISCOVERY_OPERATIONS_PER_SOURCE % Math.max(1, homes.length);
      for (const [index, home] of homes.entries()) {
        const operationBudget = baseOperationBudget + (index < extraOperationBudgets ? 1 : 0);
        if (operationBudget === 0) {
          truncated = true;
          continue;
        }
        const discovered = yield* source === "claudeAgent"
          ? discoverClaudeTranscripts(home.homePath, home.providerInstanceId, operationBudget)
          : source === "codex"
            ? discoverCodexTranscripts(home.homePath, home.providerInstanceId, operationBudget)
            : discoverCopilotTranscripts(home.homePath, home.providerInstanceId, operationBudget);
        truncated ||= discovered.truncated;
        transcriptCandidates.push(...discovered.transcripts);
      }

      transcriptCandidates.sort(
        (left, right) =>
          right.mtimeMs - left.mtimeMs || left.filePath.localeCompare(right.filePath),
      );
      if (transcriptCandidates.length > MAX_TRANSCRIPTS_PER_SOURCE) {
        truncated = true;
      }
      const selectedTranscripts = selectMetadataTranscripts(transcriptCandidates);
      const metadataBudget: MetadataReadBudget = {
        bytesRemaining: MAX_METADATA_BYTES_PER_SOURCE,
        operationsRemaining: MAX_METADATA_OPERATIONS_PER_SOURCE,
        recordsRemaining: MAX_METADATA_RECORDS_PER_SOURCE,
        truncated: false,
      };
      raw.push(...(yield* groupTranscriptsByCwd(source, selectedTranscripts, metadataBudget)));
      truncated ||= metadataBudget.truncated;
    }

    return { candidates: raw, truncated };
  });

  let cachedCandidates: ReadonlyArray<RawCandidate> | null = null;

  const scan: AgentSessionScanner["Service"]["scan"] = Effect.gen(function* () {
    const { candidates: raw, truncated } = yield* collectCandidates();
    cachedCandidates = raw;

    const merged = new Map<
      string,
      {
        path: string;
        sources: Array<AgentSessionSource>;
        threadCount: number;
        lastActiveAtMs: number | null;
        git: AgentSessionProjectGit | null;
      }
    >();
    const directoryKeys = new Map<string, string>();
    const gitIdentities = new Map<string, AgentSessionProjectGit | null>();

    for (const candidate of raw) {
      const expanded = expandHomePath(candidate.cwd.trim(), homeDir);
      if (!path.isAbsolute(expanded)) continue;
      const resolved = path.resolve(expanded);
      if (isExcludedProjectPath(resolved)) continue;
      let key = directoryKeys.get(resolved);
      if (key === undefined) {
        const stats = yield* statOption(resolved);
        if (Option.isNone(stats) || stats.value.type !== "Directory") {
          directoryKeys.set(resolved, "");
          continue;
        }
        const realPath = yield* fileSystem
          .realPath(resolved)
          .pipe(Effect.orElseSucceed(() => resolved));
        // Symlinks can disguise excluded worktree paths; re-check their targets.
        if (isExcludedProjectPath(realPath)) {
          key = "";
        } else {
          const gitIdentity = yield* readGitIdentity(resolved);
          if (gitIdentity._tag === "Worktree") {
            key = "";
          } else {
            key = yield* directoryIdentity(resolved, stats.value);
            gitIdentities.set(key, gitIdentity._tag === "Repository" ? gitIdentity.git : null);
          }
        }
        directoryKeys.set(resolved, key);
      }
      if (key === "") continue;

      const existing = merged.get(key);
      if (!existing) {
        merged.set(key, {
          path: resolved,
          sources: [candidate.source],
          threadCount: candidate.threadCount,
          lastActiveAtMs: candidate.lastActiveAtMs,
          git: gitIdentities.get(key) ?? null,
        });
        continue;
      }
      if (!existing.sources.includes(candidate.source)) {
        existing.sources.push(candidate.source);
      }
      existing.threadCount += candidate.threadCount;
      existing.lastActiveAtMs =
        existing.lastActiveAtMs === null || candidate.lastActiveAtMs === null
          ? (existing.lastActiveAtMs ?? candidate.lastActiveAtMs)
          : Math.max(existing.lastActiveAtMs, candidate.lastActiveAtMs);
    }

    // Resolve persisted roots too; transcripts may use different symlinks to the same directory.
    const importedProjects = yield* projectStore
      .listShells()
      .pipe(
        Effect.mapError(
          (cause) => new AgentSessionScanError({ operation: "read-projects", cause }),
        ),
      );
    const importedProjectsByRoot = new Map<string, (typeof importedProjects)[number]>();
    for (const project of importedProjects) {
      const projectRoot = path.resolve(expandHomePath(project.workspaceRoot, homeDir));
      importedProjectsByRoot.set(normalizeProjectPathForComparison(projectRoot), project);
      importedProjectsByRoot.set(yield* directoryIdentity(projectRoot), project);
    }

    const candidates: Array<AgentSessionProjectCandidate> = [];
    for (const [key, entry] of merged.entries()) {
      const importedProject =
        importedProjectsByRoot.get(normalizeProjectPathForComparison(entry.path)) ??
        importedProjectsByRoot.get(key);
      const candidatePath = importedProject?.workspaceRoot ?? entry.path;
      candidates.push({
        path: candidatePath,
        title: path.basename(candidatePath) || candidatePath,
        ...(importedProject === undefined ? {} : { projectId: importedProject.id }),
        sources: entry.sources,
        threadCount: entry.threadCount,
        lastActiveAt:
          entry.lastActiveAtMs === null
            ? null
            : DateTime.formatIso(DateTime.makeUnsafe(entry.lastActiveAtMs)),
        alreadyImported: importedProject !== undefined,
        git: entry.git,
      });
    }

    candidates.sort((left, right) => {
      if (left.lastActiveAt === right.lastActiveAt) return left.path.localeCompare(right.path);
      if (left.lastActiveAt === null) return 1;
      if (right.lastActiveAt === null) return -1;
      return right.lastActiveAt.localeCompare(left.lastActiveAt);
    });

    return {
      candidates,
      scannedAt: DateTime.formatIso(yield* DateTime.now),
      ...(truncated ? { truncated: true } : {}),
    };
  });

  const prepareRecentThreads = Effect.fn("AgentSessionScanner.prepareRecentThreads")(function* (
    workspaceRoot: string,
    completedSources: ReadonlyArray<AgentSessionImportSource>,
  ) {
    const root = path.resolve(expandHomePath(workspaceRoot, homeDir));
    const realRoot = yield* fileSystem.realPath(root).pipe(Effect.orElseSucceed(() => root));
    if (isExcludedProjectPath(root) || isExcludedProjectPath(realRoot)) return Stream.empty;
    const rootIdentity = yield* directoryIdentity(root);
    const nowMs = DateTime.toEpochMillis(yield* DateTime.now);
    const cutoffMs = nowMs - RECENT_THREAD_WINDOW_MS;

    const candidates = cachedCandidates ?? (yield* collectCandidates()).candidates;
    cachedCandidates = candidates;

    const eligibleTranscripts: Array<{
      readonly candidate: RawCandidate;
      readonly transcript: RawCandidate["transcripts"][number] & { readonly mtimeMs: number };
    }> = [];
    for (const candidate of candidates) {
      const expanded = expandHomePath(candidate.cwd.trim(), homeDir);
      if (!path.isAbsolute(expanded)) continue;
      const resolved = path.resolve(expanded);
      if ((yield* directoryIdentity(resolved)) !== rootIdentity) continue;

      for (const transcript of candidate.transcripts) {
        if (
          transcript.mtimeMs === null ||
          transcript.mtimeMs < cutoffMs ||
          transcript.mtimeMs > nowMs
        ) {
          continue;
        }
        eligibleTranscripts.push({
          candidate,
          transcript: { ...transcript, mtimeMs: transcript.mtimeMs },
        });
      }
    }

    eligibleTranscripts.sort((left, right) => {
      if (left.transcript.mtimeMs !== right.transcript.mtimeMs) {
        return right.transcript.mtimeMs - left.transcript.mtimeMs;
      }
      return left.transcript.filePath.localeCompare(right.transcript.filePath);
    });

    const completedByFile = Map.groupBy(
      completedSources,
      (source) => `${source.providerInstanceId}\0${source.filePath}`,
    );
    const importedSessions = new Set<string>();
    let bytesRemaining = MAX_IMPORT_BYTES;
    let transcriptsRemaining = MAX_IMPORT_TRANSCRIPTS;
    let recordsRemaining = MAX_IMPORT_RECORDS;
    return Stream.fromIteratorSucceed(eligibleTranscripts.values(), 1).pipe(
      Stream.mapEffect(({ candidate, transcript }) =>
        Effect.gen(function* () {
          const completed = completedByFile.get(
            `${candidate.providerInstanceId}\0${transcript.filePath}`,
          );
          if (
            completed === undefined &&
            (transcriptsRemaining === 0 || bytesRemaining === 0 || recordsRemaining === 0)
          ) {
            return Option.some<AgentSessionRecentThread>({ _tag: "Skipped" });
          }
          const stats = yield* statOption(transcript.filePath);
          if (Option.isNone(stats) || stats.value.type !== "File") {
            return Option.some<AgentSessionRecentThread>({ _tag: "Skipped" });
          }
          if (
            !(yield* validateCopilotOrigin(
              transcript.filePath,
              transcript.copilotOrigin,
              stats.value,
            ))
          )
            return Option.some<AgentSessionRecentThread>({ _tag: "Skipped" });
          const identity = transcriptIdentity(transcript.filePath, stats.value);
          const completedSource = completed?.find(
            (source) =>
              source.provider === candidate.source && sameTranscriptIdentity(source, identity),
          );
          if (completedSource !== undefined) {
            const sessionKey = `${completedSource.providerInstanceId}\0${completedSource.providerSessionId}`;
            if (importedSessions.has(sessionKey)) return Option.none<AgentSessionRecentThread>();
            importedSessions.add(sessionKey);
            return Option.some<AgentSessionRecentThread>({
              _tag: "AlreadyImported",
              source: completedSource,
            });
          }
          if (
            transcriptsRemaining === 0 ||
            recordsRemaining === 0 ||
            identity.size > MAX_IMPORTED_TRANSCRIPT_BYTES ||
            identity.size > bytesRemaining
          ) {
            return Option.some<AgentSessionRecentThread>({ _tag: "Skipped" });
          }
          transcriptsRemaining -= 1;
          bytesRemaining -= identity.size;
          const snapshot = yield* readTranscript(
            transcript.filePath,
            identity,
            recordsRemaining,
            candidate.source,
            transcript.copilotOrigin,
          );
          if (snapshot === null) {
            return Option.some<AgentSessionRecentThread>({ _tag: "Skipped" });
          }
          recordsRemaining -= snapshot.recordCount;

          if (Option.isNone(snapshot.cwd)) {
            return Option.some<AgentSessionRecentThread>({ _tag: "Skipped" });
          }
          const expandedCwd = expandHomePath(snapshot.cwd.value.trim(), homeDir);
          if (
            !path.isAbsolute(expandedCwd) ||
            (yield* directoryIdentity(path.resolve(expandedCwd))) !== rootIdentity
          ) {
            return Option.some<AgentSessionRecentThread>({ _tag: "Skipped" });
          }

          const parsedThread = parseAgentSessionRecords(
            {
              source: candidate.source,
              providerInstanceId: candidate.providerInstanceId,
              fallbackSessionId:
                candidate.source === "githubCopilot"
                  ? path.basename(path.dirname(transcript.filePath))
                  : path.basename(transcript.filePath, ".jsonl"),
              lastActiveAtMs: transcript.mtimeMs,
            },
            snapshot.records,
            snapshot.claudeFields,
          );
          if (parsedThread === null) {
            return Option.some<AgentSessionRecentThread>({ _tag: "Skipped" });
          }

          const source: AgentSessionImportSource = {
            ...identity,
            provider: parsedThread.source,
            providerInstanceId: parsedThread.providerInstanceId,
            providerSessionId: parsedThread.providerSessionId,
          };
          const sessionKey = `${parsedThread.providerInstanceId}\0${parsedThread.providerSessionId}`;
          if (importedSessions.has(sessionKey)) {
            return Option.some<AgentSessionRecentThread>({ _tag: "Duplicate", source });
          }
          importedSessions.add(sessionKey);
          return Option.some<AgentSessionRecentThread>({
            _tag: "Importable",
            thread: parsedThread,
            source,
          });
        }).pipe(importReadLock.withPermits(1)),
      ),
      Stream.map(Option.toArray),
      Stream.flattenIterable,
    );
  });

  const recentThreads: AgentSessionScanner["Service"]["recentThreads"] = (
    workspaceRoot,
    completedSources = [],
  ) => Stream.unwrap(prepareRecentThreads(workspaceRoot, completedSources));

  return AgentSessionScanner.of({ scan, recentThreads });
});

export const layer = Layer.effect(AgentSessionScanner, make);
