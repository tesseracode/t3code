# Compatibility analysis

The preserved stable main contains the skill enable/disable capability and its
WebSocket registration. Its adapter, registry and transport paths no longer
exist on the pinned v0.1.4 candidate. The current native adapter exposes only
skill discovery, so accepting the newer tree would lose an existing capability.

The installed SDK has typed session-owned `skills.enable`, `skills.disable` and
`skills.list` operations. Restore the existing instance input through the current
provider registry and adapter, retaining a session selector when an instance has
multiple live sessions. An omitted selector is valid only with one live owner.
Do not restore the old arbitrary-first-session routing, ignored errors, RPC
casts, or obsolete Vite origin override.

The focused native-adapter ownership regression fails before implementation
because the skill-control capability is absent. No live session or account was
modified. The old canonical roots remain preserved and are explicitly
superseded by this adaptation.
