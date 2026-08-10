<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useCartStore } from '@/stores/cart'
import { paymentService } from '@/services/payment.service'
import { productService } from '@/services/product.service'
import { scheduleService, DEFAULT_SCHEDULE_CONFIG, type ScheduleConfig } from '@/services/schedule.service'
import { useDeliveryQuote } from '@/composables/useDeliveryQuote'
import { useCheckoutValidation } from '@/composables/useCheckoutValidation'
import BrandLogo from '@/components/BrandLogo.vue'
import ProductDetailModal from '@/components/tienda/ProductDetailModal.vue'
import FlavorAlert from '@/components/checkout/FlavorAlert.vue'
import CustomerSection from '@/components/checkout/CustomerSection.vue'
import DeliverySection from '@/components/checkout/DeliverySection.vue'
import PaymentSection from '@/components/checkout/PaymentSection.vue'
import OrderSummary from '@/components/checkout/OrderSummary.vue'
import type { Product } from '@/types'

const router = useRouter()
const cart = useCartStore()

// ── Products cache (for flavor picker) ────────────────────
const products = ref<Product[]>([])
const pickerProduct = ref<Product | null>(null)
const showPicker = ref(false)
const scheduleConfig = ref<ScheduleConfig>(DEFAULT_SCHEDULE_CONFIG)

onMounted(async () => {
  if (cart.isEmpty) { router.replace('/tienda'); return }
  try { products.value = await productService.list() } catch { /* ignore */ }
  // Opening hours come from the API so the picker and the validator agree.
  try { scheduleConfig.value = await scheduleService.config() } catch { /* defaults stand */ }
})

/** Items that have flavors configured on the product but none chosen yet. */
const itemsMissingFlavors = computed(() =>
  cart.items.filter(item => {
    const p = products.value.find(p => p.slug === item.slug)
    return p?.hasFlavors && p.flavors?.some(f => f.isActive) && !item.flavorSelections?.length
  }),
)
const allFlavorsConfigured = computed(() => itemsMissingFlavors.value.length === 0)

function openFlavorPicker(slug: string) {
  const p = products.value.find(p => p.slug === slug)
  if (!p) return
  pickerProduct.value = p
  showPicker.value = true
}

function onFlavorAdded() {
  showPicker.value = false
  pickerProduct.value = null
}

// ── Delivery ──────────────────────────────────────────────
const deliveryMethod = ref<'delivery' | 'pickup'>('delivery')
const isPickup = computed(() => deliveryMethod.value === 'pickup')

const {
  coords: customerCoords,
  km: deliveryKm,
  cost: deliveryCost,
  outOfRange,
  isResolving: isResolvingUrl,
  // A computed getter, not `toRef`, so this keeps working even if the store
  // ever swaps the customerInfo object instead of mutating it.
} = useDeliveryQuote(computed(() => cart.customerInfo.mapsUrl), isPickup)

const grandTotal = computed(() => cart.totalPrice + (deliveryCost.value ?? 0))

// ── Scheduled orders ──────────────────────────────────────
/** ISO instant of the booked slot; null means "as soon as possible". */
const scheduledFor = ref<string | null>(null)

const scheduledLabel = computed(() => {
  if (!scheduledFor.value) return ''
  return new Intl.DateTimeFormat('es-EC', {
    timeZone: scheduleConfig.value.timezone,
    weekday: 'short', day: 'numeric', month: 'short',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(new Date(scheduledFor.value))
})

// ── Validation ────────────────────────────────────────────
const quiereFactura = ref(false)
const facturaEmail = ref('')
const facturaRuc = ref('')

const {
  touched, markTouched, touchedFactura,
  nombreValid, cedulaValid, emailValid, telefonoValid, calleValid,
  facturaEmailValid, facturaRucValid,
  formValid, missingFieldsLabel,
} = useCheckoutValidation(
  cart.customerInfo,
  isPickup,
  { quiere: quiereFactura, email: facturaEmail, ruc: facturaRuc },
)

const showNudge = computed(() => !formValid.value && Object.values(touched.value).some(Boolean))

// ── Checkout ──────────────────────────────────────────────
const loading = ref(false)
const errorMsg = ref('')

async function checkout() {
  if (cart.isEmpty || loading.value || !formValid.value || !allFlavorsConfigured.value) return
  if (isResolvingUrl.value) return // wait for the authoritative delivery quote
  loading.value = true
  errorMsg.value = ''
  try {
    const clientTransactionId = crypto.randomUUID()
    const result = await paymentService.preparePayment({
      items: cart.items,
      clientTransactionId,
      customerEmail: cart.customerInfo.email,
      customerInfo: {
        ...cart.customerInfo,
        deliveryMethod: deliveryMethod.value,
        ...(quiereFactura.value && {
          quiereFactura: true,
          facturaEmail: facturaEmail.value,
          facturaRuc: facturaRuc.value,
        }),
      },
      ...(deliveryCost.value ? { deliveryCost: deliveryCost.value } : {}),
      ...(scheduledFor.value ? { scheduledFor: scheduledFor.value } : {}),
    })
    window.location.href = result.payWithPayPhone
  } catch {
    errorMsg.value = 'Hubo un problema al procesar el pago. Intenta de nuevo.'
    loading.value = false
  }
}

// ── WhatsApp ──────────────────────────────────────────────
const WHATSAPP_NUMBER = '593963237880'

function orderByWhatsApp() {
  // A booked slot is held by the payment, so WhatsApp is not an option for it.
  if (scheduledFor.value) return

  const lines = cart.items.map(item => {
    let line = `• ${item.cantidad}x ${item.nombre} — $${(item.precio * item.cantidad).toFixed(2)}`
    if (item.flavorSelections?.length) {
      const detail = item.flavorSelections.map(s => `${s.cantidad}× ${s.nombre}`).join(', ')
      line += `\n  Sabores: ${detail}`
    }
    return line
  })

  const formInfo = [
    `Nombre: ${cart.customerInfo.nombre}`,
    `Cédula: ${cart.customerInfo.cedula}`,
    `Email: ${cart.customerInfo.email}`,
    `Tel: ${cart.customerInfo.telefono}`,
    `Dirección: ${cart.customerInfo.calle}`,
    cart.customerInfo.barrio ? `Barrio: ${cart.customerInfo.barrio}` : '',
    cart.customerInfo.referencia ? `Referencia: ${cart.customerInfo.referencia}` : '',
    cart.customerInfo.mapsUrl ? `Google Maps: ${cart.customerInfo.mapsUrl}` : '',
  ].filter(Boolean)

  const deliveryLine = isPickup.value
    ? '🏪 Retiro en tienda (sin costo de envío)'
    : deliveryCost.value
      ? `Envío (${deliveryKm.value!.toFixed(1)} km): $${deliveryCost.value.toFixed(2)}`
      : 'Envío: por coordinar'

  const message = [
    '¡Hola Tequecruncheese! Quisiera hacer el siguiente pedido:',
    '',
    ...lines,
    '',
    '⚡ Lo antes posible',
    '',
    `Subtotal: $${cart.totalPrice.toFixed(2)}`,
    deliveryLine,
    `*Total: $${grandTotal.value.toFixed(2)}*`,
    '',
    '---',
    ...formInfo,
    '',
    '¡Gracias!',
  ].join('\n')

  window.open(
    `https://api.whatsapp.com/send/?phone=${WHATSAPP_NUMBER}&text=${encodeURIComponent(message)}`,
    '_blank',
    'noopener',
  )
}
</script>

<template>
  <div class="checkout-view">

    <header class="co-header">
      <div class="co-header__inner">
        <button class="co-header__back" @click="router.push('/tienda')">
          <i class="fa-solid fa-arrow-left"></i>
          Volver a la tienda
        </button>
        <BrandLogo class="co-header__brand" variant="long" :height="34" />
        <div class="co-header__space"></div>
      </div>
    </header>

    <main class="co-main">
      <div class="co-layout">

        <div class="co-form-col">
          <h1 class="co-title">Completa tu pedido</h1>

          <FlavorAlert :items="itemsMissingFlavors" @pick="openFlavorPicker" />

          <CustomerSection
            :touched="touched"
            :nombre-valid="nombreValid"
            :cedula-valid="cedulaValid"
            :email-valid="emailValid"
            :telefono-valid="telefonoValid"
            @blur="markTouched($event as any)"
          />

          <DeliverySection
            v-model:delivery-method="deliveryMethod"
            v-model:scheduled-for="scheduledFor"
            v-model:quiere-factura="quiereFactura"
            v-model:factura-email="facturaEmail"
            v-model:factura-ruc="facturaRuc"
            :schedule-config="scheduleConfig"
            :touched-calle="touched.calle"
            :calle-valid="calleValid"
            :is-resolving-url="isResolvingUrl"
            :has-coords="!!customerCoords"
            :out-of-range="outOfRange"
            :delivery-km="deliveryKm"
            :delivery-cost="deliveryCost"
            :touched-factura="touchedFactura"
            :factura-email-valid="facturaEmailValid"
            :factura-ruc-valid="facturaRucValid"
            @touch-calle="markTouched('calle')"
            @touch-factura="touchedFactura[$event] = true"
          />

          <PaymentSection
            :error-msg="errorMsg"
            :show-nudge="showNudge"
            :loading="loading"
            :is-resolving-url="isResolvingUrl"
            :all-flavors-configured="allFlavorsConfigured"
            :form-valid="formValid"
            :missing-fields-label="missingFieldsLabel"
            :grand-total="grandTotal"
            :scheduled-for="scheduledFor"
            :scheduled-label="scheduledLabel"
            @checkout="checkout"
            @whatsapp="orderByWhatsApp"
            @clear-schedule="scheduledFor = null"
          />
        </div>

        <OrderSummary
          :is-pickup="isPickup"
          :delivery-km="deliveryKm"
          :delivery-cost="deliveryCost"
          :grand-total="grandTotal"
          :scheduled-for="scheduledFor"
          :scheduled-label="scheduledLabel"
          @edit="router.push('/tienda')"
        />

      </div>
    </main>

    <ProductDetailModal
      v-model="showPicker"
      :product="pickerProduct"
      @added="onFlavorAdded"
    />
  </div>
</template>

<style lang="scss" scoped>
$accent: #572612;
$gold: #fed47f;
$bg: #f8f6f3;

.checkout-view {
  min-height: 100dvh;
  background: $bg;
  display: flex;
  flex-direction: column;
}

.co-header {
  background: $accent;
  padding: 0 1.25rem;
  height: 60px;
  display: flex;
  align-items: center;
  flex-shrink: 0;
  position: sticky;
  top: 0;
  z-index: 50;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.18);

  &__inner {
    width: 100%;
    max-width: 1100px;
    margin: 0 auto;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  &__back {
    display: inline-flex;
    align-items: center;
    min-height: 44px;
    gap: 0.45rem;
    background: none;
    border: none;
    color: rgba(#fff, 0.75);
    font-size: 0.82rem;
    font-weight: 600;
    cursor: pointer;
    padding: 0.35rem 0.625rem;
    border-radius: 0.5rem;
    transition: color 0.12s, background 0.12s;
    flex-shrink: 0;

    i { font-size: 0.75rem; }

    &:hover {
      color: #fff;
      background: rgba(#fff, 0.08);
    }
  }

  &__brand {
    position: absolute;
    left: 50%;
    transform: translateX(-50%);
  }

  &__space { width: 120px; }
}

.co-main {
  flex: 1;
  padding: 1.5rem 1.25rem 3rem;
}

.co-layout {
  max-width: 1100px;
  margin: 0 auto;
  display: flex;
  flex-direction: column-reverse;
  gap: 1.5rem;

  @media (min-width: 900px) {
    flex-direction: row;
    align-items: flex-start;
    gap: 2rem;
  }
}

.co-title {
  font-size: 1.5rem;
  font-weight: 900;
  color: $accent;
  margin: 0 0 1.5rem;
  letter-spacing: -0.02em;

  @media (min-width: 640px) {
    font-size: 1.75rem;
  }
}

.co-form-col {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}
</style>
