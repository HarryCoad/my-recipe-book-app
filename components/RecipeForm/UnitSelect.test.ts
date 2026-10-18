import { matchUnit } from './UnitSelect';

describe('matchUnit', () => {
  it('prefers an exact match, so "g" is grams rather than kg', () => {
    expect(matchUnit('g')).toBe('g');
    expect(matchUnit(' KG ')).toBe('kg');
    expect(matchUnit('fl  oz')).toBe('fl oz');
  });

  it('otherwise takes the first unit starting with the text, in list order', () => {
    expect(matchUnit('tb')).toBe('tbsp');
    expect(matchUnit('t')).toBe('tsp');
    expect(matchUnit('m')).toBe('ml');
    expect(matchUnit('med')).toBe('medium');
    expect(matchUnit('cu')).toBe('cup');
  });

  it('understands plurals', () => {
    expect(matchUnit('cups')).toBe('cup');
    expect(matchUnit('pinches')).toBe('pinch');
    expect(matchUnit('slices')).toBe('slice');
  });

  it('matches nothing for empty or unknown text', () => {
    expect(matchUnit('')).toBeNull();
    expect(matchUnit('handful')).toBeNull();
  });
});
