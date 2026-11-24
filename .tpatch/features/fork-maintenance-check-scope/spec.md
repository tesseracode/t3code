# Specification

1. Application format/lint commands leave `.tpatch/` administrative evidence
   byte-identical, including explicit paths passed by the changed checker.
2. Metadata-only changes select no application package jobs.
3. Combining metadata with product source preserves the source's normal package
   and dependent selection.
4. A lookalike directory such as `.tpatch-other/` remains unknown and conservative.
5. Keep product checks, inherited evidence and tpatch's own integrity/replay
   requirements intact. No application behavior or permissions change.

The regression cases exercise the existing package-impact classifier. Record
the failing baseline before the fix and repeat those cases afterward.
