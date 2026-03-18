import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

// Resolve .env from project root regardless of cwd
const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, '../../.env');
config({ path: envPath });
console.log(`[Env] Loaded from: ${envPath}`);
console.log(`[Env] ANTHROPIC_API_KEY set: ${!!process.env.ANTHROPIC_API_KEY}`);

import express from 'express';
import cors from 'cors';
import { runMigrations } from './db/migrations.js';
import dataRouter from './routes/data.js';
import refreshRouter from './routes/refresh.js';

const app = express();
const PORT = process.env.PORT ?? 3001;

// Run DB migrations on startup
runMigrations();

// Middleware
app.use(cors({ origin: process.env.CORS_ORIGIN ?? 'http://localhost:5173' }));
app.use(express.json());

// Routes
app.use('/api', dataRouter);
app.use('/api', refreshRouter);

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`[Server] Funko Tracker API running on http://localhost:${PORT}`);
});
