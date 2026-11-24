# Exploration

The existing server scanner is the owner of bounded filesystem discovery and
projection of transcript JSON. Extend its existing schemas, metadata/read
budgets and provider-home selection. Do not start a Copilot runtime for discovery.

The importer owns event-sourced snapshot creation and retry deduplication.
Keep existing `v1_import` runless history behavior for rendering/paging, with
explicit snapshot provenance on the app thread and shell. A snapshot has no
active provider thread/native ownership and no resume cursor.

The orchestrator owns authoritative provider-operation refusal. Keep that
restriction on the app thread, not mutable model/provider selection. Guard fork
and merge source reads as well as messages. Client surfaces explain and disable
sending; remote/MCP callers receive the same server rejection.

Web onboarding already imports project history; its provider copy must include
Copilot's read-only status. Mobile has thread viewing but no existing project
history-import entry point. Avoid inventing a second import workflow in this
window; imported server threads must be viewable and visibly read-only there.

Existing focused suites: AgentSessionScanner.test.ts, AgentSessionImporter.test.ts,
persisted orchestration tests and projection tests. Baseline scanner suite has
one pre-existing macOS symlink exclusion failure (52 pass, 1 fail), recorded
before product edits. Do not mask it as a new-feature pass.
