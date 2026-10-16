import { getUserIdFromToken, isAuthPage, isTokenExpired, safeRedirect } from '@/helpers/auth';

const makeToken = (payload: object) =>
  `header.${btoa(JSON.stringify(payload)).replace(/=+$/, '')}.signature`;

describe('auth helpers', () => {
  it('recognises the auth pages and nothing else', () => {
    expect(isAuthPage('/login')).toBe(true);
    expect(isAuthPage('/reset-password/abc123')).toBe(true);
    expect(isAuthPage('/')).toBe(false);
    expect(isAuthPage('/my-recipes')).toBe(false);
    expect(isAuthPage('/login-help')).toBe(false);
  });

  it('only redirects within the site', () => {
    expect(safeRedirect('/my-recipes/123?original=true')).toBe('/my-recipes/123?original=true');
    expect(safeRedirect(null)).toBe('/');
    expect(safeRedirect('https://evil.com')).toBe('/');
    expect(safeRedirect('//evil.com')).toBe('/');
    expect(safeRedirect('/\\evil.com')).toBe('/');
    expect(safeRedirect('/login')).toBe('/');
    expect(safeRedirect('/logout')).toBe('/');
  });

  it('reads the expiry from a JWT', () => {
    const inAnHour = Math.floor(Date.now() / 1000) + 3600;
    const anHourAgo = Math.floor(Date.now() / 1000) - 3600;
    expect(isTokenExpired(makeToken({ id: '1', exp: inAnHour }))).toBe(false);
    expect(isTokenExpired(makeToken({ id: '1', exp: anHourAgo }))).toBe(true);
    expect(isTokenExpired('not-a-jwt')).toBe(true);
  });
});

describe('getUserIdFromToken', () => {
  it('reads the id the API signs into the token', () => {
    expect(getUserIdFromToken(makeToken({ id: 'user-1' }))).toBe('user-1');
    expect(getUserIdFromToken(makeToken({ sub: 'user-1' }))).toBeNull();
    expect(getUserIdFromToken('not-a-jwt')).toBeNull();
  });
});
