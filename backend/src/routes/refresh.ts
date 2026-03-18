import { Router } from 'express';
import { runPipeline } from '../agents/pipeline.js';

const router = Router();

// Simple in-memory guard — prevents concurrent pipeline runs
let isRunning = false;
let lastRunAt: number | null = null;
const RATE_LIMIT_MS = 5 * 60 * 1000; // 5 minutes

// POST /api/refresh — trigger a fresh scrape + persist cycle
router.post('/refresh', async (_req, res) => {
  if (isRunning) {
    res.status(429).json({ error: 'A refresh is already in progress. Please wait.' });
    return;
  }

  if (lastRunAt !== null && Date.now() - lastRunAt < RATE_LIMIT_MS) {
    const secondsLeft = Math.ceil((RATE_LIMIT_MS - (Date.now() - lastRunAt)) / 1000);
    res.status(429).json({ error: `Rate limited. Try again in ${secondsLeft} seconds.` });
    return;
  }

  isRunning = true;
  lastRunAt = Date.now();

  try {
    const result = await runPipeline();
    res.json(result);
  } catch (err) {
    const error_msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: error_msg });
  } finally {
    isRunning = false;
  }
});

export default router;
