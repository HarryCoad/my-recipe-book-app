// Type-only, because axios.ts imports this file
import type { APIResponse } from '@/helpers/axios';
import { Routes } from '@/helpers/constants';
import type { User } from '@/types/user';

export type AuthUser = User;

// Returned by login, signup and reset password
export type AuthResponse = APIResponse<{ user: AuthUser }> & { token: string };

// The token is kept in a cookie so middleware.ts can check it before rendering a page. This is
// our own cookie on the UI's domain: the API ignores cookies and only reads the header.
export const TOKEN_COOKIE = 'authToken';
const USER_KEY = 'authUser';
// Matches the API's JWT_EXPIRES_IN
const TOKEN_MAX_AGE = 90 * 24 * 60 * 60;

const isBrowser = () => typeof window !== 'undefined';

export const getToken = () => {
  if (!isBrowser()) {
    return null;
  }
  const cookie = document.cookie.split('; ').find((c) => c.startsWith(`${TOKEN_COOKIE}=`));
  return cookie ? decodeURIComponent(cookie.split('=')[1]) : null;
};

export const getCurrentUser = (): AuthUser | null => {
  const user = isBrowser() ? window.localStorage.getItem(USER_KEY) : null;
  return user ? (JSON.parse(user) as AuthUser) : null;
};

export const setAuth = (token: string, user: AuthUser) => {
  const secure = window.location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${TOKEN_COOKIE}=${encodeURIComponent(token)}; Path=/; Max-Age=${TOKEN_MAX_AGE}; SameSite=Lax${secure}`;
  window.localStorage.setItem(USER_KEY, JSON.stringify(user));
};

export const clearAuth = () => {
  document.cookie = `${TOKEN_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`;
  window.localStorage.removeItem(USER_KEY);
};

// Reads the JWT's payload without verifying it. Only the API can verify the token, so use this
// for routing and for building requests, never to decide what someone is allowed to see.
const decodeToken = (token: string): { id?: unknown; exp?: unknown } | null => {
  try {
    const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(payload));
  } catch {
    return null;
  }
};

export const isTokenExpired = (token: string) => {
  const payload = decodeToken(token);
  return !payload || (typeof payload.exp === 'number' && payload.exp * 1000 < Date.now());
};

// The API signs tokens with { id: <user id> }
export const getUserIdFromToken = (token: string) => {
  const id = decodeToken(token)?.id;
  return typeof id === 'string' ? id : null;
};

// The only pages you can see while logged out
const AUTH_PAGES: string[] = [
  Routes.LOGIN,
  Routes.SIGN_UP,
  Routes.FORGOTTEN_PASSWORD,
  Routes.RESET_PASSWORD,
];

export const isAuthPage = (pathname: string) =>
  AUTH_PAGES.some((page) => pathname === page || pathname.startsWith(`${page}/`));

// Only follow redirects within this site, so ?redirect= can't send users elsewhere.
// Browsers treat "/\" like "//", so backslashes are rejected too.
export const safeRedirect = (path: string | null) =>
  path &&
  path.startsWith('/') &&
  !/^\/[/\\]/.test(path) &&
  !isAuthPage(path) &&
  path !== Routes.LOGOUT
    ? path
    : Routes.HOME;
