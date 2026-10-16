# My Recipe Book (UI)

Next.js 15 (App Router) + React 19 + Mantine 7 frontend for the recipe book. Forms use Formik with Zod (`formik-validator-zod`), and API calls use axios.

## The backend

The API is a separate project in **`../my-recipe-book`** (Express + MongoDB).

- **Read `../my-recipe-book/docs/API.md` before calling or changing any API call.** It documents every endpoint, request body, response shape and error code.
- `../my-recipe-book/CLAUDE.md` explains how the backend works and the rules behind it.
- If the UI needs a backend change, make it in that repo following its `CLAUDE.md`: add tests, run `npm test` there, and update `docs/API.md`.
- The backend runs with `npm run dev` in that folder, on `http://localhost:8000`.

## Commands

The package manager is npm

- `npm run dev`: dev server on **port 3000**. The API only accepts requests (CORS) from `http://localhost:3000`, so don't change the port.
- `npm run typecheck`, `npm run lint`, `npm run jest`
- `npm run test`: Prettier check, lint, type-check and Jest together
- `npm run storybook`

## Structure

- `app/`: pages (App Router). Interactive pages are client components (`'use client'`).
- `components/`: shared components, one folder each, with SCSS or CSS modules.
- `helpers/axios.ts`: the shared axios instance (base URL from `NEXT_PUBLIC_API_BASE_URL` in `.env.local`), plus the `APIResponse<T>` type and `isSuccess`. Make every API call through it.
- `helpers/endpoints.ts`: every API path goes here, not inline in components.
- `helpers/constants.ts`: the `Routes` enum of page paths.
- `devData/recipes.json`: placeholder data that real API calls are replacing.

## Conventions

- Import with `@/...` from the project root. Prettier (100 character lines, single quotes) sorts imports automatically.
- Build UI with Mantine components, and use `@tabler/icons-react` for icons.

## Working with the API

These are summarised from `docs/API.md`. The rules there take priority.

- **Auth:** send the token from login or signup as `Authorization: Bearer <token>` on every request. The API ignores the `at` cookie, so the axios request interceptor needs to attach the header.
- **Current user:** the login and signup responses include `data.user.id`. Compare it with `recipe.authorId` to decide whether to show the author's options (edit, delete, review suggestions) or a saver's options (personal edit, suggest).
- **Responses:** `{ status: 1, data }` on success and `{ status: 0, message }` on failure. `message` is usually an error code, such as `CONFIRM_LOSE_EDITS`, so map error codes to friendly text in one place. A `Validation_Error` comes with an `errors` list of `{ fieldname, code }`.
- **Recipe fields:** use `authorName`, `bSaved` and `savedCount`. The API never sends `savedBy`, and recipes don't have images yet.
- **Lists:** "My recipes" is `GET /recipes/search?authorId=<my id>`, and "Saved" is `?bOnlySaved=true`. Search returns the list directly in `data`, not `data.recipes`.
- **Personal edits:** `GET /recipes/:id` returns `bHasEdits`. When it's true, offer "view original" (`?original=true`) and "reset" (`POST /recipes/reset-edit`).
- **Unsaving:** if the user has edits, the API refuses with `CONFIRM_LOSE_EDITS`. Show a warning, then resend the request with `bConfirmLoseEdits: true`.
- **Recipes without an author:** when `authorName` is `null`, the author deleted the recipe. It can't be changed, and suggestions aren't allowed.
