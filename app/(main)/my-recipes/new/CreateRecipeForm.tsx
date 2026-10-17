'use client';

import { useRouter } from 'next/navigation';
import { RecipeForm } from '@/components/RecipeForm/RecipeForm';
import axios from '@/helpers/axios';
import { Routes } from '@/helpers/constants';
import { endpoints } from '@/helpers/endpoints';
import { CreateRecipeBody, CreateRecipeResponse } from '@/types/recipe';

export function CreateRecipeForm() {
  const router = useRouter();

  // Errors are shown by RecipeForm. The API answers failures with an error status, so axios throws
  const handleSubmit = async (body: CreateRecipeBody) => {
    const res = await axios.post<CreateRecipeResponse>(endpoints.recipes.create, body);
    // Replaces the form in the history, so Back from the new recipe doesn't return to it
    router.replace(`${Routes.MY_RECIPES}/${res.data.data.recipe.id}`);
  };

  return (
    <RecipeForm
      submitLabel="Create recipe"
      cancelHref={Routes.MY_RECIPES}
      onSubmit={handleSubmit}
    />
  );
}
