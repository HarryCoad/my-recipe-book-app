import { useState } from 'react';
import axios from '@/helpers/axios';
import { render, screen, userEvent, waitFor } from '@/test-utils';
import { TagInput } from './TagInput';

jest.mock('@/helpers/axios', () => ({
  __esModule: true,
  ...jest.requireActual('@/helpers/axios'),
  default: { get: jest.fn() },
}));
const get = axios.get as jest.Mock;

const suggestions = (...tags: [string, number][]) => ({
  data: { status: 1, data: { tags: tags.map(([tag, count]) => ({ tag, count })) } },
});

// Holds the value like the form does, and shows it so tests can check what would be saved
function Harness({ initial = [] }: { initial?: string[] }) {
  const [tags, setTags] = useState(initial);
  return (
    <>
      <TagInput label="Tags" value={tags} onChange={setTags} />
      <output data-testid="saved">{JSON.stringify(tags)}</output>
    </>
  );
}

const input = () => screen.getByRole('textbox', { name: 'Tags' });
const saved = () => JSON.parse(screen.getByTestId('saved').textContent!);

describe('TagInput', () => {
  beforeEach(() => jest.clearAllMocks());

  it("doesn't ask for suggestions until the field is used", () => {
    render(<Harness />);
    expect(get).not.toHaveBeenCalled();
  });

  it('suggests existing tags as you type, most used first, with their counts', async () => {
    get.mockImplementation((_url, { params }) =>
      Promise.resolve(
        params.search === 'qu'
          ? suggestions(['quick', 12], ['quiche', 1])
          : suggestions(['vegan', 30], ['quick', 12])
      )
    );
    render(<Harness />);

    // Popular tags as soon as the field is focused
    await userEvent.click(input());
    expect(await screen.findByRole('option', { name: /vegan/ })).toHaveTextContent('30 recipes');

    await userEvent.keyboard('Qu');
    await waitFor(() =>
      expect(get).toHaveBeenLastCalledWith('/api/v1/recipes/tags', {
        params: { search: 'qu' },
        signal: expect.any(AbortSignal),
      })
    );
    expect(await screen.findByRole('option', { name: /quiche/ })).toHaveTextContent('1 recipe');
    expect(screen.queryByRole('option', { name: /vegan/ })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('option', { name: /quick/ }));
    expect(saved()).toEqual(['quick']);
  });

  it('Tab picks the top matching suggestion and stays in the field for the next tag', async () => {
    get.mockImplementation((_url, { params }) =>
      Promise.resolve(
        params.search === 'q'
          ? suggestions(['quick', 12], ['quiche', 1])
          : suggestions(['vegan', 30], ['vegetarian', 8])
      )
    );
    render(<Harness />);

    await userEvent.type(input(), 'q');
    await screen.findByRole('option', { name: /quick/ });
    await userEvent.tab();

    expect(saved()).toEqual(['quick']);
    expect(input()).toHaveFocus();
    expect(input()).toHaveValue('');

    // Arrow keys change which suggestion Tab takes
    await userEvent.keyboard('veg');
    await screen.findByRole('option', { name: /vegetarian/ });
    await userEvent.keyboard('{ArrowDown}');
    await userEvent.tab();

    expect(saved()).toEqual(['quick', 'vegetarian']);
  });

  it('Enter adds exactly what was typed, even with a suggestion highlighted', async () => {
    get.mockResolvedValue(suggestions(['quick', 12]));
    render(<Harness />);

    await userEvent.type(input(), 'qu');
    await waitFor(() =>
      expect(screen.getByRole('option', { name: /quick/ })).toHaveAttribute(
        'data-combobox-selected'
      )
    );
    await userEvent.keyboard('{Enter}');

    expect(saved()).toEqual(['qu']);
    expect(input()).toHaveFocus();
  });

  it('Enter takes a suggestion chosen with the arrow keys', async () => {
    get.mockResolvedValue(suggestions(['quick', 12], ['quiche', 1]));
    render(<Harness />);

    await userEvent.type(input(), 'qu');
    await screen.findByRole('option', { name: /quiche/ });
    await userEvent.keyboard('{ArrowDown}{Enter}');
    expect(saved()).toEqual(['quiche']);

    // Typing again goes back to Enter adding the text
    await userEvent.keyboard('qu');
    await screen.findByRole('option', { name: /quick/ });
    await userEvent.keyboard('{Enter}');
    expect(saved()).toEqual(['quiche', 'qu']);
  });

  it('arrow keys and Tab pick from the popular tags before anything is typed', async () => {
    get.mockResolvedValue(suggestions(['vegan', 30], ['quick', 12]));
    render(<Harness />);
    await userEvent.click(input());
    await screen.findByRole('option', { name: /quick/ });

    await userEvent.keyboard('{ArrowDown}{ArrowDown}');
    await userEvent.tab();

    expect(saved()).toEqual(['quick']);
    expect(input()).toHaveFocus();
  });

  it('highlights the top match once suggestions arrive, so you can see what Tab will pick', async () => {
    get.mockImplementation((_url, { params }) =>
      Promise.resolve(params.search ? suggestions(['quick', 12], ['quiche', 1]) : suggestions())
    );
    render(<Harness />);

    await userEvent.type(input(), 'qu');

    await waitFor(() =>
      expect(screen.getByRole('option', { name: /quick/ })).toHaveAttribute(
        'data-combobox-selected'
      )
    );
    expect(screen.getByRole('option', { name: /quiche/ })).not.toHaveAttribute(
      'data-combobox-selected'
    );
  });

  it('comma adds a tag, and Backspace in the empty field removes the last one', async () => {
    get.mockResolvedValue(suggestions());
    render(<Harness />);

    await userEvent.type(input(), 'quick,vegan,');
    expect(saved()).toEqual(['quick', 'vegan']);

    await userEvent.keyboard('{Backspace}');
    expect(saved()).toEqual(['quick']);

    // The pill's ✕ button is for the mouse: Mantine hides it from screen readers and Tab, since
    // Backspace does the same from the keyboard
    await userEvent.click(screen.getByText('quick').parentElement!.querySelector('button')!);
    expect(saved()).toEqual([]);
  });

  it('stops at 10 tags', async () => {
    get.mockResolvedValue(suggestions());
    render(<Harness initial={Array.from({ length: 10 }, (_, i) => `tag ${i}`)} />);

    expect(input()).toBeDisabled();
  });

  it("Tab doesn't pick a suggestion from an earlier search that no longer matches", async () => {
    // Popular tags load on focus, but nothing matches what's typed before new results arrive
    get.mockImplementation((_url, { params }) =>
      params.search ? new Promise(() => {}) : Promise.resolve(suggestions(['vegan', 30]))
    );
    render(<Harness />);
    await userEvent.click(input());
    await screen.findByRole('option', { name: /vegan/ });

    await userEvent.keyboard('weeknight');
    await userEvent.tab();

    // Treated as a new tag of your own, and Tab moves on as normal
    expect(saved()).toEqual(['weeknight']);
    expect(input()).not.toHaveFocus();
  });

  it('Tab with nothing typed leaves the field', async () => {
    get.mockResolvedValue(suggestions(['vegan', 30]));
    render(<Harness />);
    await userEvent.click(input());
    await screen.findByRole('option', { name: /vegan/ });

    await userEvent.tab();

    expect(saved()).toEqual([]);
    expect(input()).not.toHaveFocus();
  });

  it('adds a new tag of your own, cleaned up the way the API stores it', async () => {
    get.mockResolvedValue(suggestions());
    render(<Harness initial={['vegan']} />);

    await userEvent.type(input(), '  Gluten   FREE{Enter}');
    await userEvent.type(input(), 'VEGAN{Enter}');

    expect(saved()).toEqual(['vegan', 'gluten free']);
  });

  it("doesn't suggest tags that are already chosen", async () => {
    get.mockResolvedValue(suggestions(['vegan', 30], ['quick', 12]));
    render(<Harness initial={['vegan']} />);

    await userEvent.click(input());

    expect(await screen.findByRole('option', { name: /quick/ })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /vegan/ })).not.toBeInTheDocument();
  });

  it('still lets you type tags when suggestions fail to load', async () => {
    get.mockRejectedValue(new Error('Network Error'));
    render(<Harness />);

    await userEvent.type(input(), 'weeknight{Enter}');

    expect(saved()).toEqual(['weeknight']);
  });
});
