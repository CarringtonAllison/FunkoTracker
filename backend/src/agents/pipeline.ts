import { chromium } from 'playwright';
import { runScraperAgent } from './scraperAgent.js';
import { runProcessorAgent, type ProcessorSummary } from './processorAgent.js';
import { logFetchRun } from '../db/queries.js';

export interface PipelineResult {
  status: 'success' | 'error';
  ran_at: string;
  new_items_count: number;
  updated_items_count: number;
  error_msg?: string;
}

export async function runPipeline(): Promise<PipelineResult> {
  const ran_at = new Date().toISOString();
  console.log(`[Pipeline] Starting at ${ran_at}`);

  const browser = await chromium.launch({ headless: true });

  try {
    // Agent 1 — scrape funko.com
    const scraperOutput = await runScraperAgent(browser);

    const totalScraped =
      scraperOutput.new_releases.length +
      scraperOutput.back_in_stock.length +
      scraperOutput.news_updates.length;

    if (totalScraped === 0) {
      console.warn('[Pipeline] Scraper returned 0 items — skipping Agent 2 and logging as success with 0 counts.');
      logFetchRun('success');
      return { status: 'success', ran_at, new_items_count: 0, updated_items_count: 0 };
    }

    // Agent 2 — deduplicate and persist to SQLite
    const summary: ProcessorSummary = await runProcessorAgent(scraperOutput);

    console.log(`[Pipeline] Complete. Inserted: ${summary.inserted}, Updated: ${summary.updated}, Skipped: ${summary.skipped}`);

    return {
      status: 'success',
      ran_at,
      new_items_count: summary.inserted,
      updated_items_count: summary.updated,
    };
  } catch (err) {
    const error_msg = err instanceof Error ? err.message : String(err);
    console.error(`[Pipeline] Error: ${error_msg}`);
    logFetchRun('error', error_msg);

    return {
      status: 'error',
      ran_at,
      new_items_count: 0,
      updated_items_count: 0,
      error_msg,
    };
  } finally {
    await browser.close();
    console.log('[Pipeline] Browser closed.');
  }
}
