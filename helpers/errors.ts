import { isAxiosError } from 'axios';
// Type-only, because axios.ts imports this file
import type { APIError } from '@/helpers/axios';

// Friendly text for the API's error codes (see ../my-recipe-book/docs/API.md#error-codes)
export const errorMessages: Record<string, string> = {
  REQUIRED: 'Please fill in all the required fields.',
  CONFIRM: 'Please confirm your password.',
  INVALID: 'Some of the details entered are invalid.',
  INVALID_ID: "This recipe doesn't exist or you don't have access to it.",
  INVALID_FIELDNAME: "The request contained a field that isn't allowed.",
  INVALID_RECIPE: "This recipe doesn't exist or can't be used this way.",
  INVALID_OPTIONS: "One of the values chosen isn't an allowed option.",
  NO_SUGGESTIONS: "This recipe's author isn't accepting suggestions.",
  USE_UPDATE_OWN_RECIPE_ENDPOINT: 'You are the author, so edit the recipe directly.',
  USER_DOESNT_OWN_RECIPE: 'Only the author of this recipe can do that.',
  CONFIRM_LOSE_EDITS: 'Unsaving this recipe will delete your personal edits.',
  AUTHOR_CANT_UNSAVE: "You can't unsave a recipe you wrote. Delete it instead.",
  SAVES_PRIVATE: "This user's saved recipes are private.",
  SUGGESTION_ALREADY_REVIEWED: 'This suggestion has already been reviewed.',
  USERNAME_TAKEN: 'That username is already taken.',
  UNIQUE_EMAIL: 'An account with that email already exists.',
  MISSING_EMAIL_PASSWORD: 'Please enter your email and password.',
  INVALID_CREDENTIALS: 'Incorrect email or password.',
  INVALID_CURRENT_PASSWORD: 'Your current password is incorrect.',
  MISSING_FIELDS: 'Please fill in all the required fields.',
  Validation_Error: 'Some of the details entered are invalid.',
};

const DEFAULT_MESSAGE = 'Something went wrong. Please try again.';

// Unknown codes (and the API's older plain-English messages) fall back to a generic message
export const getMessageForCode = (code?: string | null) =>
  (code && errorMessages[code]) || DEFAULT_MESSAGE;

// The API's error body, or null when the error didn't come from the API (e.g. network failure)
export const getAPIError = (err: unknown): APIError | null => {
  if (isAxiosError<APIError>(err) && err.response?.data?.status === 0) {
    return err.response.data;
  }
  return null;
};

export const getErrorCode = (err: unknown) => getAPIError(err)?.message ?? null;

export const getErrorMessage = (err: unknown): string => {
  if (isAxiosError(err)) {
    if (!err.response) {
      return "Couldn't reach the server. Please check your connection.";
    }
    if (err.response.status === 429) {
      return 'Too many requests. Please wait a while and try again.';
    }
  }
  return getMessageForCode(getErrorCode(err));
};

// What the API's `protect` middleware sends when the token is no longer usable. Other 401s, such
// as INVALID_CREDENTIALS or INVALID_FIELDNAME, don't mean the session has ended.
const SESSION_ENDED_MESSAGES = [
  'Invalid token',
  'Token expired',
  'Password recently changed!',
  'User no longer exists',
];

export const isSessionEnded = (err: unknown) => {
  const code = getErrorCode(err);
  return !!code && SESSION_ENDED_MESSAGES.includes(code);
};

// Friendly text for the codes in a Validation_Error's `errors` list (these are Zod issue codes)
const fieldErrorMessages: Record<string, string> = {
  too_small: 'This is missing or too small.',
  too_big: 'This is too long or too large.',
  invalid_type: 'Please enter a valid value.',
  invalid_enum_value: 'Please choose one of the options.',
};

// A Validation_Error's field errors, keyed by form path. The API writes array indexes as
// `ingredients.[0].unit`, which becomes `ingredients[0].unit` for Formik's setFieldError.
export const getFieldErrors = (err: unknown): Record<string, string> => {
  const apiError = getAPIError(err);
  if (apiError?.message !== 'Validation_Error') {
    return {};
  }
  return Object.fromEntries(
    (apiError.errors ?? []).map(({ fieldname, code }) => [
      fieldname.replace(/\.\[(\d+)\]/g, '[$1]'),
      fieldErrorMessages[code] ?? errorMessages.INVALID,
    ])
  );
};
