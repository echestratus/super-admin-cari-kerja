/** Deep-link into Trust & Safety queue, optionally focusing one event. */
export function trustSafetyPath(eventId?: string | null) {
  if (eventId) return `/trust-safety?eventId=${encodeURIComponent(eventId)}`
  return "/trust-safety"
}
