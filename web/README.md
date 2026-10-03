# CADchat Review Cube: web

The React Three Fiber front end. For the full project overview, API reference and deployment steps, see the [root README](../README.md).

## Setup

You need Node 24 or newer and the API from `../api` running.

```bash
npm install
cp .env.example .env.local
npm run dev
```

| Variable | Description |
|---|---|
| `VITE_API_URL` | API base URL, for example `http://localhost:3000`. Baked in at build time |
| `VITE_AUTH_REQUIRED` | `true` to show the sign-in form (the API must also have `AUTH_REQUIRED=true`) |

Open the URL Vite prints (usually http://localhost:5173) and click the cube.

## Scripts

```bash
npm run dev       # start Vite
npm run build     # type check and build to dist/
npm run preview   # serve the production build
npm run lint      # Oxlint
npm test          # Vitest
```

## Layout

```
src/api/      API client and types
src/auth/     Sign-in gate and session storage
src/review/   Overlay, comment form, comment list, state reducer
src/scene/    The 3D cube
```
