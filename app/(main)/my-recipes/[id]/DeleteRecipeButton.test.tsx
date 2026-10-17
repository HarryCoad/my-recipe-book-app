import { AxiosError, AxiosHeaders, AxiosResponse } from 'axios';
import axios from '@/helpers/axios';
import { render, screen, userEvent, waitFor } from '@/test-utils';
import { DeleteRecipeButton } from './DeleteRecipeButton';

const replace = jest.fn();
jest.mock('next/navigation', () => ({ useRouter: () => ({ replace }) }));
jest.mock('@/helpers/axios', () => ({
  __esModule: true,
  ...jest.requireActual('@/helpers/axios'),
  default: { post: jest.fn() },
}));
const post = axios.post as jest.Mock;

const openDialog = async (savedCount = 1) => {
  render(<DeleteRecipeButton id="r1" title="Spaghetti pomodoro" savedCount={savedCount} />);
  await userEvent.click(screen.getByRole('button', { name: 'Delete recipe' }));
  return screen.findByRole('dialog', { name: 'Delete this recipe?' });
};

describe('Delete recipe button', () => {
  beforeEach(() => jest.clearAllMocks());

  it('asks first, then deletes and goes to My Recipes', async () => {
    post.mockResolvedValue({ data: { status: 1, data: null } });
    const dialog = await openDialog();
    expect(dialog).toHaveTextContent('Nobody else has saved it');
    expect(post).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole('button', { name: 'Delete' }));

    await waitFor(() => expect(replace).toHaveBeenCalledWith('/my-recipes'));
    expect(post).toHaveBeenCalledWith('/api/v1/recipes/delete', { id: 'r1' });
  });

  it('explains that other savers keep their copy', async () => {
    const dialog = await openDialog(3);
    expect(dialog).toHaveTextContent(/2 people have saved it, so they'll keep their copy/);
  });

  it('cancelling deletes nothing', async () => {
    await openDialog();
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(post).not.toHaveBeenCalled();
  });

  it("shows the API's error and stays open", async () => {
    post.mockRejectedValue(
      new AxiosError('Request failed', 'ERR_BAD_REQUEST', undefined, undefined, {
        status: 404,
        data: { status: 0, message: 'INVALID_ID' },
        statusText: '',
        headers: {},
        config: { headers: new AxiosHeaders() },
      } as AxiosResponse)
    );
    await openDialog();
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }));

    expect(await screen.findByRole('alert')).toHaveTextContent("This recipe doesn't exist");
    expect(screen.getByRole('dialog')).toBeVisible();
    expect(replace).not.toHaveBeenCalled();
  });
});
