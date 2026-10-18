import {
  IconAdjustments,
  IconBurger,
  IconChefHat,
  IconGauge,
  IconMessage2,
} from '@tabler/icons-react';
import { Routes } from '@/helpers/constants';
import { LinksGroupProps } from './NavLinkGroup';

export const NAV_DATA: LinksGroupProps[] = [
  { label: 'Dashboard', icon: IconGauge, link: Routes.HOME },
  { label: 'My Recipes', icon: IconChefHat, link: Routes.MY_RECIPES },
  { label: 'Find Recipes', icon: IconBurger, link: Routes.RECIPES },
  { label: 'My Suggestions', icon: IconMessage2, link: Routes.MY_SUGGESTIONS },
  // { label: 'Analytics', icon: IconPresentationAnalytics, link: Routes.ANALYTICS },
  { label: 'Settings', icon: IconAdjustments, link: Routes.SETTINGS },
  // {
  //   label: 'Security',
  //   icon: IconLock,
  //   links: [
  //     // { label: 'Enable 2FA', link: Routes.SECURITY_MFA },
  //     { label: 'Change password', link: Routes.SECURITY_CHANGE_PASSWORD },
  //   ],
  // },
];
