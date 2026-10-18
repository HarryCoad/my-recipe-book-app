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
  // Optional, so null when the recipe has none
  description: string | null;
  category: string;
  serves: number;
  // 0 or null when there's no prep, such as a salad
  prepTime: number | null;
  cookTime: number;
  ingredients: Ingredient[];
  steps: string[];
  tags: string[];
  // Where an imported recipe came from, shown as attribution. Older recipes may not have it
  sourceUrl?: string | null;
  bSaved: boolean;
  savedCount: number;
  bDeleted: boolean;
}

// A recipe in search results. pendingSuggestions is how many suggestions are waiting for the
// author to review, and is always 0 on other people's recipes
export type RecipeSearchResult = Recipe & { pendingSuggestions: number };

// GET /recipes/search: `data` is the list itself, not `data.recipes`
export type RecipeSearchResponse = APIResponse<RecipeSearchResult[]> & {
  results: number;
  totalPages: number;
  currentPage: number;
};

// quantity and unit are both null when there's no amount ("salt, to taste"). A quantity with no
// unit is a count ("2 eggs")
export interface Ingredient {
  id: string;
  subheader: string | null;
  quantity: number | null;
  name: string;
  unit: string | null;
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
  'cup',
  'fl oz',
  'oz',
  'lb',
  'pinch',
  'dash',
  'can',
  'bunch',
  'slice',
] as const;
export type Unit = (typeof UNITS)[number];

// POST /recipes/create. Optional fields fall back to the API's defaults
export type CreateRecipeBody = {
  title: string;
  // Optional. Empty is stored as null, and clears it when updating a recipe
  description?: string;
  category: RecipeCategory;
  serves: number;
  // Optional: 0 or null means no prep
  prepTime?: number | null;
  cookTime: number;
  ingredients: {
    quantity: number | null;
    unit: Unit | null;
    name: string;
    subheader?: string | null;
  }[];
  steps: string[];
  tags?: string[];
  bPrivate?: boolean;
  bAllowSuggestions?: boolean;
  // Where an imported recipe came from. Must be an http(s) URL
  sourceUrl?: string | null;
  // From a photo import's draft, so the photos are recognised if imported again. Create only:
  // update-own-recipe refuses it
  sourceImageHash?: string | null;
};

export type CreateRecipeResponse = APIResponse<{ recipe: Recipe }>;

// POST /recipes/import-url and /import-image. A recipe read from a web page or photo, for the
// user to check in the create form. Nothing is saved. It can break the create rules: gaps come
// back as 0 or null, and anything the API couldn't map to our categories and units is left as
// the source had it. `issues` lists those fields, in the same format as a Validation_Error
export type ImportDraft = {
  title: string;
  description: string | null;
  category: string;
  serves: number;
  // 0 when the source gave none
  prepTime: number;
  cookTime: number;
  ingredients: {
    subheader: string | null;
    quantity: number | null;
    unit: string | null;
    name: string;
  }[];
  steps: string[];
  tags: string[];
  bPrivate: boolean;
  // The page it came from, after redirects. Null for a photo
  sourceUrl: string | null;
  // Identifies a photo import's images, so importing them again is spotted as a duplicate. Send
  // it back unchanged when creating the recipe from the draft. Never shown
  sourceImageHash?: string | null;
};
export type ImportResult = {
  // Null when it's a duplicate
  draft: ImportDraft | null;
  issues: { fieldname: string; code: string }[];
  // With bSkipReview, the recipe created straight away. Null otherwise, including when the
  // draft had issues, so it came back for review instead
  recipe: Recipe | null;
  // The recipe already in the user's book from the same page or photos. Nothing was read or
  // created. Send bAllowDuplicate to import it anyway
  duplicateOf: { id: string; title: string } | null;
};
export type ImportResponse = APIResponse<ImportResult>;

// PATCH /recipes/update-own-recipe: author only. Fields left out stay as they are
export type UpdateOwnRecipeBody = { id: string } & Partial<CreateRecipeBody>;
export type UpdateOwnRecipeResponse = APIResponse<{ recipe: Recipe }>;

// POST /recipes/delete: author only. Responds with `data: null`
export type DeleteRecipeBody = { id: string };

// A personal edit or a suggestion. Parts that weren't changed are left as they are: empty
// ingredients or steps, and missing tags ([] means every tag was removed)
export type EditStatus = 'pending' | 'accepted' | 'rejected';
export interface Edit {
  id: string;
  recipeId: string;
  userId: string;
  // Who made it. Null if their account was deleted
  userName: string | null;
  isSuggestion: boolean;
  ingredients: Omit<Ingredient, 'id'>[];
  steps: string[];
  tags?: string[];
  comments?: string;
  status: EditStatus;
}

// POST /recipes/edit-recipe, as a suggestion. Leave out the parts that weren't changed
export type SuggestChangesBody = {
  id: string;
  isSuggestion: true;
  ingredients?: CreateRecipeBody['ingredients'];
  steps?: string[];
  tags?: string[];
  comments?: string;
};

// GET /recipes/view-suggestions/:id: author only, newest first
export type ViewSuggestionsResponse = APIResponse<{ edits: Edit[] }>;

// POST /recipes/review-suggestion: author only
export type ReviewSuggestionBody = { id: string; bAccept: boolean };

// GET /recipes/my-suggestions: newest first. The recipe is null if it was deleted
export type MySuggestion = Omit<Edit, 'recipeId'> & {
  recipeId: { id: string; title: string } | null;
};
export type MySuggestionsResponse = APIResponse<{ suggestions: MySuggestion[] }> & {
  results: number;
};

// POST /recipes/toggle-save. Responds with `data: null`. Unsaving a recipe the user has a personal
// edit on fails with CONFIRM_LOSE_EDITS until it's resent with bConfirmLoseEdits
export type ToggleSaveBody = { id: string; bSave: boolean; bConfirmLoseEdits?: boolean };

// GET /recipes/tags: existing tags for autocomplete, most used first
export type TagSuggestion = { tag: string; count: number };
export type TagSuggestionsResponse = APIResponse<{ tags: TagSuggestion[] }>;

// GET /recipes/:id. bHasEdits is true when the user has a personal edit, which the recipe
// already includes unless ?original=true was asked for
export type RecipeResponse = APIResponse<{ recipe: Recipe; bHasEdits: boolean }>;
