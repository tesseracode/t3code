# Windows preview ZIP artifact

## Required behavior

- The build-only fork workflow offers `windows_target` with exactly `nsis`
  and `zip`; omitted selection preserves the existing NSIS default.
- Validate the selected value before passing it to the desktop builder.
  Supply it through an environment variable, not interpolated shell source.
- ZIP builds use the same isolated preview flag, source/version provenance,
  embedded Linux runtime verification, native packaging checks and manifests.
- Upload ZIP output together with its manifest and checksums. NSIS uploads
  continue to work. No GitHub release or installer execution is added.
- Document that extraction still requires a fresh Windows preview home and
  a separately isolated managed-WSL distro before qualification.

## Verification

Inspect the workflow change and run the existing YAML formatter check.
Dispatch one ZIP build within the already approved build-only CI allowance.
Verify its source, manifest and payload checksum on the receiving host before
launching it from a new directory/profile. Native/UI outcomes are separate
platform gates, not inferred from a successful archive build.

## Non-goals

No product behavior change, production update, new installer identity, global
installation, authentication changes, profile migration, or compatibility claim.
