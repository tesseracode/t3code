# Exploration

- `docs/user/install.md` covers command-line installation and desktop-managed
  WSL, but does not explain Linux shared-library loader failures.
- `docs/operations/fork-native-preview.md` separates build, native and WSL
  qualification. Add prerequisite attribution alongside its isolation rules.
- The observed pristine image is Canonical Ubuntu 24.04 amd64, SHA-256
  `2a790896740b14d637dbdc583cce1ba081ac53b9e9cdb46dc09a2f73abbd9934`.
- The tested runtime archive is SHA-256
  `f22013478222f68af8ad16103127e061e799383293d633ae1650fc33be5e34ef`.
- Installing the distribution's `libatomic1` in only the dedicated test distro
  resolved the loader's missing-library report. This alone is not a complete
  managed-start or native-provider qualification claim.

No runtime-code or package-manifest change is needed to document this existing
system dependency. Bundling a host library would add ABI/licensing concerns
and is outside this feature.
