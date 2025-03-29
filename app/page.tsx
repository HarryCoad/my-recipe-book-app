'use client';

import { AppShell, Burger, Code, Group } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { Logo } from '@/public/Logo';
import { ColorSchemeToggle } from '../components/ColorSchemeToggle/ColorSchemeToggle';
import { NavBar } from '../components/Navigation/NavBar';
import { Welcome } from '../components/Welcome/Welcome';

export default function HomePage() {
  const [opened, { toggle }] = useDisclosure();
  return (
    <>
      <AppShell
        header={{ height: 60 }}
        navbar={{
          width: 300,
          breakpoint: 'sm',
          collapsed: { mobile: !opened },
        }}
        padding="md"
      >
        <AppShell.Header>
          <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" pl="md" />
          <Group align="center" pl="md">
            <Logo style={{ width: 120 }} />
            <Code fw={700}>v3.1.2</Code>
          </Group>
        </AppShell.Header>

        <AppShell.Navbar>
          <NavBar />
        </AppShell.Navbar>

        <AppShell.Main>
          <Welcome />
          <ColorSchemeToggle />
        </AppShell.Main>
      </AppShell>
    </>
  );
}
