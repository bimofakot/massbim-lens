import { createApiApp } from '../server/app.ts';

const app = createApiApp({ isProd: true });

export default app;
