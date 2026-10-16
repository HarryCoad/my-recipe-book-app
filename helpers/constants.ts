export enum Routes {
  // Auth
  SIGN_UP = '/sign-up',
  LOGIN = '/login',
  LOGOUT = '/logout', // Route handler that clears the session, for use from the server
  FORGOTTEN_PASSWORD = '/forgotten-password',
  RESET_PASSWORD = '/reset-password',
  // Rest of routes
  HOME = '/', // Dashboard
  MY_RECIPES = '/my-recipes',
  NEW_RECIPE = '/my-recipes/new',
  RECIPES = '/recipes',
  ANALYTICS = `/analytics`,
  SETTINGS = `/settings`,
  SECURITY = `/security`,
  SECURITY_MFA = `${Routes.SECURITY}/enable-2fa`,
  SECURITY_CHANGE_PASSWORD = `${Routes.SECURITY}/change-password`,
}
