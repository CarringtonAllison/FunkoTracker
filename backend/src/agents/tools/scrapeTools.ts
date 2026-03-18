import type { Browser, Page } from 'playwright';
import type { ScrapedProduct, ScrapedNewsItem } from '../../types/funko.js';

// ─── Playwright helpers ───────────────────────────────────────────────────────

async function getPage(browser: Browser): Promise<Page> {
  const context = await browser.newContext({
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
      '(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    extraHTTPHeaders: {
      'Accept-Language': 'en-US,en;q=0.9',
    },
  });
  return context.newPage();
}

// ─── Tool: scrape_new_releases ────────────────────────────────────────────────

export async function scrapeNewReleases(
  browser: Browser,
  max_items = 30,
  page_url = 'https://www.funko.com/collections/new-releases'
): Promise<ScrapedProduct[]> {
  const page = await getPage(browser);
  const results: ScrapedProduct[] = [];

  try {
    await page.goto(page_url, { waitUntil: 'networkidle', timeout: 30000 });

    // Wait for product grid
    await page.waitForSelector(
      '.product-grid, .collection-grid, [data-product-id], .product-item, .grid__item, article',
      { timeout: 15000 }
    ).catch(() => null);

    // Small delay to allow JS rendering
    await page.waitForTimeout(2000);

    const products = await page.evaluate(() => {
      const items: Array<{
        title: string;
        price?: string;
        image_url?: string;
        product_url?: string;
        product_line?: string;
        available_date?: string;
      }> = [];

      // Try multiple common Shopify/ecommerce selectors
      const selectors = [
        '.product-item',
        '.grid__item',
        '[data-product-id]',
        'article.product',
        '.collection-product-card',
        '.product-card',
      ];

      let productEls: NodeListOf<Element> | null = null;
      for (const sel of selectors) {
        const found = document.querySelectorAll(sel);
        if (found.length > 0) {
          productEls = found;
          break;
        }
      }

      if (!productEls || productEls.length === 0) {
        // Fallback: grab all links with /products/ in href
        document.querySelectorAll('a[href*="/products/"]').forEach((el) => {
          const anchor = el as HTMLAnchorElement;
          const title = anchor.textContent?.trim() || anchor.getAttribute('aria-label') || '';
          if (title && !items.find((i) => i.title === title)) {
            items.push({
              title,
              product_url: anchor.href,
            });
          }
        });
        return items.slice(0, 30);
      }

      productEls.forEach((el) => {
        const titleEl =
          el.querySelector('.product-title, .card__heading, h2, h3, [class*="title"]') ??
          el.querySelector('a');
        const priceEl = el.querySelector('.price, .product-price, [class*="price"]');
        const imgEl = el.querySelector('img');
        const linkEl = el.querySelector('a[href*="/products/"]') ?? el.querySelector('a');

        const title = titleEl?.textContent?.trim() ?? '';
        if (!title) return;

        const price = priceEl?.textContent?.trim().replace(/\s+/g, ' ') ?? undefined;
        const image_url = imgEl?.getAttribute('src') ?? imgEl?.getAttribute('data-src') ?? undefined;
        const href = (linkEl as HTMLAnchorElement)?.href ?? undefined;
        const product_url =
          href && !href.startsWith('javascript') ? href : undefined;

        // Try to detect product line from breadcrumb or tag
        const tagEl = el.querySelector('.product-tag, .badge, [class*="collection"], [class*="vendor"]');
        const product_line = tagEl?.textContent?.trim() ?? undefined;

        items.push({ title, price, image_url, product_url, product_line });
      });

      return items.slice(0, 30);
    });

    results.push(...(products as ScrapedProduct[]));
  } finally {
    await page.close();
  }

  return results.slice(0, max_items);
}

// ─── Tool: scrape_back_in_stock ───────────────────────────────────────────────

export async function scrapeBackInStock(
  browser: Browser,
  max_items = 30,
  page_url = 'https://www.funko.com/collections/back-in-stock'
): Promise<ScrapedProduct[]> {
  const page = await getPage(browser);
  const results: ScrapedProduct[] = [];

  try {
    await page.goto(page_url, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForSelector('a[href*="/products/"]', { timeout: 15000 }).catch(() => null);
    await page.waitForTimeout(2000);

    const products = await page.evaluate(() => {
      const items: Array<{
        title: string;
        price?: string;
        image_url?: string;
        product_url?: string;
        product_line?: string;
      }> = [];

      const selectors = ['.product-item', '.grid__item', '[data-product-id]', 'article.product', '.product-card'];
      let productEls: NodeListOf<Element> | null = null;
      for (const sel of selectors) {
        const found = document.querySelectorAll(sel);
        if (found.length > 0) { productEls = found; break; }
      }

      if (!productEls || productEls.length === 0) {
        document.querySelectorAll('a[href*="/products/"]').forEach((el) => {
          const anchor = el as HTMLAnchorElement;
          const title = anchor.textContent?.trim() || anchor.getAttribute('aria-label') || '';
          if (title && !items.find((i) => i.title === title)) {
            items.push({ title, product_url: anchor.href });
          }
        });
        return items.slice(0, 30);
      }

      productEls.forEach((el) => {
        const titleEl = el.querySelector('.product-title, .card__heading, h2, h3, [class*="title"]') ?? el.querySelector('a');
        const priceEl = el.querySelector('.price, .product-price, [class*="price"]');
        const imgEl = el.querySelector('img');
        const linkEl = el.querySelector('a[href*="/products/"]') ?? el.querySelector('a');

        const title = titleEl?.textContent?.trim() ?? '';
        if (!title) return;

        const price = priceEl?.textContent?.trim().replace(/\s+/g, ' ') ?? undefined;
        const image_url = imgEl?.getAttribute('src') ?? imgEl?.getAttribute('data-src') ?? undefined;
        const href = (linkEl as HTMLAnchorElement)?.href ?? undefined;
        const product_url = href && !href.startsWith('javascript') ? href : undefined;
        const tagEl = el.querySelector('.product-tag, .badge, [class*="vendor"]');
        const product_line = tagEl?.textContent?.trim() ?? undefined;

        items.push({ title, price, image_url, product_url, product_line });
      });

      return items.slice(0, 30);
    });

    results.push(...(products as ScrapedProduct[]));
  } finally {
    await page.close();
  }

  return results.slice(0, max_items);
}

// ─── Tool: scrape_news_updates ────────────────────────────────────────────────

export async function scrapeNewsUpdates(
  browser: Browser,
  max_items = 20,
  page_url = 'https://www.funko.com/blogs/news'
): Promise<ScrapedNewsItem[]> {
  const page = await getPage(browser);
  const results: ScrapedNewsItem[] = [];

  try {
    await page.goto(page_url, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForSelector('article, .blog-post, .article, [class*="blog"]', { timeout: 15000 }).catch(() => null);
    await page.waitForTimeout(2000);

    const articles = await page.evaluate(() => {
      const items: Array<{
        headline: string;
        summary?: string;
        article_url?: string;
        published_at?: string;
        category?: string;
      }> = [];

      // Try blog post selectors
      const selectors = ['article', '.blog-post', '.article-card', '.blog__article', '[class*="article"]'];
      let articleEls: NodeListOf<Element> | null = null;
      for (const sel of selectors) {
        const found = document.querySelectorAll(sel);
        if (found.length > 0) { articleEls = found; break; }
      }

      if (!articleEls || articleEls.length === 0) {
        // Fallback: grab all blog links
        document.querySelectorAll('a[href*="/blogs/"]').forEach((el) => {
          const anchor = el as HTMLAnchorElement;
          const title = anchor.textContent?.trim() || anchor.getAttribute('aria-label') || '';
          if (title && title.length > 10 && !items.find((i) => i.headline === title)) {
            items.push({ headline: title, article_url: anchor.href });
          }
        });
        return items.slice(0, 20);
      }

      articleEls.forEach((el) => {
        const headlineEl = el.querySelector('h1, h2, h3, .article-title, [class*="title"]');
        const summaryEl = el.querySelector('p, .article-excerpt, [class*="excerpt"], [class*="summary"]');
        const linkEl = el.querySelector('a[href*="/blogs/"]') ?? el.querySelector('a');
        const dateEl = el.querySelector('time, .date, [class*="date"]');
        const catEl = el.querySelector('.tag, .category, [class*="tag"]');

        const headline = headlineEl?.textContent?.trim() ?? '';
        if (!headline || headline.length < 3) return;

        const summary = summaryEl?.textContent?.trim().substring(0, 300) ?? undefined;
        const href = (linkEl as HTMLAnchorElement)?.href ?? undefined;
        const article_url = href && !href.startsWith('javascript') ? href : undefined;
        const published_at = (dateEl as HTMLTimeElement)?.dateTime ?? dateEl?.textContent?.trim() ?? undefined;
        const category = catEl?.textContent?.trim() ?? undefined;

        items.push({ headline, summary, article_url, published_at, category });
      });

      return items.slice(0, 20);
    });

    results.push(...(articles as ScrapedNewsItem[]));
  } finally {
    await page.close();
  }

  return results.slice(0, max_items);
}

// ─── Tool definitions for Claude ─────────────────────────────────────────────

export const SCRAPER_TOOL_DEFINITIONS = [
  {
    name: 'scrape_new_releases',
    description:
      'Navigate to funko.com new releases page and extract all product listings. ' +
      'Returns structured product data including titles, prices, images, and URLs.',
    input_schema: {
      type: 'object' as const,
      properties: {
        max_items: { type: 'number', description: 'Maximum items to return (default 30)' },
        page_url: {
          type: 'string',
          description: 'URL to scrape (default: https://www.funko.com/collections/new-releases)',
        },
      },
      required: [],
    },
  },
  {
    name: 'scrape_back_in_stock',
    description:
      'Navigate to funko.com back in stock section and extract all restocked product listings.',
    input_schema: {
      type: 'object' as const,
      properties: {
        max_items: { type: 'number', description: 'Maximum items to return (default 30)' },
        page_url: {
          type: 'string',
          description: 'URL to scrape (default: https://www.funko.com/collections/back-in-stock)',
        },
      },
      required: [],
    },
  },
  {
    name: 'scrape_news_updates',
    description:
      'Navigate to funko.com news/blog section and extract recent articles, ' +
      'announcements, and convention updates.',
    input_schema: {
      type: 'object' as const,
      properties: {
        max_items: { type: 'number', description: 'Maximum items to return (default 20)' },
        page_url: {
          type: 'string',
          description: 'URL to scrape (default: https://www.funko.com/blogs/news)',
        },
      },
      required: [],
    },
  },
] as const;
