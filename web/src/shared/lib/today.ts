export function todayIso(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10)
}
