<script setup lang="ts">
const waBase = 'https://wa.me/593963237880?text='
const waPedido = waBase + encodeURIComponent('Hola TequeCruncheese! 👋 Me gustaría hacer un pedido de tequeños. ¿Cuáles son los productos y precios disponibles?')

import img1 from '@/assets/stock/DSC05880.jpg'
import img2 from '@/assets/stock/DSC06027.jpg'
import img3 from '@/assets/stock/DSC06029.jpg'
import img4 from '@/assets/stock/DSC06085.jpg'
import img5 from '@/assets/stock/DSC06117.jpg'
import img6 from '@/assets/stock/DSC06129.jpg'
import img7 from '@/assets/stock/DSC06166.jpg'
import img8 from '@/assets/stock/DSC06180.jpg'

const col1 = [img1, img2, img3, img4]
const col2 = [img5, img6, img7, img8]
</script>

<template>
  <section id="about" class="hero">
    <!-- Visuals (Background on mobile, right side on desktop) -->
    <div class="hero__visuals-container">
      <div class="hero__visuals">
        <!-- Upward scrolling track -->
        <div class="hero__track hero__track--up">
          <div class="hero__track-inner">
            <img v-for="(img, i) in col1" :key="'col1-a-'+i" :src="img" class="hero__photo" loading="lazy" />
          </div>
          <div class="hero__track-inner">
            <img v-for="(img, i) in col1" :key="'col1-b-'+i" :src="img" class="hero__photo" loading="lazy" />
          </div>
        </div>
        <!-- Downward scrolling track -->
        <div class="hero__track hero__track--down">
          <div class="hero__track-inner">
            <img v-for="(img, i) in col2" :key="'col2-a-'+i" :src="img" class="hero__photo" loading="lazy" />
          </div>
          <div class="hero__track-inner">
            <img v-for="(img, i) in col2" :key="'col2-b-'+i" :src="img" class="hero__photo" loading="lazy" />
          </div>
        </div>
      </div>
      <!-- Soft gradient overlay to blend edges on desktop -->
      <div class="hero__visuals-overlay"></div>
    </div>

    <!-- Content (Glass card on mobile, clean left side on desktop) -->
    <div class="hero__content-wrapper">
      <div class="hero__content">
        <h1 class="hero__title title-display text-accent">
          Eleva tu <br />
          experiencia <span class="text-secondary">Crunch</span>
        </h1>
        <p class="hero__subtitle text-accent">
          Tequeños artesanales hechos a mano. Perfectamente dorados, increíblemente quesudos, locamente adictivos. El alma de toda buena fiesta.
        </p>
        <div class="hero__actions">
          <a :href="waPedido" target="_blank" rel="noopener" class="hero__btn-primary">
            <i class="fa-brands fa-whatsapp"></i> Prueba el Crunch
          </a>
          <a href="#menu" class="hero__btn-outline">Ver Menú</a>
        </div>
        <div class="hero__social">
          <a :href="waPedido" target="_blank" rel="noopener" class="hero__social-icon" aria-label="WhatsApp">
            <i class="fa-brands fa-whatsapp"></i>
          </a>
          <a href="https://www.instagram.com/tequecruncheese_gye/" target="_blank" rel="noopener" class="hero__social-icon" aria-label="Instagram">
            <i class="fa-brands fa-instagram"></i>
          </a>
          <a href="https://www.facebook.com/Tequecruncheese" target="_blank" rel="noopener" class="hero__social-icon" aria-label="Facebook">
            <i class="fa-brands fa-facebook-f"></i>
          </a>
        </div>
      </div>
    </div>
  </section>
</template>

<style lang="scss" scoped>
.hero {
  position: relative;
  min-height: 100vh;
  display: flex;
  align-items: center;
  overflow: hidden;
  background-color: #FAFAFA; /* Soft bg to let accent text pop */

  @include respond-to('lg') {
    display: grid;
    grid-template-columns: 1.1fr 0.9fr; /* Gives text slightly more room */
    background-color: $color-primary; /* Main brand yellow on desktop */
  }

  &__visuals-container {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 1;
    overflow: hidden;
    opacity: 0.25; /* Highly transparent on mobile so text is legible */

    @include respond-to('lg') {
      position: relative;
      opacity: 1;
      height: 100vh;
      background: $color-primary;
    }
  }

  &__visuals {
    display: flex;
    gap: $spacing-md;
    padding: $spacing-md;
    height: 200%;
    transform: rotate(-8deg) scale(1.3);
    
    @include respond-to('lg') {
      height: 150%;
      transform: rotate(-5deg) scale(1.15) translateY(-10%);
      padding: $spacing-lg;
    }
  }

  &__visuals-overlay {
    @include respond-to('lg') {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      background: linear-gradient(
        to right,
        $color-primary 0%,
        rgba(254, 212, 127, 0) 15% /* Blend yellow to transparent */
      );
    }
  }

  &__track {
    display: flex;
    flex-direction: column;
    gap: $spacing-md;
    width: 50%;
    will-change: transform;
    
    &--up {
      animation: scrollUp 35s ease-in-out infinite alternate;
    }
    
    &--down {
      animation: scrollDown 40s ease-in-out infinite alternate; 
      /* Initially shift it to create offset from the up track */
      margin-top: -50%;
    }
  }

  &__track-inner {
    display: flex;
    flex-direction: column;
    gap: $spacing-md;
  }

  &__photo {
    width: 100%;
    border-radius: $border-radius-lg;
    object-fit: cover;
    aspect-ratio: 3/4;
    box-shadow: 0 10px 30px rgba($color-accent, 0.15);
    background-color: rgba($color-accent, 0.1); 
  }

  /* --- CONTENT STYLES --- */

  &__content-wrapper {
    position: relative;
    z-index: 2;
    width: 100%;
    padding: $spacing-md;
    margin-top: $spacing-xxl; 

    @include respond-to('lg') {
      padding: 0 $spacing-xxl;
      margin-top: 0;
    }
  }

  &__content {
    background: rgba(255, 255, 255, 0.85);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border: 1px solid rgba(255, 255, 255, 0.5);
    padding: $spacing-xl;
    border-radius: $border-radius-xl;
    max-width: 600px;
    margin: 0 auto;
    text-align: center;
    box-shadow: 0 20px 40px rgba($color-accent, 0.08);

    @include respond-to('lg') {
      background: transparent;
      backdrop-filter: none;
      -webkit-backdrop-filter: none;
      border: none;
      box-shadow: none;
      text-align: left;
      margin: 0;
      max-width: none;
      padding: 0;
    }
  }

  &__title {
    margin-bottom: $spacing-md;
    line-height: 1.1;
    font-size: 2.8rem;

    @include respond-to('md') { font-size: 3.5rem; }
    @include respond-to('lg') { font-size: 4.5rem; }
  }

  &__subtitle {
    font-size: 1.125rem;
    margin-bottom: $spacing-xl;
    line-height: 1.6;
    font-weight: 500;
    opacity: 0.9;

    @include respond-to('lg') {
      font-size: 1.25rem;
      max-width: 90%;
    }
  }

  &__actions {
    display: flex;
    flex-direction: column;
    gap: $spacing-md;
    justify-content: center;

    @include respond-to('md') { flex-direction: row; }
    @include respond-to('lg') { justify-content: flex-start; }
  }

  &__social {
    display: flex;
    gap: $spacing-md;
    margin-top: $spacing-lg;
    justify-content: center;

    @include respond-to('lg') { justify-content: flex-start; }
  }

  &__social-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 44px;
    height: 44px;
    border-radius: 50%;
    border: 1.5px solid rgba($color-accent, 0.3);
    color: $color-accent;
    font-size: 1.1rem;
    text-decoration: none;
    transition: all 0.2s ease;

    &:hover {
      background: $color-accent;
      color: $white;
      border-color: $color-accent;
      transform: translateY(-2px);
    }
  }

  &__btn-primary {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: $spacing-sm $spacing-xl;
    font-family: inherit;
    font-weight: 600;
    font-size: 1rem;
    border-radius: 9999px;
    cursor: pointer;
    text-decoration: none;
    transition: all 0.3s ease;
    background: $color-primary;
    color: $color-accent;
    border: 2px solid $color-primary;
    
    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba($color-primary, 0.4);
    }

    @include respond-to('lg') {
      background: $color-accent;
      color: $white;
      border-color: $color-accent;

      &:hover {
        box-shadow: 0 4px 12px rgba($color-accent, 0.2);
        background: rgba($color-accent, 0.9);
      }
    }
  }

  &__btn-outline {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: $spacing-sm $spacing-xl;
    font-family: inherit;
    font-weight: 600;
    font-size: 1rem;
    border-radius: 9999px;
    cursor: pointer;
    text-decoration: none;
    transition: all 0.3s ease;
    background: transparent;
    color: $color-accent;
    border: 2px solid $color-accent;
    
    &:hover {
      background: rgba($color-accent, 0.05);
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba($color-accent, 0.1);
    }
  }
}

/* --- ANIMATIONS --- */
@keyframes fadeUp {
  from { opacity: 0; transform: translateY(30px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes scrollUp {
  0% { transform: translateY(0); }
  100% { transform: translateY(calc(-50% - #{$spacing-md} / 2)); }
}

@keyframes scrollDown {
  0% { transform: translateY(calc(-50% - #{$spacing-md} / 2)); }
  100% { transform: translateY(0); }
}
</style>
