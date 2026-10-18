'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { IconFileImport } from '@tabler/icons-react';
import { Alert, Anchor, Button, Group, Stack, Text } from '@mantine/core';
import { RecipeForm } from '@/components/RecipeForm/RecipeForm';
import { draftToFormValues, RecipeFormValues } from '@/components/RecipeForm/recipeFormSchema';
import axios from '@/helpers/axios';
import { recipePath, Routes } from '@/helpers/constants';
import { endpoints } from '@/helpers/endpoints';
import { sourceHost } from '@/helpers/recipes';
import { CreateRecipeBody, CreateRecipeResponse } from '@/types/recipe';
import { ImportRecipe, ImportResult, ImportSource } from './ImportRecipe';

type Imported = {
  values: RecipeFormValues;
  needsChecking: boolean;
  // Each import starts the form afresh
  id: number;
};

export function CreateRecipeForm({ importFrom }: { importFrom?: ImportSource }) {
  const router = useRouter();
  const [imported, setImported] = useState<Imported | null>(null);

  // Errors are shown by RecipeForm. The API answers failures with an error status, so axios throws
  const handleSubmit = async (body: CreateRecipeBody) => {
    const res = await axios.post<CreateRecipeResponse>(endpoints.recipes.create, body);
    // Replaces the form in the history, so Back from the new recipe doesn't return to it
    router.replace(recipePath(res.data.data.recipe.id));
  };

  // Replaces anything already typed into the form
  const handleImport = ({ draft, issues }: ImportResult) =>
    setImported((previous) => ({
      values: draftToFormValues(draft),
      needsChecking: issues.length > 0,
      id: (previous?.id ?? 0) + 1,
    }));

  const sourceUrl = imported?.values.sourceUrl;
  const host = sourceHost(sourceUrl);

  return (
    <Stack gap="lg">
      {imported ? (
        <Alert
          color={imported.needsChecking ? 'yellow' : 'blue'}
          icon={<IconFileImport />}
          title="Recipe imported"
        >
          <Stack gap="xs">
            <Text size="sm">
              Filled in from{' '}
              {host && sourceUrl ? (
                <Anchor href={sourceUrl} target="_blank" rel="noopener noreferrer" size="sm">
                  {host}
                </Anchor>
              ) : (
                'your photo'
              )}
              .{' '}
              {imported.needsChecking
                ? "Some details are missing or need choosing: they're highlighted below."
                : 'Check it over, then create it.'}{' '}
              It's set to private, since it's usually someone else's recipe.
            </Text>
            <Group>
              <Button variant="default" size="compact-sm" onClick={() => setImported(null)}>
                Start again
              </Button>
            </Group>
          </Stack>
        </Alert>
      ) : (
        <ImportRecipe initialSource={importFrom} onImport={handleImport} />
      )}

      <RecipeForm
        key={imported?.id ?? 'blank'}
        initialValues={imported?.values}
        highlightErrors={!!imported}
        mergeableSteps={!!imported}
        submitLabel="Create recipe"
        cancelHref={Routes.MY_RECIPES}
        onSubmit={handleSubmit}
      />
    </Stack>
  );
}
