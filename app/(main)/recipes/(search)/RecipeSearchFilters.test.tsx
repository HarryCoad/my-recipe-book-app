import axios from '@/helpers/axios';
import { act, render, screen, userEvent, waitFor } from '@/test-utils';
import { RecipeSearchFilters } from './RecipeSearchFilters';

const replace = jest.fn();
let mockQuery = '';
jest.mock('next/navigation', () => ({
  useRouter: () => ({ replace }),
  useSearchParams: () => new URLSearchParams(mockQuery),
}));
jest.mock('@/helpers/axios', () => ({
  __esModule: true,
  ...jest.requireActual('@/helpers/axios'),
  default: { get: jest.fn() },
}));
// Tag suggestions, tested in TagInput.test.tsx
const get = axios.get as jest.Mock;

const searchBox = () => screen.getByRole('textbox', { name: 'Search recipes' });

describe('Recipe search filters', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockQuery = '';
    get.mockResolvedValue({ data: { status: 1, data: { tags: [] } } });
  });

  it('searches once typing pauses, replacing the URL', async () => {
    render(<RecipeSearchFilters />);
    await userEvent.type(searchBox(), 'pasta');

    await waitFor(() =>
      expect(replace).toHaveBeenCalledWith('/recipes?search=pasta', { scroll: false })
    );
    // Not once per letter
    expect(replace).toHaveBeenCalledTimes(1);
  });

  it('Enter searches straight away', async () => {
    render(<RecipeSearchFilters />);
    await userEvent.type(searchBox(), 'soup{Enter}');
    expect(replace).toHaveBeenCalledWith('/recipes?search=soup', { scroll: false });
  });

  it('keeps the other filters and goes back to page 1 when something changes', async () => {
    mockQuery = 'category=Main&page=3';
    render(<RecipeSearchFilters />);

    await userEvent.click(screen.getByRole('textbox', { name: 'Sort by' }));
    await userEvent.click(screen.getByRole('option', { name: 'Most saved' }));

    expect(replace).toHaveBeenCalledWith('/recipes?category=Main&sort=popular', { scroll: false });
  });

  it('opens with the filters showing when some are in use, and counts them', () => {
    mockQuery = 'category=Main&bHideSaved=true';
    render(<RecipeSearchFilters />);

    const toggle = screen.getByRole('button', { name: /Filters/ });
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(toggle).toHaveTextContent('2');
    expect(screen.getByRole('switch', { name: /^Hide saved recipes/ })).toBeChecked();
  });

  it('hides saved recipes', async () => {
    render(<RecipeSearchFilters />);
    await userEvent.click(screen.getByRole('button', { name: /Filters/ }));
    await userEvent.click(screen.getByRole('switch', { name: /^Hide saved recipes/ }));

    expect(replace).toHaveBeenCalledWith('/recipes?bHideSaved=true', { scroll: false });
  });

  it('describes the slider ranges and moves them from the keyboard', async () => {
    mockQuery = 'maxTime=60&minServes=4';
    render(<RecipeSearchFilters />);

    expect(screen.getByText('Up to 1hr')).toBeVisible();
    expect(screen.getByText('4 or more')).toBeVisible();

    // The upper time handle, one step down
    act(() => screen.getByRole('slider', { name: 'Longest total time' }).focus());
    await userEvent.keyboard('{ArrowLeft}');

    expect(replace).toHaveBeenCalledWith('/recipes?maxTime=55&minServes=4', { scroll: false });
  });

  it('clears the filters but keeps the search and sort', async () => {
    mockQuery = 'search=pie&category=Main&tags=quick&sort=oldest';
    render(<RecipeSearchFilters />);
    await userEvent.click(screen.getByRole('button', { name: 'Clear filters' }));

    expect(replace).toHaveBeenCalledWith('/recipes?search=pie&sort=oldest', { scroll: false });
  });
});
