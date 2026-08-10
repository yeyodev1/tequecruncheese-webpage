<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useCartStore } from '@/stores/cart'
import { paymentService } from '@/services/payment.service'
import { productService } from '@/services/product.service'
import { mapsService, type MapsQuote } from '@/services/maps.service'
import { scheduleService, DEFAULT_SCHEDULE_CONFIG, type ScheduleConfig } from '@/services/schedule.service'
import ProductDetailModal from '@/components/tienda/ProductDetailModal.vue'
import SchedulePicker from '@/components/tienda/SchedulePicker.vue'
import type { Product, FlavorSelection } from '@/types'

const router = useRouter()
const cart = useCartStore()

// ── Products cache (for flavor picker) ────────────────────
const products = ref<Product[]>([])
const pickerProduct = ref<Product | null>(null)
const showPicker = ref(false)

onMounted(async () => {
  if (cart.isEmpty) { router.replace('/tienda'); return }
  try { products.value = await productService.list() } catch { /* ignore */ }
  // Opening hours come from the API so the picker and the validator agree.
  try { scheduleConfig.value = await scheduleService.config() } catch { /* defaults stand */ }
})

// Items that have hasFlavors but no selections yet
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

// ── Delivery distance pricing ─────────────────────────────
// The backend owns the real calculation (and the amount charged). Everything
// here is a local preview so the customer sees a price while typing.
const ORIGIN = { lat: -2.1647443, lng: -79.912804 } // Tequecruncheese, Guayaquil

/** Continental Ecuador — anything outside is a mis-parse, not an address. */
const EC_BBOX = { minLat: -5.2, maxLat: 1.8, minLng: -81.3, maxLng: -74.9 }
const MAX_DELIVERY_KM = 60

const NUM = '(-?\\d+\\.\\d+)'
// Ordered by trustworthiness: `!3d!4d` is the resolved pin, `@` only the
// viewport centre. Decimals are required so street numbers can't match.
const COORD_PATTERNS = [
  new RegExp(`!3d${NUM}!4d${NUM}`),
  new RegExp(`[?&](?:q|query|destination|daddr|saddr|ll|sll|center|mlat)=(?:loc:)?${NUM},\\+?${NUM}`),
  new RegExp(`/maps/(?:search|dir|place)/${NUM},\\+?${NUM}`),
  new RegExp(`@${NUM},${NUM}`),
]
const BARE_COORDS_RE = new RegExp(`^\\s*${NUM}\\s*,\\s*${NUM}\\s*$`)

function isPlausible(lat: number, lng: number): boolean {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false
  return lat >= EC_BBOX.minLat && lat <= EC_BBOX.maxLat
    && lng >= EC_BBOX.minLng && lng <= EC_BBOX.maxLng
}

function extractCoordsFromMapsUrl(url: string): { lat: number; lng: number } | null {
  if (!url) return null

  const bare = url.match(BARE_COORDS_RE)
  if (bare) {
    const lat = parseFloat(bare[1]!), lng = parseFloat(bare[2]!)
    if (isPlausible(lat, lng)) return { lat, lng }
  }

  let decoded = url
  try { decoded = decodeURIComponent(url) } catch { /* keep the raw string */ }

  for (const candidate of [url, decoded]) {
    for (const pattern of COORD_PATTERNS) {
      const match = candidate.match(pattern)
      if (!match) continue
      const lat = parseFloat(match[1]!), lng = parseFloat(match[2]!)
      // Keep scanning: a bad `@` hit must not shadow a good `!3d!4d` later on.
      if (isPlausible(lat, lng)) return { lat, lng }
    }
  }

  return null
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371
  const toRad = (v: number) => (v * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

/** Mirrors the backend tariff table. Out of radius → null ("por coordinar"). */
function getDeliveryCost(km: number): number | null {
  if (!Number.isFinite(km) || km < 0) return null
  if (km <= 1) return 2.00
  if (km <= 2.9) return 2.50
  if (km <= 4.9) return 3.00
  if (km <= 5.9) return 3.50
  if (km <= 7.9) return 4.00
  if (km <= 8.5) return 4.50
  if (km <= 9.9) return 5.00
  if (km <= 10.9) return 5.50
  if (km <= 13.9) return 6.00
  if (km <= 15.9) return 6.50
  if (km <= 17.9) return 7.00
  if (km <= 20.9) return 8.00
  if (km <= 23.9) return 9.00
  if (km <= MAX_DELIVERY_KM) return 10.00
  return null
}

// ── Delivery method ────────────────────────────────────────────
const deliveryMethod = ref<'delivery' | 'pickup'>('delivery')
const isPickup = computed(() => deliveryMethod.value === 'pickup')

// ── Scheduled orders ───────────────────────────────────────────
const scheduleConfig = ref<ScheduleConfig>(DEFAULT_SCHEDULE_CONFIG)
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

// ── Backend quote (authoritative) ──────────────────────────────
// Every link goes to the backend: short links need a redirect follow, and long
// ones can resolve to a page whose coordinates only live in the HTML body.
const quote = ref<MapsQuote | null>(null)
const isResolvingUrl = ref(false)
let quoteTimer: ReturnType<typeof setTimeout> | undefined
let quoteSeq = 0

watch(
  () => cart.customerInfo.mapsUrl,
  (newUrl) => {
    clearTimeout(quoteTimer)
    quote.value = null
    const raw = (newUrl ?? '').trim()
    if (!raw) { isResolvingUrl.value = false; return }

    isResolvingUrl.value = true
    const seq = ++quoteSeq
    // Debounced so a pasted-then-edited link doesn't fire a request per keystroke.
    quoteTimer = setTimeout(async () => {
      try {
        const result = await mapsService.quote(raw)
        if (seq === quoteSeq) quote.value = result
      } catch {
        // Leaves the local estimate (or the "por coordinar" notice) in place.
      } finally {
        if (seq === quoteSeq) isResolvingUrl.value = false
      }
    }, 500)
  },
  { immediate: true },
)

/** Local estimate — only usable when the pasted link already carries coords. */
const localCoords = computed(() => extractCoordsFromMapsUrl(cart.customerInfo.mapsUrl ?? ''))

const customerCoords = computed(() => quote.value?.coords ?? localCoords.value)

const deliveryKm = computed(() => {
  if (quote.value?.km != null) return quote.value.km
  const c = localCoords.value
  return c ? haversineKm(ORIGIN.lat, ORIGIN.lng, c.lat, c.lng) : null
})

const deliveryCost = computed(() => {
  if (isPickup.value) return 0
  if (quote.value) return quote.value.deliveryCost
  return deliveryKm.value !== null ? getDeliveryCost(deliveryKm.value) : null
})

/** Coordinates found but beyond the delivery radius — price is coordinated. */
const outOfRange = computed(() =>
  !isPickup.value && customerCoords.value !== null && deliveryCost.value === null,
)

const grandTotal = computed(() => cart.totalPrice + (deliveryCost.value ?? 0))

// ── Factura state ──────────────────────────────────────────
const quiereFactura = ref(false)
const facturaEmail = ref('')
const facturaRuc = ref('')
const touchedFactura = ref({ email: false, ruc: false })

// ── Touched state ──────────────────────────────────────────
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

// ── Ecuador cédula validation ──────────────────────────────
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

// ── Validators ─────────────────────────────────────────────
const emailValid = computed(() => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cart.customerInfo.email))
const nombreValid = computed(() => cart.customerInfo.nombre.trim().length >= 3)
const cedulaValid = computed(() => validarCedula(cart.customerInfo.cedula))
const telefonoValid = computed(() => /^(09|02)\d{8}$/.test(cart.customerInfo.telefono))
const calleValid = computed(() => cart.customerInfo.calle.trim().length >= 5)

const facturaRucValid = computed(() => /^(\d{10}|\d{13})$/.test(facturaRuc.value))
const facturaEmailValid = computed(() => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(facturaEmail.value))

const formValid = computed(() => {
  const personal = emailValid.value && nombreValid.value && cedulaValid.value && telefonoValid.value
  const address = isPickup.value || calleValid.value
  const base = personal && address
  if (!quiereFactura.value) return base
  return base && facturaRucValid.value && facturaEmailValid.value
})

/** Names what is still missing, so the disabled button explains itself. */
const missingFieldsLabel = computed(() => {
  const missing: string[] = []
  if (!nombreValid.value) missing.push('nombre')
  if (!cedulaValid.value) missing.push('cédula')
  if (!emailValid.value) missing.push('correo')
  if (!telefonoValid.value) missing.push('teléfono')
  if (!isPickup.value && !calleValid.value) missing.push('dirección')
  if (quiereFactura.value && !facturaEmailValid.value) missing.push('correo de factura')
  if (quiereFactura.value && !facturaRucValid.value) missing.push('RUC / cédula')

  if (!missing.length) return 'Revisa los campos marcados'
  if (missing.length === 1) return `Falta tu ${missing[0]}`
  const last = missing.pop()
  return `Faltan: ${missing.join(', ')} y ${last}`
})

function onFieldInput(field: keyof typeof cart.customerInfo, value: string) {
  cart.setCustomerInfo({ [field]: value })
  if (field === 'email') cart.setEmail(value)
}

// ── Order summary helpers ──────────────────────────────────
function flavorSummary(selections: FlavorSelection[]): string {
  return selections.map(s => `${s.cantidad}× ${s.nombre}`).join(', ')
}

// ── Checkout ───────────────────────────────────────────────
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

// ── WhatsApp ───────────────────────────────────────────────
const WHATSAPP_NUMBER = '593963237880'

function orderByWhatsApp() {
  // A booked slot is held by the payment, so WhatsApp is not an option for it.
  if (scheduledFor.value) return

  const lines = cart.items.map(item => {
    let line = `• ${item.cantidad}x ${item.nombre} — $${(item.precio * item.cantidad).toFixed(2)}`
    if (item.flavorSelections?.length) {
      line += `\n  Sabores: ${flavorSummary(item.flavorSelections)}`
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
      ? `Envío (${deliveryKm.value!.toFixed(1)} km): $${(deliveryCost.value as number).toFixed(2)}`
      : 'Envío: por coordinar'

  // Always immediate: the guard above rules out scheduled orders here.
  const scheduleLine = '⚡ Lo antes posible'

  const message = [
    '¡Hola Tequecruncheese! Quisiera hacer el siguiente pedido:',
    '',
    ...lines,
    '',
    scheduleLine,
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

    <!-- ── Top bar ───────────────────────────────────────── -->
    <header class="co-header">
      <div class="co-header__inner">
        <button class="co-header__back" @click="router.push('/tienda')">
          <i class="fa-solid fa-arrow-left"></i>
          Volver a la tienda
        </button>
        <div class="co-header__brand">
          <span class="co-header__brand-name">Tequecruncheese</span>
        </div>
        <div class="co-header__space"></div>
      </div>
    </header>

    <!-- ── Main ─────────────────────────────────────────── -->
    <main class="co-main">
      <div class="co-layout">

        <!-- ═══ LEFT: Form ═══════════════════════════════ -->
        <div class="co-form-col">

          <h1 class="co-title">Completa tu pedido</h1>

          <!-- ── Flavor alert: items missing selections ── -->
          <div v-if="itemsMissingFlavors.length > 0" class="co-flavor-alert">
            <div class="co-flavor-alert__head">
              <i class="fa-solid fa-triangle-exclamation"></i>
              <div>
                <p class="co-flavor-alert__title">¡Falta elegir sabores!</p>
                <p class="co-flavor-alert__sub">
                  Debes configurar los sabores de tu caja antes de pagar.
                </p>
              </div>
            </div>
            <ul class="co-flavor-alert__list">
              <li
                v-for="item in itemsMissingFlavors"
                :key="item.slug"
                class="co-flavor-alert__item"
              >
                <div class="co-flavor-alert__item-info">
                  <i class="fa-solid fa-cubes-stacked"></i>
                  <span>{{ item.nombre }}</span>
                  <span class="co-flavor-alert__badge">Sin sabores</span>
                </div>
                <button
                  class="co-flavor-alert__btn"
                  @click="openFlavorPicker(item.slug)"
                >
                  <i class="fa-solid fa-sliders"></i>
                  Elegir sabores
                </button>
              </li>
            </ul>
          </div>

          <!-- Step 1: Datos personales -->
          <section class="co-section">
            <div class="co-section__head">
              <span class="co-section__num">1</span>
              <div>
                <h2 class="co-section__title">Datos personales</h2>
                <p class="co-section__hint">Para confirmar y enviarte el tracking</p>
              </div>
            </div>

            <div class="co-fields">

              <!-- Nombre -->
              <div class="co-field">
                <label class="co-field__label">
                  Nombre completo <span class="co-field__req">*</span>
                </label>
                <div :class="['co-field__input', { 'co-field__input--err': touched.nombre && !nombreValid }]">
                  <i class="fa-regular fa-address-card"></i>
                  <input
                    type="text"
                    :value="cart.customerInfo.nombre"
                    placeholder="Juan Pérez"
                    autocomplete="name"
                    @input="onFieldInput('nombre', ($event.target as HTMLInputElement).value)"
                    @blur="markTouched('nombre')"
                  />
                </div>
                <span v-if="touched.nombre && !nombreValid" class="co-field__err">
                  <i class="fa-solid fa-circle-exclamation"></i> Ingresa tu nombre completo.
                </span>
              </div>

              <!-- Cédula -->
              <div class="co-field">
                <label class="co-field__label">
                  Cédula de identidad <span class="co-field__req">*</span>
                </label>
                <div :class="['co-field__input', { 'co-field__input--err': touched.cedula && !cedulaValid }]">
                  <i class="fa-solid fa-id-card"></i>
                  <input
                    type="text"
                    :value="cart.customerInfo.cedula"
                    placeholder="0912345678"
                    maxlength="10"
                    inputmode="numeric"
                    @input="onFieldInput('cedula', ($event.target as HTMLInputElement).value)"
                    @blur="markTouched('cedula')"
                  />
                </div>
                <span v-if="touched.cedula && !cedulaValid" class="co-field__err">
                  <i class="fa-solid fa-circle-exclamation"></i> Cédula ecuatoriana inválida (10 dígitos).
                </span>
              </div>

              <!-- Email -->
              <div class="co-field">
                <label class="co-field__label">
                  Correo electrónico <span class="co-field__req">*</span>
                </label>
                <div :class="['co-field__input', { 'co-field__input--err': touched.email && !emailValid }]">
                  <i class="fa-regular fa-envelope"></i>
                  <input
                    type="email"
                    :value="cart.customerInfo.email"
                    placeholder="tu@correo.com"
                    autocomplete="email"
                    inputmode="email"
                    @input="onFieldInput('email', ($event.target as HTMLInputElement).value)"
                    @blur="markTouched('email')"
                  />
                </div>
                <span v-if="touched.email && !emailValid" class="co-field__err">
                  <i class="fa-solid fa-circle-exclamation"></i> Ingresa un correo válido.
                </span>
              </div>

              <!-- Teléfono -->
              <div class="co-field">
                <label class="co-field__label">
                  Teléfono <span class="co-field__req">*</span>
                </label>
                <div :class="['co-field__input', { 'co-field__input--err': touched.telefono && !telefonoValid }]">
                  <i class="fa-solid fa-phone"></i>
                  <input
                    type="tel"
                    :value="cart.customerInfo.telefono"
                    placeholder="0991234567"
                    maxlength="10"
                    autocomplete="tel"
                    inputmode="tel"
                    @input="onFieldInput('telefono', ($event.target as HTMLInputElement).value)"
                    @blur="markTouched('telefono')"
                  />
                </div>
                <span v-if="touched.telefono && !telefonoValid" class="co-field__err">
                  <i class="fa-solid fa-circle-exclamation"></i> Número inválido (09... o 02..., 10 dígitos).
                </span>
              </div>

            </div>
          </section>

          <!-- Step 2: Método de entrega -->
          <section class="co-section">
            <div class="co-section__head">
              <span class="co-section__num">2</span>
              <div>
                <h2 class="co-section__title">Método de entrega</h2>
                <p class="co-section__hint">¿Cómo recibes tu pedido?</p>
              </div>
            </div>

            <!-- Delivery method toggle -->
            <div class="co-delivery-method">
              <button
                class="co-delivery-method__btn"
                :class="{ 'co-delivery-method__btn--active': deliveryMethod === 'delivery' }"
                @click="deliveryMethod = 'delivery'"
              >
                <i class="fa-solid fa-truck"></i>
                <div>
                  <strong>Envío a domicilio</strong>
                  <span>Te lo llevamos a tu puerta</span>
                </div>
              </button>
              <button
                class="co-delivery-method__btn"
                :class="{ 'co-delivery-method__btn--active': deliveryMethod === 'pickup' }"
                @click="deliveryMethod = 'pickup'"
              >
                <i class="fa-solid fa-store"></i>
                <div>
                  <strong>Recoger en tienda</strong>
                  <span>Sin costo de envío</span>
                </div>
              </button>
            </div>

            <!-- Pickup notice -->
            <div v-if="isPickup" class="co-pickup-info">
              <i class="fa-solid fa-location-dot"></i>
              <div>
                <strong>Retira en nuestro local</strong>
                <span>Te avisamos cuando tu pedido esté listo</span>
              </div>
            </div>

            <!-- Scheduling -->
            <div class="co-schedule">
              <p class="co-schedule__title">
                <i class="fa-regular fa-clock"></i>
                ¿Cuándo lo quieres?
              </p>
              <SchedulePicker
                v-model="scheduledFor"
                :config="scheduleConfig"
                :mode="deliveryMethod"
              />
            </div>

            <!-- Delivery address fields (hidden for pickup) -->
            <div v-if="!isPickup" class="co-fields" style="margin-top:1.25rem">

              <!-- Calle -->
              <div class="co-field">
                <label class="co-field__label">
                  Calle / Dirección <span class="co-field__req">*</span>
                </label>
                <div :class="['co-field__input', { 'co-field__input--err': touched.calle && !calleValid }]">
                  <i class="fa-solid fa-road"></i>
                  <input
                    type="text"
                    :value="cart.customerInfo.calle"
                    placeholder="Av. 9 de Octubre y García Moreno"
                    autocomplete="street-address"
                    @input="onFieldInput('calle', ($event.target as HTMLInputElement).value)"
                    @blur="markTouched('calle')"
                  />
                </div>
                <span v-if="touched.calle && !calleValid" class="co-field__err">
                  <i class="fa-solid fa-circle-exclamation"></i> Ingresa tu dirección completa.
                </span>
              </div>

              <!-- Barrio + Referencia (2 cols on desktop) -->
              <div class="co-fields co-fields--row">
                <div class="co-field">
                  <label class="co-field__label">Barrio / Sector</label>
                  <div class="co-field__input">
                    <i class="fa-solid fa-map"></i>
                    <input
                      type="text"
                      :value="cart.customerInfo.barrio"
                      placeholder="Urdesa Central"
                      @input="onFieldInput('barrio', ($event.target as HTMLInputElement).value)"
                    />
                  </div>
                </div>

                <div class="co-field">
                  <label class="co-field__label">Referencia</label>
                  <div class="co-field__input">
                    <i class="fa-solid fa-signs-post"></i>
                    <input
                      type="text"
                      :value="cart.customerInfo.referencia"
                      placeholder="Frente al parque"
                      @input="onFieldInput('referencia', ($event.target as HTMLInputElement).value)"
                    />
                  </div>
                </div>
              </div>

              <!-- Maps URL -->
              <div class="co-field">
                <label class="co-field__label">
                  Link de Google Maps
                  <span class="co-field__optional">(opcional · calcula tu envío)</span>
                </label>
                <div class="co-field__input">
                  <i class="fa-solid fa-map-pin"></i>
                  <input
                    type="text"
                    :value="cart.customerInfo.mapsUrl"
                    placeholder="Pega aquí tu link o ubicación de Google Maps"
                    inputmode="text"
                    @input="onFieldInput('mapsUrl', ($event.target as HTMLInputElement).value)"
                  />
                </div>
                <span class="co-field__hint-text">
                  <i class="fa-solid fa-circle-info"></i>
                  Pega cualquier link de Google Maps, ubicación compartida o dirección aproximada
                </span>

                <!-- Delivery cost preview -->
                <Transition name="co-delivery">
                  <div v-if="cart.customerInfo.mapsUrl" class="co-delivery-preview"
                    :class="{
                      'co-delivery-preview--loading': isResolvingUrl,
                      'co-delivery-preview--ok': !isResolvingUrl && customerCoords && !outOfRange,
                      'co-delivery-preview--warn': !isResolvingUrl && (!customerCoords || outOfRange),
                    }"
                  >
                    <template v-if="isResolvingUrl">
                      <i class="fa-solid fa-spinner fa-spin"></i>
                      <div class="co-delivery-preview__body">
                        <strong>Calculando distancia...</strong>
                      </div>
                    </template>
                    <template v-else-if="customerCoords && outOfRange">
                      <i class="fa-solid fa-triangle-exclamation"></i>
                      <div class="co-delivery-preview__body">
                        <strong>Estás a {{ deliveryKm!.toFixed(1) }} km de la tienda</strong>
                        <span>Fuera de nuestra zona habitual; coordinamos el envío contigo</span>
                      </div>
                    </template>
                    <template v-else-if="customerCoords">
                      <i class="fa-solid fa-truck"></i>
                      <div class="co-delivery-preview__body">
                        <strong>${{ deliveryCost!.toFixed(2) }} de envío</strong>
                        <span>{{ deliveryKm!.toFixed(1) }} km desde nuestra tienda</span>
                      </div>
                    </template>
                    <template v-else>
                      <i class="fa-solid fa-triangle-exclamation"></i>
                      <div class="co-delivery-preview__body">
                        <strong>No pudimos calcular la distancia exacta</strong>
                        <span>Igual puedes continuar; coordinaremos el envío con tu referencia</span>
                      </div>
                    </template>
                  </div>
                </Transition>
              </div>

            </div><!-- /v-if !isPickup co-fields -->

            <!-- Factura toggle -->
            <div class="co-factura-toggle" @click="quiereFactura = !quiereFactura">
              <div class="co-factura-toggle__text">
                <i class="fa-solid fa-file-invoice"></i>
                <div>
                  <span class="co-factura-toggle__label">¿Necesitas factura?</span>
                  <span class="co-factura-toggle__sub">Pediremos tu correo y RUC / cédula</span>
                </div>
              </div>
              <div :class="['co-factura-toggle__switch', { 'co-factura-toggle__switch--on': quiereFactura }]">
                <span class="co-factura-toggle__thumb"></span>
              </div>
            </div>

            <!-- Factura fields (conditional) -->
            <Transition name="co-factura">
              <div v-if="quiereFactura" class="co-factura-fields">
                <div class="co-field">
                  <label class="co-field__label">
                    Correo para la factura <span class="co-field__req">*</span>
                  </label>
                  <div :class="['co-field__input', { 'co-field__input--err': touchedFactura.email && !facturaEmailValid }]">
                    <i class="fa-solid fa-envelope"></i>
                    <input
                      v-model="facturaEmail"
                      type="email"
                      placeholder="factura@correo.com"
                      autocomplete="email"
                      @blur="touchedFactura.email = true"
                    />
                  </div>
                  <span v-if="touchedFactura.email && !facturaEmailValid" class="co-field__err">
                    Ingresa un correo válido
                  </span>
                </div>

                <div class="co-field">
                  <label class="co-field__label">
                    RUC o Cédula <span class="co-field__req">*</span>
                  </label>
                  <div :class="['co-field__input', { 'co-field__input--err': touchedFactura.ruc && !facturaRucValid }]">
                    <i class="fa-solid fa-id-card"></i>
                    <input
                      v-model="facturaRuc"
                      type="text"
                      inputmode="numeric"
                      placeholder="10 dígitos (cédula) o 13 dígitos (RUC)"
                      maxlength="13"
                      @input="facturaRuc = (($event.target as HTMLInputElement).value).replace(/\D/g, '')"
                      @blur="touchedFactura.ruc = true"
                    />
                  </div>
                  <span v-if="touchedFactura.ruc && !facturaRucValid" class="co-field__err">
                    Debe tener exactamente 10 dígitos (cédula) o 13 dígitos (RUC)
                  </span>
                  <span v-else-if="facturaRuc.length > 0 && facturaRucValid" class="co-field__ok">
                    <i class="fa-solid fa-circle-check"></i>
                    {{ facturaRuc.length === 13 ? 'RUC válido' : 'Cédula válida' }}
                  </span>
                </div>
              </div>
            </Transition>

          </section>

          <!-- Step 3: Payment -->
          <section class="co-section co-section--payment">
            <div class="co-section__head">
              <span class="co-section__num">3</span>
              <div>
                <h2 class="co-section__title">Pago</h2>
                <p class="co-section__hint">Elige cómo quieres pagar</p>
              </div>
            </div>

            <!-- Error -->
            <div v-if="errorMsg" class="co-error">
              <i class="fa-solid fa-circle-exclamation"></i>
              {{ errorMsg }}
            </div>

            <!-- Validation nudge -->
            <div v-if="!formValid && (Object.values(touched).some(Boolean))" class="co-nudge">
              <i class="fa-solid fa-triangle-exclamation"></i>
              Completa los campos requeridos para continuar.
            </div>

            <div class="co-pay-options">

              <!-- PayPhone -->
              <button
                class="co-pay-btn co-pay-btn--payphone"
                :disabled="!formValid || loading || !allFlavorsConfigured || isResolvingUrl"
                @click="checkout"
              >
                <template v-if="loading">
                  <i class="fa-solid fa-spinner fa-spin"></i>
                  Preparando pago...
                </template>
                <template v-else-if="isResolvingUrl">
                  <i class="fa-solid fa-spinner fa-spin"></i>
                  Calculando envío...
                </template>
                <template v-else-if="!allFlavorsConfigured">
                  <i class="fa-solid fa-sliders"></i>
                  <span>
                    <strong>Elige los sabores primero</strong>
                    <small>Configura tu caja arriba</small>
                  </span>
                </template>
                <!-- A greyed-out button with a price on it reads as broken;
                     name the missing field instead. -->
                <template v-else-if="!formValid">
                  <i class="fa-solid fa-pen-to-square"></i>
                  <span>
                    <strong>Completa tus datos</strong>
                    <small>{{ missingFieldsLabel }}</small>
                  </span>
                </template>
                <template v-else>
                  <i class="fa-solid fa-lock"></i>
                  <span>
                    <strong>Pagar con PayPhone</strong>
                    <small>Tarjeta débito / crédito</small>
                  </span>
                  <span class="co-pay-btn__total">${{ grandTotal.toFixed(2) }}</span>
                </template>
              </button>

              <div class="co-pay-divider">
                <span>{{ scheduledFor ? 'no disponible al programar' : 'o también puedes' }}</span>
              </div>

              <!-- WhatsApp — blocked for scheduled orders, which must be prepaid -->
              <button
                class="co-pay-btn co-pay-btn--whatsapp"
                :class="{ 'co-pay-btn--blocked': scheduledFor }"
                :disabled="!!scheduledFor"
                @click="orderByWhatsApp"
              >
                <i class="fa-brands fa-whatsapp"></i>
                <span>
                  <strong>Continuar por WhatsApp</strong>
                  <small v-if="scheduledFor">Los pedidos programados se pagan con tarjeta</small>
                  <small v-else>Te contactamos para coordinar</small>
                </span>
              </button>

              <div v-if="scheduledFor" class="co-pay-locked">
                <i class="fa-solid fa-lock"></i>
                <div>
                  <strong>Los pedidos programados se pagan solo con tarjeta</strong>
                  <span>
                    Tu horario ({{ scheduledLabel }}) queda reservado al confirmar el pago.
                    ¿Prefieres coordinar por WhatsApp? Elige
                    <button type="button" class="co-pay-locked__link" @click="scheduledFor = null">
                      «Lo antes posible»
                    </button>.
                  </span>
                </div>
              </div>

            </div>

            <p class="co-secure-note">
              <i class="fa-solid fa-shield-halved"></i>
              Pago seguro · Tus datos están protegidos
            </p>
          </section>

        </div>

        <!-- ═══ RIGHT: Order summary ══════════════════════ -->
        <aside class="co-summary">
          <div class="co-summary__inner">
            <h3 class="co-summary__title">
              <i class="fa-solid fa-receipt"></i>
              Tu pedido
            </h3>

            <ul class="co-summary__list">
              <li
                v-for="item in cart.items"
                :key="item.slug"
                class="co-summary__item"
              >
                <div class="co-summary__item-body">
                  <div class="co-summary__item-info">
                    <span class="co-summary__item-qty">{{ item.cantidad }}×</span>
                    <div class="co-summary__item-text">
                      <span class="co-summary__item-name">{{ item.nombre }}</span>
                      <span v-if="item.flavorSelections?.length" class="co-summary__item-flavors">
                        <i class="fa-solid fa-sliders"></i>
                        {{ flavorSummary(item.flavorSelections) }}
                      </span>
                    </div>
                  </div>
                  <span class="co-summary__item-price">
                    ${{ (item.precio * item.cantidad).toFixed(2) }}
                  </span>
                </div>
              </li>
            </ul>

            <div v-if="scheduledFor" class="co-summary__schedule">
              <i class="fa-regular fa-calendar-check"></i>
              <div>
                <strong>{{ isPickup ? 'Retiro' : 'Entrega' }} programada</strong>
                <span>{{ scheduledLabel }}</span>
              </div>
            </div>

            <div class="co-summary__totals">
              <div class="co-summary__row">
                <span>Subtotal</span>
                <span>${{ cart.totalPrice.toFixed(2) }}</span>
              </div>
              <div v-if="isPickup" class="co-summary__row co-summary__row--delivery">
                <span><i class="fa-solid fa-store"></i> Retiro en tienda</span>
                <span>Gratis</span>
              </div>
              <div v-else-if="deliveryCost !== null && deliveryCost > 0" class="co-summary__row co-summary__row--delivery">
                <span>
                  <i class="fa-solid fa-truck"></i>
                  Envío ({{ deliveryKm!.toFixed(1) }} km)
                </span>
                <span>${{ (deliveryCost as number).toFixed(2) }}</span>
              </div>
              <div v-else class="co-summary__row co-summary__row--delivery-pending">
                <span><i class="fa-solid fa-truck"></i> Envío</span>
                <span>por coordinar</span>
              </div>
              <div class="co-summary__row co-summary__row--total">
                <span>Total</span>
                <strong>${{ grandTotal.toFixed(2) }}</strong>
              </div>
            </div>

            <button class="co-summary__edit" @click="router.push('/tienda')">
              <i class="fa-solid fa-pen-to-square"></i>
              Editar pedido
            </button>
          </div>
        </aside>

      </div>
    </main>

    <!-- Flavor picker modal (launched from alert) -->
    <ProductDetailModal
      v-model="showPicker"
      :product="pickerProduct"
      @added="onFlavorAdded"
    />

  </div>
</template>

<style lang="scss" scoped>
$accent: #572612;
$gold: #FED47F;
$bg: #f8f6f3;

// ── Page wrapper ──────────────────────────────────────────────
.checkout-view {
  min-height: 100dvh;
  background: $bg;
  display: flex;
  flex-direction: column;
}

// ── Header ────────────────────────────────────────────────────
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

    i {
      font-size: 0.75rem;
    }

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

  &__brand-name {
    font-size: 1rem;
    font-weight: 900;
    color: $gold;
    letter-spacing: -0.02em;
    font-family: inherit;
  }

  &__space {
    width: 120px;
  }
}

// ── Main layout ───────────────────────────────────────────────
.co-main {
  flex: 1;
  padding: 2rem 1.25rem 4rem;

  @media (min-width: 640px) {
    padding: 2.5rem 2rem 5rem;
  }
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

// ── Title ─────────────────────────────────────────────────────
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

// ── Form column ───────────────────────────────────────────────
.co-form-col {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

// ── Section ───────────────────────────────────────────────────
.co-section {
  background: #fff;
  border-radius: 1.25rem;
  padding: 1.5rem;
  border: 1px solid rgba(0, 0, 0, 0.06);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);

  &__head {
    display: flex;
    align-items: flex-start;
    gap: 0.875rem;
    margin-bottom: 1.375rem;
  }

  &__num {
    width: 2rem;
    height: 2rem;
    border-radius: 50%;
    background: $accent;
    color: $gold;
    font-size: 0.875rem;
    font-weight: 900;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    margin-top: 0.1rem;
  }

  &__title {
    font-size: 1rem;
    font-weight: 800;
    color: $accent;
    margin: 0 0 0.15rem;
    letter-spacing: -0.01em;
  }

  &__hint {
    font-size: 0.78rem;
    color: #aaa;
    margin: 0;
  }

  &--payment {
    background: linear-gradient(135deg, #fdf8f0 0%, #fff 100%);
    border-color: rgba($accent, 0.1);
  }
}

// ── Fields ────────────────────────────────────────────────────
.co-fields {
  display: flex;
  flex-direction: column;
  gap: 1rem;

  &--row {
    @media (min-width: 480px) {
      flex-direction: row;
      gap: 0.875rem;

      >.co-field {
        flex: 1;
      }
    }
  }
}

.co-field {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;

  &__label {
    font-size: 0.8rem;
    font-weight: 600;
    color: #555;
    display: flex;
    align-items: center;
    gap: 0.3rem;
  }

  &__req {
    color: #e53e3e;
    font-size: 0.9em;
  }

  &__optional {
    font-size: 0.72rem;
    color: #bbb;
    font-weight: 400;
  }

  &__input {
    position: relative;
    display: flex;
    align-items: center;

    >i {
      position: absolute;
      left: 0.875rem;
      font-size: 0.75rem;
      color: #ccc;
      pointer-events: none;
      z-index: 1;
    }

    input {
      width: 100%;
      // 44px is the smallest comfortable touch target; the old 40px missed it.
      min-height: 44px;
      padding: 0.7rem 0.875rem 0.7rem 2.375rem;
      border: 1.5px solid #e5e5e5;
      border-radius: 0.75rem;
      // Below 16px iOS Safari zooms the whole page on focus.
      font-size: 1rem;
      outline: none;
      background: #fff;
      color: $accent;
      transition: border-color 0.18s, box-shadow 0.18s;
      box-sizing: border-box;

      @include respond-to('sm') {
        font-size: 0.9rem;
      }

      &::placeholder {
        color: #ccc;
      }

      &:focus {
        border-color: $accent;
        box-shadow: 0 0 0 3px rgba($accent, 0.08);
      }
    }

    &--err input {
      border-color: #e53e3e;
      background: #fff8f8;

      &:focus {
        box-shadow: 0 0 0 3px rgba(229, 62, 62, 0.08);
      }
    }
  }

  &__err {
    font-size: 0.74rem;
    color: #e53e3e;
    display: flex;
    align-items: center;
    gap: 0.25rem;

    i {
      font-size: 0.65rem;
    }
  }

  &__hint-text {
    font-size: 0.74rem;
    color: #aaa;
    display: flex;
    align-items: center;
    gap: 0.3rem;

    i {
      font-size: 0.65rem;
    }
  }
}

// ── Payment section internals ─────────────────────────────────
// ── Factura ───────────────────────────────────────────────────────────────────
// ── Delivery method selector ──────────────────────────────────
.co-delivery-method {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
  margin-bottom: 0.25rem;

  &__btn {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.875rem 1rem;
    border-radius: 0.875rem;
    border: 2px solid #e8e5e0;
    background: #fafafa;
    cursor: pointer;
    text-align: left;
    transition: border-color 0.15s, background 0.15s, box-shadow 0.15s;

    >i {
      font-size: 1.1rem;
      color: #bbb;
      flex-shrink: 0;
      transition: color 0.15s;
    }

    div {
      display: flex;
      flex-direction: column;
      gap: 0.1rem;
      min-width: 0;

      strong {
        font-size: 0.82rem;
        font-weight: 800;
        color: #444;
        line-height: 1.2;
      }

      span {
        font-size: 0.7rem;
        color: #aaa;
      }
    }

    &--active {
      border-color: $accent;
      background: rgba($accent, 0.04);
      box-shadow: 0 0 0 3px rgba($accent, 0.07);

      >i {
        color: $accent;
      }

      div strong {
        color: $accent;
      }
    }

    &:not(&--active):hover {
      border-color: #ccc;
      background: #f5f5f5;
    }
  }
}

// ── Scheduling block (between delivery method and address) ──────
.co-schedule {
  margin-top: 1.25rem;

  &__title {
    display: flex;
    align-items: center;
    gap: 0.45rem;
    margin-bottom: 0.7rem;
    font-family: $font-secondary;
    font-size: 0.95rem;
    font-weight: 700;
    color: $color-accent;

    i { color: $color-secondary; }
  }
}

.co-pickup-info {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 0.875rem 1rem;
  background: #f0fff4;
  border: 1.5px solid #9ae6b4;
  border-radius: 0.875rem;
  margin-top: 0.75rem;
  color: #276749;
  font-size: 0.85rem;

  >i {
    font-size: 1rem;
    flex-shrink: 0;
    margin-top: 0.1rem;
    color: #38a169;
  }

  div {
    display: flex;
    flex-direction: column;
    gap: 0.1rem;

    strong {
      font-weight: 800;
    }

    span {
      font-size: 0.78rem;
      opacity: 0.8;
    }
  }
}

.co-factura-toggle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 1rem 1.125rem;
  border-radius: 0.875rem;
  border: 1.5px solid #e2d8cc;
  background: #fdfaf5;
  cursor: pointer;
  margin-top: 1.25rem;
  user-select: none;
  transition: border-color 0.15s;

  &:hover {
    border-color: #b7896a;
  }

  &__text {
    display: flex;
    align-items: center;
    gap: 0.75rem;

    i {
      font-size: 1.1rem;
      color: #8b6343;
      opacity: 0.8;
    }
  }

  &__label {
    display: block;
    font-size: 0.9rem;
    font-weight: 700;
    color: #333;
  }

  &__sub {
    display: block;
    font-size: 0.75rem;
    color: #999;
    margin-top: 0.1rem;
  }

  &__switch {
    width: 42px;
    height: 24px;
    border-radius: 999px;
    background: #ddd;
    position: relative;
    flex-shrink: 0;
    transition: background 0.2s;

    &--on {
      background: #2f855a;
    }
  }

  &__thumb {
    position: absolute;
    top: 3px;
    left: 3px;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: #fff;
    transition: transform 0.2s;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);

    .co-factura-toggle__switch--on & {
      transform: translateX(18px);
    }
  }
}

.co-factura-fields {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1.125rem;
  background: #f7f9f7;
  border: 1.5px solid #9ae6b4;
  border-radius: 0.875rem;
  margin-top: 0.75rem;
}

.co-field__ok {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.75rem;
  font-weight: 600;
  color: #2f855a;
  margin-top: 0.3rem;
}

// Factura transition
.co-factura-enter-active,
.co-factura-leave-active {
  transition: opacity 0.2s, transform 0.2s;
}

.co-factura-enter-from,
.co-factura-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

.co-error {
  background: #fff5f5;
  border: 1px solid rgba(229, 62, 62, 0.3);
  color: #c53030;
  font-size: 0.82rem;
  font-weight: 600;
  padding: 0.75rem 1rem;
  border-radius: 0.75rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.co-nudge {
  background: #fffbeb;
  border: 1px solid rgba(236, 201, 75, 0.5);
  color: #92400e;
  font-size: 0.82rem;
  font-weight: 600;
  padding: 0.75rem 1rem;
  border-radius: 0.75rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.co-pay-options {
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
}

.co-pay-btn {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 0.875rem;
  padding: 1rem 1.25rem;
  border-radius: 1rem;
  border: none;
  cursor: pointer;
  transition: opacity 0.15s, transform 0.12s, box-shadow 0.15s;
  text-align: left;

  >i:first-child {
    font-size: 1.25rem;
    flex-shrink: 0;
  }

  span {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 0.1rem;

    strong {
      font-size: 0.95rem;
      font-weight: 800;
      line-height: 1.2;
    }

    small {
      font-size: 0.74rem;
      opacity: 0.75;
      font-weight: 500;
    }
  }

  &__total {
    font-size: 1rem;
    font-weight: 900;
    letter-spacing: -0.02em;
    flex-shrink: 0;
  }

  &:not(:disabled):hover {
    opacity: 0.9;
    transform: translateY(-1px);
    box-shadow: 0 6px 18px rgba(0, 0, 0, 0.12);
  }

  &:active {
    transform: translateY(0);
  }

  &--payphone {
    background: $accent;
    color: $gold;

    &:disabled {
      opacity: 0.35;
      cursor: not-allowed;
      transform: none;
    }
  }

  &--whatsapp {
    background: rgba(37, 211, 102, 0.06);
    border: 1.5px solid rgba(37, 211, 102, 0.3);
    color: #128c3e;

    >i {
      color: #25d366;
      font-size: 1.3rem;
    }
  }
}

.co-pay-divider {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.25rem 0;

  &::before,
  &::after {
    content: '';
    flex: 1;
    height: 1px;
    background: #e8e5e0;
  }

  span {
    font-size: 0.75rem;
    color: #bbb;
    font-weight: 600;
    white-space: nowrap;
  }
}

// ── Scheduled orders are card-only: WhatsApp is visibly locked ──
.co-pay-btn--blocked {
  opacity: 0.45;
  cursor: not-allowed;
  filter: grayscale(0.8);

  &:hover {
    transform: none;
    box-shadow: none;
  }
}

.co-pay-locked {
  display: flex;
  align-items: flex-start;
  gap: 0.65rem;
  margin-top: 0.65rem;
  padding: 0.75rem 0.9rem;
  border-radius: 0.75rem;
  background: rgba($color-primary, 0.25);
  border: 1px solid rgba($color-secondary, 0.35);

  > i {
    margin-top: 0.15rem;
    color: $color-secondary;
    font-size: 0.9rem;
  }

  div {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
  }

  strong {
    font-size: 0.82rem;
    font-weight: 800;
    color: $color-accent;
  }

  span {
    font-size: 0.78rem;
    line-height: 1.5;
    color: rgba($color-accent, 0.75);
  }

  &__link {
    padding: 0;
    border: none;
    background: none;
    font: inherit;
    font-weight: 700;
    color: $color-secondary;
    text-decoration: underline;
    cursor: pointer;
  }
}

.co-secure-note {
  margin-top: 1rem;
  text-align: center;
  font-size: 0.75rem;
  color: #bbb;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;

  i {
    color: #38a169;
    font-size: 0.78rem;
  }
}

// ── Delivery cost preview (below mapsUrl field) ───────────────
.co-delivery-preview {
  display: flex;
  align-items: flex-start;
  gap: 0.6rem;
  padding: 0.75rem 0.875rem;
  border-radius: 0.75rem;
  margin-top: 0.5rem;
  font-size: 0.82rem;

  >i {
    font-size: 0.9rem;
    flex-shrink: 0;
    margin-top: 0.1rem;
  }

  &__body {
    display: flex;
    flex-direction: column;
    gap: 0.1rem;

    strong {
      font-weight: 800;
      line-height: 1.2;
    }

    span {
      font-size: 0.75rem;
      opacity: 0.75;
    }
  }

  &--loading {
    background: #f7f8ff;
    border: 1.5px solid #bee3f8;
    color: #2b6cb0;

    >i {
      color: #3182ce;
    }
  }

  &--ok {
    background: #f0fff4;
    border: 1.5px solid #9ae6b4;
    color: #276749;

    >i {
      color: #38a169;
    }
  }

  &--warn {
    background: #fffbeb;
    border: 1.5px solid #fbd38d;
    color: #92400e;

    >i {
      color: #dd6b20;
    }
  }
}

.co-delivery-enter-active,
.co-delivery-leave-active {
  transition: opacity 0.2s, transform 0.2s;
}

.co-delivery-enter-from,
.co-delivery-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

// ── Summary sidebar ───────────────────────────────────────────
.co-summary {
  @media (min-width: 900px) {
    width: 340px;
    flex-shrink: 0;
    position: sticky;
    top: 80px;
  }

  &__inner {
    background: #fff;
    border-radius: 1.25rem;
    padding: 1.375rem;
    border: 1px solid rgba(0, 0, 0, 0.06);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  }

  &__title {
    font-size: 0.875rem;
    font-weight: 800;
    color: $accent;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    display: flex;
    align-items: center;
    gap: 0.4rem;
    margin: 0 0 1rem;

    i {
      font-size: 0.8rem;
      color: rgba($accent, 0.5);
    }
  }

  &__list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0;
    border-top: 1px solid #f0ede8;
  }

  &__item {
    border-bottom: 1px solid #f0ede8;
  }

  &__item-body {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 0.75rem;
    padding: 0.75rem 0;
  }

  &__item-info {
    display: flex;
    align-items: flex-start;
    gap: 0.5rem;
    flex: 1;
    min-width: 0;
  }

  &__item-qty {
    font-size: 0.8rem;
    font-weight: 800;
    color: rgba($accent, 0.45);
    flex-shrink: 0;
    margin-top: 0.1rem;
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

  &__item-price {
    font-size: 0.875rem;
    font-weight: 800;
    color: $accent;
    flex-shrink: 0;
    white-space: nowrap;
  }

  &__schedule {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    margin-top: 0.85rem;
    padding: 0.6rem 0.8rem;
    border-radius: $border-radius-md;
    background: rgba($color-primary, 0.28);

    > i {
      color: $color-secondary;
      font-size: 0.95rem;
    }

    div {
      display: flex;
      flex-direction: column;
      line-height: 1.3;
    }

    strong {
      font-size: 0.8rem;
      font-weight: 700;
      color: $color-accent;
    }

    span {
      font-size: 0.78rem;
      color: rgba($color-accent, 0.7);
      text-transform: capitalize;
    }
  }

  &__totals {
    padding: 1rem 0 0;
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }

  &__row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 0.82rem;
    color: #888;
    font-weight: 500;

    i {
      font-size: 0.7rem;
      margin-right: 0.2rem;
    }

    &--delivery {
      color: #276749;
      font-weight: 600;
      background: #f0fff4;
      padding: 0.3rem 0.5rem;
      border-radius: 0.5rem;
      margin: 0 -0.5rem;
    }

    &--delivery-pending {
      font-style: italic;
      color: #bbb;
    }

    &--total {
      padding-top: 0.625rem;
      border-top: 2px solid #f0ede8;
      margin-top: 0.25rem;
      font-size: 1rem;
      color: $accent;
      font-weight: 700;

      strong {
        font-size: 1.25rem;
        font-weight: 900;
        letter-spacing: -0.02em;
      }
    }
  }

  &__edit {
    margin-top: 1rem;
    width: 100%;
    min-height: 44px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.4rem;
    padding: 0.625rem 1rem;
    border: 1.5px solid #e8e4dc;
    border-radius: 0.75rem;
    background: none;
    color: #aaa;
    font-size: 0.8rem;
    font-weight: 600;
    cursor: pointer;
    transition: color 0.12s, border-color 0.12s, background 0.12s;

    i {
      font-size: 0.72rem;
    }

    &:hover {
      color: $accent;
      border-color: $accent;
      background: rgba($accent, 0.03);
    }
  }
}

// ── Flavor alert ──────────────────────────────────────────────
.co-flavor-alert {
  background: #fffbeb;
  border: 2px solid #f6ad55;
  border-radius: 1.125rem;
  padding: 1.125rem 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.875rem;

  &__head {
    display: flex;
    align-items: flex-start;
    gap: 0.75rem;

    >i {
      font-size: 1.1rem;
      color: #dd6b20;
      margin-top: 0.1rem;
      flex-shrink: 0;
    }
  }

  &__title {
    font-size: 0.95rem;
    font-weight: 800;
    color: #7b341e;
    margin: 0 0 0.15rem;
  }

  &__sub {
    font-size: 0.8rem;
    color: #9c4221;
    margin: 0;
    line-height: 1.4;
  }

  &__list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  &__item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    padding: 0.75rem 1rem;
    background: #fff;
    border-radius: 0.75rem;
    border: 1.5px solid #fbd38d;
  }

  &__item-info {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex: 1;
    min-width: 0;

    i {
      font-size: 0.85rem;
      color: #dd6b20;
      flex-shrink: 0;
    }

    span {
      font-size: 0.875rem;
      font-weight: 700;
      color: #7b341e;
    }
  }

  &__badge {
    font-size: 0.68rem !important;
    font-weight: 700 !important;
    background: #fed7aa;
    color: #c05621 !important;
    padding: 0.15rem 0.5rem;
    border-radius: 999px;
    flex-shrink: 0;
  }

  &__btn {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    background: #572612;
    color: #FED47F;
    border: none;
    border-radius: 0.625rem;
    padding: 0.55rem 1rem;
    font-size: 0.82rem;
    font-weight: 800;
    cursor: pointer;
    white-space: nowrap;
    flex-shrink: 0;
    transition: opacity 0.15s, transform 0.1s;

    i {
      font-size: 0.75rem;
    }

    &:hover {
      opacity: 0.88;
      transform: translateY(-1px);
    }
  }
}
</style>
