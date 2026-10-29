# Validation and source inspection

Base: `a67761be595832d5145b64079eea1dc441f7f4dc`.

- Before the fix, `vp test run scripts/lib/ci-changes.test.ts` failed the
  metadata-only and mixed-change cases; the lookalike case passed.
- After the fix, the same command passed all three cases.
- Scoped `vp lint` passed for the three source files and an explicitly supplied
  `.tpatch/tools/generate-recipe.cjs` archive path.
- Scoped `vp fmt --check` passed for the three source files while excluding an
  explicitly supplied historical reconcile JSON file.
- Neither historical artifact changed; their Git diffs are empty.

Read the actual classifier change, both formatter/linter exclusion seams and
the complete regression file after application. Only the literal `.tpatch/`
namespace is newly inert. Mixed product changes retain their normal job
selection, while similarly named directories still select all jobs.

All application checks and independent feature/replay integrity remain required.
The full integrated checker and independent reviewer are separate later gates.
