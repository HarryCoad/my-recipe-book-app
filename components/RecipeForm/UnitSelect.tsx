'use client';

import { ComboboxItem, OptionsFilter, Select, SelectProps } from '@mantine/core';
import { UNITS } from '@/types/recipe';

// The unit typed so far: an exact match, otherwise the first unit starting with it (so "tb" is tbsp)
export const matchUnit = (text: string) => {
  const search = text.trim().toLowerCase();
  if (!search) {
    return null;
  }
  return (
    UNITS.find((unit) => unit === search) ?? UNITS.find((unit) => unit.startsWith(search)) ?? null
  );
};

// Matches how matchUnit picks, so the highlighted option is the one Tab will choose
const startsWith: OptionsFilter = ({ options, search }) =>
  (options as ComboboxItem[]).filter((option) =>
    option.label.toLowerCase().startsWith(search.trim().toLowerCase())
  );

type UnitSelectProps = Omit<SelectProps, 'data' | 'value' | 'onChange'> & {
  value: string | null;
  onChange: (value: string | null) => void;
};

// A unit dropdown you can type into. Leaving it (e.g. with Tab) picks the unit typed.
export function UnitSelect({ value, onChange, onBlur, ...props }: UnitSelectProps) {
  return (
    <Select
      {...props}
      data={UNITS}
      searchable
      selectFirstOptionOnChange
      filter={startsWith}
      value={value}
      onChange={onChange}
      onBlur={(event) => {
        // Still holds what was typed, before Select resets it to the chosen unit
        const typed = event.currentTarget.value;
        const match = matchUnit(typed);
        if (typed !== (value ?? '') && match) {
          onChange(match);
        }
        onBlur?.(event);
      }}
    />
  );
}
