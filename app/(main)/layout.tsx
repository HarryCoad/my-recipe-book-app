import CoreLayout from '@/components/CoreLayout/CoreLayout';

// Pages in this group need you to be logged in (see middleware.ts), so they get the app shell.
// The auth pages in app/(auth) render without it.
export default function MainLayout({ children }: { children: React.ReactNode }) {
  return <CoreLayout>{children}</CoreLayout>;
}
