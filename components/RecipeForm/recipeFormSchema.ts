import { withZodSchema } from 'formik-validator-zod';
import { z, ZodSchema } from 'zod';
import { MAX_TAG_LENGTH, MAX_TAGS, normaliseTags } from '@/helpers/tags';
import {
  CreateRecipeBody,
  ImportDraft,
  Ingredient,
  Recipe,
  RECIPE_CATEGORIES,
  SuggestChangesBody,
  UNITS,
} from '@/types/recipe';
import {
  groupRange,
  IngredientListRow,
  ingredientRowIndex,
  isEmptyIngredient,
  rowsFromIngredients,
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
  // Where an imported recipe came from. Kept as it is: the form doesn't change it
  sourceUrl: string | null;
  // Identifies the photos a recipe was imported from, so they're spotted if imported again. Only
  // set from an import's draft, and only sent when creating: updating a recipe refuses it
  sourceImageHash: string | null;
};

// The parts IngredientList and StepList edit, so forms other than the full recipe can use them
export type RecipeContentValues = Pick<RecipeFormValues, 'ingredients' | 'steps'>;

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
  sourceUrl: null,
  sourceImageHash: null,
};

// The form filled in with a saved recipe, for editing it. Keys are fixed (see rowsFromIngredients)
export const recipeToFormValues = (recipe: Recipe): RecipeFormValues => ({
  title: recipe.title,
  // Optional, so it can be null
  description: recipe.description ?? '',
  category: recipe.category,
  serves: recipe.serves,
  prepTime: recipe.prepTime || '',
  cookTime: recipe.cookTime,
  ingredients: recipe.ingredients.length
    ? rowsFromIngredients(recipe.ingredients)
    : emptyRecipe.ingredients,
  steps: recipe.steps.length
    ? recipe.steps.map((text, i) => ({ key: `saved-step-${i}`, text }))
    : emptyRecipe.steps,
  tags: recipe.tags,
  bPrivate: recipe.bPrivate,
  bAllowSuggestions: recipe.bAllowSuggestions,
  sourceUrl: recipe.sourceUrl ?? null,
  // Never sent with a saved recipe, and editing must not send it
  sourceImageHash: null,
});

// A recipe imported from a web page or photo, for the user to check before creating it. Gaps the
// API filled with 0 are left empty, so the form asks for them rather than showing 0. Categories
// and units that aren't ours are kept, so the form can show what the source said and ask for one
// of ours instead (see optionError)
export const draftToFormValues = (draft: ImportDraft): RecipeFormValues => ({
  title: draft.title,
  description: draft.description ?? '',
  category: draft.category || null,
  serves: draft.serves || '',
  prepTime: draft.prepTime || '',
  cookTime: draft.cookTime || '',
  ingredients: draft.ingredients.length
    ? rowsFromIngredients(draft.ingredients)
    : emptyRecipe.ingredients,
  steps: draft.steps.length
    ? draft.steps.map((text, i) => ({ key: `saved-step-${i}`, text }))
    : emptyRecipe.steps,
  tags: draft.tags,
  bPrivate: draft.bPrivate,
  bAllowSuggestions: false,
  sourceUrl: draft.sourceUrl,
  sourceImageHash: draft.sourceImageHash ?? null,
});

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

// One of a fixed list. Something else, such as an imported "handful", is named in the message so
// the user knows what the source said
type OptionKind = { one: string; many: string };
const optionError =
  ({ one, many }: OptionKind) =>
  (_: z.ZodIssueOptionalMessage, ctx: z.ErrorMapCtx) => ({
    message:
      typeof ctx.data === 'string' && ctx.data.trim()
        ? `"${ctx.data}" isn't one of our ${many}. Please choose one`
        : `Please choose a ${one}`,
  });

const option = <T extends readonly [string, ...string[]]>(options: T, kind: OptionKind) =>
  z.enum(options, { errorMap: optionError(kind) });

// Both are optional: no amount at all is "salt, to taste", and a quantity with no unit is a count
// ("2 eggs"). An empty quantity input or unit select means none
const ingredientSchema = z.object({
  quantity: z.preprocess(
    (value) => (value === '' ? null : value),
    z
      .number({ invalid_type_error: 'Please enter a number' })
      .positive('Must be more than 0')
      .nullable()
  ),
  unit: z.preprocess(
    (value) => value || null,
    option(UNITS, { one: 'unit', many: 'units' }).nullable()
  ),
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

const tagsSchema = z
  .array(z.string())
  .transform(normaliseTags)
  .refine((tags) => tags.length <= MAX_TAGS, `Please use at most ${MAX_TAGS} tags`)
  .refine(
    (tags) => tags.every((tag) => tag.length <= MAX_TAG_LENGTH),
    `Tags can be at most ${MAX_TAG_LENGTH} characters`
  );

// Mirrors the API's RecipeSchema (utils/recipeUtils.ts in the backend), plus a form-only rule
// that a recipe needs at least one ingredient and one step
export const recipeFormSchema = z.object({
  title: requiredText('Please enter a title'),
  // Optional. Sent even when empty, because an empty one clears it when editing a recipe
  description: z.string().trim(),
  category: option(RECIPE_CATEGORIES, { one: 'category', many: 'categories' }),
  serves: positiveNumber('Please enter how many it serves', { integer: true }),
  // Optional, for recipes with no prep. Empty and 0 both mean none, which is saved as null
  prepTime: z
    .preprocess(
      (value) => (value === '' ? null : value),
      z
        .number({ invalid_type_error: 'Please enter a number' })
        .int('Please use a whole number')
        .min(0, "Can't be less than 0")
        .nullable()
    )
    .transform((minutes) => minutes || null),
  cookTime: positiveNumber('Please enter the cook time', { integer: true }),
  ingredients: ingredientsSchema,
  steps: stepsSchema,
  tags: tagsSchema,
  bPrivate: z.boolean(),
  bAllowSuggestions: z.boolean(),
  // Left out of the request when there isn't one
  sourceUrl: z
    .string()
    .nullable()
    .transform((url) => url ?? undefined),
  sourceImageHash: z
    .string()
    .nullable()
    .transform((hash) => hash ?? undefined),
});

// withZodSchema assumes the form values match the schema's output, but here the inputs can still
// be '' or null (that's what the schema rejects), so tell it the values' real type
export const validateRecipeForm = withZodSchema(
  recipeFormSchema as unknown as ZodSchema<RecipeFormValues>
);

// Only call with values that passed validation
export const toRecipeBody = (values: RecipeFormValues): CreateRecipeBody =>
  recipeFormSchema.parse(values);

// Suggesting changes to someone else's recipe: its ingredients, steps and tags, and a message
export type SuggestionFormValues = RecipeContentValues & { tags: string[]; comments: string };

export const suggestionToFormValues = (recipe: Recipe): SuggestionFormValues => {
  const { ingredients, steps, tags } = recipeToFormValues(recipe);
  return { ingredients, steps, tags, comments: '' };
};

const suggestionFormSchema = z.object({
  ingredients: ingredientsSchema,
  steps: stepsSchema,
  tags: tagsSchema,
  comments: z.string().trim(),
});

export const validateSuggestionForm = withZodSchema(
  suggestionFormSchema as unknown as ZodSchema<SuggestionFormValues>
);

// Ingredients as the API compares them, ignoring ids and spacing in headings
const comparable = (ingredients: CreateRecipeBody['ingredients'] | Ingredient[]) =>
  JSON.stringify(
    ingredients.map(({ quantity, unit, name, subheader }) => ({
      quantity,
      unit,
      name: name.trim(),
      subheader: subheader?.trim() || null,
    }))
  );
const sameList = (a: string[], b: string[]) => JSON.stringify(a) === JSON.stringify(b);

// Only the parts that differ from the recipe, because the API leaves out parts as "not changed".
// Accepting a suggestion then can't undo changes the author made to other parts since. Null when
// nothing differs. Only call with values that passed validation.
export const toSuggestionBody = (
  values: SuggestionFormValues,
  recipe: Recipe
): Omit<SuggestChangesBody, 'id' | 'isSuggestion'> | null => {
  const { ingredients, steps, tags, comments } = suggestionFormSchema.parse(values);
  const changes = {
    ingredients:
      comparable(ingredients) !== comparable(recipe.ingredients) ? ingredients : undefined,
    steps: !sameList(steps, recipe.steps) ? steps : undefined,
    tags: !sameList(tags, normaliseTags(recipe.tags)) ? tags : undefined,
  };
  if (!changes.ingredients && !changes.steps && !changes.tags) {
    return null;
  }
  return { ...changes, comments: comments || undefined };
};

// Where an API validation error belongs in the form. The API counts only the ingredients and
// steps it was sent, so `ingredients[1].unit` is the second filled-in ingredient, not row 1.
export const formPathForApiField = (path: string, values: RecipeContentValues) => {
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
