export interface RecentSearch {
  id: string;
  query?: string;
  district?: string;
  propertyType?: string;
  maxRent?: string;
  label: string;
  timestamp: number;
}

const STORAGE_KEY = 'rental_scout_recent_searches';
const MAX_SEARCHES = 5;

export function getRecentSearches(): RecentSearch[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.slice(0, MAX_SEARCHES);
    }
    return [];
  } catch {
    return [];
  }
}

export function formatSearchLabel(search: {
  query?: string;
  district?: string;
  propertyType?: string;
  maxRent?: string;
}): string {
  const parts: string[] = [];

  if (search.query?.trim()) {
    parts.push(`"${search.query.trim()}"`);
  } else if (search.district && search.district !== 'ALL') {
    parts.push(search.district);
  } else {
    parts.push('All Uganda');
  }

  if (search.propertyType && search.propertyType !== 'ALL') {
    parts.push(
      search.propertyType
        .replace(/_/g, ' ')
        .toLowerCase()
        .replace(/\b\w/g, c => c.toUpperCase())
    );
  }

  if (search.maxRent) {
    const num = Number(search.maxRent);
    if (!isNaN(num)) {
      parts.push(`≤ ${num >= 1000000 ? `${(num / 1000000).toFixed(1)}M` : `${num / 1000}k`} UGX`);
    }
  }

  return parts.join(' · ');
}

export function saveRecentSearch(search: {
  query?: string;
  district?: string;
  propertyType?: string;
  maxRent?: string;
}): RecentSearch[] {
  try {
    // Avoid saving completely empty default searches
    const isDefault =
      (!search.query || !search.query.trim()) &&
      (!search.district || search.district === 'ALL') &&
      (!search.propertyType || search.propertyType === 'ALL') &&
      !search.maxRent;

    if (isDefault) {
      return getRecentSearches();
    }

    const current = getRecentSearches();
    const label = formatSearchLabel(search);

    // Deduplicate by identical label
    const filtered = current.filter(item => item.label.toLowerCase() !== label.toLowerCase());

    const newItem: RecentSearch = {
      id: `rs_${Date.now()}`,
      query: search.query?.trim() || undefined,
      district: search.district && search.district !== 'ALL' ? search.district : undefined,
      propertyType: search.propertyType && search.propertyType !== 'ALL' ? search.propertyType : undefined,
      maxRent: search.maxRent || undefined,
      label,
      timestamp: Date.now(),
    };

    const updated = [newItem, ...filtered].slice(0, MAX_SEARCHES);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch {
    return [];
  }
}

export function removeRecentSearch(id: string): RecentSearch[] {
  try {
    const current = getRecentSearches();
    const updated = current.filter(item => item.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch {
    return [];
  }
}

export function clearRecentSearches(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
