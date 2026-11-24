# Linux runtime libatomic prerequisite

- Explain that the prebuilt Linux server includes Node but still depends on
  operating-system shared libraries.
- For `libatomic.so.1` loader failures on Debian/Ubuntu, including their WSL
  distributions, identify the standard `libatomic1` package and give normal
  package-manager commands to run inside the affected environment.
- Link the WSL installation instructions to that guidance.
- Require preview qualification to record the pristine failure, exact added
  package versions and separate dependency-installed result.
- Do not claim a package-installed variant qualifies an untouched rootfs.
- Do not modify runtime binaries, automatically install packages, weaken
  loader/integrity checks, change authentication, or repair a live distro.

Verification is focused Markdown formatting, source inspection, independent
review and exact maintained-root replay. Runtime evidence remains separately
attributed to the receiving-host dependency variant.
