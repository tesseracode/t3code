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

The integrated TypeScript check found that the new test imported the transitive
`vitest` package instead of this repository's declared `vite-plus/test` export.
The runtime test had passed; that was not proof of type resolution. A supported
unapply/reapply established a genuine new base for recording the complete
three-path correction, rather than replacing the root with a one-line patch.
The strict reapply guard initially refused the corrected import because it was
not byte-identical to the preserved canonical. The old canonical was therefore
rematerialized first, then the correction was made before recording the complete
still-uncommitted root. The final corrected source is the same source that passed
the focused test, format and owning-package type checks.
