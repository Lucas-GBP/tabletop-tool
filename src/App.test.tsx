import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { commands } from "./shared/api/bindings";
import App from "./App";

vi.mock("./shared/api/bindings", () => ({
  commands: { greet: vi.fn() },
}));

describe("template IPC integration", () => {
  it("passes the entered name through the API and renders the greeting", async () => {
    const user = userEvent.setup();
    vi.mocked(commands.greet).mockResolvedValue("Hello, Lucas!");
    render(<App />);

    await user.type(screen.getByRole("textbox", { name: "Name" }), "Lucas");
    await user.click(screen.getByRole("button", { name: "Greet" }));

    expect(commands.greet).toHaveBeenCalledExactlyOnceWith("Lucas");
    expect(await screen.findByRole("status")).toHaveTextContent(
      "Hello, Lucas!",
    );
  });

  it("reports a failed command and allows a successful retry", async () => {
    const user = userEvent.setup();
    const failure = new Error("IPC unavailable");
    const diagnostic = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(commands.greet)
      .mockRejectedValueOnce(failure)
      .mockResolvedValueOnce("Hello, Lucas!");
    render(<App />);

    await user.type(screen.getByRole("textbox", { name: "Name" }), "Lucas");
    await user.click(screen.getByRole("button", { name: "Greet" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Could not load the greeting. Please try again.",
    );
    expect(diagnostic).toHaveBeenCalledWith("Greeting command failed", {
      operation: "greet",
      cause: failure,
    });

    await user.click(screen.getByRole("button", { name: "Greet" }));

    expect(screen.getByRole("status")).toHaveTextContent("Hello, Lucas!");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(commands.greet).toHaveBeenCalledTimes(2);
  });
});
