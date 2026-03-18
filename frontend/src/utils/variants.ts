import type { NewRelease, BackInStockItem } from '../types/funko';

type FunkoItem = NewRelease | BackInStockItem;

// Known variant keywords and their display colors
const VARIANT_COLORS: Record<string, string> = {
  diamond:    'bg-cyan-500 text-white',
  chase:      'bg-yellow-400 text-black',
  exclusive:  'bg-purple-500 text-white',
  glow:       'bg-green-400 text-black',
  metallic:   'bg-gray-300 text-black',
  flocked:    'bg-pink-400 text-white',
  blacklight: 'bg-violet-600 text-white',
  gitd:       'bg-green-400 text-black',   // glow in the dark
  gold:       'bg-yellow-500 text-black',
  chrome:     'bg-slate-300 text-black',
  holographic:'bg-blue-400 text-white',
};

export interface VariantInfo {
  baseTitle: string;
  variantLabel: string | null;
  variantClass: string;
}

/** Extracts the variant label from a title's trailing parenthetical, e.g. "(Diamond)" */
export function parseVariant(title: string): { baseTitle: string; variantLabel: string | null } {
  const match = title.match(/^(.*?)\s*\(([^)]+)\)\s*$/);
  if (!match) return { baseTitle: title, variantLabel: null };
  return { baseTitle: match[1].trim(), variantLabel: match[2].trim() };
}

function variantColorClass(label: string): string {
  const key = label.toLowerCase().replace(/\s+/g, '');
  for (const [keyword, cls] of Object.entries(VARIANT_COLORS)) {
    if (key.includes(keyword)) return cls;
  }
  return 'bg-funko-orange text-white'; // default
}

/**
 * Returns a map of external_id → VariantInfo.
 * Items that share a base title with at least one other item get a variantLabel.
 * Items that are unique keep variantLabel: null.
 */
export function buildVariantMap(items: FunkoItem[]): Map<string, VariantInfo> {
  // Group by base title
  const groups = new Map<string, FunkoItem[]>();
  for (const item of items) {
    const { baseTitle } = parseVariant(item.title);
    const key = baseTitle.toLowerCase();
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(item);
  }

  const result = new Map<string, VariantInfo>();
  for (const item of items) {
    const { baseTitle, variantLabel } = parseVariant(item.title);
    const groupKey = baseTitle.toLowerCase();
    const group = groups.get(groupKey)!;
    // Only show variant badge if there are multiple items sharing this base title
    const effectiveLabel = group.length > 1 ? variantLabel : null;
    result.set(item.external_id, {
      baseTitle,
      variantLabel: effectiveLabel,
      variantClass: effectiveLabel ? variantColorClass(effectiveLabel) : '',
    });
  }

  return result;
}
