# My Recipe Book

The web app for My Recipe Book: write and save recipes, import them from web pages or photos,
and suggest changes to other people's recipes.

Built with [Next.js 15](https://nextjs.org/) (App Router), React 19 and
[Mantine 7](https://mantine.dev/). Forms use [Formik](https://formik.org/) with
[Zod](https://zod.dev/), and API calls use [axios](https://axios-http.com/).

## Features

- **Accounts**: sign up, log in and log out. Pages other than login and sign-up need you to be
  logged in.
- **Dashboard**: the home page once you're logged in.
- **Your recipes**: create, edit and delete recipes, with ingredients and steps grouped under
  headings and reordered by dragging or the keyboard.
- **Importing**: read a recipe from a web address, or from up to four photos of one recipe (such
  as a cookbook spread), into a draft. Bulk import handles many at once.
- **Search**: find recipes by text and tags, and filter to the ones you've saved.
- **Saving and personal edits**: save someone else's recipe and change your own copy. You can view
  the original at any time or reset your changes.
- **Suggestions**: suggest changes to someone else's recipe. Authors review the suggestions for
  their recipes, and you can follow the ones you've made.
- **Profiles and settings**: view other users' profiles and update your own details.
- Light and dark colour schemes.

## Getting started

### Prerequisites

- Node.js and npm
- The API, which is a separate project:
  [my-recipe-book](../my-recipe-book) (Express + MongoDB). Start it with `npm run dev` in that
  folder; it runs on `http://localhost:8000`.

### Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create `.env.local` in the project root with the API's address:

   ```bash
   NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
   ```

3. Start the dev server:

   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000).

> The API only accepts requests (CORS) from `http://localhost:3000`, so keep the dev server on
> port 3000.

## Scripts

| Script                   | What it does                                                    |
| ------------------------ | --------------------------------------------------------------- |
| `npm run dev`            | Start the dev server on port 3000                               |
| `npm run build`          | Build for production                                            |
| `npm start`              | Serve the production build                                      |
| `npm run analyze`        | Build with the bundle analyser                                  |
| `npm run typecheck`      | Check TypeScript types                                          |
| `npm run lint`           | Run ESLint and Stylelint                                        |
| `npm run jest`           | Run the Jest tests (`jest:watch` to watch)                      |
| `npm run prettier:check` | Check formatting (`prettier:write` to fix it)                   |
| `npm test`               | Prettier check, lint, type-check and Jest together              |
| `npm run storybook`      | Start Storybook on port 6006 (`storybook:build` to build it)    |

## Project structure

```
app/             Pages (App Router)
  (auth)/        Login and sign-up
  (main)/        Everything behind login: dashboard, recipes, my recipes, suggestions,
                 users, settings
  logout/        Route handler that clears the session
components/      Shared components, one folder each, with SCSS or CSS modules
helpers/         API client, endpoints, routes and other logic, with their tests
  axios.ts       Shared axios instance; attaches the auth token to every request
  endpoints.ts   Every API path
  constants.ts   The Routes enum of page paths
types/           Recipe and user types
devData/         Placeholder data
middleware.ts    Redirects to login when there's no valid session
```

## The API

All API calls go through the shared axios instance in [helpers/axios.ts](helpers/axios.ts), and
every path lives in [helpers/endpoints.ts](helpers/endpoints.ts). The endpoints, request and
response shapes and error codes are documented in the API project's `docs/API.md`.

## Licence

MIT. This project started from the
[Mantine Next.js template](https://github.com/mantinedev/next-app-template); see [LICENCE](LICENCE).
