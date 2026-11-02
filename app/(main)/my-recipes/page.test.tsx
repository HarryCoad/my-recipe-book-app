import recipes from '@/devData/recipes.json';
import { serverGet } from '@/helpers/serverApi';
import { render, screen, userEvent, within } from '@/test-utils';
import { RecipeSearchResult } from '@/types/recipe';
import MyRecipes from './page';

jest.mock('@/helpers/serverApi', () => ({
  getSession: async () => ({ token: 'jwt-token', userId: 'me' }),
  serverGet: jest.fn(),
}));
const replace = jest.fn();
jest.mock('next/navigation', () => ({
  redirect: jest.fn((url: string) => {
    throw new Error(`REDIRECT ${url}`);
  }),
  usePathname: () => '/my-recipes',
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ replace, refresh: jest.fn() }),
}));
const get = serverGet as jest.Mock;

// Search results, which also say how many suggestions are waiting. One the user created and one
// they saved
const [first, second] = (recipes as Omit<RecipeSearchResult, 'pendingSuggestions'>[]).map(
  (recipe) => ({ ...recipe, pendingSuggestions: 0 })
);
const mine: RecipeSearchResult = { ...first, authorId: 'me', title: 'My soup' };
const saved: RecipeSearchResult = {
  ...second,
  authorId: 'someone',
  authorName: 'alice',
  title: 'Their pie',
  bSaved: true,
};

const searchResponse = (data: RecipeSearchResult[], totalPages = 1) => ({
  status: 1,
  results: data.length,
  totalPages,
  currentPage: 1,
  data,
});

// The page is an async server component, so it's awaited before rendering what it returns
const renderPage = async (query: { page?: string; mine?: string } = {}) =>
  render(await MyRecipes({ searchParams: Promise.resolve(query) }));

const card = (title: string) => screen.getByText(title).closest('article') as HTMLElement;

describe('My recipes page', () => {
  beforeEach(() => jest.clearAllMocks());

  it('shows every recipe the user saved, which includes the ones they created', async () => {
    get.mockResolvedValue(searchResponse([mine, saved]));
    await renderPage();

    expect(get).toHaveBeenCalledWith('/api/v1/recipes/search', {
      params: { bOnlySaved: true, page: 1 },
    });
    expect(within(card('My soup')).getByText('Your recipe')).toBeVisible();
    expect(within(card('My soup')).queryByRole('button', { name: /save recipe/i })).toBeNull();
    // Saved recipes can be unsaved from here
    expect(within(card('Their pie')).getByRole('button', { name: 'Unsave recipe' })).toBeVisible();
    expect(within(card('Their pie')).getByRole('link', { name: 'Their pie' })).toHaveAttribute(
      'href',
      `/recipes/${saved.id}`
    );
    expect(screen.getByRole('switch', { name: 'Only recipes I created' })).not.toBeChecked();
  });

  it('shows only the recipes the user created with ?mine=true', async () => {
    get.mockResolvedValue(searchResponse([mine]));
    await renderPage({ mine: 'true' });

    expect(get).toHaveBeenCalledWith('/api/v1/recipes/search', {
      params: { authorId: 'me', page: 1 },
    });
    expect(screen.getByRole('switch', { name: 'Only recipes I created' })).toBeChecked();
    // Kept, so the cards look the same whether the switch is on or off
    expect(within(card('My soup')).getByText('Your recipe')).toBeVisible();
  });

  it.each([
    [false, '/my-recipes?mine=true'],
    [true, '/my-recipes'],
  ])('the switch (on: %s) changes the list, starting from page 1', async (on, url) => {
    get.mockResolvedValue(searchResponse([mine]));
    await renderPage({ mine: on ? 'true' : undefined, page: '2' });

    await userEvent.click(screen.getByRole('switch', { name: 'Only recipes I created' }));
    expect(replace).toHaveBeenCalledWith(url, { scroll: false });
  });

  it('flags recipes with suggestions waiting for review', async () => {
    get.mockResolvedValue(
      searchResponse([
        { ...mine, pendingSuggestions: 2 },
        { ...saved, pendingSuggestions: 0 },
      ])
    );
    await renderPage();

    expect(screen.getByRole('link', { name: '2 suggestions waiting for review' })).toHaveAttribute(
      'href',
      `/recipes/${mine.id}/suggestions`
    );
    expect(screen.getAllByRole('link', { name: /waiting for review/ })).toHaveLength(1);
  });

  it('requests the page from the URL and shows pagination', async () => {
    get.mockResolvedValue(searchResponse([saved], 2));
    await renderPage({ page: '2' });

    expect(get).toHaveBeenCalledWith('/api/v1/recipes/search', {
      params: { bOnlySaved: true, page: 2 },
    });
    expect(screen.getByRole('link', { name: '1' })).toHaveAttribute('href', '/my-recipes');
  });

  it('treats an invalid page as page 1', async () => {
    get.mockResolvedValue(searchResponse([mine]));
    await renderPage({ page: 'abc' });

    expect(get).toHaveBeenCalledWith('/api/v1/recipes/search', {
      params: { bOnlySaved: true, page: 1 },
    });
  });

  it.each([
    [{}, /Your recipe book is empty/],
    [{ mine: 'true' }, /You haven't created any recipes yet/],
  ])('says so when there are no recipes (%o)', async (query, message) => {
    get.mockResolvedValue(searchResponse([], 0));
    await renderPage(query);

    expect(screen.getByText(message)).toBeVisible();
  });

  it('offers importing a recipe from a website or a photo', async () => {
    get.mockResolvedValue(searchResponse([mine]));
    await renderPage();

    await userEvent.click(screen.getByRole('button', { name: 'Import' }));

    expect(await screen.findByRole('menuitem', { name: 'From a website' })).toHaveAttribute(
      'href',
      '/my-recipes/new?import=url'
    );
    expect(screen.getByRole('menuitem', { name: 'From photos' })).toHaveAttribute(
      'href',
      '/my-recipes/new?import=image'
    );
    expect(screen.getByRole('menuitem', { name: 'Lots at once' })).toHaveAttribute(
      'href',
      '/my-recipes/import'
    );
  });

  it.each([
    ['with recipes', [mine]],
    ['without recipes', []],
  ])('always offers a create recipe button (%s)', async (_, data) => {
    get.mockResolvedValue(searchResponse(data));
    await renderPage();

    expect(screen.getByRole('link', { name: 'Create recipe' })).toHaveAttribute(
      'href',
      '/my-recipes/new'
    );
  });

  it.each([
    [{ page: '9' }, 'REDIRECT /my-recipes?page=3'],
    [{ page: '9', mine: 'true' }, 'REDIRECT /my-recipes?mine=true&page=3'],
  ])('goes to the last page when the requested one is past the end (%o)', async (query, to) => {
    get.mockResolvedValue(searchResponse([], 3));
    await expect(renderPage(query)).rejects.toThrow(to);
  });
});
