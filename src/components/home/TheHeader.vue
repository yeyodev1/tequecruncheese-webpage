<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

const waPedido = 'https://wa.me/593963237880?text=' + encodeURIComponent(
  'Hola TequeCruncheese! 👋 Quisiera hacer un pedido de tequeños.\n\n' +
  '¿Me pueden informar sobre productos, sabores y precios disponibles?\n\n' +
  '¡Gracias!'
)

const isScrolled = ref(false)
const isMobileMenuOpen = ref(false)

const handleScroll = () => {
  isScrolled.value = window.scrollY > 50
}

const toggleMobileMenu = () => {
  isMobileMenuOpen.value = !isMobileMenuOpen.value
}

const scrollToSection = (event: Event, targetId: string) => {
  event.preventDefault()
  
  // if not on home view, we might need a different handling, but for now we expect sections to exist
  const element = document.getElementById(targetId)
  if (element) {
    const headerOffset = 80 // roughly header height
    const elementPosition = element.getBoundingClientRect().top
    const offsetPosition = elementPosition + window.pageYOffset - headerOffset
    
    window.scrollTo({
      top: offsetPosition,
      behavior: 'smooth'
    })
  }
  
  // Close mobile menu if open
  isMobileMenuOpen.value = false
}

onMounted(() => {
  window.addEventListener('scroll', handleScroll)
})

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll)
})
</script>

<template>
  <header :class="['header', { 'header--scrolled': isScrolled }]">
    <div class="header__container">
      <a href="#" class="header__logo">
        <img src="@/assets/logos/logo-small.png" alt="TequeCruncheese Logo" />
      </a>

      <!-- Desktop Nav -->
      <nav class="header__nav header__nav--desktop">
        <a href="#about" class="header__link" @click="scrollToSection($event, 'about')">Nuestra Historia</a>
        <a href="#products" class="header__link" @click="scrollToSection($event, 'products')">Los Tequeños</a>
        <a href="#contact" class="header__link" @click="scrollToSection($event, 'contact')">Contacto</a>
      </nav>

      <div class="header__actions header__actions--desktop">
        <a :href="waPedido" target="_blank" rel="noopener" class="btn btn--primary" style="text-decoration:none;">
          <i class="fa-brands fa-whatsapp"></i> Pide Ahora
        </a>
      </div>

      <!-- Mobile Hamburger -->
      <button 
        class="header__hamburger" 
        @click="toggleMobileMenu" 
        :aria-expanded="isMobileMenuOpen"
        aria-label="Alternar menú de navegación"
      >
        <span class="header__hamburger-line"></span>
        <span class="header__hamburger-line"></span>
        <span class="header__hamburger-line"></span>
      </button>
    </div>

    <!-- Mobile Nav -->
    <div :class="['header__mobile-menu', { 'header__mobile-menu--open': isMobileMenuOpen }]">
      <nav class="header__mobile-nav">
        <a href="#about" class="header__link" @click="scrollToSection($event, 'about')">Nuestra Historia</a>
        <a href="#products" class="header__link" @click="scrollToSection($event, 'products')">Los Tequeños</a>
        <a href="#contact" class="header__link" @click="scrollToSection($event, 'contact')">Contacto</a>
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
  transition: all 0.3s ease;
  padding: $spacing-md 0;
  background-color: #FAFAFA;
  box-shadow: none;

  @include respond-to('lg') {
    background-color: $color-primary;
  }

  &--scrolled {
    padding: $spacing-sm 0;
    box-shadow: 0 4px 24px rgba($color-accent, 0.08);
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
    img {
      height: 48px;
      width: auto;
      transition: height 0.3s ease;
    }
  }

  &--scrolled &__logo img {
    height: 40px;
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

  &__link {
    font-family: $font-secondary;
    font-weight: 600;
    font-size: 1rem;
    color: $color-accent;
    text-decoration: none;
    position: relative;
    transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
    
    // Smooth translation instead of underline on hover
    &:hover {
      color: $color-secondary;
      transform: translateY(-2px);
    }
    
    &:active {
      transform: translateY(0);
    }
  }

  &__hamburger {
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    width: 24px;
    height: 18px;
    z-index: $z-index-nav + 1; // Above mobile menu

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

  &__mobile-menu {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100vh;
    @include glass($opacity: 0.95, $blur: 24px);
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    transform: translateY(-100%);
    transition: transform 0.4s cubic-bezier(0.77, 0, 0.175, 1);
    z-index: $z-index-nav - 1;

    &--open {
      transform: translateY(0);
    }
  }

  &__mobile-nav {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: $spacing-lg;

    .header__link {
      font-size: 1.5rem;
    }
  }

  &__mobile-btn {
    margin-top: $spacing-md;
    width: 100%;
    max-width: 200px;
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
