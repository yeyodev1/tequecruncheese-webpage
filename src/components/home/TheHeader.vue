<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { RouterLink, useRouter } from 'vue-router'

const router = useRouter()

const waPedido = 'https://wa.me/593963237880?text=' + encodeURIComponent(
  'Hola TequeCruncheese! 👋 Quisiera hacer un pedido de tequeños.\n\n' +
  '¿Me pueden informar sobre productos, sabores y precios disponibles?\n\n' +
  '¡Gracias!'
)

const isScrolled = ref(false)
const isMobileMenuOpen = ref(false)

const handleScroll = () => {
  isScrolled.value = window.scrollY > 60
}

const toggleMobileMenu = () => {
  isMobileMenuOpen.value = !isMobileMenuOpen.value
}

const scrollToSection = (event: Event, targetId: string) => {
  event.preventDefault()
  isMobileMenuOpen.value = false

  // If not on home, navigate there first then scroll
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
    const headerOffset = 80
    const offsetPosition = element.getBoundingClientRect().top + window.pageYOffset - headerOffset
    window.scrollTo({ top: offsetPosition, behavior: 'smooth' })
  }
}

onMounted(() => {
  window.addEventListener('scroll', handleScroll, { passive: true })
  handleScroll()
})

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll)
})
</script>

<template>
  <header :class="['header', { 'header--scrolled': isScrolled }]">
    <div class="header__container">
      <!-- Logo → home -->
      <RouterLink to="/" class="header__logo">
        <img src="@/assets/logos/logo-small.png" alt="TequeCruncheese Logo" />
      </RouterLink>

      <!-- Desktop Nav -->
      <nav class="header__nav header__nav--desktop">
        <a href="#sabores" class="header__link" @click="scrollToSection($event, 'sabores')">Sabores</a>
        <a href="#combos" class="header__link" @click="scrollToSection($event, 'combos')">Cajas y Combos</a>
        <a href="#congelados" class="header__link" @click="scrollToSection($event, 'congelados')">Congelados</a>
        <RouterLink to="/tienda" class="header__link">Tienda</RouterLink>
        <a href="#mis-pedidos" class="header__link" @click="scrollToSection($event, 'mis-pedidos')">Mis pedidos</a>
      </nav>

      <div class="header__actions header__actions--desktop">
        <a :href="waPedido" target="_blank" rel="noopener" class="btn btn--primary header__wa-btn" style="text-decoration:none;">
          <i class="fa-brands fa-whatsapp"></i> Pide Ahora
        </a>
      </div>

      <!-- Mobile Hamburger -->
      <button
        class="header__hamburger"
        :aria-expanded="isMobileMenuOpen"
        aria-label="Alternar menú de navegación"
        @click="toggleMobileMenu"
      >
        <span class="header__hamburger-line"></span>
        <span class="header__hamburger-line"></span>
        <span class="header__hamburger-line"></span>
      </button>
    </div>

    <!-- Mobile Nav -->
    <div :class="['header__mobile-menu', { 'header__mobile-menu--open': isMobileMenuOpen }]">
      <nav class="header__mobile-nav">
        <a href="#sabores" class="header__link" @click="scrollToSection($event, 'sabores')">Sabores</a>
        <a href="#combos" class="header__link" @click="scrollToSection($event, 'combos')">Cajas y Combos</a>
        <a href="#congelados" class="header__link" @click="scrollToSection($event, 'congelados')">Congelados</a>
        <RouterLink to="/tienda" class="header__link" @click="isMobileMenuOpen = false">Tienda</RouterLink>
        <a href="#mis-pedidos" class="header__link" @click="scrollToSection($event, 'mis-pedidos')">Mis pedidos</a>
        <a :href="waPedido" target="_blank" rel="noopener" class="btn btn--primary header__mobile-btn" style="text-decoration:none;">
          <i class="fa-brands fa-whatsapp"></i> Pide Ahora
        </a>
      </nav>
    </div>
  </header>
</template>

<style lang="scss" scoped>
.header {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  z-index: $z-index-nav;
  transition: background 0.35s ease, padding 0.35s ease, box-shadow 0.35s ease;
  padding: $spacing-md 0;

  // Default: transparent with dark links (visible on hero)
  background: transparent;

  &--scrolled {
    background: $color-accent;
    padding: $spacing-sm 0;
    box-shadow: 0 4px 24px rgba(0, 0, 0, 0.18);
  }

  &__container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 $spacing-md;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  &__logo {
    display: flex;
    align-items: center;
    text-decoration: none;

    img {
      height: 48px;
      width: auto;
      transition: height 0.3s ease;
    }
  }

  &--scrolled &__logo img {
    height: 38px;
  }

  &__nav {
    display: none;
    align-items: center;
    gap: $spacing-lg;

    @include respond-to('md') {
      display: flex;
    }
  }

  &__actions {
    display: none;

    @include respond-to('md') {
      display: block;
    }
  }

  // Links: dark on transparent header, light on scrolled
  &__link {
    font-family: $font-secondary;
    font-weight: 600;
    font-size: 0.95rem;
    color: $color-accent;
    text-decoration: none;
    transition: color 0.25s ease, transform 0.2s ease;

    &:hover {
      transform: translateY(-2px);
      color: $color-secondary;
    }

    &:active { transform: translateY(0); }
  }

  &--scrolled &__link {
    color: $color-primary;

    &:hover { color: lighten(#fed47f, 25%); }
  }

  // WA button adapts on scroll
  &__wa-btn {
    transition: background 0.25s, color 0.25s, border-color 0.25s;
  }

  &--scrolled &__wa-btn {
    background: $color-primary !important;
    color: $color-accent !important;
  }

  &__hamburger {
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    width: 24px;
    height: 18px;
    background: none;
    border: none;
    cursor: pointer;
    z-index: $z-index-nav + 1;

    @include respond-to('md') {
      display: none;
    }

    &-line {
      width: 100%;
      height: 2px;
      background-color: $color-accent;
      transition: all 0.3s ease;
      border-radius: $border-radius-sm;
    }
  }

  &--scrolled &__hamburger-line {
    background-color: $color-primary;
  }

  &__mobile-menu {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100vh;
    background: rgba($color-accent, 0.97);
    backdrop-filter: blur(16px);
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    transform: translateY(-100%);
    transition: transform 0.4s cubic-bezier(0.77, 0, 0.175, 1);
    z-index: $z-index-nav - 1;

    &--open { transform: translateY(0); }

    .header__link {
      color: $color-primary;
      font-size: 1.4rem;

      &:hover { color: $white; }
    }
  }

  &__mobile-nav {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: $spacing-lg;
  }

  &__mobile-btn {
    margin-top: $spacing-md;
    width: 100%;
    max-width: 220px;
  }
}

// Hamburger Animation (Close Icon)
.header__hamburger[aria-expanded="true"] {
  .header__hamburger-line {
    &:nth-child(1) {
      transform: translateY(8px) rotate(45deg);
    }
    &:nth-child(2) {
      opacity: 0;
    }
    &:nth-child(3) {
      transform: translateY(-8px) rotate(-45deg);
    }
  }
}
</style>
