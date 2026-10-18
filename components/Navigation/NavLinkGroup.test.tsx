import { IconChefHat } from '@tabler/icons-react';
import { render, screen } from '@/test-utils';
import { NavLinkGroup } from './NavLinkGroup';

let mockPathname = '/';
jest.mock('next/navigation', () => ({ usePathname: () => mockPathname }));

const renderLink = (link: string) =>
  render(<NavLinkGroup icon={IconChefHat} label="My Recipes" link={link} />);

describe('Nav link', () => {
  it.each([
    ['its own page', '/my-recipes', true],
    ['a page inside it', '/my-recipes/new', true],
    ['another page', '/recipes', false],
    ['a page that only starts the same', '/my-recipes-old', false],
  ])('is marked as the current page on %s', (_, pathname, current) => {
    mockPathname = pathname;
    renderLink('/my-recipes');

    const link = screen.getByRole('link', { name: 'My Recipes' });
    if (current) {
      expect(link).toHaveAttribute('aria-current', 'page');
    } else {
      expect(link).not.toHaveAttribute('aria-current');
    }
  });

  it('only marks home on the home page itself', () => {
    mockPathname = '/recipes';
    renderLink('/');
    expect(screen.getByRole('link', { name: 'My Recipes' })).not.toHaveAttribute('aria-current');
  });
});
