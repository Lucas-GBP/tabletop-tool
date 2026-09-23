import { afterEach, describe, expect, it, vi } from "vitest";
import { commands } from "./bindings";
import { api, ApplicationTimeoutError } from ".";

vi.mock("./bindings", () => ({
  commands: {
    listCore: vi.fn(),
    createScene: vi.fn(),
    createCampaign: vi.fn(),
    createSession: vi.fn(),
    createSceneLevel: vi.fn(),
    renameCampaign: vi.fn(),
    renameSession: vi.fn(),
    renameScene: vi.fn(),
    renameSceneLevel: vi.fn(),
    moveSession: vi.fn(),
    moveScene: vi.fn(),
    moveSceneLevel: vi.fn(),
    associateScene: vi.fn(),
    deleteCampaign: vi.fn(),
    deleteSession: vi.fn(),
    deleteScene: vi.fn(),
    deleteSceneLevel: vi.fn(),
    removeSceneFromSession: vi.fn(),
  },
}));

describe("Core API boundary", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.resetAllMocks();
  });

  it("unwraps a successful generated command", async () => {
    const snapshot = { campaigns: [], scenes: [] };
    vi.mocked(commands.listCore).mockResolvedValue({
      status: "ok",
      data: snapshot,
    });

    await expect(api.listCore()).resolves.toEqual(snapshot);
  });

  it("limits a stalled read instead of leaving the UI busy", async () => {
    vi.useFakeTimers();
    vi.mocked(commands.listCore).mockReturnValue(new Promise(() => {}));

    const operation = api.listCore();
    const expectation = expect(operation).rejects.toBeInstanceOf(
      ApplicationTimeoutError,
    );
    await vi.advanceTimersByTimeAsync(10_000);

    await expectation;
  });

  it("waits for a definitive mutation result beyond the read timeout", async () => {
    vi.useFakeTimers();
    let finish:
      | ((result: Awaited<ReturnType<typeof commands.createCampaign>>) => void)
      | undefined;
    vi.mocked(commands.createCampaign).mockReturnValue(
      new Promise((resolve) => {
        finish = resolve;
      }),
    );

    const operation = api.createCampaign("Sombras");
    await vi.advanceTimersByTimeAsync(10_000);
    finish?.({ status: "ok", data: { campaigns: [], scenes: [] } });

    await expect(operation).resolves.toEqual({ campaigns: [], scenes: [] });
  });
});
