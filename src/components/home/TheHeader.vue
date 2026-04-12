<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { RouterLink, useRouter, useRoute } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { useCartStore } from '@/stores/cart'
import { useModalStore } from '@/stores/modal'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()
const modal = useModalStore()

const waPedido = 'https://wa.me/593963237880?text=' + encodeURIComponent(
  'Hola TequeCruncheese! 👋 Quisiera hacer un pedido de tequeños.\n\n' +
  '¿Me pueden informar sobre productos, sabores y precios disponibles?\n\n' +
  '¡Gracias!'
)

const isScrolled = ref(false)
const isMobileMenuOpen = ref(false)
const isUserMenuOpen = ref(false)

// ── Auth state ────────────────────────────────────────────────
const cart = useCartStore()

const isAdmin = computed(() => !!localStorage.getItem('admin_token'))
const isLoggedIn = computed(() => userStore.isLoggedIn)

function handleCartClick() {
  if (route.path !== '/tienda') {
    router.push('/tienda')
  } else {
    cart.toggleCart()
  }
}

const userInitials = computed(() => {
  const name = userStore.name || userStore.email || ''
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('')
})

const displayName = computed(() => {
  if (userStore.name) return userStore.name
  if (userStore.email) return userStore.email.split('@')[0]
  return 'Mi cuenta'
})

// ── Scroll ────────────────────────────────────────────────────
const handleScroll = () => {
  isScrolled.value = window.scrollY > 60
}

// ── Navigation ────────────────────────────────────────────────
const toggleMobileMenu = () => {
  isMobileMenuOpen.value = !isMobileMenuOpen.value
  if (isMobileMenuOpen.value) isUserMenuOpen.value = false
}

const closeMobileMenu = () => {
  isMobileMenuOpen.value = false
}

const toggleUserMenu = () => {
  isUserMenuOpen.value = !isUserMenuOpen.value
}

const closeUserMenu = () => {
  isUserMenuOpen.value = false
}

const scrollToSection = (event: Event, targetId: string) => {
  event.preventDefault()
  closeMobileMenu()

  if (window.location.pathname !== '/') {
    router.push('/').then(() => {
      setTimeout(() => {
        const el = document.getElementById(targetId)
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 150)
    })
    return
  }

  const element = document.getElementById(targetId)
  if (element) {
    const offsetPosition = element.getBoundingClientRect().top + window.pageYOffset - 80
    window.scrollTo({ top: offsetPosition, behavior: 'smooth' })
  }
}

async function handleLogout() {
  const confirmed = await modal.confirm({
    title: '¿Cerrar sesión?',
    message: 'Volverás a ser un visitante. Puedes volver a ingresar cuando quieras.',
    confirmText: 'Cerrar sesión',
    cancelText: 'Cancelar',
    variant: 'danger',
  })
  if (!confirmed) return
  userStore.logout()
  closeUserMenu()
  closeMobileMenu()
  router.push('/')
}

// Close user menu when clicking outside
function handleClickOutside(e: MouseEvent) {
  const target = e.target as HTMLElement
  if (!target.closest('.header__user')) {
    isUserMenuOpen.value = false
  }
}

onMounted(() => {
  window.addEventListener('scroll', handleScroll, { passive: true })
  document.addEventListener('click', handleClickOutside)
  handleScroll()
  userStore.hydrate()
})

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll)
  document.removeEventListener('click', handleClickOutside)
})
</script>

<template>
  <header :class="['header', { 'header--scrolled': isScrolled }]">
    <div class="header__container">

      <!-- Logo -->
      <RouterLink to="/" class="header__logo">
        <img
          src="https://res.cloudinary.com/dvq6znk71/image/upload/f_auto,q_auto/tequecruncheese/logos/logo-small"
          alt="TequeCruncheese"
        />
      </RouterLink>

      <!-- Desktop Nav -->
      <nav class="header__nav">
        <a href="#sabores"   class="header__link" @click="scrollToSection($event, 'sabores')">Sabores</a>
        <a href="#combos"    class="header__link" @click="scrollToSection($event, 'combos')">Cajas y Combos</a>
        <a href="#congelados" class="header__link" @click="scrollToSection($event, 'congelados')">Congelados</a>
        <RouterLink to="/tienda" class="header__link">Tienda</RouterLink>
      </nav>

      <!-- Desktop Actions -->
      <div class="header__actions">

        <!-- ADMIN badge -->
        <RouterLink v-if="isAdmin" to="/admin/dashboard" class="header__admin-badge">
          <i class="fa-solid fa-shield-halved"></i>
          Panel Admin
        </RouterLink>

        <!-- LOGGED IN: user pill + dropdown -->
        <div v-else-if="isLoggedIn" class="header__user" @click.stop="toggleUserMenu">
          <div :class="['header__user-pill', { 'header__user-pill--open': isUserMenuOpen }]">
            <span class="header__user-avatar">
              <template v-if="userInitials">{{ userInitials }}</template>
              <i v-else class="fa-solid fa-user"></i>
            </span>
            <span class="header__user-name">{{ displayName }}</span>
            <i class="fa-solid fa-chevron-down header__user-chevron"></i>
          </div>

          <!-- Dropdown -->
          <Transition name="user-menu">
            <div v-if="isUserMenuOpen" class="header__user-dropdown">
              <div class="header__user-dropdown-header">
                <span class="header__user-dropdown-email">{{ userStore.email }}</span>
              </div>
              <RouterLink
                to="/mis-pedidos"
                class="header__user-dropdown-item"
                @click="closeUserMenu"
              >
                <i class="fa-solid fa-bag-shopping"></i>
                Mis pedidos
              </RouterLink>
              <button class="header__user-dropdown-item header__user-dropdown-item--danger" @click="handleLogout">
                <i class="fa-solid fa-right-from-bracket"></i>
                Cerrar sesión
              </button>
            </div>
          </Transition>
        </div>

        <!-- GUEST: login button -->
        <RouterLink v-else to="/login" class="header__login-btn">
          <i class="fa-regular fa-user"></i>
          <span>Iniciar sesión</span>
        </RouterLink>

        <!-- Cart icon -->
        <button class="header__cart-btn" @click="handleCartClick" aria-label="Ver carrito">
          <i class="fa-solid fa-bag-shopping"></i>
          <Transition name="cart-badge">
            <span v-if="cart.totalItems > 0" class="header__cart-badge">{{ cart.totalItems }}</span>
          </Transition>
        </button>

        <!-- WA CTA -->
        <a :href="waPedido" target="_blank" rel="noopener" class="header__wa-btn">
          <i class="fa-brands fa-whatsapp"></i>
          <span>Pide ahora</span>
        </a>
      </div>

      <!-- Hamburger -->
      <button
        class="header__hamburger"
        :aria-expanded="isMobileMenuOpen"
        aria-label="Menú"
        @click="toggleMobileMenu"
      >
        <span class="header__hamburger-line"></span>
        <span class="header__hamburger-line"></span>
        <span class="header__hamburger-line"></span>
      </button>
    </div>

    <!-- Mobile menu overlay -->
    <Transition name="mobile-menu">
      <div v-if="isMobileMenuOpen" class="header__mobile" @click.self="closeMobileMenu">
        <nav class="header__mobile-nav">

          <!-- User section at top -->
          <div v-if="isAdmin" class="header__mobile-user-section">
            <span class="header__mobile-role-badge">
              <i class="fa-solid fa-shield-halved"></i> Admin
            </span>
          </div>
          <div v-else-if="isLoggedIn" class="header__mobile-user-section">
            <span class="header__mobile-avatar">
              <template v-if="userInitials">{{ userInitials }}</template>
              <i v-else class="fa-solid fa-user"></i>
            </span>
            <span class="header__mobile-user-name">{{ displayName }}</span>
          </div>

          <div class="header__mobile-divider" v-if="isAdmin || isLoggedIn"></div>

          <a href="#sabores"    class="header__mobile-link" @click="scrollToSection($event, 'sabores')">Sabores</a>
          <a href="#combos"     class="header__mobile-link" @click="scrollToSection($event, 'combos')">Cajas y Combos</a>
          <a href="#congelados" class="header__mobile-link" @click="scrollToSection($event, 'congelados')">Congelados</a>
          <RouterLink to="/tienda"      class="header__mobile-link" @click="closeMobileMenu">Tienda</RouterLink>

          <div class="header__mobile-divider"></div>

          <!-- Role-based mobile CTA -->
          <RouterLink v-if="isAdmin" to="/admin/dashboard" class="header__mobile-admin-btn" @click="closeMobileMenu">
            <i class="fa-solid fa-shield-halved"></i> Panel Admin
          </RouterLink>
          <template v-else-if="isLoggedIn">
            <RouterLink to="/mis-pedidos" class="header__mobile-link" @click="closeMobileMenu">
              <i class="fa-solid fa-bag-shopping" style="margin-right:0.4rem;opacity:0.7;"></i>
              Mis pedidos
            </RouterLink>
            <button class="header__mobile-logout" @click="handleLogout">
              <i class="fa-solid fa-right-from-bracket"></i> Cerrar sesión
            </button>
          </template>
          <RouterLink v-else to="/login" class="header__mobile-login-btn" @click="closeMobileMenu">
            <i class="fa-regular fa-user"></i> Iniciar sesión
          </RouterLink>

          <button
            v-if="cart.totalItems > 0"
            class="header__mobile-cart"
            @click="() => { closeMobileMenu(); cart.openCart() }"
          >
            <i class="fa-solid fa-bag-shopping"></i>
            Ver carrito
            <span class="header__mobile-cart-badge">{{ cart.totalItems }}</span>
          </button>

          <a :href="waPedido" target="_blank" rel="noopener" class="header__mobile-wa" @click="closeMobileMenu">
            <i class="fa-brands fa-whatsapp"></i> Pide ahora
          </a>
        </nav>
      </div>
    </Transition>
  </header>
</template>

<style lang="scss" scoped>
// ── Base ──────────────────────────────────────────────────────────────────────
.header {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  z-index: $z-index-nav;
  transition: background 0.35s ease, padding 0.35s ease, box-shadow 0.35s ease,
              backdrop-filter 0.35s ease;
  padding: $spacing-md 0;
  background: transparent;

  &--scrolled {
    background: rgba($color-accent, 0.96);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    padding: $spacing-sm 0;
    box-shadow: 0 4px 32px rgba(0, 0, 0, 0.22);
  }

  // ── Container ───────────────────────────────────────────────
  &__container {
    max-width: 1240px;
    margin: 0 auto;
    padding: 0 $spacing-md;
    display: flex;
    align-items: center;
    gap: $spacing-lg;
  }

  // ── Logo ────────────────────────────────────────────────────
  &__logo {
    display: flex;
    align-items: center;
    text-decoration: none;
    flex-shrink: 0;

    img {
      height: 46px;
      width: auto;
      transition: height 0.3s ease;
    }
  }

  &--scrolled &__logo img { height: 36px; }

  // ── Desktop nav ─────────────────────────────────────────────
  &__nav {
    display: none;
    align-items: center;
    gap: $spacing-md;
    flex: 1;

    @include respond-to('lg') { display: flex; }
  }

  &__link {
    font-family: $font-secondary;
    font-weight: 600;
    font-size: 0.9rem;
    color: $color-accent;
    text-decoration: none;
    letter-spacing: 0.01em;
    transition: color 0.2s ease, opacity 0.2s ease;
    white-space: nowrap;

    &:hover { color: $color-secondary; }
  }

  &--scrolled &__link {
    color: rgba($color-primary, 0.85);
    &:hover { color: $color-primary; }
  }

  // ── Desktop actions ──────────────────────────────────────────
  &__actions {
    display: none;
    align-items: center;
    gap: 0.625rem;
    flex-shrink: 0;

    @include respond-to('lg') { display: flex; }
  }

  // ── Admin badge ──────────────────────────────────────────────
  &__admin-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    padding: 0.45rem 0.875rem;
    border-radius: 999px;
    font-size: 0.8rem;
    font-weight: 700;
    letter-spacing: 0.02em;
    text-decoration: none;
    background: rgba($color-primary, 0.18);
    color: $color-accent;
    border: 1.5px solid rgba($color-accent, 0.2);
    transition: background 0.2s, border-color 0.2s;

    i { font-size: 0.75rem; }

    &:hover {
      background: rgba($color-primary, 0.35);
      border-color: rgba($color-accent, 0.4);
    }
  }

  &--scrolled &__admin-badge {
    background: rgba($color-primary, 0.15);
    color: $color-primary;
    border-color: rgba($color-primary, 0.3);

    &:hover {
      background: rgba($color-primary, 0.25);
      border-color: $color-primary;
    }
  }

  // ── User pill ───────────────────────────────────────────────
  &__user {
    position: relative;
  }

  &__user-pill {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.35rem 0.75rem 0.35rem 0.35rem;
    border-radius: 999px;
    border: 1.5px solid rgba($color-accent, 0.2);
    background: rgba($color-accent, 0.06);
    cursor: pointer;
    transition: background 0.2s, border-color 0.2s, box-shadow 0.2s;
    user-select: none;

    &:hover,
    &--open {
      background: rgba($color-accent, 0.12);
      border-color: rgba($color-accent, 0.35);
      box-shadow: 0 2px 12px rgba($color-accent, 0.08);
    }
  }

  &--scrolled &__user-pill {
    border-color: rgba($color-primary, 0.25);
    background: rgba($color-primary, 0.1);

    &:hover, &--open {
      background: rgba($color-primary, 0.2);
      border-color: rgba($color-primary, 0.5);
    }
  }

  &__user-avatar {
    width: 30px;
    height: 30px;
    border-radius: 50%;
    background: $color-accent;
    color: $color-primary;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.7rem;
    font-weight: 800;
    font-family: $font-secondary;
    flex-shrink: 0;

    i { font-size: 0.72rem; font-weight: 400; }
  }

  &--scrolled &__user-avatar {
    background: $color-primary;
    color: $color-accent;
  }

  &__user-name {
    font-size: 0.85rem;
    font-weight: 600;
    color: $color-accent;
    max-width: 120px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &--scrolled &__user-name { color: $color-primary; }

  &__user-chevron {
    font-size: 0.6rem;
    color: $color-accent;
    opacity: 0.6;
    transition: transform 0.2s ease;

    .header__user-pill--open & { transform: rotate(180deg); }
  }

  &--scrolled &__user-chevron { color: $color-primary; }

  // ── Dropdown ────────────────────────────────────────────────
  &__user-dropdown {
    position: absolute;
    top: calc(100% + 10px);
    right: 0;
    min-width: 210px;
    background: $white;
    border-radius: 14px;
    box-shadow: 0 8px 40px rgba(0, 0, 0, 0.14), 0 2px 8px rgba(0, 0, 0, 0.06);
    border: 1px solid rgba(0, 0, 0, 0.06);
    overflow: hidden;
    z-index: 200;

    &-header {
      padding: 0.875rem 1rem 0.625rem;
      border-bottom: 1px solid #f3f3f3;
    }

    &-email {
      font-size: 0.78rem;
      color: #999;
      display: block;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    &-item {
      display: flex;
      align-items: center;
      gap: 0.625rem;
      width: 100%;
      padding: 0.75rem 1rem;
      font-size: 0.875rem;
      font-weight: 600;
      color: $color-accent;
      text-decoration: none;
      background: none;
      border: none;
      cursor: pointer;
      transition: background 0.15s;
      text-align: left;

      i {
        font-size: 0.8rem;
        opacity: 0.6;
        width: 16px;
        text-align: center;
      }

      &:hover { background: #f8f5f0; }

      &--danger {
        color: #c53030;

        i { opacity: 0.8; }
        &:hover { background: #fff5f5; }
      }
    }
  }

  // ── Login button ─────────────────────────────────────────────
  &__login-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.45rem 1rem;
    border-radius: 999px;
    font-size: 0.85rem;
    font-weight: 700;
    text-decoration: none;
    color: $color-accent;
    border: 1.5px solid rgba($color-accent, 0.3);
    background: transparent;
    transition: background 0.2s, border-color 0.2s, color 0.2s;
    white-space: nowrap;

    i { font-size: 0.8rem; }

    &:hover {
      background: $color-accent;
      border-color: $color-accent;
      color: $color-primary;
    }
  }

  &--scrolled &__login-btn {
    color: $color-primary;
    border-color: rgba($color-primary, 0.4);

    &:hover {
      background: $color-primary;
      border-color: $color-primary;
      color: $color-accent;
    }
  }

  // ── Cart button ───────────────────────────────────────────
  &__cart-btn {
    position: relative;
    background: rgba($color-accent, 0.08);
    border: 1.5px solid rgba($color-accent, 0.15);
    border-radius: 50%;
    width: 38px;
    height: 38px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    color: $color-accent;
    font-size: 0.9rem;
    transition: background 0.2s, border-color 0.2s;

    &:hover {
      background: rgba($color-accent, 0.15);
      border-color: rgba($color-accent, 0.3);
    }
  }

  &--scrolled &__cart-btn {
    background: rgba($color-primary, 0.12);
    border-color: rgba($color-primary, 0.2);
    color: $color-primary;

    &:hover {
      background: rgba($color-primary, 0.22);
      border-color: rgba($color-primary, 0.4);
    }
  }

  &__cart-badge {
    position: absolute;
    top: -5px;
    right: -5px;
    background: $color-primary;
    color: $color-accent;
    border-radius: 50%;
    width: 18px;
    height: 18px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.62rem;
    font-weight: 900;
    border: 2px solid $white;
    pointer-events: none;
  }

  // ── WA button ────────────────────────────────────────────────
  &__wa-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.5rem 1.1rem;
    border-radius: 999px;
    font-size: 0.85rem;
    font-weight: 700;
    text-decoration: none;
    background: $color-primary;
    color: $color-accent;
    transition: opacity 0.2s, transform 0.15s;
    white-space: nowrap;

    i { font-size: 1rem; }

    &:hover {
      opacity: 0.88;
      transform: translateY(-1px);
    }
  }

  &--scrolled &__wa-btn {
    background: $color-primary;
    color: $color-accent;
  }

  // ── Hamburger ────────────────────────────────────────────────
  &__hamburger {
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    width: 24px;
    height: 18px;
    background: none;
    border: none;
    cursor: pointer;
    z-index: $z-index-nav + 10;
    margin-left: auto;

    @include respond-to('lg') { display: none; }

    &-line {
      width: 100%;
      height: 2px;
      background: $color-accent;
      border-radius: 2px;
      transition: all 0.3s ease;
    }
  }

  &--scrolled &__hamburger-line { background: $color-primary; }

  &__hamburger[aria-expanded="true"] {
    .header__hamburger-line {
      &:nth-child(1) { transform: translateY(8px) rotate(45deg); }
      &:nth-child(2) { opacity: 0; }
      &:nth-child(3) { transform: translateY(-8px) rotate(-45deg); }
    }
  }

  // ── Mobile overlay ───────────────────────────────────────────
  &__mobile {
    position: fixed;
    inset: 0;
    z-index: $z-index-nav - 1;
    background: rgba($color-accent, 0.97);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  &__mobile-nav {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1.25rem;
    padding: 2rem;
    width: 100%;
    max-width: 320px;
  }

  &__mobile-user-section {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.375rem;
    padding-bottom: 0.5rem;
  }

  &__mobile-avatar {
    width: 52px;
    height: 52px;
    border-radius: 50%;
    background: $color-primary;
    color: $color-accent;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.1rem;
    font-weight: 800;
    font-family: $font-secondary;

    i { font-size: 1rem; font-weight: 400; }
  }

  &__mobile-user-name {
    font-size: 1rem;
    font-weight: 700;
    color: $color-primary;
    max-width: 200px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__mobile-role-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    background: rgba($color-primary, 0.15);
    color: $color-primary;
    border: 1px solid rgba($color-primary, 0.3);
    border-radius: 999px;
    padding: 0.4rem 1rem;
    font-size: 0.85rem;
    font-weight: 700;
  }

  &__mobile-divider {
    width: 40px;
    height: 1px;
    background: rgba($color-primary, 0.15);
    border-radius: 999px;
  }

  &__mobile-link {
    font-family: $font-secondary;
    font-size: 1.3rem;
    font-weight: 700;
    color: $color-primary;
    text-decoration: none;
    opacity: 0.9;
    transition: opacity 0.15s, transform 0.15s;

    &:hover {
      opacity: 1;
      transform: translateY(-2px);
    }
  }

  &__mobile-login-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.65rem 1.5rem;
    border-radius: 999px;
    font-size: 0.95rem;
    font-weight: 700;
    text-decoration: none;
    color: $color-accent;
    background: $color-primary;
    transition: opacity 0.15s;

    &:hover { opacity: 0.88; }
  }

  &__mobile-logout {
    background: none;
    border: 1px solid rgba($color-primary, 0.25);
    border-radius: 999px;
    color: rgba($color-primary, 0.6);
    padding: 0.5rem 1.25rem;
    font-size: 0.85rem;
    font-weight: 600;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    transition: border-color 0.15s, color 0.15s;

    &:hover {
      border-color: rgba($color-primary, 0.5);
      color: $color-primary;
    }
  }

  &__mobile-admin-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.65rem 1.5rem;
    border-radius: 999px;
    font-size: 0.95rem;
    font-weight: 700;
    text-decoration: none;
    color: $color-accent;
    background: $color-primary;
    transition: opacity 0.15s;

    &:hover { opacity: 0.88; }
  }

  &__mobile-cart {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.65rem 1.25rem;
    border-radius: 999px;
    font-size: 0.95rem;
    font-weight: 700;
    cursor: pointer;
    background: rgba($color-primary, 0.15);
    color: $color-primary;
    border: 1px solid rgba($color-primary, 0.25);
    transition: background 0.15s;

    &:hover { background: rgba($color-primary, 0.25); }
  }

  &__mobile-cart-badge {
    background: $color-primary;
    color: $color-accent;
    border-radius: 50%;
    width: 20px;
    height: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.68rem;
    font-weight: 900;
  }

  &__mobile-wa {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.65rem 1.5rem;
    border-radius: 999px;
    font-size: 0.95rem;
    font-weight: 700;
    text-decoration: none;
    color: #128c3e;
    background: rgba(37, 211, 102, 0.12);
    border: 1.5px solid rgba(37, 211, 102, 0.3);
    transition: background 0.15s, border-color 0.15s;

    i { font-size: 1.1rem; }

    &:hover {
      background: rgba(37, 211, 102, 0.22);
      border-color: rgba(37, 211, 102, 0.5);
    }
  }
}

// ── Transitions ───────────────────────────────────────────────────────────────
.user-menu-enter-active,
.user-menu-leave-active {
  transition: opacity 0.18s ease, transform 0.18s ease;
}
.user-menu-enter-from,
.user-menu-leave-to {
  opacity: 0;
  transform: translateY(-6px) scale(0.97);
}

.mobile-menu-enter-active,
.mobile-menu-leave-active {
  transition: opacity 0.3s ease;
}
.mobile-menu-enter-from,
.mobile-menu-leave-to {
  opacity: 0;
}

.cart-badge-enter-active,
.cart-badge-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}
.cart-badge-enter-from,
.cart-badge-leave-to {
  opacity: 0;
  transform: scale(0.4);
}
</style>
