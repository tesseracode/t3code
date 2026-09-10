# Analysis: wsl-runtime-fixture-newlines

## Problem

The fourth Windows validation run proved that the production installer
restored execute permissions and that all three fixture commands ran. The test
then failed because the generated scripts used `printf copilot`, `printf rg`,
and `printf tgrep`, which concatenate output, while the assertion expects one
newline-terminated marker per command.

## Compatibility

- Change only the executed-shell fixture strings.
- Keep installer behavior and assertions unchanged.
- Make newlines explicit inside each stub command.
- Preserve the verified executable-mode feature as the hard parent.

## Recommendation

Generate `printf "copilot\\n"`, `printf "rg\\n"`, and
`printf "tgrep\\n"` in the three fixture scripts.
