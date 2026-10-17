import { Ingredient } from '@/types/recipe';

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

// Reads naturally: "200g flour", "2 tbsp oil", "3 eggs" (for pieces), "2 large onions"
export const formatIngredient = ({ quantity, unit, name }: Ingredient) => {
  if (unit === 'pieces') {
    return `${quantity} ${name}`;
  }
  if (ATTACHED_UNITS.includes(unit)) {
    return `${quantity}${unit} ${name}`;
  }
  const plural = unit === 'liter' && quantity !== 1 ? 'liters' : unit;
  return `${quantity} ${plural} ${name}`;
};
