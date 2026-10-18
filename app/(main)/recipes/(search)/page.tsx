import { redirect } from 'next/navigation';
import { Text } from '@mantine/core';
import { RecipeCard } from '@/components/RecipeCard/RecipeCard';
import { RecipePagination } from '@/components/RecipePagination/RecipePagination';
import { SaveRecipeButton } from '@/components/SaveRecipeButton/SaveRecipeButton';
import { recipePath, Routes } from '@/helpers/constants';
import { endpoints } from '@/helpers/endpoints';
import { countFilters, parseRecipeSearch, toSearchParams } from '@/helpers/recipeSearch';
import { getSession, serverGet } from '@/helpers/serverApi';
import { RecipeSearchResponse } from '@/types/recipe';

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

// The results for the search in the URL. The filters above them are in layout.tsx
export default async function RecipeSearchPage({ searchParams }: PageProps) {
  const search = parseRecipeSearch(await searchParams);
  const params = toSearchParams(search);
  const [{ userId }, { data: recipes, totalPages }] = await Promise.all([
    getSession(),
    serverGet<RecipeSearchResponse>(endpoints.recipes.search, { params }),
  ]);

  // Past the last page, e.g. after editing the URL
  if (recipes.length === 0 && search.page > 1) {
    const lastPage = toSearchParams({ ...search, page: totalPages }).toString();
    redirect(lastPage ? `${Routes.RECIPES}?${lastPage}` : Routes.RECIPES);
  }

  if (recipes.length === 0) {
    const narrowed = search.search.trim() !== '' || countFilters(search) > 0;
    return (
      <Text ta="center" c="dimmed" mt="xl">
        {narrowed
          ? 'No recipes match your search. Try different words or fewer filters.'
          : 'There are no recipes yet.'}
      </Text>
    );
  }

  return (
    <>
      <ul style={{ listStyle: 'none', padding: 0, display: 'grid', gap: '1rem' }}>
        {recipes.map((recipe) => {
          const isOwn = recipe.authorId === userId;
          return (
            <li key={recipe.id}>
              <RecipeCard
                recipe={recipe}
                href={recipePath(recipe.id)}
                isOwn={isOwn}
                // Authors always keep their own recipes saved
                action={
                  !isOwn && (
                    <SaveRecipeButton id={recipe.id} title={recipe.title} bSaved={recipe.bSaved} />
                  )
                }
              />
            </li>
          );
        })}
      </ul>
      <RecipePagination page={search.page} totalPages={totalPages} />
    </>
  );
}
