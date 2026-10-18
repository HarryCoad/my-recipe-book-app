'use client';

import { LoadError } from '@/components/LoadError/LoadError';

// Shown under the filters when page.tsx throws, so the search can still be changed
export default function RecipeSearchError({ reset }: { reset: () => void }) {
  return <LoadError title="Couldn't load recipes" reset={reset} />;
}
