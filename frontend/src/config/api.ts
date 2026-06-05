const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL as string | undefined;

function normalizeBaseUrl(url: string): string {
  return url.replace(/\/$/, "");
}

/**
 * Backend API origin. Set VITE_API_BASE_URL in .env (see .env.example).
 * Falls back to localhost in dev and the production host in prod builds.
 */
export const API_BASE_URL = normalizeBaseUrl(
  configuredBaseUrl ??
    (import.meta.env.PROD
      ? "https://postgresql-ai-assistant.onrender.com"
      : "http://localhost:3000")
);

export function apiUrl(path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
}
