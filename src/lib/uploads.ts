/** Resolve uploaded file paths (e.g. /uploads/...) against the API host. */
export function resolveUploadUrl(fileUrl?: string | null): string {
  if (!fileUrl) return ""
  if (/^https?:\/\//i.test(fileUrl)) return fileUrl
  const apiBase = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api/v1"
  const origin = String(apiBase).replace(/\/api\/v1\/?$/i, "")
  return `${origin}${fileUrl.startsWith("/") ? fileUrl : `/${fileUrl}`}`
}
