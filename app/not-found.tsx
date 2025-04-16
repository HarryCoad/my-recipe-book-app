'use client';

import Link from 'next/link';
import { IconAlertCircle } from '@tabler/icons-react';
import { Button, Container, Text, Title } from '@mantine/core';

export default function NotFoundPage() {
  return (
    <Container size="sm" style={{ textAlign: 'center', marginTop: '10vh' }}>
      <IconAlertCircle size={64} stroke={1.5} style={{ color: '#ff6b6b', marginBottom: '1rem' }} />
      <Title order={1}>404 - Page Not Found</Title>
      <Text size="lg" color="dimmed" mt="md">
        The page you are looking for does not exist. It might have been moved or deleted.
      </Text>
      <Link href="/" passHref>
        <Button mt="lg" size="md" color="blue" variant="filled">
          Go Back Home
        </Button>
      </Link>
    </Container>
  );
}
