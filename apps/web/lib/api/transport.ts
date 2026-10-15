import { ApiErrorSchema } from '@repo/schemas';

export type ApiRequest = {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  query?: Record<string, string | number | boolean | undefined>;
  body?: unknown;
};
export type Transport = (req: ApiRequest) => Promise<unknown>;

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export function toSearch(query: ApiRequest['query']): string {
  if (!query) return '';
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) if (v !== undefined && v !== '' && v !== false) sp.set(k, String(v));
  const s = sp.toString();
  return s ? `?${s}` : '';
}

export function raise(status: number, body: unknown): never {
  const parsed = ApiErrorSchema.safeParse(body);
  throw new ApiError(
    status,
    parsed.success ? parsed.data.error.code : 'UNKNOWN',
    parsed.success ? parsed.data.error.message : 'Unexpected response from server.',
  );
}

const bigintReplacer = (_k: string, v: unknown) => (typeof v === 'bigint' ? v.toString() : v);

/**
 * Browser transport. Today: Next route handler at /api/mock. Later: point API_BASE at NestJS
 * (`/v1`) — nothing in UI changes.
 */
export const httpTransport =
  (base = process.env.NEXT_PUBLIC_API_BASE ?? '/api/mock'): Transport =>
  async ({ method, path, query, body }) => {
    const res = await fetch(`${base}${path}${toSearch(query)}`, {
      method,
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body, bigintReplacer),
      credentials: 'include',
    });
    const json: unknown = await res.json().catch(() => null);
    if (!res.ok) raise(res.status, json);
    return json;
  };
