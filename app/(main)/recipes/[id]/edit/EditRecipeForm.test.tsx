import { AxiosError, AxiosHeaders, AxiosResponse } from 'axios';
import axios from '@/helpers/axios';
import { render, screen, userEvent, waitFor } from '@/test-utils';
import { Recipe } from '@/types/recipe';
import { EditRecipeForm } from './EditRecipeForm';

const replace = jest.fn();
jest.mock('next/navigation', () => ({ useRouter: () => ({ replace }) }));
jest.mock('@/helpers/axios', () => ({
  __esModule: true,
  ...jest.requireActual('@/helpers/axios'),
  default: { patch: jest.fn(), get: jest.fn() },
}));
const patch = axios.patch as jest.Mock;
// Tag suggestions, tested in TagInput.test.tsx
const get = axios.get as jest.Mock;

const recipe: Recipe = {
  id: 'r1',
  authorId: 'me',
  authorName: 'me',
  bPrivate: true,
  bAllowSuggestions: false,
  title: 'Spaghetti pomodoro',
  description: 'A quick tomato pasta.',
  category: 'Main',
  serves: 4,
  prepTime: 10,
  cookTime: 20,
  ingredients: [
    { id: 'i1', subheader: null, quantity: 400, unit: 'g', name: 'spaghetti' },
    { id: 'i2', subheader: 'For the sauce', quantity: 3, unit: 'cloves', name: 'garlic' },
  ],
  steps: ['Boil the pasta', 'Make the sauce'],
  tags: ['quick'],
  bSaved: true,
  savedCount: 1,
  bDeleted: false,
};

const field = (name: string) => screen.getByRole('textbox', { name });
const submit = () => userEvent.click(screen.getByRole('button', { name: 'Save changes' }));

describe('Edit recipe form', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    get.mockResolvedValue({ data: { status: 1, data: { tags: [] } } });
  });

  it('starts with the recipe filled in, headings included', () => {
    render(<EditRecipeForm recipe={recipe} />);

    expect(screen.getByLabelText(/^Title/)).toHaveValue('Spaghetti pomodoro');
    expect(screen.getByLabelText(/^Serves/)).toHaveValue('4');
    expect(field('Ingredient 1')).toHaveValue('spaghetti');
    expect(field('Heading 1')).toHaveValue('For the sauce');
    expect(field('Ingredient 2')).toHaveValue('garlic');
    expect(field('Step 2')).toHaveValue('Make the sauce');
    expect(screen.getByText('quick')).toBeVisible();
    expect(screen.getByLabelText(/^Private/)).toBeChecked();
    expect(screen.getByRole('link', { name: 'Cancel' })).toHaveAttribute('href', '/recipes/r1');
  });

  it('asks for a description when an older recipe has none', async () => {
    render(<EditRecipeForm recipe={{ ...recipe, description: null }} />);
    expect(screen.getByLabelText(/^Description/)).toHaveValue('');

    await submit();

    expect(await screen.findByText('Please enter a description')).toBeVisible();
    expect(patch).not.toHaveBeenCalled();
  });

  it('saves the changes and goes back to the recipe', async () => {
    patch.mockResolvedValue({ data: { status: 1, data: { recipe } } });
    render(<EditRecipeForm recipe={recipe} />);

    await userEvent.clear(screen.getByLabelText(/^Title/));
    await userEvent.type(screen.getByLabelText(/^Title/), 'Garlic spaghetti');
    await submit();

    await waitFor(() => expect(replace).toHaveBeenCalledWith('/recipes/r1'));
    expect(patch).toHaveBeenCalledWith('/api/v1/recipes/update-own-recipe', {
      id: 'r1',
      title: 'Garlic spaghetti',
      description: 'A quick tomato pasta.',
      category: 'Main',
      serves: 4,
      prepTime: 10,
      cookTime: 20,
      ingredients: [
        { quantity: 400, unit: 'g', name: 'spaghetti', subheader: null },
        { quantity: 3, unit: 'cloves', name: 'garlic', subheader: 'For the sauce' },
      ],
      steps: ['Boil the pasta', 'Make the sauce'],
      tags: ['quick'],
      bPrivate: true,
      bAllowSuggestions: false,
    });
  });

  it("shows the API's error and stays on the form", async () => {
    patch.mockRejectedValue(
      new AxiosError('Request failed', 'ERR_BAD_REQUEST', undefined, undefined, {
        status: 400,
        data: { status: 0, message: 'USER_DOESNT_OWN_RECIPE' },
        statusText: '',
        headers: {},
        config: { headers: new AxiosHeaders() },
      } as AxiosResponse)
    );
    render(<EditRecipeForm recipe={recipe} />);
    await submit();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Only the author of this recipe can do that.'
    );
    expect(replace).not.toHaveBeenCalled();
  });
});
