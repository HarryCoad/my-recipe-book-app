import { ImportDraft } from '@/types/recipe';
import {
  draftToFormValues,
  emptyRecipe,
  formPathForApiField,
  recipeFormSchema,
  RecipeFormValues,
  recipeToFormValues,
  toRecipeBody,
} from './recipeFormSchema';
import { IngredientListRow } from './rows';

const ingredient = (
  name: string,
  quantity: number | '' = 1,
  unit: string | null = 'g'
): IngredientListRow => ({ kind: 'ingredient', key: name || 'blank', quantity, unit, name });
const heading = (text: string): IngredientListRow => ({ kind: 'heading', key: `# ${text}`, text });
const blank = ingredient('', '', null);

const validRecipe: RecipeFormValues = {
  title: '  Pancakes ',
  description: 'Fluffy pancakes',
  category: 'Breakfast',
  serves: 2,
  prepTime: 10,
  cookTime: 15,
  ingredients: [ingredient('flour', 200)],
  steps: [
    { key: 's1', text: 'Mix' },
    { key: 's2', text: ' Cook ' },
  ],
  tags: ['quick', ' '],
  bPrivate: false,
  bAllowSuggestions: true,
  sourceUrl: null,
  sourceImageHash: null,
};

const errorsFor = (values: RecipeFormValues) => {
  const result = recipeFormSchema.safeParse(values);
  return result.success
    ? {}
    : Object.fromEntries(result.error.issues.map((issue) => [issue.path.join('.'), issue.message]));
};

describe('recipe form schema', () => {
  it('turns valid form values into the body the API expects', () => {
    expect(toRecipeBody(validRecipe)).toEqual({
      ...validRecipe,
      title: 'Pancakes',
      ingredients: [{ quantity: 200, unit: 'g', name: 'flour', subheader: null }],
      steps: ['Mix', 'Cook'],
      tags: ['quick'],
      // Left out when there isn't one
      sourceUrl: undefined,
      sourceImageHash: undefined,
    });
  });

  it('keeps where an imported recipe came from', () => {
    const sourceUrl = 'https://example.com/pancakes';
    expect(toRecipeBody({ ...validRecipe, sourceUrl }).sourceUrl).toBe(sourceUrl);
  });

  it("sends a photo import's image hash back unchanged, so the photos are recognised again", () => {
    const sourceImageHash = 'a'.repeat(64);
    const values = draftToFormValues({
      title: 'Soup',
      description: null,
      category: 'Main',
      serves: 2,
      prepTime: 0,
      cookTime: 10,
      ingredients: [],
      steps: [],
      tags: [],
      bPrivate: true,
      sourceUrl: null,
      sourceImageHash,
    });
    expect(values.sourceImageHash).toBe(sourceImageHash);
    expect(toRecipeBody({ ...validRecipe, sourceImageHash }).sourceImageHash).toBe(sourceImageHash);
  });

  it('never sends an image hash when editing a saved recipe, since updating refuses it', () => {
    const values = recipeToFormValues({
      id: 'r1',
      authorId: 'me',
      authorName: 'me',
      bPrivate: false,
      bAllowSuggestions: false,
      title: 'Soup',
      description: null,
      category: 'Main',
      serves: 2,
      prepTime: null,
      cookTime: 10,
      ingredients: [],
      steps: ['Boil'],
      tags: [],
      bSaved: true,
      savedCount: 1,
      bDeleted: false,
    });
    expect(values.sourceImageHash).toBeNull();
    expect(
      'sourceImageHash' in
        JSON.parse(
          JSON.stringify(
            toRecipeBody({ ...validRecipe, ...values, ingredients: validRecipe.ingredients })
          )
        )
    ).toBe(false);
  });

  it('saves each heading on the ingredients below it', () => {
    const body = toRecipeBody({
      ...validRecipe,
      ingredients: [
        ingredient('salt'),
        heading(' For the sauce '),
        ingredient('tomato'),
        heading('To serve'),
        ingredient('basil'),
      ],
    });
    expect(body.ingredients.map(({ name, subheader }) => [name, subheader])).toEqual([
      ['salt', null],
      ['tomato', 'For the sauce'],
      ['basil', 'To serve'],
    ]);
  });

  it('ignores completely empty ingredients and steps', () => {
    const body = toRecipeBody({
      ...validRecipe,
      ingredients: [blank, ingredient('flour'), blank],
      steps: [
        { key: 's1', text: 'Mix' },
        { key: 's2', text: '  ' },
      ],
    });
    expect(body.ingredients.map(({ name }) => name)).toEqual(['flour']);
    expect(body.steps).toEqual(['Mix']);
  });

  it('allows ingredients with no amount, and counts with no unit', () => {
    const body = toRecipeBody({
      ...validRecipe,
      ingredients: [ingredient('salt, to taste', '', null), ingredient('eggs', 2, null)],
    });
    expect(body.ingredients).toEqual([
      { quantity: null, unit: null, name: 'salt, to taste', subheader: null },
      { quantity: 2, unit: null, name: 'eggs', subheader: null },
    ]);
  });

  it('asks for the name of an ingredient that only has an amount, by its row', () => {
    expect(
      errorsFor({ ...validRecipe, ingredients: [ingredient('flour'), ingredient('', 2, 'g')] })
    ).toEqual({ 'ingredients.1.name': 'Please enter the ingredient' });
  });

  it("names a unit or category that isn't one of ours, such as from an import", () => {
    expect(
      errorsFor({
        ...validRecipe,
        category: 'Soup',
        ingredients: [ingredient('basil', 1, 'handful')],
      })
    ).toEqual({
      category: `"Soup" isn't one of our categories. Please choose one`,
      'ingredients.0.unit': `"handful" isn't one of our units. Please choose one`,
    });
  });

  it('reports every missing field on an empty form', () => {
    expect(errorsFor(emptyRecipe)).toEqual({
      title: 'Please enter a title',
      category: 'Please choose a category',
      serves: 'Please enter how many it serves',
      cookTime: 'Please enter the cook time',
      ingredients: 'Please add at least one ingredient',
      steps: 'Please add at least one step',
    });
  });

  it('flags blank headings and headings without ingredients, which would be lost', () => {
    expect(
      errorsFor({
        ...validRecipe,
        ingredients: [heading(''), ingredient('flour'), heading('Topping'), blank],
      })
    ).toEqual({
      'ingredients.0.text': 'Please enter a heading, or remove it',
      'ingredients.2.text': 'Please add an ingredient under this heading, or remove it',
    });
  });

  it.each([
    ['left empty', ''],
    ['0', 0],
  ])('saves no prep time when it is %s', (_, prepTime) => {
    expect(toRecipeBody({ ...validRecipe, prepTime: prepTime as number | '' }).prepTime).toBeNull();
  });

  it("doesn't allow a negative or part-minute prep time", () => {
    expect(errorsFor({ ...validRecipe, prepTime: -5 })).toEqual({
      prepTime: "Can't be less than 0",
    });
    expect(errorsFor({ ...validRecipe, prepTime: 2.5 })).toEqual({
      prepTime: 'Please use a whole number',
    });
  });

  it('matches the API: numbers must be more than 0, and times are whole minutes', () => {
    expect(errorsFor({ ...validRecipe, cookTime: 0, serves: 1.5 })).toEqual({
      cookTime: 'Must be more than 0',
      serves: 'Please use a whole number',
    });
    // Ingredient quantities can be fractions, e.g. half a teaspoon
    expect(errorsFor({ ...validRecipe, ingredients: [ingredient('salt', 0.5, 'tsp')] })).toEqual(
      {}
    );
  });

  it("maps the API's error paths onto form rows", () => {
    const values = {
      ...validRecipe,
      ingredients: [blank, heading('Sauce'), ingredient('tomato'), ingredient('garlic')],
      steps: [
        { key: 's1', text: '' },
        { key: 's2', text: 'Cook' },
      ],
    };
    expect(formPathForApiField('ingredients[1].unit', values)).toBe('ingredients[3].unit');
    expect(formPathForApiField('steps[0]', values)).toBe('steps[1].text');
    expect(formPathForApiField('title', values)).toBe('title');
  });
});

describe('imported drafts', () => {
  const draft: ImportDraft = {
    title: 'Pancakes',
    description: null,
    category: 'Breakfast',
    serves: 4,
    prepTime: 10,
    cookTime: 0,
    ingredients: [
      { subheader: null, quantity: 200, unit: 'g', name: 'flour' },
      { subheader: 'Topping', quantity: null, unit: null, name: 'syrup, to taste' },
    ],
    steps: ['Mix', 'Cook'],
    tags: ['quick'],
    bPrivate: true,
    sourceUrl: 'https://example.com/pancakes',
  };

  it('fills in the form, leaving gaps empty so the form asks for them', () => {
    const values = draftToFormValues(draft);

    expect(values).toMatchObject({
      title: 'Pancakes',
      description: '',
      serves: 4,
      cookTime: '',
      bPrivate: true,
      bAllowSuggestions: false,
      sourceUrl: 'https://example.com/pancakes',
    });
    expect(values.ingredients).toMatchObject([
      { kind: 'ingredient', quantity: 200, unit: 'g', name: 'flour' },
      { kind: 'heading', text: 'Topping' },
      { kind: 'ingredient', quantity: '', unit: null, name: 'syrup, to taste' },
    ]);
    expect(errorsFor(values)).toEqual({
      cookTime: 'Please enter the cook time',
    });
  });

  it("keeps a category it couldn't map, so the form can say what it was", () => {
    expect(errorsFor(draftToFormValues({ ...draft, category: 'Soup', cookTime: 5 }))).toMatchObject(
      {
        category: `"Soup" isn't one of our categories. Please choose one`,
      }
    );
  });

  it('starts with one empty row when the draft has no ingredients or steps', () => {
    const values = draftToFormValues({ ...draft, ingredients: [], steps: [] });
    expect(values.ingredients).toEqual(emptyRecipe.ingredients);
    expect(values.steps).toEqual(emptyRecipe.steps);
  });
});

describe('recipe form tags', () => {
  it('cleans tags up the way the API stores them', () => {
    expect(
      toRecipeBody({ ...validRecipe, tags: [' Quick ', 'quick', 'Gluten  Free'] }).tags
    ).toEqual(['quick', 'gluten free']);
  });

  it("checks the API's limits: 10 tags of up to 30 characters", () => {
    const tags = Array.from({ length: 11 }, (_, i) => `tag ${i}`);
    expect(errorsFor({ ...validRecipe, tags })).toEqual({ tags: 'Please use at most 10 tags' });
    expect(errorsFor({ ...validRecipe, tags: ['x'.repeat(31)] })).toEqual({
      tags: 'Tags can be at most 30 characters',
    });
  });
});
