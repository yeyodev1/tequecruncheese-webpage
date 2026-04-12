<script setup lang="ts">
import { watch, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useCartStore } from '@/stores/cart'
import type { FlavorSelection } from '@/types'

const cart = useCartStore()
const router = useRouter()

// ── Body scroll lock ──────────────────────────────────────
watch(
  () => cart.isCartOpen,
  (open) => { document.body.style.overflow = open ? 'hidden' : '' },
)

function onKeyDown(e: KeyboardEvent) {
  if (e.key === 'Escape') cart.closeCart()
}
onMounted(() => document.addEventListener('keydown', onKeyDown))
onUnmounted(() => {
  document.removeEventListener('keydown', onKeyDown)
  document.body.style.overflow = ''
})

// ── Cart controls ─────────────────────────────────────────
function increment(slug: string) {
  const item = cart.items.find((i) => i.slug === slug)
  if (item) cart.updateQuantity(slug, item.cantidad + 1)
}
function decrement(slug: string) {
  const item = cart.items.find((i) => i.slug === slug)
  if (item) cart.updateQuantity(slug, item.cantidad - 1)
}

// ── Flavor summary ────────────────────────────────────────
function flavorSummary(sel: FlavorSelection[]): string {
  return sel.map(s => `${s.cantidad}× ${s.nombre}`).join(', ')
}

// ── Go to checkout ────────────────────────────────────────
function goToCheckout() {
  cart.closeCart()
  router.push('/checkout')
}
</script>

<template>
  <Teleport to="body">
    <!-- Backdrop -->
    <Transition name="cart-backdrop">
      <div
        v-if="cart.isCartOpen"
        class="cart-backdrop"
        aria-hidden="true"
        @click="cart.closeCart"
      ></div>
    </Transition>

    <!-- Drawer panel -->
    <Transition name="cart-panel">
      <div
        v-if="cart.isCartOpen"
        class="cart-panel"
        role="dialog"
        aria-modal="true"
        aria-label="Tu pedido"
      >
        <!-- ── Head ────────────────────────────────────── -->
        <div class="cart-panel__head">
          <div class="cart-panel__head-left">
            <i class="fa-solid fa-cart-shopping"></i>
            <h2 class="cart-panel__title">Tu Pedido</h2>
            <Transition name="badge">
              <span v-if="cart.totalItems > 0" class="cart-panel__count">
                {{ cart.totalItems }}
              </span>
            </Transition>
          </div>
          <button class="cart-panel__close" aria-label="Cerrar" @click="cart.closeCart">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>

        <!-- ── Empty ──────────────────────────────────── -->
        <div v-if="cart.isEmpty" class="cart-panel__empty">
          <div class="cart-panel__empty-icon">
            <i class="fa-solid fa-bag-shopping"></i>
          </div>
          <p class="cart-panel__empty-title">Tu carrito está vacío</p>
          <p class="cart-panel__empty-hint">
            Agrega nuestros tequeños desde el catálogo
          </p>
          <button class="cart-panel__empty-cta" @click="cart.closeCart">
            <i class="fa-solid fa-arrow-left"></i>
            Ver catálogo
          </button>
        </div>

        <!-- ── Body: items ────────────────────────────── -->
        <div v-else class="cart-panel__body">

          <div class="cart-panel__items-header">
            <span>{{ cart.totalItems }} {{ cart.totalItems === 1 ? 'producto' : 'productos' }}</span>
            <button class="cart-panel__clear" @click="cart.clear">
              <i class="fa-solid fa-trash-can"></i>
              Vaciar
            </button>
          </div>

          <ul class="cart-panel__list">
            <li
              v-for="item in cart.items"
              :key="item.slug"
              class="cart-panel__item"
              :class="{ 'cart-panel__item--flavored': item.flavorSelections?.length }"
            >
              <!-- Item icon -->
              <div class="cart-panel__item-icon">
                <i :class="item.flavorSelections?.length ? 'fa-solid fa-cubes-stacked' : 'fa-solid fa-bread-slice'"></i>
              </div>

              <!-- Name + flavors + unit price -->
              <div class="cart-panel__item-info">
                <span class="cart-panel__item-name">{{ item.nombre }}</span>
                <span v-if="item.flavorSelections?.length" class="cart-panel__item-flavors">
                  <i class="fa-solid fa-sliders"></i>
                  {{ flavorSummary(item.flavorSelections) }}
                </span>
                <span class="cart-panel__item-unit">
                  ${{ item.precio.toFixed(2) }} c/u
                </span>
              </div>

              <!-- Qty + price -->
              <div class="cart-panel__item-right">
                <div class="cart-panel__qty">
                  <button class="cart-panel__qty-btn" @click="decrement(item.slug)">
                    <i class="fa-solid fa-minus"></i>
                  </button>
                  <span class="cart-panel__qty-num">{{ item.cantidad }}</span>
                  <button class="cart-panel__qty-btn" @click="increment(item.slug)">
                    <i class="fa-solid fa-plus"></i>
                  </button>
                </div>
                <div class="cart-panel__item-price-block">
                  <span class="cart-panel__item-price">
                    ${{ (item.precio * item.cantidad).toFixed(2) }}
                  </span>
                  <button
                    class="cart-panel__item-remove"
                    aria-label="Eliminar"
                    @click="cart.removeItem(item.slug)"
                  >
                    <i class="fa-solid fa-xmark"></i>
                  </button>
                </div>
              </div>
            </li>
          </ul>
        </div>

        <!-- ── Sticky footer ───────────────────────────── -->
        <div v-if="!cart.isEmpty" class="cart-panel__foot">
          <div class="cart-panel__foot-total">
            <span>Total</span>
            <strong>${{ cart.totalPrice.toFixed(2) }}</strong>
          </div>

          <button class="cart-panel__checkout" @click="goToCheckout">
            <i class="fa-solid fa-arrow-right"></i>
            Proceder al pago
          </button>

          <p class="cart-panel__foot-hint">
            <i class="fa-solid fa-shield-halved"></i>
            Pago seguro · Completa tus datos en el siguiente paso
          </p>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style lang="scss" scoped>
// ── Backdrop ───────────────────────────────────────────────────
.cart-backdrop {
  position: fixed;
  inset: 0;
  z-index: 900;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(2px);
  -webkit-backdrop-filter: blur(2px);
}

// ── Drawer panel ───────────────────────────────────────────────
.cart-panel {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  z-index: 901;
  width: 100%;
  max-width: 460px;
  background: $white;
  display: flex;
  flex-direction: column;
  box-shadow: -8px 0 40px rgba(0, 0, 0, 0.15);

  // ── Head ────────────────────────────────────────────────────
  &__head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1.375rem 1.5rem;
    background: $color-accent;
    flex-shrink: 0;
  }

  &__head-left {
    display: flex;
    align-items: center;
    gap: 0.625rem;

    i {
      font-size: 1rem;
      color: rgba($white, 0.65);
    }
  }

  &__title {
    font-size: 1.05rem;
    font-weight: 800;
    color: $white;
    margin: 0;
    letter-spacing: -0.01em;
  }

  &__count {
    background: $color-primary;
    color: $color-accent;
    border-radius: 999px;
    min-width: 1.5rem;
    height: 1.5rem;
    padding: 0 0.35rem;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 0.7rem;
    font-weight: 900;
  }

  &__close {
    background: rgba($white, 0.1);
    border: none;
    width: 34px;
    height: 34px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    color: rgba($white, 0.8);
    font-size: 0.85rem;
    transition: background 0.15s;

    &:hover {
      background: rgba($white, 0.2);
      color: $white;
    }
  }

  // ── Empty ────────────────────────────────────────────────────
  &__empty {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.625rem;
    padding: 3rem 2rem;
    text-align: center;
  }

  &__empty-icon {
    width: 72px;
    height: 72px;
    border-radius: 50%;
    background: #f5f4f2;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 0.5rem;

    i {
      font-size: 1.6rem;
      color: #ccc;
    }
  }

  &__empty-title {
    font-size: 1rem;
    font-weight: 700;
    color: #444;
    margin: 0;
  }

  &__empty-hint {
    font-size: 0.85rem;
    color: #aaa;
    margin: 0;
    line-height: 1.5;
  }

  &__empty-cta {
    margin-top: 0.5rem;
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    background: $color-accent;
    color: $color-primary;
    border: none;
    border-radius: 0.625rem;
    padding: 0.65rem 1.25rem;
    font-size: 0.875rem;
    font-weight: 700;
    cursor: pointer;
    transition: opacity 0.15s;

    &:hover { opacity: 0.85; }
  }

  // ── Scrollable body ──────────────────────────────────────────
  &__body {
    flex: 1;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    scrollbar-width: thin;
    scrollbar-color: #e0e0e0 transparent;

    &::-webkit-scrollbar { width: 4px; }
    &::-webkit-scrollbar-track { background: transparent; }
    &::-webkit-scrollbar-thumb { background: #e0e0e0; border-radius: 4px; }
  }

  // ── Items header ─────────────────────────────────────────────
  &__items-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.875rem 1.5rem 0.375rem;

    span {
      font-size: 0.72rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.07em;
      color: #bbb;
    }
  }

  &__clear {
    background: none;
    border: none;
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    font-size: 0.72rem;
    font-weight: 600;
    color: #ccc;
    cursor: pointer;
    padding: 0.2rem 0.4rem;
    border-radius: 0.375rem;
    transition: color 0.12s, background 0.12s;

    i { font-size: 0.62rem; }
    &:hover { color: #e53e3e; background: #fff0f0; }
  }

  // ── Items list ───────────────────────────────────────────────
  &__list {
    list-style: none;
    margin: 0;
    padding: 0.5rem 1.25rem 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.625rem;
  }

  &__item {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.875rem 1rem;
    background: #fdfaf6;
    border: 1.5px solid #f0ebe2;
    border-radius: 1rem;
    transition: border-color 0.15s, box-shadow 0.15s;

    &:hover { border-color: rgba($color-accent, 0.2); box-shadow: 0 2px 8px rgba(0,0,0,0.05); }

    &--flavored {
      background: #f9f5ff;
      border-color: rgba(#7c3aed, 0.12);

      &:hover { border-color: rgba(#7c3aed, 0.25); }
    }
  }

  // ── Item icon ────────────────────────────────────────────────
  &__item-icon {
    width: 36px;
    height: 36px;
    border-radius: 0.625rem;
    background: rgba($color-accent, 0.08);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;

    i { font-size: 0.875rem; color: $color-accent; }

    .cart-panel__item--flavored & {
      background: rgba(#7c3aed, 0.08);
      i { color: #7c3aed; }
    }
  }

  // ── Item info ────────────────────────────────────────────────
  &__item-info {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 0.12rem;
  }

  &__item-name {
    font-size: 0.875rem;
    font-weight: 700;
    color: $color-accent;
    line-height: 1.3;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  &__item-flavors {
    font-size: 0.7rem;
    color: #9f7aea;
    display: flex;
    align-items: center;
    gap: 0.2rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;

    i { font-size: 0.6rem; flex-shrink: 0; }
  }

  &__item-unit {
    font-size: 0.7rem;
    color: #bbb;
    font-weight: 500;
  }

  // ── Item right: qty + price ───────────────────────────────────
  &__item-right {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 0.4rem;
    flex-shrink: 0;
  }

  // ── Qty pill ─────────────────────────────────────────────────
  &__qty {
    display: inline-flex;
    align-items: center;
    background: #fff;
    border: 1.5px solid #e8e2d8;
    border-radius: 999px;
    padding: 0.1rem;
    gap: 0;
    flex-shrink: 0;
  }

  &__qty-btn {
    background: none;
    border: none;
    width: 24px;
    height: 24px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    font-size: 0.5rem;
    color: $color-accent;
    transition: background 0.12s;

    &:hover { background: rgba($color-accent, 0.1); }
  }

  &__qty-num {
    font-size: 0.82rem;
    font-weight: 900;
    color: $color-accent;
    min-width: 1.1rem;
    text-align: center;
  }

  &__item-price-block {
    display: flex;
    align-items: center;
    gap: 0.3rem;
  }

  &__item-price {
    font-size: 0.9rem;
    font-weight: 900;
    color: $color-accent;
    white-space: nowrap;
    letter-spacing: -0.02em;
  }

  &__item-remove {
    background: none;
    border: none;
    width: 22px;
    height: 22px;
    border-radius: 0.375rem;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    font-size: 0.65rem;
    color: #ddd;
    transition: color 0.15s, background 0.15s;

    &:hover {
      color: #e53e3e;
      background: #fff0f0;
    }
  }

  // ── Sticky footer ────────────────────────────────────────────
  &__foot {
    padding: 1rem 1.5rem 1.5rem;
    border-top: 2px solid #f0ede8;
    background: $white;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    flex-shrink: 0;
  }

  &__foot-total {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.25rem 0 0.375rem;

    span {
      font-size: 0.78rem;
      font-weight: 700;
      color: #999;
      text-transform: uppercase;
      letter-spacing: 0.07em;
    }

    strong {
      font-size: 1.5rem;
      font-weight: 900;
      color: $color-accent;
      letter-spacing: -0.03em;
      font-family: $font-secondary;
    }
  }

  &__checkout {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 0.95rem 1.5rem;
    background: $color-accent;
    color: $color-primary;
    border: none;
    border-radius: 0.875rem;
    font-size: 0.975rem;
    font-weight: 800;
    cursor: pointer;
    transition: opacity 0.15s, transform 0.15s;
    letter-spacing: 0.01em;

    i { font-size: 0.85rem; }

    &:hover {
      opacity: 0.88;
      transform: translateY(-1px);
    }
  }

  &__foot-hint {
    text-align: center;
    font-size: 0.74rem;
    color: #bbb;
    margin: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.3rem;

    i { color: #38a169; font-size: 0.72rem; }
  }
}

// ── Transitions ────────────────────────────────────────────────
.cart-backdrop-enter-active,
.cart-backdrop-leave-active {
  transition: opacity 0.3s ease;
}
.cart-backdrop-enter-from,
.cart-backdrop-leave-to {
  opacity: 0;
}

.cart-panel-enter-active,
.cart-panel-leave-active {
  transition: transform 0.35s cubic-bezier(0.4, 0, 0.2, 1);
}
.cart-panel-enter-from,
.cart-panel-leave-to {
  transform: translateX(100%);
}

.badge-enter-active,
.badge-leave-active {
  transition: opacity 0.15s, transform 0.15s;
}
.badge-enter-from,
.badge-leave-to {
  opacity: 0;
  transform: scale(0.5);
}
</style>
