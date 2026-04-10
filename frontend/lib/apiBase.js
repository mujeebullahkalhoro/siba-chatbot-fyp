/**
 * API origin for browser requests.
 * - If NEXT_PUBLIC_API_BASE is set, use it (production / custom backend).
 * - Otherwise in the browser use "" so requests go to the Next host and next.config rewrites proxy /api/* to the backend.
 * - On the server (SSR), fall back to localhost backend for any rare server-side fetches.
 */
export function getApiBase() {
  const env = typeof process !== "undefined" ? process.env.NEXT_PUBLIC_API_BASE?.trim() : "";
  if (env) return env.replace(/\/$/, "");
  if (typeof window !== "undefined") return "";
  return "http://localhost:8000";
}
