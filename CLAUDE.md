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
- `/login` — LoginView (split-screen; admin users are redirected to `/admin/dashboard`)
- `/recuperar-contrasena` — RecuperarContrasenaView
- `/reset-password` — ResetPasswordView
- `/mis-pedidos` — MisPedidosView (requiresAuth)
- `/admin` — AdminLoginView
- `/admin/dashboard` — AdminOrdenesView (requiresAdmin) — Kanban board
- `/admin/productos` — AdminProductosView (requiresAdmin) — Products + Categories

## Backend (`tequecrunchesse-backapp`)
Express 5 + TypeScript + Mongoose. Runs on port 8101.

Key routes:
- `/api/admin/*` — Admin auth + orders + products + categories (JWT guard via `adminAuth` middleware)
- `/api/auth/*` — Customer auth (login, register, me, forgot/reset-password)
- `/api/payphone/*` — Payphone Button API (prepare + confirm)
- `/api/orders/*` — Public order tracking + customer `my-orders`
- `/api/products` — Public product listing
- `/api/categories` — Public category listing

Models: `User` (role: customer|admin), `Order` (customerName, customerPhone, deliveryAddress, cedula, payWithPayPhone), `Product` (auto-slug from nombre, imagen{url,publicId}), `Category` (name unique)

Payment gateway: **Payphone Button API** (`/button/Prepare` + `/button/Confirm`).
Email notifications: **Resend** — order pending, payment approved/rejected, status updates, custom admin→customer email, team alerts.
Admin credentials: `admin@tequecruncheese.com` / `123456789`

## Admin Panel
- **Kanban board** (`/admin/dashboard`): 7 columns (one per OrderStatus). HTML5 native drag-and-drop. Right-side drawer with full customer info, backward stage changes, internal notes, email sending.
- **Products** (`/admin/productos`): Two tabs — "Productos" (CRUD table, image auto-uploads to Cloudinary on file select) and "Categorías" (create/delete with bulk reassign warning).
- Slug is **auto-generated** from `nombre` by the mongoose pre-save hook — never send a manual slug.
- Category field in product form is a `<select>` from `/api/admin/categories`.

## HTTP Layer — `httpBase.ts`
`APIBase` class. Methods: `get`, `post`, `put`, `patch`, `delete_` (delete with body uses axios `{ data }` config).
401 responses emit `auth:token-expired` DOM event. Timeout: 15s.

## Key Conventions
- This is a **dual-project setup**: this repo is the **frontend**; the backend lives separately at the same directory level. Always use subagents for research tasks to keep context clean.
- Always update `CLAUDE.md` and `MEMORY.md` when new instructions or architectural decisions are introduced.
- Env variables must be prefixed with `VITE_` to be accessible in the browser.
- GSAP is the animation library of choice — use it for transitions and scroll effects.
- Use `pnpm` as the package manager (not npm).
