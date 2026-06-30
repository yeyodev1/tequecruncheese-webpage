# AGENTS.md

## Scope
- Frontend only; backend lives in sibling repo `tequecrunchesse-backapp`.
- `@/` resolves to `src/`.

## Commands
- `pnpm dev` starts Vite.
- `pnpm build` is the required verification step: `vue-tsc -b && vite build`.
- `pnpm preview` previews the production build.
- No test runner is configured.

## Setup
- Copy `.env.example` to `.env` and set `VITE_API_BASE_URL` if you need a non-default API host.
- The default API base is `http://localhost:8100/api`.

## App Wiring
- `src/main.ts` hydrates the Pinia user store from `localStorage` before mount.
- `src/router/index.ts` uses `access_token` for customer auth and `admin_token` for admin routes.
- Guarded customer routes redirect to `/login?redirect=...`; guarded admin routes redirect to `/admin`.

## HTTP
- `src/services/httpBase.ts` normalizes `VITE_API_BASE_URL` to include `/api`.
- 401 responses dispatch `auth:token-expired` on `window`.
- `POST` with `FormData` must not send JSON `Content-Type`.
- Use `delete_()` when a DELETE request needs a body.

## Images
- Product/home imagery comes from Cloudinary via `cloudImg()` and `useLazyImage()`.
- Regenerate `src/assets/cloudinary-map.json` with `node scripts/upload-to-cloudinary.mjs`.
- `src/assets/logo/logo.png` is the remaining local image import in `src/components/home/TheHeader.vue`.

## Styling
- `src/styles/index.scss` is injected into every SCSS file by Vite.
- Prefer the existing tokens and mixins in that file over hardcoded colors or fonts.
