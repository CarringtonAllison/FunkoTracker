import type { NewsItem } from '../types/funko';

export default function NewsCard({ item }: { item: NewsItem }) {
  const formattedDate = item.published_at
    ? new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }).format(new Date(item.published_at))
    : null;

  return (
    <a
      href={item.article_url ?? '#'}
      target="_blank"
      rel="noopener noreferrer"
      className="group bg-funko-gray rounded-xl p-4 flex flex-col gap-2 hover:ring-2 hover:ring-funko-orange transition-all"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-1 flex-1 min-w-0">
          {item.category && (
            <span className="text-funko-orange text-xs font-semibold uppercase tracking-wide">
              {item.category}
            </span>
          )}
          <h3 className="text-funko-light font-semibold text-sm leading-snug group-hover:text-funko-orange transition-colors line-clamp-2">
            {item.headline}
          </h3>
        </div>
        {formattedDate && (
          <span className="text-gray-500 text-xs whitespace-nowrap shrink-0 mt-0.5">
            {formattedDate}
          </span>
        )}
      </div>

      {item.summary && (
        <p className="text-gray-400 text-xs leading-relaxed line-clamp-3">{item.summary}</p>
      )}

      <span className="text-funko-orange text-xs font-medium mt-auto group-hover:underline">
        Read more →
      </span>
    </a>
  );
}
