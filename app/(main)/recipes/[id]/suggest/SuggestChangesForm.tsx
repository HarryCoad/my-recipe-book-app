'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { IconAlertCircle, IconCheck } from '@tabler/icons-react';
import { Form, Formik, FormikHelpers, useFormikContext } from 'formik';
import { Alert, Button, Fieldset, Group, Stack, Text, Textarea } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IngredientList } from '@/components/RecipeForm/IngredientList';
import {
  formPathForApiField,
  SuggestionFormValues,
  suggestionToFormValues,
  toSuggestionBody,
  validateSuggestionForm,
} from '@/components/RecipeForm/recipeFormSchema';
import { StepList } from '@/components/RecipeForm/StepList';
import { TagInput } from '@/components/RecipeForm/TagInput';
import { useFieldError } from '@/components/RecipeForm/useRowList';
import { UserLink } from '@/components/UserLink/UserLink';
import axios from '@/helpers/axios';
import { recipePath } from '@/helpers/constants';
import { endpoints } from '@/helpers/endpoints';
import { getErrorMessage, getFieldErrors } from '@/helpers/errors';
import { MAX_TAGS } from '@/helpers/tags';
import { Recipe, SuggestChangesBody } from '@/types/recipe';

const NOTHING_CHANGED = "You haven't changed anything yet. Make a change to suggest it.";

// Starts from the author's version. Only the parts that were changed are sent
export function SuggestChangesForm({ recipe }: { recipe: Recipe }) {
  const router = useRouter();
  const recipeHref = recipePath(recipe.id);

  const handleSubmit = async (
    values: SuggestionFormValues,
    { setFieldError, setStatus }: FormikHelpers<SuggestionFormValues>
  ) => {
    setStatus(undefined);
    const changes = toSuggestionBody(values, recipe);
    if (!changes) {
      setStatus(NOTHING_CHANGED);
      return;
    }
    try {
      const body: SuggestChangesBody = { id: recipe.id, isSuggestion: true, ...changes };
      await axios.post(endpoints.recipes.editRecipe, body);
      notifications.show({
        color: 'green',
        icon: <IconCheck size={18} />,
        message: `Suggestion sent to ${recipe.authorName}`,
      });
      // Replaces this page in the history, as the edit page does
      router.replace(recipeHref);
    } catch (err) {
      Object.entries(getFieldErrors(err)).forEach(([field, message]) =>
        setFieldError(formPathForApiField(field, values), message)
      );
      setStatus(getErrorMessage(err));
    }
  };

  return (
    <Formik<SuggestionFormValues>
      initialValues={suggestionToFormValues(recipe)}
      validate={validateSuggestionForm}
      onSubmit={handleSubmit}
    >
      {({ status, isSubmitting }) => (
        <Form noValidate>
          <Stack gap="lg">
            <Text c="dimmed" ta="center">
              Change the ingredients, method or tags of{' '}
              {recipe.authorId ? (
                <UserLink id={recipe.authorId}>{recipe.authorName}</UserLink>
              ) : (
                recipe.authorName
              )}
              's recipe. They'll review your suggestion, and if they accept it, everyone will see
              the changes.
            </Text>
            <Fieldset legend="Ingredients">
              <IngredientList />
            </Fieldset>
            <Fieldset legend="Method">
              <StepList />
            </Fieldset>
            <Fieldset legend="Tags and message">
              <MessageFields authorName={recipe.authorName ?? 'the author'} />
            </Fieldset>

            {status && (
              <Alert
                color={status === NOTHING_CHANGED ? 'yellow' : 'red'}
                icon={<IconAlertCircle />}
              >
                {status}
              </Alert>
            )}

            <Group justify="flex-end">
              <Button component={Link} href={recipeHref} replace variant="default">
                Cancel
              </Button>
              <Button type="submit" color="orange" loading={isSubmitting}>
                Send suggestion
              </Button>
            </Group>
          </Stack>
        </Form>
      )}
    </Formik>
  );
}

function MessageFields({ authorName }: { authorName: string }) {
  const { values, setFieldValue, setFieldTouched, getFieldProps } =
    useFormikContext<SuggestionFormValues>();
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
      <Textarea
        label={`Message to ${authorName}`}
        description="Optional"
        placeholder="What did you change, and why?"
        autosize
        minRows={3}
        {...getFieldProps('comments')}
      />
    </Stack>
  );
}
