<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, RouterLink } from 'vue-router'
import { paymentService } from '@/services/payment.service'
import type { TrackOrderResponse } from '@/types'

const route = useRoute()

const pageStatus = ref<'loading' | 'found' | 'not-found'>('loading')
const order = ref<TrackOrderResponse | null>(null)

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pago pendiente',
  approved: 'Pago confirmado',
  preparing: 'En preparación',
  ready: 'Listo para entrega',
  delivered: '¡Entregado!',
  rejected: 'Pago rechazado',
  cancelled: 'Cancelado',
}

// Only show pipeline for successful orders
const PIPELINE = [
  { key: 'approved', label: 'Pago confirmado', icon: 'fa-credit-card' },
  { key: 'preparing', label: 'Preparando', icon: 'fa-fire-burner' },
  { key: 'ready', label: 'Listo', icon: 'fa-box-open' },
  { key: 'delivered', label: 'Entregado', icon: 'fa-truck' },
]

const PIPELINE_ORDER = ['approved', 'preparing', 'ready', 'delivered']

const currentPipelineIndex = computed(() => {
  if (!order.value) return -1
  return PIPELINE_ORDER.indexOf(order.value.status)
})

const isSuccessFlow = computed(() =>
  order.value ? PIPELINE_ORDER.includes(order.value.status) : false,
)

function stepState(stepKey: string): 'done' | 'active' | 'pending' {
  const stepIdx = PIPELINE_ORDER.indexOf(stepKey)
  const curr = currentPipelineIndex.value
  if (stepIdx < curr) return 'done'
  if (stepIdx === curr) return 'active'
  return 'pending'
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('es-EC', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

onMounted(async () => {
  const token = route.params.token as string
  if (!token) {
    pageStatus.value = 'not-found'
    return
  }
  try {
    order.value = await paymentService.trackOrder(token)
    pageStatus.value = 'found'
  } catch {
    pageStatus.value = 'not-found'
  }
})
</script>

<template>
  <div class="track-order">
    <div class="track-order__card">

      <!-- Loading -->
      <div v-if="pageStatus === 'loading'" class="track-order__state">
        <i class="fa-solid fa-spinner fa-spin track-order__icon track-order__icon--loading"></i>
        <h2>Buscando tu pedido...</h2>
      </div>

      <!-- Not found -->
      <div v-else-if="pageStatus === 'not-found'" class="track-order__state">
        <i class="fa-solid fa-triangle-exclamation track-order__icon track-order__icon--warning"></i>
        <h2>Pedido no encontrado</h2>
        <p>El enlace puede ser incorrecto o el pedido ya no está disponible.</p>
        <RouterLink to="/tienda" class="btn btn--primary track-order__btn">
          Ir a la Tienda
        </RouterLink>
      </div>

      <!-- Found -->
      <div v-else-if="pageStatus === 'found' && order" class="track-order__content">
        <div class="track-order__header-info">
          <h2>Estado de tu pedido</h2>
          <p class="track-order__date">{{ formatDate(order.createdAt) }}</p>
        </div>

        <!-- Pipeline (success flow) -->
        <div v-if="isSuccessFlow" class="track-order__pipeline">
          <div
            v-for="(step, i) in PIPELINE"
            :key="step.key"
            class="track-order__step"
            :class="`track-order__step--${stepState(step.key)}`"
          >
            <div class="track-order__step-icon">
              <i class="fa-solid" :class="stepState(step.key) === 'done' ? 'fa-check' : step.icon"></i>
            </div>
            <span class="track-order__step-label">{{ step.label }}</span>
            <div v-if="i < PIPELINE.length - 1" class="track-order__step-connector"></div>
          </div>
        </div>

        <!-- Rejected / Cancelled badge -->
        <div
          v-else
          class="track-order__status-badge"
          :class="`track-order__status-badge--${order.status}`"
        >
          <i class="fa-solid fa-circle-xmark"></i>
          {{ STATUS_LABELS[order.status] ?? order.status }}
        </div>

        <!-- Items table -->
        <table class="track-order__items">
          <thead>
            <tr>
              <th>Producto</th>
              <th class="track-order__center">Cant.</th>
              <th class="track-order__right">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in order.items" :key="item.slug">
              <td>{{ item.nombre }}</td>
              <td class="track-order__center">{{ item.cantidad }}</td>
              <td class="track-order__right">${{ (item.precio * item.cantidad).toFixed(2) }}</td>
            </tr>
          </tbody>
        </table>

        <div class="track-order__total">
          <span>Total</span>
          <strong>${{ order.total.toFixed(2) }}</strong>
        </div>

        <RouterLink to="/tienda" class="btn btn--primary track-order__btn">
          Volver a la Tienda
        </RouterLink>
      </div>

    </div>
  </div>
</template>

<style lang="scss" scoped>
.track-order {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: lighten(#fed47f, 35%);
  padding: 2rem $spacing-sm;

  &__card {
    background: $white;
    border-radius: 1.5rem;
    padding: 2.5rem 2rem;
    max-width: 520px;
    width: 100%;
    box-shadow: 0 8px 40px rgba(0, 0, 0, 0.1);
  }

  &__state {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
    text-align: center;

    h2 {
      font-size: 1.5rem;
      font-weight: 800;
      color: $color-accent;
      margin: 0;
    }

    p {
      color: #555;
      margin: 0;
    }
  }

  &__icon {
    font-size: 3.5rem;

    &--loading { color: $color-primary; }
    &--warning  { color: #d69e2e; }
  }

  &__content {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
  }

  &__header-info {
    h2 {
      font-size: 1.5rem;
      font-weight: 800;
      color: $color-accent;
      margin: 0 0 0.25rem;
    }
  }

  &__date {
    font-size: 0.85rem;
    color: #888;
    margin: 0;
  }

  &__status-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    border-radius: 2rem;
    font-size: 0.95rem;
    font-weight: 700;
    width: fit-content;

    &--pending    { background: #fefcbf; color: #744210; }
    &--approved   { background: #c6f6d5; color: #22543d; }
    &--rejected,
    &--cancelled  { background: #fed7d7; color: #742a2a; }
  }

  &__items {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.9rem;

    thead tr {
      background: $color-primary;
    }

    th {
      padding: 8px 10px;
      text-align: left;
      font-size: 0.8rem;
      color: $color-accent;
      font-weight: 700;
    }

    td {
      padding: 8px 10px;
      border-bottom: 1px solid #f0f0f0;
      color: #333;
    }
  }

  // Pipeline
  &__pipeline {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    position: relative;
    padding: 0.5rem 0;
  }

  &__step {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    flex: 1;
    position: relative;
    z-index: 1;

    &--done &-icon  { background: #38a169; color: $white; }
    &--active &-icon { background: $color-accent; color: $color-primary; box-shadow: 0 0 0 4px lighten(#fed47f, 20%); }
    &--pending &-icon { background: #e8e8e8; color: #aaa; }
  }

  &__step-icon {
    width: 2.5rem;
    height: 2.5rem;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.9rem;
    transition: background 0.3s;
  }

  &__step-label {
    font-size: 0.72rem;
    font-weight: 600;
    text-align: center;
    color: #555;
    line-height: 1.3;
  }

  &__step-connector {
    position: absolute;
    top: 1.25rem;
    left: 60%;
    right: -40%;
    height: 2px;
    background: #e0e0e0;
    z-index: 0;
  }

  &__step--done ~ &__step .track-order__step-connector,
  &__step--done &__step-connector {
    background: #38a169;
  }

  &__center { text-align: center; }
  &__right  { text-align: right; }

  &__total {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 1rem;
    padding-top: 0.5rem;
    border-top: 2px solid #f0f0f0;

    strong {
      font-size: 1.3rem;
      color: $color-accent;
    }
  }

  &__btn {
    width: 100%;
    text-align: center;
    justify-content: center;
    padding: 0.875rem;
  }
}
</style>
