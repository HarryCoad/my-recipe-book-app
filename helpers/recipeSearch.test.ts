import {
  countFilters,
  emptySearch,
  parseRecipeSearch,
  RecipeSearch,
  toSearchParams,
} from '@/helpers/recipeSearch';

describe('recipe search in the URL', () => {
  it('reads every filter, and writes it back the same', () => {
    const query =
      'search=pasta&category=Main&tags=quick%2Cvegan&minTime=15&maxTime=60&minServes=2&maxServes=6&bHideSaved=true&sort=popular&page=3';
    const search = parseRecipeSearch(new URLSearchParams(query));

    expect(search).toEqual<RecipeSearch>({
      search: 'pasta',
      category: 'Main',
      tags: ['quick', 'vegan'],
      minTime: 15,
      maxTime: 60,
      minServes: 2,
      maxServes: 6,
      hideSaved: true,
      sort: 'popular',
      page: 3,
    });
    expect(toSearchParams(search).toString()).toBe(query);
  });

  it('reads the object Next passes to pages', () => {
    expect(parseRecipeSearch({ search: ['soup', 'stew'], page: '2' })).toMatchObject({
      search: 'soup',
      page: 2,
    });
  });

  it('leaves defaults out of the URL', () => {
    expect(toSearchParams(emptySearch).toString()).toBe('');
  });

  it('ignores anything malformed', () => {
    const search = parseRecipeSearch(
      new URLSearchParams('category=Soup&sort=random&page=-1&minTime=abc&maxServes=2.5&tags=,,')
    );
    expect(search).toEqual(emptySearch);
  });

  it('treats the ends of the sliders as no limit', () => {
    expect(
      parseRecipeSearch(new URLSearchParams('minTime=0&maxTime=240&minServes=1&maxServes=12'))
    ).toEqual(emptySearch);
  });

  it('cleans up tags the way the API stores them', () => {
    expect(parseRecipeSearch(new URLSearchParams('tags= Quick ,quick,Gluten  Free')).tags).toEqual([
      'quick',
      'gluten free',
    ]);
  });

  it('counts the filters in use, not the text search or sort', () => {
    expect(countFilters({ ...emptySearch, search: 'pie', sort: 'oldest' })).toBe(0);
    expect(
      countFilters({ ...emptySearch, category: 'Main', minTime: 10, maxTime: 20, hideSaved: true })
    ).toBe(3);
  });
});
