# Implementation Record: readme-copilot-notice

**Recorded**: 2026-04-21T06:04:42Z
**Files changed**: 1
**Patch size**: 1307 bytes

## Change Summary

```
 .claude/skills/tessera-patch/SKILL.md         | 259 ++++++++++++++++----------
 .cursor/rules/tessera-patch.mdc               |  60 ++++++
 .github/prompts/tessera-patch-apply.prompt.md |  60 ++++++
 .github/skills/tessera-patch/SKILL.md         |  60 ++++++
 .tpatch/FEATURES.md                           |   3 +
 .tpatch/workflows/tessera-patch-generic.md    |  60 ++++++
 .windsurfrules                                |  60 ++++++
 README.md                                     |  10 +-
 8 files changed, 471 insertions(+), 101 deletions(-)
```

## Replay Instructions

To re-apply this feature to a clean checkout:

```bash
# From the feature's artifacts directory:
git apply .tpatch/features/readme-copilot-notice/artifacts/post-apply.patch
```

