import 'server-only';

import { isAxiosError } from 'axios';
import { endpoints } from '@/helpers/endpoints';
import { serverGet } from '@/helpers/serverApi';
import { RecipeSearchResponse } from '@/types/recipe';

type SearchParams = Record<string, string | number | boolean>;

export const searchRecipes = (params: SearchParams) =>
  serverGet<RecipeSearchResponse>(endpoints.recipes.search, { params });

// How many recipes match. Search doesn't send a total, but with one recipe a page, the number of
// pages is the number of recipes
export const countRecipes = async (params: SearchParams) =>
  (await searchRecipes({ ...params, limit: 1 })).totalPages;

// Each dashboard section loads on its own, so one failing doesn't take the page down. Only API
// errors are caught: serverGet ends an expired session by throwing a redirect, which must go on
export const loadSection = async <T>(load: () => Promise<T>): Promise<T | null> => {
  try {
    return await load();
  } catch (err) {
    if (isAxiosError(err)) {
      return null;
    }
    throw err;
  }
};
