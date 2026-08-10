<script setup lang="ts">
import { computed } from 'vue'
import { useCartStore } from '@/stores/cart'
import { cloudThumb } from '@/services/cloudinary'
import type { Product } from '@/types'

const props = defineProps<{ products: Product[] }>()
const emit = defineEmits<{ add: [product: Product] }>()

const cart = useCartStore()

/**
 * Cheapest in-stock products the customer has not added yet.
 *
 * Capped at three on purpose: this sits beside the pay button, and a long
 * list competes with finishing the order rather than helping it.
 */
const suggestions = computed(() => {
  const inCart = new Set(cart.items.map(i => i.slug))
  return props.products
    .filter(p => p.isActive && p.inStock && !inCart.has(p.slug))
    .sort((a, b) => a.precio - b.precio)
    .slice(0, 3)
})
</script>

<template>
  <div v-if="suggestions.length" class="co-suggest">
    <p class="co-suggest__title">
      <i class="fa-solid fa-plus"></i>
      ¿Le agregas algo más?
    </p>
    <ul class="co-suggest__list">
      <li v-for="p in suggestions" :key="p.slug" class="co-suggest__item">
        <img
          v-if="cloudThumb(p.imagen?.url, 88)"
          :src="cloudThumb(p.imagen?.url, 88)"
          :alt="p.nombre"
          width="44"
          height="44"
          loading="lazy"
          decoding="async"
        />
        <div class="co-suggest__text">
          <span class="co-suggest__name">{{ p.nombre }}</span>
          <span class="co-suggest__price">${{ p.precio.toFixed(2) }}</span>
        </div>
        <button
          type="button"
          class="co-suggest__add"
          :aria-label="`Agregar ${p.nombre}`"
          @click="emit('add', p)"
        >
          <i class="fa-solid fa-plus"></i>
        </button>
      </li>
    </ul>
  </div>
</template>

<style scoped lang="scss">
$accent: #572612;

.co-suggest {
  margin-top: 1rem;
  padding-top: 0.9rem;
  border-top: 1px dashed #e8e2d8;

  &__title {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    margin: 0 0 0.6rem;
    font-size: 0.78rem;
    font-weight: 800;
    color: rgba($accent, 0.75);

    i {
      font-size: 0.62rem;
      color: $color-secondary;
    }
  }

  &__list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }

  &__item {
    display: flex;
    align-items: center;
    gap: 0.55rem;
    padding: 0.4rem;
    border-radius: 0.7rem;
    background: rgba($color-primary, 0.14);
    transition: background 0.15s;

    &:hover { background: rgba($color-primary, 0.28); }

    img {
      width: 44px;
      height: 44px;
      border-radius: 0.55rem;
      object-fit: cover;
      flex-shrink: 0;
      display: block;
    }
  }

  &__text {
    display: flex;
    flex-direction: column;
    gap: 0.05rem;
    flex: 1;
    min-width: 0;
  }

  &__name {
    font-size: 0.78rem;
    font-weight: 700;
    color: $accent;
    line-height: 1.25;
    // Two lines max: product names here run long.
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  &__price {
    font-size: 0.74rem;
    font-weight: 700;
    color: rgba($accent, 0.6);
  }

  &__add {
    flex-shrink: 0;
    width: 30px;
    height: 30px;
    border-radius: 50%;
    border: none;
    background: $accent;
    color: $color-primary;
    font-size: 0.7rem;
    cursor: pointer;
    display: grid;
    place-items: center;
    transition: transform 0.12s, opacity 0.12s;

    &:hover {
      transform: scale(1.08);
      opacity: 0.92;
    }
  }
}
</style>
