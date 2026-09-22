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

  it("rejects a command that never responds instead of leaving the UI busy", async () => {
    vi.useFakeTimers();
    vi.mocked(commands.createCampaign).mockReturnValue(new Promise(() => {}));

    const operation = api.createCampaign("Sombras");
    const expectation = expect(operation).rejects.toBeInstanceOf(
      ApplicationTimeoutError,
    );
    await vi.advanceTimersByTimeAsync(10_000);

    await expectation;
  });
});
