<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { RouterLink } from 'vue-router'
import { paymentService } from '@/services/payment.service'
import { useCartStore } from '@/stores/cart'

const route = useRoute()
const cart = useCartStore()

const status = ref<'loading' | 'approved' | 'rejected' | 'error'>('loading')
const orderTotal = ref<number | null>(null)

onMounted(async () => {
  const { id, clientTransactionId, transactionStatus } = route.query as Record<string, string>

  if (!id || !clientTransactionId) {
    status.value = 'error'
    return
  }

  if (transactionStatus === 'Approved') {
    try {
      const result = await paymentService.confirmPayment({ id, clientTransactionId })
      if (result.success) {
        orderTotal.value = result.order.total
        cart.clear()
        status.value = 'approved'
      } else {
        status.value = 'rejected'
      }
    } catch {
      status.value = 'error'
    }
  } else {
    status.value = 'rejected'
  }
})
</script>

<template>
  <div class="pago-confirmado">
    <div class="pago-confirmado__card">
      <!-- Loading -->
      <div v-if="status === 'loading'" class="pago-confirmado__state">
        <i class="fa-solid fa-spinner fa-spin pago-confirmado__icon pago-confirmado__icon--loading"></i>
        <h2>Verificando tu pago...</h2>
        <p>Por favor espera un momento.</p>
      </div>

      <!-- Approved -->
      <div v-else-if="status === 'approved'" class="pago-confirmado__state">
        <i class="fa-solid fa-circle-check pago-confirmado__icon pago-confirmado__icon--success"></i>
        <h2>¡Pago exitoso!</h2>
        <p>Tu pedido ha sido confirmado. Pronto nos comunicaremos contigo.</p>
        <p v-if="orderTotal" class="pago-confirmado__total">
          Total pagado: <strong>${{ orderTotal.toFixed(2) }}</strong>
        </p>
        <RouterLink to="/tienda" class="btn btn--primary pago-confirmado__btn">
          Seguir comprando
        </RouterLink>
      </div>

      <!-- Rejected -->
      <div v-else-if="status === 'rejected'" class="pago-confirmado__state">
        <i class="fa-solid fa-circle-xmark pago-confirmado__icon pago-confirmado__icon--error"></i>
        <h2>Pago no completado</h2>
        <p>Tu pago fue cancelado o rechazado. Puedes intentarlo nuevamente.</p>
        <RouterLink to="/tienda" class="btn btn--primary pago-confirmado__btn">
          Volver a la Tienda
        </RouterLink>
      </div>

      <!-- Error -->
      <div v-else class="pago-confirmado__state">
        <i class="fa-solid fa-triangle-exclamation pago-confirmado__icon pago-confirmado__icon--warning"></i>
        <h2>Algo salió mal</h2>
        <p>No pudimos verificar tu pago. Contáctanos si el problema persiste.</p>
        <RouterLink to="/tienda" class="btn btn--primary pago-confirmado__btn">
          Volver a la Tienda
        </RouterLink>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.pago-confirmado {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: lighten(#fed47f, 35%);
  padding: 2rem $spacing-sm;

  &__card {
    background: $white;
    border-radius: 1.5rem;
    padding: 3rem 2rem;
    max-width: 480px;
    width: 100%;
    box-shadow: 0 8px 40px rgba(0, 0, 0, 0.1);
    text-align: center;
  }

  &__state {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;

    h2 {
      font-size: 1.75rem;
      font-weight: 800;
      color: $color-accent;
      margin: 0;
    }

    p {
      color: #555;
      margin: 0;
      line-height: 1.5;
    }
  }

  &__icon {
    font-size: 4rem;

    &--success { color: #38a169; }
    &--error   { color: #e53e3e; }
    &--warning { color: #d69e2e; }
    &--loading { color: $color-primary; }
  }

  &__total {
    font-size: 1.1rem;
    strong { color: $color-accent; font-size: 1.3rem; }
  }

  &__btn {
    margin-top: 0.5rem;
    padding: 0.875rem 2rem;
  }
}
</style>
