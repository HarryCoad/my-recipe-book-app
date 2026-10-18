import 'server-only';

import { cache } from 'react';
import { notFound } from 'next/navigation';
import { isAxiosError } from 'axios';
import { endpoints } from '@/helpers/endpoints';
import { serverGet } from '@/helpers/serverApi';
import { UserProfileResponse } from '@/types/user';

// Cached for the request, so generateMetadata and the page share one API call
export const getProfile = cache(async (id: string) => {
  try {
    const res = await serverGet<UserProfileResponse>(endpoints.users.profile(id));
    return res.data.user;
  } catch (err) {
    // INVALID_ID (404) when the ID is malformed, or no active user has it
    if (isAxiosError(err) && err.response?.status === 404) {
      notFound();
    }
    throw err;
  }
});
