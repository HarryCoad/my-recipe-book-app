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

// From the API's constants/recipeConstants.ts
export const RECIPE_CATEGORIES = [
  'Starter',
  'Small Plate',
  'Sharer',
  'Main',
  'Dessert',
  'Breakfast',
  'Lunch',
  'Cocktail',
  'Baking',
] as const;
export type RecipeCategory = (typeof RECIPE_CATEGORIES)[number];

export const UNITS = [
  'g',
  'kg',
  'tsp',
  'tbsp',
  'ml',
  'liter',
  'pieces',
  'cloves',
  'small',
  'medium',
  'large',
] as const;
export type Unit = (typeof UNITS)[number];

// POST /recipes/create. Optional fields fall back to the API's defaults
export type CreateRecipeBody = {
  title: string;
  description: string;
  category: RecipeCategory;
  serves: number;
  prepTime: number;
  cookTime: number;
  ingredients: { quantity: number; unit: Unit; name: string; subheader?: string | null }[];
  steps: string[];
  tags?: string[];
  bPrivate?: boolean;
  bAllowSuggestions?: boolean;
};

export type CreateRecipeResponse = APIResponse<{ recipe: Recipe }>;

// GET /recipes/tags: existing tags for autocomplete, most used first
export type TagSuggestion = { tag: string; count: number };
export type TagSuggestionsResponse = APIResponse<{ tags: TagSuggestion[] }>;
