import { AxiosError, AxiosHeaders, AxiosResponse } from 'axios';
import axios from '@/helpers/axios';
import { getSession, serverGet } from '@/helpers/serverApi';

let cookieValue: string | undefined;
jest.mock('next/headers', () => ({
  cookies: async () => ({
    get: (name: string) =>
      name === 'authToken' && cookieValue ? { value: cookieValue } : undefined,
  }),
}));
// Like the real redirect(), stops execution by throwing
jest.mock('next/navigation', () => ({
  redirect: jest.fn((url: string) => {
    throw new Error(`REDIRECT ${url}`);
  }),
}));
jest.mock('@/helpers/axios', () => ({
  __esModule: true,
  ...jest.requireActual('@/helpers/axios'),
  default: { get: jest.fn() },
}));
const get = axios.get as jest.Mock;

const token = `header.${btoa(JSON.stringify({ id: 'user-1' }))}.signature`;

const apiError = (status: number, message: string) =>
  new AxiosError('Request failed', 'ERR_BAD_REQUEST', undefined, undefined, {
    status,
    data: { status: 0, message },
    statusText: '',
    headers: {},
    config: { headers: new AxiosHeaders() },
  } as AxiosResponse);

describe('server API helpers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    cookieValue = token;
  });

  it('reads the user id from the token cookie', async () => {
    await expect(getSession()).resolves.toEqual({ token, userId: 'user-1' });
  });

  it('logs out when there is no usable token', async () => {
    cookieValue = undefined;
    await expect(getSession()).rejects.toThrow('REDIRECT /logout');

    cookieValue = 'not-a-jwt';
    await expect(getSession()).rejects.toThrow('REDIRECT /logout');
  });

  it('sends the token as a header and returns the response body', async () => {
    get.mockResolvedValue({ data: { status: 1, data: [] } });

    await expect(serverGet('/recipes', { params: { page: 2 } })).resolves.toEqual({
      status: 1,
      data: [],
    });
    expect(get).toHaveBeenCalledWith('/recipes', {
      params: { page: 2 },
      headers: { Authorization: `Bearer ${token}` },
    });
  });

  it('logs out when the API says the session has ended', async () => {
    get.mockRejectedValue(apiError(401, 'Token expired'));
    await expect(serverGet('/recipes')).rejects.toThrow('REDIRECT /logout');
  });

  it('rethrows other errors for the error boundary', async () => {
    const err = apiError(400, 'INVALID_ID');
    get.mockRejectedValue(err);
    await expect(serverGet('/recipes')).rejects.toBe(err);
  });
});
