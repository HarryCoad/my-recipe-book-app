export interface Recipe {
  id: string;
  authorId: string;
  authorType: 'User' | string;
  bPrivate: boolean;
  bAllowSuggestions: boolean;
  title: string;
  description: string;
  image: string | null;
  category: string;
  serves: number;
  prepTime: number;
  cookTime: number;
  ingredients: Ingredient[];
  steps: string[];
  tags: string[];
  savedBy: string[];
  bDeleted?: boolean;
}

export interface Ingredient {
  id: string;
  subheader: string | null;
  quantity: number;
  name: string;
  unit: string;
}
