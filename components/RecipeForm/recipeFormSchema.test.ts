import {
  emptyRecipe,
  formPathForApiField,
  recipeFormSchema,
  RecipeFormValues,
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
    });
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

  it('reports the missing fields of a partly filled ingredient, by its row', () => {
    expect(
      errorsFor({
        ...validRecipe,
        ingredients: [ingredient('flour'), ingredient('eggs', '', null)],
      })
    ).toEqual({
      'ingredients.1.quantity': 'Please enter a quantity',
      'ingredients.1.unit': 'Please choose a unit',
    });
  });

  it('reports every missing field on an empty form', () => {
    expect(errorsFor(emptyRecipe)).toEqual({
      title: 'Please enter a title',
      description: 'Please enter a description',
      category: 'Please choose a category',
      serves: 'Please enter how many it serves',
      prepTime: 'Please enter the prep time',
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
