import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { WorkspaceFeedback } from "./WorkspaceFeedback";

describe("WorkspaceFeedback", () => {
  it("keeps an operation error close to its surface", () => {
    render(<WorkspaceFeedback error="Falha ao salvar." />);

    expect(screen.getByRole("alert")).toHaveTextContent("Falha ao salvar.");
  });
});
