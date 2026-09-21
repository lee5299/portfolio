import express from 'express';
import { createRuntime } from './server/runtime.js';

const app = express();
const { app: runtimeApp } = await createRuntime();
app.use(runtimeApp);

export default app;
