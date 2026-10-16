import { ScrollArea } from '@mantine/core';
import { NAV_DATA } from './navHelpers';
import { NavLinkGroup } from './NavLinkGroup';
import classes from './Navbar.module.css';

export function NavBar() {
  const links = NAV_DATA.map((item) => <NavLinkGroup {...item} key={item.label} />);

  return (
    <nav className={classes.navbar} style={{ height: '100%' }}>
      <ScrollArea className={classes.links}>
        <div className={classes.linksInner}>{links}</div>
      </ScrollArea>

      <div className={classes.footer}>
        <button type="button">Logout button</button>
      </div>
    </nav>
  );
}
