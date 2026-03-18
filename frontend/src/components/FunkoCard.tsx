import type { NewRelease, BackInStockItem } from '../types/funko';

type FunkoCardProps = {
  item: NewRelease | BackInStockItem;
  badge?: string;
  badgeColor?: 'orange' | 'red';
  variantBadge?: string;
  variantBadgeClass?: string;
};

function isNewRelease(item: NewRelease | BackInStockItem): item is NewRelease {
  return 'available_date' in item;
}

export default function FunkoCard({ item, badge, badgeColor = 'orange', variantBadge, variantBadgeClass }: FunkoCardProps) {
  const badgeClass =
    badgeColor === 'red'
      ? 'bg-funko-red text-white'
      : 'bg-funko-orange text-white';

  const subText = isNewRelease(item)
    ? item.available_date ?? null
    : (item as BackInStockItem).restocked_at
      ? `Restocked ${new Intl.DateTimeFormat('en-US', { dateStyle: 'short' }).format(new Date((item as BackInStockItem).restocked_at!))}`
      : null;

  return (
    <a
      href={item.product_url ?? '#'}
      target="_blank"
      rel="noopener noreferrer"
      className="group bg-funko-gray rounded-xl overflow-hidden flex flex-col hover:ring-2 hover:ring-funko-orange transition-all"
    >
      {/* Image */}
      <div className="relative bg-funko-darker aspect-square overflow-hidden">
        {item.image_url ? (
          <img
            src={item.image_url}
            alt={item.title}
            className="w-full h-full object-contain p-4 group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-600 text-5xl select-none">
            🎭
          </div>
        )}
        {badge && (
          <span className={`absolute top-2 left-2 text-xs font-bold px-2 py-1 rounded-full ${badgeClass}`}>
            {badge}
          </span>
        )}
        {variantBadge && (
          <span className={`absolute bottom-2 right-2 text-xs font-bold px-2 py-1 rounded-full uppercase tracking-wide ${variantBadgeClass}`}>
            {variantBadge}
          </span>
        )}
      </div>

      {/* Info */}
      <div className="p-3 flex flex-col gap-1 flex-1">
        {item.product_line && (
          <p className="text-funko-orange text-xs font-semibold uppercase tracking-wide truncate">
            {item.product_line}
          </p>
        )}
        <p className="text-funko-light text-sm font-medium leading-snug line-clamp-2">
          {item.title}
        </p>
        <div className="mt-auto pt-2 flex items-center justify-between">
          {item.price && (
            <span className="text-white font-bold text-sm">{item.price}</span>
          )}
          {subText && (
            <span className="text-gray-400 text-xs ml-auto">{subText}</span>
          )}
        </div>
      </div>
    </a>
  );
}
