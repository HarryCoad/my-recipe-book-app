'use client';

import '@mantine/core/styles.css';

import { AppShell, Burger, Code, Group } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { Logo } from '@/public/Logo';
import { NavBar } from '../Navigation/NavBar';

export default function CoreLayout({ children }: { children: any }) {
  const [opened, { toggle }] = useDisclosure();

  return (
    <>
      <AppShell
        header={{ height: 60 }}
        navbar={{
          width: 300,
          breakpoint: 'sm',
          collapsed: { mobile: !opened, desktop: !opened },
        }}
        padding="md"
      >
        <AppShell.Header>
          <Group align="center" pl="md" style={{ height: '100%' }}>
            <Burger opened={opened} onClick={toggle} size="md" />
            <Logo style={{ width: 120 }} />
            <Code fw={700}>v3.1.2</Code>
          </Group>
        </AppShell.Header>

        <AppShell.Navbar>
          <NavBar />
        </AppShell.Navbar>

        <AppShell.Main>{children}</AppShell.Main>
      </AppShell>
    </>
  );
}
