// lib/axios.ts
import axios, { AxiosResponse } from 'axios';
import { clearAuth, getToken } from '@/helpers/auth';
import { Routes } from '@/helpers/constants';

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

// What the API's `protect` middleware sends when the token is no longer usable. Other 401s, such
// as INVALID_CREDENTIALS or INVALID_FIELDNAME, don't mean the session has ended.
const SESSION_ENDED_MESSAGES = [
  'Invalid token',
  'Token expired',
  'Password recently changed!',
  'User no longer exists',
];

axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error.response?.data?.message;
    if (getToken() && SESSION_ENDED_MESSAGES.includes(message)) {
      clearAuth();
      const redirect = encodeURIComponent(window.location.pathname + window.location.search);
      window.location.assign(`${Routes.LOGIN}?redirect=${redirect}`);
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;
