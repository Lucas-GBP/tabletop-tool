import type { DomainEntityKind, EntityIdFor, ToolId } from "./ids";

export const REFERENCE_STATUS = ["resolved", "missing"] as const;

export type ReferenceStatus = (typeof REFERENCE_STATUS)[number];

export const MISSING_REFERENCE_REASONS = [
  "notFound",
  "deleted",
  "unsupportedTool",
  "invalid",
] as const;

export type MissingReferenceReason = (typeof MISSING_REFERENCE_REASONS)[number];

export type DomainReference<TKind extends DomainEntityKind = DomainEntityKind> = {
  toolId: ToolId;
  entityKind: TKind;
  entityId: EntityIdFor<TKind>;
};

export type ResolvedReference<TKind extends DomainEntityKind = DomainEntityKind> = {
  status: "resolved";
  reference: DomainReference<TKind>;
  label: string;
};

export type MissingReference<TKind extends DomainEntityKind = DomainEntityKind> = {
  status: "missing";
  reference: DomainReference<TKind>;
  label: string;
  reason: MissingReferenceReason;
};

export type ReferenceResolution<TKind extends DomainEntityKind = DomainEntityKind> =
  | ResolvedReference<TKind>
  | MissingReference<TKind>;

export function createReference<TKind extends DomainEntityKind>(
  toolId: ToolId,
  entityKind: TKind,
  entityId: EntityIdFor<TKind>
): DomainReference<TKind> {
  return {
    toolId,
    entityKind,
    entityId,
  };
}
