import { createApi } from './endpoints';
import { httpTransport } from './transport';

/** Browser API client (used by TanStack Query hooks). */
export const api = createApi(httpTransport());
export { ApiError } from './transport';
