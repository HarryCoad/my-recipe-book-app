import { redirect } from 'next/navigation';
import { serverGet } from '@/helpers/serverApi';
import { render, screen, userEvent } from '@/test-utils';
import { Recipe } from '@/types/recipe';
import EditRecipePage, { generateMetadata } from './page';

jest.mock('@/helpers/serverApi', () => ({
  getSession: async () => ({ token: 'jwt-token', userId: 'me' }),
  serverGet: jest.fn(),
}));
// Prefixed with mock so jest.mock can use it
const mockReplace = jest.fn();
jest.mock('next/navigation', () => ({
  notFound: jest.fn(() => {
    throw new Error('NOT_FOUND');
  }),
  redirect: jest.fn(() => {
    throw new Error('REDIRECT');
  }),
  useRouter: () => ({ back: jest.fn(), replace: mockReplace }),
}));
const get = serverGet as jest.Mock;

const recipe: Recipe = {
  id: 'r1',
  authorId: 'me',
  authorName: 'me',
  bPrivate: false,
  bAllowSuggestions: false,
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
  savedCount: 1,
  bDeleted: false,
};

const respond = (overrides: Partial<Recipe> = {}) =>
  get.mockResolvedValue({
    status: 1,
    data: { recipe: { ...recipe, ...overrides }, bHasEdits: false },
  });

const props = { params: Promise.resolve({ id: 'r1' }) };

describe('Edit recipe page', () => {
  beforeEach(() => jest.clearAllMocks());

  it("shows the author's recipe in the form", async () => {
    respond();
    render(await EditRecipePage(props));

    expect(screen.getByRole('heading', { level: 1, name: 'Edit Recipe' })).toBeVisible();
    expect(screen.getByLabelText(/^Title/)).toHaveValue('Spaghetti pomodoro');
    expect(get).toHaveBeenCalledWith('/api/v1/recipes/r1', { params: undefined });
  });

  it('goes back by replacing itself with the recipe, which it replaced in the history', async () => {
    respond();
    render(await EditRecipePage(props));

    await userEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect(mockReplace).toHaveBeenCalledWith('/my-recipes/r1');
  });

  it.each([
    ["someone else's recipe", { authorId: 'someone', authorName: 'alice' }],
    ['a recipe whose author deleted it', { authorId: null, authorName: null }],
  ])('sends the user to the recipe for %s', async (_, overrides) => {
    respond(overrides);
    await expect(EditRecipePage(props)).rejects.toThrow('REDIRECT');
    expect(redirect).toHaveBeenCalledWith('/my-recipes/r1');
  });

  it("uses the recipe's title for the browser tab", async () => {
    respond();
    await expect(generateMetadata(props)).resolves.toEqual({ title: 'Edit Spaghetti pomodoro' });
  });
});
