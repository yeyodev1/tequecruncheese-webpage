<script setup lang="ts">
import { useCartStore } from '@/stores/cart'
import CheckoutSection from './CheckoutSection.vue'
import CheckoutField from './CheckoutField.vue'

defineProps<{
  touched: Record<string, boolean>
  nombreValid: boolean
  cedulaValid: boolean
  emailValid: boolean
  telefonoValid: boolean
}>()

const emit = defineEmits<{ blur: [field: string] }>()

const cart = useCartStore()

function setField(field: 'nombre' | 'cedula' | 'email' | 'telefono', value: string) {
  cart.setCustomerInfo({ [field]: value })
  if (field === 'email') cart.setEmail(value)
}
</script>

<template>
  <CheckoutSection num="1" title="Datos personales" hint="Para confirmar y enviarte el tracking">
    <div class="co-fields">
      <CheckoutField
        label="Nombre completo"
        icon="fa-regular fa-address-card"
        placeholder="Juan Pérez"
        autocomplete="name"
        required
        :model-value="cart.customerInfo.nombre"
        :invalid="touched.nombre && !nombreValid"
        error="Ingresa tu nombre completo."
        @update:model-value="setField('nombre', $event)"
        @blur="emit('blur', 'nombre')"
      />

      <CheckoutField
        label="Cédula de identidad"
        icon="fa-solid fa-id-card"
        placeholder="0912345678"
        inputmode="numeric"
        :maxlength="10"
        required
        :model-value="cart.customerInfo.cedula"
        :invalid="touched.cedula && !cedulaValid"
        error="Cédula ecuatoriana inválida (10 dígitos)."
        @update:model-value="setField('cedula', $event)"
        @blur="emit('blur', 'cedula')"
      />

      <CheckoutField
        label="Correo electrónico"
        icon="fa-regular fa-envelope"
        type="email"
        placeholder="tu@correo.com"
        autocomplete="email"
        inputmode="email"
        required
        :model-value="cart.customerInfo.email"
        :invalid="touched.email && !emailValid"
        error="Ingresa un correo válido."
        @update:model-value="setField('email', $event)"
        @blur="emit('blur', 'email')"
      />

      <CheckoutField
        label="Teléfono"
        icon="fa-solid fa-phone"
        type="tel"
        placeholder="0991234567"
        autocomplete="tel"
        inputmode="tel"
        :maxlength="10"
        required
        :model-value="cart.customerInfo.telefono"
        :invalid="touched.telefono && !telefonoValid"
        error="Número inválido (09... o 02..., 10 dígitos)."
        @update:model-value="setField('telefono', $event)"
        @blur="emit('blur', 'telefono')"
      />
    </div>
  </CheckoutSection>
</template>

<style scoped lang="scss">
@use '@/styles/checkout-field' as *;
@include checkout-fields-layout;
</style>
