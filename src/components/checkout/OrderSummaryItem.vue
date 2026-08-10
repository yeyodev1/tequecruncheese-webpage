<script setup lang="ts">
import { computed } from 'vue'
import { useCartStore } from '@/stores/cart'
import { cloudThumb } from '@/services/cloudinary'
import type { CartItem, Product } from '@/types'

const props = defineProps<{ item: CartItem; products: Product[] }>()

const cart = useCartStore()

/** 2x the rendered 56px box, so the thumbnail stays crisp on retina. */
const thumb = computed(() => {
  const product = props.products.find(p => p.slug === props.item.slug)
  return cloudThumb(product?.imagen?.url, 112)
})

const flavorSummary = computed(() =>
  (props.item.flavorSelections ?? []).map(s => `${s.cantidad}× ${s.nombre}`).join(', '),
)

/** Flavor boxes are configured as a unit, so their quantity is fixed here. */
const adjustable = computed(() => !props.item.flavorSelections?.length)
</script>

<template>
  <li class="co-summary__item">
    <div class="co-summary__item-body">
      <div class="co-summary__item-info">
        <div class="co-summary__item-thumb">
          <img
            v-if="thumb"
            :src="thumb"
            :alt="item.nombre"
            width="56"
            height="56"
            loading="lazy"
            decoding="async"
          />
          <i v-else class="fa-solid fa-bread-slice"></i>
          <span class="co-summary__item-badge">{{ item.cantidad }}</span>
        </div>

        <div class="co-summary__item-text">
          <span class="co-summary__item-name">{{ item.nombre }}</span>
          <span v-if="flavorSummary" class="co-summary__item-flavors">
            <i class="fa-solid fa-sliders"></i>
            {{ flavorSummary }}
          </span>
        </div>
      </div>

      <div class="co-summary__item-right">
        <span class="co-summary__item-price">
          ${{ (item.precio * item.cantidad).toFixed(2) }}
        </span>

        <div v-if="adjustable" class="co-summary__stepper">
          <button
            type="button"
            :aria-label="`Quitar uno de ${item.nombre}`"
            @click="cart.updateQuantity(item.slug, item.cantidad - 1)"
          >
            <i :class="item.cantidad === 1 ? 'fa-solid fa-trash' : 'fa-solid fa-minus'"></i>
          </button>
          <span>{{ item.cantidad }}</span>
          <button
            type="button"
            :aria-label="`Agregar uno de ${item.nombre}`"
            @click="cart.updateQuantity(item.slug, item.cantidad + 1)"
          >
            <i class="fa-solid fa-plus"></i>
          </button>
        </div>
      </div>
    </div>
  </li>
</template>

<style scoped lang="scss">
$accent: #572612;

.co-summary {
  &__item { border-bottom: 1px solid #f0ede8; }

  &__item-body {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 0.75rem;
    padding: 0.75rem 0;
  }

  &__item-info {
    display: flex;
    align-items: center;
    gap: 0.7rem;
    flex: 1;
    min-width: 0;
  }

  // The quantity rides the photo as a badge, so the bare "2×" is gone.
  &__item-thumb {
    position: relative;
    flex-shrink: 0;
    width: 56px;
    height: 56px;
    border-radius: 0.7rem;
    background: rgba($color-primary, 0.35);
    display: grid;
    place-items: center;
    // No `overflow: hidden` here — it would clip the badge on the corner.

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
      border-radius: inherit;
    }

    > i {
      font-size: 1.1rem;
      color: rgba($accent, 0.35);
    }
  }

  &__item-badge {
    position: absolute;
    top: -4px;
    right: -4px;
    min-width: 20px;
    height: 20px;
    padding: 0 5px;
    border-radius: 999px;
    background: $accent;
    color: $color-primary;
    font-size: 0.68rem;
    font-weight: 800;
    display: grid;
    place-items: center;
    border: 2px solid #fff;
    box-sizing: content-box;
  }

  &__item-text {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
    min-width: 0;
  }

  &__item-name {
    font-size: 0.875rem;
    font-weight: 700;
    color: $accent;
    line-height: 1.3;
  }

  &__item-flavors {
    font-size: 0.72rem;
    color: #999;
    display: flex;
    align-items: center;
    gap: 0.25rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;

    i {
      font-size: 0.65rem;
      flex-shrink: 0;
    }
  }

  &__item-right {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 0.35rem;
    flex-shrink: 0;
  }

  &__item-price {
    font-size: 0.875rem;
    font-weight: 800;
    color: $accent;
    white-space: nowrap;
  }

  &__stepper {
    display: flex;
    align-items: center;
    gap: 0.1rem;
    border: 1.5px solid #eee7dd;
    border-radius: 999px;
    padding: 2px;

    button {
      width: 26px;
      height: 26px;
      border: none;
      border-radius: 50%;
      background: none;
      color: rgba($accent, 0.6);
      cursor: pointer;
      display: grid;
      place-items: center;
      font-size: 0.62rem;
      transition: background 0.12s, color 0.12s;

      &:hover {
        background: rgba($accent, 0.08);
        color: $accent;
      }
    }

    span {
      min-width: 18px;
      text-align: center;
      font-size: 0.78rem;
      font-weight: 800;
      color: $accent;
    }
  }
}
</style>
