import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { WaveformEditor } from "./WaveformEditor";

const durationUs = 1_000_000;

function renderEditor(
  overrides: Partial<React.ComponentProps<typeof WaveformEditor>> = {},
) {
  const onChange = vi.fn();
  const onSeek = vi.fn();
  render(
    <WaveformEditor
      peaks={[0.2, 0.8, 0.4]}
      durationUs={durationUs}
      playback={{ startUs: 0, endUs: durationUs }}
      loop={null}
      activeRegion="playback"
      playheadUs={250_000}
      onChange={onChange}
      onSeek={onSeek}
      {...overrides}
    />,
  );
  const editor = screen.getByRole("img", {
    name: "Forma de onda com regiões de reprodução e loop",
  });
  vi.spyOn(editor, "getBoundingClientRect").mockReturnValue({
    x: 0,
    y: 0,
    left: 0,
    top: 0,
    right: 1000,
    bottom: 240,
    width: 1000,
    height: 240,
    toJSON: () => ({}),
  });
  Object.defineProperties(editor, {
    setPointerCapture: { value: vi.fn(), configurable: true },
    hasPointerCapture: { value: vi.fn(() => true), configurable: true },
    releasePointerCapture: { value: vi.fn(), configurable: true },
  });
  return { editor, onChange, onSeek };
}

function drag(editor: HTMLElement, fromX: number, toX: number, y: number) {
  fireEvent.pointerDown(editor, { clientX: fromX, clientY: y, pointerId: 1 });
  fireEvent.pointerMove(editor, { clientX: toX, clientY: y, pointerId: 1 });
  fireEvent.pointerUp(editor, { clientX: toX, clientY: y, pointerId: 1 });
}

describe("WaveformEditor", () => {
  it("creates a region by dragging across the waveform", () => {
    const { editor, onChange } = renderEditor();

    drag(editor, 200, 400, 120);

    expect(onChange).toHaveBeenLastCalledWith("playback", {
      startUs: 200_000,
      endUs: 400_000,
    });
  });

  it("resizes edges and moves the active region from its top bar", () => {
    const playback = { startUs: 200_000, endUs: 600_000 };
    const first = renderEditor({ playback });

    drag(first.editor, 200, 100, 120);
    expect(first.onChange).toHaveBeenLastCalledWith("playback", {
      startUs: 100_000,
      endUs: 600_000,
    });

    first.onChange.mockClear();
    drag(first.editor, 400, 500, 10);
    expect(first.onChange).toHaveBeenLastCalledWith("playback", {
      startUs: 300_000,
      endUs: 700_000,
    });
  });

  it("positions the playhead on a click without changing the region", () => {
    const { editor, onChange, onSeek } = renderEditor();

    fireEvent.pointerDown(editor, {
      clientX: 750,
      clientY: 120,
      pointerId: 1,
    });
    fireEvent.pointerUp(editor, {
      clientX: 750,
      clientY: 120,
      pointerId: 1,
    });

    expect(onChange).not.toHaveBeenCalled();
    expect(onSeek).toHaveBeenCalledWith(750_000);
    expect(screen.getByRole("img", { name: /agulha/i })).toBeInTheDocument();
  });
});
