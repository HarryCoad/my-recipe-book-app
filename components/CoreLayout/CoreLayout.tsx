'use client';

import '@mantine/core/styles.css';

import { AppShell, Burger, Code, Group } from '@mantine/core';
import { useDisclosure, useLocalStorage } from '@mantine/hooks';
import { Logo } from '@/public/Logo';
import { NavBar, NAVBAR_RAIL_WIDTH, NAVBAR_WIDTH } from '../Navigation/NavBar';

export default function CoreLayout({ children }: { children: any }) {
  // On mobile the menu slides over the page, and the burger opens and closes it
  const [mobileOpened, { toggle: toggleMobile }] = useDisclosure();
  // On desktop the menu is always there. Pinned, it's full width and the page moves over for
  // it. Otherwise it's a strip of icons that expands over the page while hovered. Remembered
  // in this browser
  const [pinned, setPinned] = useLocalStorage({ key: 'navbar-pinned', defaultValue: false });

  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{
        width: { base: NAVBAR_WIDTH, sm: pinned ? NAVBAR_WIDTH : NAVBAR_RAIL_WIDTH },
        breakpoint: 'sm',
        collapsed: { mobile: !mobileOpened, desktop: false },
      }}
      padding="md"
    >
      <AppShell.Header>
        <Group align="center" pl="md" style={{ height: '100%' }}>
          <Burger
            opened={mobileOpened}
            onClick={toggleMobile}
            hiddenFrom="sm"
            size="md"
            aria-label={mobileOpened ? 'Close menu' : 'Open menu'}
          />
          <Burger
            opened={pinned}
            onClick={() => setPinned((value) => !value)}
            visibleFrom="sm"
            size="md"
            aria-label={pinned ? 'Collapse menu' : 'Keep menu open'}
          />
          <Logo style={{ width: 120 }} />
          <Code fw={700}>v3.1.2</Code>
        </Group>
      </AppShell.Header>

      {/* NavBar draws its own border, so it moves with the menu as it expands */}
      <AppShell.Navbar withBorder={false}>
        <NavBar rail={!pinned} />
      </AppShell.Navbar>

      <AppShell.Main>{children}</AppShell.Main>
    </AppShell>
  );
}
