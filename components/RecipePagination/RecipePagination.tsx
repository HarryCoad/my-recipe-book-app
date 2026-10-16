'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { Center, Pagination } from '@mantine/core';

type RecipePaginationProps = {
  page: number;
  totalPages: number;
};

// Pages are links to ?page=N, so the server renders each page and the back button works.
// This is a client component only because Mantine takes the links as a function.
export function RecipePagination({ page, totalPages }: RecipePaginationProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  if (totalPages <= 1) {
    return null;
  }

  // Keeps any other query params, such as a future search or sort
  const hrefFor = (target: number) => {
    const params = new URLSearchParams(searchParams);
    if (target === 1) {
      params.delete('page');
    } else {
      params.set('page', String(target));
    }
    const query = params.toString();
    return query ? `${pathname}?${query}` : pathname;
  };

  return (
    <Center my="lg">
      <Pagination
        color="orange"
        total={totalPages}
        value={page}
        getItemProps={(target) => ({ component: Link, href: hrefFor(target) })}
        getControlProps={(control) => {
          if (control === 'previous' && page > 1) {
            return { component: Link, href: hrefFor(page - 1) };
          }
          if (control === 'next' && page < totalPages) {
            return { component: Link, href: hrefFor(page + 1) };
          }
          return {};
        }}
      />
    </Center>
  );
}
