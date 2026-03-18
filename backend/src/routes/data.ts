import { Router } from 'express';
import { getNewReleases, getBackInStock, getNews, getLastFetched } from '../db/queries.js';
import type { ApiDataResponse } from '../types/funko.js';

const router = Router();

// GET /api/data — full dataset for the frontend
router.get('/data', (_req, res) => {
  const { last_fetched_at } = getLastFetched();

  const payload: ApiDataResponse = {
    new_releases: getNewReleases(),
    back_in_stock: getBackInStock(),
    news_updates: getNews(),
    last_fetched_at,
  };

  res.json(payload);
});

// GET /api/last-fetched — lightweight poll endpoint
router.get('/last-fetched', (_req, res) => {
  res.json(getLastFetched());
});

export default router;
