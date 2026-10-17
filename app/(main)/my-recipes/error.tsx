'use client';

import { LoadError } from '@/components/LoadError/LoadError';

// Shown when page.tsx throws
export default function MyRecipesError({ reset }: { reset: () => void }) {
  return <LoadError title="Couldn't load your recipes" reset={reset} />;
}
