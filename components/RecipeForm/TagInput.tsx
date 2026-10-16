'use client';

import { KeyboardEvent, useEffect, useRef, useState } from 'react';
import {
  Combobox,
  Group,
  Loader,
  Pill,
  PillsInput,
  PillsInputProps,
  Text,
  useCombobox,
} from '@mantine/core';
import { useDebouncedValue } from '@mantine/hooks';
import axios from '@/helpers/axios';
import { endpoints } from '@/helpers/endpoints';
import { MAX_TAG_LENGTH, MAX_TAGS, normaliseTag, normaliseTags } from '@/helpers/tags';
import { TagSuggestion, TagSuggestionsResponse } from '@/types/recipe';

// Existing tags matching what's typed, most used first. Failures just mean no suggestions, since
// the user can still type their own tags.
const useTagSuggestions = (search: string, enabled: boolean) => {
  const [debouncedSearch] = useDebouncedValue(normaliseTag(search), 250);
  const [suggestions, setSuggestions] = useState<TagSuggestion[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!enabled) {
      return;
    }
    // Cancelled if the search changes first, so older results can't replace newer ones
    const controller = new AbortController();
    setLoading(true);
    axios
      .get<TagSuggestionsResponse>(endpoints.recipes.tags, {
        params: { search: debouncedSearch || undefined },
        signal: controller.signal,
      })
      .then((res) => setSuggestions(res.data.data.tags))
      .catch(() => {
        if (!controller.signal.aborted) {
          setSuggestions([]);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });
    return () => controller.abort();
  }, [debouncedSearch, enabled]);

  return { suggestions, loading };
};

type TagInputProps = Pick<PillsInputProps, 'label' | 'description' | 'error'> & {
  placeholder?: string;
  value: string[];
  onChange: (tags: string[]) => void;
};

/**
 * Tags with autocomplete from existing tags. The top matching suggestion is highlighted and Tab
 * takes it, like a code editor's autocomplete. Enter (or comma, or leaving the field) adds exactly
 * what was typed, so users can always make their own tag. Once ↑/↓ have moved the highlight,
 * Enter takes the highlighted suggestion instead, since that's a deliberate choice.
 */
export function TagInput({
  label,
  description,
  error,
  placeholder,
  value,
  onChange,
}: TagInputProps) {
  const combobox = useCombobox({
    onDropdownClose: () => combobox.resetSelectedOption(),
  });
  const [search, setSearch] = useState('');
  // Only ask the API once the user is in the field, rather than on every page load
  const [focused, setFocused] = useState(false);
  const { suggestions, loading } = useTagSuggestions(search, focused);
  const counts = new Map(suggestions.map(({ tag, count }) => [tag, count]));

  // Suggestions arrive a moment after typing, so also match them here. Otherwise the list (and
  // Tab) could briefly offer tags from the previous search.
  const typed = normaliseTag(search);
  const options = suggestions
    .map(({ tag }) => tag)
    .filter((tag) => tag.includes(typed) && !value.includes(tag));
  const full = value.length >= MAX_TAGS;

  // Highlight the top match whenever the matches change, so it's clear what Tab will pick.
  // Nothing is highlighted before anything is typed, so Tab can leave the field.
  const optionsKey = options.join('\n');
  // Whether ↑/↓ chose the highlighted option, rather than it being the automatic top match
  const navigated = useRef(false);
  useEffect(() => {
    navigated.current = false;
    if (typed && options.length > 0) {
      combobox.selectFirstOption();
    } else {
      combobox.resetSelectedOption();
    }
    // `combobox` is a new object each render, so it's left out to avoid running every render
  }, [optionsKey, typed]);

  // Stored the way the API will store them: lowercase, single spaces, no duplicates
  const addTags = (...tags: string[]) => {
    onChange(normaliseTags([...value, ...tags]).slice(0, MAX_TAGS));
    setSearch('');
  };
  const removeTag = (tag: string) => onChange(value.filter((t) => t !== tag));

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    const highlighted = combobox.getSelectedOptionIndex() !== -1;

    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      // Combobox moves the highlight itself
      navigated.current = true;
    } else if (
      event.key === 'Tab' &&
      !event.shiftKey &&
      // With nothing typed or chosen, Tab leaves the field as usual
      (typed || navigated.current) &&
      highlighted &&
      !full
    ) {
      event.preventDefault();
      combobox.clickSelectedOption();
    } else if (event.key === 'Enter' && !(navigated.current && highlighted)) {
      // Adds what was typed, and never submits the form. Clearing the highlight stops Combobox,
      // which handles Enter after this, from taking the automatic top match instead.
      event.preventDefault();
      combobox.resetSelectedOption();
      if (typed && !full) {
        addTags(typed);
      }
    } else if (event.key === ',') {
      event.preventDefault();
      if (typed && !full) {
        addTags(typed);
      }
    } else if (event.key === 'Backspace' && search === '' && value.length > 0) {
      event.preventDefault();
      removeTag(value[value.length - 1]);
    }
  };

  return (
    <Combobox
      store={combobox}
      onOptionSubmit={(tag) => {
        if (!full) {
          addTags(tag);
        }
      }}
    >
      <Combobox.DropdownTarget>
        <PillsInput
          label={label}
          description={description}
          error={error}
          onClick={() => combobox.openDropdown()}
          rightSection={loading ? <Loader size="xs" /> : undefined}
        >
          <Pill.Group>
            {value.map((tag) => (
              <Pill key={tag} withRemoveButton onRemove={() => removeTag(tag)}>
                {tag}
              </Pill>
            ))}
            <Combobox.EventsTarget>
              <PillsInput.Field
                value={search}
                placeholder={value.length === 0 ? placeholder : undefined}
                maxLength={MAX_TAG_LENGTH}
                disabled={full}
                onChange={(event) => {
                  setSearch(event.currentTarget.value);
                  combobox.openDropdown();
                }}
                onFocus={() => {
                  setFocused(true);
                  combobox.openDropdown();
                }}
                onBlur={() => {
                  combobox.closeDropdown();
                  // Like other tag inputs, leaving the field keeps what was typed
                  if (typed && !full) {
                    addTags(typed);
                  }
                }}
                onKeyDown={handleKeyDown}
              />
            </Combobox.EventsTarget>
          </Pill.Group>
        </PillsInput>
      </Combobox.DropdownTarget>

      <Combobox.Dropdown hidden={options.length === 0}>
        <Combobox.Options>
          {options.map((tag) => (
            <Combobox.Option value={tag} key={tag}>
              <Group justify="space-between" wrap="nowrap">
                <Text size="sm">{tag}</Text>
                <Text size="xs" c="dimmed">
                  {counts.get(tag)} {counts.get(tag) === 1 ? 'recipe' : 'recipes'}
                </Text>
              </Group>
            </Combobox.Option>
          ))}
        </Combobox.Options>
      </Combobox.Dropdown>
    </Combobox>
  );
}
