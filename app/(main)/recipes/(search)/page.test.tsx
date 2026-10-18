import recipes from '@/devData/recipes.json';
import { serverGet } from '@/helpers/serverApi';
import { render, screen, within } from '@/test-utils';
import { Recipe, RecipeSearchResult } from '@/types/recipe';
import RecipeSearchPage from './page';

jest.mock('@/helpers/serverApi', () => ({
  getSession: async () => ({ token: 'jwt-token', userId: 'me' }),
  serverGet: jest.fn(),
}));
jest.mock('next/navigation', () => ({
  redirect: jest.fn((url: string) => {
    throw new Error(`REDIRECT ${url}`);
  }),
  usePathname: () => '/recipes',
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ refresh: jest.fn(), replace: jest.fn() }),
}));
const get = serverGet as jest.Mock;

const [first, second] = recipes as Recipe[];
const mine: RecipeSearchResult = {
  ...first,
  id: 'mine',
  title: 'My soup',
  authorId: 'me',
  pendingSuggestions: 0,
};
const theirs: RecipeSearchResult = {
  ...second,
  id: 'theirs',
  title: 'Their pie',
  authorId: 'someone',
  pendingSuggestions: 0,
};

const respond = (data: RecipeSearchResult[], totalPages = 1) =>
  get.mockResolvedValue({ status: 1, results: data.length, totalPages, currentPage: 1, data });

// An async server component, so it's awaited before rendering what it returns
const renderPage = async (query: Record<string, string> = {}) =>
  render(await RecipeSearchPage({ searchParams: Promise.resolve(query) }));

const card = (title: string) => screen.getByText(title).closest('article') as HTMLElement;

describe('Recipe search results', () => {
  beforeEach(() => jest.clearAllMocks());

  it('asks the API for the newest recipes by default', async () => {
    respond([theirs]);
    await renderPage();

    const [, { params }] = get.mock.calls[0];
    expect(get.mock.calls[0][0]).toBe('/api/v1/recipes/search');
    expect(params.toString()).toBe('');
  });

  it('passes the search from the URL to the API', async () => {
    respond([theirs]);
    await renderPage({
      search: 'pie',
      tags: 'quick',
      maxTime: '60',
      bHideSaved: 'true',
      page: '2',
    });

    const [, { params }] = get.mock.calls[0];
    expect(params.toString()).toBe('search=pie&tags=quick&maxTime=60&bHideSaved=true&page=2');
  });

  it("marks the user's own recipes, and offers to save everyone else's", async () => {
    respond([mine, theirs]);
    await renderPage();

    expect(within(card('My soup')).getByText('Your recipe')).toBeVisible();
    expect(within(card('My soup')).queryByRole('button', { name: /save recipe/i })).toBeNull();

    expect(within(card('Their pie')).queryByText('Your recipe')).toBeNull();
    expect(within(card('Their pie')).getByRole('button', { name: /save recipe/i })).toBeVisible();
    expect(within(card('Their pie')).getByRole('link', { name: 'View Recipe' })).toHaveAttribute(
      'href',
      '/recipes/theirs'
    );
  });

  it('shows older recipes that have no description', async () => {
    respond([{ ...theirs, description: null }]);
    await renderPage();
    expect(screen.getByText('Their pie')).toBeVisible();
  });

  it('suggests loosening the search when nothing matches', async () => {
    respond([]);
    await renderPage({ category: 'Dessert' });
    expect(screen.getByText(/No recipes match your search/)).toBeVisible();
  });

  it('goes to the last page when the page asked for is past the end', async () => {
    respond([], 2);
    await expect(renderPage({ search: 'pie', page: '5' })).rejects.toThrow(
      'REDIRECT /recipes?search=pie&page=2'
    );
  });
});
