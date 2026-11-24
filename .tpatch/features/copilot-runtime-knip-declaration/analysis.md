# Analysis

The server-only dependency audit reproduces #41 before any change:

```text
vp exec knip --workspace apps/server --include dependencies --no-config-hints
Unused dependencies (1)
@github/copilot-sdk  apps/server/package.json:41:6
```

The provider workspace imports the SDK, but bundled server code also resolves
the external package from the emitted server directory. The existing
`cli-external-packages.test.ts` regression exercises that exact resolver.
The server manifest supplies runtime roots to archive/desktop staging.
Deleting its SDK declaration just to silence Knip is not appropriate.

Use the established `apps/server` `ignoreDependencies` mechanism for this one
intentional package. This changes neither bundle selection nor dependency
versions and does not hide unrelated package findings.
