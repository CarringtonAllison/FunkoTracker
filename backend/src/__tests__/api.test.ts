import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import cors from 'cors';
import { runMigrations } from '../db/migrations.js';
import dataRouter from '../routes/data.js';
import refreshRouter from '../routes/refresh.js';

// Build the Express app the same way index.ts does, but without app.listen()
function buildApp() {
  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use('/api', dataRouter);
  app.use('/api', refreshRouter);
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });
  return app;
}

let app: ReturnType<typeof buildApp>;

beforeAll(() => {
  runMigrations();
  app = buildApp();
});

// ─── Health check ─────────────────────────────────────────────────────────────

describe('GET /health', () => {
  it('returns 200 with status ok', async () => {
    const res = await request(app).get('/health');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.timestamp).toBeTruthy();
  });
});

// ─── GET /api/data ────────────────────────────────────────────────────────────

describe('GET /api/data', () => {
  it('returns 200 with the correct shape', async () => {
    const res = await request(app).get('/api/data');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('new_releases');
    expect(res.body).toHaveProperty('back_in_stock');
    expect(res.body).toHaveProperty('news_updates');
    expect(res.body).toHaveProperty('last_fetched_at');
  });

  it('returns arrays for all three data sections', async () => {
    const res = await request(app).get('/api/data');

    expect(Array.isArray(res.body.new_releases)).toBe(true);
    expect(Array.isArray(res.body.back_in_stock)).toBe(true);
    expect(Array.isArray(res.body.news_updates)).toBe(true);
  });

  it('returns null for last_fetched_at on a fresh database', async () => {
    const res = await request(app).get('/api/data');

    expect(res.body.last_fetched_at).toBeNull();
  });
});

// ─── GET /api/last-fetched ────────────────────────────────────────────────────

describe('GET /api/last-fetched', () => {
  it('returns 200 with last_fetched_at and status fields', async () => {
    const res = await request(app).get('/api/last-fetched');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('last_fetched_at');
    expect(res.body).toHaveProperty('status');
  });

  it('returns null last_fetched_at on a fresh database', async () => {
    const res = await request(app).get('/api/last-fetched');

    expect(res.body.last_fetched_at).toBeNull();
  });
});

// ─── POST /api/refresh ────────────────────────────────────────────────────────

describe('POST /api/refresh rate limiting', () => {
  it('returns 429 if called twice in quick succession', async () => {
    // First call kicks off a run (will fail fast with no API key in test env — that is expected)
    // Second call should be blocked by the in-progress guard
    const [first, second] = await Promise.all([
      request(app).post('/api/refresh'),
      request(app).post('/api/refresh'),
    ]);

    // At least one of them must be a 429 (in-progress block)
    const statuses = [first.status, second.status];
    expect(statuses).toContain(429);
  });
});

// ─── 404 handling ─────────────────────────────────────────────────────────────

describe('unknown routes', () => {
  it('returns 404 for an unknown endpoint', async () => {
    const res = await request(app).get('/api/does-not-exist');
    expect(res.status).toBe(404);
  });
});
