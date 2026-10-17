export const endpoints = {
  auth: {
    login: '/api/v1/users/login',
    signup: '/api/v1/users/signup',
  },
  recipes: {
    search: '/api/v1/recipes/search',
    create: '/api/v1/recipes/create',
    updateOwn: '/api/v1/recipes/update-own-recipe',
    tags: '/api/v1/recipes/tags',
    view: (id: string) => `/api/v1/recipes/${encodeURIComponent(id)}`,
  },
};
