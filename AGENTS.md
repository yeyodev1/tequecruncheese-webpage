# AGENTS.md

## Scope
- Frontend repo only. The API/backend lives in the sibling repo `tequecrunchesse-backapp`.
- `@/` resolves to `src/`.

## Commands
- `pnpm dev` starts Vite.
- `pnpm build` is the real verification step: `vue-tsc -b && vite build`.
- `pnpm preview` previews the production build.
- No test runner is configured.

## Wiring
- `src/main.ts` hydrates the Pinia user store from `localStorage` before the first render.
- Router guards in `src/router/index.ts` are token-based: `access_token` for customer routes, `admin_token` for admin routes.
- `requiresAuth` redirects to `/login` with `redirect`, and `requiresAdmin` redirects to `/admin`.

## HTTP
- `src/services/httpBase.ts` defaults `VITE_API_BASE_URL` to `http://localhost:8100/api`.
- The base URL is normalized to include `/api` if missing.
- 401 responses dispatch `auth:token-expired` on `window`.
- `POST` with `FormData` must not send JSON `Content-Type`.
- Use `delete_()` when a DELETE request needs a body.

## Images
- All shipped images come from Cloudinary, not local assets.
- Use `cloudImg()` / `useLazyImage()` from `src/services/cloudinary.ts` and `src/composables/useLazyImage.ts`.
- Do not import from `@/assets/stock/` or `@/assets/logos/` in components.
- Upload new images with `node scripts/upload-to-cloudinary.mjs`.

## Styling
- `src/styles/index.scss` is injected into every SCSS file by Vite.
- Prefer existing style tokens/variables over hardcoded colors and fonts.
