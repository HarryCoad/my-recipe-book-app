import Link from 'next/link';
import { redirect } from 'next/navigation';
import styles from './myRecipes.module.scss';
import { IconPlus } from '@tabler/icons-react';
import { Button, Group, Text, Title } from '@mantine/core';
import { RecipeCard } from '@/components/RecipeCard/RecipeCard';
import { RecipePagination } from '@/components/RecipePagination/RecipePagination';
import { SaveRecipeButton } from '@/components/SaveRecipeButton/SaveRecipeButton';
import { recipePath, Routes } from '@/helpers/constants';
import { endpoints } from '@/helpers/endpoints';
import { getSession, serverGet } from '@/helpers/serverApi';
import { RecipeSearchResponse } from '@/types/recipe';
import { OnlyMineSwitch } from './OnlyMineSwitch';

type PageProps = {
  searchParams: Promise<{ page?: string; mine?: string }>;
};

// The user's recipe book: everything they've saved, which includes every recipe they created.
// ?mine=true narrows it to the ones they created.
export default async function MyRecipes({ searchParams }: PageProps) {
  const query = await searchParams;
  const page = Math.max(1, parseInt(query.page ?? '', 10) || 1);
  const onlyMine = query.mine === 'true';
  const { userId } = await getSession();

  const { data: recipes, totalPages } = await serverGet<RecipeSearchResponse>(
    endpoints.recipes.search,
    // Authors always have their own recipes saved, so the saved list has both
    { params: onlyMine ? { authorId: userId, page } : { bOnlySaved: true, page } }
  );

  // Past the last page, e.g. after deleting recipes or editing the URL
  if (recipes.length === 0 && page > 1) {
    const params = new URLSearchParams();
    if (onlyMine) {
      params.set('mine', 'true');
    }
    if (totalPages > 1) {
      params.set('page', String(totalPages));
    }
    const lastPage = params.toString();
    redirect(lastPage ? `${Routes.MY_RECIPES}?${lastPage}` : Routes.MY_RECIPES);
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

      <Group justify="flex-end" mt="md">
        <OnlyMineSwitch onlyMine={onlyMine} />
      </Group>

      {recipes.length === 0 ? (
        <Text ta="center" c="dimmed" mt="xl">
          {onlyMine
            ? `You haven't created any recipes yet. Use "Create recipe" to add your first one.`
            : `Your recipe book is empty. Create a recipe, or save other people's from Find Recipes.`}
        </Text>
      ) : (
        <ul className={styles.list}>
          {recipes.map((recipe) => {
            const isOwn = recipe.authorId === userId;
            return (
              <li key={recipe.id}>
                <RecipeCard
                  recipe={recipe}
                  href={recipePath(recipe.id)}
                  // Only needed while the list mixes in other people's recipes
                  isOwn={isOwn && !onlyMine}
                  // Unsaving takes a recipe out of the book. Authors can't unsave their own
                  action={
                    !isOwn && (
                      <SaveRecipeButton
                        id={recipe.id}
                        title={recipe.title}
                        bSaved={recipe.bSaved}
                        orphaned={recipe.authorName === null}
                      />
                    )
                  }
                />
              </li>
            );
          })}
        </ul>
      )}

      <RecipePagination page={page} totalPages={totalPages} />
    </div>
  );
}
