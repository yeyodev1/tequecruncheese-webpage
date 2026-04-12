# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm dev        # Start Vite dev server
pnpm build      # Type-check (vue-tsc) + build for production
pnpm preview    # Preview production build locally
```

No test runner is configured. TypeScript strict checking (`vue-tsc --build`) runs as part of `build`.

## Environment Setup

Copy `.env.example` to `.env` and set:
```
VITE_API_BASE_URL=http://localhost:8100/api
```

## Architecture

**Stack**: Vue 3 + Vite 7 + TypeScript (strict) + Pinia + Vue Router + Axios + GSAP + SCSS

### Routing (`src/router/index.ts`)
Single route currently (Home). Auth guard checks `localStorage` for `access_token`. Route meta `requiresAuth: true` triggers redirect to `/login` when unauthenticated.

### State Management (`src/stores/`)
Pinia stores. The `user` store manages auth state with `hydrate()` (restores from localStorage on app load), `setUser()`, and `clear()`. Tokens and `user_id` are persisted in localStorage.

### HTTP Layer (`src/services/httpBase.ts`)
`APIBase` class wraps Axios. Base URL from `VITE_API_BASE_URL`. 401 responses emit a custom `auth:token-expired` DOM event instead of throwing. Timeout: 15s. `POST` with `FormData` auto-sets `Content-Type: multipart/form-data`.

### Styling (`src/styles/`)
SCSS modules with global variables for colors and fonts. `styles/index.scss` is auto-injected into every component via Vite's `preprocessorOptions.additionalData`. Use existing color/font variables rather than hardcoding values.

### Components (`src/components/home/`)
All current UI is home-page specific, organized under `src/components/home/`. Path alias `@/` maps to `src/`.

## Image Management (Cloudinary)
All project images are served from **Cloudinary** (cloud: `dvq6znk71`). **Never import local `@/assets/stock/` or `@/assets/logos/` files in components.**

- Use `cloudImg(filename, opts?)` from `@/services/cloudinary` to get optimized CDN URLs.
- Use `useLazyImage(filename, opts?)` composable from `@/composables/useLazyImage` for Intersection Observer lazy loading.
- The mapping file `src/assets/cloudinary-map.json` and `CLOUD_IDS` in `cloudinary.ts` contain all uploaded images.
- To upload new images: `node scripts/upload-to-cloudinary.mjs`
- The AppLoader waits for `window.load` — since images are now CDN, load time is dramatically reduced.

## Routes (full list)
- `/` — HomeView
- `/tienda` — TiendaView
- `/pago/confirmado` and `/pay-response` — PagoConfirmadoView (Payphone callback)
- `/pedido/:token` — TrackOrderView (public order tracking)
- `/admin` — AdminLoginView
- `/admin/dashboard` — AdminOrdenesView (requiresAdmin guard)

## Backend (`tequecrunchesse-backapp`)
Express 5 + TypeScript + Mongoose. Runs on port 8101. Routes:
- `/api/admin/*` — Admin auth + order management (JWT guard)
- `/api/payphone/*` — Payphone Button API (prepare + confirm)
- `/api/orders/*` — Public order tracking

Payment gateway: **Payphone Button API** (`/button/Prepare` + `/button/Confirm`).
Email notifications: **Resend** (order pending, payment approved, payment rejected).
Admin credentials: `admin@tequecruncheese.com` / `123456789`

## Key Conventions
- This is a **dual-project setup**: this repo is the **frontend**; the backend lives separately at the same directory level. Always use subagents for research tasks to keep context clean.
- Always update `CLAUDE.md` and `MEMORY.md` when new instructions or architectural decisions are introduced.
- Env variables must be prefixed with `VITE_` to be accessible in the browser.
- GSAP is the animation library of choice — use it for transitions and scroll effects.
- Use `pnpm` as the package manager (not npm).
