import { AxiosError, AxiosHeaders, AxiosResponse } from 'axios';
import { serverGet } from '@/helpers/serverApi';
import { render, screen, userEvent, within } from '@/test-utils';
import { Recipe } from '@/types/recipe';
import RecipePage, { generateMetadata } from './page';

jest.mock('@/helpers/serverApi', () => ({
  getSession: async () => ({ token: 'jwt-token', userId: 'me' }),
  serverGet: jest.fn(),
}));
jest.mock('next/navigation', () => ({
  notFound: jest.fn(() => {
    throw new Error('NOT_FOUND');
  }),
  useRouter: () => ({ back: jest.fn() }),
}));
const get = serverGet as jest.Mock;

const recipe: Recipe = {
  id: 'r1',
  authorId: 'someone',
  authorName: 'alice',
  bPrivate: false,
  bAllowSuggestions: true,
  title: 'Spaghetti pomodoro',
  description: 'A quick tomato pasta.\nGreat on weeknights.',
  category: 'Main',
  serves: 4,
  prepTime: 10,
  cookTime: 80,
  ingredients: [
    { id: 'i1', subheader: null, quantity: 400, unit: 'g', name: 'spaghetti' },
    { id: 'i2', subheader: 'For the sauce', quantity: 3, unit: 'cloves', name: 'garlic' },
    { id: 'i3', subheader: 'For the sauce', quantity: 2, unit: 'tbsp', name: 'olive oil' },
  ],
  steps: ['Boil the pasta', 'Make the sauce'],
  tags: ['quick', 'vegetarian'],
  bSaved: true,
  savedCount: 1,
  bDeleted: false,
};

const respond = (overrides: Partial<Recipe> = {}, bHasEdits = false) =>
  get.mockResolvedValue({ status: 1, data: { recipe: { ...recipe, ...overrides }, bHasEdits } });

const props = (original?: string) => ({
  params: Promise.resolve({ id: 'r1' }),
  searchParams: Promise.resolve({ original }),
});

// An async server component, so it's awaited before rendering what it returns
const renderPage = async (original?: string) => render(await RecipePage(props(original)));

const apiError = (status: number, message: string) =>
  new AxiosError('Request failed', 'ERR_BAD_REQUEST', undefined, undefined, {
    status,
    data: { status: 0, message },
    statusText: '',
    headers: {},
    config: { headers: new AxiosHeaders() },
  } as AxiosResponse);

describe('Recipe page', () => {
  beforeEach(() => jest.clearAllMocks());

  it('shows everything about the recipe', async () => {
    respond();
    await renderPage();

    expect(screen.getByRole('heading', { level: 1, name: 'Spaghetti pomodoro' })).toBeVisible();
    expect(screen.getByText('Main')).toBeVisible();
    expect(screen.getByText('By alice')).toBeVisible();
    expect(screen.getByText('Saved by 1 person')).toBeVisible();
    expect(screen.getByText('Open to suggestions')).toBeVisible();
    expect(screen.getByText(/A quick tomato pasta/)).toBeVisible();

    expect(screen.getByText('10mins')).toBeVisible();
    expect(screen.getByText('1hr 20mins')).toBeVisible();
    expect(screen.getByText('1hr 30mins')).toBeVisible();
    expect(screen.getByText('4')).toBeVisible();

    // Ingredients under their heading
    expect(screen.getByText('400g spaghetti')).toBeVisible();
    expect(screen.getByRole('heading', { name: 'For the sauce' })).toBeVisible();
    expect(screen.getByText('3 cloves garlic')).toBeVisible();

    const steps = within(screen.getByRole('list', { name: 'Method' })).getAllByRole('listitem');
    expect(steps.map((step) => step.textContent)).toEqual([
      expect.stringContaining('Step 1: Boil the pasta'),
      expect.stringContaining('Step 2: Make the sauce'),
    ]);

    expect(screen.getByText('quick')).toBeVisible();
    expect(screen.getByText('vegetarian')).toBeVisible();
    expect(get).toHaveBeenCalledWith('/api/v1/recipes/r1', { params: undefined });
  });

  it("marks the user's own recipe and private recipes", async () => {
    respond({ authorId: 'me', bPrivate: true, savedCount: 3 });
    await renderPage();

    expect(screen.getByText('Your recipe')).toBeVisible();
    expect(screen.getByText('Private')).toBeVisible();
    expect(screen.getByText('Saved by 3 people')).toBeVisible();
    expect(screen.queryByText('By alice')).not.toBeInTheDocument();
  });

  it('scales the ingredients to the number of servings chosen', async () => {
    respond();
    await renderPage();
    const fewer = screen.getByRole('button', { name: 'Fewer servings' });
    const more = screen.getByRole('button', { name: 'More servings' });

    await userEvent.click(more);
    expect(screen.getByText('Serves 5')).toBeVisible();
    expect(screen.getByText('Scaled from 4 servings')).toBeVisible();
    expect(screen.getByText('500g spaghetti')).toBeVisible();
    expect(screen.getByText('3¾ cloves garlic')).toBeVisible();
    expect(screen.getByText('2½ tbsp olive oil')).toBeVisible();

    await userEvent.click(screen.getByRole('button', { name: 'Reset' }));
    expect(screen.getByText('400g spaghetti')).toBeVisible();
    expect(screen.queryByText(/Scaled from/)).not.toBeInTheDocument();

    // Never fewer than 1
    for (let i = 0; i < 3; i++) {
      await userEvent.click(fewer);
    }
    expect(screen.getByText('Serves 1')).toBeVisible();
    expect(screen.getByText('100g spaghetti')).toBeVisible();
    expect(fewer).toBeDisabled();
  });

  it('lets only the author edit or delete the recipe', async () => {
    respond({ authorId: 'me' });
    const { unmount } = await renderPage();
    expect(screen.getByRole('link', { name: 'Edit recipe' })).toHaveAttribute(
      'href',
      '/recipes/r1/edit'
    );
    expect(screen.getByRole('button', { name: 'Delete recipe' })).toBeVisible();
    unmount();

    respond();
    await renderPage();
    expect(screen.queryByRole('link', { name: 'Edit recipe' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Delete recipe' })).not.toBeInTheDocument();
  });

  it('offers the original when the user has personal edits', async () => {
    respond({}, true);
    await renderPage();

    expect(screen.getByText(/includes your personal changes/)).toBeVisible();
    expect(screen.getByRole('link', { name: 'View the original' })).toHaveAttribute(
      'href',
      '/recipes/r1?original=true'
    );
  });

  it('asks the API for the original and links back to the edited version', async () => {
    respond({}, true);
    await renderPage('true');

    expect(get).toHaveBeenCalledWith('/api/v1/recipes/r1', { params: { original: true } });
    expect(screen.getByText(/viewing the original recipe/)).toBeVisible();
    expect(screen.getByRole('link', { name: 'Back to your version' })).toHaveAttribute(
      'href',
      '/recipes/r1'
    );
    expect(screen.queryByText(/includes your personal changes/)).not.toBeInTheDocument();
  });

  it('shows an older recipe that has no description', async () => {
    respond({ description: null });
    await renderPage();
    expect(screen.getByRole('heading', { level: 1, name: 'Spaghetti pomodoro' })).toBeVisible();
  });

  it('explains a recipe whose author deleted it', async () => {
    respond({ authorId: null, authorName: null });
    await renderPage();

    expect(screen.getByText(/The author has deleted this recipe/)).toBeVisible();
    expect(screen.queryByText('Open to suggestions')).not.toBeInTheDocument();
    expect(screen.queryByText(/^By /)).not.toBeInTheDocument();
  });

  it.each([
    ['a missing or hidden recipe', 404, 'INVALID_ID'],
    ['a malformed id', 400, 'Invalid _id: nope'],
  ])('shows not found for %s', async (_, status, message) => {
    get.mockRejectedValue(apiError(status, message));
    await expect(renderPage()).rejects.toThrow('NOT_FOUND');
  });

  it('leaves other errors to the error boundary', async () => {
    const err = apiError(500, 'Something broke');
    get.mockRejectedValue(err);
    await expect(renderPage()).rejects.toBe(err);
  });

  it("uses the recipe's title for the browser tab", async () => {
    respond();
    await expect(generateMetadata(props())).resolves.toEqual({ title: 'Spaghetti pomodoro' });
  });
});
