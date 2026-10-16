import { withZodSchema } from 'formik-validator-zod';
import { z, ZodSchema } from 'zod';
import { MAX_TAG_LENGTH, MAX_TAGS, normaliseTags } from '@/helpers/tags';
import { CreateRecipeBody, RECIPE_CATEGORIES, UNITS } from '@/types/recipe';
import {
  groupRange,
  IngredientListRow,
  ingredientRowIndex,
  isEmptyIngredient,
  StepRow,
  stepRowIndex,
} from './rows';

export type RecipeFormValues = {
  title: string;
  description: string;
  category: string | null;
  serves: number | '';
  prepTime: number | '';
  cookTime: number | '';
  ingredients: IngredientListRow[];
  steps: StepRow[];
  tags: string[];
  bPrivate: boolean;
  bAllowSuggestions: boolean;
};

// Fixed keys, so the server-rendered form matches the browser's
export const emptyRecipe: RecipeFormValues = {
  title: '',
  description: '',
  category: null,
  serves: '',
  prepTime: '',
  cookTime: '',
  ingredients: [
    { kind: 'ingredient', key: 'first-ingredient', quantity: '', unit: null, name: '' },
  ],
  steps: [{ key: 'first-step', text: '' }],
  tags: [],
  bPrivate: false,
  bAllowSuggestions: false,
};

// An empty number input counts as missing rather than as 0
const positiveNumber = (missing: string, { integer = false } = {}) => {
  let schema = z.number({ required_error: missing, invalid_type_error: missing });
  if (integer) {
    schema = schema.int('Please use a whole number');
  }
  return z.preprocess(
    (value) => (value === '' ? undefined : value),
    schema.positive('Must be more than 0')
  );
};

const requiredText = (message: string) => z.string().trim().min(1, message);

const option = <T extends readonly [string, ...string[]]>(options: T, message: string) =>
  z.enum(options, { errorMap: () => ({ message }) });

const ingredientSchema = z.object({
  quantity: positiveNumber('Please enter a quantity'),
  unit: option(UNITS, 'Please choose a unit'),
  name: requiredText('Please enter the ingredient'),
});

// Completely empty rows are ignored rather than reported, because Tab adds a new row as you go
const ingredientsSchema = z
  .custom<IngredientListRow[]>()
  .superRefine((rows, ctx) => {
    const filled = rows.filter((row) => row.kind === 'ingredient' && !isEmptyIngredient(row));
    if (filled.length === 0) {
      // Covers headings without ingredients too, so it's the only error for the list
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Please add at least one ingredient' });
      return;
    }
    rows.forEach((row, i) => {
      if (row.kind === 'heading') {
        const [start, end] = groupRange(rows, i);
        const members = rows.slice(start + 1, end);
        const hasIngredients = members.some(
          (member) => member.kind === 'ingredient' && !isEmptyIngredient(member)
        );
        if (!row.text.trim()) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: [i, 'text'],
            message: 'Please enter a heading, or remove it',
          });
        } else if (!hasIngredients) {
          // Headings are saved on their ingredients, so an empty one would be lost
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: [i, 'text'],
            message: 'Please add an ingredient under this heading, or remove it',
          });
        }
      } else if (!isEmptyIngredient(row)) {
        ingredientSchema.safeParse(row).error?.issues.forEach((issue) =>
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: [i, ...issue.path],
            message: issue.message,
          })
        );
      }
    });
  })
  .transform((rows) => {
    let subheader: string | null = null;
    const ingredients: CreateRecipeBody['ingredients'] = [];
    for (const row of rows) {
      if (row.kind === 'heading') {
        subheader = row.text.trim();
      } else if (!isEmptyIngredient(row)) {
        ingredients.push({ ...ingredientSchema.parse(row), subheader });
      }
    }
    return ingredients;
  });

const stepsSchema = z
  .custom<StepRow[]>()
  .transform((steps) => steps.map((step) => step.text.trim()).filter(Boolean))
  .refine((steps) => steps.length > 0, 'Please add at least one step');

// Mirrors the API's RecipeSchema (utils/recipeUtils.ts in the backend), plus a form-only rule
// that a recipe needs at least one ingredient and one step
export const recipeFormSchema = z.object({
  title: requiredText('Please enter a title'),
  description: requiredText('Please enter a description'),
  category: option(RECIPE_CATEGORIES, 'Please choose a category'),
  serves: positiveNumber('Please enter how many it serves', { integer: true }),
  prepTime: positiveNumber('Please enter the prep time', { integer: true }),
  cookTime: positiveNumber('Please enter the cook time', { integer: true }),
  ingredients: ingredientsSchema,
  steps: stepsSchema,
  tags: z
    .array(z.string())
    .transform(normaliseTags)
    .refine((tags) => tags.length <= MAX_TAGS, `Please use at most ${MAX_TAGS} tags`)
    .refine(
      (tags) => tags.every((tag) => tag.length <= MAX_TAG_LENGTH),
      `Tags can be at most ${MAX_TAG_LENGTH} characters`
    ),
  bPrivate: z.boolean(),
  bAllowSuggestions: z.boolean(),
});

// withZodSchema assumes the form values match the schema's output, but here the inputs can still
// be '' or null (that's what the schema rejects), so tell it the values' real type
export const validateRecipeForm = withZodSchema(
  recipeFormSchema as unknown as ZodSchema<RecipeFormValues>
);

// Only call with values that passed validation
export const toRecipeBody = (values: RecipeFormValues): CreateRecipeBody =>
  recipeFormSchema.parse(values);

// Where an API validation error belongs in the form. The API counts only the ingredients and
// steps it was sent, so `ingredients[1].unit` is the second filled-in ingredient, not row 1.
export const formPathForApiField = (path: string, values: RecipeFormValues) => {
  const ingredient = path.match(/^ingredients\[(\d+)\](.*)$/);
  if (ingredient) {
    return `ingredients[${ingredientRowIndex(values.ingredients, Number(ingredient[1]))}]${ingredient[2]}`;
  }
  const step = path.match(/^steps\[(\d+)\]$/);
  if (step) {
    return `steps[${stepRowIndex(values.steps, Number(step[1]))}].text`;
  }
  return path;
};
