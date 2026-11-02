import { render, screen, userEvent } from '@/test-utils';
import CoreLayout from './CoreLayout';

jest.mock('next/navigation', () => ({
  usePathname: () => '/',
  useRouter: () => ({ replace: jest.fn(), push: jest.fn() }),
}));

describe('Core layout', () => {
  // jsdom can't follow links, so they stay put once their click handlers have run
  const stayPut = (event: Event) => event.preventDefault();
  beforeEach(() => document.addEventListener('click', stayPut));
  afterEach(() => document.removeEventListener('click', stayPut));

  it('closes the mobile menu once a page is chosen, so the page can be seen', async () => {
    render(
      <CoreLayout>
        <p>Page</p>
      </CoreLayout>
    );

    await userEvent.click(screen.getByRole('button', { name: 'Open menu' }));
    expect(screen.getByRole('button', { name: 'Close menu' })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('link', { name: 'My Recipes' }));
    expect(screen.getByRole('button', { name: 'Open menu' })).toBeInTheDocument();
  });
});
