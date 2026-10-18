import { AxiosError, AxiosHeaders, AxiosResponse } from 'axios';
import { notifications } from '@mantine/notifications';
import axios from '@/helpers/axios';
import { render, screen, userEvent, waitFor } from '@/test-utils';
import { PrivateSavesSwitch } from './PrivateSavesSwitch';

jest.mock('@/helpers/axios', () => ({
  __esModule: true,
  ...jest.requireActual('@/helpers/axios'),
  default: { patch: jest.fn() },
}));
const patch = axios.patch as jest.Mock;
jest.mock('@mantine/notifications', () => ({ notifications: { show: jest.fn() } }));
const showToast = notifications.show as jest.Mock;

const user = { id: 'me', username: 'harry', email: 'h@example.com', photo: '' };
const toggle = () => screen.getByRole('switch', { name: /Keep my saved recipes private/ });

describe('Private saves switch', () => {
  beforeEach(() => jest.clearAllMocks());

  it('shows the saved setting', () => {
    render(<PrivateSavesSwitch bPrivateSaves />);
    expect(toggle()).toBeChecked();
  });

  it.each([
    [false, true, 'Your saved recipes are now private.'],
    [true, false, 'Your saved recipes now show on your profile.'],
  ])('switching from %s saves %s straight away', async (from, to, message) => {
    patch.mockResolvedValue({
      data: { status: 1, data: { user: { ...user, bPrivateSaves: to } } },
    });
    render(<PrivateSavesSwitch bPrivateSaves={from} />);

    await userEvent.click(toggle());

    expect(patch).toHaveBeenCalledWith('/api/v1/users/update-me', { bPrivateSaves: to });
    await waitFor(() =>
      expect(showToast).toHaveBeenCalledWith(expect.objectContaining({ message }))
    );
    expect(toggle()).toHaveProperty('checked', to);
  });

  it('switches back and says why when saving fails', async () => {
    patch.mockRejectedValue(
      new AxiosError('Request failed', 'ERR_BAD_REQUEST', undefined, undefined, {
        status: 400,
        data: { status: 0, message: 'INVALID' },
        statusText: '',
        headers: {},
        config: { headers: new AxiosHeaders() },
      } as AxiosResponse)
    );
    render(<PrivateSavesSwitch bPrivateSaves={false} />);

    await userEvent.click(toggle());

    await waitFor(() =>
      expect(showToast).toHaveBeenCalledWith(expect.objectContaining({ color: 'red' }))
    );
    expect(toggle()).not.toBeChecked();
    expect(toggle()).toBeEnabled();
  });
});
