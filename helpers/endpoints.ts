export const endpoints = {
  auth: {
    login: '/api/v1/users/login',
    signup: '/api/v1/users/signup',
  },
  users: {
    // Someone's public profile
    profile: (id: string) => `/api/v1/users/${encodeURIComponent(id)}`,
    // The logged-in user's own details, and changing them
    me: '/api/v1/users/user-details',
    updateMe: '/api/v1/users/update-me',
  },
  recipes: {
    search: '/api/v1/recipes/search',
    create: '/api/v1/recipes/create',
    // Read a recipe from a web page or a photo into a draft for the create form
    importUrl: '/api/v1/recipes/import-url',
    importImage: '/api/v1/recipes/import-image',
    updateOwn: '/api/v1/recipes/update-own-recipe',
    delete: '/api/v1/recipes/delete',
    toggleSave: '/api/v1/recipes/toggle-save',
    // A personal edit, or a suggestion with isSuggestion
    editRecipe: '/api/v1/recipes/edit-recipe',
    viewSuggestions: (id: string) => `/api/v1/recipes/view-suggestions/${encodeURIComponent(id)}`,
    reviewSuggestion: '/api/v1/recipes/review-suggestion',
    mySuggestions: '/api/v1/recipes/my-suggestions',
    tags: '/api/v1/recipes/tags',
    view: (id: string) => `/api/v1/recipes/${encodeURIComponent(id)}`,
  },
};
