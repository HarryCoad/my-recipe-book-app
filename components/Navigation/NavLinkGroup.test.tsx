import { IconChefHat } from '@tabler/icons-react';
import { render, screen, userEvent } from '@/test-utils';
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

describe('Choosing a nav link', () => {
  // jsdom can't follow links, so they stay put once their click handlers have run
  const stayPut = (event: Event) => event.preventDefault();
  beforeEach(() => document.addEventListener('click', stayPut));
  afterEach(() => document.removeEventListener('click', stayPut));

  it('lets the menu know, so the mobile menu can close', async () => {
    mockPathname = '/';
    const onNavigate = jest.fn();
    render(
      <NavLinkGroup
        icon={IconChefHat}
        label="My Recipes"
        link="/my-recipes"
        onNavigate={onNavigate}
      />
    );

    await userEvent.click(screen.getByRole('link', { name: 'My Recipes' }));
    expect(onNavigate).toHaveBeenCalledTimes(1);
  });

  it("does so for a group's links, but not for its heading, which only opens the group", async () => {
    const onNavigate = jest.fn();
    render(
      <NavLinkGroup
        icon={IconChefHat}
        label="Security"
        links={[{ label: 'Change password', link: '/security/change-password' }]}
        onNavigate={onNavigate}
      />
    );

    await userEvent.click(screen.getByRole('button', { name: 'Security' }));
    expect(onNavigate).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole('link', { name: 'Change password' }));
    expect(onNavigate).toHaveBeenCalledTimes(1);
  });
});
