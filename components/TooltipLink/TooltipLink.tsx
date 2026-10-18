'use client';

import { ReactNode } from 'react';
import Link from 'next/link';
import { ActionIcon, Badge, Indicator, Tooltip } from '@mantine/core';

// Tooltip clones its child to attach itself, reading the child's props. An element made in a
// server component can reach it as a lazy reference with no props yet (during a full page load),
// which crashes it. So server components use these instead: the tooltip and its child are both
// made here, in the browser.

type IconLinkProps = {
  // The tooltip, and what screen readers hear unless `ariaLabel` says more
  label: string;
  ariaLabel?: string;
  // Leave out to show it disabled, with the tooltip explaining why
  href?: string;
  // Replace the current page in the history rather than adding to it
  replace?: boolean;
  // A count shown on the icon, hidden when 0
  count?: number;
  children: ReactNode;
};

// An icon button that links somewhere, such as "Edit recipe"
export function IconLink({ label, ariaLabel, href, replace, count = 0, children }: IconLinkProps) {
  const icon = href ? (
    <ActionIcon
      component={Link}
      href={href}
      replace={replace}
      variant="light"
      color="orange"
      size="lg"
      aria-label={ariaLabel ?? label}
    >
      {children}
    </ActionIcon>
  ) : (
    // Not `disabled`, which would stop the tooltip showing on hover
    <ActionIcon
      variant="light"
      color="orange"
      size="lg"
      aria-label={ariaLabel ?? label}
      aria-disabled
      data-disabled
    >
      {children}
    </ActionIcon>
  );

  return (
    <Tooltip label={label}>
      {count > 0 ? (
        <Indicator label={count} color="red" size={16}>
          {icon}
        </Indicator>
      ) : (
        icon
      )}
    </Tooltip>
  );
}

type BadgeLinkProps = {
  label: string;
  ariaLabel?: string;
  href: string;
  color?: string;
  leftSection?: ReactNode;
  children: ReactNode;
};

// A small badge that links somewhere, such as a recipe's suggestion count
export function BadgeLink({
  label,
  ariaLabel,
  href,
  color = 'red',
  leftSection,
  children,
}: BadgeLinkProps) {
  return (
    <Tooltip label={label}>
      <Badge
        component={Link}
        href={href}
        variant="filled"
        color={color}
        leftSection={leftSection}
        style={{ cursor: 'pointer' }}
        aria-label={ariaLabel ?? label}
      >
        {children}
      </Badge>
    </Tooltip>
  );
}
