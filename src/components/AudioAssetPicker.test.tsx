import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { AudioAssetDto } from "@/api";
import { AudioAssetPicker } from "./AudioAssetPicker";

const assets: AudioAssetDto[] = [
  asset("ambience/city/rain.mp3", "Rain"),
  asset("music/theme.webm", "Theme"),
  asset("bell.m4a", "Bell"),
];

describe("AudioAssetPicker", () => {
  it("filters recursively discovered assets and selects one", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(
      <AudioAssetPicker
        assets={assets}
        title="Escolher arquivo"
        onRefresh={vi.fn()}
        onClose={vi.fn()}
        onSelect={onSelect}
      />,
    );

    await user.selectOptions(
      screen.getByRole("combobox", { name: "Filtrar arquivos por pasta" }),
      "ambience/city",
    );
    expect(screen.getByRole("button", { name: /Rain/ })).toBeVisible();
    expect(screen.queryByRole("button", { name: /Theme/ })).toBeNull();

    await user.selectOptions(
      screen.getByRole("combobox", { name: "Filtrar arquivos por pasta" }),
      "all",
    );
    await user.type(
      screen.getByRole("textbox", { name: "Buscar arquivo de áudio" }),
      "bell",
    );
    await user.click(screen.getByRole("button", { name: /Bell/ }));

    expect(onSelect).toHaveBeenCalledWith(assets[2]);
  });
});

function asset(relativePath: string, name: string): AudioAssetDto {
  return {
    name,
    originalFileName: relativePath.split("/").at(-1) ?? relativePath,
    relativePath,
    mediaType: "audio/mpeg",
    durationUs: 1_000_000,
    sizeBytes: 100,
  };
}
