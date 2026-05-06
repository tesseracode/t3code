import type { IpcMain } from "electron";

import type { DesktopManagedEnvironmentController } from "./managedBackendEnvironment.ts";

export const LIST_MANAGED_ENVIRONMENTS_CHANNEL = "desktop:list-managed-environments";
export const PREPARE_MANAGED_ENVIRONMENT_REGISTRATION_CHANNEL =
  "desktop:prepare-managed-environment-registration";

export function registerDesktopManagedEnvironmentIpc(input: {
  readonly ipcMain: IpcMain;
  readonly controller: DesktopManagedEnvironmentController;
}): void {
  input.ipcMain.removeHandler(LIST_MANAGED_ENVIRONMENTS_CHANNEL);
  input.ipcMain.handle(LIST_MANAGED_ENVIRONMENTS_CHANNEL, async () =>
    input.controller.listCandidates(),
  );

  input.ipcMain.removeHandler(PREPARE_MANAGED_ENVIRONMENT_REGISTRATION_CHANNEL);
  input.ipcMain.handle(
    PREPARE_MANAGED_ENVIRONMENT_REGISTRATION_CHANNEL,
    async (_event, rawEnvironmentKey: unknown) => {
      if (typeof rawEnvironmentKey !== "string" || rawEnvironmentKey.trim().length === 0) {
        throw new Error("Invalid managed environment key.");
      }

      return input.controller.prepareRegistration(rawEnvironmentKey);
    },
  );
}
