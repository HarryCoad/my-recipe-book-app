'use client';

import { useMemo } from 'react';
import { IconFileImport } from '@tabler/icons-react';
import { Alert, Paper, Title } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { RecipeForm } from '@/components/RecipeForm/RecipeForm';
import { draftToFormValues } from '@/components/RecipeForm/recipeFormSchema';
import axios from '@/helpers/axios';
import { endpoints } from '@/helpers/endpoints';
import { QueueItem } from '@/helpers/importQueue';
import { CreateRecipeBody, CreateRecipeResponse } from '@/types/recipe';
import { describeJob } from './QueueList';

type ReviewDraftProps = {
  item: QueueItem;
  onCreated: (recipe: { id: string; title: string }) => void;
  onClose: () => void;
};

// One imported draft in the create form, with what needs fixing highlighted, as in a single
// import. The body includes the draft's sourceImageHash, so its photos are recognised again
export function ReviewDraft({ item, onCreated, onClose }: ReviewDraftProps) {
  const values = useMemo(() => draftToFormValues(item.draft!), [item.draft]);

  const handleSubmit = async (body: CreateRecipeBody) => {
    const res = await axios.post<CreateRecipeResponse>(endpoints.recipes.create, body);
    const { id, title } = res.data.data.recipe;
    notifications.show({ color: 'green', message: `Created "${title}"` });
    onCreated({ id, title });
  };

  return (
    <Paper withBorder p="md" radius="md">
      <Title order={2} size="h4" mb="sm">
        Review {item.draft?.title || 'the imported recipe'}
      </Title>
      <Alert color="yellow" icon={<IconFileImport />} mb="md">
        From {describeJob(item.job)}. Some details are missing or need choosing: they're highlighted
        below. The rest of the import carries on while you review.
      </Alert>
      <RecipeForm
        // A fresh form for each draft
        key={item.id}
        initialValues={values}
        highlightErrors
        mergeableSteps
        submitLabel="Create recipe"
        onCancel={onClose}
        onSubmit={handleSubmit}
      />
    </Paper>
  );
}
