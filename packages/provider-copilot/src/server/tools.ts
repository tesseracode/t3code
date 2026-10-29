import type { SessionEvent } from "@github/copilot-sdk";
import type { OrchestrationV2TurnItem } from "@t3tools/contracts";

type ToolStart = Extract<SessionEvent, { type: "tool.execution_start" }>["data"];
type Base = Omit<
  Extract<OrchestrationV2TurnItem, { type: "dynamic_tool" }>,
  "type" | "toolName" | "input" | "output"
>;
const sensitive = /authorization|cookie|credential|password|secret|token/iu;
const binary = /^(?:base64|bytes|binaryResultsForLlm|contents)$/u;

export function boundedToolJson(value: unknown): string {
  try {
    return (
      JSON.stringify(value, (key, entry: unknown) => {
        if (sensitive.test(key)) return "[redacted]";
        if (binary.test(key)) return "[omitted]";
        if (typeof entry === "string") return entry.slice(0, 4_000);
        if (Array.isArray(entry)) return entry.slice(0, 64);
        return entry;
      }) ?? ""
    ).slice(0, 8_000);
  } catch {
    return "[unavailable]";
  }
}

function argument(data: ToolStart, keys: ReadonlyArray<string>): string | undefined {
  for (const key of keys) {
    const value = data.arguments?.[key];
    if (typeof value === "string" && value.trim()) return value.slice(0, 8_000);
  }
  return undefined;
}

export function nativeToolItem(base: Base, data: ToolStart): OrchestrationV2TurnItem {
  const toolName = data.toolName.toLowerCase();
  if (!data.mcpServerName && /shell|bash|powershell|command/u.test(toolName)) {
    return {
      ...base,
      type: "command_execution",
      input: argument(data, ["command", "cmd", "script"]) ?? data.toolName,
    };
  }
  const path = argument(data, ["path", "filePath", "filename", "fileName", "file_name"]);
  if (!data.mcpServerName && /write|edit|patch|create/u.test(toolName) && path) {
    const before = argument(data, ["old_str", "oldString"]);
    const after = argument(data, ["new_str", "newString", "file_text", "content"]);
    return {
      ...base,
      type: "file_change",
      fileName: path,
      ...(before ? { oldStr: before } : {}),
      ...(after ? { newStr: after } : {}),
    };
  }
  if (!data.mcpServerName && /web|search/u.test(toolName)) {
    const query = argument(data, ["query", "search_query", "pattern"]);
    return { ...base, type: "web_search", ...(query ? { patterns: [query] } : {}) };
  }
  return {
    ...base,
    type: "dynamic_tool",
    toolName: data.toolName,
    title: data.mcpServerName
      ? `${data.mcpServerName}: ${data.mcpToolName ?? data.toolName}`
      : base.title,
    input: boundedToolJson(data.arguments ?? {}),
  };
}
