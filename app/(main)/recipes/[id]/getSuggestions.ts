import 'server-only';

import { endpoints } from '@/helpers/endpoints';
import { serverGet } from '@/helpers/serverApi';
import { ViewSuggestionsResponse } from '@/types/recipe';

// The suggestions for a recipe the user wrote, newest first. Only pending ones unless `all`
export const getSuggestions = async (id: string, { all = false } = {}) => {
  const res = await serverGet<ViewSuggestionsResponse>(endpoints.recipes.viewSuggestions(id), {
    params: all ? { bShowAll: true } : undefined,
  });
  return res.data.edits;
};
