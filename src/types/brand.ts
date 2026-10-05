/**
 * Unique symbol used internally to distinguish branded types.
 *
 * This symbol exists only at the type level and does not produce
 * any runtime JavaScript.
 *
 * @internal
 */
declare const brand: unique symbol;

/**
 * Creates a nominal-like type from an existing TypeScript type.
 *
 * Branded types remain structurally compatible with their underlying
 * type in one direction, while preventing unrelated values from being
 * assigned to the branded type.
 *
 * @template T The underlying TypeScript type.
 * @template TName The unique name used to identify the brand.
 *
 * @example
 * ```ts
 * type Mass = Brand<number, "Mass">;
 * type Time = Brand<number, "Time">;
 *
 * declare const mass: Mass;
 * declare const time: Time;
 *
 * const valid: number = mass; // OK
 * const invalid: Mass = time; // Type error
 * ```
 */
export type Brand<T, TName extends string> = T & {
  readonly [brand]: TName;
};
