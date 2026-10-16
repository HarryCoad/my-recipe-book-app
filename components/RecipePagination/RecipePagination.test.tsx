import { render, screen } from '@/test-utils';
import { RecipePagination } from './RecipePagination';

let search = '';
jest.mock('next/navigation', () => ({
  usePathname: () => '/my-recipes',
  useSearchParams: () => new URLSearchParams(search),
}));

describe('RecipePagination', () => {
  beforeEach(() => {
    search = '';
  });

  it('renders nothing for a single page', () => {
    render(<RecipePagination page={1} totalPages={1} />);
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('links each page to ?page=N, with page 1 at the plain URL', () => {
    search = 'page=2';
    render(<RecipePagination page={2} totalPages={3} />);

    expect(screen.getByRole('link', { name: '1' })).toHaveAttribute('href', '/my-recipes');
    expect(screen.getByRole('link', { name: '3' })).toHaveAttribute('href', '/my-recipes?page=3');
    // Previous and next arrows
    const links = screen.getAllByRole('link').map((link) => link.getAttribute('href'));
    expect(links[0]).toBe('/my-recipes');
    expect(links[links.length - 1]).toBe('/my-recipes?page=3');
  });

  it('keeps other query params', () => {
    search = 'sort=title';
    render(<RecipePagination page={1} totalPages={2} />);

    expect(screen.getByRole('link', { name: '2' })).toHaveAttribute(
      'href',
      '/my-recipes?sort=title&page=2'
    );
  });
});
