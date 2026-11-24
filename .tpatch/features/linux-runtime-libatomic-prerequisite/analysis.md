# Analysis

The checksum-verified Canonical Ubuntu 24.04 WSL rootfs failed the packaged
runtime preflight because `libatomic.so.1` was missing. No ready cache or
working backend was claimed. This is an operating-system dependency: bundling
Node does not make the Linux executable fully static.

Both upstream v0.1.4 and this fork use Node 26.12.1. Do not attribute the
requirement to a fork-only compiler change without evidence. The current
installation and preview runbooks do not mention libatomic.

Document the distribution package and retry path for users, and require
contributors to distinguish an untouched-image failure from a subsequently
qualified package-installed variant. This changes documentation only.
