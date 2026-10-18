import { RecipeCard } from '@/components/RecipeCard/RecipeCard';
import { SaveRecipeButton } from '@/components/SaveRecipeButton/SaveRecipeButton';
import { recipePath } from '@/helpers/constants';
import { RecipeSearchResult } from '@/types/recipe';

type RecipeListProps = {
  recipes: RecipeSearchResult[];
  // The logged-in user, to tell their own recipes apart
  userId: string;
};

// Recipe cards, each with a save button, except on the user's own recipes: authors always keep
// those saved (the API refuses with AUTHOR_CANT_UNSAVE). Those get a "Your recipe" badge instead
export function RecipeList({ recipes, userId }: RecipeListProps) {
  return (
    <ul style={{ listStyle: 'none', padding: 0, display: 'grid', gap: '1rem' }}>
      {recipes.map((recipe) => {
        const isOwn = recipe.authorId === userId;
        return (
          <li key={recipe.id}>
            <RecipeCard
              recipe={recipe}
              href={recipePath(recipe.id)}
              isOwn={isOwn}
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
  );
}
