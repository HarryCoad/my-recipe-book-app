'use client';

import { LoadError } from '@/components/LoadError/LoadError';

// Shown when page.tsx throws for anything other than a missing user (see not-found.tsx)
export default function UserProfileError({ reset }: { reset: () => void }) {
  return <LoadError title="Couldn't load this profile" reset={reset} />;
}
