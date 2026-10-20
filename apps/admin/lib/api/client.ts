/** Browser client for the admin app's /api/v1 proxy. Unwraps `{ data }` / `{ data, meta }`. */
export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export type Page<T, Extra = object> = { items: T[]; page: number; pageSize: number; total: number } & Extra;
type Query = Record<string, string | number | boolean | undefined | null>;

const qs = (q?: Query) => {
  if (!q) return '';
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(q)) if (v !== undefined && v !== null && v !== '') sp.set(k, String(v));
  const s = sp.toString();
  return s ? `?${s}` : '';
};

async function request<T>(method: string, path: string, body?: unknown, query?: Query): Promise<T> {
  const res = await fetch(`/api/v1${path}${qs(query)}`, {
    method,
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
    credentials: 'same-origin',
  });
  const json = (res.status === 204 ? null : await res.json().catch(() => null)) as { data?: unknown; meta?: Omit<Page<unknown>, 'items'>; error?: { code: string; message: string; details?: unknown } } | null;
  if (res.status === 401 && typeof window !== 'undefined' && !path.startsWith('/session')) {
    // Session over: back to sign-in, keeping the current page.
    window.location.assign(`/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`);
  }
  if (!res.ok) throw new ApiError(res.status, json?.error?.code ?? 'UNKNOWN', json?.error?.message ?? 'Something went wrong. Try again.', json?.error?.details);
  if (json?.meta) return { items: json.data, ...json.meta } as T;
  return (json?.data ?? null) as T;
}

export const api = {
  get: <T>(path: string, query?: Query) => request<T>('GET', path, undefined, query),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, body ?? {}),
  put: <T>(path: string, body?: unknown) => request<T>('PUT', path, body ?? {}),
  patch: <T>(path: string, body?: unknown) => request<T>('PATCH', path, body ?? {}),
  del: <T>(path: string) => request<T>('DELETE', path),
};
