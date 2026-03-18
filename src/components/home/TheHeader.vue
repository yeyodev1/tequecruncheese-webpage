<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

const isScrolled = ref(false)
const isMobileMenuOpen = ref(false)

const handleScroll = () => {
  isScrolled.value = window.scrollY > 50
}

const toggleMobileMenu = () => {
  isMobileMenuOpen.value = !isMobileMenuOpen.value
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
        <a href="#about" class="header__link">Nuestra Historia</a>
        <a href="#products" class="header__link">Los Tequeños</a>
        <a href="#contact" class="header__link">Contacto</a>
      </nav>

      <div class="header__actions header__actions--desktop">
        <button class="btn btn--primary">Pide Ahora</button>
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
        <a href="#about" class="header__link" @click="toggleMobileMenu">Nuestra Historia</a>
        <a href="#products" class="header__link" @click="toggleMobileMenu">Los Tequeños</a>
        <a href="#contact" class="header__link" @click="toggleMobileMenu">Contacto</a>
        <button class="btn btn--primary header__mobile-btn">Pide Ahora</button>
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
  box-shadow: 0 2px 20px rgba($color-accent, 0.05);

  @include respond-to('lg') {
    background-color: $color-primary;
  }
  
  &--scrolled {
    padding: $spacing-sm 0;
    box-shadow: 0 4px 30px rgba($color-accent, 0.1);
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
    position: relative;

    &::after {
      content: '';
      position: absolute;
      bottom: -4px;
      left: 0;
      width: 0;
      height: 2px;
      background-color: $color-secondary;
      transition: width 0.3s ease;
    }

    &:hover::after {
      width: 100%;
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
