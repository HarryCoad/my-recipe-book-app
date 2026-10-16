import { render, screen } from '@/test-utils';
import { Welcome } from './Welcome';

describe('Welcome component', () => {
  it('welcomes the user to My Recipe Book', () => {
    render(<Welcome />);
    // The <br /> between the two parts adds no space to the text
    expect(screen.getByRole('heading')).toHaveTextContent(/Welcome to\s*My Recipe Book/);
  });
});
