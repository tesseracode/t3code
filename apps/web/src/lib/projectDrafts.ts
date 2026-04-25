import type { ScopedProjectRef, ScopedThreadRef } from "@t3tools/contracts";

interface ProjectScopedDraftLike {
  readonly environmentId: ScopedProjectRef["environmentId"];
  readonly projectId: ScopedProjectRef["projectId"];
  readonly promotedTo?: ScopedThreadRef | null;
}

export function isReusableDraftForProjectRef(
  projectRef: ScopedProjectRef,
  draft: ProjectScopedDraftLike | null | undefined,
): boolean {
  if (!draft || draft.promotedTo != null) {
    return false;
  }

  return (
    draft.environmentId === projectRef.environmentId && draft.projectId === projectRef.projectId
  );
}
