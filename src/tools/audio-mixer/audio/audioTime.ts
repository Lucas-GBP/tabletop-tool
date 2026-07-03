export function formatSeconds(seconds: number): string {
  if (seconds < 60) {
    return `${seconds.toFixed(1)}s`;
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.round(seconds % 60)
    .toString()
    .padStart(2, "0");

  return `${minutes}:${remainingSeconds}`;
}

export function formatOptionalSeconds(seconds: number | null, nullLabel = "Ate o fim"): string {
  return seconds === null ? nullLabel : formatSeconds(seconds);
}
