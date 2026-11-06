# Acceptance criteria

- Define stable main, immutable pure upstream baselines, scoped feature
  branches, reconciliation candidates and validated fork snapshots.
- Require ordinary features to develop on current main; candidate-only features
  requiring newer upstream are not accepted until baseline promotion.
- Account for late main changes before validating the final merge result.
- Preserve exact patch generations and histories, and verify parsed landing
  trailers after record-before-land.
- Document optional version-local backports and upstream retirement evidence.
- Distinguish source/main gates from package qualification and installation.
- Preserve the existing narrow verifier exception and its strict exclusions.
- Link the operations procedure from existing policy rather than duplicate
  historical instructions or add runtime configuration.
