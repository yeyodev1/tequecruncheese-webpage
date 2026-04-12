<script setup lang="ts">
import { computed, ref } from 'vue'
import { useCartStore } from '@/stores/cart'

const emit = defineEmits<{ checkout: [] }>()
const cart = useCartStore()

const formattedTotal = computed(() => `$${cart.totalPrice.toFixed(2)}`)

// ── Touched state ─────────────────────────────────────────
const touched = ref({
  nombre: false,
  cedula: false,
  email: false,
  telefono: false,
  calle: false,
})

function markTouched(field: keyof typeof touched.value) {
  touched.value[field] = true
}

// ── Cedula validation (Ecuador algorithm) ─────────────────
function validarCedula(cedula: string): boolean {
  if (!/^\d{10}$/.test(cedula)) return false
  const provincia = parseInt(cedula.slice(0, 2))
  if (provincia < 1 || provincia > 24) return false
  const digits = cedula.split('').map(Number)
  const verifier = digits[9]
  const sum = digits.slice(0, 9).reduce((acc, d, i) => {
    let v = i % 2 === 0 ? d * 2 : d
    if (v > 9) v -= 9
    return acc + v
  }, 0)
  const mod = sum % 10
  return mod === 0 ? verifier === 0 : verifier === 10 - mod
}

// ── Field validators ──────────────────────────────────────
const emailValid = computed(() => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cart.customerInfo.email))
const nombreValid = computed(() => cart.customerInfo.nombre.trim().length >= 3)
const cedulaValid = computed(() => validarCedula(cart.customerInfo.cedula))
const telefonoValid = computed(() =>
  /^(09|02)\d{8}$/.test(cart.customerInfo.telefono),
)
const calleValid = computed(() => cart.customerInfo.calle.trim().length >= 5)

const formValid = computed(
  () =>
    emailValid.value &&
    nombreValid.value &&
    cedulaValid.value &&
    telefonoValid.value &&
    calleValid.value,
)

// ── Input handlers ────────────────────────────────────────
function onFieldInput(field: keyof typeof cart.customerInfo, value: string) {
  cart.setCustomerInfo({ [field]: value })
  // keep backward compat with customerEmail in store
  if (field === 'email') cart.setEmail(value)
}

// ── Cart controls ─────────────────────────────────────────
const WHATSAPP_NUMBER = '593963237880'

function orderByWhatsApp() {
  const lines = cart.items.map(
    (item) => `• ${item.cantidad}x ${item.nombre} — $${(item.precio * item.cantidad).toFixed(2)}`,
  )
  const message = [
    '¡Hola Tequecruncheese! 🧀 Quisiera hacer el siguiente pedido:',
    '',
    ...lines,
    '',
    `*Total: $${cart.totalPrice.toFixed(2)}*`,
    '',
    '¡Gracias! 😊',
  ].join('\n')

  const url = `https://api.whatsapp.com/send/?phone=${WHATSAPP_NUMBER}&text=${encodeURIComponent(message)}`
  window.open(url, '_blank', 'noopener')
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

      <!-- Customer form -->
      <div class="cart-drawer__form">
        <p class="cart-drawer__form-title">
          <i class="fa-solid fa-user"></i> Datos de entrega
        </p>

        <!-- Nombre -->
        <div class="cart-drawer__field">
          <label for="cart-nombre">
            Nombre completo <span class="cart-drawer__required">*</span>
          </label>
          <input
            id="cart-nombre"
            type="text"
            :value="cart.customerInfo.nombre"
            :class="{ 'cart-drawer__input--error': touched.nombre && !nombreValid }"
            placeholder="Juan Pérez"
            autocomplete="name"
            @input="onFieldInput('nombre', ($event.target as HTMLInputElement).value)"
            @blur="markTouched('nombre')"
          />
          <span v-if="touched.nombre && !nombreValid" class="cart-drawer__field-error">
            Ingresa tu nombre completo.
          </span>
        </div>

        <!-- Cédula -->
        <div class="cart-drawer__field">
          <label for="cart-cedula">
            Cédula <span class="cart-drawer__required">*</span>
          </label>
          <input
            id="cart-cedula"
            type="text"
            :value="cart.customerInfo.cedula"
            :class="{ 'cart-drawer__input--error': touched.cedula && !cedulaValid }"
            placeholder="0912345678"
            maxlength="10"
            @input="onFieldInput('cedula', ($event.target as HTMLInputElement).value)"
            @blur="markTouched('cedula')"
          />
          <span v-if="touched.cedula && !cedulaValid" class="cart-drawer__field-error">
            Cédula ecuatoriana inválida.
          </span>
        </div>

        <!-- Email -->
        <div class="cart-drawer__field">
          <label for="cart-email">
            Correo electrónico <span class="cart-drawer__required">*</span>
          </label>
          <input
            id="cart-email"
            type="email"
            :value="cart.customerInfo.email"
            :class="{ 'cart-drawer__input--error': touched.email && !emailValid }"
            placeholder="tu@correo.com"
            autocomplete="email"
            @input="onFieldInput('email', ($event.target as HTMLInputElement).value)"
            @blur="markTouched('email')"
          />
          <span v-if="touched.email && !emailValid" class="cart-drawer__field-error">
            Ingresa un correo válido.
          </span>
        </div>

        <!-- Teléfono -->
        <div class="cart-drawer__field">
          <label for="cart-telefono">
            Teléfono <span class="cart-drawer__required">*</span>
          </label>
          <input
            id="cart-telefono"
            type="tel"
            :value="cart.customerInfo.telefono"
            :class="{ 'cart-drawer__input--error': touched.telefono && !telefonoValid }"
            placeholder="0991234567"
            maxlength="10"
            autocomplete="tel"
            @input="onFieldInput('telefono', ($event.target as HTMLInputElement).value)"
            @blur="markTouched('telefono')"
          />
          <span v-if="touched.telefono && !telefonoValid" class="cart-drawer__field-error">
            Número ecuatoriano inválido (09... o 02...).
          </span>
        </div>

        <!-- Calle / Dirección -->
        <div class="cart-drawer__field">
          <label for="cart-calle">
            Dirección <span class="cart-drawer__required">*</span>
          </label>
          <input
            id="cart-calle"
            type="text"
            :value="cart.customerInfo.calle"
            :class="{ 'cart-drawer__input--error': touched.calle && !calleValid }"
            placeholder="Av. 9 de Octubre y García Moreno"
            @input="onFieldInput('calle', ($event.target as HTMLInputElement).value)"
            @blur="markTouched('calle')"
          />
          <span v-if="touched.calle && !calleValid" class="cart-drawer__field-error">
            Ingresa tu dirección.
          </span>
        </div>

        <!-- Barrio -->
        <div class="cart-drawer__field">
          <label for="cart-barrio">Barrio / Sector</label>
          <input
            id="cart-barrio"
            type="text"
            :value="cart.customerInfo.barrio"
            placeholder="Urdesa Central"
            @input="onFieldInput('barrio', ($event.target as HTMLInputElement).value)"
          />
        </div>

        <!-- Referencia -->
        <div class="cart-drawer__field">
          <label for="cart-referencia">Referencia</label>
          <input
            id="cart-referencia"
            type="text"
            :value="cart.customerInfo.referencia"
            placeholder="Frente al parque"
            @input="onFieldInput('referencia', ($event.target as HTMLInputElement).value)"
          />
        </div>

        <!-- Google Maps URL -->
        <div class="cart-drawer__field">
          <label for="cart-maps">Link de Google Maps</label>
          <input
            id="cart-maps"
            type="url"
            :value="cart.customerInfo.mapsUrl"
            placeholder="Pega aquí tu link de Google Maps"
            @input="onFieldInput('mapsUrl', ($event.target as HTMLInputElement).value)"
          />
        </div>
      </div>

      <button
        class="btn btn--primary cart-drawer__checkout-btn"
        :disabled="!formValid"
        @click="emit('checkout')"
      >
        <i class="fa-solid fa-lock"></i>
        Pagar con PayPhone
      </button>

      <div class="cart-drawer__divider">
        <span>o</span>
      </div>

      <button class="cart-drawer__whatsapp-btn" @click="orderByWhatsApp">
        <i class="fa-brands fa-whatsapp"></i>
        Pedir por WhatsApp
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
    overflow-y: auto;
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

  // ── Form ─────────────────────────────────────────────────
  &__form {
    display: flex;
    flex-direction: column;
    gap: 0.875rem;
    border: 1px solid #f0f0f0;
    border-radius: 0.75rem;
    padding: 1rem;
    background: #fafafa;
  }

  &__form-title {
    margin: 0 0 0.25rem;
    font-size: 0.85rem;
    font-weight: 700;
    color: $color-accent;
    display: flex;
    align-items: center;
    gap: 0.375rem;
  }

  &__field {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;

    label {
      font-size: 0.78rem;
      font-weight: 600;
      color: #555;
    }

    input {
      width: 100%;
      padding: 0.55rem 0.75rem;
      border: 1.5px solid #e0e0e0;
      border-radius: 0.5rem;
      font-size: 0.875rem;
      outline: none;
      transition: border-color 0.15s;
      box-sizing: border-box;
      background: $white;

      &:focus {
        border-color: $color-accent;
      }
    }
  }

  &__input--error {
    border-color: #e53e3e !important;
  }

  &__field-error {
    font-size: 0.72rem;
    color: #e53e3e;
  }

  &__required {
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

  &__divider {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    color: #bbb;
    font-size: 0.8rem;

    &::before,
    &::after {
      content: '';
      flex: 1;
      height: 1px;
      background: #e8e8e8;
    }
  }

  &__whatsapp-btn {
    width: 100%;
    padding: 0.8rem;
    border: 2px solid #25d366;
    border-radius: 0.75rem;
    background: #fff;
    color: #128c3e;
    font-size: 0.95rem;
    font-weight: 700;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    transition: background 0.15s, color 0.15s;

    i { font-size: 1.1rem; }

    &:hover {
      background: #25d366;
      color: #fff;
    }
  }
}
</style>
