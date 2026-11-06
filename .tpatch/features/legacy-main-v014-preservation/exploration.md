# Chosen adaptation

Use the current provider package settings schema, SDK catalog helper, native
adapter, and shared composer state. The existing legacy settings migration
already preserves raw instance configuration, so restoring the schema field
recovers the saved option without a new migration.

Fresh catalog filtering alone is insufficient: bootstrap hydration and failed
refreshes retain older model rows. A small instance-owned filter reapplies the
same SDK package helper after hydration and after snapshot merging, without
putting Copilot configuration semantics or credentials in generic cache code.
Configured custom slugs are checked independently of the SDK row's `isCustom`
flag, since catalog deduplication can retain a non-custom SDK row for that slug.

Skill mutation, native inventory retrieval and callback publication share a
session semaphore. Registry publication is also serialized per live instance,
so a delayed earlier inventory cannot replace a later successful update.
Replacement instances are checked again after waiting and before publication.

Rich SDK completion blocks use the existing generic tool output `content`
array, accompanied by a text preview block. Current shared image extraction,
ingestion and wire limits already own this representation. No legacy
`image_view` contract or new Copilot-only renderer is introduced.

Reuse native task snapshot reconciliation for completion/idle notifications.
Current SDK task identities/results remain authoritative; no permanently
cached completion override is added for reusable agents. Command events become
bounded system notices, not command-execution records or automatic responses.

Reuse upstream's static frame mask for extra-high styling. This retains the
original visual distinction without reintroducing continuous GPU repainting.
Settings remain destination-environment owned, and no live profile, installed
application, native extension host, package release, or deployment is changed.
