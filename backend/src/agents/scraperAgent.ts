import Anthropic from '@anthropic-ai/sdk';
import type { Browser } from 'playwright';
import {
  SCRAPER_TOOL_DEFINITIONS,
  scrapeNewReleases,
  scrapeBackInStock,
  scrapeNewsUpdates,
} from './tools/scrapeTools.js';
import type { ScraperOutput } from '../types/funko.js';

const client = new Anthropic();

const SYSTEM_PROMPT = `You are a web scraping agent for Funko Pop! tracker application.
Your job is to gather information from funko.com by using the provided scraping tools.

You MUST call all three tools:
1. scrape_new_releases — to get new product releases
2. scrape_back_in_stock — to get restocked products
3. scrape_news_updates — to get news and announcements

After calling all three tools, respond with a JSON object in this exact format:
{
  "new_releases": [...scraped products...],
  "back_in_stock": [...restocked products...],
  "news_updates": [...news articles...],
  "scraped_at": "ISO timestamp"
}

Each product should have: title, price, image_url, product_url, product_line, available_date (for new releases) or restocked_at (for back in stock).
Each news item should have: headline, summary, article_url, published_at, category.

Use null for missing fields. Do not make up data — only return what the tools provide.`;

export async function runScraperAgent(browser: Browser): Promise<ScraperOutput> {
  console.log('[Agent1] Starting scraper agent...');

  const messages: Anthropic.MessageParam[] = [
    {
      role: 'user',
      content: 'Please scrape funko.com for new releases, back in stock items, and news updates. Call all three scraping tools and return the results as JSON.',
    },
  ];

  let loopCount = 0;
  const MAX_LOOPS = 10;

  while (loopCount < MAX_LOOPS) {
    loopCount++;
    console.log(`[Agent1] Loop ${loopCount}...`);

    const response = await client.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 8192,
      system: SYSTEM_PROMPT,
      tools: SCRAPER_TOOL_DEFINITIONS as Anthropic.Tool[],
      messages,
    });

    // Append assistant response
    messages.push({ role: 'assistant', content: response.content });

    if (response.stop_reason === 'end_turn') {
      // Extract JSON from final text response
      const textBlock = response.content.find((b) => b.type === 'text');
      if (!textBlock || textBlock.type !== 'text') {
        throw new Error('[Agent1] No text response in final turn');
      }

      const text = textBlock.text;
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('[Agent1] Could not find JSON in response: ' + text.substring(0, 200));
      }

      const output = JSON.parse(jsonMatch[0]) as ScraperOutput;
      if (!output.scraped_at) {
        output.scraped_at = new Date().toISOString();
      }

      console.log(
        `[Agent1] Done. New releases: ${output.new_releases?.length ?? 0}, ` +
        `Back in stock: ${output.back_in_stock?.length ?? 0}, ` +
        `News: ${output.news_updates?.length ?? 0}`
      );
      return output;
    }

    if (response.stop_reason !== 'tool_use') {
      throw new Error(`[Agent1] Unexpected stop_reason: ${response.stop_reason}`);
    }

    // Execute tool calls
    const toolResults: Anthropic.ToolResultBlockParam[] = [];

    for (const block of response.content) {
      if (block.type !== 'tool_use') continue;

      const input = block.input as Record<string, unknown>;
      let result: unknown;

      console.log(`[Agent1] Calling tool: ${block.name}`);

      try {
        switch (block.name) {
          case 'scrape_new_releases':
            result = await scrapeNewReleases(
              browser,
              (input.max_items as number) ?? 30,
              (input.page_url as string) ?? undefined
            );
            break;

          case 'scrape_back_in_stock':
            result = await scrapeBackInStock(
              browser,
              (input.max_items as number) ?? 30,
              (input.page_url as string) ?? undefined
            );
            break;

          case 'scrape_news_updates':
            result = await scrapeNewsUpdates(
              browser,
              (input.max_items as number) ?? 20,
              (input.page_url as string) ?? undefined
            );
            break;

          default:
            result = { error: `Unknown tool: ${block.name}` };
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`[Agent1] Tool error (${block.name}): ${msg}`);
        result = { error: msg, items: [] };
      }

      toolResults.push({
        type: 'tool_result',
        tool_use_id: block.id,
        content: JSON.stringify(result),
      });
    }

    messages.push({ role: 'user', content: toolResults });
  }

  throw new Error('[Agent1] Max loops exceeded');
}
