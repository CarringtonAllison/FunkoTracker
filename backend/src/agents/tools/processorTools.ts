import crypto from 'crypto';
import {
  getExistingRecord,
  saveNewRecord,
  updateRecord,
} from '../../db/queries.js';
import type { ScrapedProduct, ScrapedNewsItem } from '../../types/funko.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function hashUrl(url: string): string {
  return crypto.createHash('sha256').update(url).digest('hex').slice(0, 12);
}

function generateId(title: string): string {
  return crypto.createHash('sha256').update(title).digest('hex').slice(0, 12);
}

export interface UpsertResult {
  action: 'inserted' | 'updated' | 'skipped';
  external_id: string;
  title: string;
}

// ─── Tool Executors ───────────────────────────────────────────────────────────

export function upsertNewRelease(item: ScrapedProduct): UpsertResult {
  const external_id = item.product_url ? hashUrl(item.product_url) : generateId(item.title);
  const existing = getExistingRecord('new_releases', external_id);
  const now = new Date().toISOString();

  if (!existing) {
    saveNewRecord('new_releases', {
      external_id,
      title: item.title,
      product_line: item.product_line ?? null,
      price: item.price ?? null,
      image_url: item.image_url ?? null,
      product_url: item.product_url ?? null,
      available_date: item.available_date ?? null,
      first_seen_at: now,
      updated_at: now,
    });
    return { action: 'inserted', external_id, title: item.title };
  }

  const changed =
    existing['title'] !== item.title ||
    existing['price'] !== (item.price ?? null) ||
    existing['available_date'] !== (item.available_date ?? null);

  if (changed) {
    updateRecord('new_releases', external_id, {
      title: item.title,
      price: item.price ?? null,
      image_url: item.image_url ?? null,
      available_date: item.available_date ?? null,
      updated_at: now,
    });
    return { action: 'updated', external_id, title: item.title };
  }

  return { action: 'skipped', external_id, title: item.title };
}

export function upsertBackInStock(item: ScrapedProduct): UpsertResult {
  const external_id = item.product_url ? hashUrl(item.product_url) : generateId(item.title);
  const existing = getExistingRecord('back_in_stock', external_id);
  const now = new Date().toISOString();

  if (!existing) {
    saveNewRecord('back_in_stock', {
      external_id,
      title: item.title,
      product_line: item.product_line ?? null,
      price: item.price ?? null,
      image_url: item.image_url ?? null,
      product_url: item.product_url ?? null,
      restocked_at: item.restocked_at ?? now,
      first_seen_at: now,
      updated_at: now,
    });
    return { action: 'inserted', external_id, title: item.title };
  }

  const changed =
    existing['title'] !== item.title ||
    existing['price'] !== (item.price ?? null);

  if (changed) {
    updateRecord('back_in_stock', external_id, {
      title: item.title,
      price: item.price ?? null,
      image_url: item.image_url ?? null,
      restocked_at: item.restocked_at ?? null,
      updated_at: now,
    });
    return { action: 'updated', external_id, title: item.title };
  }

  return { action: 'skipped', external_id, title: item.title };
}

export function upsertNewsItem(item: ScrapedNewsItem): UpsertResult {
  const external_id = item.article_url ? hashUrl(item.article_url) : generateId(item.headline);
  const existing = getExistingRecord('news_updates', external_id);
  const now = new Date().toISOString();

  if (!existing) {
    saveNewRecord('news_updates', {
      external_id,
      headline: item.headline,
      summary: item.summary ?? null,
      article_url: item.article_url ?? null,
      published_at: item.published_at ?? null,
      category: item.category ?? null,
      first_seen_at: now,
      updated_at: now,
    });
    return { action: 'inserted', external_id, title: item.headline };
  }

  const changed =
    existing['headline'] !== item.headline ||
    existing['summary'] !== (item.summary ?? null);

  if (changed) {
    updateRecord('news_updates', external_id, {
      headline: item.headline,
      summary: item.summary ?? null,
      published_at: item.published_at ?? null,
      category: item.category ?? null,
      updated_at: now,
    });
    return { action: 'updated', external_id, title: item.headline };
  }

  return { action: 'skipped', external_id, title: item.headline };
}

// ─── Tool Definitions (for Claude) ────────────────────────────────────────────

export const PROCESSOR_TOOL_DEFINITIONS = [
  {
    name: 'upsert_new_release',
    description:
      'Save or update a new Funko release in the database. If the item already exists and nothing changed, it is skipped. Returns the action taken.',
    input_schema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Product title' },
        product_line: { type: 'string', description: 'Product line / series' },
        price: { type: 'string', description: 'Price as string, e.g. "$12.99"' },
        image_url: { type: 'string', description: 'Product image URL' },
        product_url: { type: 'string', description: 'Product page URL — used as dedup key' },
        available_date: { type: 'string', description: 'Release / pre-order date' },
      },
      required: ['title'],
    },
  },
  {
    name: 'upsert_back_in_stock',
    description:
      'Save or update a back-in-stock Funko item in the database. Skipped if unchanged.',
    input_schema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Product title' },
        product_line: { type: 'string', description: 'Product line / series' },
        price: { type: 'string', description: 'Price as string' },
        image_url: { type: 'string', description: 'Product image URL' },
        product_url: { type: 'string', description: 'Product page URL — used as dedup key' },
        restocked_at: { type: 'string', description: 'ISO timestamp when restocked' },
      },
      required: ['title'],
    },
  },
  {
    name: 'upsert_news_item',
    description:
      'Save or update a Funko news/announcement item in the database. Skipped if unchanged.',
    input_schema: {
      type: 'object',
      properties: {
        headline: { type: 'string', description: 'Article headline' },
        summary: { type: 'string', description: 'Short summary or excerpt' },
        article_url: { type: 'string', description: 'Article URL — used as dedup key' },
        published_at: { type: 'string', description: 'Publication date' },
        category: { type: 'string', description: 'Article category or tag' },
      },
      required: ['headline'],
    },
  },
];
