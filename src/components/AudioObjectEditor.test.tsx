import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AudioLibraryDto } from "@/api";
import { api } from "@/api";
import { AudioObjectEditor } from "./AudioObjectEditor";

vi.mock("@tauri-apps/api/core", () => ({
  convertFileSrc: vi.fn(() => "asset://rain"),
}));
vi.mock("@/api", () => ({
  api: { resolveAssetPath: vi.fn() },
  ApplicationError: class extends Error {},
  ApplicationTimeoutError: class extends Error {},
}));

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

describe("AudioObjectEditor", () => {
  const save = vi.fn().mockResolvedValue(undefined);
  const close = vi.fn();

  beforeEach(() => {
    save.mockClear();
    close.mockClear();
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
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function renderEditor() {
    render(
      <AudioObjectEditor
        object={library.objects[0]!}
        files={library.files}
        busy={false}
        error=""
        onClose={close}
        onSave={save}
        onRefresh={vi.fn()}
      />,
    );
  }

  it("saves the edited draft", async () => {
    const user = userEvent.setup();
    renderEditor();
    await waitFor(() => expect(screen.getByLabelText("Nome")).toBeEnabled());

    const name = screen.getByLabelText("Nome");
    await user.clear(name);
    await user.type(name, "Heavy rain");
    await user.click(screen.getByRole("button", { name: "Salvar" }));

    await waitFor(() =>
      expect(save).toHaveBeenCalledWith(
        expect.objectContaining({ name: "Heavy rain" }),
      ),
    );
  });

  it("keeps a waveform decode failure visible beside the editor", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.reject(new Error("decode failed"))),
    );
    renderEditor();

    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(
        "Não foi possível acessar os dados locais",
      ),
    );
  });
});
