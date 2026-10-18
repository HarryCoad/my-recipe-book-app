import { render, screen } from '@/test-utils';
import { Edit, Recipe } from '@/types/recipe';
import { SuggestionChanges } from './SuggestionChanges';

const recipe: Pick<Recipe, 'ingredients' | 'steps' | 'tags'> = {
  ingredients: [
    { id: 'i1', subheader: null, quantity: 400, unit: 'g', name: 'spaghetti' },
    { id: 'i2', subheader: 'Sauce', quantity: 3, unit: 'cloves', name: 'garlic' },
  ],
  steps: ['Boil the pasta', 'Make the sauce'],
  tags: ['quick', 'italian'],
};

const unchanged: Pick<Edit, 'ingredients' | 'steps' | 'tags'> = { ingredients: [], steps: [] };

// A line or tag as screen readers hear it, e.g. "Added: 5g basil"
const spoken = (match: (element: Element) => boolean) => (text: string) =>
  screen.getByText((_, element) => !!element && match(element) && element.textContent === text);
const line = spoken((element) => element.tagName === 'LI');
const tag = spoken((element) => element.classList.contains('mantine-Badge-root'));

describe('Suggestion changes', () => {
  it('shows ingredients added and removed, including headings', () => {
    render(
      <SuggestionChanges
        recipe={recipe}
        suggestion={{
          ...unchanged,
          ingredients: [
            { subheader: null, quantity: 400, unit: 'g', name: 'spaghetti' },
            { subheader: 'Sauce', quantity: 4, unit: 'cloves', name: 'garlic' },
            { subheader: 'To serve', quantity: 5, unit: 'g', name: 'basil' },
          ],
        }}
      />
    );

    expect(line('400g spaghetti')).toBeVisible();
    expect(line('Removed: 3 cloves garlic')).toBeVisible();
    expect(line('Added: 4 cloves garlic')).toBeVisible();
    expect(line('Added: To serve')).toBeVisible();
    expect(line('Added: 5g basil')).toBeVisible();
    // Parts the suggestion doesn't touch aren't shown
    expect(screen.queryByRole('heading', { name: 'Method' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Tags' })).not.toBeInTheDocument();
  });

  it('shows steps and tags that changed', () => {
    render(
      <SuggestionChanges
        recipe={recipe}
        suggestion={{ ingredients: [], steps: ['Boil the pasta'], tags: ['quick', 'vegan'] }}
      />
    );

    expect(line('Boil the pasta')).toBeVisible();
    expect(line('Removed: Make the sauce')).toBeVisible();
    expect(tag('Removed: italian')).toHaveStyle({ textDecoration: 'line-through' });
    expect(tag('Added: vegan')).toBeVisible();
    expect(tag('quick')).toBeVisible();
  });

  it("says when a part already matches the recipe, e.g. after another suggestion's accepted", () => {
    render(
      <SuggestionChanges recipe={recipe} suggestion={{ ...unchanged, steps: recipe.steps }} />
    );
    expect(screen.getByText('Already the same as the recipe.')).toBeVisible();
  });
});
