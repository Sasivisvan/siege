// ============================================
// SIEGE Client — API Client
// ============================================
// Centralized fetch wrapper with auth headers.
// ============================================

const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? '';

/**
 * Get the stored auth token from localStorage.
 */
function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('siege_token');
}

/**
 * Authenticated fetch wrapper.
 * Automatically attaches `Authorization: Bearer <token>` and `Content-Type: application/json`.
 *
 * @throws Error if response is not ok
 */
export async function apiFetch<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'content-type': 'application/json',
    ...(init.headers as Record<string, string> ?? {}),
  };

  if (token) {
    headers['authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers,
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    const message = body?.error?.message || `Request failed with ${response.status}`;
    throw new Error(message);
  }

  return response.json() as Promise<T>;
}
