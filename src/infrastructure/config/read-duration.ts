const processDurations = new Map<string, number>();

export function readDurationMs(
  env: Readonly<Record<string, string | undefined>>,
  name: string,
  fallbackSeconds: number,
): number {
  // Read each process setting once; explicit environments remain testable.
  const cached = env === process.env ? processDurations.get(name) : undefined;
  if (cached !== undefined) return cached;
  const seconds = env[name] === undefined ? fallbackSeconds : Number(env[name]);
  const milliseconds = seconds * 1000;
  if (
    !Number.isSafeInteger(seconds) ||
    seconds <= 0 ||
    !Number.isSafeInteger(milliseconds)
  ) {
    throw new Error(
      `${name} must be positive whole seconds within the supported range.`,
    );
  }
  if (env === process.env) processDurations.set(name, milliseconds);
  return milliseconds;
}
