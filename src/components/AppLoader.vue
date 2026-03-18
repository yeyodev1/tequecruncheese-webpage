<script setup lang="ts">
import { ref, onMounted } from 'vue'
import logoSmall from '@/assets/logos/logo-small.png'

const visible = ref(true)
const hiding  = ref(false)

onMounted(() => {
  const minDisplay = 1800 // ms mínimo para que se vea la animación

  const hide = () => {
    hiding.value = true
    setTimeout(() => { visible.value = false }, 700)
  }

  if (document.readyState === 'complete') {
    setTimeout(hide, minDisplay)
  } else {
    const start = Date.now()
    window.addEventListener('load', () => {
      const elapsed = Date.now() - start
      const remaining = Math.max(0, minDisplay - elapsed)
      setTimeout(hide, remaining)
    }, { once: true })
  }
})
</script>

<template>
  <Transition name="loader-fade">
    <div v-if="visible" :class="['app-loader', { 'app-loader--hiding': hiding }]">
      <!-- Background texture dots -->
      <div class="app-loader__bg"></div>

      <!-- Center content -->
      <div class="app-loader__content">
        <div class="app-loader__logo-wrap">
          <img :src="logoSmall" alt="TequeCruncheese" class="app-loader__logo" />
          <div class="app-loader__ring"></div>
          <div class="app-loader__ring app-loader__ring--2"></div>
        </div>

        <p class="app-loader__brand">TequeCruncheese</p>
        <p class="app-loader__tagline">Tequeños artesanales · Guayaquil 🇪🇨</p>

        <!-- Animated progress bar -->
        <div class="app-loader__bar-wrap">
          <div class="app-loader__bar"></div>
        </div>

        <p class="app-loader__hint">Preparando tu experiencia Crunch…</p>
      </div>
    </div>
  </Transition>
</template>

<style lang="scss" scoped>
.app-loader {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: $color-accent;
  overflow: hidden;
  transition: opacity 0.7s ease;

  &--hiding { opacity: 0; }

  // ── Subtle dot grid background ────────────────────────────────────────────
  &__bg {
    position: absolute;
    inset: 0;
    background-image: radial-gradient(rgba($color-primary, 0.07) 1px, transparent 1px);
    background-size: 28px 28px;
    pointer-events: none;
  }

  // ── Center content ────────────────────────────────────────────────────────
  &__content {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: $spacing-sm;
    animation: loaderFadeUp 0.6s ease both;
  }

  // ── Logo + spinning rings ─────────────────────────────────────────────────
  &__logo-wrap {
    position: relative;
    width: 120px;
    height: 120px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: $spacing-md;
  }

  &__logo {
    width: 80px;
    height: 80px;
    object-fit: contain;
    animation: logoPulse 2s ease-in-out infinite;
    position: relative;
    z-index: 2;
  }

  &__ring {
    position: absolute;
    inset: 0;
    border-radius: 50%;
    border: 2px solid transparent;
    border-top-color: $color-primary;
    border-right-color: rgba($color-primary, 0.3);
    animation: spin 1.2s linear infinite;

    &--2 {
      inset: 8px;
      border-top-color: transparent;
      border-bottom-color: rgba($color-primary, 0.5);
      animation-duration: 1.8s;
      animation-direction: reverse;
    }
  }

  // ── Text ──────────────────────────────────────────────────────────────────
  &__brand {
    font-family: $font-secondary;
    font-size: 1.8rem;
    font-weight: 800;
    color: $color-primary;
    letter-spacing: 0.04em;
    margin: 0;
  }

  &__tagline {
    font-size: 0.85rem;
    color: rgba($white, 0.5);
    letter-spacing: 0.06em;
    margin: 0 0 $spacing-lg;
  }

  // ── Progress bar ──────────────────────────────────────────────────────────
  &__bar-wrap {
    width: 200px;
    height: 3px;
    background: rgba($white, 0.1);
    border-radius: 9999px;
    overflow: hidden;
  }

  &__bar {
    height: 100%;
    width: 40%;
    background: linear-gradient(90deg, $color-primary, lighten($color-primary, 15%));
    border-radius: 9999px;
    animation: barSlide 1.4s ease-in-out infinite;
  }

  &__hint {
    font-size: 0.75rem;
    color: rgba($white, 0.3);
    letter-spacing: 0.08em;
    margin: $spacing-sm 0 0;
    animation: blink 1.8s ease-in-out infinite;
  }
}

// ── Animations ───────────────────────────────────────────────────────────────
@keyframes spin {
  to { transform: rotate(360deg); }
}

@keyframes logoPulse {
  0%, 100% { transform: scale(1); }
  50%       { transform: scale(1.06); }
}

@keyframes loaderFadeUp {
  from { opacity: 0; transform: translateY(20px); }
  to   { opacity: 1; transform: translateY(0); }
}

@keyframes barSlide {
  0%   { transform: translateX(-150%); }
  50%  { transform: translateX(50%);   width: 60%; }
  100% { transform: translateX(300%);  width: 40%; }
}

@keyframes blink {
  0%, 100% { opacity: 0.3; }
  50%       { opacity: 0.7; }
}
</style>
