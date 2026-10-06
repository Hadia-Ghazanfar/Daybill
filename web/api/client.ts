/**
 * API client — fetch wrapper for the Daybill backend.
 * Base URL comes from VITE_API_URL ('' = same origin; local dev proxies
 * /api → localhost:3001 via vite.config.ts). The /api prefix is added
 * automatically unless the path already starts with /api.
 */

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

const BASE = (import.meta.env.VITE_API_URL as string | undefined) || '';

const TOKEN_KEY = 'daybill-token';

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string | null): void {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* storage unavailable — ignore */
  }
}

function urlFor(path: string): string {
  const withApi =
    path === '/api' || path.startsWith('/api/')
      ? path
      : `/api${path.startsWith('/') ? '' : '/'}${path}`;
  return `${BASE}${withApi}`;
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(urlFor(path), {
    method,
    headers,
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });

  if (res.status === 204) return {} as T;

  let data: unknown = null;
  try {
    data = await res.json();
  } catch {
    /* non-JSON body — leave data null */
  }

  if (!res.ok) {
    const msg =
      (data as { message?: string; error?: string } | null)?.message ||
      (data as { error?: string } | null)?.error ||
      `Request failed (${res.status})`;
    throw new ApiError(res.status, String(msg));
  }

  return data as T;
}

export const api = {
  get: <T>(path: string): Promise<T> => request<T>('GET', path),
  post: <T>(path: string, body?: unknown): Promise<T> =>
    request<T>('POST', path, body),
  put: <T>(path: string, body?: unknown): Promise<T> =>
    request<T>('PUT', path, body),
  del: <T>(path: string): Promise<T> => request<T>('DELETE', path),
};
