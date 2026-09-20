import { commands } from "./bindings";

// Keep the generated IPC details at this boundary, outside visual components.
export const api = {
  greet: (name: string) => commands.greet(name),
};
