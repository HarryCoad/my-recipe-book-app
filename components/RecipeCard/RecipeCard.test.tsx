import { render, screen, within } from '@/test-utils';
import { RecipeSearchResult } from '@/types/recipe';
import { RecipeCard } from './RecipeCard';

jest.mock('next/navigation', () => ({ useRouter: () => ({ refresh: jest.fn() }) }));

const recipe: RecipeSearchResult = {
  id: 'r1',
  authorId: 'alice-id',
  authorName: 'alice',
  bPrivate: false,
  bAllowSuggestions: false,
  title: 'Lentil soup',
  description: 'Warming and cheap.',
  category: 'Main',
  serves: 4,
  prepTime: 10,
  cookTime: 30,
  ingredients: [],
  steps: [],
  tags: ['vegan', 'quick', 'soup'],
  bSaved: false,
  savedCount: 1,
  bDeleted: false,
  pendingSuggestions: 0,
};

describe('Recipe card', () => {
  it('opens the recipe from its title, which the whole card stretches', () => {
    render(<RecipeCard recipe={recipe} href="/recipes/r1" />);

    const links = screen.getAllByRole('link');
    // One link, named by the title rather than everything on the card
    expect(links).toHaveLength(1);
    expect(links[0]).toHaveAccessibleName('Lentil soup');
    expect(links[0]).toHaveAttribute('href', '/recipes/r1');
    // Only looks like a button, so it isn't a second thing to tab to
    expect(screen.queryByRole('button', { name: /view recipe/i })).not.toBeInTheDocument();
    expect(screen.getByText('View recipe').closest('[aria-hidden="true"]')).not.toBeNull();
  });

  it('shows the description and stats, with what each number is', () => {
    render(<RecipeCard recipe={recipe} href="/recipes/r1" />);

    expect(screen.getByText('Warming and cheap.')).toBeVisible();
    expect(screen.getByText('Main')).toBeVisible();
    expect(screen.getByTitle('Prep time')).toHaveTextContent('Prep10mins');
    expect(screen.getByTitle('Cook time')).toHaveTextContent('Cook30mins');
    expect(screen.getByTitle('Serves')).toHaveTextContent('Serves4');
  });

  it('leaves out prep time when there is none', () => {
    render(<RecipeCard recipe={{ ...recipe, prepTime: null }} href="/recipes/r1" />);
    expect(screen.queryByTitle('Prep time')).not.toBeInTheDocument();
  });

  it('shows 3 tags, and counts the rest', () => {
    render(
      <RecipeCard
        recipe={{ ...recipe, tags: ['vegan', 'quick', 'soup', 'winter', 'cheap'] }}
        href="/recipes/r1"
      />
    );

    expect(screen.getByText('soup')).toBeVisible();
    expect(screen.queryByText('winter')).not.toBeInTheDocument();
    const more = screen.getByTitle('winter, cheap');
    expect(more).toHaveTextContent('+2 more tags');
  });

  it("doesn't count tags when there are 3 or fewer", () => {
    render(<RecipeCard recipe={recipe} href="/recipes/r1" />);
    expect(screen.queryByText(/^\+/)).not.toBeInTheDocument();
  });

  it('keeps its buttons separate from the link, so they can still be used', () => {
    render(
      <RecipeCard
        recipe={{ ...recipe, pendingSuggestions: 2 }}
        href="/recipes/r1"
        isOwn
        action={<button type="button">Save recipe</button>}
      />
    );

    const titleLink = screen.getByRole('link', { name: 'Lentil soup' });
    const save = screen.getByRole('button', { name: 'Save recipe' });
    const review = screen.getByRole('link', { name: '2 suggestions waiting for review' });
    expect(titleLink).not.toContainElement(save);
    expect(titleLink).not.toContainElement(review);
    expect(within(screen.getByRole('article')).getByText('Your recipe')).toBeVisible();
  });
});
