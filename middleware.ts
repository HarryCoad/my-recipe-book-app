import { NextRequest, NextResponse } from 'next/server';
import { isAuthPage, isTokenExpired, TOKEN_COOKIE } from '@/helpers/auth';
import { Routes } from '@/helpers/constants';

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const token = request.cookies.get(TOKEN_COOKIE)?.value;
  const loggedIn = !!token && !isTokenExpired(token);

  // Always reachable, so an ended session can be cleared
  if (pathname === Routes.LOGOUT) {
    return NextResponse.next();
  }

  if (isAuthPage(pathname)) {
    // Logged-in users have no reason to see login or sign-up
    return loggedIn
      ? NextResponse.redirect(new URL(Routes.HOME, request.url))
      : NextResponse.next();
  }

  if (!loggedIn) {
    const loginUrl = new URL(Routes.LOGIN, request.url);
    if (pathname !== Routes.HOME) {
      loginUrl.searchParams.set('redirect', pathname + search);
    }
    const response = NextResponse.redirect(loginUrl);
    if (token) {
      response.cookies.delete(TOKEN_COOKIE);
    }
    return response;
  }

  return NextResponse.next();
}

export const config = {
  // Skip Next's internals and static files such as /favicon.svg
  matcher: ['/((?!_next/static|_next/image|.*\\.[\\w]+$).*)'],
};
