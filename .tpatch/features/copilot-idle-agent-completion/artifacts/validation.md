# Validation

The extended adapter lifecycle regression failed before implementation because
the idle agent remained in `pendingBackgroundTasks`.

`vp test run packages/provider-copilot/src/server/adapter.test.ts packages/shared/src/orchestrationV2PendingBackgroundWork.test.ts`:
54 tests passed. The fixture sequence observes:

```text
root idle + running helper -> pending helper; root completed
same helper idle + result -> no pending work; identity/result retained
repeat roster refresh -> no pending work
same helper running again -> pending helper restored
child completion during next root turn -> next root remains running
idle shell -> existing command classification retained
empty roster -> no pending work
```

`vp run check:changed HEAD`: format, lint, affected-package typechecks and tests
passed. The unchanged `apps/server` SDK dependency still fails the first knip
pass; the second pass passed.

`tpatch verify copilot-idle-agent-completion` was attempted and refused historical
provider-parent replay before checking this patch. Native tpatch verification is
not claimed as passing. No live profile or installation was changed.
