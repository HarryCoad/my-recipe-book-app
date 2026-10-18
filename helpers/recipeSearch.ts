import { normaliseTags } from '@/helpers/tags';
import { RECIPE_CATEGORIES, RecipeCategory } from '@/types/recipe';

// The recipe search, kept in the page's URL so Back returns to the same results and searches can
// be shared. The URL uses the API's own query param names (see GET /recipes/search in the API
// docs), so the same params are sent on to the API.

export const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest' },
  { value: 'oldest', label: 'Oldest' },
  { value: 'title', label: 'Title A–Z' },
  { value: 'popular', label: 'Most saved' },
] as const;
export type RecipeSort = (typeof SORT_OPTIONS)[number]['value'];
const DEFAULT_SORT: RecipeSort = 'newest';

// Slider ranges. The top of each means "or more", so it isn't sent as a maximum
export const TIME_RANGE = { min: 0, max: 240, step: 5 };
export const SERVES_RANGE = { min: 1, max: 12, step: 1 };

export type RecipeSearch = {
  search: string;
  category: RecipeCategory | null;
  // The recipe must have all of them
  tags: string[];
  // Total time (prep + cook) in minutes, inclusive. Undefined means no limit
  minTime?: number;
  maxTime?: number;
  minServes?: number;
  maxServes?: number;
  // Leaves out recipes the user saved, which includes their own
  hideSaved: boolean;
  sort: RecipeSort;
  page: number;
};

export const emptySearch: RecipeSearch = {
  search: '',
  category: null,
  tags: [],
  hideSaved: false,
  sort: DEFAULT_SORT,
  page: 1,
};

// Next passes a page its query as an object, and client components get URLSearchParams
type QueryInput = URLSearchParams | Record<string, string | string[] | undefined>;

const reader = (query: QueryInput) => (key: string) => {
  const value = query instanceof URLSearchParams ? query.get(key) : query[key];
  return (Array.isArray(value) ? value[0] : value)?.trim() || undefined;
};

// A whole number strictly inside the range. Values at or past either end mean no limit
const limit = (value: string | undefined, { min, max }: { min: number; max: number }) => {
  const number = Number(value);
  return Number.isInteger(number) && number > min && number < max ? number : undefined;
};

// Anything malformed in the URL is ignored rather than sent to the API
export const parseRecipeSearch = (query: QueryInput): RecipeSearch => {
  const get = reader(query);
  const category = get('category');
  const sort = get('sort');
  const page = Number(get('page'));
  return {
    search: get('search') ?? '',
    category: RECIPE_CATEGORIES.find((option) => option === category) ?? null,
    tags: normaliseTags((get('tags') ?? '').split(',')),
    minTime: limit(get('minTime'), TIME_RANGE),
    maxTime: limit(get('maxTime'), TIME_RANGE),
    minServes: limit(get('minServes'), SERVES_RANGE),
    maxServes: limit(get('maxServes'), SERVES_RANGE),
    hideSaved: get('bHideSaved') === 'true',
    sort: SORT_OPTIONS.find((option) => option.value === sort)?.value ?? DEFAULT_SORT,
    page: Number.isInteger(page) && page > 1 ? page : 1,
  };
};

// The query for the page URL and the API. Defaults are left out to keep URLs short
export const toSearchParams = (search: RecipeSearch) => {
  const entries: [string, string | number | undefined][] = [
    ['search', search.search.trim() || undefined],
    ['category', search.category ?? undefined],
    ['tags', search.tags.length ? search.tags.join(',') : undefined],
    ['minTime', search.minTime],
    ['maxTime', search.maxTime],
    ['minServes', search.minServes],
    ['maxServes', search.maxServes],
    ['bHideSaved', search.hideSaved ? 'true' : undefined],
    ['sort', search.sort === DEFAULT_SORT ? undefined : search.sort],
    ['page', search.page > 1 ? search.page : undefined],
  ];
  const params = new URLSearchParams();
  entries.forEach(([key, value]) => value !== undefined && params.set(key, String(value)));
  return params;
};

// How many filters (not the text search or sort) are narrowing the results
export const countFilters = (search: RecipeSearch) =>
  [
    search.category,
    search.tags.length > 0,
    search.minTime !== undefined || search.maxTime !== undefined,
    search.minServes !== undefined || search.maxServes !== undefined,
    search.hideSaved,
  ].filter(Boolean).length;
