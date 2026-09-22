export interface RuntimeErrorOptions {
  code: string;
  message: string;
  recoverable: boolean;
  operation?: string;
  entityId?: string;
  details?: string;
}

export class RuntimeError extends Error {
  readonly code: string;
  readonly recoverable: boolean;
  readonly operation: string | undefined;
  readonly entityId: string | undefined;
  readonly details: string | undefined;

  constructor(options: RuntimeErrorOptions) {
    super(options.message);
    this.name = "RuntimeError";
    this.code = options.code;
    this.recoverable = options.recoverable;
    this.operation = options.operation;
    this.entityId = options.entityId;
    this.details = options.details;
  }
}

export function normalizeRuntimeError(
  cause: unknown,
  fallback: RuntimeErrorOptions,
) {
  if (cause instanceof RuntimeError) return cause;

  const details =
    cause instanceof Error
      ? `${cause.name}: ${cause.message}`
      : `Unknown runtime failure: ${String(cause)}`;

  return new RuntimeError({ ...fallback, details });
}
