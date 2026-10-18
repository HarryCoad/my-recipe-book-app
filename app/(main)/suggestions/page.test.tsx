import { serverGet } from '@/helpers/serverApi';
import { render, screen, within } from '@/test-utils';
import { MySuggestion } from '@/types/recipe';
import MySuggestionsPage from './page';

jest.mock('@/helpers/serverApi', () => ({ serverGet: jest.fn() }));
const get = serverGet as jest.Mock;

const suggestion = (overrides: Partial<MySuggestion>): MySuggestion => ({
  id: 's1',
  recipeId: { id: 'r1', title: 'Spaghetti pomodoro' },
  userId: 'me',
  userName: 'me',
  isSuggestion: true,
  ingredients: [],
  steps: ['Boil the pasta'],
  tags: ['quick'],
  status: 'pending',
  ...overrides,
});

const respond = (suggestions: MySuggestion[]) =>
  get.mockResolvedValue({ status: 1, results: suggestions.length, data: { suggestions } });

const renderPage = async () => render(await MySuggestionsPage());

describe('My suggestions page', () => {
  beforeEach(() => jest.clearAllMocks());

  it('lists each suggestion with its recipe, status and what it changes', async () => {
    respond([
      suggestion({ comments: 'Simpler method' }),
      suggestion({ id: 's2', status: 'rejected', recipeId: { id: 'r2', title: 'Pie' } }),
    ]);
    await renderPage();

    expect(get).toHaveBeenCalledWith('/api/v1/recipes/my-suggestions');
    const [first, second] = screen.getAllByRole('article');
    expect(within(first).getByRole('link', { name: 'Spaghetti pomodoro' })).toHaveAttribute(
      'href',
      '/recipes/r1'
    );
    expect(within(first).getByText('Waiting for review')).toBeVisible();
    expect(within(first).getByText('Changes the method and tags')).toBeVisible();
    expect(within(first).getByText('Simpler method')).toBeVisible();
    expect(within(second).getByText('Rejected')).toBeVisible();
  });

  it('copes with a suggestion whose recipe was deleted', async () => {
    respond([suggestion({ recipeId: null })]);
    await renderPage();
    expect(screen.getByText("A recipe that's been deleted")).toBeVisible();
  });

  it('explains how to make a suggestion when there are none', async () => {
    respond([]);
    await renderPage();
    expect(screen.getByText(/You haven't suggested any changes yet/)).toBeVisible();
  });
});
