<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useUserStore } from '@/stores/user'
import { authService } from '@/services/auth.service'
import { paymentService } from '@/services/payment.service'
import type { MyOrder } from '@/services/auth.service'
import type { TrackOrderResponse } from '@/types'

const userStore = useUserStore()

// ── Tab state ──────────────────────────────────────────────────────
// Default: "cuenta" if logged in, "correo" if guest
const activeTab = ref<'cuenta' | 'correo'>(userStore.isLoggedIn ? 'cuenta' : 'correo')

// ── Logged-in orders ───────────────────────────────────────────────
const orders = ref<MyOrder[]>([])
const loading = ref(false)
const error = ref('')

// ── Guest email lookup ─────────────────────────────────────────────
const guestEmail = ref('')
const guestOrders = ref<TrackOrderResponse[]>([])
const guestLoading = ref(false)
const guestError = ref('')
const guestSearched = ref(false)

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente',
  approved: 'Aprobado',
  preparing: 'En preparación',
  ready: 'Listo',
  delivered: 'Entregado',
  rejected: 'Rechazado',
  cancelled: 'Cancelado',
}

const STATUS_MOD: Record<string, string> = {
  pending: 'badge--pending',
  approved: 'badge--approved',
  preparing: 'badge--preparing',
  ready: 'badge--ready',
  delivered: 'badge--delivered',
  rejected: 'badge--rejected',
  cancelled: 'badge--cancelled',
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-EC', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function handleLogout() {
  userStore.logout()
  activeTab.value = 'correo'
}

async function loadMyOrders() {
  if (!userStore.isLoggedIn) return
  loading.value = true
  error.value = ''
  try {
    orders.value = await authService.myOrders()
  } catch {
    error.value = 'No se pudieron cargar tus pedidos. Intenta de nuevo.'
  } finally {
    loading.value = false
  }
}

async function searchByEmail() {
  if (!guestEmail.value || !guestEmail.value.includes('@')) return
  guestLoading.value = true
  guestError.value = ''
  guestSearched.value = true
  try {
    guestOrders.value = await paymentService.ordersByEmail(guestEmail.value.trim())
  } catch {
    guestError.value = 'No se pudieron buscar los pedidos. Verifica tu correo.'
    guestOrders.value = []
  } finally {
    guestLoading.value = false
  }
}

onMounted(() => {
  if (userStore.isLoggedIn) loadMyOrders()
})
</script>

<template>
  <div class="mis-pedidos">
    <header class="mis-pedidos__header">
      <div class="mis-pedidos__header-inner">
        <div class="mis-pedidos__brand">
          <span>🧀</span>
          <span class="mis-pedidos__brand-name">Tequecruncheese</span>
        </div>
        <div class="mis-pedidos__header-actions">
          <router-link to="/tienda" class="mis-pedidos__link">
            <i class="fa-solid fa-store"></i> Tienda
          </router-link>
          <template v-if="userStore.isLoggedIn">
            <button class="mis-pedidos__logout-btn" @click="handleLogout">
              <i class="fa-solid fa-right-from-bracket"></i> Salir
            </button>
          </template>
          <template v-else>
            <router-link to="/login" class="mis-pedidos__login-link">
              <i class="fa-solid fa-right-to-bracket"></i> Iniciar sesión
            </router-link>
          </template>
        </div>
      </div>
    </header>

    <main class="mis-pedidos__main">
      <div class="mis-pedidos__hero">
        <h1>Mis Pedidos</h1>
        <p>Consulta el estado de tus pedidos</p>
      </div>

      <!-- Tabs -->
      <div class="mis-pedidos__tabs">
        <button
          :class="['mis-pedidos__tab', { 'mis-pedidos__tab--active': activeTab === 'correo' }]"
          @click="activeTab = 'correo'"
        >
          <i class="fa-solid fa-envelope"></i> Buscar por correo
        </button>
        <button
          v-if="userStore.isLoggedIn"
          :class="['mis-pedidos__tab', { 'mis-pedidos__tab--active': activeTab === 'cuenta' }]"
          @click="activeTab = 'cuenta'; loadMyOrders()"
        >
          <i class="fa-solid fa-user"></i> Mi cuenta
        </button>
        <router-link v-else to="/login" class="mis-pedidos__tab mis-pedidos__tab--login">
          <i class="fa-solid fa-user"></i> Mi cuenta
        </router-link>
      </div>

      <div class="mis-pedidos__content">

        <!-- ── GUEST TAB: search by email ── -->
        <div v-if="activeTab === 'correo'" class="mis-pedidos__guest">
          <div class="mis-pedidos__guest-form">
            <p class="mis-pedidos__guest-hint">
              Ingresa el correo con el que realizaste tu pedido
            </p>
            <form class="mis-pedidos__search-row" @submit.prevent="searchByEmail">
              <input
                v-model="guestEmail"
                type="email"
                placeholder="tu@correo.com"
                autocomplete="email"
                class="mis-pedidos__search-input"
                required
              />
              <button type="submit" class="mis-pedidos__search-btn" :disabled="guestLoading">
                <i v-if="guestLoading" class="fa-solid fa-spinner fa-spin"></i>
                <i v-else class="fa-solid fa-magnifying-glass"></i>
                Buscar
              </button>
            </form>
          </div>

          <template v-if="guestSearched">
            <div v-if="guestLoading" class="mis-pedidos__state">
              <i class="fa-solid fa-spinner fa-spin"></i>
              <p>Buscando tus pedidos...</p>
            </div>
            <div v-else-if="guestError" class="mis-pedidos__state mis-pedidos__state--error">
              <i class="fa-solid fa-triangle-exclamation"></i>
              <p>{{ guestError }}</p>
            </div>
            <div v-else-if="guestOrders.length === 0" class="mis-pedidos__state">
              <i class="fa-solid fa-bag-shopping"></i>
              <p>No encontramos pedidos para ese correo.</p>
              <router-link to="/tienda" class="mis-pedidos__cta">Hacer un pedido</router-link>
            </div>
            <div v-else class="mis-pedidos__grid">
              <article v-for="(order, idx) in guestOrders" :key="idx" class="order-card">
                <div class="order-card__top">
                  <div class="order-card__meta">
                    <span class="order-card__date">
                      <i class="fa-regular fa-calendar"></i>
                      {{ formatDate(order.createdAt) }}
                    </span>
                    <span class="order-card__badge badge" :class="STATUS_MOD[order.status] || 'badge--pending'">
                      {{ STATUS_LABELS[order.status] || order.status }}
                    </span>
                  </div>
                </div>
                <ul class="order-card__items">
                  <li v-for="item in order.items" :key="item.slug" class="order-card__item">
                    <span class="order-card__item-name">{{ item.nombre }}</span>
                    <span class="order-card__item-qty">× {{ item.cantidad }}</span>
                    <span class="order-card__item-price">${{ (item.precio * item.cantidad).toFixed(2) }}</span>
                  </li>
                </ul>
                <div class="order-card__footer">
                  <div class="order-card__total">
                    <span>Total</span>
                    <strong>${{ order.total.toFixed(2) }}</strong>
                  </div>
                  <router-link
                    v-if="order.trackingToken"
                    :to="`/pedido/${order.trackingToken}`"
                    class="order-card__track-btn"
                  >
                    <i class="fa-solid fa-magnifying-glass"></i> Ver estado
                  </router-link>
                </div>
              </article>
            </div>
          </template>
        </div>

        <!-- ── ACCOUNT TAB: logged-in orders ── -->
        <div v-else-if="activeTab === 'cuenta'">
          <div v-if="loading" class="mis-pedidos__state">
            <i class="fa-solid fa-spinner fa-spin"></i>
            <p>Cargando tus pedidos...</p>
          </div>
          <div v-else-if="error" class="mis-pedidos__state mis-pedidos__state--error">
            <i class="fa-solid fa-triangle-exclamation"></i>
            <p>{{ error }}</p>
          </div>
          <div v-else-if="orders.length === 0" class="mis-pedidos__state">
            <i class="fa-solid fa-bag-shopping"></i>
            <p>Aún no tienes pedidos. ¡Haz tu primer pedido!</p>
            <router-link to="/tienda" class="mis-pedidos__cta">Ver productos</router-link>
          </div>
          <div v-else class="mis-pedidos__grid">
            <article v-for="order in orders" :key="order._id" class="order-card">
              <div class="order-card__top">
                <div class="order-card__meta">
                  <span class="order-card__date">
                    <i class="fa-regular fa-calendar"></i>
                    {{ formatDate(order.createdAt) }}
                  </span>
                  <span class="order-card__badge badge" :class="STATUS_MOD[order.status] || 'badge--pending'">
                    {{ STATUS_LABELS[order.status] || order.status }}
                  </span>
                </div>
              </div>
              <ul class="order-card__items">
                <li v-for="item in order.items" :key="item.slug" class="order-card__item">
                  <span class="order-card__item-name">{{ item.nombre }}</span>
                  <span class="order-card__item-qty">× {{ item.cantidad }}</span>
                  <span class="order-card__item-price">${{ (item.precio * item.cantidad).toFixed(2) }}</span>
                </li>
              </ul>
              <div class="order-card__footer">
                <div class="order-card__total">
                  <span>Total</span>
                  <strong>${{ order.total.toFixed(2) }}</strong>
                </div>
                <router-link
                  v-if="order.trackingToken"
                  :to="`/pedido/${order.trackingToken}`"
                  class="order-card__track-btn"
                >
                  <i class="fa-solid fa-magnifying-glass"></i> Ver estado
                </router-link>
              </div>
            </article>
          </div>
        </div>

      </div>
    </main>
  </div>
</template>

<style lang="scss" scoped>
.mis-pedidos {
  min-height: 100vh;
  background: #f7f4f0;
  display: flex;
  flex-direction: column;

  &__header {
    background: $color-accent;
    padding: 0 1rem;
    position: sticky;
    top: 0;
    z-index: 100;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.15);
  }

  &__header-inner {
    max-width: 1000px;
    margin: 0 auto;
    height: 64px;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  &__brand {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 1.5rem;
  }

  &__brand-name {
    font-size: 1rem;
    font-weight: 800;
    color: $color-primary;
    letter-spacing: -0.01em;
  }

  &__header-actions {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  &__link {
    color: $white;
    text-decoration: none;
    font-size: 0.875rem;
    font-weight: 600;
    opacity: 0.85;
    display: flex;
    align-items: center;
    gap: 0.375rem;
    transition: opacity 0.15s;

    &:hover {
      opacity: 1;
    }
  }

  &__logout-btn {
    background: rgba(255, 255, 255, 0.15);
    border: 1px solid rgba(255, 255, 255, 0.3);
    color: $white;
    border-radius: 0.5rem;
    padding: 0.4rem 0.875rem;
    font-size: 0.875rem;
    font-weight: 600;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 0.375rem;
    transition: background 0.15s;

    &:hover {
      background: rgba(255, 255, 255, 0.25);
    }
  }

  &__login-link {
    color: $color-primary;
    text-decoration: none;
    font-size: 0.875rem;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 0.375rem;
    border: 1px solid $color-primary;
    border-radius: 0.5rem;
    padding: 0.4rem 0.875rem;
    transition: background 0.15s, color 0.15s;

    &:hover {
      background: $color-primary;
      color: $color-accent;
    }
  }

  // ── Tabs ────────────────────────────────────────────────────
  &__tabs {
    display: flex;
    gap: 0;
    max-width: 1000px;
    margin: 0 auto;
    padding: 1.5rem 1rem 0;
    border-bottom: 2px solid #e8e4de;
  }

  &__tab {
    background: none;
    border: none;
    border-bottom: 3px solid transparent;
    margin-bottom: -2px;
    padding: 0.6rem 1.25rem;
    font-size: 0.9rem;
    font-weight: 600;
    color: #888;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 0.4rem;
    transition: color 0.15s, border-color 0.15s;
    text-decoration: none;

    &:hover {
      color: $color-accent;
    }

    &--active {
      color: $color-accent;
      border-bottom-color: $color-accent;
    }

    &--login {
      color: #888;

      &:hover {
        color: $color-accent;
      }
    }
  }

  // ── Guest email search ───────────────────────────────────────
  &__guest {
    display: flex;
    flex-direction: column;
    gap: 2rem;
  }

  &__guest-form {
    background: $white;
    border-radius: 1rem;
    padding: 1.5rem;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
    max-width: 560px;
    margin: 0 auto;
    width: 100%;
  }

  &__guest-hint {
    margin: 0 0 1rem;
    font-size: 0.9rem;
    color: #555;
    text-align: center;
  }

  &__search-row {
    display: flex;
    gap: 0.5rem;
  }

  &__search-input {
    flex: 1;
    padding: 0.65rem 0.875rem;
    border: 1.5px solid #e0e0e0;
    border-radius: 0.625rem;
    font-size: 0.9rem;
    outline: none;
    transition: border-color 0.15s;

    &:focus {
      border-color: $color-accent;
    }
  }

  &__search-btn {
    background: $color-accent;
    color: $color-primary;
    border: none;
    border-radius: 0.625rem;
    padding: 0.65rem 1.25rem;
    font-size: 0.875rem;
    font-weight: 700;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 0.4rem;
    white-space: nowrap;
    transition: opacity 0.15s;

    &:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    &:not(:disabled):hover {
      opacity: 0.88;
    }
  }

  &__main {
    flex: 1;
  }

  &__hero {
    background: $color-accent;
    color: $white;
    text-align: center;
    padding: 2.5rem 1rem 2rem;

    h1 {
      font-size: clamp(1.75rem, 4vw, 2.5rem);
      font-weight: 900;
      margin: 0 0 0.375rem;
    }

    p {
      font-size: 1rem;
      opacity: 0.8;
      margin: 0;
    }
  }

  &__content {
    max-width: 1000px;
    margin: 0 auto;
    padding: 2rem 1rem 3rem;
  }

  &__state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 1rem;
    min-height: 280px;
    color: #888;
    text-align: center;

    i {
      font-size: 3rem;
      color: $color-primary;
    }

    p {
      margin: 0;
      font-size: 1rem;
    }

    &--error i {
      color: #c53030;
    }
  }

  &__cta {
    background: $color-accent;
    color: $color-primary;
    border-radius: 0.75rem;
    padding: 0.75rem 1.5rem;
    font-size: 0.95rem;
    font-weight: 700;
    text-decoration: none;
    transition: opacity 0.15s;

    &:hover {
      opacity: 0.88;
    }
  }

  &__grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 1.25rem;

    @media (min-width: 640px) {
      grid-template-columns: repeat(2, 1fr);
    }

    @media (min-width: 900px) {
      grid-template-columns: repeat(3, 1fr);
    }
  }
}

.order-card {
  background: $white;
  border-radius: 1rem;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.07);
  overflow: hidden;
  display: flex;
  flex-direction: column;

  &__top {
    padding: 1rem 1.25rem 0.75rem;
    border-bottom: 1px solid #f0f0f0;
  }

  &__meta {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  &__date {
    font-size: 0.8rem;
    color: #888;
    display: flex;
    align-items: center;
    gap: 0.375rem;
  }

  &__items {
    list-style: none;
    margin: 0;
    padding: 0.875rem 1.25rem;
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  &__item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.875rem;
  }

  &__item-name {
    flex: 1;
    color: #444;
  }

  &__item-qty {
    color: #888;
    font-size: 0.8rem;
  }

  &__item-price {
    font-weight: 700;
    color: $color-accent;
    white-space: nowrap;
  }

  &__footer {
    padding: 0.875rem 1.25rem 1.25rem;
    border-top: 1px solid #f0f0f0;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    flex-wrap: wrap;
  }

  &__total {
    display: flex;
    flex-direction: column;
    font-size: 0.8rem;
    color: #888;

    strong {
      font-size: 1.1rem;
      color: $color-accent;
      font-weight: 800;
    }
  }

  &__track-btn {
    background: $color-accent;
    color: $color-primary;
    border-radius: 0.5rem;
    padding: 0.45rem 0.875rem;
    font-size: 0.8rem;
    font-weight: 700;
    text-decoration: none;
    display: flex;
    align-items: center;
    gap: 0.375rem;
    transition: opacity 0.15s;

    &:hover {
      opacity: 0.88;
    }
  }
}

// Status badges
.badge {
  display: inline-block;
  padding: 0.2rem 0.625rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.03em;

  &--pending {
    background: #fefcbf;
    color: #744210;
  }

  &--approved {
    background: #c6f6d5;
    color: #22543d;
  }

  &--preparing {
    background: #bee3f8;
    color: #2a4365;
  }

  &--ready {
    background: #e9d8fd;
    color: #44337a;
  }

  &--delivered {
    background: #e2e8f0;
    color: #4a5568;
  }

  &--rejected {
    background: #fed7d7;
    color: #742a2a;
  }

  &--cancelled {
    background: #e2e8f0;
    color: #4a5568;
  }
}
</style>
