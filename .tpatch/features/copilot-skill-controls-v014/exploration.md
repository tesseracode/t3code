# Selected implementation

Add a typed optional instance adapter capability and call it from the current
provider registry. Copilot keeps only initialized native sessions in an
instance-local map, with scope-owner identity guarding cleanup. After mutation,
the existing `onSkills` callback updates the driver cache and the registry
refreshes that owner's workspace snapshot.

Other adapters do not advertise this operation and receive an explicit
unsupported error. The legacy payload remains usable when ownership is
unambiguous. Multiple sessions require an explicit selector instead of routing
to whichever session happened to be first.

The preserved old RPC-registration patch also carried a Vite origin override.
Its intended development connectivity is supplied by the current same-origin
proxy, not by reviving a localhost origin in remote bundles.
