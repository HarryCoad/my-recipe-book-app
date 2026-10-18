import { AxiosError, AxiosHeaders, AxiosResponse } from 'axios';
import axios from '@/helpers/axios';
import { render, screen, userEvent, waitFor } from '@/test-utils';
import { ImportDraft } from '@/types/recipe';
import { checkImage, ImportRecipe, toImportUrl } from './ImportRecipe';

jest.mock('@/helpers/axios', () => ({
  __esModule: true,
  ...jest.requireActual('@/helpers/axios'),
  default: { post: jest.fn() },
}));
const post = axios.post as jest.Mock;

const draft = { title: 'Pancakes' } as ImportDraft;
const imported = { data: { status: 1, data: { draft, issues: [] } } };

const apiError = (status: number, message: string) =>
  new AxiosError('Request failed', 'ERR_BAD_REQUEST', undefined, undefined, {
    status,
    data: { status: 0, message },
    statusText: '',
    headers: {},
    config: { headers: new AxiosHeaders() },
  } as AxiosResponse);

const photo = (type = 'image/jpeg', size = 1000) => {
  const file = new File(['x'], 'recipe.jpg', { type });
  Object.defineProperty(file, 'size', { value: size });
  return file;
};

// Mantine's FileInput opens a hidden file input
const fileInput = () => document.querySelector('input[type="file"]') as HTMLInputElement;

describe('Import recipe', () => {
  beforeEach(() => jest.clearAllMocks());

  it('imports from a web address, adding https:// if it was left off', async () => {
    post.mockResolvedValue(imported);
    const onImport = jest.fn();
    render(<ImportRecipe onImport={onImport} />);

    await userEvent.type(
      screen.getByLabelText('Recipe web address'),
      'example.com/pancakes{Enter}'
    );

    await waitFor(() => expect(onImport).toHaveBeenCalledWith({ draft, issues: [] }));
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

  it('imports from a photo, sent as a file upload', async () => {
    post.mockResolvedValue(imported);
    const onImport = jest.fn();
    render(<ImportRecipe initialSource="image" onImport={onImport} />);

    const file = photo();
    await userEvent.upload(fileInput(), file);
    await userEvent.click(screen.getByRole('button', { name: 'Import' }));

    await waitFor(() => expect(onImport).toHaveBeenCalled());
    const [url, body, config] = post.mock.calls[0];
    expect(url).toBe('/api/v1/recipes/import-image');
    expect(body).toBeInstanceOf(FormData);
    expect((body as FormData).get('image')).toBe(file);
    expect(config.headers).toEqual({ 'Content-Type': 'multipart/form-data' });
  });

  it("won't send a photo the API would refuse", async () => {
    render(<ImportRecipe initialSource="image" onImport={jest.fn()} />);

    await userEvent.upload(fileInput(), photo('image/jpeg', 6 * 1024 * 1024));
    expect(screen.getByRole('alert')).toHaveTextContent('too big');

    await userEvent.click(screen.getByRole('button', { name: 'Import' }));
    expect(post).not.toHaveBeenCalled();
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

describe('toImportUrl', () => {
  it.each([
    ['https://example.com/a', 'https://example.com/a'],
    [' example.com/a ', 'https://example.com/a'],
    ['http://example.com', 'http://example.com/'],
    ['', null],
    ['not a url', null],
    ['ftp://example.com/a', null],
    ['localhost', null],
  ])('%p becomes %p', (text, url) => {
    expect(toImportUrl(text)).toBe(url);
  });
});

describe('checkImage', () => {
  it('accepts the formats the API reads, up to 5 MB', () => {
    expect(checkImage(photo('image/png', 5 * 1024 * 1024))).toBeNull();
    expect(checkImage(photo('image/heic'))).toMatch(/JPEG, PNG, GIF or WebP/);
    expect(checkImage(photo('image/webp', 5 * 1024 * 1024 + 1))).toMatch(/too big/);
  });
});
