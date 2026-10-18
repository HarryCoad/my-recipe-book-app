'use client';

import Link from 'next/link';
import { IconAlertCircle } from '@tabler/icons-react';
import { Form, Formik, FormikHelpers, setNestedObjectValues, useFormikContext } from 'formik';
import {
  Alert,
  Button,
  Fieldset,
  Group,
  NumberInput,
  Select,
  SimpleGrid,
  Stack,
  Switch,
  Textarea,
  TextInput,
} from '@mantine/core';
import { getErrorMessage, getFieldErrors } from '@/helpers/errors';
import { MAX_TAGS } from '@/helpers/tags';
import { CreateRecipeBody, RECIPE_CATEGORIES } from '@/types/recipe';
import { IngredientList } from './IngredientList';
import {
  emptyRecipe,
  formPathForApiField,
  RecipeFormValues,
  toRecipeBody,
  validateRecipeForm,
} from './recipeFormSchema';
import { StepList } from './StepList';
import { TagInput } from './TagInput';
import { useFieldError } from './useRowList';

type RecipeFormProps = {
  initialValues?: RecipeFormValues;
  submitLabel: string;
  cancelHref: string;
  // Gets the validated, cleaned-up body for the API. If it throws an API error, the form shows it,
  // with any validation errors next to their fields.
  onSubmit: (body: CreateRecipeBody) => Promise<void>;
  // Show what needs fixing straight away, rather than once each field is left or the form is
  // sent. For imported drafts, which can have gaps
  highlightErrors?: boolean;
  // Offer to join steps together, for imports that split one step into several
  mergeableSteps?: boolean;
};

export function RecipeForm({
  initialValues = emptyRecipe,
  submitLabel,
  cancelHref,
  onSubmit,
  highlightErrors = false,
  mergeableSteps = false,
}: RecipeFormProps) {
  const handleSubmit = async (
    values: RecipeFormValues,
    { setFieldError, setStatus }: FormikHelpers<RecipeFormValues>
  ) => {
    setStatus(undefined);
    try {
      await onSubmit(toRecipeBody(values));
    } catch (err) {
      Object.entries(getFieldErrors(err)).forEach(([field, message]) =>
        setFieldError(formPathForApiField(field, values), message)
      );
      setStatus(getErrorMessage(err));
    }
  };

  return (
    <Formik<RecipeFormValues>
      initialValues={initialValues}
      validate={validateRecipeForm}
      onSubmit={handleSubmit}
      // Every field counts as touched, so its error shows as soon as validation runs
      initialTouched={highlightErrors ? setNestedObjectValues(initialValues, true) : undefined}
      validateOnMount={highlightErrors}
    >
      {({ status, isSubmitting }) => (
        <Form noValidate>
          <Stack gap="lg">
            <Fieldset legend="About the recipe">
              <AboutFields />
            </Fieldset>
            <Fieldset legend="Ingredients">
              <IngredientList />
            </Fieldset>
            <Fieldset legend="Method">
              <StepList mergeable={mergeableSteps} />
            </Fieldset>
            <Fieldset legend="Tags and sharing">
              <SharingFields />
            </Fieldset>

            {status && (
              <Alert color="red" icon={<IconAlertCircle />}>
                {status}
              </Alert>
            )}

            <Group justify="flex-end">
              {/* Replaces the form in the history, so Back doesn't return to it */}
              <Button component={Link} href={cancelHref} replace variant="default">
                Cancel
              </Button>
              <Button type="submit" color="orange" loading={isSubmitting}>
                {submitLabel}
              </Button>
            </Group>
          </Stack>
        </Form>
      )}
    </Formik>
  );
}

function AboutFields() {
  const { values, getFieldProps, setFieldValue } = useFormikContext<RecipeFormValues>();
  const errorFor = useFieldError();

  const numberField = (name: 'serves' | 'prepTime' | 'cookTime', label: string) => (
    <NumberInput
      label={label}
      withAsterisk
      min={1}
      allowDecimal={false}
      value={values[name]}
      onChange={(value) => setFieldValue(name, value)}
      onBlur={getFieldProps(name).onBlur}
      name={name}
      error={errorFor(name)}
    />
  );

  return (
    <Stack>
      <TextInput
        label="Title"
        placeholder="Spicy chickpea curry"
        withAsterisk
        error={errorFor('title')}
        {...getFieldProps('title')}
      />
      <Textarea
        label="Description"
        placeholder="What makes this recipe worth cooking?"
        withAsterisk
        autosize
        minRows={3}
        error={errorFor('description')}
        {...getFieldProps('description')}
      />
      <Select
        label="Category"
        placeholder="Choose a category"
        withAsterisk
        // A category that isn't ours, such as from an import, is shown so its error makes sense
        data={
          values.category && !(RECIPE_CATEGORIES as readonly string[]).includes(values.category)
            ? [...RECIPE_CATEGORIES, values.category]
            : [...RECIPE_CATEGORIES]
        }
        value={values.category}
        onChange={(value) => setFieldValue('category', value)}
        onBlur={getFieldProps('category').onBlur}
        name="category"
        error={errorFor('category')}
      />
      <SimpleGrid cols={{ base: 1, xs: 3 }}>
        {numberField('serves', 'Serves')}
        {numberField('prepTime', 'Prep time (minutes)')}
        {numberField('cookTime', 'Cook time (minutes)')}
      </SimpleGrid>
    </Stack>
  );
}

function SharingFields() {
  const { values, setFieldValue, setFieldTouched } = useFormikContext<RecipeFormValues>();
  const errorFor = useFieldError();

  return (
    <Stack>
      <TagInput
        label="Tags"
        description={`Enter adds what you've typed. Tab uses the highlighted suggestion. Up to ${MAX_TAGS}.`}
        placeholder="e.g. vegan, quick"
        value={values.tags}
        onChange={(tags) => {
          setFieldValue('tags', tags);
          // Touched as soon as it changes, so a limit error shows straight away
          setFieldTouched('tags', true, false);
        }}
        error={errorFor('tags')}
      />
      <Switch
        label="Private"
        description="Only you can see private recipes"
        checked={values.bPrivate}
        onChange={(event) => setFieldValue('bPrivate', event.currentTarget.checked)}
      />
      <Switch
        label="Allow suggestions"
        description="People who save this recipe can suggest changes for you to review"
        checked={values.bAllowSuggestions}
        onChange={(event) => setFieldValue('bAllowSuggestions', event.currentTarget.checked)}
      />
    </Stack>
  );
}
