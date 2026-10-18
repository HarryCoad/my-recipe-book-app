import { render, screen, userEvent } from '@/test-utils';
import { ColorSchemeToggle } from './ColorSchemeToggle';

describe('Colour scheme toggle', () => {
  it('switches between light, dark and the device setting', async () => {
    render(<ColorSchemeToggle />);

    await userEvent.click(screen.getByRole('radio', { name: 'Dark' }));
    expect(document.documentElement).toHaveAttribute('data-mantine-color-scheme', 'dark');
    expect(screen.getByRole('radio', { name: 'Dark' })).toBeChecked();

    await userEvent.click(screen.getByRole('radio', { name: 'Light' }));
    expect(document.documentElement).toHaveAttribute('data-mantine-color-scheme', 'light');

    await userEvent.click(screen.getByRole('radio', { name: 'Match your device' }));
    expect(screen.getByRole('radio', { name: 'Match your device' })).toBeChecked();
  });
});
