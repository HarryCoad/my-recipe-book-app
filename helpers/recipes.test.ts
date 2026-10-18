import { convertMinutesToHoursAndMinutes } from '@/helpers/convertMin';
import { formatIngredient, groupIngredients } from '@/helpers/recipes';
import { Ingredient } from '@/types/recipe';

const ingredient = (name: string, subheader: string | null = null, quantity = 1, unit = 'g') => ({
  id: name,
  name,
  subheader,
  quantity,
  unit,
});

describe('groupIngredients', () => {
  it('groups ingredients under their headings, in order', () => {
    const groups = groupIngredients([
      ingredient('salt'),
      ingredient('tomato', 'Sauce'),
      ingredient('garlic', 'Sauce'),
      ingredient('basil', 'To serve'),
    ]);
    expect(groups.map((g) => [g.subheader, g.ingredients.map((i) => i.name)])).toEqual([
      [null, ['salt']],
      ['Sauce', ['tomato', 'garlic']],
      ['To serve', ['basil']],
    ]);
  });

  it('treats blank subheaders as none', () => {
    expect(groupIngredients([ingredient('a', ''), ingredient('b', '  ')])).toHaveLength(1);
  });
});

describe('formatIngredient', () => {
  it.each<[Partial<Ingredient>, string]>([
    [{ quantity: 200, unit: 'g', name: 'flour' }, '200g flour'],
    [{ quantity: 1.5, unit: 'kg', name: 'potatoes' }, '1.5kg potatoes'],
    [{ quantity: 2, unit: 'tbsp', name: 'olive oil' }, '2 tbsp olive oil'],
    [{ quantity: 3, unit: 'pieces', name: 'eggs' }, '3 eggs'],
    [{ quantity: 2, unit: 'large', name: 'onions' }, '2 large onions'],
    [{ quantity: 1, unit: 'liter', name: 'stock' }, '1 liter stock'],
    [{ quantity: 2, unit: 'liter', name: 'stock' }, '2 liters stock'],
    // A quantity with no unit is a count
    [{ quantity: 2, unit: null, name: 'eggs' }, '2 eggs'],
    [{ quantity: 0.5, unit: null, name: 'lemon' }, '½ lemon'],
    // No amount at all
    [{ quantity: null, unit: null, name: 'salt, to taste' }, 'salt, to taste'],
    [{ quantity: null, unit: 'pinch', name: 'salt' }, 'pinch of salt'],
    [{ quantity: null, unit: 'large', name: 'onion' }, 'large onion'],
    // The newer units, which take plurals
    [{ quantity: 1, unit: 'cup', name: 'milk' }, '1 cup milk'],
    [{ quantity: 2, unit: 'cup', name: 'milk' }, '2 cups milk'],
    [{ quantity: 0.5, unit: 'cup', name: 'milk' }, '½ cup milk'],
    [{ quantity: 1.5, unit: 'cup', name: 'milk' }, '1½ cups milk'],
    [{ quantity: 2, unit: 'pinch', name: 'salt' }, '2 pinches salt'],
    [{ quantity: 3, unit: 'slice', name: 'bread' }, '3 slices bread'],
    [{ quantity: 8, unit: 'oz', name: 'cheese' }, '8 oz cheese'],
    [{ quantity: 4, unit: 'fl oz', name: 'cream' }, '4 fl oz cream'],
  ])('%o reads as "%s"', (parts, expected) => {
    expect(formatIngredient({ id: 'x', subheader: null, ...parts } as Ingredient)).toBe(expected);
  });

  it.each<[Partial<Ingredient>, number, string]>([
    [{ quantity: 200, unit: 'g', name: 'flour' }, 1.5, '300g flour'],
    [{ quantity: 125, unit: 'ml', name: 'milk' }, 1 / 3, '42ml milk'],
    [{ quantity: 5, unit: 'g', name: 'salt' }, 0.25, '1.3g salt'],
    [{ quantity: 1.5, unit: 'kg', name: 'potatoes' }, 1 / 3, '0.5kg potatoes'],
    [{ quantity: 1, unit: 'liter', name: 'stock' }, 1.5, '1.5 liters stock'],
    [{ quantity: 3, unit: 'pieces', name: 'eggs' }, 1.25, '3¾ eggs'],
    [{ quantity: 2, unit: 'tbsp', name: 'oil' }, 1 / 4, '½ tbsp oil'],
    [{ quantity: 1, unit: 'tsp', name: 'cumin' }, 1 / 3, '⅓ tsp cumin'],
    [{ quantity: 2, unit: 'cloves', name: 'garlic' }, 2.98, '6 cloves garlic'],
    [{ quantity: 1, unit: 'pieces', name: 'lemon' }, 1 / 8, '¼ lemon'],
    [{ quantity: 3, unit: null, name: 'eggs' }, 2, '6 eggs'],
    [{ quantity: 1, unit: 'cup', name: 'rice' }, 2, '2 cups rice'],
    // No amount, so nothing to scale
    [{ quantity: null, unit: null, name: 'salt, to taste' }, 2, 'salt, to taste'],
  ])('%o times %d reads as "%s"', (parts, scale, expected) => {
    expect(formatIngredient({ id: 'x', subheader: null, ...parts } as Ingredient, scale)).toBe(
      expected
    );
  });
});

describe('convertMinutesToHoursAndMinutes', () => {
  it.each([
    [1, '1min'],
    [45, '45mins'],
    [60, '1hr'],
    [61, '1hr 1min'],
    [150, '2hrs 30mins'],
  ])('%i minutes is "%s"', (minutes, expected) => {
    expect(convertMinutesToHoursAndMinutes(minutes)).toBe(expected);
  });
});
