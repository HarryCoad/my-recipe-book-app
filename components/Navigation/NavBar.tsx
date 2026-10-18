import { useRouter } from 'next/navigation';
import linkClasses from './NavLinkGroup.module.scss';
import { IconLogout } from '@tabler/icons-react';
import { Box, ScrollArea, ThemeIcon, UnstyledButton } from '@mantine/core';
import { clearAuth } from '@/helpers/auth';
import { Routes } from '@/helpers/constants';
import { NAV_DATA } from './navHelpers';
import { NavLinkGroup } from './NavLinkGroup';
import classes from './NavBar.module.css';

export const NAVBAR_WIDTH = 300;
// Just wide enough for the icons
export const NAVBAR_RAIL_WIDTH = 64;

type NavBarProps = {
  // On desktop, show only the icons until it's hovered or focused, then expand over the page.
  // Mobile always shows the full menu
  rail?: boolean;
};

export function NavBar({ rail = false }: NavBarProps) {
  const router = useRouter();
  const links = NAV_DATA.map((item) => <NavLinkGroup {...item} key={item.label} />);

  const handleLogout = () => {
    clearAuth();
    router.replace(Routes.LOGIN);
  };

  return (
    <nav
      className={classes.navbar}
      data-rail={rail || undefined}
      style={{ '--navbar-expanded-width': `${NAVBAR_WIDTH}px` } as React.CSSProperties}
    >
      <ScrollArea className={classes.links}>
        <div className={classes.linksInner}>{links}</div>
      </ScrollArea>

      <div className={classes.footer}>
        <UnstyledButton className={linkClasses.control} onClick={handleLogout}>
          <Box style={{ display: 'flex', alignItems: 'center' }}>
            <ThemeIcon variant="light" color="gray" size={30}>
              <IconLogout stroke={1.5} size={18} />
            </ThemeIcon>
            <Box ml="md">Log out</Box>
          </Box>
        </UnstyledButton>
      </div>
    </nav>
  );
}
