import { EnvironmentId } from "@t3tools/contracts";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockResolveRemotePairingTarget = vi.fn();
const mockFetchRemoteEnvironmentDescriptor = vi.fn();
const mockFetchRemoteSessionState = vi.fn();
const mockBootstrapRemoteBearerSession = vi.fn();
const mockPersistSavedEnvironmentRecord = vi.fn();
const mockWriteSavedEnvironmentBearerToken = vi.fn();
const mockSetSavedEnvironmentRegistry = vi.fn();
const mockUpsert = vi.fn();
const mockListSavedEnvironmentRecords = vi.fn();
const mockGetSavedEnvironmentRecord = vi.fn();
const mockCreateWsRpcClient = vi.fn();
const mockWsTransport = vi.fn(function WsTransport(..._args: unknown[]) {
  return {};
});

vi.mock("../remote/target", () => ({
  resolveRemotePairingTarget: mockResolveRemotePairingTarget,
}));

vi.mock("../remote/api", () => ({
  bootstrapRemoteBearerSession: mockBootstrapRemoteBearerSession,
  fetchRemoteEnvironmentDescriptor: mockFetchRemoteEnvironmentDescriptor,
  fetchRemoteSessionState: mockFetchRemoteSessionState,
  resolveRemoteWebSocketConnectionUrl: vi.fn(),
}));

vi.mock("../../rpc/wsRpcClient", () => ({
  createWsRpcClient: mockCreateWsRpcClient,
}));

vi.mock("../../rpc/wsTransport", () => ({
  WsTransport: mockWsTransport,
}));

vi.mock("~/localApi", () => ({
  ensureLocalApi: () => ({
    persistence: {
      setSavedEnvironmentRegistry: mockSetSavedEnvironmentRegistry,
    },
  }),
}));

vi.mock("./catalog", () => ({
  getSavedEnvironmentRecord: mockGetSavedEnvironmentRecord,
  hasSavedEnvironmentRegistryHydrated: vi.fn(),
  listSavedEnvironmentRecords: mockListSavedEnvironmentRecords,
  persistSavedEnvironmentRecord: mockPersistSavedEnvironmentRecord,
  readSavedEnvironmentBearerToken: vi.fn(),
  removeSavedEnvironmentBearerToken: vi.fn(),
  useSavedEnvironmentRegistryStore: {
    getState: () => ({
      upsert: mockUpsert,
      remove: vi.fn(),
      markConnected: vi.fn(),
    }),
  },
  useSavedEnvironmentRuntimeStore: {
    getState: () => ({
      ensure: vi.fn(),
      patch: vi.fn(),
      clear: vi.fn(),
    }),
  },
  waitForSavedEnvironmentRegistryHydration: vi.fn(),
  writeSavedEnvironmentBearerToken: mockWriteSavedEnvironmentBearerToken,
}));

vi.mock("./connection", () => ({
  createEnvironmentConnection: vi.fn(
    (input: { knownEnvironment: { environmentId: EnvironmentId } }) => ({
      environmentId: input.knownEnvironment.environmentId,
      dispose: vi.fn().mockResolvedValue(undefined),
    }),
  ),
}));

describe("addSavedEnvironment", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    mockResolveRemotePairingTarget.mockReturnValue({
      httpBaseUrl: "https://remote.example.com/",
      wsBaseUrl: "wss://remote.example.com/",
      credential: "pairing-code",
    });
    mockFetchRemoteEnvironmentDescriptor.mockResolvedValue({
      environmentId: EnvironmentId.make("environment-1"),
      label: "Remote environment",
    });
    mockFetchRemoteSessionState.mockResolvedValue({
      authenticated: true,
      role: "owner",
    });
    mockBootstrapRemoteBearerSession.mockResolvedValue({
      sessionToken: "bearer-token",
      role: "owner",
    });
    mockPersistSavedEnvironmentRecord.mockResolvedValue(undefined);
    mockWriteSavedEnvironmentBearerToken.mockResolvedValue(false);
    mockSetSavedEnvironmentRegistry.mockResolvedValue(undefined);
    mockListSavedEnvironmentRecords.mockReturnValue([]);
    mockGetSavedEnvironmentRecord.mockReturnValue(null);
    mockCreateWsRpcClient.mockReturnValue({
      server: {
        getConfig: vi.fn().mockResolvedValue({
          environment: {
            environmentId: EnvironmentId.make("environment-1"),
            label: "Remote environment",
          },
        }),
      },
    });
    vi.unstubAllGlobals();
  });

  it("rolls back persisted metadata when bearer token persistence fails", async () => {
    const { addSavedEnvironment, resetEnvironmentServiceForTests } = await import("./service");

    await expect(
      addSavedEnvironment({
        label: "Remote environment",
        host: "remote.example.com",
        pairingCode: "123456",
      }),
    ).rejects.toThrow("Unable to persist saved environment credentials.");

    expect(mockPersistSavedEnvironmentRecord).toHaveBeenCalledTimes(1);
    expect(mockWriteSavedEnvironmentBearerToken).toHaveBeenCalledWith(
      EnvironmentId.make("environment-1"),
      "bearer-token",
    );
    expect(mockSetSavedEnvironmentRegistry).toHaveBeenCalledWith([]);
    expect(mockUpsert).not.toHaveBeenCalled();

    await resetEnvironmentServiceForTests();
  });

  it("persists desktop-managed environment metadata", async () => {
    const prepareManagedEnvironmentRegistration = vi.fn().mockResolvedValue({
      key: "wsl:Ubuntu",
      label: "Ubuntu",
      kind: "wsl",
      httpBaseUrl: "http://127.0.0.1:3881/",
      wsBaseUrl: "ws://127.0.0.1:3881/",
      bootstrapToken: "desktop-bootstrap-token",
    });
    vi.stubGlobal("window", {
      desktopBridge: {
        prepareManagedEnvironmentRegistration,
      },
    });
    mockWriteSavedEnvironmentBearerToken.mockResolvedValue(true);

    const { addDesktopManagedEnvironment, resetEnvironmentServiceForTests } =
      await import("./service");

    const record = await addDesktopManagedEnvironment({ environmentKey: "wsl:Ubuntu" });

    expect(prepareManagedEnvironmentRegistration).toHaveBeenCalledWith("wsl:Ubuntu");
    expect(mockFetchRemoteEnvironmentDescriptor).toHaveBeenCalledWith({
      httpBaseUrl: "http://127.0.0.1:3881/",
    });
    expect(mockBootstrapRemoteBearerSession).toHaveBeenCalledWith({
      httpBaseUrl: "http://127.0.0.1:3881/",
      credential: "desktop-bootstrap-token",
    });
    expect(mockPersistSavedEnvironmentRecord).toHaveBeenCalledWith({
      environmentId: EnvironmentId.make("environment-1"),
      label: "Ubuntu",
      httpBaseUrl: "http://127.0.0.1:3881/",
      wsBaseUrl: "ws://127.0.0.1:3881/",
      createdAt: expect.any(String),
      lastConnectedAt: expect.any(String),
      management: {
        kind: "desktop-managed",
        environmentKey: "wsl:Ubuntu",
      },
    });
    expect(mockWriteSavedEnvironmentBearerToken).toHaveBeenCalledWith(
      EnvironmentId.make("environment-1"),
      "bearer-token",
    );
    expect(mockUpsert).toHaveBeenCalledWith(record);
    expect(record.management).toEqual({
      kind: "desktop-managed",
      environmentKey: "wsl:Ubuntu",
    });

    await resetEnvironmentServiceForTests();
  });
});
