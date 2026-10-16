'use client';

import { startTransition } from 'react';
import { useRouter } from 'next/navigation';
import { IconAlertCircle } from '@tabler/icons-react';
import { Alert, Button, Container } from '@mantine/core';

type ErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

// Shown when page.tsx throws. In production Next hides server error details from the browser,
// so this can't say what went wrong, only offer to retry.
export default function MyRecipesError({ reset }: ErrorProps) {
  const router = useRouter();

  // reset() alone re-renders with the same failed server result, so fetch it again first
  const retry = () =>
    startTransition(() => {
      router.refresh();
      reset();
    });

  return (
    <Container size="sm" mt="xl">
      <Alert color="red" icon={<IconAlertCircle />} title="Couldn't load your recipes">
        Something went wrong. Please try again.
        <Button display="block" mt="sm" size="xs" variant="outline" color="red" onClick={retry}>
          Try again
        </Button>
      </Alert>
    </Container>
  );
}
