/**
 * API Client — Centralized HTTP client with auth, error handling, and typed responses.
 * Replaces the old `apiFetch` from store.ts. All API calls go through this module.
 */

import { useUIStore } from './ui-store';

export class ApiError extends Error {
  status: number;
  data?: unknown;

  constructor(message: string, status: number, data?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

/**
 * Core fetch wrapper that attaches auth tokens and handles common error patterns.
 */
export async function apiClient<T>(
  url: string,
  options?: RequestInit & { skipAuth?: boolean }
): Promise<T> {
  const { skipAuth, ...fetchOptions } = options || {};
  const headers: Record<string, string> = {
    ...(fetchOptions.headers as Record<string, string> || {}),
  };

  // Attach auth token from UI store (or NextAuth session)
  if (!skipAuth) {
    const token = useUIStore.getState().authToken;
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  try {
    const res = await fetch(url, { ...fetchOptions, headers });

    if (!res.ok) {
      // 401 — session expired
      if (res.status === 401) {
        const state = useUIStore.getState();
        if (state.isAuthenticated && state.authToken) {
          state.logout();
        }
        throw new ApiError('Session expired', 401);
      }

      // 403 — insufficient permissions
      if (res.status === 403) {
        throw new ApiError('Insufficient permissions', 403);
      }

      // 429 — rate limited
      if (res.status === 429) {
        const retryAfter = res.headers.get('Retry-After');
        throw new ApiError(
          `Rate limited. Try again in ${retryAfter || '60'} seconds.`,
          429,
          { retryAfter }
        );
      }

      // 502/503/504 — server unavailable
      if (res.status >= 502) {
        throw new ApiError(`Server unavailable (${res.status})`, res.status);
      }

      // Other errors — try to parse error body
      let errorData: unknown;
      try {
        errorData = await res.json();
      } catch {
        errorData = undefined;
      }
      const message = (errorData as Record<string, unknown>)?.message || `API error: ${res.status}`;
      throw new ApiError(message as string, res.status, errorData);
    }

    // Handle 204 No Content
    if (res.status === 204) {
      return undefined as T;
    }

    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      throw new ApiError('Invalid response format', res.status);
    }

    const data = await res.json();
    return data.data !== undefined ? data.data : data;
  } catch (err) {
    if (err instanceof ApiError) throw err;

    // Network errors
    if (err instanceof TypeError && err.message.includes('fetch')) {
      throw new ApiError('Network error — server may be restarting', 0);
    }

    throw err;
  }
}

/**
 * Convenience methods for common HTTP verbs
 */
export const api = {
  get: <T>(url: string, options?: RequestInit) =>
    apiClient<T>(url, { ...options, method: 'GET' }),

  post: <T>(url: string, body?: unknown, options?: RequestInit) =>
    apiClient<T>(url, {
      ...options,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(options?.headers as Record<string, string>) },
      body: body ? JSON.stringify(body) : undefined,
    }),

  put: <T>(url: string, body?: unknown, options?: RequestInit) =>
    apiClient<T>(url, {
      ...options,
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...(options?.headers as Record<string, string>) },
      body: body ? JSON.stringify(body) : undefined,
    }),

  patch: <T>(url: string, body?: unknown, options?: RequestInit) =>
    apiClient<T>(url, {
      ...options,
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...(options?.headers as Record<string, string>) },
      body: body ? JSON.stringify(body) : undefined,
    }),

  delete: <T>(url: string, options?: RequestInit) =>
    apiClient<T>(url, { ...options, method: 'DELETE' }),

  upload: <T>(url: string, formData: FormData, options?: RequestInit) =>
    apiClient<T>(url, {
      ...options,
      method: 'POST',
      body: formData,
      // Do NOT set Content-Type — browser sets multipart/form-data with boundary
    }),
};

/**
 * Backwards-compatible alias so existing code importing from store still works.
 * New code should use `api` or `apiClient` directly.
 */
export { apiClient as apiFetch };
