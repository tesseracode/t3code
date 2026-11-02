# Specification

1. Preserve all 31 paths of the current packaging root, including later preview
   workflow and Linux prerequisite documentation.
2. Keep the provider hard dependency and supersede the historical packaging root
   without deleting or rewriting any previous generation, receipt, or commit.
3. Use reconstructed baseline ba951f958e8cd3cb6582f7902171f573621407a7:
   current pre-SDK HEAD with only packaging-owned paths restored to their
   pre-v0.1.4 bytes. The current provider must reverse-apply there.
4. The replay anchor restores exactly tree a043de31d500054e1be2d1907c09e088ad0b74de.
   Attach it without changing installed or deployed source.
5. Record a complete patch and matching recipe through tpatch; require successful
   isolated historical replay and current materialization before SDK checkpoint.
