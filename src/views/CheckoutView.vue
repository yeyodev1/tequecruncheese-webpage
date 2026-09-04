<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useCartStore } from '@/stores/cart'
import { paymentService } from '@/services/payment.service'
import { productService } from '@/services/product.service'
import { scheduleService, DEFAULT_SCHEDULE_CONFIG, type ScheduleConfig } from '@/services/schedule.service'
import { useDeliveryQuote } from '@/composables/useDeliveryQuote'
import { useCheckoutValidation } from '@/composables/useCheckoutValidation'
import { openWhatsAppOrder } from '@/composables/useWhatsAppOrder'
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

/**
 * Closed for the night. The API is the one that refuses the order; this only
 * surfaces the same answer early, so nobody fills in an address and a cedula
 * before finding out. Defaults to open, so a failed config fetch never locks
 * a store that is actually taking orders.
 */
const storeClosed = computed(() => scheduleConfig.value.isOpen === false)

const closedMessage = computed(() =>
  `Ya cerramos por hoy. Recibimos pedidos de ${scheduleConfig.value.openHour}:00 a ` +
  `${scheduleConfig.value.closeHour}:00. ¡Te esperamos mañana!`,
)

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

/**
 * Add a suggested product without leaving the checkout.
 * Flavor boxes cannot be added blind — they open the picker instead, which is
 * the same gate the "falta elegir sabores" alert enforces.
 */
function addSuggestion(product: Product) {
  if (product.hasFlavors && product.flavors?.some(f => f.isActive)) {
    pickerProduct.value = product
    showPicker.value = true
    return
  }
  cart.addItem(
    { slug: product.slug, nombre: product.nombre, precio: product.precio },
    undefined,
    false, // don't pop the drawer open over the checkout
  )
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

/**
 * A delivery order the shipping fee cannot be computed for.
 *
 * The API refuses these outright now, because an order whose delivery nobody
 * could price used to go out with free shipping. Surfacing it here means the
 * customer is stopped at the map instead of at the payment button, with the
 * fix (the map picker) sitting right where the problem is.
 */
const deliveryUnresolved = computed(
  () => !isPickup.value && !isResolvingUrl.value && deliveryCost.value === null,
)

/** Located, but too far to deliver to — a different answer from "not found". */
const deliveryTooFar = computed(() => deliveryUnresolved.value && outOfRange.value)

const deliveryBlockMessage = computed(() => {
  if (!deliveryUnresolved.value) return ''
  if (deliveryTooFar.value) {
    return `Estás a ${deliveryKm.value?.toFixed(1)} km de la tienda, fuera de nuestra zona de ` +
      'entrega. Escríbenos por WhatsApp y coordinamos contigo.'
  }
  return 'Necesitamos tu ubicación para calcular el envío. Marca tu ubicación en el mapa, ' +
    'arriba en “Método de entrega”.'
})

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
  if (storeClosed.value) return // the API would refuse it anyway
  if (deliveryUnresolved.value) return // so would an order with no shipping fee
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
  } catch (err) {
    // The API explains refusals the customer can act on — closed store, a slot
    // that just expired. Swallowing those behind a generic message left people
    // retrying a payment that was never going to go through.
    const apiMessage = (err as { response?: { data?: { message?: string } } })
      ?.response?.data?.message
    errorMsg.value = apiMessage || 'Hubo un problema al procesar el pago. Intenta de nuevo.'
    loading.value = false
  }
}

// ── WhatsApp ──────────────────────────────────────────────
function orderByWhatsApp() {
  // A booked slot is held by the payment, so WhatsApp is not an option for it.
  if (scheduledFor.value) return
  // Closing time applies to every channel — routing around the checkout would
  // land the same after-hours order in the same kitchen.
  if (storeClosed.value) return

  openWhatsAppOrder({
    items: cart.items,
    customerInfo: cart.customerInfo,
    subtotal: cart.totalPrice,
    total: grandTotal.value,
    isPickup: isPickup.value,
    deliveryKm: deliveryKm.value,
    deliveryCost: deliveryCost.value,
  })
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

          <div v-if="storeClosed" class="co-closed" role="status">
            <i class="fa-solid fa-moon"></i>
            <div>
              <strong>Estamos cerrados</strong>
              <p>{{ closedMessage }}</p>
            </div>
          </div>

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
            :store-closed="storeClosed"
            :closed-message="closedMessage"
            :delivery-unresolved="deliveryUnresolved"
            :delivery-too-far="deliveryTooFar"
            :delivery-block-message="deliveryBlockMessage"
            @checkout="checkout"
            @whatsapp="orderByWhatsApp"
            @clear-schedule="scheduledFor = null"
          />
        </div>

        <OrderSummary
          :products="products"
          :is-pickup="isPickup"
          :delivery-km="deliveryKm"
          :delivery-cost="deliveryCost"
          :grand-total="grandTotal"
          :scheduled-for="scheduledFor"
          :scheduled-label="scheduledLabel"
          @edit="router.push('/tienda')"
          @add="addSuggestion"
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

// Closed-for-the-night notice. Warm amber rather than the error red: the store
// being shut is not the customer having done something wrong.
.co-closed {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  background: #fff8ec;
  border: 1px solid rgba(191, 132, 16, 0.32);
  color: #8a5a00;
  padding: 0.9rem 1.1rem;
  border-radius: 0.75rem;
  margin-bottom: 1rem;

  i {
    font-size: 1.05rem;
    line-height: 1.4;
    flex-shrink: 0;
  }

  strong {
    display: block;
    font-size: 0.92rem;
    font-weight: 700;
  }

  p {
    margin: 0.15rem 0 0;
    font-size: 0.82rem;
    line-height: 1.45;
  }
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
