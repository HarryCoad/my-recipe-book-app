import { useRouter } from 'next/navigation';
import { IconLogout } from '@tabler/icons-react';
import { Button, ScrollArea } from '@mantine/core';
import { clearAuth } from '@/helpers/auth';
import { Routes } from '@/helpers/constants';
import { NAV_DATA } from './navHelpers';
import { NavLinkGroup } from './NavLinkGroup';
import classes from './Navbar.module.css';

export function NavBar() {
  const router = useRouter();
  const links = NAV_DATA.map((item) => <NavLinkGroup {...item} key={item.label} />);

  const handleLogout = () => {
    clearAuth();
    router.replace(Routes.LOGIN);
  };

  return (
    <nav className={classes.navbar} style={{ height: '100%' }}>
      <ScrollArea className={classes.links}>
        <div className={classes.linksInner}>{links}</div>
      </ScrollArea>

      <div className={classes.footer}>
        <Button
          variant="subtle"
          color="gray"
          fullWidth
          leftSection={<IconLogout stroke={1.5} size={18} />}
          onClick={handleLogout}
        >
          Log out
        </Button>
      </div>
    </nav>
  );
}
