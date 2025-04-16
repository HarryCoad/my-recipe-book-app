export enum Routes {
  // Auth
  REGISTER = '/register',
  LOGIN = '/login',
  FORGOTTEN_PASSWORD = '/forgotten-password',
  RESET_PASSWORD = '/reset-password',
  // Rest of routes
  HOME = '/', // Dashboard
  MY_RECIPES = '/my-recipes',
  RECIPES = '/recipes',
  ANALYTICS = `/analytics`,
  SETTINGS = `/settings`,
  SECURITY = `/security`,
  SECURITY_MFA = `${Routes.SECURITY}/enable-2fa`,
  SECURITY_CHANGE_PASSWORD = `${Routes.SECURITY}/change-password`,
}
