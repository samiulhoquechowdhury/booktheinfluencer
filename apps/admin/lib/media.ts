/** Talent photo keys are site paths on the public website (or absolute URLs); preview them from there. */
const WEB = (process.env.NEXT_PUBLIC_WEB_URL || 'http://localhost:3000').replace(/\/$/, '');
export const mediaSrc = (key: string) => (/^https?:\/\//.test(key) ? key : `${WEB}${key.startsWith('/') ? '' : '/'}${key}`);
export const webUrl = (path: string) => `${WEB}${path}`;
