import {
  groupMemberKeys,
  IngredientListRow,
  ingredientRowIndex,
  moveGroup,
  moveRowBy,
  rowsFromIngredients,
} from './rows';

const ingredient = (key: string, name = key): IngredientListRow => ({
  kind: 'ingredient',
  key,
  quantity: 1,
  unit: 'g',
  name,
});
const heading = (key: string): IngredientListRow => ({ kind: 'heading', key, text: key });
const keys = (rows: IngredientListRow[]) => rows.map((row) => row.key);

// salt (no heading) | Sauce: tomato, garlic | Serve: basil
const rows = [
  ingredient('salt'),
  heading('Sauce'),
  ingredient('tomato'),
  ingredient('garlic'),
  heading('Serve'),
  ingredient('basil'),
];

describe('ingredient rows', () => {
  it('moves a heading together with its ingredients', () => {
    expect(keys(moveGroup(rows, 'Sauce', 'Serve'))).toEqual([
      'salt',
      'Serve',
      'basil',
      'Sauce',
      'tomato',
      'garlic',
    ]);
    expect(keys(moveGroup(rows, 'Serve', 'Sauce'))).toEqual([
      'salt',
      'Serve',
      'basil',
      'Sauce',
      'tomato',
      'garlic',
    ]);
  });

  it('leaves the rows alone for an unknown or same target', () => {
    expect(moveGroup(rows, 'Sauce', 'Sauce')).toBe(rows);
    expect(moveGroup(rows, 'Sauce', 'tomato')).toBe(rows);
  });

  it('moves an ingredient one place, stepping over headings into the next group', () => {
    expect(keys(moveRowBy(rows, 'garlic', 1))).toEqual([
      'salt',
      'Sauce',
      'tomato',
      'Serve',
      'garlic',
      'basil',
    ]);
    expect(keys(moveRowBy(rows, 'tomato', -1))).toEqual([
      'salt',
      'tomato',
      'Sauce',
      'garlic',
      'Serve',
      'basil',
    ]);
    // Already at the edge
    expect(moveRowBy(rows, 'salt', -1)).toBe(rows);
  });

  it('moves a heading past the neighbouring group, but never above ungrouped ingredients', () => {
    expect(keys(moveRowBy(rows, 'Serve', -1))).toEqual(keys(moveGroup(rows, 'Serve', 'Sauce')));
    expect(moveRowBy(rows, 'Sauce', -1)).toBe(rows);
    expect(moveRowBy(rows, 'Serve', 1)).toBe(rows);
  });

  it("lists a heading's ingredients", () => {
    expect(groupMemberKeys(rows, 'Sauce')).toEqual(['tomato', 'garlic']);
    expect(groupMemberKeys(rows, 'Serve')).toEqual(['basil']);
    expect(groupMemberKeys(rows, 'salt')).toEqual([]);
  });

  it("finds the API's Nth ingredient, skipping headings and empty rows", () => {
    const withEmpty: IngredientListRow[] = [
      ...rows.slice(0, 2),
      { kind: 'ingredient', key: 'blank', quantity: '', unit: null, name: '' },
      ...rows.slice(2),
    ];
    // API order: salt, tomato, garlic, basil
    expect(ingredientRowIndex(withEmpty, 0)).toBe(0);
    expect(ingredientRowIndex(withEmpty, 1)).toBe(3);
    expect(ingredientRowIndex(withEmpty, 3)).toBe(6);
  });

  it("builds rows from the API's subheaders", () => {
    const built = rowsFromIngredients([
      { quantity: 1, unit: 'g', name: 'salt', subheader: null },
      { quantity: 2, unit: 'pieces', name: 'tomato', subheader: 'Sauce' },
      { quantity: 1, unit: 'cloves', name: 'garlic', subheader: 'Sauce' },
      { quantity: 5, unit: 'g', name: 'basil', subheader: 'Serve' },
    ]);
    expect(built.map((row) => (row.kind === 'heading' ? `# ${row.text}` : row.name))).toEqual([
      'salt',
      '# Sauce',
      'tomato',
      'garlic',
      '# Serve',
      'basil',
    ]);
  });

  it('gives built rows the same keys every time, so server and browser rendering agree', () => {
    const saved = [{ quantity: 1, unit: 'g', name: 'salt', subheader: 'Sauce' }];
    expect(keys(rowsFromIngredients(saved))).toEqual(keys(rowsFromIngredients(saved)));
  });
});
