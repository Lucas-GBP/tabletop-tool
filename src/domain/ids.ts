export const TOOL_IDS = [
  "session-runner",
  "session-planner",
  "scene-planner",
  "audio-composition",
  "audio-mixer",
  "initiative",
] as const;

export type ToolId = (typeof TOOL_IDS)[number];

export const IMPLEMENTED_TOOL_IDS = [
  "session-runner",
  "session-planner",
  "scene-planner",
  "audio-composition",
  "audio-mixer",
  "initiative",
] as const satisfies readonly ToolId[];

export type ImplementedToolId = (typeof IMPLEMENTED_TOOL_IDS)[number];

export const DOMAIN_ENTITY_KINDS = [
  "audioFile",
  "audioObject",
  "audioObjectList",
  "audioComposition",
  "scene",
  "session",
  "initiativeEncounter",
  "creature",
  "note",
] as const;

export type DomainEntityKind = (typeof DOMAIN_ENTITY_KINDS)[number];

type Brand<TName extends string> = string & { readonly __brand: TName };

export type AudioFileId = Brand<"audioFileId">;
export type AudioObjectId = Brand<"audioObjectId">;
export type AudioObjectListId = Brand<"audioObjectListId">;
export type AudioCompositionId = Brand<"audioCompositionId">;
export type SceneId = Brand<"sceneId">;
export type SessionId = Brand<"sessionId">;
export type InitiativeEncounterId = Brand<"initiativeEncounterId">;
export type CreatureId = Brand<"creatureId">;
export type NoteId = Brand<"noteId">;

export type EntityIdFor<TKind extends DomainEntityKind> = TKind extends "audioFile"
  ? AudioFileId
  : TKind extends "audioObject"
    ? AudioObjectId
    : TKind extends "audioObjectList"
      ? AudioObjectListId
      : TKind extends "audioComposition"
        ? AudioCompositionId
        : TKind extends "scene"
          ? SceneId
          : TKind extends "session"
            ? SessionId
            : TKind extends "initiativeEncounter"
              ? InitiativeEncounterId
              : TKind extends "creature"
                ? CreatureId
                : NoteId;

export function toEntityId<TKind extends DomainEntityKind>(
  _kind: TKind,
  value: string
): EntityIdFor<TKind> {
  return value as EntityIdFor<TKind>;
}
