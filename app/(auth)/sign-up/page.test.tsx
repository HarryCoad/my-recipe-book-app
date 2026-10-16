import { AxiosError, AxiosHeaders, AxiosResponse } from 'axios';
import { getCurrentUser, getToken } from '@/helpers/auth';
import axios from '@/helpers/axios';
import { render, screen, userEvent, waitFor } from '@/test-utils';
import SignUp from './page';

const replace = jest.fn();
jest.mock('next/navigation', () => ({ useRouter: () => ({ replace }) }));
jest.mock('@/helpers/axios', () => ({
  __esModule: true,
  ...jest.requireActual('@/helpers/axios'),
  default: { post: jest.fn() },
}));
const post = axios.post as jest.Mock;

const user = { id: 'u1', username: 'alice', email: 'alice@example.com', photo: 'default.jpg' };

const fillForm = async (overrides: Partial<Record<string, string>> = {}) => {
  const values = {
    Username: '  alice ',
    Email: 'alice@example.com',
    Password: 'password123',
    'Confirm password': 'password123',
    ...overrides,
  };
  for (const [label, value] of Object.entries(values)) {
    if (value) {
      await userEvent.type(screen.getByLabelText(label), value);
    }
  }
  await userEvent.click(screen.getByRole('button', { name: 'Sign up' }));
};

const apiError = (message: string) =>
  new AxiosError('Request failed', 'ERR_BAD_REQUEST', undefined, undefined, {
    status: 400,
    data: { status: 0, message },
    statusText: '',
    headers: {},
    config: { headers: new AxiosHeaders() },
  } as AxiosResponse);

describe('Sign up page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    document.cookie = 'authToken=; Max-Age=0; Path=/';
    localStorage.clear();
  });

  it('checks the fields before calling the API', async () => {
    render(<SignUp />);
    await fillForm({ Username: 'al', Password: 'short', 'Confirm password': 'different' });

    expect(await screen.findByText('Username must be at least 4 characters long')).toBeVisible();
    expect(screen.getByText('Password must be at least 8 characters long')).toBeVisible();
    expect(screen.getByText('Passwords do not match')).toBeVisible();
    expect(post).not.toHaveBeenCalled();
  });

  it('signs up, stores the session and goes to the dashboard', async () => {
    post.mockResolvedValue({ data: { status: 1, token: 'jwt-token', data: { user } } });
    render(<SignUp />);
    await fillForm();

    await waitFor(() => expect(replace).toHaveBeenCalledWith('/'));
    expect(post).toHaveBeenCalledWith('/api/v1/users/signup', {
      username: 'alice',
      email: 'alice@example.com',
      password: 'password123',
      passwordConfirm: 'password123',
    });
    expect(getToken()).toBe('jwt-token');
    expect(getCurrentUser()).toEqual(user);
  });

  it('shows a taken username next to the username field', async () => {
    post.mockRejectedValue(apiError('USERNAME_TAKEN'));
    render(<SignUp />);
    await fillForm();

    expect(await screen.findByText('That username is already taken.')).toBeVisible();
    expect(screen.getByLabelText('Username')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows other errors in an alert', async () => {
    post.mockRejectedValue(new AxiosError('Network Error', 'ERR_NETWORK'));
    render(<SignUp />);
    await fillForm();

    expect(await screen.findByRole('alert')).toHaveTextContent(/reach the server/);
    expect(replace).not.toHaveBeenCalled();
  });
});
