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
  BULK_IMPORT = '/my-recipes/import',
  RECIPES = '/recipes',
  MY_SUGGESTIONS = '/suggestions',
  USERS = '/users',
  ANALYTICS = `/analytics`,
  SETTINGS = `/settings`,
  SECURITY = `/security`,
  SECURITY_MFA = `${Routes.SECURITY}/enable-2fa`,
  SECURITY_CHANGE_PASSWORD = `${Routes.SECURITY}/change-password`,
}

// Any recipe the user can see, whoever wrote it
export const recipePath = (id: string) => `${Routes.RECIPES}/${id}`;
// Someone's profile, including the user's own
export const userPath = (id: string) => `${Routes.USERS}/${id}`;
// Suggest changes to someone else's recipe, and review the suggestions for your own
export const suggestPath = (id: string) => `${recipePath(id)}/suggest`;
export const reviewSuggestionsPath = (id: string) => `${recipePath(id)}/suggestions`;
