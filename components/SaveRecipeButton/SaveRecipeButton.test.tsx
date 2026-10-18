import { AxiosError, AxiosHeaders, AxiosResponse } from 'axios';
import { notifications } from '@mantine/notifications';
import axios from '@/helpers/axios';
import { render, screen, userEvent, waitFor } from '@/test-utils';
import { SaveRecipeButton } from './SaveRecipeButton';

const refresh = jest.fn();
const replace = jest.fn();
jest.mock('next/navigation', () => ({ useRouter: () => ({ refresh, replace }) }));
jest.mock('@/helpers/axios', () => ({
  __esModule: true,
  ...jest.requireActual('@/helpers/axios'),
  default: { post: jest.fn() },
}));
const post = axios.post as jest.Mock;
jest.mock('@mantine/notifications', () => ({ notifications: { show: jest.fn() } }));
const showToast = notifications.show as jest.Mock;

const apiError = (status: number, message: string) =>
  new AxiosError('Request failed', 'ERR_BAD_REQUEST', undefined, undefined, {
    status,
    data: { status: 0, message },
    statusText: '',
    headers: {},
    config: { headers: new AxiosHeaders() },
  } as AxiosResponse);

const ok = { data: { status: 1, data: null } };

describe('Save recipe button', () => {
  beforeEach(() => jest.clearAllMocks());

  it('saves the recipe', async () => {
    post.mockResolvedValue(ok);
    render(<SaveRecipeButton id="r1" title="Pie" bSaved={false} />);

    await userEvent.click(screen.getByRole('button', { name: 'Save recipe' }));

    expect(post).toHaveBeenCalledWith('/api/v1/recipes/toggle-save', { id: 'r1', bSave: true });
    expect(await screen.findByRole('button', { name: 'Unsave recipe' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    expect(showToast).toHaveBeenCalledWith(expect.objectContaining({ message: 'Saved "Pie"' }));
    expect(refresh).toHaveBeenCalled();
  });

  it('unsaves straight away when there are no personal edits', async () => {
    post.mockResolvedValue(ok);
    render(<SaveRecipeButton id="r1" title="Pie" bSaved />);

    await userEvent.click(screen.getByRole('button', { name: 'Unsave recipe' }));

    expect(post).toHaveBeenCalledWith('/api/v1/recipes/toggle-save', { id: 'r1', bSave: false });
    expect(await screen.findByRole('button', { name: 'Save recipe' })).toBeVisible();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('warns about losing personal edits, then unsaves once confirmed', async () => {
    post.mockRejectedValueOnce(apiError(400, 'CONFIRM_LOSE_EDITS')).mockResolvedValueOnce(ok);
    render(<SaveRecipeButton id="r1" title="Pie" bSaved />);

    await userEvent.click(screen.getByRole('button', { name: 'Unsave recipe' }));
    const dialog = await screen.findByRole('dialog', { name: 'Unsave this recipe?' });
    expect(dialog).toHaveTextContent('Unsaving it will delete them');

    await userEvent.click(screen.getByRole('button', { name: 'Unsave' }));

    await waitFor(() =>
      expect(post).toHaveBeenLastCalledWith('/api/v1/recipes/toggle-save', {
        id: 'r1',
        bSave: false,
        bConfirmLoseEdits: true,
      })
    );
    expect(await screen.findByRole('button', { name: 'Save recipe' })).toBeVisible();
  });

  it('keeps the recipe if the warning is dismissed', async () => {
    post.mockRejectedValueOnce(apiError(400, 'CONFIRM_LOSE_EDITS'));
    render(<SaveRecipeButton id="r1" title="Pie" bSaved />);

    await userEvent.click(screen.getByRole('button', { name: 'Unsave recipe' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Keep it' }));

    expect(post).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'Unsave recipe' })).toBeVisible();
  });

  it('asks before unsaving a recipe whose author deleted it, then leaves', async () => {
    post.mockResolvedValue(ok);
    render(<SaveRecipeButton id="r1" title="Pie" bSaved orphaned leaveTo="/recipes" />);

    await userEvent.click(screen.getByRole('button', { name: 'Unsave recipe' }));
    expect(await screen.findByRole('dialog')).toHaveTextContent("won't be able to find it again");
    expect(post).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole('button', { name: 'Unsave' }));

    await waitFor(() => expect(replace).toHaveBeenCalledWith('/recipes'));
    expect(post).toHaveBeenCalledWith('/api/v1/recipes/toggle-save', {
      id: 'r1',
      bSave: false,
      bConfirmLoseEdits: true,
    });
  });

  it('shows other errors as a toast and stays as it was', async () => {
    post.mockRejectedValue(apiError(404, 'INVALID_RECIPE'));
    render(<SaveRecipeButton id="r1" title="Pie" bSaved={false} />);

    await userEvent.click(screen.getByRole('button', { name: 'Save recipe' }));

    await waitFor(() =>
      expect(showToast).toHaveBeenCalledWith(
        expect.objectContaining({ color: 'red', message: expect.stringContaining("doesn't exist") })
      )
    );
    expect(screen.getByRole('button', { name: 'Save recipe' })).toBeVisible();
  });
});
