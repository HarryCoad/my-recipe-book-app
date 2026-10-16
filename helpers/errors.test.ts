import { AxiosError, AxiosHeaders, AxiosResponse } from 'axios';
import { getErrorCode, getErrorMessage, getFieldErrors, getMessageForCode } from '@/helpers/errors';

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

describe('getFieldErrors', () => {
  it("maps a Validation_Error's fields to form paths and friendly text", () => {
    const err = apiError(400, {
      status: 0,
      message: 'Validation_Error',
      errors: [
        { fieldname: 'ingredients.[0].unit', code: 'invalid_enum_value' },
        { fieldname: 'steps.[2]', code: 'too_small' },
        { fieldname: 'title', code: 'something_new' },
      ],
    });
    expect(getFieldErrors(err)).toEqual({
      'ingredients[0].unit': 'Please choose one of the options.',
      'steps[2]': 'This is missing or too small.',
      title: 'Some of the details entered are invalid.',
    });
  });

  it('returns nothing for other errors', () => {
    expect(getFieldErrors(apiError(401, { status: 0, message: 'INVALID_CREDENTIALS' }))).toEqual(
      {}
    );
    expect(getFieldErrors(new Error('boom'))).toEqual({});
  });
});
