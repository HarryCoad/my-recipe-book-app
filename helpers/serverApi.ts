import 'server-only';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { AxiosRequestConfig } from 'axios';
import { getUserIdFromToken, TOKEN_COOKIE } from '@/helpers/auth';
import axios from '@/helpers/axios';
import { Routes } from '@/helpers/constants';
import { isSessionEnded } from '@/helpers/errors';

// The current session, read from the token cookie. middleware.ts only lets logged-in users reach
// server-rendered pages, so a missing or unreadable token means something is wrong with it.
export const getSession = async () => {
  const token = (await cookies()).get(TOKEN_COOKIE)?.value;
  const userId = token ? getUserIdFromToken(token) : null;
  if (!token || !userId) {
    redirect(Routes.LOGOUT);
  }
  return { token, userId };
};

// GET from the API as the current user, for server components. Uses the shared axios instance,
// passing the token itself because the browser's request interceptor can't see cookies here.
export const serverGet = async <T>(url: string, config: AxiosRequestConfig = {}) => {
  const { token } = await getSession();
  const res = await axios
    .get<T>(url, { ...config, headers: { ...config.headers, Authorization: `Bearer ${token}` } })
    .catch((err) => {
      if (isSessionEnded(err)) {
        return null;
      }
      throw err;
    });
  // redirect() works by throwing, so it's kept out of the catch above
  if (!res) {
    redirect(Routes.LOGOUT);
  }
  return res.data;
};
