import axios, { AxiosResponse } from 'axios';
import { clearAuth, getToken } from '@/helpers/auth';
import { Routes } from '@/helpers/constants';
import { isSessionEnded } from '@/helpers/errors';

export type APIResponse<T> = {
  data: T;
  status: 1 | 0;
  message?: string;
};

export type APIError = {
  status: 0;
  message: string;
  // Only sent with a Validation_Error
  errors?: { fieldname: string; code: string }[];
};

export const isSuccess = (res: AxiosResponse<APIResponse<any>>) => res.data.status === 1;

const axiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL || 'http://127.0.0.1:8000',
  headers: {
    'Content-Type': 'application/json',
  },
});

// The API only reads the token from the Authorization header (it ignores the `at` cookie)
axiosInstance.interceptors.request.use(
  (config) => {
    const token = getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// In the browser, an ended session logs the user out. On the server there's no token here (it's
// passed per request by serverApi.ts), so this does nothing and serverApi.ts handles it instead.
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (getToken() && isSessionEnded(error)) {
      clearAuth();
      const redirect = encodeURIComponent(window.location.pathname + window.location.search);
      window.location.assign(`${Routes.LOGIN}?redirect=${redirect}`);
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;
