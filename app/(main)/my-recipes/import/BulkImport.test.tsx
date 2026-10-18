import { AxiosError, AxiosHeaders, AxiosResponse } from 'axios';
import { notifications } from '@mantine/notifications';
import axios from '@/helpers/axios';
import { render, screen, userEvent, waitFor, within } from '@/test-utils';
import { ImportDraft, ImportResult } from '@/types/recipe';
import { BulkImport } from './BulkImport';

jest.mock('@/helpers/axios', () => ({
  __esModule: true,
  ...jest.requireActual('@/helpers/axios'),
  default: { post: jest.fn(), get: jest.fn() },
}));
const post = axios.post as jest.Mock;
// Tag suggestions in the review form
const get = axios.get as jest.Mock;
jest.mock('@mantine/notifications', () => ({ notifications: { show: jest.fn() } }));
jest.mock('next/navigation', () => ({ useRouter: () => ({ replace: jest.fn() }) }));

const nothing: ImportResult = { draft: null, issues: [], recipe: null, duplicateOf: null };
const added = (id: string, title: string) => ({
  data: { status: 1, data: { ...nothing, recipe: { id, title } } },
});

const photo = (name: string) => new File(['x'], name, { type: 'image/jpeg' });
const fileInput = () => document.querySelector('input[type="file"]') as HTMLInputElement;
const linksBox = () => screen.getByRole('textbox', { name: /Recipe web addresses/ });
const progressList = () =>
  screen
    .getByRole('heading', { name: 'Import progress' })
    .closest('div[class*="Paper"]') as HTMLElement;

const pasteLinks = async (text: string) => {
  await userEvent.click(screen.getByRole('tab', { name: /Links/ }));
  await userEvent.click(linksBox());
  await userEvent.paste(text);
};

describe('Bulk import', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    get.mockResolvedValue({ data: { status: 1, data: { tags: [] } } });
  });

  it('imports pasted links, leaving out blanks, repeats and lines that are not addresses', async () => {
    post.mockResolvedValueOnce(added('r1', 'Soup')).mockResolvedValueOnce(added('r2', 'Pie'));
    render(<BulkImport />);

    await pasteLinks('https://a.com/soup\n\n  https://a.com/soup\nb.com/pie\nnot a link');
    expect(screen.getByText(/be left out: not a link/)).toBeVisible();
    await userEvent.click(screen.getByRole('button', { name: 'Import 2 recipes' }));

    expect(await screen.findByRole('link', { name: 'Soup' })).toHaveAttribute(
      'href',
      '/recipes/r1'
    );
    expect(await screen.findByRole('link', { name: 'Pie' })).toHaveAttribute('target', '_blank');
    expect(screen.getByRole('status')).toHaveTextContent('2 of 2');
    expect(post).toHaveBeenCalledWith(
      '/api/v1/recipes/import-url',
      { url: 'https://a.com/soup', bSkipReview: true },
      expect.anything()
    );
    expect(post).toHaveBeenCalledWith(
      '/api/v1/recipes/import-url',
      { url: 'https://b.com/pie', bSkipReview: true },
      expect.anything()
    );
    // Ready for more
    expect(linksBox()).toHaveValue('');
  });

  it('imports each photo as its own recipe, unless combined with the one before', async () => {
    post.mockResolvedValue(added('r1', 'Curry'));
    render(<BulkImport />);

    const pages = [photo('curry-1.jpg'), photo('curry-2.jpg'), photo('cake.jpg')];
    await userEvent.upload(fileInput(), pages);
    expect(screen.getByRole('button', { name: 'Import 3 recipes' })).toBeVisible();

    const secondPage = screen.getByText('curry-2.jpg').closest('li') as HTMLElement;
    await userEvent.click(
      within(secondPage).getByRole('checkbox', { name: 'Same recipe as above' })
    );
    expect(within(secondPage).getByText('Recipe 1')).toBeVisible();
    await userEvent.click(screen.getByRole('button', { name: 'Import 2 recipes' }));

    await waitFor(() => expect(post).toHaveBeenCalledTimes(2));
    const forms = post.mock.calls.map(([, form]) => form as FormData);
    expect(forms[0].getAll('image')).toEqual([pages[0], pages[1]]);
    expect(forms[0].get('bSkipReview')).toBe('true');
    expect(forms[1].getAll('image')).toEqual([pages[2]]);
  });

  it('leaves out photos the API would refuse', async () => {
    render(<BulkImport />);
    // The file picker's accept list is only a hint: people can still choose "All files"
    await userEvent
      .setup({ applyAccept: false })
      .upload(fileInput(), [photo('a.jpg'), new File(['x'], 'b.heic', { type: 'image/heic' })]);

    const refused = screen.getByText('b.heic').closest('li') as HTMLElement;
    expect(within(refused).getByText('Skipped')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Import 1 recipe' })).toBeVisible();
  });

  describe('drafts that need review', () => {
    const sourceImageHash = 'f'.repeat(64);
    const draft: ImportDraft = {
      title: 'Lentil soup',
      description: null,
      category: 'Main',
      serves: 4,
      prepTime: 10,
      cookTime: 0,
      ingredients: [{ subheader: null, quantity: 200, unit: 'g', name: 'lentils' }],
      steps: ['Simmer'],
      tags: [],
      bPrivate: true,
      sourceUrl: null,
      sourceImageHash,
    };
    const needsReview = () =>
      post.mockResolvedValueOnce({
        data: {
          status: 1,
          data: { ...nothing, draft, issues: [{ fieldname: 'cookTime', code: 'too_small' }] },
        },
      });

    const importOnePhoto = async () => {
      render(<BulkImport />);
      await userEvent.upload(fileInput(), [photo('soup.jpg')]);
      await userEvent.click(screen.getByRole('button', { name: 'Import 1 recipe' }));
      await screen.findByRole('heading', { name: 'Waiting for your review (1)' });
    };

    it('opens one in the create form and saves it with its image hash', async () => {
      needsReview();
      await importOnePhoto();

      await userEvent.click(screen.getAllByRole('button', { name: 'Review' })[0]);
      expect(screen.getByLabelText(/^Title/)).toHaveValue('Lentil soup');
      expect(await screen.findByText('Please enter the cook time')).toBeVisible();

      post.mockResolvedValueOnce({
        data: { status: 1, data: { recipe: { id: 'r7', title: 'Lentil soup' } } },
      });
      await userEvent.type(screen.getByLabelText(/^Cook time/), '30');
      await userEvent.click(screen.getByRole('button', { name: 'Create recipe' }));

      await waitFor(() =>
        expect(post).toHaveBeenLastCalledWith(
          '/api/v1/recipes/create',
          expect.objectContaining({ title: 'Lentil soup', cookTime: 30, sourceImageHash })
        )
      );
      expect(notifications.show).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Created "Lentil soup"' })
      );
      expect(await screen.findByRole('link', { name: 'Lentil soup' })).toHaveAttribute(
        'href',
        '/recipes/r7'
      );
      expect(screen.queryByText(/Waiting for your review/)).not.toBeInTheDocument();
      expect(screen.queryByLabelText(/^Title/)).not.toBeInTheDocument();
    }, 15000);

    it('can be dismissed without saving', async () => {
      needsReview();
      await importOnePhoto();

      await userEvent.click(screen.getAllByRole('button', { name: 'Dismiss' })[0]);

      expect(screen.queryByText(/Waiting for your review/)).not.toBeInTheDocument();
      expect(within(progressList()).getByText('Dismissed')).toBeVisible();
    });
  });

  it('shows recipes already in the book, and imports one anyway when asked', async () => {
    post.mockResolvedValueOnce({
      data: { status: 1, data: { ...nothing, duplicateOf: { id: 'old', title: 'Old soup' } } },
    });
    render(<BulkImport />);
    await pasteLinks('https://a.com/soup');
    await userEvent.click(screen.getByRole('button', { name: 'Import 1 recipe' }));

    expect(await screen.findByText('Already in your book')).toBeVisible();
    expect(screen.getByRole('link', { name: 'Old soup' })).toHaveAttribute('href', '/recipes/old');

    post.mockResolvedValueOnce(added('r2', 'New soup'));
    await userEvent.click(screen.getByRole('button', { name: 'Import anyway' }));

    expect(await screen.findByRole('link', { name: 'New soup' })).toBeVisible();
    expect(post).toHaveBeenLastCalledWith(
      '/api/v1/recipes/import-url',
      { url: 'https://a.com/soup', bSkipReview: true, bAllowDuplicate: true },
      expect.anything()
    );
  });

  it('pauses at the hourly limit, and carries on when resumed', async () => {
    post.mockRejectedValueOnce(
      new AxiosError('Too many', 'ERR_BAD_REQUEST', undefined, undefined, {
        status: 429,
        data: { status: 0, message: 'TOO_MANY_IMPORTS' },
        statusText: '',
        headers: {},
        config: { headers: new AxiosHeaders() },
      } as AxiosResponse)
    );
    render(<BulkImport />);
    await pasteLinks('https://a.com/soup');
    await userEvent.click(screen.getByRole('button', { name: 'Import 1 recipe' }));

    expect(await screen.findByText('Paused at the hourly limit')).toBeVisible();
    expect(within(progressList()).getByText('Waiting')).toBeVisible();
    expect(within(progressList()).queryByText('Failed')).not.toBeInTheDocument();

    post.mockResolvedValueOnce(added('r1', 'Soup'));
    await userEvent.click(screen.getByRole('button', { name: 'Resume' }));

    expect(await screen.findByRole('link', { name: 'Soup' })).toBeVisible();
    expect(screen.queryByText('Paused at the hourly limit')).not.toBeInTheDocument();
  });

  it('asks before leaving while imports are running', async () => {
    post.mockReturnValue(new Promise(() => {}));
    const confirm = jest.spyOn(window, 'confirm').mockReturnValue(false);
    render(
      <>
        <BulkImport />
        <a href="/my-recipes">My Recipes</a>
      </>
    );
    await pasteLinks('https://a.com/soup');
    await userEvent.click(screen.getByRole('button', { name: 'Import 1 recipe' }));

    const leaving = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(leaving);
    expect(leaving.defaultPrevented).toBe(true);

    await userEvent.click(screen.getByRole('link', { name: 'My Recipes' }));
    expect(confirm).toHaveBeenCalledWith(expect.stringContaining('Leave bulk import?'));
    confirm.mockRestore();
  });
});
