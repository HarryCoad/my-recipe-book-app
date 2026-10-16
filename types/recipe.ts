import { APIResponse } from '@/helpers/axios';

export interface Recipe {
  id: string;
  // Both are null when the author deleted the recipe but others still have it saved
  authorId: string | null;
  authorName: string | null;
  authorType?: string;
  bPrivate: boolean;
  bAllowSuggestions: boolean;
  title: string;
  description: string;
  category: string;
  serves: number;
  prepTime: number;
  cookTime: number;
  ingredients: Ingredient[];
  steps: string[];
  tags: string[];
  bSaved: boolean;
  savedCount: number;
  bDeleted: boolean;
}

// GET /recipes/search: `data` is the list itself, not `data.recipes`
export type RecipeSearchResponse = APIResponse<Recipe[]> & {
  results: number;
  totalPages: number;
  currentPage: number;
};

export interface Ingredient {
  id: string;
  subheader: string | null;
  quantity: number;
  name: string;
  unit: string;
}
