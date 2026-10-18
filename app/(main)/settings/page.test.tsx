import { serverGet } from '@/helpers/serverApi';
import { render, screen } from '@/test-utils';
import SettingsPage from './page';

jest.mock('@/helpers/serverApi', () => ({ serverGet: jest.fn() }));
const get = serverGet as jest.Mock;

describe('Settings page', () => {
  it("shows the user's privacy setting, from their saved details", async () => {
    get.mockResolvedValue({
      status: 1,
      data: { id: 'me', username: 'harry', email: 'h@example.com', photo: '', bPrivateSaves: true },
    });
    render(await SettingsPage());

    expect(get).toHaveBeenCalledWith('/api/v1/users/user-details');
    expect(screen.getByRole('switch', { name: /Keep my saved recipes private/ })).toBeChecked();
    expect(screen.getByRole('link', { name: 'harry' })).toHaveAttribute('href', '/users/me');
  });
});
