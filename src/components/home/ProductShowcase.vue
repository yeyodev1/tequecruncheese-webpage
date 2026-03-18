<script setup lang="ts">
import { ref } from 'vue'

import img1 from '@/assets/stock/DSC06085.jpg'
import img2 from '@/assets/stock/DSC06166.jpg'
import img3 from '@/assets/stock/DSC06180.jpg'

const showcaseItems = ref([
  {
    id: 1,
    image: img1,
    title: 'El Tequeño Clásico',
    description: 'Dorado, crujiente y lleno de queso blanco artesanal.',
  },
  {
    id: 2,
    image: img2,
    title: 'Perfectos para Compartir',
    description: 'Eleva tus reuniones con el mejor iniciador de fiestas.',
  },
  {
    id: 3,
    image: img3,
    title: 'Salsas Gourmet',
    description: 'Acompaña nuestras delicias crujientes con exquisitas salsas artesanales.',
  }
])
</script>

<template>
  <section id="products" class="showcase">
    <div class="showcase__header">
      <h2 class="title-section text-accent">Experimenta El Crunch</h2>
      <p class="showcase__subtitle text-secondary">Una sinfonía de texturas y sabores en cada bocado.</p>
    </div>

    <div class="showcase__grid">
      <article 
        v-for="(item, index) in showcaseItems" 
        :key="item.id" 
        :class="['showcase__card', `showcase__card--${index}`]"
      >
        <div class="showcase__image-wrapper">
          <img :src="item.image" :alt="item.title" class="showcase__image" loading="lazy" />
        </div>
        
        <div class="showcase__content">
          <h3 class="showcase__title">{{ item.title }}</h3>
          <p class="showcase__desc">{{ item.description }}</p>
        </div>
      </article>
    </div>

    <div class="showcase__cta">
      <button class="btn btn--primary">Ver Todos los Productos</button>
    </div>
  </section>
</template>

<style lang="scss" scoped>
.showcase {
  padding: $spacing-xxl $spacing-sm;
  background-color: lighten(#FED47F, 35%); // Very light tint of primary

  @include respond-to('md') {
    padding: $spacing-xxl;
  }

  &__header {
    text-align: center;
    max-width: 800px;
    margin: 0 auto $spacing-xxl;
  }

  &__subtitle {
    margin-top: $spacing-sm;
    font-size: 1.125rem;
  }

  &__grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: $spacing-xl;
    max-width: 1400px;
    margin: 0 auto;

    @include respond-to('md') {
      grid-template-columns: repeat(3, 1fr);
      gap: $spacing-md;
    }

    @include respond-to('lg') {
      gap: $spacing-xl;
    }
  }

  &__card {
    position: relative;
    border-radius: $border-radius-xl;
    overflow: hidden;
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.05);
    background-color: $white;
    transition: transform 0.4s cubic-bezier(0.165, 0.84, 0.44, 1);
    
    &:hover {
      transform: translateY(-10px);
      
      .showcase__image {
        transform: scale(1.05);
      }
    }

    // Slight masonry look
    @include respond-to('md') {
      &--1 {
        transform: translateY(40px);
        &:hover { transform: translateY(30px); }
      }
    }
  }

  &__image-wrapper {
    width: 100%;
    aspect-ratio: 4/5;
    overflow: hidden;
    position: relative;

    &::after {
      content: '';
      position: absolute;
      bottom: 0;
      left: 0;
      width: 100%;
      height: 50%;
      background: linear-gradient(to top, rgba($color-accent, 0.8) 0%, transparent 100%);
      pointer-events: none;
    }
  }

  &__image {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform 0.8s cubic-bezier(0.165, 0.84, 0.44, 1);
  }

  &__content {
    position: absolute;
    bottom: 0;
    left: 0;
    width: 100%;
    padding: $spacing-lg;
    color: $white;
    z-index: 2;
    // Glassmorphism effect internally
    @include glass($opacity: 0.1, $blur: 8px, $border-color: transparent);
    background: transparent;
    box-shadow: none;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
  }

  &__title {
    font-family: $font-secondary;
    font-size: 1.5rem;
    font-weight: 700;
    margin-bottom: $spacing-xs;
  }

  &__desc {
    font-size: 0.95rem;
    line-height: 1.5;
    color: rgba($white, 0.9);
  }

  &__cta {
    display: flex;
    justify-content: center;
    margin-top: $spacing-xxl;
    
    @include respond-to('md') {
      margin-top: calc($spacing-xxl + 40px); // accounting for the masonry offset
    }
  }
}
</style>
