import recipes from '@/devData/recipes.json';
import { serverGet } from '@/helpers/serverApi';
import { render, screen } from '@/test-utils';
import { Recipe } from '@/types/recipe';
import MyRecipes from './page';

jest.mock('@/helpers/serverApi', () => ({
  getSession: async () => ({ token: 'jwt-token', userId: 'me' }),
  serverGet: jest.fn(),
}));
jest.mock('next/navigation', () => ({
  redirect: jest.fn((url: string) => {
    throw new Error(`REDIRECT ${url}`);
  }),
  usePathname: () => '/my-recipes',
  useSearchParams: () => new URLSearchParams(),
}));
const get = serverGet as jest.Mock;

const [first, second] = recipes as Recipe[];

const searchResponse = (data: Recipe[], totalPages = 1) => ({
  status: 1,
  results: data.length,
  totalPages,
  currentPage: 1,
  data,
});

// The page is an async server component, so it's awaited before rendering what it returns
const renderPage = async (page?: string) =>
  render(await MyRecipes({ searchParams: Promise.resolve({ page }) }));

describe('My recipes page', () => {
  beforeEach(() => jest.clearAllMocks());

  it("lists the current user's recipes", async () => {
    get.mockResolvedValue(searchResponse([first, second]));
    await renderPage();

    expect(screen.getByText(first.title)).toBeVisible();
    expect(screen.getByText(second.title)).toBeVisible();
    expect(screen.getAllByRole('link', { name: 'View Recipe' })[0]).toHaveAttribute(
      'href',
      `/my-recipes/${first.id}`
    );
    expect(get).toHaveBeenCalledWith('/api/v1/recipes/search', {
      params: { authorId: 'me', page: 1 },
    });
  });

  it('requests the page from the URL and shows pagination', async () => {
    get.mockResolvedValue(searchResponse([second], 2));
    await renderPage('2');

    expect(get).toHaveBeenCalledWith('/api/v1/recipes/search', {
      params: { authorId: 'me', page: 2 },
    });
    expect(screen.getByRole('link', { name: '1' })).toHaveAttribute('href', '/my-recipes');
  });

  it('treats an invalid page as page 1', async () => {
    get.mockResolvedValue(searchResponse([first]));
    await renderPage('abc');

    expect(get).toHaveBeenCalledWith('/api/v1/recipes/search', {
      params: { authorId: 'me', page: 1 },
    });
  });

  it('says so when there are no recipes', async () => {
    get.mockResolvedValue(searchResponse([], 0));
    await renderPage();

    expect(screen.getByText(/You haven't created any recipes yet/)).toBeVisible();
  });

  it.each([
    ['with recipes', [first]],
    ['without recipes', []],
  ])('always offers a create recipe button (%s)', async (_, data) => {
    get.mockResolvedValue(searchResponse(data));
    await renderPage();

    expect(screen.getByRole('link', { name: 'Create recipe' })).toHaveAttribute(
      'href',
      '/my-recipes/new'
    );
  });

  it('goes to the last page when the requested one is past the end', async () => {
    get.mockResolvedValue(searchResponse([], 3));
    await expect(renderPage('9')).rejects.toThrow('REDIRECT /my-recipes?page=3');
  });
});
