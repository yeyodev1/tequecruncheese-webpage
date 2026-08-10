<script setup lang="ts">
import CheckoutField from './CheckoutField.vue'

const props = defineProps<{
  quiere: boolean
  email: string
  ruc: string
  touched: { email: boolean; ruc: boolean }
  emailValid: boolean
  rucValid: boolean
}>()

const emit = defineEmits<{
  'update:quiere': [boolean]
  'update:email': [string]
  'update:ruc': [string]
  touch: [field: 'email' | 'ruc']
}>()

/** Digits only: the field accepts a 10-digit cédula or a 13-digit RUC. */
function onRuc(value: string) {
  emit('update:ruc', value.replace(/\D/g, ''))
}
</script>

<template>
  <div>
    <div class="co-factura-toggle" @click="emit('update:quiere', !props.quiere)">
      <div class="co-factura-toggle__text">
        <i class="fa-solid fa-file-invoice"></i>
        <div>
          <span class="co-factura-toggle__label">¿Necesitas factura?</span>
          <span class="co-factura-toggle__sub">Pediremos tu correo y RUC / cédula</span>
        </div>
      </div>
      <div :class="['co-factura-toggle__switch', { 'co-factura-toggle__switch--on': quiere }]">
        <span class="co-factura-toggle__thumb"></span>
      </div>
    </div>

    <Transition name="co-factura">
      <div v-if="quiere" class="co-factura-fields">
        <CheckoutField
          label="Correo para la factura"
          icon="fa-solid fa-envelope"
          type="email"
          placeholder="factura@correo.com"
          autocomplete="email"
          required
          :model-value="email"
          :invalid="touched.email && !emailValid"
          error="Ingresa un correo válido"
          @update:model-value="emit('update:email', $event)"
          @blur="emit('touch', 'email')"
        />

        <CheckoutField
          label="RUC o Cédula"
          icon="fa-solid fa-id-card"
          placeholder="10 dígitos (cédula) o 13 dígitos (RUC)"
          inputmode="numeric"
          :maxlength="13"
          required
          :model-value="ruc"
          :invalid="touched.ruc && !rucValid"
          error="Debe tener exactamente 10 dígitos (cédula) o 13 dígitos (RUC)"
          @update:model-value="onRuc"
          @blur="emit('touch', 'ruc')"
        >
          <span v-if="ruc.length > 0 && rucValid" class="co-field__ok">
            <i class="fa-solid fa-circle-check"></i>
            {{ ruc.length === 13 ? 'RUC válido' : 'Cédula válida' }}
          </span>
        </CheckoutField>
      </div>
    </Transition>
  </div>
</template>

<style scoped lang="scss">
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

  &:hover { border-color: #b7896a; }

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

    &--on { background: #2f855a; }
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

// `:deep` because the badge is slotted into CheckoutField's scope.
:deep(.co-field__ok) {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.75rem;
  font-weight: 600;
  color: #2f855a;
  margin-top: 0.3rem;
}

.co-factura-enter-active,
.co-factura-leave-active {
  transition: opacity 0.2s, transform 0.2s;
}

.co-factura-enter-from,
.co-factura-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}
</style>
