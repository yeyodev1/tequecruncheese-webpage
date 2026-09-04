<script setup lang="ts">
import { computed, defineAsyncComponent, ref } from 'vue'
import { useCartStore } from '@/stores/cart'
import type { ScheduleConfig } from '@/services/schedule.service'
import CheckoutSection from './CheckoutSection.vue'
import CheckoutField from './CheckoutField.vue'
import DeliveryMethodToggle from './DeliveryMethodToggle.vue'
import DeliveryCostPreview from './DeliveryCostPreview.vue'
import FacturaFields from './FacturaFields.vue'
// Leaflet and its CSS are a third of the checkout bundle, and most customers
// paste a link that resolves and never open a map. Loaded on the tap instead.
const LocationPicker = defineAsyncComponent(() => import('./LocationPicker.vue'))
import SchedulePicker from '@/components/tienda/SchedulePicker.vue'

const props = defineProps<{
  deliveryMethod: 'delivery' | 'pickup'
  scheduledFor: string | null
  scheduleConfig: ScheduleConfig
  touchedCalle: boolean
  calleValid: boolean
  // Delivery quote
  isResolvingUrl: boolean
  hasCoords: boolean
  outOfRange: boolean
  deliveryKm: number | null
  deliveryCost: number | null
  // Factura
  quiereFactura: boolean
  facturaEmail: string
  facturaRuc: string
  touchedFactura: { email: boolean; ruc: boolean }
  facturaEmailValid: boolean
  facturaRucValid: boolean
}>()

const emit = defineEmits<{
  'update:deliveryMethod': ['delivery' | 'pickup']
  'update:scheduledFor': [string | null]
  'update:quiereFactura': [boolean]
  'update:facturaEmail': [string]
  'update:facturaRuc': [string]
  touchCalle: []
  touchFactura: [field: 'email' | 'ruc']
}>()

const cart = useCartStore()

function setField(field: 'calle' | 'barrio' | 'referencia' | 'mapsUrl', value: string) {
  cart.setCustomerInfo({ [field]: value })
}

const pickerOpen = ref(false)

/**
 * The link was given a fair try and came back with nothing to charge for.
 * Only then does the map stop being an alternative and become the way out —
 * offering it while a perfectly good link is still resolving would just be
 * noise.
 */
const linkFailed = computed(
  () => !!cart.customerInfo.mapsUrl?.trim() && !props.isResolvingUrl && !props.hasCoords,
)

/** A point the customer already picked, so the map reopens where they left it. */
const pickedPoint = computed(() => {
  const match = (cart.customerInfo.mapsUrl ?? '').match(
    /^\s*(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)\s*$/,
  )
  return match ? { lat: parseFloat(match[1]!), lng: parseFloat(match[2]!) } : null
})

/**
 * Stored as bare "lat,lng" in the same field a pasted link uses. The backend
 * already reads that form and prices it, so a picked point and a working link
 * travel the identical path — no second code path to keep in step.
 */
function onPicked(coords: { lat: number; lng: number }) {
  setField('mapsUrl', `${coords.lat.toFixed(6)},${coords.lng.toFixed(6)}`)
  pickerOpen.value = false
}
</script>

<template>
  <CheckoutSection num="2" title="Método de entrega" hint="¿Cómo recibes tu pedido?">
    <DeliveryMethodToggle
      :model-value="deliveryMethod"
      @update:model-value="emit('update:deliveryMethod', $event)"
    />

    <div class="co-schedule">
      <p class="co-schedule__title">
        <i class="fa-regular fa-clock"></i>
        ¿Cuándo lo quieres?
      </p>
      <SchedulePicker
        :model-value="scheduledFor"
        :config="scheduleConfig"
        :mode="deliveryMethod"
        @update:model-value="emit('update:scheduledFor', $event)"
      />
    </div>

    <div v-if="deliveryMethod !== 'pickup'" class="co-fields co-fields--spaced">
      <CheckoutField
        label="Calle / Dirección"
        icon="fa-solid fa-road"
        placeholder="Av. 9 de Octubre y García Moreno"
        autocomplete="street-address"
        required
        :model-value="cart.customerInfo.calle"
        :invalid="touchedCalle && !calleValid"
        error="Ingresa tu dirección completa."
        @update:model-value="setField('calle', $event)"
        @blur="emit('touchCalle')"
      />

      <div class="co-fields co-fields--row">
        <CheckoutField
          label="Barrio / Sector"
          icon="fa-solid fa-map"
          placeholder="Urdesa Central"
          :model-value="cart.customerInfo.barrio ?? ''"
          @update:model-value="setField('barrio', $event)"
        />
        <CheckoutField
          label="Referencia"
          icon="fa-solid fa-signs-post"
          placeholder="Frente al parque"
          :model-value="cart.customerInfo.referencia ?? ''"
          @update:model-value="setField('referencia', $event)"
        />
      </div>

      <CheckoutField
        label="Tu ubicación"
        icon="fa-solid fa-map-pin"
        required
        placeholder="Pega tu link de Google Maps, o marca el mapa abajo"
        hint="Sin ubicación no podemos calcular el envío. Vale un link de Maps, un Plus Code, o marcarla en el mapa."
        :model-value="cart.customerInfo.mapsUrl ?? ''"
        @update:model-value="setField('mapsUrl', $event)"
      >
        <DeliveryCostPreview
          :show="!!cart.customerInfo.mapsUrl"
          :is-resolving="isResolvingUrl"
          :has-coords="hasCoords"
          :out-of-range="outOfRange"
          :km="deliveryKm"
          :cost="deliveryCost"
        />

        <button
          type="button"
          class="co-pickmap"
          :class="{ 'co-pickmap--rescue': linkFailed }"
          @click="pickerOpen = true"
        >
          <i class="fa-solid fa-map-location-dot"></i>
          <span class="co-pickmap__body">
            <strong v-if="linkFailed">Mejor márcala en el mapa 👇</strong>
            <strong v-else-if="pickedPoint">Ubicación marcada · tocar para ajustar</strong>
            <strong v-else>O marca tu ubicación en el mapa</strong>
            <small v-if="linkFailed">Con ese link no dimos con el punto exacto</small>
            <small v-else-if="pickedPoint">Toca el mapa si quieres ajustarlo unos metros</small>
            <small v-else>Rápido y sin pegar links</small>
          </span>
          <i class="fa-solid fa-chevron-right co-pickmap__go"></i>
        </button>
      </CheckoutField>
    </div>

    <LocationPicker
      v-if="pickerOpen"
      :open="pickerOpen"
      :initial="pickedPoint"
      @close="pickerOpen = false"
      @confirm="onPicked"
    />

    <FacturaFields
      :quiere="quiereFactura"
      :email="facturaEmail"
      :ruc="facturaRuc"
      :touched="touchedFactura"
      :email-valid="facturaEmailValid"
      :ruc-valid="facturaRucValid"
      @update:quiere="emit('update:quiereFactura', $event)"
      @update:email="emit('update:facturaEmail', $event)"
      @update:ruc="emit('update:facturaRuc', $event)"
      @touch="emit('touchFactura', $event)"
    />
  </CheckoutSection>
</template>

<style scoped lang="scss">
@use '@/styles/checkout-field' as *;
@include checkout-fields-layout;

.co-fields--spaced {
  margin-top: 1.25rem;
}

.co-pickmap {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 0.65rem;
  margin-top: 0.5rem;
  padding: 0.7rem 0.85rem;
  border: 1.5px dashed rgba($color-accent, 0.28);
  border-radius: $border-radius-md;
  background: rgba($color-primary, 0.14);
  color: $color-accent;
  text-align: left;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;

  &:hover {
    background: rgba($color-primary, 0.28);
    border-color: rgba($color-accent, 0.45);
  }

  > i:first-child {
    font-size: 1.05rem;
    color: $color-secondary;
    flex-shrink: 0;
  }

  &__body {
    display: flex;
    flex-direction: column;
    gap: 0.1rem;
    min-width: 0;
    flex: 1;

    strong { font-size: 0.85rem; font-weight: 800; line-height: 1.25; }
    small { font-size: 0.73rem; opacity: 0.72; }
  }

  &__go {
    font-size: 0.8rem;
    opacity: 0.5;
    flex-shrink: 0;
  }

  // After a link the customer cannot fix, this stops being an alternative and
  // becomes the way forward — so it stops looking optional.
  &--rescue {
    border-style: solid;
    border-color: rgba($alert-warning, 0.55);
    background: $alert-warning-bg;

    strong { color: #92400e; }
    > i:first-child { color: $alert-warning; }
  }
}

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
</style>
