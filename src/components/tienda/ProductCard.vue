<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import gsap from 'gsap'
import { useCartStore } from '@/stores/cart'
import type { Product } from '@/types'

const props = defineProps<{ product: Product }>()
const emit = defineEmits<{
  'add-to-cart': [product: Product]
  'select-product': [product: Product]
}>()

const cart = useCartStore()
const cardRef = ref<HTMLElement | null>(null)

const quantityInCart = computed(() => {
  const item = cart.items.find(i => i.slug === props.product.slug)
  return item?.cantidad ?? 0
})

onMounted(() => {
  gsap.from(cardRef.value, {
    opacity: 0,
    y: 28,
    duration: 0.55,
    ease: 'power2.out',
  })
})

function formatPrice(price: number): string {
  return `$${price.toFixed(2)}`
}

function handleCardClick() {
  emit('select-product', props.product)
}

function handleAddToCart(e: Event) {
  e.stopPropagation()
  if (!props.product.inStock) return
  // Any product marked hasFlavors ALWAYS goes through the detail modal
  if (props.product.hasFlavors) {
    emit('select-product', props.product)
  } else {
    emit('add-to-cart', props.product)
  }
}
</script>

<template>
  <article ref="cardRef" class="product-card" @click="handleCardClick">
    <!-- Image -->
    <div class="product-card__image-wrapper">
      <img
        v-if="product.imagen?.url"
        :src="product.imagen.url"
        :alt="product.nombre"
        class="product-card__image"
        loading="lazy"
      />
      <div v-else class="product-card__image-placeholder">
        <i class="fa-solid fa-bread-slice"></i>
      </div>

      <!-- Flavor box tag -->
      <div v-if="product.hasFlavors" class="product-card__flavor-tag">
        <i class="fa-solid fa-cubes-stacked"></i>
        Personalizable
      </div>

      <Transition name="badge">
        <span v-if="quantityInCart > 0" class="product-card__badge">
          <i class="fa-solid fa-check"></i>
          {{ quantityInCart }}
        </span>
      </Transition>

      <!-- Out of stock overlay -->
      <div v-if="!product.inStock" class="product-card__out-of-stock">
        <span>Sin stock</span>
      </div>
    </div>

    <!-- Body -->
    <div class="product-card__body">
      <div class="product-card__info">
        <h3 class="product-card__name">{{ product.nombre }}</h3>
        <p v-if="product.descripcion" class="product-card__desc">{{ product.descripcion }}</p>
      </div>

      <div class="product-card__footer">
        <span class="product-card__price">{{ formatPrice(product.precio) }}</span>
        <button
          class="product-card__btn"
          :class="{
            'product-card__btn--flavors': product.hasFlavors && quantityInCart > 0,
            'product-card__btn--in-cart': !product.hasFlavors && quantityInCart > 0,
          }"
          :disabled="!product.inStock"
          @click="handleAddToCart"
        >
          <i
            class="fa-solid"
            :class="product.hasFlavors ? 'fa-sliders' : quantityInCart > 0 ? 'fa-check' : 'fa-cart-plus'"
          ></i>
          <span>
            {{ !product.inStock
              ? 'Sin stock'
              : product.hasFlavors && quantityInCart > 0
                ? 'Cambiar sabores'
                : product.hasFlavors
                  ? 'Elegir sabores'
                  : quantityInCart > 0
                    ? 'En carrito'
                    : 'Agregar' }}
          </span>
        </button>
      </div>
    </div>

    <!-- View detail hint -->
    <div class="product-card__detail-hint">
      <i class="fa-solid fa-expand"></i>
      Ver detalle
    </div>
  </article>
</template>

<style lang="scss" scoped>
.product-card {
  background: $white;
  border-radius: 1.25rem;
  overflow: hidden;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.07);
  display: flex;
  flex-direction: column;
  transition: transform 0.25s ease, box-shadow 0.25s ease;
  border: 1px solid rgba(0, 0, 0, 0.05);
  cursor: pointer;
  position: relative;

  &:hover {
    transform: translateY(-6px);
    box-shadow: 0 14px 36px rgba(0, 0, 0, 0.13);

    .product-card__detail-hint { opacity: 1; }
    .product-card__image { transform: scale(1.06); }
  }

  // ── Image ───────────────────────────────────────────────────
  &__image-wrapper {
    position: relative;
    width: 100%;
    aspect-ratio: 4 / 3;
    overflow: hidden;
    background: #fdf5e8;
    flex-shrink: 0;
  }

  &__image {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform 0.35s ease;
  }

  &__image-placeholder {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 3.5rem;
    color: rgba($color-accent, 0.15);
  }

  &__out-of-stock {
    position: absolute;
    inset: 0;
    background: rgba(0, 0, 0, 0.45);
    display: flex;
    align-items: center;
    justify-content: center;

    span {
      background: rgba(0, 0, 0, 0.7);
      color: #fff;
      font-size: 0.78rem;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      padding: 0.4rem 1rem;
      border-radius: 999px;
    }
  }

  // ── Flavor tag ───────────────────────────────────────────────
  &__flavor-tag {
    position: absolute;
    bottom: 0.625rem;
    left: 0.625rem;
    background: rgba($color-accent, 0.88);
    backdrop-filter: blur(4px);
    color: #FED47F;
    font-size: 0.67rem;
    font-weight: 700;
    letter-spacing: 0.03em;
    padding: 0.25rem 0.625rem;
    border-radius: 999px;
    display: flex;
    align-items: center;
    gap: 0.3rem;

    i { font-size: 0.62rem; }
  }

  // ── Detail hint (shown on hover) ──────────────────────────────
  &__detail-hint {
    position: absolute;
    top: 0;
    inset-inline: 0;
    bottom: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.4rem;
    font-size: 0.8rem;
    font-weight: 700;
    color: #fff;
    background: rgba($color-accent, 0.45);
    opacity: 0;
    transition: opacity 0.2s ease;
    pointer-events: none;
    border-radius: 1.25rem;
    letter-spacing: 0.02em;

    i { font-size: 0.75rem; }
  }

  // ── In-cart badge ────────────────────────────────────────────
  &__badge {
    position: absolute;
    top: 0.75rem;
    right: 0.75rem;
    background: $color-accent;
    color: $color-primary;
    border-radius: 999px;
    padding: 0.3rem 0.7rem;
    font-size: 0.72rem;
    font-weight: 800;
    display: flex;
    align-items: center;
    gap: 0.3rem;
    box-shadow: 0 3px 10px rgba($color-accent, 0.45);
    letter-spacing: 0.01em;
  }

  // ── Body ─────────────────────────────────────────────────────
  &__body {
    padding: 1.125rem 1.25rem 1rem;
    display: flex;
    flex-direction: column;
    flex: 1;
    gap: 0.875rem;
  }

  &__info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
  }

  &__name {
    font-size: 1rem;
    font-weight: 800;
    color: $color-accent;
    margin: 0;
    line-height: 1.3;
    letter-spacing: -0.01em;
  }

  &__desc {
    font-size: 0.8rem;
    color: #999;
    line-height: 1.5;
    margin: 0;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  // ── Footer ───────────────────────────────────────────────────
  &__footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    padding-top: 0.875rem;
    border-top: 1px solid #f2f2f2;
  }

  &__price {
    font-size: 1.4rem;
    font-weight: 900;
    color: $color-accent;
    letter-spacing: -0.03em;
    font-family: $font-secondary;
    line-height: 1;
  }

  &__btn {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    background: $color-accent;
    color: $color-primary;
    border: none;
    border-radius: 0.625rem;
    padding: 0.55rem 1rem;
    font-size: 0.85rem;
    font-weight: 700;
    cursor: pointer;
    transition: opacity 0.15s, transform 0.15s;
    white-space: nowrap;

    i { font-size: 0.82rem; }

    &:hover {
      opacity: 0.88;
      transform: translateY(-1px);
    }

    &:active {
      transform: translateY(0);
      opacity: 1;
    }

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
      transform: none;
    }

    &--in-cart {
      background: #e8f5e9;
      color: #2e7d32;
      border: 1.5px solid #a5d6a7;

      &:hover {
        opacity: 1;
        background: #c8e6c9;
        transform: translateY(-1px);
      }
    }
  }
}

// ── Badge transition ──────────────────────────────────────────
.badge-enter-active,
.badge-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.badge-enter-from,
.badge-leave-to {
  opacity: 0;
  transform: scale(0.6) translateY(-4px);
}
</style>
