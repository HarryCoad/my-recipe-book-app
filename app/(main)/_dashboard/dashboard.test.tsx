import { AxiosError, AxiosHeaders, AxiosResponse } from 'axios';
import recipes from '@/devData/recipes.json';
import { serverGet } from '@/helpers/serverApi';
import { render, screen, within } from '@/test-utils';
import { MySuggestion, RecipeSearchResult } from '@/types/recipe';
import { AtAGlance } from './AtAGlance';
import { Greeting } from './Greeting';
import { RecipeShelf } from './RecipeShelf';

jest.mock('@/helpers/serverApi', () => ({
  getSession: async () => ({ token: 'jwt-token', userId: 'me' }),
  serverGet: jest.fn(),
}));
jest.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: jest.fn(), replace: jest.fn() }),
}));
const get = serverGet as jest.Mock;

const [first, second] = (recipes as Omit<RecipeSearchResult, 'pendingSuggestions'>[]).map(
  (recipe) => ({ ...recipe, pendingSuggestions: 0 })
);

const apiError = () =>
  new AxiosError('Request failed', 'ERR_BAD_RESPONSE', undefined, undefined, {
    status: 500,
    data: { status: 0, message: 'Something broke' },
    statusText: '',
    headers: {},
    config: { headers: new AxiosHeaders() },
  } as AxiosResponse);

const search = (data: RecipeSearchResult[], totalPages = 1) => ({
  status: 1,
  results: data.length,
  totalPages,
  currentPage: 1,
  data,
});

const suggestion = (status: MySuggestion['status']) => ({ id: status, status }) as MySuggestion;

describe('Dashboard greeting', () => {
  beforeEach(() => jest.clearAllMocks());

  it('welcomes the user by name', async () => {
    get.mockResolvedValue({ status: 1, data: { username: 'harry' } });
    render(await Greeting());
    expect(screen.getByRole('heading', { name: 'Welcome back, harry' })).toBeVisible();
  });

  it("still says hello when the user's details can't load", async () => {
    get.mockRejectedValue(apiError());
    render(await Greeting());
    expect(screen.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
  });
});

describe('Dashboard at a glance', () => {
  beforeEach(() => jest.clearAllMocks());

  const respond = ({ own = [] as RecipeSearchResult[] } = {}) =>
    get.mockImplementation(async (url: string, config?: { params: Record<string, unknown> }) => {
      if (url === '/api/v1/recipes/my-suggestions') {
        return {
          status: 1,
          results: 3,
          data: {
            suggestions: [suggestion('pending'), suggestion('accepted'), suggestion('accepted')],
          },
        };
      }
      const { params } = config!;
      // Counting asks for one recipe a page, so the number of pages is the count
      if (params.limit === 1) {
        return search([first], params.bOnlySaved ? 12 : 5);
      }
      return search(own);
    });

  const tile = (label: string) => screen.getByText(label).closest('a') as HTMLElement;

  it('shows the numbers, each linking to where to act on them', async () => {
    respond();
    render(await AtAGlance());

    expect(within(tile('recipes in your book')).getByText('12')).toBeVisible();
    expect(tile('recipes in your book')).toHaveAttribute('href', '/my-recipes');
    expect(within(tile('recipes you created')).getByText('5')).toBeVisible();
    expect(tile('recipes you created')).toHaveAttribute('href', '/my-recipes?mine=true');
    expect(within(tile('suggestions to review')).getByText('0')).toBeVisible();
    expect(within(tile('suggestion you sent is waiting')).getByText('1')).toBeVisible();
    expect(screen.getByText('2 accepted so far')).toBeVisible();
    expect(tile('suggestion you sent is waiting')).toHaveAttribute('href', '/suggestions');

    expect(get).toHaveBeenCalledWith('/api/v1/recipes/search', {
      params: { authorId: 'me', limit: 1 },
    });
    expect(get).toHaveBeenCalledWith('/api/v1/recipes/search', {
      params: { bOnlySaved: true, limit: 1 },
    });
    // Nothing to review, so no list
    expect(screen.queryByText('Waiting for your review')).not.toBeInTheDocument();
  });

  it('lists the recipes with suggestions waiting for review', async () => {
    respond({
      own: [
        { ...first, id: 'r1', title: 'Soup', pendingSuggestions: 2 },
        { ...second, id: 'r2', title: 'Pie', pendingSuggestions: 1 },
        { ...first, id: 'r3', title: 'Toast', pendingSuggestions: 0 },
      ],
    });
    render(await AtAGlance());

    expect(within(tile('suggestions to review')).getByText('3')).toBeVisible();
    expect(screen.getByRole('link', { name: 'Soup' })).toHaveAttribute(
      'href',
      '/recipes/r1/suggestions'
    );
    expect(screen.getByText('2 suggestions')).toBeVisible();
    expect(screen.getByRole('link', { name: 'Pie' })).toBeVisible();
    expect(screen.queryByRole('link', { name: 'Toast' })).not.toBeInTheDocument();
  });

  it('goes straight to the review page when only one recipe has suggestions', async () => {
    respond({ own: [{ ...first, id: 'r1', title: 'Soup', pendingSuggestions: 1 }] });
    render(await AtAGlance());
    expect(tile('suggestion to review')).toHaveAttribute('href', '/recipes/r1/suggestions');
  });

  it("says so when the numbers can't load", async () => {
    get.mockRejectedValue(apiError());
    render(await AtAGlance());
    expect(screen.getByText(/Couldn't load your numbers/)).toBeVisible();
  });
});

describe('Dashboard recipe shelf', () => {
  beforeEach(() => jest.clearAllMocks());

  const shelf = () =>
    RecipeShelf({
      title: 'Popular recipes to try',
      search: { sort: 'popular' },
      seeAllHref: '/recipes?bHideSaved=true&sort=popular',
      empty: 'Nothing to show.',
    });

  it("shows a few recipes the user hasn't saved, with their author and a save button", async () => {
    get.mockResolvedValue(
      search([
        {
          ...first,
          id: 'r1',
          title: 'Soup',
          authorId: 'alice-id',
          authorName: 'alice',
          bSaved: false,
        },
      ])
    );
    render(await shelf());

    expect(get).toHaveBeenCalledWith('/api/v1/recipes/search', {
      params: { sort: 'popular', bHideSaved: true, limit: 4 },
    });
    expect(screen.getByRole('heading', { name: 'Popular recipes to try' })).toBeVisible();
    expect(screen.getByRole('link', { name: 'Soup' })).toHaveAttribute('href', '/recipes/r1');
    expect(screen.getByRole('link', { name: 'alice' })).toHaveAttribute('href', '/users/alice-id');
    expect(screen.getByRole('button', { name: 'Save recipe' })).toBeVisible();
    expect(screen.getByRole('link', { name: 'See all' })).toHaveAttribute(
      'href',
      '/recipes?bHideSaved=true&sort=popular'
    );
  });

  it('says so when there are none', async () => {
    get.mockResolvedValue(search([]));
    render(await shelf());
    expect(screen.getByText('Nothing to show.')).toBeVisible();
  });

  it("says so when they can't load", async () => {
    get.mockRejectedValue(apiError());
    render(await shelf());
    expect(screen.getByText(/Couldn't load these recipes/)).toBeVisible();
  });

  it('lets a session that has ended go on to log out', async () => {
    const redirect = new Error('NEXT_REDIRECT');
    get.mockRejectedValue(redirect);
    await expect(shelf()).rejects.toBe(redirect);
  });
});
