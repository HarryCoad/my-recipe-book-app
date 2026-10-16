import { NextRequest, NextResponse } from 'next/server';
import { TOKEN_COOKIE } from '@/helpers/auth';
import { Routes } from '@/helpers/constants';

// Server components can't delete cookies, so they redirect here when the session has ended.
// Redirecting straight to /login wouldn't work: middleware.ts would still see the cookie and send
// the user back. The user details in localStorage are left behind, but the next login replaces them.
export function GET(request: NextRequest) {
  const response = NextResponse.redirect(new URL(Routes.LOGIN, request.url));
  response.cookies.delete(TOKEN_COOKIE);
  return response;
}
