import { ReactNode } from 'react';
import Link from 'next/link';
import { Anchor, AnchorProps } from '@mantine/core';
import { userPath } from '@/helpers/constants';

type UserLinkProps = AnchorProps & {
  // The user's ID, such as a recipe's authorId or a suggestion's userId
  id: string;
  children: ReactNode;
};

// Someone's name, linking to their profile. Only use it when there's an ID: a recipe whose
// author deleted it has none, so show plain text instead
export function UserLink({ id, children, ...props }: UserLinkProps) {
  return (
    <Anchor component={Link} href={userPath(id)} {...props}>
      {children}
    </Anchor>
  );
}
