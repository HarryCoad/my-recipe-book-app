import { ComponentProps, useState } from 'react';
import { AxiosError, AxiosHeaders, AxiosResponse } from 'axios';
import axios from '@/helpers/axios';
import { render, screen, userEvent, waitFor } from '@/test-utils';
import { ImportDraft } from '@/types/recipe';
import { ImportRecipe as ImportPanel } from './ImportRecipe';

jest.mock('@/helpers/axios', () => ({
  __esModule: true,
  ...jest.requireActual('@/helpers/axios'),
  default: { post: jest.fn() },
}));
const post = axios.post as jest.Mock;

const draft = { title: 'Pancakes' } as ImportDraft;
const result = { draft, issues: [], recipe: null, duplicateOf: null };
// Overrides of the API's answer, e.g. a created recipe or a duplicate
const respond = (data: Record<string, unknown> = {}) =>
  post.mockResolvedValue({ data: { status: 1, data: { ...result, ...data } } });

const apiError = (status: number, message: string) =>
  new AxiosError('Request failed', 'ERR_BAD_REQUEST', undefined, undefined, {
    status,
    data: { status: 0, message },
    statusText: '',
    headers: {},
    config: { headers: new AxiosHeaders() },
  } as AxiosResponse);

const photo = (name = 'recipe.jpg', { type = 'image/jpeg', size = 1000 } = {}) => {
  const file = new File(['x'], name, { type });
  Object.defineProperty(file, 'size', { value: size });
  return file;
};

// Mantine's FileInput opens a hidden file input
const fileInput = () => document.querySelector('input[type="file"]') as HTMLInputElement;

// The page holds "Create it straight away" and remembers it (tested with CreateRecipeForm), so
// stand in for it here
function ImportRecipe(
  props: Omit<ComponentProps<typeof ImportPanel>, 'skipReview' | 'onSkipReviewChange'>
) {
  const [skipReview, setSkipReview] = useState(false);
  return <ImportPanel {...props} skipReview={skipReview} onSkipReviewChange={setSkipReview} />;
}

describe('Import recipe', () => {
  beforeEach(() => jest.clearAllMocks());

  it('imports from a web address, adding https:// if it was left off', async () => {
    respond();
    const onImport = jest.fn();
    render(<ImportRecipe onImport={onImport} />);

    await userEvent.type(
      screen.getByLabelText('Recipe web address'),
      'example.com/pancakes{Enter}'
    );

    await waitFor(() =>
      expect(onImport).toHaveBeenCalledWith({ draft, issues: [] }, { triedToSkip: false })
    );
    expect(post).toHaveBeenCalledWith(
      '/api/v1/recipes/import-url',
      { url: 'https://example.com/pancakes' },
      expect.objectContaining({ signal: expect.any(AbortSignal) })
    );
  });

  it("says what's wrong with an address before sending it", async () => {
    render(<ImportRecipe onImport={jest.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: 'Import' }));

    expect(screen.getByRole('alert')).toHaveTextContent('Please enter the web address');
    expect(post).not.toHaveBeenCalled();
  });

  it.each([
    ['NO_RECIPE_FOUND', 422, "We couldn't find a recipe there."],
    ['FETCH_FAILED', 502, "We couldn't load that page."],
    ['TOO_MANY_IMPORTS', 429, 'wait an hour'],
  ])("explains the API's %s error", async (code, status, message) => {
    post.mockRejectedValue(apiError(status, code));
    render(<ImportRecipe onImport={jest.fn()} />);

    await userEvent.type(screen.getByLabelText('Recipe web address'), 'https://a.com/x{Enter}');

    expect(await screen.findByRole('alert')).toHaveTextContent(message);
  });

  it('reads up to 4 photos as one recipe, in the order chosen', async () => {
    respond();
    const onImport = jest.fn();
    render(<ImportRecipe initialSource="image" onImport={onImport} />);

    const pages = [photo('page1.jpg'), photo('page2.jpg')];
    await userEvent.upload(fileInput(), pages);
    await userEvent.click(screen.getByRole('button', { name: 'Import' }));

    await waitFor(() => expect(onImport).toHaveBeenCalled());
    const [url, body, config] = post.mock.calls[0];
    expect(url).toBe('/api/v1/recipes/import-image');
    expect((body as FormData).getAll('image')).toEqual(pages);
    expect(config.headers).toEqual({ 'Content-Type': 'multipart/form-data' });
  });

  it.each([
    ['too big', [photo('big.jpg', { size: 6 * 1024 * 1024 })], 'too big'],
    ['more than 4', ['1', '2', '3', '4', '5'].map((n) => photo(`${n}.jpg`)), 'up to 4 photos'],
  ])("won't send photos the API would refuse: %s", async (_, files, message) => {
    render(<ImportRecipe initialSource="image" onImport={jest.fn()} />);

    await userEvent.upload(fileInput(), files);
    expect(screen.getByRole('alert')).toHaveTextContent(message);

    await userEvent.click(screen.getByRole('button', { name: 'Import' }));
    expect(post).not.toHaveBeenCalled();
  });

  it('says when the recipe is already in the book, and can import it anyway', async () => {
    respond({ draft: null, duplicateOf: { id: 'old', title: 'Old pancakes' } });
    const onImport = jest.fn();
    render(<ImportRecipe onImport={onImport} />);

    await userEvent.type(screen.getByLabelText('Recipe web address'), 'https://a.com/x{Enter}');

    expect(await screen.findByText('Already in your book')).toBeVisible();
    expect(screen.getByRole('link', { name: 'Old pancakes' })).toHaveAttribute(
      'href',
      '/recipes/old'
    );
    expect(onImport).not.toHaveBeenCalled();

    respond();
    await userEvent.click(screen.getByRole('button', { name: 'Import anyway' }));

    await waitFor(() => expect(onImport).toHaveBeenCalled());
    expect(post).toHaveBeenLastCalledWith(
      '/api/v1/recipes/import-url',
      { url: 'https://a.com/x', bAllowDuplicate: true },
      expect.anything()
    );
  });

  it('adds each photo taken with the camera as the next page, up to 4', async () => {
    jest.spyOn(window, 'matchMedia').mockImplementation(
      (query) =>
        ({
          matches: query === '(pointer: coarse)',
          media: query,
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
          addListener: jest.fn(),
          removeListener: jest.fn(),
        }) as unknown as MediaQueryList
    );
    respond();
    render(<ImportRecipe initialSource="image" onImport={jest.fn()} />);
    const camera = () => document.querySelector('input[type="file"][capture]') as HTMLInputElement;
    const takePhoto = screen.getByRole('button', { name: 'Take a photo' });

    const pages = ['1', '2', '3', '4'].map((n) => photo(`page${n}.jpg`));
    for (const page of pages) {
      await userEvent.upload(camera(), page);
    }

    expect(takePhoto).toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: 'Import' }));
    await waitFor(() => expect(post).toHaveBeenCalled());
    expect((post.mock.calls[0][1] as FormData).getAll('image')).toEqual(pages);
    jest.restoreAllMocks();
  });

  it('links to bulk import for lots of recipes', () => {
    render(<ImportRecipe onImport={jest.fn()} />);
    expect(screen.getByRole('link', { name: 'Import lots at once' })).toHaveAttribute(
      'href',
      '/my-recipes/import'
    );
  });

  describe('creating it straight away', () => {
    const skipReview = () =>
      userEvent.click(screen.getByRole('switch', { name: /Create it straight away/ }));
    const createdRecipe = { id: 'r9', title: 'Pancakes' };

    it('creates the recipe and gets ready for the next import', async () => {
      respond({ recipe: createdRecipe });
      const onImport = jest.fn();
      render(<ImportRecipe onImport={onImport} />);

      await skipReview();
      const address = screen.getByLabelText('Recipe web address');
      await userEvent.type(address, 'https://a.com/pancakes{Enter}');

      expect(await screen.findByRole('link', { name: 'Pancakes' })).toHaveAttribute(
        'href',
        '/recipes/r9'
      );
      expect(screen.getByText(/You can import another one now/)).toBeVisible();
      expect(post).toHaveBeenCalledWith(
        '/api/v1/recipes/import-url',
        { url: 'https://a.com/pancakes', bSkipReview: true },
        expect.anything()
      );
      expect(address).toHaveValue('');
      expect(onImport).not.toHaveBeenCalled();
    });

    it('sends the choice with photos too, as text', async () => {
      respond({ recipe: createdRecipe });
      render(<ImportRecipe initialSource="image" onImport={jest.fn()} />);

      await skipReview();
      await userEvent.upload(fileInput(), photo());
      await userEvent.click(screen.getByRole('button', { name: 'Import' }));

      await screen.findByRole('link', { name: 'Pancakes' });
      expect((post.mock.calls[0][1] as FormData).get('bSkipReview')).toBe('true');
    });

    it('opens the draft for review when something needs fixing', async () => {
      const issues = [{ fieldname: 'cookTime', code: 'too_small' }];
      respond({ issues });
      const onImport = jest.fn();
      render(<ImportRecipe onImport={onImport} />);

      await skipReview();
      await userEvent.type(screen.getByLabelText('Recipe web address'), 'https://a.com/x{Enter}');

      await waitFor(() =>
        expect(onImport).toHaveBeenCalledWith({ draft, issues }, { triedToSkip: true })
      );
    });

    it('says what the panel does while it is on', async () => {
      render(<ImportRecipe onImport={jest.fn()} />);
      await skipReview();
      expect(screen.getByText(/one after another/)).toBeVisible();
    });
  });

  it('can be cancelled while it reads the recipe', async () => {
    post.mockImplementation(
      (_url, _body, { signal }) =>
        new Promise((_, reject) => signal.addEventListener('abort', () => reject(new Error())))
    );
    const onImport = jest.fn();
    render(<ImportRecipe onImport={onImport} />);

    await userEvent.type(screen.getByLabelText('Recipe web address'), 'https://a.com/x{Enter}');
    expect(screen.getByRole('status')).toHaveTextContent('This can take up to a minute');

    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(onImport).not.toHaveBeenCalled();
  });
});
