# v0.1.4 replay inspection

Upstream: `783581d461dc72cdd8f78fc8abb4ad536dfc4547`.
Application base: `fed030d5cfba9b76789105d7f40933957d7b37cf`.

The upstream `.gitignore` does not exclude `.tpatch/local/`. This root remains
necessary; it is neither upstreamed nor superseded.

The CLI returned `reapplied` from strict forward applicability checking without
changing the checkout. Inspection found the rule absent, so the canonical
one-line delta was materialized through the manual apply session.

Inspected the complete `.gitignore` before and after applying. The only source
change adds `.tpatch/local/` after `.t3`; all upstream ignore entries and the
file mode remain intact. The existing literal-replacement recipe still matches
this base and does not replace the full upstream file.

This is source inspection, not a claim of integrated application validation.
