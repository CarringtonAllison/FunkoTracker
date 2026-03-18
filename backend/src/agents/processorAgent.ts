import Anthropic from '@anthropic-ai/sdk';
import {
  PROCESSOR_TOOL_DEFINITIONS,
  upsertNewRelease,
  upsertBackInStock,
  upsertNewsItem,
  type UpsertResult,
} from './tools/processorTools.js';
import { logFetchRun } from '../db/queries.js';
import type { ScraperOutput, ScrapedProduct, ScrapedNewsItem } from '../types/funko.js';

const client = new Anthropic();

export interface ProcessorSummary {
  inserted: number;
  updated: number;
  skipped: number;
}

const SYSTEM_PROMPT = `You are a database processor agent for the Funko Pop Tracker application.
You receive scraped Funko data and your job is to persist it cleanly into the database.

You will be given a JSON payload containing:
- new_releases: array of new Funko products
- back_in_stock: array of restocked products
- news_updates: array of news/announcement items

For EACH item in each array, call the appropriate tool:
- upsert_new_release — for each item in new_releases
- upsert_back_in_stock — for each item in back_in_stock
- upsert_news_item — for each item in news_updates

Rules:
1. Call the tools for EVERY item — do not skip any.
2. Do not batch items. Call the tool once per item.
3. After processing all items, respond with a JSON summary:
   { "inserted": <count>, "updated": <count>, "skipped": <count> }

Only include data that was actually in the payload. Do not invent or modify data.`;

export async function runProcessorAgent(scraperOutput: ScraperOutput): Promise<ProcessorSummary> {
  console.log('[Agent2] Starting processor agent...');
  console.log(
    `[Agent2] Input — New releases: ${scraperOutput.new_releases.length}, ` +
    `Back in stock: ${scraperOutput.back_in_stock.length}, ` +
    `News: ${scraperOutput.news_updates.length}`
  );

  const messages: Anthropic.MessageParam[] = [
    {
      role: 'user',
      content: `Please process and save the following scraped Funko data to the database:\n\n${JSON.stringify(scraperOutput, null, 2)}`,
    },
  ];

  let loopCount = 0;
  const MAX_LOOPS = 20;

  while (loopCount < MAX_LOOPS) {
    loopCount++;
    console.log(`[Agent2] Loop ${loopCount}...`);

    const response = await client.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 8192,
      system: SYSTEM_PROMPT,
      tools: PROCESSOR_TOOL_DEFINITIONS as Anthropic.Tool[],
      messages,
    });

    messages.push({ role: 'assistant', content: response.content });

    if (response.stop_reason === 'end_turn') {
      const textBlock = response.content.find((b) => b.type === 'text');
      if (!textBlock || textBlock.type !== 'text') {
        throw new Error('[Agent2] No text response in final turn');
      }

      const text = textBlock.text;
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('[Agent2] Could not find summary JSON in response: ' + text.substring(0, 200));
      }

      const summary = JSON.parse(jsonMatch[0]) as ProcessorSummary;
      console.log(`[Agent2] Done. Inserted: ${summary.inserted}, Updated: ${summary.updated}, Skipped: ${summary.skipped}`);

      logFetchRun('success');
      return summary;
    }

    if (response.stop_reason !== 'tool_use') {
      throw new Error(`[Agent2] Unexpected stop_reason: ${response.stop_reason}`);
    }

    // Execute tool calls
    const toolResults: Anthropic.ToolResultBlockParam[] = [];

    for (const block of response.content) {
      if (block.type !== 'tool_use') continue;

      const input = block.input as Record<string, unknown>;
      let result: UpsertResult;

      console.log(`[Agent2] Calling tool: ${block.name} — "${input.title ?? input.headline}"`);

      try {
        switch (block.name) {
          case 'upsert_new_release':
            result = upsertNewRelease(input as unknown as ScrapedProduct);
            break;

          case 'upsert_back_in_stock':
            result = upsertBackInStock(input as unknown as ScrapedProduct);
            break;

          case 'upsert_news_item':
            result = upsertNewsItem(input as unknown as ScrapedNewsItem);
            break;

          default:
            throw new Error(`Unknown tool: ${block.name}`);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`[Agent2] Tool error (${block.name}): ${msg}`);
        result = { action: 'skipped', external_id: '', title: String(input.title ?? input.headline ?? '') };
      }

      toolResults.push({
        type: 'tool_result',
        tool_use_id: block.id,
        content: JSON.stringify(result),
      });
    }

    messages.push({ role: 'user', content: toolResults });
  }

  logFetchRun('error', 'Max loops exceeded');
  throw new Error('[Agent2] Max loops exceeded');
}
