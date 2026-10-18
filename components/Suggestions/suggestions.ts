import { diffLines } from '@/helpers/diff';
import { formatIngredient } from '@/helpers/recipes';
import { normaliseTags } from '@/helpers/tags';
import { Edit, Recipe } from '@/types/recipe';

type Content = Pick<Recipe, 'ingredients' | 'steps' | 'tags'>;
type Changes = Pick<Edit, 'ingredients' | 'steps' | 'tags'>;

// Headings become their own lines, so a moved or renamed heading shows in the diff
export const HEADING_PREFIX = '# ';

export const ingredientLines = (ingredients: Changes['ingredients']) => {
  const lines: string[] = [];
  let current: string | null = null;
  for (const ingredient of ingredients) {
    const heading = ingredient.subheader?.trim() || null;
    if (heading && heading !== current) {
      lines.push(`${HEADING_PREFIX}${heading}`);
    }
    current = heading;
    lines.push(formatIngredient(ingredient));
  }
  return lines;
};

// Which parts a suggestion changes. Empty ingredients or steps, and missing tags, mean unchanged
export const changedParts = (edit: Changes) =>
  [
    edit.ingredients.length > 0 && 'ingredients',
    edit.steps.length > 0 && 'method',
    edit.tags !== undefined && 'tags',
  ].filter((part): part is string => !!part);

// "ingredients, method and tags"
export const describeParts = (parts: string[]) =>
  parts.length > 1 ? `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}` : parts[0];

// What accepting the suggestion would change in the recipe as it is now. Parts the suggestion
// doesn't touch are left out
export const suggestionDiff = (recipe: Content, edit: Changes) => {
  const recipeTags = normaliseTags(recipe.tags);
  return {
    ingredients:
      edit.ingredients.length > 0
        ? diffLines(ingredientLines(recipe.ingredients), ingredientLines(edit.ingredients))
        : null,
    steps: edit.steps.length > 0 ? diffLines(recipe.steps, edit.steps) : null,
    tags:
      edit.tags !== undefined
        ? {
            kept: recipeTags.filter((tag) => edit.tags!.includes(tag)),
            removed: recipeTags.filter((tag) => !edit.tags!.includes(tag)),
            added: edit.tags.filter((tag) => !recipeTags.includes(tag)),
          }
        : null,
  };
};
