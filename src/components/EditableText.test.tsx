import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import { EditableText } from "./EditableText";

it("cancels inline editing when focus leaves the text", async () => {
  const user = userEvent.setup();
  const onSave = vi.fn().mockResolvedValue(true);

  render(
    <>
      <EditableText
        as="h2"
        value="Cena inicial"
        label="nome da cena Cena inicial"
        onSave={onSave}
      />
      <button type="button">Fora do editor</button>
    </>,
  );

  await user.dblClick(screen.getByRole("heading", { name: "Cena inicial" }));
  const input = screen.getByRole("textbox", {
    name: "Novo nome da cena Cena inicial",
  });

  expect(input.closest("h2")).not.toBeNull();
  expect(screen.queryByRole("button", { name: "Salvar" })).toBeNull();
  expect(screen.queryByRole("button", { name: "Cancelar" })).toBeNull();

  await user.clear(input);
  await user.type(input, "Outro nome");
  await user.click(screen.getByRole("button", { name: "Fora do editor" }));

  expect(screen.getByRole("heading", { name: "Cena inicial" })).toBeVisible();
  expect(onSave).not.toHaveBeenCalled();
});
