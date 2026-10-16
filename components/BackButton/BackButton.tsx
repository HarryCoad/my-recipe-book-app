'use client';

import { useRouter } from 'next/navigation';
import { IconArrowLeft } from '@tabler/icons-react';
import { ActionIcon } from '@mantine/core';

const BackButton = () => {
  const router = useRouter();

  return (
    <ActionIcon variant="light" onClick={() => router.back()}>
      <IconArrowLeft size={16} className="inline-block mr-1" />
    </ActionIcon>
  );
};

export default BackButton;
