import { AxiosError, AxiosHeaders, AxiosResponse } from 'axios';
import { getErrorCode, getErrorMessage, getMessageForCode } from '@/helpers/errors';

const apiError = (status: number, data: unknown) =>
  new AxiosError('Request failed', 'ERR_BAD_REQUEST', undefined, undefined, {
    status,
    data,
    statusText: '',
    headers: {},
    config: { headers: new AxiosHeaders() },
  } as AxiosResponse);

describe('error helpers', () => {
  it('maps an API error code to friendly text', () => {
    const err = apiError(401, { status: 0, message: 'INVALID_CREDENTIALS' });
    expect(getErrorCode(err)).toBe('INVALID_CREDENTIALS');
    expect(getErrorMessage(err)).toBe('Incorrect email or password.');
  });

  it('falls back to a generic message for unknown codes and plain-English messages', () => {
    expect(getMessageForCode('Invalid token')).toBe('Something went wrong. Please try again.');
    expect(getMessageForCode(undefined)).toBe('Something went wrong. Please try again.');
    expect(getErrorMessage(new Error('boom'))).toBe('Something went wrong. Please try again.');
  });

  it('explains network failures and rate limiting', () => {
    expect(getErrorMessage(new AxiosError('Network Error', 'ERR_NETWORK'))).toMatch(
      /reach the server/
    );
    expect(getErrorMessage(apiError(429, 'Too many requests'))).toMatch(/Too many requests/);
  });

  it('returns no code for errors that did not come from the API', () => {
    expect(getErrorCode(new Error('boom'))).toBeNull();
  });
});
