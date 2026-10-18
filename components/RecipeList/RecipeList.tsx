import { RecipeCard } from '@/components/RecipeCard/RecipeCard';
import { SaveRecipeButton } from '@/components/SaveRecipeButton/SaveRecipeButton';
import { recipePath } from '@/helpers/constants';
import { RecipeSearchResult } from '@/types/recipe';

type RecipeListProps = {
  recipes: RecipeSearchResult[];
  // The logged-in user, to tell their own recipes apart
  userId: string;
  // Leave off where every recipe is the user's own, where the badge would just be noise
  showOwnBadge?: boolean;
};

// Recipe cards, each with a save button, except on the user's own recipes: authors always keep
// those saved (the API refuses with AUTHOR_CANT_UNSAVE)
export function RecipeList({ recipes, userId, showOwnBadge = true }: RecipeListProps) {
  return (
    <ul style={{ listStyle: 'none', padding: 0, display: 'grid', gap: '1rem' }}>
      {recipes.map((recipe) => {
        const isOwn = recipe.authorId === userId;
        return (
          <li key={recipe.id}>
            <RecipeCard
              recipe={recipe}
              href={recipePath(recipe.id)}
              isOwn={isOwn && showOwnBadge}
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
