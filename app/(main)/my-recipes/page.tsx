import Link from 'next/link';
import { redirect } from 'next/navigation';
import styles from './myRecipes.module.scss';
import { IconPlus } from '@tabler/icons-react';
import { Button, Text, Title } from '@mantine/core';
import { RecipeCard } from '@/components/RecipeCard/RecipeCard';
import { RecipePagination } from '@/components/RecipePagination/RecipePagination';
import { Routes } from '@/helpers/constants';
import { endpoints } from '@/helpers/endpoints';
import { getSession, serverGet } from '@/helpers/serverApi';
import { RecipeSearchResponse } from '@/types/recipe';

type PageProps = {
  searchParams: Promise<{ page?: string }>;
};

export default async function MyRecipes({ searchParams }: PageProps) {
  const page = Math.max(1, parseInt((await searchParams).page ?? '', 10) || 1);
  const { userId } = await getSession();

  const { data: recipes, totalPages } = await serverGet<RecipeSearchResponse>(
    endpoints.recipes.search,
    { params: { authorId: userId, page } }
  );

  // Past the last page, e.g. after deleting recipes or editing the URL
  if (recipes.length === 0 && page > 1) {
    redirect(totalPages > 1 ? `${Routes.MY_RECIPES}?page=${totalPages}` : Routes.MY_RECIPES);
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <Title className={styles.title}>My Recipes</Title>
        <div className={styles.actions}>
          <Button
            component={Link}
            href={Routes.NEW_RECIPE}
            color="orange"
            leftSection={<IconPlus size={18} />}
          >
            Create recipe
          </Button>
        </div>
      </div>

      {recipes.length === 0 ? (
        <Text ta="center" c="dimmed" mt="xl">
          You haven't created any recipes yet. Use "Create recipe" to add your first one.
        </Text>
      ) : (
        <ul className={styles.list}>
          {recipes.map((recipe) => (
            <li key={recipe.id}>
              <RecipeCard recipe={recipe} href={`${Routes.MY_RECIPES}/${recipe.id}`} />
            </li>
          ))}
        </ul>
      )}

      <RecipePagination page={page} totalPages={totalPages} />
    </div>
  );
}
