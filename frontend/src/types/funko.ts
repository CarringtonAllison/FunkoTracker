export interface FunkoItem {
  id: number;
  external_id: string;
  title: string;
  product_line: string | null;
  price: string | null;
  image_url: string | null;
  product_url: string | null;
  first_seen_at: string;
  updated_at: string;
}

export interface NewRelease extends FunkoItem {
  available_date: string | null;
}

export interface BackInStockItem extends FunkoItem {
  restocked_at: string | null;
}

export interface NewsItem {
  id: number;
  external_id: string;
  headline: string;
  summary: string | null;
  article_url: string | null;
  published_at: string | null;
  category: string | null;
  first_seen_at: string;
  updated_at: string;
}

export interface ApiDataResponse {
  new_releases: NewRelease[];
  back_in_stock: BackInStockItem[];
  news_updates: NewsItem[];
  last_fetched_at: string | null;
}

export interface RefreshResponse {
  status: 'success' | 'error';
  ran_at: string;
  new_items_count: number;
  updated_items_count: number;
  error_msg?: string;
}
