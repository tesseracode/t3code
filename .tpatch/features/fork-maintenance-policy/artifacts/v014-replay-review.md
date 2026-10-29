# v0.1.4 policy replay inspection

Upstream: `783581d461dc72cdd8f78fc8abb4ad536dfc4547`.
Application base: `16a55122c16fdd957ac7bba8e00aed970584d0f2`.

`docs/internals/fork-maintenance.md` is absent upstream. The root remains needed;
the existing administrative branching pointer was inherited with the metadata.

The strict applicability verdict did not materialize the file. The complete
policy was added in a manual apply session, retaining its branch, release,
review, migration, isolation and approval boundaries. The maintainer's new
requirements add per-root source inspection and an internal exact-replay record
for the accepted historical-baseline verifier defect.

The complete resulting document was inspected against the previous canonical
policy and current maintainer instructions. It neither authorizes deployment
nor relaxes behavior or platform qualification. There is no runtime code change.

`record --regenerate-recipe` retained the old recipe content after the apply
session had already captured the new patch. The repository's recipe generator
was therefore run against the real staged Git tree, with the genuine empty
preimage for this new file. Recipe content was compared to the materialized file
before recording and landing.

The historical helper also emitted legacy `version`, `description` and operation
`id` fields rejected by the current strict recipe schema. Those fields were
removed from this current recipe without changing its source contents. Provenance
is a manual attestation of the actual application base and corrected recipe
hash, not a provider-generated artifact. The existing source range is re-recorded
and re-attested; no historical source commit or generation manifest is rewritten.
