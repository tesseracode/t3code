# Main-only compatibility inventory

Stable main contains five behaviors absent from the pinned v0.1.4 candidate:
the default-off internal-model filter, Copilot's experimental README notice,
extra-high effort framing, command/system-notification observations, and rich
native tool-result blocks.
Blocked historical feature state does not mean these behaviors were unshipped.
Their old landings and source implementations were inspected directly.

The current SDK still declares command and notification events. Its existing
task snapshot mapper preserves native task identity and results, but it does
not refresh on legacy system notifications. A focused existing background-task
case now fails immediately on that missing event path. The existing model
catalog case also fails because the saved internal-model option is discarded.

Port the existing settings name and semantics, and retain raw migrated instance
configuration through the current provider schema. Use current native task
snapshots rather than inventing reusable-agent completion state. Represent
command dispatch requests as observations, never as executed commands.

Current upstream uses a static Ultrathink frame instead of continuous
animations. Preserve the distinct cyan/green extra-high appearance using that
same static mask; do not restore the old continuously repainting animations.
No older recipe is replayed over current shared source.

Final source inventory also found image/audio/resource result blocks dropped by
the string-only V2 completion mapper. The current SDK still supplies these
typed blocks. Existing generic V2 tool output, image extraction and transport
limits can preserve them without resurrecting old runtime item kinds or adding
an unshipped Copilot-specific media renderer.
