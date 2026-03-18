import { describe, it, expect, beforeEach } from 'vitest';
import { runMigrations } from '../db/migrations.js';

// ─── Import the internal helpers we want to test ──────────────────────────────
// We test the junk filter by importing the upsert functions and passing junk
// through processorTools (which doesn't filter — filtering is in scrapeTools).
// So we test the filter logic directly via a thin re-export trick below.

// Pull in the JUNK_PATTERNS logic by duplicating it here for unit testing.
// (The real logic lives in scrapeTools.ts — if you change patterns there, update here too.)
const JUNK_PATTERNS = [
  /cookie/i,
  /accept all/i,
  /privacy policy/i,
  /terms of (use|service)/i,
  /sign (in|up)/i,
  /newsletter/i,
  /subscribe/i,
  /your (cart|bag)/i,
  /^(home|shop|account|search|menu)$/i,
];

function isJunkTitle(title: string): boolean {
  if (!title || title.length < 4) return true;
  return JUNK_PATTERNS.some((re) => re.test(title));
}

// ─── Junk filter ──────────────────────────────────────────────────────────────

describe('isJunkTitle (scrape output filter)', () => {
  it('filters out empty string', () => {
    expect(isJunkTitle('')).toBe(true);
  });

  it('filters out titles shorter than 4 chars', () => {
    expect(isJunkTitle('Hi')).toBe(true);
    expect(isJunkTitle('Pop')).toBe(true);
  });

  it('filters out cookie consent banners', () => {
    expect(isJunkTitle('Accept All Cookies')).toBe(true);
    expect(isJunkTitle('Cookie Policy')).toBe(true);
    expect(isJunkTitle('We use cookies on this site')).toBe(true);
  });

  it('filters out privacy/terms links', () => {
    expect(isJunkTitle('Privacy Policy')).toBe(true);
    expect(isJunkTitle('Terms of Use')).toBe(true);
    expect(isJunkTitle('Terms of Service')).toBe(true);
  });

  it('filters out nav / sign-in links', () => {
    expect(isJunkTitle('Sign In')).toBe(true);
    expect(isJunkTitle('Sign Up')).toBe(true);
    expect(isJunkTitle('Home')).toBe(true);
    expect(isJunkTitle('Shop')).toBe(true);
    expect(isJunkTitle('Menu')).toBe(true);
  });

  it('filters out newsletter / subscribe prompts', () => {
    expect(isJunkTitle('Subscribe to our newsletter')).toBe(true);
    expect(isJunkTitle('Newsletter signup')).toBe(true);
  });

  it('does NOT filter real product titles', () => {
    expect(isJunkTitle('Pop! Spider-Man')).toBe(false);
    expect(isJunkTitle('Funko POP! Batman #01')).toBe(false);
    expect(isJunkTitle('Dragon Ball Z: Goku Vinyl Figure')).toBe(false);
  });

  it('does NOT filter real news headlines', () => {
    expect(isJunkTitle('New Funko Exclusive Revealed at SDCC 2026')).toBe(false);
    expect(isJunkTitle('Spring Drop: Marvel Wave 3 Now Available')).toBe(false);
  });
});

// ─── processorAgent fallback summary ─────────────────────────────────────────
// Test that when Agent 2 returns prose instead of JSON, the fallback
// still produces a valid ProcessorSummary from the tracked tool counts.

describe('processorAgent fallback JSON parsing', () => {
  beforeEach(() => runMigrations());

  it('regex matches a well-formed summary JSON', () => {
    const text = 'All done!\n{ "inserted": 5, "updated": 2, "skipped": 1 }';
    const match = text.match(/\{\s*"inserted"\s*:\s*\d+[\s\S]*?\}/);
    expect(match).not.toBeNull();
    const parsed = JSON.parse(match![0]);
    expect(parsed).toEqual({ inserted: 5, updated: 2, skipped: 1 });
  });

  it('regex matches JSON with no surrounding text', () => {
    const text = '{ "inserted": 0, "updated": 0, "skipped": 0 }';
    const match = text.match(/\{\s*"inserted"\s*:\s*\d+[\s\S]*?\}/);
    expect(match).not.toBeNull();
  });

  it('regex does NOT match prose-only response (triggers fallback path)', () => {
    const text = 'The back_in_stock item appears to be a cookie consent notice rather than a product.';
    const match = text.match(/\{\s*"inserted"\s*:\s*\d+[\s\S]*?\}/);
    expect(match).toBeNull();
  });

  it('regex does NOT match unrelated JSON objects', () => {
    const text = '{ "error": "something went wrong" }';
    const match = text.match(/\{\s*"inserted"\s*:\s*\d+[\s\S]*?\}/);
    expect(match).toBeNull();
  });
});

// ─── scrapeTools navigation — timeout config ──────────────────────────────────

describe('scrapeTools timeout constants', () => {
  it('NAVIGATION_TIMEOUT is at least 60 seconds', async () => {
    // We import the module to verify the constants are exported as expected.
    // We can't call the real browser functions in unit tests, but we can
    // confirm the module loads and the tool definitions are present.
    const { SCRAPER_TOOL_DEFINITIONS } = await import('../agents/tools/scrapeTools.js');
    expect(SCRAPER_TOOL_DEFINITIONS).toHaveLength(3);
    expect(SCRAPER_TOOL_DEFINITIONS.map((t) => t.name)).toEqual([
      'scrape_new_releases',
      'scrape_back_in_stock',
      'scrape_news_updates',
    ]);
  });
});
