import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import classes from './NavLinkGroup.module.scss';
import { IconChevronRight } from '@tabler/icons-react';
import { Box, Collapse, Group, ThemeIcon, UnstyledButton } from '@mantine/core';
import { Routes } from '@/helpers/constants';

export interface LinksGroupProps {
  icon: React.FC<any>;
  label: string;
  initiallyOpened?: boolean;
  links?: { label: string; link: string }[];
  link?: string;
  // Called when a link is chosen, such as to close the mobile menu. Not for a group's heading,
  // which only opens and closes its links
  onNavigate?: () => void;
}

export function NavLinkGroup({
  icon: Icon,
  label,
  initiallyOpened,
  links,
  link,
  onNavigate,
}: LinksGroupProps) {
  const pathname = usePathname();
  // Its own page, or one inside it like /recipes/<id>. Home only matches itself
  const active =
    !!link && (pathname === link || (link !== Routes.HOME && pathname.startsWith(`${link}/`)));

  const hasLinks = Array.isArray(links);
  const [opened, setOpened] = useState(
    links?.some((lk) => lk.link === pathname) || initiallyOpened || false
  );
  const items = (hasLinks ? links : []).map((link, i) => (
    <Link key={i} href={link.link} className={classes.link} onClick={onNavigate}>
      {link.label}
    </Link>
  ));

  return (
    <>
      <UnstyledButton
        component={link ? Link : undefined}
        // @ts-ignore
        href={link ? link : undefined}
        onClick={() => {
          setOpened((o) => !o);
          if (link) {
            onNavigate?.();
          }
        }}
        className={classes.control}
        data-active={active || undefined}
        aria-current={active ? 'page' : undefined}
      >
        <Group justify="space-between" gap={0}>
          <Box style={{ display: 'flex', alignItems: 'center', gap: '1px' }}>
            <ThemeIcon variant="light" size={30}>
              <Icon size={18} />
            </ThemeIcon>
            <Box ml="md">{label}</Box>
          </Box>
          {hasLinks && (
            <IconChevronRight
              className={classes.chevron}
              stroke={1.5}
              size={16}
              style={{ transform: opened ? 'rotate(-90deg)' : 'none' }}
            />
          )}
        </Group>
      </UnstyledButton>
      {hasLinks ? <Collapse in={opened}>{items}</Collapse> : null}
    </>
  );
}
