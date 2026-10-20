export const SESSION_COOKIE = 'tp_session';
export const FAIL_COOKIE = 'tp_mock_fail';

/** Real NestJS API mode (browser → /api/v1 proxy → API_URL). Otherwise the built-in mock. */
export const REAL_API = (process.env.NEXT_PUBLIC_API_BASE || '/api/mock') === '/api/v1';
/** httpOnly token cookies on the web origin (the browser never sees the tokens). */
export const ACCESS_COOKIE = 'tp_at';
export const REFRESH_COOKIE = 'tp_rt';
