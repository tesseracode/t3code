# Analysis

The chat adapter omits `requestExtensions` on its shared create/resume config,
although it has not installed the required standalone extension host. Native
configuration or saved-session state can consequently request unsupported
extension hosting. Explicit false is already used by background generation and
has independently reopened the affected disposable session.

Set the capability explicitly on the existing shared config. Do not invent an
extension SDK path, disable native skills/project discovery, or change global
Copilot settings. A common configuration boundary covers project/no-project,
desktop/web/mobile and cold resume without client-specific changes.
