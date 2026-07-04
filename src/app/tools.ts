import type { Component } from "solid-js";
import type { ImplementedToolId } from "../domain";
import { AudioCompositionTool } from "../tools/audio-composition/AudioCompositionTool";
import { AudioMixerTool } from "../tools/audio-mixer/AudioMixerTool";
import { InitiativeTool } from "../tools/initiative/InitiativeTool";
import { ScenePlannerTool } from "../tools/scenes/ScenePlannerTool";
import { SessionRunnerTool } from "../tools/session-runner/SessionRunnerTool";
import { SessionPlannerTool } from "../tools/sessions/SessionPlannerTool";

export type ToolDefinition = {
  id: ImplementedToolId;
  label: string;
  description: string;
  statusLabel: string;
  Component: Component;
};

export const DEFAULT_TOOL_ID: ImplementedToolId = "session-runner";

export const tools = [
  {
    id: "session-runner",
    label: "Mesa",
    description: "Modo de execucao para usar sessoes e cenas preparadas.",
    statusLabel: "Ativo",
    Component: SessionRunnerTool,
  },
  {
    id: "session-planner",
    label: "Sessoes",
    description: "Organiza cenas preparadas para uma partida.",
    statusLabel: "Ativo",
    Component: SessionPlannerTool,
  },
  {
    id: "scene-planner",
    label: "Cenas",
    description: "Planeja cenas e vincula dados de outras ferramentas.",
    statusLabel: "Ativo",
    Component: ScenePlannerTool,
  },
  {
    id: "audio-composition",
    label: "Audio de cena",
    description: "Compoe objetos e listas de audio para uma cena.",
    statusLabel: "Ativo",
    Component: AudioCompositionTool,
  },
  {
    id: "audio-mixer",
    label: "Mixer de audio",
    description: "Biblioteca e editor de objetos/listas de audio reutilizaveis.",
    statusLabel: "Ativo",
    Component: AudioMixerTool,
  },
  {
    id: "initiative",
    label: "Iniciativa",
    description: "Prepara encontros com participantes para vincular a cenas.",
    statusLabel: "Ativo",
    Component: InitiativeTool,
  },
] as const satisfies readonly ToolDefinition[];

export function getToolById(toolId: ImplementedToolId): ToolDefinition {
  return tools.find((tool) => tool.id === toolId) ?? tools[0];
}
