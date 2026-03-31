<script setup lang="ts">
import { ref } from 'vue'
import { RouterLink } from 'vue-router'
import { paymentService } from '@/services/payment.service'
import type { TrackOrderResponse } from '@/types'

const email = ref('')
const loading = ref(false)
const searched = ref(false)
const orders = ref<TrackOrderResponse[]>([])
const error = ref('')

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  pending:   { label: 'Pago pendiente',  color: '#d69e2e', icon: 'fa-clock' },
  approved:  { label: 'Confirmado',      color: '#3182ce', icon: 'fa-credit-card' },
  preparing: { label: 'En preparación', color: '#dd6b20', icon: 'fa-fire-burner' },
  ready:     { label: 'Listo',           color: '#805ad5', icon: 'fa-box-open' },
  delivered: { label: 'Entregado',       color: '#38a169', icon: 'fa-truck' },
  rejected:  { label: 'Rechazado',       color: '#e53e3e', icon: 'fa-circle-xmark' },
  cancelled: { label: 'Cancelado',       color: '#a0aec0', icon: 'fa-ban' },
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-EC', {
    year: 'numeric', month: 'short', day: 'numeric',
  })
}

async function search() {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!re.test(email.value)) return
  loading.value = true
  error.value = ''
  searched.value = false
  try {
    orders.value = await paymentService.ordersByEmail(email.value)
    searched.value = true
  } catch {
    error.value = 'No pudimos buscar tus pedidos. Intenta de nuevo.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <section class="order-tracker" id="mis-pedidos">
    <div class="order-tracker__container">
      <div class="order-tracker__heading">
        <i class="fa-solid fa-magnifying-glass order-tracker__icon"></i>
        <h2>¿Dónde está mi pedido?</h2>
        <p>Ingresa el correo con el que realizaste tu compra para ver el estado de tus pedidos.</p>
      </div>

      <form class="order-tracker__form" @submit.prevent="search">
        <input
          v-model="email"
          type="email"
          class="order-tracker__input"
          placeholder="tu@correo.com"
          required
          autocomplete="email"
        />
        <button type="submit" class="order-tracker__btn" :disabled="loading">
          <i v-if="loading" class="fa-solid fa-spinner fa-spin"></i>
          <i v-else class="fa-solid fa-magnifying-glass"></i>
          {{ loading ? 'Buscando...' : 'Buscar' }}
        </button>
      </form>

      <p v-if="error" class="order-tracker__error">
        <i class="fa-solid fa-triangle-exclamation"></i> {{ error }}
      </p>

      <!-- Results -->
      <div v-if="searched && !loading" class="order-tracker__results">
        <div v-if="orders.length === 0" class="order-tracker__empty">
          <i class="fa-solid fa-inbox"></i>
          <p>No encontramos pedidos con ese correo.</p>
        </div>

        <div v-else class="order-tracker__list">
          <div
            v-for="order in orders"
            :key="order.trackingToken"
            class="order-tracker__card"
          >
            <div class="order-tracker__card-left">
              <div
                class="order-tracker__status-dot"
                :style="{ background: STATUS_CONFIG[order.status]?.color ?? '#ccc' }"
              ></div>
              <div>
                <p class="order-tracker__status-label">
                  <i
                    class="fa-solid"
                    :class="STATUS_CONFIG[order.status]?.icon"
                    :style="{ color: STATUS_CONFIG[order.status]?.color }"
                  ></i>
                  {{ STATUS_CONFIG[order.status]?.label ?? order.status }}
                </p>
                <p class="order-tracker__meta">
                  {{ formatDate(order.createdAt) }} · {{ order.items.length }} producto(s) ·
                  <strong>${{ order.total.toFixed(2) }}</strong>
                </p>
              </div>
            </div>
            <RouterLink
              v-if="order.trackingToken"
              :to="`/pedido/${order.trackingToken}`"
              class="order-tracker__cta"
            >
              Ver detalle <i class="fa-solid fa-arrow-right"></i>
            </RouterLink>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style lang="scss" scoped>
.order-tracker {
  background: $color-accent;
  padding: 4rem $spacing-sm;

  @include respond-to('md') {
    padding: 5rem $spacing-xl;
  }

  &__container {
    max-width: 640px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 1.75rem;
  }

  &__heading {
    text-align: center;
    color: $white;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.75rem;

    h2 {
      font-size: clamp(1.6rem, 4vw, 2.2rem);
      font-weight: 900;
      margin: 0;
      color: $color-primary;
    }

    p {
      font-size: 1rem;
      color: rgba(255, 255, 255, 0.75);
      margin: 0;
      max-width: 480px;
    }
  }

  &__icon {
    font-size: 2.5rem;
    color: $color-primary;
  }

  &__form {
    display: flex;
    gap: 0.625rem;
    background: rgba(255,255,255,0.08);
    border-radius: 1rem;
    padding: 0.5rem;
  }

  &__input {
    flex: 1;
    background: $white;
    border: none;
    border-radius: 0.625rem;
    padding: 0.75rem 1rem;
    font-size: 1rem;
    outline: none;
    color: #333;

    &::placeholder { color: #aaa; }
  }

  &__btn {
    background: $color-primary;
    color: $color-accent;
    border: none;
    border-radius: 0.625rem;
    padding: 0.75rem 1.25rem;
    font-size: 0.9rem;
    font-weight: 800;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 0.4rem;
    white-space: nowrap;
    transition: opacity 0.15s;

    &:disabled { opacity: 0.6; cursor: not-allowed; }
    &:not(:disabled):hover { opacity: 0.88; }
  }

  &__error {
    color: #fc8181;
    font-size: 0.875rem;
    display: flex;
    align-items: center;
    gap: 0.375rem;
    margin: 0;
  }

  &__results { display: flex; flex-direction: column; gap: 0.75rem; }

  &__empty {
    text-align: center;
    color: rgba(255,255,255,0.5);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;

    i { font-size: 2rem; }
    p { margin: 0; font-size: 0.9rem; }
  }

  &__list { display: flex; flex-direction: column; gap: 0.625rem; }

  &__card {
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255,255,255,0.15);
    border-radius: 0.875rem;
    padding: 1rem 1.25rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    backdrop-filter: blur(4px);
  }

  &__card-left {
    display: flex;
    align-items: center;
    gap: 0.875rem;
  }

  &__status-dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  &__status-label {
    margin: 0;
    font-size: 0.9rem;
    font-weight: 700;
    color: $white;
    display: flex;
    align-items: center;
    gap: 0.375rem;
  }

  &__meta {
    margin: 0.2rem 0 0;
    font-size: 0.78rem;
    color: rgba(255,255,255,0.6);

    strong { color: $color-primary; }
  }

  &__cta {
    background: $color-primary;
    color: $color-accent;
    text-decoration: none;
    padding: 0.45rem 0.875rem;
    border-radius: 0.5rem;
    font-size: 0.8rem;
    font-weight: 700;
    display: flex;
    align-items: center;
    gap: 0.35rem;
    white-space: nowrap;
    flex-shrink: 0;
    transition: opacity 0.15s;

    &:hover { opacity: 0.85; }
  }
}
</style>
