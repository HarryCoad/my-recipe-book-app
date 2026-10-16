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
    await axios.post<CreateRecipeResponse>(endpoints.recipes.create, body);
    // My Recipes renders on the server, so it will include the new recipe
    router.push(Routes.MY_RECIPES);
  };

  return (
    <RecipeForm
      submitLabel="Create recipe"
      cancelHref={Routes.MY_RECIPES}
      onSubmit={handleSubmit}
    />
  );
}
