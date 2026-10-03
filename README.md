# CADchat Review Cube

A single cube in a 3D scene. Click it to open a design review panel above the cube: add a comment, approve or reject it, or delete it to start over. The cube changes color to match the review status (green for approved, red for rejected).

The app has one review (comment) per cube. Adding a new comment replaces the existing one.

## How it works

1. Click the cube. The panel opens and the current review is fetched from the API.
2. No review: a comment form is shown.
3. Pending review: Approve and Reject buttons are shown.
4. Approved or rejected review: the final status is shown.
5. The small x in the corner of the comment deletes it, and the form comes back.

## Stack

- **Web** (`web/`): React 19, TypeScript, Vite, React Three Fiber and drei, Tailwind CSS 4. Tests use Vitest, linting uses Oxlint.
- **API** (`api/`): Node 24 (runs TypeScript directly), Express 5, Zod, Helmet, CORS. Tests use Vitest and Supertest.
- **Database and auth**: Supabase (Postgres and Supabase Auth). The API is the only thing that talks to the database, using the secret key.

## Project layout

```
web/                 React Three Fiber front end
  src/api/           API client and types
  src/auth/          Sign-in gate and session storage
  src/review/        Overlay, comment form, comment list, state reducer
  src/scene/         The 3D cube
api/                 Express API
  src/routes/        /reviews and /auth routes
  src/middleware/    Authentication and error handling
  src/reviewsRepo.ts Database access
  test/              API tests
supabase/migrations/ SQL that creates the reviews table and replace_review function
```

## Setup

You need Node 24 or newer and a Supabase project.

### 1. Database

Run `supabase/migrations/20261003130000_create_review.sql` against your Supabase project, either in the dashboard's SQL editor or with the Supabase CLI (`npx supabase link`, then `npx supabase db push`). It creates the `reviews` table (one row per cube), row level security with no public access, and the `replace_review` function the API calls.

If you turn authentication on, create a user in the Supabase dashboard under Authentication, Users. The app has no sign-up screen.

### 2. API

```bash
cd api
npm install
cp .env.example .env
```

Fill in `api/.env`:

| Variable | Description |
|---|---|
| `PORT` | Port the API listens on (default 3000) |
| `NODE_ENV` | `development`, `production` or `test` |
| `CORS_ORIGIN` | Exact front-end origin(s), comma separated, no trailing slash, never `*` |
| `SUPABASE_URL` | Your project URL, `https://<project-ref>.supabase.co` |
| `SUPABASE_SECRET_KEY` | Supabase secret key (`sb_secret_...`). Server only, never expose it to the browser |
| `AUTH_REQUIRED` | `true` to require sign-in (default), `false` to allow anyone with the URL |

```bash
npm run dev
```

### 3. Web

```bash
cd web
npm install
cp .env.example .env.local
```

Fill in `web/.env.local`:

| Variable | Description |
|---|---|
| `VITE_API_URL` | API base URL, for example `http://localhost:3000` |
| `VITE_AUTH_REQUIRED` | `true` to show the sign-in form (the API must also have `AUTH_REQUIRED=true`) |

```bash
npm run dev
```

Open the URL Vite prints (usually http://localhost:5173) and click the cube.

On macOS, do not point `VITE_API_URL` at port 5000: AirPlay uses it and answers requests with a 403, which looks like a CORS error in the browser.

## API

All routes except `/auth/*` require `Authorization: Bearer <access token>` when `AUTH_REQUIRED=true`.

| Method and path | Description |
|---|---|
| `POST /auth/login` | Sign in with `{ email, password }`, returns the session |
| `POST /auth/refresh` | Exchange `{ refresh_token }` for a new session |
| `GET /reviews?cube_id=` | List reviews for a cube (zero or one item) |
| `POST /reviews` | Create a review with `{ cube_id, comment }`. Replaces any existing review for that cube |
| `GET /reviews/:id` | Get one review |
| `PATCH /reviews/:id` | Set the status to `approved` or `rejected` (only while pending) |
| `DELETE /reviews/:id` | Delete a review |

Errors return JSON like `{ "error": "Review not found" }`. Database error details are logged on the server and never sent to the client.

## Scripts

Web (`web/`):

```bash
npm run dev       # start Vite
npm run build     # type check and build to dist/
npm run lint      # Oxlint
npm test          # Vitest
```

API (`api/`):

```bash
npm run dev       # start with file watching
npm start         # start once
npm run typecheck
npm test
```

## Deploying to Render

`render.yaml` describes two services: `cadchat-api` (a Node web service) and `cadchat-web` (a static site).

1. In Render, choose New, Blueprint, and connect this GitHub repo.
2. Fill in the values Render asks for:
   - `cadchat-api`: `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, and `CORS_ORIGIN` (the exact URL of the deployed web site, no trailing slash).
   - `cadchat-web`: `VITE_API_URL` (the URL of the deployed API).
3. `CORS_ORIGIN` and `VITE_API_URL` point at each other, so deploy once, copy the two URLs Render gives you, set both values, and redeploy.
4. Check `https://<your-api>/health`. It should return `{"status":"ok"}`.

`VITE_API_URL` is baked in when the web site is built, so change it and redeploy the web service, do not just restart it. On Render's free plan the API sleeps when idle, so the first request after a pause can be slow.

## Notes

- The API logs as JSON to the console (stdout and stderr), which is where hosts collect logs.
- Supabase hosts the database and auth. It does not host a static web app or a long-running Express server, so deploy the web build to a static host and the API to a host that runs Node.
