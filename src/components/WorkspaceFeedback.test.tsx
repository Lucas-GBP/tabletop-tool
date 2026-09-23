import { act, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { WorkspaceFeedback } from "./WorkspaceFeedback";

describe("WorkspaceFeedback", () => {
  afterEach(() => vi.useRealTimers());

  it("shows one transient status message", async () => {
    vi.useFakeTimers();
    render(<WorkspaceFeedback error="" notice="Cena salva." />);

    expect(screen.getByRole("status")).toHaveTextContent("Cena salva.");

    await act(() => vi.advanceTimersByTime(4_000));

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("prioritizes an error when both messages are present", () => {
    render(<WorkspaceFeedback error="Falha ao salvar." notice="Cena salva." />);

    expect(screen.getByRole("alert")).toHaveTextContent("Falha ao salvar.");
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});
