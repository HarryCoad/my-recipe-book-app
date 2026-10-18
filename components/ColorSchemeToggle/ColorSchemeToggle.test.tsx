import { render, screen, userEvent } from '@/test-utils';
import { ColorSchemeToggle } from './ColorSchemeToggle';

describe('Colour scheme toggle', () => {
  it('switches between light and dark', async () => {
    render(<ColorSchemeToggle />);

    await userEvent.click(screen.getByRole('radio', { name: 'Dark' }));
    expect(document.documentElement).toHaveAttribute('data-mantine-color-scheme', 'dark');
    expect(screen.getByRole('radio', { name: 'Dark' })).toBeChecked();

    await userEvent.click(screen.getByRole('radio', { name: 'Light' }));
    expect(document.documentElement).toHaveAttribute('data-mantine-color-scheme', 'light');
    expect(screen.getByRole('radio', { name: 'Light' })).toBeChecked();
  });
});
