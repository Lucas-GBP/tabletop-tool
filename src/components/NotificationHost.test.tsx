import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useNotifications } from "@/hooks";
import { NotificationHost } from "./NotificationHost";

function Publisher() {
  const notify = useNotifications();
  return <button onClick={() => notify("Cena salva.")}>Salvar</button>;
}

describe("NotificationHost", () => {
  afterEach(() => vi.useRealTimers());

  it("shows and dismisses a global transient notification", async () => {
    vi.useFakeTimers();
    render(
      <NotificationHost>
        <Publisher />
      </NotificationHost>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Salvar" }));
    expect(screen.getByRole("status")).toHaveTextContent("Cena salva.");

    await act(() => vi.advanceTimersByTime(4_000));
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});
