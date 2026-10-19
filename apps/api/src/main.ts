import { createApp } from './bootstrap';
import { loadEnv } from './config/env';

const env = loadEnv();
const app = await createApp(env);
await app.listen(env.PORT);
