import 'server-only';

import { cache } from 'react';
import { notFound } from 'next/navigation';
import { isAxiosError } from 'axios';
import { endpoints } from '@/helpers/endpoints';
import { serverGet } from '@/helpers/serverApi';
import { RecipeResponse } from '@/types/recipe';

// Cached for the request, so generateMetadata and the page share one API call
export const getRecipe = cache(async (id: string, original = false) => {
  try {
    const res = await serverGet<RecipeResponse>(endpoints.recipes.view(id), {
      params: original ? { original: true } : undefined,
    });
    return res.data;
  } catch (err) {
    // 404 when it doesn't exist or isn't visible to this user, 400 when the id is malformed
    const status = isAxiosError(err) ? err.response?.status : undefined;
    if (status === 404 || status === 400) {
      notFound();
    }
    throw err;
  }
});
