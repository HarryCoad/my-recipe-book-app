import { AxiosError, AxiosHeaders, AxiosResponse } from 'axios';
import axios from '@/helpers/axios';
import { render, screen, userEvent, waitFor } from '@/test-utils';
import { ImportDraft } from '@/types/recipe';
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

    await waitFor(() => expect(replace).toHaveBeenCalledWith('/recipes/r1'));
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

describe('Creating a recipe from an import', () => {
  const draft: ImportDraft = {
    title: 'Pancakes',
    description: 'Fluffy pancakes',
    category: 'Breakfast',
    serves: 4,
    prepTime: 10,
    // Missing from the page
    cookTime: 0,
    ingredients: [
      { subheader: null, quantity: 200, unit: 'g', name: 'flour' },
      { subheader: null, quantity: 2, unit: null, name: 'eggs' },
      { subheader: null, quantity: 1, unit: 'handful', name: 'blueberries' },
    ],
    steps: ['Mix', 'Cook'],
    tags: ['quick'],
    bPrivate: true,
    sourceUrl: 'https://www.example.com/pancakes',
  };
  const issues = [
    { fieldname: 'cookTime', code: 'too_small' },
    { fieldname: 'ingredients.[2].unit', code: 'invalid_enum_value' },
  ];

  const importDraft = async () => {
    post.mockResolvedValueOnce({ data: { status: 1, data: { draft, issues } } });
    render(<CreateRecipeForm />);
    await userEvent.type(
      screen.getByLabelText('Recipe web address'),
      'example.com/pancakes{Enter}'
    );
    await screen.findByText('Recipe imported');
  };

  beforeEach(() => {
    jest.clearAllMocks();
    get.mockResolvedValue({ data: { status: 1, data: { tags: [] } } });
  });

  it('fills in the form and highlights what needs fixing', async () => {
    await importDraft();

    expect(screen.getByRole('link', { name: 'example.com' })).toHaveAttribute(
      'href',
      'https://www.example.com/pancakes'
    );
    expect(screen.getByText(/highlighted below/)).toBeVisible();
    expect(screen.getByLabelText(/^Title/)).toHaveValue('Pancakes');
    expect(field('Ingredient 2')).toHaveValue('eggs');
    expect(screen.getByLabelText(/^Private/)).toBeChecked();

    // Shown straight away, without touching anything
    expect(await screen.findByText('Please enter the cook time')).toBeVisible();
    expect(screen.getByText(`"handful" isn't one of our units. Please choose one`)).toBeVisible();
    // The import panel makes way for the draft
    expect(screen.queryByLabelText('Recipe web address')).not.toBeInTheDocument();
  });

  it('creates the recipe once fixed, keeping where it came from', async () => {
    await importDraft();
    post.mockResolvedValueOnce({ data: { status: 1, data: { recipe: { id: 'r9' } } } });

    await userEvent.type(screen.getByLabelText(/^Cook time/), '15');
    await userEvent.click(field('Ingredient 3 unit'));
    await userEvent.click(screen.getByRole('option', { name: 'cup' }));
    await submit();

    await waitFor(() => expect(replace).toHaveBeenCalledWith('/recipes/r9'));
    expect(post).toHaveBeenLastCalledWith(
      '/api/v1/recipes/create',
      expect.objectContaining({
        cookTime: 15,
        ingredients: [
          { quantity: 200, unit: 'g', name: 'flour', subheader: null },
          { quantity: 2, unit: null, name: 'eggs', subheader: null },
          { quantity: 1, unit: 'cup', name: 'blueberries', subheader: null },
        ],
        bPrivate: true,
        sourceUrl: 'https://www.example.com/pancakes',
      })
    );
  }, 15000);

  it('can merge steps the import split too finely', async () => {
    await importDraft();

    await userEvent.click(screen.getByRole('button', { name: 'Merge step 2 into step 1' }));

    expect(field('Step 1')).toHaveValue('Mix Cook');
    expect(screen.queryByRole('textbox', { name: 'Step 2' })).not.toBeInTheDocument();
    // One step left, so nothing more to merge
    expect(screen.queryByRole('button', { name: /^Merge step/ })).not.toBeInTheDocument();
  });

  it('Backspace at the start of a step merges it from the keyboard, leaving the cursor at the join', async () => {
    await importDraft();

    const step2 = field('Step 2') as HTMLTextAreaElement;
    await userEvent.click(step2);
    step2.setSelectionRange(0, 0);
    await userEvent.keyboard('{Backspace}');

    const step1 = field('Step 1') as HTMLTextAreaElement;
    expect(step1).toHaveValue('Mix Cook');
    expect(step1).toHaveFocus();
    expect(step1.selectionStart).toBe('Mix '.length);
  });

  it("doesn't offer merging on a recipe typed in by hand", async () => {
    render(<CreateRecipeForm />);
    await userEvent.type(field('Step 1'), 'Mix');
    await userEvent.tab();
    await userEvent.keyboard('Cook');

    expect(screen.queryByRole('button', { name: /^Merge step/ })).not.toBeInTheDocument();
    // Backspace at the start of a step just does nothing, as before
    const step2 = field('Step 2') as HTMLTextAreaElement;
    step2.setSelectionRange(0, 0);
    await userEvent.keyboard('{Backspace}');
    expect(step2).toHaveValue('Cook');
  });

  it('can start again from a blank form', async () => {
    await importDraft();
    await userEvent.click(screen.getByRole('button', { name: 'Start again' }));

    expect(screen.getByLabelText(/^Title/)).toHaveValue('');
    expect(screen.getByLabelText('Recipe web address')).toBeVisible();
  });
});
