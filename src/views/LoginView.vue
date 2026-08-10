<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useUserStore } from '@/stores/user'
import BrandLogo from '@/components/BrandLogo.vue'
import gsap from 'gsap'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()

const email = ref('')
const password = ref('')
const loading = ref(false)
const error = ref('')
const showPassword = ref(false)

async function handleLogin() {
  if (!email.value || !password.value) return
  loading.value = true
  error.value = ''
  try {
    await userStore.login(email.value, password.value)

    // Admin users logging in through the customer login get redirected to admin panel
    if (userStore.role === 'admin') {
      const token = localStorage.getItem('access_token') ?? ''
      localStorage.setItem('admin_token', token)
      router.push('/admin/dashboard')
      return
    }

    const redirect = route.query.redirect as string | undefined
    router.push(redirect && redirect.startsWith('/') ? redirect : '/mis-pedidos')
  } catch (err: unknown) {
    const e = err as { status?: number; message?: string }
    if (e.status === 401 || e.status === 400) {
      error.value = 'Correo o contraseña incorrectos.'
    } else {
      error.value = 'Ocurrió un error. Intenta de nuevo.'
    }
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  const tl = gsap.timeline({ defaults: { ease: 'power3.out' } })

  // Brand panel slides in from left
  tl.fromTo(
    '.lv__brand',
    { x: -50, opacity: 0 },
    { x: 0, opacity: 1, duration: 0.75 },
  )
  // Form panel slides in from right
  .fromTo(
    '.lv__form-panel',
    { x: 50, opacity: 0 },
    { x: 0, opacity: 1, duration: 0.75 },
    '-=0.55',
  )
  // Logo bounces in
  .fromTo(
    '.lv__logo-wrap',
    { scale: 0.6, opacity: 0 },
    { scale: 1, opacity: 1, duration: 0.5, ease: 'back.out(1.7)' },
    '-=0.5',
  )
  // Form groups stagger up
  .fromTo(
    '.lv__group',
    { y: 18, opacity: 0 },
    { y: 0, opacity: 1, stagger: 0.09, duration: 0.4 },
    '-=0.3',
  )
  // Decorative blobs appear
  .fromTo(
    '.lv__blob',
    { scale: 0, opacity: 0 },
    { scale: 1, opacity: 1, stagger: 0.15, duration: 1.2, ease: 'elastic.out(1, 0.55)' },
    0,
  )
})
</script>

<template>
  <div class="lv">
    <!-- ── Brand panel ────────────────────────────────────────── -->
    <div class="lv__brand">
      <!-- Decorative blobs -->
      <span class="lv__blob lv__blob--1"></span>
      <span class="lv__blob lv__blob--2"></span>
      <span class="lv__blob lv__blob--3"></span>

      <div class="lv__brand-inner">
        <BrandLogo class="lv__logo-wrap" variant="mark" :height="68" />

        <h1 class="lv__brand-name">Tequecruncheese</h1>
        <p class="lv__brand-tagline">
          El sabor que te enamora,<br />ahora en tus manos.
        </p>

        <div class="lv__brand-feats">
          <div class="lv__feat">
            <i class="fa-solid fa-box-open"></i>
            <span>Sigue tus pedidos</span>
          </div>
          <div class="lv__feat">
            <i class="fa-solid fa-clock-rotate-left"></i>
            <span>Historial completo</span>
          </div>
          <div class="lv__feat">
            <i class="fa-solid fa-star"></i>
            <span>Acceso exclusivo</span>
          </div>
        </div>
      </div>
    </div>

    <!-- ── Form panel ─────────────────────────────────────────── -->
    <div class="lv__form-panel">
      <div class="lv__form-inner">
        <!-- Mobile brand header -->
        <!-- The wordmark already carries the name, so the text beside the
             square mark was saying it twice. -->
        <div class="lv__mobile-brand">
          <BrandLogo variant="long" :height="38" />
        </div>

        <div class="lv__heading">
          <h2 class="lv__title">Bienvenido de vuelta</h2>
          <p class="lv__subtitle">Ingresa a tu cuenta para ver tus pedidos</p>
        </div>

        <form class="lv__form" @submit.prevent="handleLogin" novalidate>
          <!-- Email -->
          <div class="lv__group">
            <label class="lv__label" for="lv-email">
              <i class="fa-solid fa-envelope"></i>
              Correo electrónico
            </label>
            <input
              id="lv-email"
              v-model="email"
              type="email"
              autocomplete="email"
              placeholder="tu@correo.com"
              class="lv__input"
              required
            />
          </div>

          <!-- Password -->
          <div class="lv__group">
            <label class="lv__label" for="lv-pass">
              <i class="fa-solid fa-lock"></i>
              Contraseña
            </label>
            <div class="lv__input-wrap">
              <input
                id="lv-pass"
                v-model="password"
                :type="showPassword ? 'text' : 'password'"
                autocomplete="current-password"
                placeholder="••••••••"
                class="lv__input lv__input--has-toggle"
                required
              />
              <button
                type="button"
                class="lv__eye"
                :aria-label="showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'"
                @click="showPassword = !showPassword"
              >
                <i :class="`fa-solid ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`"></i>
              </button>
            </div>
          </div>

          <!-- Error -->
          <Transition name="lv-error">
            <p v-if="error" class="lv__error">
              <i class="fa-solid fa-circle-exclamation"></i>
              {{ error }}
            </p>
          </Transition>

          <!-- Submit -->
          <div class="lv__group">
            <button type="submit" class="lv__btn" :disabled="loading">
              <span v-if="loading" class="lv__btn-content">
                <i class="fa-solid fa-spinner fa-spin"></i>
                Ingresando...
              </span>
              <span v-else class="lv__btn-content">
                <i class="fa-solid fa-right-to-bracket"></i>
                Iniciar Sesión
              </span>
            </button>
          </div>

          <!-- Links -->
          <div class="lv__group lv__group--links">
            <router-link to="/recuperar-contrasena" class="lv__link">
              ¿Olvidaste tu contraseña?
            </router-link>
          </div>
        </form>

        <!-- Default pass hint -->
        <div class="lv__hint">
          <i class="fa-solid fa-circle-info"></i>
          <span>Tu contraseña por defecto es tu correo electrónico.</span>
        </div>

        <!-- Footer note -->
        <p class="lv__note">
          ¿No tienes cuenta? Cuando realizas un pedido te creamos una automáticamente.
        </p>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
// ── Layout ────────────────────────────────────────────────────────
.lv {
  min-height: 100vh;
  display: flex;
  flex-direction: column;

  @include respond-to('md') {
    flex-direction: row;
  }
}

// ── Brand panel ───────────────────────────────────────────────────
.lv__brand {
  position: relative;
  background: $color-accent;
  overflow: hidden;
  // Hidden on mobile (mobile-brand takes over)
  display: none;

  @include respond-to('md') {
    display: flex;
    flex: 0 0 45%;
    align-items: center;
    justify-content: center;
    padding: 4rem 3rem;
  }

  @include respond-to('lg') {
    flex: 0 0 42%;
  }
}

.lv__blob {
  position: absolute;
  border-radius: 50%;
  background: $color-primary;

  &--1 {
    width: 340px;
    height: 340px;
    top: -100px;
    right: -80px;
    opacity: 0.12;
  }

  &--2 {
    width: 220px;
    height: 220px;
    bottom: -60px;
    left: -60px;
    opacity: 0.1;
  }

  &--3 {
    width: 130px;
    height: 130px;
    bottom: 25%;
    right: 10%;
    opacity: 0.08;
    background: $color-secondary;
  }
}

.lv__brand-inner {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 1.5rem;
  max-width: 340px;
  width: 100%;
}

.lv__logo-wrap {
  text-decoration: none;
  filter: brightness(1.05);
  transition: transform 0.3s ease;

  &:hover {
    transform: scale(1.05);
  }
}

.lv__brand-name {
  font-size: 2rem;
  font-weight: 900;
  color: $color-primary;
  letter-spacing: -0.02em;
  line-height: 1.1;
  margin: 0;
}

.lv__brand-tagline {
  font-size: 1.05rem;
  color: rgba(255, 255, 255, 0.65);
  line-height: 1.65;
  margin: 0;
}

.lv__brand-feats {
  display: flex;
  flex-direction: column;
  gap: 0.875rem;
  margin-top: 0.5rem;
  width: 100%;
}

.lv__feat {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  color: rgba(255, 255, 255, 0.8);
  font-size: 0.9rem;
  font-weight: 500;

  i {
    width: 36px;
    height: 36px;
    border-radius: 0.75rem;
    background: rgba($color-primary, 0.15);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.8rem;
    color: $color-primary;
    flex-shrink: 0;
  }
}

// ── Form panel ────────────────────────────────────────────────────
.lv__form-panel {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fafaf8;
  padding: 2rem 1.25rem;

  @include respond-to('md') {
    padding: 3rem 2.5rem;
    background: $white;
  }
}

.lv__form-inner {
  width: 100%;
  max-width: 400px;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

// ── Mobile brand header ───────────────────────────────────────────
.lv__mobile-brand {
  display: flex;
  align-items: center;
  gap: 0.75rem;

  @include respond-to('md') {
    display: none;
  }
}


// ── Heading ───────────────────────────────────────────────────────
.lv__heading {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.lv__title {
  font-size: 1.6rem;
  font-weight: 900;
  color: $color-accent;
  letter-spacing: -0.02em;
  margin: 0;
  line-height: 1.1;
}

.lv__subtitle {
  font-size: 0.875rem;
  color: #888;
  margin: 0;
}

// ── Form ──────────────────────────────────────────────────────────
.lv__form {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.lv__group {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  margin-bottom: 1.125rem;

  &--links {
    margin-bottom: 0;
    align-items: flex-end;
  }
}

.lv__label {
  font-size: 0.82rem;
  font-weight: 700;
  color: #555;
  display: flex;
  align-items: center;
  gap: 0.375rem;
  letter-spacing: 0.01em;

  i {
    color: $color-accent;
    font-size: 0.75rem;
  }
}

.lv__input {
  padding: 0.8rem 1rem;
  border: 1.5px solid #e8e3de;
  border-radius: 0.75rem;
  font-size: 0.95rem;
  font-family: inherit;
  background: $white;
  color: $color-accent;
  outline: none;
  transition: border-color 0.18s, box-shadow 0.18s, background 0.18s;
  width: 100%;

  &::placeholder {
    color: #bbb;
  }

  &:focus {
    border-color: $color-accent;
    box-shadow: 0 0 0 3px rgba($color-accent, 0.1);
    background: $white;
  }

  &--has-toggle {
    padding-right: 3rem;
  }
}

.lv__input-wrap {
  position: relative;
  display: flex;
  align-items: center;
}

.lv__eye {
  position: absolute;
  right: 0.875rem;
  background: none;
  border: none;
  cursor: pointer;
  color: #aaa;
  font-size: 0.9rem;
  padding: 0.25rem;
  display: flex;
  align-items: center;
  transition: color 0.15s;

  &:hover {
    color: $color-accent;
  }
}

// ── Error ─────────────────────────────────────────────────────────
.lv__error {
  display: flex;
  align-items: center;
  gap: 0.425rem;
  font-size: 0.835rem;
  color: #c53030;
  background: #fff5f5;
  border: 1px solid #feb2b2;
  border-radius: 0.625rem;
  padding: 0.625rem 0.875rem;
  margin-bottom: 1rem;

  i { flex-shrink: 0; }
}

.lv-error-enter-active { transition: all 0.25s ease; }
.lv-error-leave-active { transition: all 0.18s ease; }
.lv-error-enter-from,
.lv-error-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

// ── Button ────────────────────────────────────────────────────────
.lv__btn {
  width: 100%;
  padding: 0.9rem 1.25rem;
  background: $color-accent;
  color: $color-primary;
  border: none;
  border-radius: 0.875rem;
  font-size: 1rem;
  font-weight: 800;
  cursor: pointer;
  font-family: inherit;
  transition: opacity 0.18s, transform 0.18s, box-shadow 0.18s;
  box-shadow: 0 4px 18px rgba($color-accent, 0.28);

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    box-shadow: none;
  }

  &:not(:disabled):hover {
    opacity: 0.88;
    transform: translateY(-1px);
    box-shadow: 0 6px 22px rgba($color-accent, 0.35);
  }

  &:not(:disabled):active {
    transform: translateY(0);
  }
}

.lv__btn-content {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

// ── Link ──────────────────────────────────────────────────────────
.lv__link {
  font-size: 0.85rem;
  color: $color-accent;
  font-weight: 600;
  text-decoration: none;
  border-bottom: 1px solid transparent;
  transition: border-color 0.15s;

  &:hover {
    border-bottom-color: $color-accent;
  }
}

// ── Hint ──────────────────────────────────────────────────────────
.lv__hint {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  background: #fffbeb;
  border: 1px solid #fed47f;
  border-radius: 0.75rem;
  padding: 0.75rem 0.875rem;
  font-size: 0.8rem;
  color: #7a4f00;
  line-height: 1.45;

  i {
    font-size: 0.875rem;
    color: #b45309;
    flex-shrink: 0;
    margin-top: 1px;
  }
}

// ── Note ──────────────────────────────────────────────────────────
.lv__note {
  font-size: 0.78rem;
  color: #aaa;
  text-align: center;
  line-height: 1.55;
  border-top: 1px solid #f0ebe5;
  padding-top: 1.25rem;
}
</style>
