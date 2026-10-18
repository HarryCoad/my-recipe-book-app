'use client';

import { useEffect, useOptimistic, useRef, useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { IconAdjustmentsHorizontal, IconSearch, IconX } from '@tabler/icons-react';
import {
  ActionIcon,
  Badge,
  Button,
  Collapse,
  Group,
  Loader,
  Paper,
  RangeSlider,
  Select,
  SimpleGrid,
  Stack,
  Switch,
  Text,
  TextInput,
} from '@mantine/core';
import { useDebouncedCallback } from '@mantine/hooks';
import { TagInput } from '@/components/RecipeForm/TagInput';
import { Routes } from '@/helpers/constants';
import { convertMinutesToHoursAndMinutes } from '@/helpers/convertMin';
import {
  countFilters,
  parseRecipeSearch,
  RecipeSearch,
  RecipeSort,
  SERVES_RANGE,
  SORT_OPTIONS,
  TIME_RANGE,
  toSearchParams,
} from '@/helpers/recipeSearch';
import { RECIPE_CATEGORIES, RecipeCategory } from '@/types/recipe';

const SEARCH_DELAY = 300;

type Range = [number, number];

// The ends of a slider mean no limit, so they're left out of the search
const toLimits = ([low, high]: Range, { min, max }: { min: number; max: number }) => ({
  low: low > min ? low : undefined,
  high: high < max ? high : undefined,
});

const describeRange = (
  [low, high]: Range,
  { min, max }: { min: number; max: number },
  format: (value: number) => string
) => {
  if (low <= min && high >= max) {
    return 'Any';
  }
  if (high >= max) {
    return `${format(low)} or more`;
  }
  if (low <= min) {
    return `Up to ${format(high)}`;
  }
  return `${format(low)} to ${format(high)}`;
};

const formatTime = (minutes: number) =>
  minutes === 0 ? '0 mins' : convertMinutesToHoursAndMinutes(minutes);

// The search box, sort and filters. Every change replaces the URL rather than adding to the
// history, and the results page renders from the URL on the server.
export function RecipeSearchFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  // The URL only changes once the new results have loaded, so the controls show the change
  // straight away from here. They go back to the URL when it loads, or if it fails.
  const [current, showSearch] = useOptimistic(
    parseRecipeSearch(searchParams),
    (_shown, next: RecipeSearch) => next
  );

  // Read when a debounced search fires, so it builds on the latest changes rather than old ones
  const latest = useRef(current);
  latest.current = current;

  const update = (changes: Partial<RecipeSearch>) => {
    // Any change could leave fewer pages, so it starts again from the first
    const next = { ...latest.current, ...changes, page: 1 };
    latest.current = next;
    const query = toSearchParams(next).toString();
    startTransition(() => {
      showSearch(next);
      router.replace(query ? `${Routes.RECIPES}?${query}` : Routes.RECIPES, { scroll: false });
    });
  };

  // Text and sliders are held here while typing or dragging, and sent once the user pauses
  const [text, setText] = useState(current.search);
  const sentText = useRef(current.search);
  // What's in the box now. A delayed search for older text, such as from before "Clear search",
  // is skipped
  const typedText = useRef(current.search);
  const sendText = useDebouncedCallback((value: string) => {
    if (value !== typedText.current) {
      return;
    }
    sentText.current = value.trim();
    update({ search: value });
  }, SEARCH_DELAY);
  const changeText = (value: string, { immediately = false } = {}) => {
    setText(value);
    typedText.current = value;
    if (immediately) {
      sentText.current = value.trim();
      update({ search: value });
    } else {
      sendText(value);
    }
  };

  const timeValue: Range = [current.minTime ?? TIME_RANGE.min, current.maxTime ?? TIME_RANGE.max];
  const servesValue: Range = [
    current.minServes ?? SERVES_RANGE.min,
    current.maxServes ?? SERVES_RANGE.max,
  ];
  const [time, setTime] = useState<Range>(timeValue);
  const [serves, setServes] = useState<Range>(servesValue);

  // When the URL changes some other way, such as Back or "Clear filters", show what it says
  useEffect(() => {
    if (current.search !== sentText.current) {
      sentText.current = current.search;
      typedText.current = current.search;
      setText(current.search);
    }
  }, [current.search]);
  useEffect(() => setTime(timeValue), [timeValue[0], timeValue[1]]);
  useEffect(() => setServes(servesValue), [servesValue[0], servesValue[1]]);

  const filterCount = countFilters(current);
  const [filtersOpen, setFiltersOpen] = useState(filterCount > 0);

  return (
    <Stack gap="sm" mt="lg" mb="lg">
      <Group gap="sm" align="flex-end">
        <TextInput
          style={{ flex: 1, minWidth: 200 }}
          aria-label="Search recipes"
          placeholder="Search by title or description"
          leftSection={<IconSearch size={16} />}
          rightSection={
            pending ? (
              <Loader size="xs" color="orange" />
            ) : (
              text && (
                <ActionIcon
                  variant="subtle"
                  color="gray"
                  aria-label="Clear search"
                  onClick={() => changeText('', { immediately: true })}
                >
                  <IconX size={14} />
                </ActionIcon>
              )
            )
          }
          value={text}
          onChange={(event) => changeText(event.currentTarget.value)}
          // Enter searches straight away rather than waiting for the pause
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              changeText(event.currentTarget.value, { immediately: true });
            }
          }}
        />
        <Select
          w={150}
          aria-label="Sort by"
          data={SORT_OPTIONS}
          value={current.sort}
          allowDeselect={false}
          onChange={(value) => value && update({ sort: value as RecipeSort })}
        />
        <Button
          variant={filtersOpen ? 'light' : 'default'}
          color="orange"
          leftSection={<IconAdjustmentsHorizontal size={16} />}
          rightSection={
            filterCount > 0 && (
              <Badge size="sm" circle color="orange">
                {filterCount}
              </Badge>
            )
          }
          aria-expanded={filtersOpen}
          aria-controls="recipe-filters"
          onClick={() => setFiltersOpen((open) => !open)}
        >
          Filters
        </Button>
      </Group>

      <Collapse in={filtersOpen} id="recipe-filters">
        <Paper withBorder p="md" radius="md">
          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="lg" verticalSpacing="lg">
            <Select
              label="Category"
              placeholder="Any category"
              data={RECIPE_CATEGORIES}
              value={current.category}
              clearable
              onChange={(value) => update({ category: value as RecipeCategory | null })}
            />
            <TagInput
              label="Tags"
              description="Recipes with all of these tags"
              placeholder="e.g. vegan, quick"
              value={current.tags}
              onChange={(tags) => update({ tags })}
            />
            <div>
              <Group justify="space-between" mb={6}>
                <Text size="sm" fw={500}>
                  Total time
                </Text>
                <Text size="sm" c="dimmed">
                  {describeRange(time, TIME_RANGE, formatTime)}
                </Text>
              </Group>
              <RangeSlider
                color="orange"
                {...TIME_RANGE}
                minRange={TIME_RANGE.step}
                value={time}
                onChange={setTime}
                onChangeEnd={(range) => {
                  const { low, high } = toLimits(range, TIME_RANGE);
                  update({ minTime: low, maxTime: high });
                }}
                label={(value) => (value >= TIME_RANGE.max ? 'Any' : formatTime(value))}
                thumbFromLabel="Shortest total time"
                thumbToLabel="Longest total time"
              />
            </div>
            <div>
              <Group justify="space-between" mb={6}>
                <Text size="sm" fw={500}>
                  Serves
                </Text>
                <Text size="sm" c="dimmed">
                  {describeRange(serves, SERVES_RANGE, String)}
                </Text>
              </Group>
              <RangeSlider
                color="orange"
                {...SERVES_RANGE}
                minRange={0}
                value={serves}
                onChange={setServes}
                onChangeEnd={(range) => {
                  const { low, high } = toLimits(range, SERVES_RANGE);
                  update({ minServes: low, maxServes: high });
                }}
                label={(value) => (value >= SERVES_RANGE.max ? `${value}+` : value)}
                thumbFromLabel="Fewest servings"
                thumbToLabel="Most servings"
              />
            </div>
            <Switch
              label="Hide saved recipes"
              description="Only show recipes you haven't saved yet, so your own are hidden too"
              checked={current.hideSaved}
              onChange={(event) => update({ hideSaved: event.currentTarget.checked })}
            />
          </SimpleGrid>
          {filterCount > 0 && (
            <Group justify="flex-end" mt="md">
              <Button
                variant="subtle"
                color="gray"
                size="compact-sm"
                onClick={() =>
                  update({
                    category: null,
                    tags: [],
                    minTime: undefined,
                    maxTime: undefined,
                    minServes: undefined,
                    maxServes: undefined,
                    hideSaved: false,
                  })
                }
              >
                Clear filters
              </Button>
            </Group>
          )}
        </Paper>
      </Collapse>
    </Stack>
  );
}
