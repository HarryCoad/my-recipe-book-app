// lib/axios.ts
import axios, { AxiosResponse } from 'axios';

export type APIResponse<T> = {
  data: T;
  status: 1 | 0;
  message?: string;
};

export const isSuccess = (res: AxiosResponse<APIResponse<any>>) => res.data.status === 1;

const axiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL || 'http://127.0.0.1:8000',
  withCredentials: true, // allows sending cookies (e.g., JWT in httpOnly cookie)
  headers: {
    'Content-Type': 'application/json',
  },
});

// 🔒 You can add interceptors here later, for example:
axiosInstance.interceptors.request.use(
  (config) => {
    // Example: attach Authorization header manually (if not using httpOnly cookies)
    // const token = getCookie('authToken');
    // if (token) config.headers['Authorization'] = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle 401/403 global errors here if needed
    return Promise.reject(error);
  }
);

export default axiosInstance;
