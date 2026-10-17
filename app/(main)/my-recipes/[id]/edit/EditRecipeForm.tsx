'use client';

import { useRouter } from 'next/navigation';
import { RecipeForm } from '@/components/RecipeForm/RecipeForm';
import { recipeToFormValues } from '@/components/RecipeForm/recipeFormSchema';
import axios from '@/helpers/axios';
import { Routes } from '@/helpers/constants';
import { endpoints } from '@/helpers/endpoints';
import {
  CreateRecipeBody,
  Recipe,
  UpdateOwnRecipeBody,
  UpdateOwnRecipeResponse,
} from '@/types/recipe';

export function EditRecipeForm({ recipe }: { recipe: Recipe }) {
  const router = useRouter();
  const recipeHref = `${Routes.MY_RECIPES}/${recipe.id}`;

  // Errors are shown by RecipeForm. The API answers failures with an error status, so axios throws
  const handleSubmit = async (body: CreateRecipeBody) => {
    const update: UpdateOwnRecipeBody = { id: recipe.id, ...body };
    await axios.patch<UpdateOwnRecipeResponse>(endpoints.recipes.updateOwn, update);
    // The recipe page renders on the server, so it will show the changes
    router.push(recipeHref);
  };

  return (
    <RecipeForm
      initialValues={recipeToFormValues(recipe)}
      submitLabel="Save changes"
      cancelHref={recipeHref}
      onSubmit={handleSubmit}
    />
  );
}
