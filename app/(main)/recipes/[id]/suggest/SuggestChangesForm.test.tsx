import { AxiosError, AxiosHeaders, AxiosResponse } from 'axios';
import { notifications } from '@mantine/notifications';
import axios from '@/helpers/axios';
import { render, screen, userEvent, waitFor } from '@/test-utils';
import { Recipe } from '@/types/recipe';
import { SuggestChangesForm } from './SuggestChangesForm';

const replace = jest.fn();
jest.mock('next/navigation', () => ({ useRouter: () => ({ replace }) }));
jest.mock('@/helpers/axios', () => ({
  __esModule: true,
  ...jest.requireActual('@/helpers/axios'),
  default: { post: jest.fn(), get: jest.fn() },
}));
const post = axios.post as jest.Mock;
// Tag suggestions, tested in TagInput.test.tsx
const get = axios.get as jest.Mock;
jest.mock('@mantine/notifications', () => ({ notifications: { show: jest.fn() } }));
const showToast = notifications.show as jest.Mock;

const recipe: Recipe = {
  id: 'r1',
  authorId: 'alice-id',
  authorName: 'alice',
  bPrivate: false,
  bAllowSuggestions: true,
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
  savedCount: 2,
  bDeleted: false,
};

const field = (name: string) => screen.getByRole('textbox', { name });
const submit = () => userEvent.click(screen.getByRole('button', { name: 'Send suggestion' }));

describe('Suggest changes form', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    get.mockResolvedValue({ data: { status: 1, data: { tags: [] } } });
  });

  it("starts from the author's recipe", () => {
    render(<SuggestChangesForm recipe={recipe} />);

    expect(field('Ingredient 1')).toHaveValue('spaghetti');
    expect(field('Heading 1')).toHaveValue('For the sauce');
    expect(field('Step 2')).toHaveValue('Make the sauce');
    expect(screen.getByText('quick')).toBeVisible();
    expect(screen.getByLabelText(/^Message to alice/)).toHaveValue('');
  });

  it('sends only the parts that changed, with the message', async () => {
    post.mockResolvedValue({ data: { status: 1, data: { recipe } } });
    render(<SuggestChangesForm recipe={recipe} />);

    await userEvent.clear(field('Step 2'));
    await userEvent.type(field('Step 2'), 'Make the sauce with basil');
    await userEvent.type(screen.getByLabelText(/^Message to alice/), 'Basil helps');
    await submit();

    await waitFor(() => expect(replace).toHaveBeenCalledWith('/recipes/r1'));
    expect(post).toHaveBeenCalledWith('/api/v1/recipes/edit-recipe', {
      id: 'r1',
      isSuggestion: true,
      steps: ['Boil the pasta', 'Make the sauce with basil'],
      comments: 'Basil helps',
    });
    expect(showToast).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Suggestion sent to alice' })
    );
  });

  it('sends changed tags, including removing them all', async () => {
    post.mockResolvedValue({ data: { status: 1, data: { recipe } } });
    render(<SuggestChangesForm recipe={recipe} />);

    // Backspace in the empty tag field removes the last tag
    await userEvent.click(field('Tags'));
    await userEvent.keyboard('{Backspace}');
    await submit();

    await waitFor(() =>
      expect(post).toHaveBeenCalledWith('/api/v1/recipes/edit-recipe', {
        id: 'r1',
        isSuggestion: true,
        tags: [],
      })
    );
  });

  it("says so when nothing's been changed, without sending anything", async () => {
    render(<SuggestChangesForm recipe={recipe} />);
    await submit();

    expect(await screen.findByText(/You haven't changed anything yet/)).toBeVisible();
    expect(post).not.toHaveBeenCalled();
  });

  it("shows the API's error and stays on the form", async () => {
    post.mockRejectedValue(
      new AxiosError('Request failed', 'ERR_BAD_REQUEST', undefined, undefined, {
        status: 400,
        data: { status: 0, message: 'NO_SUGGESTIONS' },
        statusText: '',
        headers: {},
        config: { headers: new AxiosHeaders() },
      } as AxiosResponse)
    );
    render(<SuggestChangesForm recipe={recipe} />);
    await userEvent.type(field('Step 1'), ' in salted water');
    await submit();

    expect(await screen.findByRole('alert')).toHaveTextContent("isn't accepting suggestions");
    expect(replace).not.toHaveBeenCalled();
  });
});
