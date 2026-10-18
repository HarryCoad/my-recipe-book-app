import { Ingredient, Recipe } from '@/types/recipe';

// Only people who saved someone else's recipe can suggest changes, if its author allows it.
// Recipes whose author deleted them have suggestions turned off.
export const canSuggest = (recipe: Recipe, userId: string) =>
  recipe.authorId !== null &&
  recipe.authorId !== userId &&
  recipe.bAllowSuggestions &&
  recipe.bSaved;

export type IngredientGroup = {
  subheader: string | null;
  ingredients: Ingredient[];
};

// Groups ingredients under their headings, in order. A new group starts wherever the subheader
// changes, so ingredients without one stay where they are.
export const groupIngredients = (ingredients: Ingredient[]): IngredientGroup[] =>
  ingredients.reduce<IngredientGroup[]>((groups, ingredient) => {
    const subheader = ingredient.subheader?.trim() || null;
    const last = groups[groups.length - 1];
    if (last && last.subheader === subheader) {
      last.ingredients.push(ingredient);
    } else {
      groups.push({ subheader, ingredients: [ingredient] });
    }
    return groups;
  }, []);

// Units written straight after the number, like "200g"
const ATTACHED_UNITS = ['g', 'kg', 'ml'];

// Weighed or measured precisely, so they keep decimals rather than becoming fractions
const SMALL_METRIC_UNITS = ['g', 'ml'];
const LARGE_METRIC_UNITS = ['kg', 'liter'];

// What spoons and counts round to, as nobody measures 1.2 tsp or 2.37 eggs
const FRACTIONS: [number, string][] = [
  [0, ''],
  [1 / 4, '¼'],
  [1 / 3, '⅓'],
  [1 / 2, '½'],
  [2 / 3, '⅔'],
  [3 / 4, '¾'],
  [1, ''],
];

const trimDecimals = (value: number, places: number) => String(Number(value.toFixed(places)));

// The quantity as a cook would write it. Grams and millilitres are whole from 10 up, kilograms and
// litres keep two decimals, and everything else rounds to the nearest common fraction (never 0).
export const formatQuantity = (quantity: number, unit: string) => {
  if (SMALL_METRIC_UNITS.includes(unit)) {
    return trimDecimals(quantity, quantity >= 10 ? 0 : 1);
  }
  if (LARGE_METRIC_UNITS.includes(unit)) {
    return trimDecimals(quantity, 2);
  }
  let whole = Math.floor(quantity);
  const [fraction, glyph] = FRACTIONS.reduce((best, option) =>
    Math.abs(option[0] - (quantity - whole)) < Math.abs(best[0] - (quantity - whole))
      ? option
      : best
  );
  whole += fraction === 1 ? 1 : 0;
  if (whole === 0 && !glyph) {
    return '¼';
  }
  return `${whole || ''}${glyph}`;
};

// Reads naturally: "200g flour", "2 tbsp oil", "3 eggs" (for pieces), "2 large onions". `scale`
// multiplies the quantity, for cooking more or fewer servings than the recipe is written for.
export const formatIngredient = (
  { quantity, unit, name }: Pick<Ingredient, 'quantity' | 'unit' | 'name'>,
  scale = 1
) => {
  const amount = formatQuantity(quantity * scale, unit);
  if (unit === 'pieces') {
    return `${amount} ${name}`;
  }
  if (ATTACHED_UNITS.includes(unit)) {
    return `${amount}${unit} ${name}`;
  }
  const plural = unit === 'liter' && amount !== '1' ? 'liters' : unit;
  return `${amount} ${plural} ${name}`;
};
