import { redirect } from 'next/navigation';
import { serverGet } from '@/helpers/serverApi';
import { render, screen, within } from '@/test-utils';
import { Edit, Recipe } from '@/types/recipe';
import ReviewSuggestionsPage from './page';

jest.mock('@/helpers/serverApi', () => ({
  getSession: async () => ({ token: 'jwt-token', userId: 'me' }),
  serverGet: jest.fn(),
}));
jest.mock('next/navigation', () => ({
  notFound: jest.fn(() => {
    throw new Error('NOT_FOUND');
  }),
  redirect: jest.fn(() => {
    throw new Error('REDIRECT');
  }),
  useRouter: () => ({ back: jest.fn(), replace: jest.fn(), refresh: jest.fn() }),
}));
const get = serverGet as jest.Mock;

const recipe: Recipe = {
  id: 'r1',
  authorId: 'me',
  authorName: 'me',
  bPrivate: false,
  bAllowSuggestions: true,
  title: 'Spaghetti pomodoro',
  description: 'A quick tomato pasta.',
  category: 'Main',
  serves: 4,
  prepTime: 10,
  cookTime: 20,
  ingredients: [{ id: 'i1', subheader: null, quantity: 400, unit: 'g', name: 'spaghetti' }],
  steps: ['Boil the pasta'],
  tags: [],
  bSaved: true,
  savedCount: 3,
  bDeleted: false,
};

const suggestion = (overrides: Partial<Edit>): Edit => ({
  id: 's1',
  recipeId: 'r1',
  userId: 'bob-id',
  userName: 'bob',
  isSuggestion: true,
  ingredients: [],
  steps: ['Boil the pasta in salted water'],
  status: 'pending',
  ...overrides,
});

const respond = (edits: Edit[], overrides: Partial<Recipe> = {}) =>
  get.mockImplementation(async (url: string) =>
    url.includes('view-suggestions')
      ? { status: 1, data: { edits } }
      : { status: 1, data: { recipe: { ...recipe, ...overrides }, bHasEdits: false } }
  );

const props = { params: Promise.resolve({ id: 'r1' }) };
const renderPage = async () => render(await ReviewSuggestionsPage(props));

describe('Review suggestions page', () => {
  beforeEach(() => jest.clearAllMocks());

  it('shows pending suggestions with their changes and review buttons', async () => {
    respond([suggestion({ comments: 'Salt helps' })]);
    await renderPage();

    expect(get).toHaveBeenCalledWith('/api/v1/recipes/view-suggestions/r1', {
      params: { bShowAll: true },
    });
    expect(screen.getByRole('heading', { name: 'Waiting for review (1)' })).toBeVisible();
    const card = screen.getByRole('article');
    expect(within(card).getByRole('link', { name: 'bob' })).toHaveAttribute(
      'href',
      '/users/bob-id'
    );
    expect(within(card).getByText(/suggested changes/)).toHaveTextContent('bob suggested changes');
    expect(within(card).getByText('Changes the method')).toBeVisible();
    expect(within(card).getByText('Salt helps')).toBeVisible();
    expect(within(card).getByText('Boil the pasta in salted water')).toBeVisible();
    expect(within(card).getByRole('button', { name: 'Accept' })).toBeVisible();
    expect(within(card).getByRole('button', { name: 'Reject' })).toBeVisible();
  });

  it('copes with a suggester whose account was deleted', async () => {
    respond([suggestion({ userName: null })]);
    await renderPage();
    expect(screen.getByText('Someone who has since left suggested changes')).toBeVisible();
    // No account, so no profile to link to
    expect(screen.queryByRole('link', { name: /Someone/ })).not.toBeInTheDocument();
  });

  it('lists reviewed suggestions separately, without review buttons', async () => {
    respond([suggestion({ id: 's2', status: 'accepted' })]);
    await renderPage();

    expect(screen.getByText('No suggestions are waiting for review.')).toBeVisible();
    expect(screen.getByRole('heading', { name: 'Reviewed' })).toBeVisible();
    expect(screen.getByText('Accepted')).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Accept' })).not.toBeInTheDocument();
  });

  it('mentions when the recipe is closed to new suggestions', async () => {
    respond([], { bAllowSuggestions: false });
    await renderPage();
    expect(screen.getByText(/isn't open to new suggestions/)).toBeVisible();
  });

  it('sends anyone but the author to the recipe', async () => {
    respond([], { authorId: 'someone' });
    await expect(renderPage()).rejects.toThrow('REDIRECT');
    expect(redirect).toHaveBeenCalledWith('/recipes/r1');
  });
});
