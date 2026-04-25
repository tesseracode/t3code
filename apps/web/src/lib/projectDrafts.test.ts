import { scopeThreadRef } from "@t3tools/client-runtime";
import { EnvironmentId, ProjectId, ThreadId } from "@t3tools/contracts";
import { describe, expect, it } from "vitest";

import { isReusableDraftForProjectRef } from "./projectDrafts";

const projectRef = {
  environmentId: EnvironmentId.make("environment-local"),
  projectId: ProjectId.make("project-alpha"),
} as const;

describe("isReusableDraftForProjectRef", () => {
  it("accepts a draft already bound to the same physical project", () => {
    expect(
      isReusableDraftForProjectRef(projectRef, {
        environmentId: projectRef.environmentId,
        projectId: projectRef.projectId,
      }),
    ).toBe(true);
  });

  it("rejects a draft from another environment for the same logical repo", () => {
    expect(
      isReusableDraftForProjectRef(projectRef, {
        environmentId: EnvironmentId.make("environment-wsl"),
        projectId: projectRef.projectId,
      }),
    ).toBe(false);
  });

  it("rejects a draft from another physical project in the same environment", () => {
    expect(
      isReusableDraftForProjectRef(projectRef, {
        environmentId: projectRef.environmentId,
        projectId: ProjectId.make("project-beta"),
      }),
    ).toBe(false);
  });

  it("rejects a draft that is already being promoted", () => {
    expect(
      isReusableDraftForProjectRef(projectRef, {
        environmentId: projectRef.environmentId,
        projectId: projectRef.projectId,
        promotedTo: scopeThreadRef(projectRef.environmentId, ThreadId.make("thread-1")),
      }),
    ).toBe(false);
  });
});
