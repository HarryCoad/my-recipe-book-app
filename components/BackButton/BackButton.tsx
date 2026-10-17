'use client';

import { useRouter } from 'next/navigation';
import { IconArrowLeft } from '@tabler/icons-react';
import { ActionIcon } from '@mantine/core';

// Goes back in the history, or with `href`, replaces this page with that one. Use `href` on pages
// that replaced the one they came from, such as the edit page.
const BackButton = ({ href }: { href?: string }) => {
  const router = useRouter();

  return (
    <ActionIcon
      variant="light"
      aria-label="Back"
      onClick={() => (href ? router.replace(href) : router.back())}
    >
      <IconArrowLeft size={16} className="inline-block mr-1" />
    </ActionIcon>
  );
};

export default BackButton;
