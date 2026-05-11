/**
 * Tiny typed fetch wrapper.
 * - Adds X-Client-Id automatically.
 * - Throws a normalized Error with .code/.message/.field for the UI.
 */

import { getClientId } from './clientId';

const BASE = (import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000').replace(/\/$/, '');

export class ApiClientError extends Error {
  code: string;
  field: string | null;
  status: number;
  constructor(status: number, code: string, message: string, field: string | null) {
    super(message);
    this.code = code;
    this.field = field;
    this.status = status;
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'DELETE';
  body?: unknown;
  signal?: AbortSignal;
}

export async function api<T = unknown>(path: string, opts: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, signal } = opts;
  const url = `${BASE}${path.startsWith('/') ? path : `/${path}`}`;
  const headers: Record<string, string> = {
    'X-Client-Id': getClientId(),
  };
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  const res = await fetch(url, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    signal,
  });

  if (res.status === 204) return undefined as T;

  const text = await res.text();
  const json = text ? JSON.parse(text) : null;

  if (!res.ok) {
    const err = (json as { error?: { code: string; message: string; field: string | null } })
      ?.error;
    throw new ApiClientError(
      res.status,
      err?.code ?? 'HTTP_ERROR',
      err?.message ?? `HTTP ${res.status}`,
      err?.field ?? null,
    );
  }
  return json as T;
}
