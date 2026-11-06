# Preserve stable-main behavior

- Restore `hideInternalModels`, default false, in the native Copilot provider
  schema and generated settings controls. When enabled, exclude SDK catalog
  entries whose names contain `internal only`, case-insensitively. Preserve
  eligible default selection, policy filtering and explicit custom models.
- Keep configured custom slugs visible when they collide with an SDK internal
  entry, including cached catalogs. Serialize selected-session skill mutations
  through inventory refresh and instance publication, retaining ownership and
  explicit failures.
- Keep migrated legacy instance IDs and their saved filter configuration.
- Observe native command queue/dispatch requests without acknowledging or
  executing them, and without claiming command success.
- Refresh native tasks on system notifications, retain reusable-agent identity
  and results, and do not attach an old task's notice to a newer foreground run.
  Surface a failed refresh explicitly and bound notification previews.
- Retain ignored system instruction/completed-command events as ignored; do not
  claim to implement previously unshipped command execution or instruction UI.
- Restore a distinct static extra-high frame for Codex and native Copilot
  reasoning selections. Leave ordinary effort and Fusion routing unchanged.
- Restore accurate experimental Copilot guidance without claiming SDK pre-1.0
  status or official upstream support.
- Preserve typed image/audio/resource blocks in generic structured tool output.
  Keep ordinary text-only output unchanged and reuse current shared image and
  transport handling instead of sending duplicate legacy image events.

The provider schema and model filtering serve all clients. Composer framing
preserves the old web/desktop surface; no new mobile framing is claimed.
Before/after real-client captures prove the visual restoration. Focused
protocol/catalog/configuration tests and affected checks prove behavioral work.
The superseded granular records and their historical artifacts remain intact.
