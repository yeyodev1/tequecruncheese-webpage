<script setup lang="ts">
import { computed, ref } from 'vue'
import { useCartStore } from '@/stores/cart'

const emit = defineEmits<{ checkout: [] }>()
const cart = useCartStore()

const formattedTotal = computed(() => `$${cart.totalPrice.toFixed(2)}`)
const emailTouched = ref(false)

const emailValid = computed(() => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return re.test(cart.customerEmail)
})

function onEmailInput(e: Event) {
  cart.setEmail((e.target as HTMLInputElement).value)
}

function onEmailBlur() {
  emailTouched.value = true
}

function increment(slug: string) {
  const item = cart.items.find((i) => i.slug === slug)
  if (item) cart.updateQuantity(slug, item.cantidad + 1)
}

function decrement(slug: string) {
  const item = cart.items.find((i) => i.slug === slug)
  if (item) cart.updateQuantity(slug, item.cantidad - 1)
}
</script>

<template>
  <aside class="cart-drawer">
    <div class="cart-drawer__header">
      <h2 class="cart-drawer__title">
        <i class="fa-solid fa-cart-shopping"></i>
        Tu Pedido
        <span v-if="cart.totalItems > 0" class="cart-drawer__badge">{{ cart.totalItems }}</span>
      </h2>
    </div>

    <div v-if="cart.isEmpty" class="cart-drawer__empty">
      <i class="fa-solid fa-bag-shopping"></i>
      <p>Tu carrito está vacío.<br />¡Agrega tus favoritos!</p>
    </div>

    <ul v-else class="cart-drawer__list">
      <li v-for="item in cart.items" :key="item.slug" class="cart-drawer__item">
        <div class="cart-drawer__item-info">
          <span class="cart-drawer__item-name">{{ item.nombre }}</span>
          <span class="cart-drawer__item-price">${{ (item.precio * item.cantidad).toFixed(2) }}</span>
        </div>
        <div class="cart-drawer__item-controls">
          <button class="cart-drawer__qty-btn" @click="decrement(item.slug)">
            <i class="fa-solid fa-minus"></i>
          </button>
          <span class="cart-drawer__qty">{{ item.cantidad }}</span>
          <button class="cart-drawer__qty-btn" @click="increment(item.slug)">
            <i class="fa-solid fa-plus"></i>
          </button>
          <button class="cart-drawer__remove-btn" @click="cart.removeItem(item.slug)">
            <i class="fa-solid fa-trash"></i>
          </button>
        </div>
      </li>
    </ul>

    <div v-if="!cart.isEmpty" class="cart-drawer__footer">
      <div class="cart-drawer__total">
        <span>Total</span>
        <strong>{{ formattedTotal }}</strong>
      </div>

      <div class="cart-drawer__email-field">
        <label class="cart-drawer__email-label" for="cart-email">
          <i class="fa-solid fa-envelope"></i>
          Correo para confirmación <span class="cart-drawer__required">*</span>
        </label>
        <input
          id="cart-email"
          type="email"
          class="cart-drawer__email-input"
          :class="{ 'cart-drawer__email-input--error': emailTouched && !emailValid }"
          :value="cart.customerEmail"
          placeholder="tu@correo.com"
          autocomplete="email"
          @input="onEmailInput"
          @blur="onEmailBlur"
        />
        <span v-if="emailTouched && !emailValid" class="cart-drawer__email-error">
          Ingresa un correo válido para recibir tu confirmación.
        </span>
      </div>

      <button
        class="btn btn--primary cart-drawer__checkout-btn"
        :disabled="!emailValid"
        @click="emit('checkout')"
      >
        <i class="fa-solid fa-lock"></i>
        Pagar Ahora
      </button>
    </div>
  </aside>
</template>

<style lang="scss" scoped>
.cart-drawer {
  background: $white;
  border-radius: 1.25rem;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  position: sticky;
  top: 100px;
  max-height: calc(100vh - 120px);

  &__header {
    padding: 1.25rem 1.5rem;
    background: $color-accent;
    color: $white;
  }

  &__title {
    font-size: 1.1rem;
    font-weight: 700;
    margin: 0;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  &__badge {
    background: $color-primary;
    color: $color-accent;
    border-radius: 50%;
    width: 1.5rem;
    height: 1.5rem;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 0.75rem;
    font-weight: 800;
    margin-left: auto;
  }

  &__empty {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 1rem;
    padding: 2rem;
    color: #aaa;
    text-align: center;

    i {
      font-size: 3rem;
      color: lighten($color-accent, 40%);
    }

    p {
      margin: 0;
      font-size: 0.9rem;
      line-height: 1.5;
    }
  }

  &__list {
    list-style: none;
    margin: 0;
    padding: 0;
    overflow-y: auto;
    flex: 1;
  }

  &__item {
    padding: 1rem 1.5rem;
    border-bottom: 1px solid #f0f0f0;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;

    &:last-child {
      border-bottom: none;
    }
  }

  &__item-info {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 0.5rem;
  }

  &__item-name {
    font-size: 0.9rem;
    font-weight: 600;
    color: $color-accent;
    flex: 1;
  }

  &__item-price {
    font-size: 0.9rem;
    font-weight: 700;
    color: $color-accent;
    white-space: nowrap;
  }

  &__item-controls {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  &__qty-btn,
  &__remove-btn {
    background: none;
    border: 1px solid #e0e0e0;
    border-radius: 0.375rem;
    width: 1.75rem;
    height: 1.75rem;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    font-size: 0.7rem;
    transition: background 0.15s, border-color 0.15s;

    &:hover {
      background: #f5f5f5;
      border-color: $color-accent;
    }
  }

  &__remove-btn {
    color: #e53e3e;
    margin-left: auto;

    &:hover {
      background: #fff5f5;
      border-color: #e53e3e;
    }
  }

  &__qty {
    font-weight: 700;
    font-size: 0.9rem;
    min-width: 1.5rem;
    text-align: center;
  }

  &__footer {
    padding: 1.25rem 1.5rem;
    border-top: 2px solid #f0f0f0;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  &__total {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 1rem;

    strong {
      font-size: 1.4rem;
      color: $color-accent;
    }
  }

  &__email-field {
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
  }

  &__email-label {
    font-size: 0.8rem;
    font-weight: 600;
    color: #555;
    display: flex;
    align-items: center;
    gap: 0.375rem;
  }

  &__required {
    color: #e53e3e;
  }

  &__email-input {
    width: 100%;
    padding: 0.6rem 0.75rem;
    border: 1.5px solid #e0e0e0;
    border-radius: 0.5rem;
    font-size: 0.9rem;
    outline: none;
    transition: border-color 0.15s;
    box-sizing: border-box;

    &:focus {
      border-color: $color-accent;
    }

    &--error {
      border-color: #e53e3e;
    }
  }

  &__email-error {
    font-size: 0.75rem;
    color: #e53e3e;
  }

  &__checkout-btn {
    width: 100%;
    justify-content: center;
    gap: 0.5rem;
    font-size: 1rem;
    padding: 0.875rem;

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }
}
</style>
