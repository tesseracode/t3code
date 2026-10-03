export const FORK_PREVIEW_APP_ID = "com.tesseracode.t3code.preview";
export const FORK_PREVIEW_PRODUCT_NAME = "T3 Code Fork Preview";

/** Installer identity and update metadata are isolated before electron-builder sees the stage. */
export function forkPreviewBuildConfig(config: Record<string, unknown>): Record<string, unknown> {
  const { publish: _publish, ...rest } = config;
  return {
    ...rest,
    appId: FORK_PREVIEW_APP_ID,
    productName: FORK_PREVIEW_PRODUCT_NAME,
    artifactName: "T3-Code-Fork-Preview-${version}-${arch}.${ext}",
    ...(typeof config.mac === "object" && config.mac !== null
      ? { mac: { ...config.mac, protocols: [] } }
      : {}),
    ...(typeof config.dmg === "object" && config.dmg !== null
      ? { dmg: { ...config.dmg, title: FORK_PREVIEW_PRODUCT_NAME } }
      : {}),
  };
}
