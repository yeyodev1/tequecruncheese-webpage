<script setup lang="ts">
import { useCartStore } from '@/stores/cart'
import type { ScheduleConfig } from '@/services/schedule.service'
import CheckoutSection from './CheckoutSection.vue'
import CheckoutField from './CheckoutField.vue'
import DeliveryMethodToggle from './DeliveryMethodToggle.vue'
import DeliveryCostPreview from './DeliveryCostPreview.vue'
import FacturaFields from './FacturaFields.vue'
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
        label="Link de Google Maps"
        icon="fa-solid fa-map-pin"
        optional="(opcional · calcula tu envío)"
        placeholder="Pega aquí tu link o ubicación de Google Maps"
        hint="Pega cualquier link de Google Maps, ubicación compartida o dirección aproximada"
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
      </CheckoutField>
    </div>

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
