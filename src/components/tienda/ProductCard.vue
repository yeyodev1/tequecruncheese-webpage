<script setup lang="ts">
import { ref, onMounted } from 'vue'
import gsap from 'gsap'
import type { Product } from '@/types'

const props = defineProps<{ product: Product }>()
const emit = defineEmits<{ 'add-to-cart': [product: Product] }>()

const cardRef = ref<HTMLElement | null>(null)

onMounted(() => {
  gsap.from(cardRef.value, {
    opacity: 0,
    y: 24,
    duration: 0.5,
    ease: 'power2.out',
  })
})

function formatPrice(price: number): string {
  return `$${price.toFixed(2)}`
}
</script>

<template>
  <article ref="cardRef" class="product-card">
    <div class="product-card__image-wrapper">
      <img
        v-if="product.imagen"
        :src="product.imagen"
        :alt="product.nombre"
        class="product-card__image"
        loading="lazy"
      />
      <div v-else class="product-card__image-placeholder">
        <i class="fa-solid fa-image"></i>
      </div>
    </div>
    <div class="product-card__body">
      <h3 class="product-card__name">{{ product.nombre }}</h3>
      <p class="product-card__desc">{{ product.descripcion }}</p>
      <div class="product-card__footer">
        <span class="product-card__price">{{ formatPrice(product.precio) }}</span>
        <button class="btn btn--primary product-card__btn" @click="emit('add-to-cart', product)">
          Agregar
        </button>
      </div>
    </div>
  </article>
</template>

<style lang="scss" scoped>
.product-card {
  background: $white;
  border-radius: 1rem;
  overflow: hidden;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  display: flex;
  flex-direction: column;
  transition: transform 0.2s ease, box-shadow 0.2s ease;

  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  }

  &__image-wrapper {
    width: 100%;
    aspect-ratio: 4 / 3;
    overflow: hidden;
    background-color: lighten(#fed47f, 30%);
  }

  &__image {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform 0.3s ease;

    .product-card:hover & {
      transform: scale(1.04);
    }
  }

  &__image-placeholder {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 3rem;
    color: lighten($color-accent, 40%);
  }

  &__body {
    padding: 1.25rem;
    display: flex;
    flex-direction: column;
    flex: 1;
    gap: 0.5rem;
  }

  &__name {
    font-size: 1.1rem;
    font-weight: 700;
    color: $color-accent;
    margin: 0;
  }

  &__desc {
    font-size: 0.875rem;
    color: #666;
    line-height: 1.4;
    flex: 1;
    margin: 0;
  }

  &__footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-top: 0.75rem;
  }

  &__price {
    font-size: 1.25rem;
    font-weight: 800;
    color: $color-primary;
    background: $color-accent;
    padding: 0.2rem 0.6rem;
    border-radius: 0.5rem;
  }

  &__btn {
    font-size: 0.875rem;
    padding: 0.5rem 1rem;
  }
}
</style>
