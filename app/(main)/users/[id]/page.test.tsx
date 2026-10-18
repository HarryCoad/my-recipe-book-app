import { AxiosError, AxiosHeaders, AxiosResponse } from 'axios';
import recipes from '@/devData/recipes.json';
import { serverGet } from '@/helpers/serverApi';
import { render, screen, within } from '@/test-utils';
import { RecipeSearchResult } from '@/types/recipe';
import { PublicUser } from '@/types/user';
import UserProfilePage, { generateMetadata } from './page';

jest.mock('@/helpers/serverApi', () => ({
  getSession: async () => ({ token: 'jwt-token', userId: 'me' }),
  serverGet: jest.fn(),
}));
jest.mock('next/navigation', () => ({
  notFound: jest.fn(() => {
    throw new Error('NOT_FOUND');
  }),
  redirect: jest.fn((url: string) => {
    throw new Error(`REDIRECT ${url}`);
  }),
  usePathname: () => '/users/alice-id',
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ replace: jest.fn(), refresh: jest.fn() }),
}));
const get = serverGet as jest.Mock;

const alice: PublicUser = { id: 'alice-id', username: 'alice', photo: '', bPrivateSaves: false };
const me: PublicUser = { id: 'me', username: 'harry', photo: '', bPrivateSaves: false };

// One recipe alice wrote, and one of the viewer's that alice saved
const [first, second] = (recipes as Omit<RecipeSearchResult, 'pendingSuggestions'>[]).map(
  (recipe) => ({ ...recipe, pendingSuggestions: 0 })
);
const hers: RecipeSearchResult = {
  ...first,
  id: 'hers',
  title: 'Her soup',
  authorId: 'alice-id',
  authorName: 'alice',
  bSaved: false,
};
const viewers: RecipeSearchResult = { ...second, id: 'mine', title: 'My pie', authorId: 'me' };

const apiError = (status: number, message: string) =>
  new AxiosError('Request failed', 'ERR_BAD_REQUEST', undefined, undefined, {
    status,
    data: { status: 0, message },
    statusText: '',
    headers: {},
    config: { headers: new AxiosHeaders() },
  } as AxiosResponse);

type Respond = {
  user?: PublicUser | AxiosError;
  saved?: RecipeSearchResult[] | AxiosError;
  totalPages?: number;
};

// The profile from GET /users/:id, and their saved recipes from search
const respond = ({ user = alice, saved = [hers, viewers], totalPages = 1 }: Respond = {}) =>
  get.mockImplementation(async (url: string) => {
    const result = url.startsWith('/api/v1/users/')
      ? user instanceof AxiosError
        ? user
        : { status: 1, data: { user } }
      : saved instanceof AxiosError
        ? saved
        : { status: 1, results: saved.length, totalPages, currentPage: 1, data: saved };
    if (result instanceof AxiosError) {
      throw result;
    }
    return result;
  });

const searchCalls = () => get.mock.calls.filter(([url]) => url === '/api/v1/recipes/search');

// An async server component, so it's awaited before rendering what it returns
const renderPage = async (id = 'alice-id', page?: string) =>
  render(
    await UserProfilePage({
      params: Promise.resolve({ id }),
      searchParams: Promise.resolve({ page }),
    })
  );

const card = (title: string) => screen.getByText(title).closest('article') as HTMLElement;

describe('User profile page', () => {
  beforeEach(() => jest.clearAllMocks());

  it("shows someone's name and the recipes they've saved", async () => {
    respond();
    await renderPage();

    expect(get).toHaveBeenCalledWith('/api/v1/users/alice-id');
    expect(get).toHaveBeenCalledWith('/api/v1/recipes/search', {
      params: { savedBy: 'alice-id', page: 1 },
    });
    expect(screen.getByRole('heading', { level: 1, name: 'alice' })).toBeVisible();
    expect(screen.queryByRole('link', { name: 'Settings' })).not.toBeInTheDocument();

    // The save button is about the viewer, and they can't unsave their own recipe
    expect(within(card('Her soup')).getByRole('button', { name: 'Save recipe' })).toBeVisible();
    expect(within(card('My pie')).getByText('Your recipe')).toBeVisible();
    expect(within(card('My pie')).queryByRole('button', { name: /save recipe/i })).toBeNull();
  });

  it('asks for the page in the URL', async () => {
    respond({ totalPages: 3 });
    await renderPage('alice-id', '2');

    expect(get).toHaveBeenCalledWith('/api/v1/recipes/search', {
      params: { savedBy: 'alice-id', page: 2 },
    });
    expect(screen.getByRole('link', { name: '1' })).toHaveAttribute('href', '/users/alice-id');
  });

  it("doesn't ask for someone's saved recipes when they're private", async () => {
    respond({ user: { ...alice, bPrivateSaves: true } });
    await renderPage();

    expect(screen.getByText("This user's saved recipes are private.")).toBeVisible();
    expect(searchCalls()).toHaveLength(0);
  });

  it('treats SAVES_PRIVATE from search as private, if they changed it after the profile loaded', async () => {
    respond({ saved: apiError(403, 'SAVES_PRIVATE') });
    await renderPage();

    expect(screen.getByText("This user's saved recipes are private.")).toBeVisible();
  });

  it.each([
    ['an unknown or deleted user', 'alice-id'],
    ['a malformed ID', 'not-an-id'],
  ])('shows not found for %s', async (_, id) => {
    respond({ user: apiError(404, 'INVALID_ID') });
    await expect(renderPage(id)).rejects.toThrow('NOT_FOUND');
  });

  it('shows not found if their account goes before their recipes load', async () => {
    respond({ saved: apiError(404, 'INVALID_ID') });
    await expect(renderPage()).rejects.toThrow('NOT_FOUND');
  });

  it('leaves other errors to the error boundary', async () => {
    const err = apiError(500, 'Something broke');
    respond({ user: err });
    await expect(renderPage()).rejects.toBe(err);
  });

  it("shows the user's own profile, with their saves even when private", async () => {
    respond({ user: { ...me, bPrivateSaves: true }, saved: [viewers] });
    await renderPage('me');

    expect(screen.getByRole('heading', { level: 1, name: 'harry' })).toBeVisible();
    expect(screen.getByRole('link', { name: 'Settings' })).toHaveAttribute('href', '/settings');
    expect(screen.getByText(/only you can see this list/)).toBeVisible();
    expect(get).toHaveBeenCalledWith('/api/v1/recipes/search', {
      params: { savedBy: 'me', page: 1 },
    });
    expect(screen.getByText('My pie')).toBeVisible();
  });

  it.each([
    ['alice-id', "alice hasn't saved any recipes you can see yet."],
    ['me', "You haven't saved any recipes yet."],
  ])('says so when %s has no saved recipes', async (id, message) => {
    respond({ user: id === 'me' ? me : alice, saved: [] });
    await renderPage(id);
    expect(screen.getByText(message)).toBeVisible();
  });

  it('goes to the last page when the page asked for is past the end', async () => {
    respond({ saved: [], totalPages: 2 });
    await expect(renderPage('alice-id', '5')).rejects.toThrow('REDIRECT /users/alice-id?page=2');
  });

  it('uses their name for the browser tab', async () => {
    respond();
    await expect(
      generateMetadata({
        params: Promise.resolve({ id: 'alice-id' }),
        searchParams: Promise.resolve({}),
      })
    ).resolves.toEqual({ title: 'alice' });
  });
});
