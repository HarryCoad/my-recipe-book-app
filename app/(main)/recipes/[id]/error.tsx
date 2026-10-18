'use client';

import { LoadError } from '@/components/LoadError/LoadError';

// Shown when page.tsx throws for anything other than a missing recipe (see not-found.tsx)
export default function RecipeError({ reset }: { reset: () => void }) {
  return <LoadError title="Couldn't load this recipe" reset={reset} />;
}
