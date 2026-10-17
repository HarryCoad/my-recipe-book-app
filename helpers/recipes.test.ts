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
