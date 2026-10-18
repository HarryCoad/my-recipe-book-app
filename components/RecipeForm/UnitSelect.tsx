'use client';

import { ComboboxItem, OptionsFilter, Select, SelectProps } from '@mantine/core';
import { UNITS } from '@/types/recipe';

const startingWith = (search: string) => UNITS.find((unit) => unit.startsWith(search));

// The unit typed so far: an exact match, otherwise the first unit starting with it (so "tb" is
// tbsp). Plurals work too, so "cups" is cup
export const matchUnit = (text: string) => {
  const search = text.trim().toLowerCase().replace(/\s+/g, ' ');
  if (!search) {
    return null;
  }
  // "slices" less an "s", or "pinches" less "es"
  const singulars = [search.replace(/s$/, ''), search.replace(/es$/, '')];
  return (
    UNITS.find((unit) => unit === search) ??
    startingWith(search) ??
    UNITS.find((unit) => singulars.includes(unit)) ??
    null
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

// A unit dropdown you can type into. Leaving it (e.g. with Tab) picks the unit typed, and leaving
// it empty means no unit: a count like "2 eggs", or no amount at all.
export function UnitSelect({ value, onChange, onBlur, ...props }: UnitSelectProps) {
  // A unit that isn't ours, such as an imported "handful", is shown so its error makes sense
  const data =
    value && !(UNITS as readonly string[]).includes(value) ? [...UNITS, value] : [...UNITS];

  return (
    <Select
      {...props}
      data={data}
      searchable
      selectFirstOptionOnChange
      filter={startsWith}
      value={value}
      onChange={onChange}
      onBlur={(event) => {
        // Still holds what was typed, before Select resets it to the chosen unit
        const typed = event.currentTarget.value;
        if (typed !== (value ?? '')) {
          if (!typed.trim()) {
            onChange(null);
          } else {
            const match = matchUnit(typed);
            if (match) {
              onChange(match);
            }
          }
        }
        onBlur?.(event);
      }}
    />
  );
}
