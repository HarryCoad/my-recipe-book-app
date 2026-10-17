import { AxiosError, AxiosHeaders, AxiosResponse } from 'axios';
import axios from '@/helpers/axios';
import { render, screen, userEvent, waitFor } from '@/test-utils';
import { CreateRecipeForm } from './CreateRecipeForm';

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

const field = (name: string) => screen.getByRole('textbox', { name });
const choose = async (label: string, option: string) => {
  await userEvent.click(field(label));
  await userEvent.click(screen.getByRole('option', { name: option }));
};

const fillDetails = async () => {
  await userEvent.type(screen.getByLabelText(/^Title/), 'Pancakes');
  await userEvent.type(screen.getByLabelText(/^Description/), 'Fluffy pancakes');
  await choose('Category', 'Breakfast');
  await userEvent.type(screen.getByLabelText(/^Serves/), '2');
  await userEvent.type(screen.getByLabelText(/^Prep time/), '10');
  await userEvent.type(screen.getByLabelText(/^Cook time/), '15');
};

// Types into the focused field then presses Tab, like filling the list from the keyboard
const typeAndTab = async (...entries: string[]) => {
  for (const text of entries) {
    await userEvent.keyboard(text);
    await userEvent.tab();
  }
};

const submit = () => userEvent.click(screen.getByRole('button', { name: 'Create recipe' }));

describe('Create recipe form', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    get.mockResolvedValue({ data: { status: 1, data: { tags: [] } } });
  });

  it('creates a recipe filled in from the keyboard, with a heading', async () => {
    post.mockResolvedValue({ data: { status: 1, data: { recipe: { id: 'r1' } } } });
    render(<CreateRecipeForm />);
    await fillDetails();

    // Typed units are picked on Tab, and Tab after the last ingredient starts the next one
    await userEvent.click(field('Ingredient 1 quantity'));
    await typeAndTab('200', 'g', 'flour');
    expect(field('Ingredient 2 quantity')).toHaveFocus();
    await typeAndTab('2', 'pi', 'eggs');
    expect(field('Ingredient 3 quantity')).toHaveFocus();

    // A heading comes with an empty ingredient below it
    await userEvent.click(screen.getByRole('button', { name: 'Add heading' }));
    expect(field('Heading 1')).toHaveFocus();
    await typeAndTab('Topping', '1', 'tb', 'maple syrup');

    await userEvent.click(field('Step 1'));
    await typeAndTab('Mix');
    expect(field('Step 2')).toHaveFocus();
    await userEvent.keyboard('Cook');

    await userEvent.type(field('Tags'), 'quick{Enter}');
    await userEvent.click(screen.getByLabelText(/^Allow suggestions/));
    await submit();

    await waitFor(() => expect(replace).toHaveBeenCalledWith('/my-recipes/r1'));
    // The empty rows Tab left behind (ingredient 3, and one after the syrup) are ignored
    expect(post).toHaveBeenCalledWith('/api/v1/recipes/create', {
      title: 'Pancakes',
      description: 'Fluffy pancakes',
      category: 'Breakfast',
      serves: 2,
      prepTime: 10,
      cookTime: 15,
      ingredients: [
        { quantity: 200, unit: 'g', name: 'flour', subheader: null },
        { quantity: 2, unit: 'pieces', name: 'eggs', subheader: null },
        { quantity: 1, unit: 'tbsp', name: 'maple syrup', subheader: 'Topping' },
      ],
      steps: ['Mix', 'Cook'],
      tags: ['quick'],
      bPrivate: false,
      bAllowSuggestions: true,
    });
  }, 30000);

  it("shows what's missing without calling the API", async () => {
    render(<CreateRecipeForm />);
    await submit();

    expect(await screen.findByText('Please enter a title')).toBeVisible();
    expect(screen.getByText('Please choose a category')).toBeVisible();
    expect(screen.getByText('Please add at least one ingredient')).toBeVisible();
    expect(screen.getByText('Please add at least one step')).toBeVisible();
    expect(post).not.toHaveBeenCalled();
  });

  it('Tab skips the drag and delete buttons, and leaves the list from an empty last row', async () => {
    render(<CreateRecipeForm />);
    await userEvent.click(field('Ingredient 1 quantity'));
    await typeAndTab('1', 'g', 'salt');
    expect(field('Ingredient 2 quantity')).toHaveFocus();

    // Nothing typed in the new row, so Tab moves on instead of adding another
    await userEvent.tab();
    await userEvent.tab();
    await userEvent.tab();
    expect(screen.getByRole('button', { name: 'Add ingredient' })).toHaveFocus();
    expect(screen.queryByRole('textbox', { name: 'Ingredient 3' })).not.toBeInTheDocument();
  });

  it('Backspace in an empty row removes it and goes back to the row above', async () => {
    render(<CreateRecipeForm />);
    await userEvent.click(field('Ingredient 1 quantity'));
    await typeAndTab('1', 'g', 'salt');
    expect(field('Ingredient 2 quantity')).toHaveFocus();

    await userEvent.keyboard('{Backspace}');

    expect(screen.queryByRole('textbox', { name: 'Ingredient 2' })).not.toBeInTheDocument();
    expect(field('Ingredient 1')).toHaveFocus();
    // The only ingredient can't be removed
    await userEvent.clear(field('Ingredient 1'));
    await userEvent.clear(field('Ingredient 1 quantity'));
    await userEvent.keyboard('{Backspace}');
    expect(field('Ingredient 1 quantity')).toBeInTheDocument();
  });

  it('Alt+arrow keys move the current row and keep the cursor in it', async () => {
    render(<CreateRecipeForm />);
    await userEvent.type(field('Ingredient 1'), 'salt{Enter}');
    await userEvent.keyboard('1');
    await userEvent.tab();
    await userEvent.tab();
    await userEvent.keyboard('pepper{Alt>}{ArrowUp}{/Alt}');

    expect(field('Ingredient 1')).toHaveValue('pepper');
    expect(field('Ingredient 2')).toHaveValue('salt');
    expect(field('Ingredient 1')).toHaveFocus();
  });

  it('moving a heading with Alt+arrow keys takes its ingredients with it', async () => {
    render(<CreateRecipeForm />);
    await userEvent.click(screen.getByRole('button', { name: 'Add heading' }));
    await userEvent.keyboard('Sauce');
    await userEvent.type(field('Ingredient 2'), 'tomato');
    await userEvent.click(screen.getByRole('button', { name: 'Add heading' }));
    await userEvent.keyboard('Serve');
    await userEvent.type(field('Ingredient 3'), 'basil');

    await userEvent.click(field('Heading 2'));
    await userEvent.keyboard('{Alt>}{ArrowUp}{/Alt}');

    expect(field('Heading 1')).toHaveValue('Serve');
    expect(field('Heading 1')).toHaveFocus();
    expect(field('Ingredient 2')).toHaveValue('basil');
    expect(field('Heading 2')).toHaveValue('Sauce');
    expect(field('Ingredient 3')).toHaveValue('tomato');
  }, 15000);

  it("shows the API's validation errors on the matching rows", async () => {
    post.mockRejectedValue(
      new AxiosError('Request failed', 'ERR_BAD_REQUEST', undefined, undefined, {
        status: 400,
        data: {
          status: 0,
          message: 'Validation_Error',
          // The API's second ingredient is the form's third row, after the heading
          errors: [{ fieldname: 'ingredients.[1].unit', code: 'invalid_enum_value' }],
        },
        statusText: '',
        headers: {},
        config: { headers: new AxiosHeaders() },
      } as AxiosResponse)
    );
    render(<CreateRecipeForm />);
    await fillDetails();
    await userEvent.click(field('Ingredient 1 quantity'));
    await typeAndTab('200', 'g', 'flour');
    await userEvent.keyboard('{Backspace}');
    await userEvent.click(screen.getByRole('button', { name: 'Add heading' }));
    await typeAndTab('Topping', '1', 'tbsp', 'syrup');
    await userEvent.type(field('Step 1'), 'Mix');
    await submit();

    expect(await screen.findByText('Please choose one of the options.')).toBeVisible();
    expect(field('Ingredient 2 unit')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('alert')).toHaveTextContent('Some of the details entered are invalid.');
    expect(replace).not.toHaveBeenCalled();
  }, 30000);
});
