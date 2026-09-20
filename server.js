import { createRuntime } from './server/runtime.js';

const { app } = await createRuntime();

export default app;
