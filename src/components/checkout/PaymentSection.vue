<script setup lang="ts">
import CheckoutSection from './CheckoutSection.vue'

defineProps<{
  errorMsg: string
  showNudge: boolean
  loading: boolean
  isResolvingUrl: boolean
  allFlavorsConfigured: boolean
  formValid: boolean
  missingFieldsLabel: string
  grandTotal: number
  scheduledFor: string | null
  scheduledLabel: string
  /** Outside opening hours: every channel closes, not just the card button. */
  storeClosed: boolean
  closedMessage: string
  /** Delivery order whose shipping fee could not be computed. */
  deliveryUnresolved: boolean
  /** Located but outside the delivery radius — WhatsApp is the way out. */
  deliveryTooFar: boolean
  deliveryBlockMessage: string
}>()

const emit = defineEmits<{
  checkout: []
  whatsapp: []
  clearSchedule: []
}>()
</script>

<template>
  <CheckoutSection num="3" title="Pago" hint="Elige cómo quieres pagar" variant="payment">
    <div v-if="errorMsg" class="co-error">
      <i class="fa-solid fa-circle-exclamation"></i>
      {{ errorMsg }}
    </div>

    <div v-if="showNudge" class="co-nudge">
      <i class="fa-solid fa-triangle-exclamation"></i>
      Completa los campos requeridos para continuar.
    </div>

    <div class="co-pay-options">
      <button
        class="co-pay-btn co-pay-btn--payphone"
        :disabled="storeClosed || deliveryUnresolved || !formValid || loading || !allFlavorsConfigured || isResolvingUrl"
        @click="emit('checkout')"
      >
        <!-- Closed outranks every other state: no point naming a missing field
             when the order cannot be placed at this hour regardless. -->
        <template v-if="storeClosed">
          <i class="fa-solid fa-moon"></i>
          <span>
            <strong>Cerrado por hoy</strong>
            <small>{{ closedMessage }}</small>
          </span>
        </template>
        <!-- No shipping fee means no total, so there is nothing to charge yet. -->
        <template v-else-if="deliveryUnresolved">
          <i class="fa-solid fa-location-dot"></i>
          <span>
            <strong>{{ deliveryTooFar ? 'Fuera de nuestra zona' : 'Falta tu ubicación' }}</strong>
            <small>{{ deliveryBlockMessage }}</small>
          </span>
        </template>
        <template v-else-if="loading">
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
        <span v-if="storeClosed">fuera de horario</span>
        <span v-else-if="deliveryTooFar">coordinamos tu envío</span>
        <span v-else>{{ scheduledFor ? 'no disponible al programar' : 'o también puedes' }}</span>
      </div>

      <!-- WhatsApp — blocked for scheduled orders, which must be prepaid,
           and after hours, when there is nobody to answer it either. -->
      <button
        class="co-pay-btn co-pay-btn--whatsapp"
        :class="{ 'co-pay-btn--blocked': scheduledFor || storeClosed }"
        :disabled="!!scheduledFor || storeClosed"
        @click="emit('whatsapp')"
      >
        <i class="fa-brands fa-whatsapp"></i>
        <span>
          <strong>Continuar por WhatsApp</strong>
          <small v-if="storeClosed">Volvemos a atender mañana</small>
          <small v-else-if="scheduledFor">Los pedidos programados se pagan con tarjeta</small>
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
            <button type="button" class="co-pay-locked__link" @click="emit('clearSchedule')">
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
  </CheckoutSection>
</template>

<style scoped lang="scss">
$accent: #572612;
$gold: #fed47f;

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

  > i:first-child {
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

  &:active { transform: translateY(0); }

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

    > i {
      color: #25d366;
      font-size: 1.3rem;
    }
  }

  // Scheduled orders are card-only: WhatsApp is visibly locked.
  &--blocked {
    opacity: 0.45;
    cursor: not-allowed;
    filter: grayscale(0.8);

    &:hover {
      transform: none;
      box-shadow: none;
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
</style>
