import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AudioLibraryDto } from "@/api";
import { api } from "@/api";
import { useAudioWorkspace } from "@/hooks";
import { AudioObjectEditorPage } from "./AudioObjectEditorPage";

vi.mock("@tauri-apps/api/core", () => ({
  convertFileSrc: vi.fn(() => "asset://rain"),
}));
vi.mock("@/api", () => ({
  api: { resolveAssetPath: vi.fn() },
  ApplicationError: class extends Error {},
  ApplicationTimeoutError: class extends Error {},
}));
vi.mock("@/hooks", () => ({ useAudioWorkspace: vi.fn() }));

const library: AudioLibraryDto = {
  assetDirectory: "C:/assets",
  files: [
    {
      name: "rain",
      originalFileName: "rain.wav",
      relativePath: "rain.wav",
      mediaType: "audio/wav",
      durationUs: 5_000_000,
      sizeBytes: 100,
    },
  ],
  objects: [
    {
      id: "audio-1",
      name: "Rain",
      assetPath: "rain.wav",
      volumeDb: 0,
      startTimeUs: 0,
      endTimeUs: 5_000_000,
      startLoopTimeUs: null,
      endLoopTimeUs: null,
      fadeInDurationUs: 0,
      fadeOutDurationUs: 0,
      loopCrossfadeDurationUs: null,
    },
  ],
  lists: [],
  compositions: [],
  settings: { masterVolumeDb: 0 },
};

class DecodeAudioContext {
  decodeAudioData() {
    return Promise.resolve({
      duration: 5,
      getChannelData: () => new Float32Array(800),
    } as unknown as AudioBuffer);
  }

  close() {
    return Promise.resolve();
  }
}

describe("AudioObjectEditorPage", () => {
  const updateAudioObject = vi.fn().mockResolvedValue(true);
  const onBack = vi.fn();

  beforeEach(() => {
    updateAudioObject.mockClear();
    onBack.mockClear();
    vi.stubGlobal("AudioContext", DecodeAudioContext);
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve({
          ok: true,
          arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
        } as Response),
      ),
    );
    vi.mocked(api.resolveAssetPath).mockResolvedValue("C:/assets/rain.wav");
    vi.mocked(useAudioWorkspace).mockReturnValue({
      library,
      loading: false,
      loaded: true,
      loadError: "",
      reload: vi.fn(),
      busy: false,
      error: "",
      rescanFiles: vi.fn().mockResolvedValue(true),
      createAudioObject: vi.fn(),
      updateAudioObject,
      deleteAudioObject: vi.fn().mockResolvedValue(true),
      createAudioList: vi.fn().mockResolvedValue(true),
      updateAudioList: vi.fn().mockResolvedValue(true),
      deleteAudioList: vi.fn().mockResolvedValue(true),
      createAudioComposition: vi.fn().mockResolvedValue(true),
      updateAudioComposition: vi.fn().mockResolvedValue(true),
      deleteAudioComposition: vi.fn().mockResolvedValue(true),
      updateMasterVolume: vi.fn().mockResolvedValue(true),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("saves the edited draft and returns to the library", async () => {
    const user = userEvent.setup();
    render(<AudioObjectEditorPage audioObjectId="audio-1" onBack={onBack} />);
    await waitFor(() => expect(screen.getByLabelText("Nome")).toBeEnabled());

    const name = screen.getByLabelText("Nome");
    await user.clear(name);
    await user.type(name, "Heavy rain");
    await user.click(screen.getByRole("button", { name: "Salvar" }));

    await waitFor(() =>
      expect(updateAudioObject).toHaveBeenCalledWith(
        "audio-1",
        expect.objectContaining({ name: "Heavy rain" }),
      ),
    );
    expect(onBack).toHaveBeenCalledOnce();
  });

  it("keeps a waveform decode failure visible beside the editor", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.reject(new Error("decode failed"))),
    );
    render(<AudioObjectEditorPage audioObjectId="audio-1" onBack={onBack} />);

    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(
        "Não foi possível acessar os dados locais",
      ),
    );
  });
});
