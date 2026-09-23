export const microsecondsPerSecond = 1_000_000;

export function microsecondsToSeconds(value: number) {
  return value / microsecondsPerSecond;
}

export function secondsToMicroseconds(value: number) {
  return Math.round(value * microsecondsPerSecond);
}

export function decibelsToGain(value: number) {
  const gain = 10 ** (value / 20);
  if (!Number.isFinite(gain)) {
    throw new RangeError("The dB value cannot be represented as linear gain.");
  }
  return gain;
}

export function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}
