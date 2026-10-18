'use client';

import { LoadError } from '@/components/LoadError/LoadError';

// Shown when page.tsx throws
export default function MySuggestionsError({ reset }: { reset: () => void }) {
  return <LoadError title="Couldn't load your suggestions" reset={reset} />;
}
