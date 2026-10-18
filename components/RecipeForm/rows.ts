// The ingredient list is edited as one flat list of headings and ingredients. Each ingredient
// belongs to the nearest heading above it, and ingredients before the first heading have none.
// This keeps reordering simple: moving an ingredient past a heading moves it into that group.
// The API instead stores the heading on each ingredient as `subheader`.

export type IngredientRow = {
  kind: 'ingredient';
  key: string;
  // Number inputs hold '' while empty, and selects hold null until something is chosen
  quantity: number | '';
  unit: string | null;
  name: string;
};

export type HeadingRow = {
  kind: 'heading';
  key: string;
  text: string;
};

export type IngredientListRow = IngredientRow | HeadingRow;

export type StepRow = {
  key: string;
  text: string;
};

// Rows need stable keys for React and drag and drop, since their positions change. Only called
// after the page has loaded, so server and browser rendering can't disagree about them.
let lastKey = 0;
export const newKey = () => `row-${++lastKey}`;

export const newIngredient = (): IngredientRow => ({
  kind: 'ingredient',
  key: newKey(),
  quantity: '',
  unit: null,
  name: '',
});
export const newHeading = (): HeadingRow => ({ kind: 'heading', key: newKey(), text: '' });
export const newStep = (): StepRow => ({ key: newKey(), text: '' });

// Joins the step at `index` onto the end of the one before it, with a space between, for an import
// that split one step into several. `caret` is where the joined step's text starts, for the cursor
export const mergeIntoPrevious = (steps: StepRow[], index: number) => {
  const before = steps[index - 1].text.trimEnd();
  const after = steps[index].text.trimStart();
  const separator = before && after ? ' ' : '';
  return {
    steps: [
      ...steps.slice(0, index - 1),
      { ...steps[index - 1], text: `${before}${separator}${after}` },
      ...steps.slice(index + 1),
    ],
    caret: before.length + separator.length,
  };
};

export const isEmptyIngredient = (row: IngredientRow) =>
  row.quantity === '' && !row.unit && !row.name.trim();

export const isEmptyRow = (row: IngredientListRow) =>
  row.kind === 'heading' ? !row.text.trim() : isEmptyIngredient(row);

// A heading's group runs from the heading up to the next heading, as [start, end)
export const groupRange = (rows: IngredientListRow[], headingIndex: number) => {
  let end = headingIndex + 1;
  while (end < rows.length && rows[end].kind !== 'heading') {
    end++;
  }
  return [headingIndex, end] as const;
};

// The ingredients before the first heading, which can't be moved as a group
export const leadLength = (rows: IngredientListRow[]) => {
  const firstHeading = rows.findIndex((row) => row.kind === 'heading');
  return firstHeading === -1 ? rows.length : firstHeading;
};

const splitGroups = (rows: IngredientListRow[]) => {
  const lead = rows.slice(0, leadLength(rows));
  const groups: IngredientListRow[][] = [];
  for (let i = lead.length; i < rows.length; ) {
    const [start, end] = groupRange(rows, i);
    groups.push(rows.slice(start, end));
    i = end;
  }
  return { lead, groups };
};

export const arrayMove = <T>(items: T[], from: number, to: number) => {
  const result = [...items];
  const [moved] = result.splice(from, 1);
  result.splice(to, 0, moved);
  return result;
};

// Moves a heading and all its ingredients to where another heading's group is
export const moveGroup = (rows: IngredientListRow[], fromKey: string, toKey: string) => {
  const { lead, groups } = splitGroups(rows);
  const from = groups.findIndex((group) => group[0].key === fromKey);
  const to = groups.findIndex((group) => group[0].key === toKey);
  if (from === -1 || to === -1 || from === to) {
    return rows;
  }
  return [...lead, ...arrayMove(groups, from, to).flat()];
};

// Moves one row up or down a place (Alt+arrow keys). Ingredients step over headings into the
// next group; headings move their whole group past the neighbouring group.
export const moveRowBy = (rows: IngredientListRow[], key: string, direction: -1 | 1) => {
  const index = rows.findIndex((row) => row.key === key);
  const row = rows[index];
  if (!row) {
    return rows;
  }
  if (row.kind === 'ingredient') {
    const to = index + direction;
    return to < 0 || to >= rows.length ? rows : arrayMove(rows, index, to);
  }
  const { groups } = splitGroups(rows);
  const groupIndex = groups.findIndex((group) => group[0].key === key);
  const neighbour = groups[groupIndex + direction];
  return neighbour ? moveGroup(rows, key, neighbour[0].key) : rows;
};

// The keys of a heading's ingredients, which are hidden while the heading is dragged
export const groupMemberKeys = (rows: IngredientListRow[], headingKey: string) => {
  const index = rows.findIndex((row) => row.key === headingKey);
  if (index === -1 || rows[index].kind !== 'heading') {
    return [];
  }
  const [start, end] = groupRange(rows, index);
  return rows.slice(start + 1, end).map((row) => row.key);
};

// Where the API's Nth ingredient is in the form, for showing its validation errors. The body
// leaves out headings and empty rows, so its indexes don't match the form's.
export const ingredientRowIndex = (rows: IngredientListRow[], apiIndex: number) => {
  let count = -1;
  return rows.findIndex(
    (row) => row.kind === 'ingredient' && !isEmptyIngredient(row) && ++count === apiIndex
  );
};

export const stepRowIndex = (steps: StepRow[], apiIndex: number) => {
  let count = -1;
  return steps.findIndex((step) => step.text.trim() !== '' && ++count === apiIndex);
};

// Builds form rows from the API's ingredients, adding a heading wherever the subheader changes.
// An ingredient without a subheader after one with a subheader can't be shown on its own, so it
// joins the group above it. The form never saves recipes in that order.
// Keys are fixed rather than from newKey(), because the edit form renders on the server first and
// both sides must build the same rows. The `saved-` prefix can't clash with newKey()'s `row-`.
export const rowsFromIngredients = (
  ingredients: {
    quantity: number | null;
    unit: string | null;
    name: string;
    subheader?: string | null;
  }[]
): IngredientListRow[] => {
  const rows: IngredientListRow[] = [];
  let current: string | null = null;
  ingredients.forEach(({ subheader, quantity, unit, name }, i) => {
    const heading = subheader?.trim() || null;
    if (heading && heading !== current) {
      rows.push({ kind: 'heading', key: `saved-heading-${i}`, text: heading });
    }
    current = heading;
    // No quantity shows as an empty input
    rows.push({
      kind: 'ingredient',
      key: `saved-ingredient-${i}`,
      quantity: quantity ?? '',
      unit,
      name,
    });
  });
  return rows;
};
