<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import TheHeader from '@/components/home/TheHeader.vue'
import TheFooter from '@/components/home/TheFooter.vue'
import { useUserStore } from '@/stores/user'
import { useModalStore } from '@/stores/modal'
import { authService } from '@/services/auth.service'
import { paymentService } from '@/services/payment.service'
import { cloudImg } from '@/services/cloudinary'
import { formatSchedule } from '@/services/schedule.service'
import type { MyOrder, OrderFilter } from '@/services/auth.service'
import type { TrackOrderResponse } from '@/types'

const userStore = useUserStore()
const modal = useModalStore()
const router = useRouter()

// ── Image pools ────────────────────────────────────────────────
const HERO_BG = cloudImg('DSC06166.jpg', { width: 1600, height: 700, crop: 'fill', quality: 80 })
const GUEST_BG = cloudImg('DSC06085.jpg', { width: 900, height: 600, crop: 'fill', quality: 80 })
const EMPTY_IMG = cloudImg('DSC06334.jpg', { width: 500, height: 400, crop: 'fill' })

const CARD_THUMBS = [
  'DSC06085.jpg',
  'DSC06140.jpg',
  'DSC06199.jpg',
  'DSC06229.jpg',
  'DSC06292.jpg',
  'DSC06334.jpg',
  'DSC06385.jpg',
  'DSC06027.jpg',
  'DSC00027.jpg',
  'DSC06177.jpg',
]

function cardThumb(index: number): string {
  const key = CARD_THUMBS[index % CARD_THUMBS.length] ?? 'DSC06085.jpg'
  return cloudImg(key, { width: 320, height: 240, crop: 'fill' })
}

// ── Filter tabs ────────────────────────────────────────────────
type TabKey = OrderFilter

interface Tab { key: TabKey; label: string; icon: string }

const TABS: Tab[] = [
  { key: 'all',       label: 'Todos',       icon: 'fa-list' },
  { key: 'pending',   label: 'Pendientes',  icon: 'fa-clock' },
  { key: 'active',    label: 'En proceso',  icon: 'fa-fire-burner' },
  { key: 'completed', label: 'Entregados',  icon: 'fa-truck' },
  { key: 'cancelled', label: 'Cancelados',  icon: 'fa-ban' },
]

const activeFilter = ref<TabKey>('all')

// ── Logged-in orders ───────────────────────────────────────────
const orders = ref<MyOrder[]>([])
const loading = ref(false)
const error = ref('')

// ── Guest email lookup ─────────────────────────────────────────
const guestEmail = ref('')
const guestOrders = ref<TrackOrderResponse[]>([])
const guestLoading = ref(false)
const guestError = ref('')
const guestSearched = ref(false)

// ── Status config ──────────────────────────────────────────────
const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente',
  approved: 'Aprobado',
  preparing: 'En preparación',
  ready: 'Listo',
  delivered: 'Entregado',
  rejected: 'Rechazado',
  cancelled: 'Cancelado',
}

const STATUS_ICON: Record<string, string> = {
  pending: 'fa-clock',
  approved: 'fa-circle-check',
  preparing: 'fa-fire-burner',
  ready: 'fa-box-open',
  delivered: 'fa-truck',
  rejected: 'fa-circle-xmark',
  cancelled: 'fa-ban',
}

const FLOW_STEPS = ['pending', 'approved', 'preparing', 'ready', 'delivered']

function stepIndex(status: string): number {
  return FLOW_STEPS.indexOf(status)
}

function isNegative(status: string): boolean {
  return status === 'rejected' || status === 'cancelled'
}

const displayName = computed((): string => {
  if (userStore.name) return userStore.name.split(' ')[0] ?? userStore.name
  if (userStore.email) return userStore.email.split('@')[0] ?? userStore.email
  return 'Cliente'
})

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-EC', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('es-EC', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

async function handleLogout() {
  const confirmed = await modal.confirm({
    title: '¿Cerrar sesión?',
    message: 'Volverás a ser un visitante. Puedes volver a ingresar cuando quieras.',
    confirmText: 'Cerrar sesión',
    cancelText: 'Cancelar',
    variant: 'danger',
  })
  if (confirmed) {
    userStore.logout()
    router.push('/')
  }
}

async function loadMyOrders(filter: TabKey = activeFilter.value) {
  if (!userStore.isLoggedIn) return
  loading.value = true
  error.value = ''
  try {
    orders.value = await authService.myOrders(filter)
  } catch {
    error.value = 'No se pudieron cargar tus pedidos. Intenta de nuevo.'
  } finally {
    loading.value = false
  }
}

async function switchFilter(tab: TabKey) {
  if (activeFilter.value === tab) return
  activeFilter.value = tab
  await loadMyOrders(tab)
}

// Pending orders count for the tab badge
const pendingCount = computed(() =>
  orders.value.filter(o => o.status === 'pending').length
)

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
  <div class="mp-view">
    <TheHeader />

    <main class="mp">

      <!-- ══ HERO ══════════════════════════════════════════════════ -->
      <section class="mp-hero" :style="{ backgroundImage: `url(${HERO_BG})` }">
        <div class="mp-hero__overlay"></div>
        <div class="mp-hero__inner">
          <div class="mp-hero__eyebrow">
            <i class="fa-solid fa-bag-shopping"></i>
            Mis Pedidos
          </div>

          <template v-if="userStore.isLoggedIn">
            <h1 class="mp-hero__title">Hola, {{ displayName }}</h1>
            <p class="mp-hero__sub">Aquí tienes el historial completo de tus pedidos</p>
            <div class="mp-hero__meta" v-if="!loading">
              <div class="mp-hero__stat">
                <strong>{{ orders.length }}</strong>
                <span>{{ orders.length === 1 ? 'pedido' : 'pedidos' }}</span>
              </div>
              <div class="mp-hero__stat-divider"></div>
              <div class="mp-hero__stat">
                <strong>
                  ${{ orders.reduce((s, o) => s + o.total, 0).toFixed(2) }}
                </strong>
                <span>en total</span>
              </div>
            </div>
          </template>
          <template v-else>
            <h1 class="mp-hero__title">Mis Pedidos</h1>
            <p class="mp-hero__sub">Consulta el estado de tus pedidos</p>
          </template>
        </div>
      </section>

      <!-- ══ CONTENT ════════════════════════════════════════════════ -->
      <div class="mp-body">

        <!-- ════ LOGGED-IN VIEW ════ -->
        <template v-if="userStore.isLoggedIn">
          <div class="mp-layout">

            <!-- Sidebar -->
            <aside class="mp-sidebar">
              <div class="mp-user-card">
                <div class="mp-user-card__avatar">
                  {{ displayName.charAt(0)?.toUpperCase() ?? '?' }}
                </div>
                <div class="mp-user-card__info">
                  <p class="mp-user-card__name">{{ userStore.name || displayName }}</p>
                  <p class="mp-user-card__email">{{ userStore.email }}</p>
                </div>
                <div class="mp-user-card__divider"></div>
                <div class="mp-user-card__stats">
                  <div class="mp-user-card__stat">
                    <i class="fa-solid fa-bag-shopping"></i>
                    <div>
                      <strong>{{ orders.length }}</strong>
                      <span>{{ orders.length === 1 ? 'pedido' : 'pedidos' }}</span>
                    </div>
                  </div>
                  <div class="mp-user-card__stat">
                    <i class="fa-solid fa-dollar-sign"></i>
                    <div>
                      <strong>${{ orders.reduce((s, o) => s + o.total, 0).toFixed(2) }}</strong>
                      <span>total gastado</span>
                    </div>
                  </div>
                </div>
                <div class="mp-user-card__divider"></div>
                <router-link to="/tienda" class="mp-user-card__shop-btn">
                  <i class="fa-solid fa-store"></i>
                  Ir a la tienda
                </router-link>
                <button class="mp-user-card__logout-btn" @click="handleLogout">
                  <i class="fa-solid fa-right-from-bracket"></i>
                  Cerrar sesión
                </button>
              </div>
            </aside>

            <!-- Orders main -->
            <div class="mp-orders-col">

              <!-- ── Filter tabs ── -->
              <div class="mp-tabs">
                <button
                  v-for="tab in TABS"
                  :key="tab.key"
                  class="mp-tab"
                  :class="{ 'mp-tab--active': activeFilter === tab.key }"
                  :disabled="loading"
                  @click="switchFilter(tab.key)"
                >
                  <i :class="`fa-solid ${tab.icon}`"></i>
                  {{ tab.label }}
                  <span
                    v-if="tab.key === 'pending' && activeFilter !== 'pending' && pendingCount > 0"
                    class="mp-tab__badge"
                  >{{ pendingCount }}</span>
                </button>
              </div>

              <!-- Loading -->
              <div v-if="loading" class="mp-state">
                <div class="mp-state__spinner">
                  <i class="fa-solid fa-spinner fa-spin"></i>
                </div>
                <p>Cargando pedidos...</p>
              </div>

              <!-- Error -->
              <div v-else-if="error" class="mp-state mp-state--error">
                <div class="mp-state__icon">
                  <i class="fa-solid fa-circle-exclamation"></i>
                </div>
                <p>{{ error }}</p>
                <button class="mp-btn mp-btn--primary" @click="loadMyOrders()">
                  <i class="fa-solid fa-rotate-right"></i>
                  Reintentar
                </button>
              </div>

              <!-- Empty -->
              <div v-else-if="orders.length === 0" class="mp-empty">
                <div class="mp-empty__img-wrap">
                  <img :src="EMPTY_IMG" alt="Deliciosos productos" class="mp-empty__img" />
                  <div class="mp-empty__img-overlay"></div>
                </div>
                <div class="mp-empty__content">
                  <div class="mp-empty__icon">
                    <i class="fa-solid fa-bag-shopping"></i>
                  </div>
                  <h3>
                    {{ activeFilter === 'all' ? '¡Aún no tienes pedidos!' : 'Sin pedidos en esta categoría' }}
                  </h3>
                  <p>
                    {{ activeFilter === 'all'
                      ? 'Anímate a probar nuestros productos. El primer pedido no se olvida.'
                      : 'No encontramos pedidos con este filtro. Prueba cambiando la categoría.' }}
                  </p>
                  <router-link v-if="activeFilter === 'all'" to="/tienda" class="mp-btn mp-btn--primary">
                    <i class="fa-solid fa-arrow-right"></i>
                    Explorar productos
                  </router-link>
                  <button v-else class="mp-btn mp-btn--primary" @click="switchFilter('all')">
                    <i class="fa-solid fa-list"></i>
                    Ver todos los pedidos
                  </button>
                </div>
              </div>

              <!-- Orders list -->
              <template v-else>
                <p class="mp-orders-count">
                  <i class="fa-solid fa-list-check"></i>
                  {{ orders.length }} {{ orders.length === 1 ? 'pedido' : 'pedidos' }}
                </p>
                <div class="mp-list">
                  <article
                    v-for="(order, idx) in orders"
                    :key="order._id"
                    class="ocard"
                    :class="{
                      'ocard--negative': isNegative(order.status),
                      'ocard--pending': order.status === 'pending',
                    }"
                  >
                    <!-- Thumbnail -->
                    <div class="ocard__thumb">
                      <img :src="cardThumb(idx)" :alt="`Pedido ${idx + 1}`" loading="lazy" />
                      <div class="ocard__thumb-overlay"></div>
                      <span class="ocard__badge" :class="`ocard__badge--${order.status}`">
                        <i :class="`fa-solid ${STATUS_ICON[order.status] || 'fa-clock'}`"></i>
                        {{ STATUS_LABELS[order.status] || order.status }}
                      </span>
                    </div>

                    <!-- Body -->
                    <div class="ocard__body">

                      <!-- ⚠️ Pending payment banner -->
                      <div v-if="order.status === 'pending'" class="ocard__pay-banner">
                        <div class="ocard__pay-banner-text">
                          <i class="fa-solid fa-triangle-exclamation"></i>
                          <div>
                            <strong>Pago pendiente</strong>
                            <span>Este pedido aún no ha sido pagado.</span>
                          </div>
                        </div>
                        <a
                          v-if="order.payWithPayPhone"
                          :href="order.payWithPayPhone"
                          class="mp-btn mp-btn--pay"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <i class="fa-solid fa-credit-card"></i>
                          Completar pago
                        </a>
                        <span v-else class="ocard__pay-expired">
                          <i class="fa-solid fa-link-slash"></i>
                          Enlace expirado — crea un nuevo pedido
                        </span>
                      </div>

                      <!-- Meta row -->
                      <div class="ocard__meta">
                        <div class="ocard__date-group">
                          <i class="fa-regular fa-calendar-days"></i>
                          <div>
                            <span class="ocard__date">{{ formatDate(order.createdAt) }}</span>
                            <span class="ocard__time">{{ formatTime(order.createdAt) }}</span>
                          </div>
                        </div>
                        <div class="ocard__total-pill">
                          ${{ order.total.toFixed(2) }}
                        </div>
                      </div>

                      <!-- Progress timeline (non-negative, non-pending) -->
                      <div v-if="!isNegative(order.status) && order.status !== 'pending'" class="ocard__timeline">
                        <div
                          v-for="(step, si) in FLOW_STEPS"
                          :key="step"
                          class="ocard__step"
                          :class="{
                            'ocard__step--done': stepIndex(order.status) >= si,
                            'ocard__step--current': order.status === step,
                          }"
                        >
                          <div class="ocard__step-dot"></div>
                          <span class="ocard__step-label">{{ STATUS_LABELS[step] }}</span>
                          <div v-if="si < FLOW_STEPS.length - 1" class="ocard__step-line"></div>
                        </div>
                      </div>

                      <!-- Negative banner -->
                      <div v-else-if="isNegative(order.status)" class="ocard__neg-banner">
                        <i :class="`fa-solid ${STATUS_ICON[order.status]}`"></i>
                        {{ STATUS_LABELS[order.status] }}
                      </div>

                      <!-- Scheduled slot -->
                      <div v-if="order.scheduledFor" class="ocard__scheduled">
                        <i class="fa-regular fa-calendar-check"></i>
                        {{ formatSchedule(order.scheduledFor) }}
                      </div>

                      <!-- Items -->
                      <ul class="ocard__items">
                        <li v-for="item in order.items" :key="item.slug" class="ocard__item">
                          <span class="ocard__item-qty">{{ item.cantidad }}×</span>
                          <span class="ocard__item-name">
                            {{ item.nombre }}
                            <span v-if="item.flavorSelections?.length" class="ocard__item-flavors">
                              Sabores: {{ item.flavorSelections.map(f => `${f.cantidad}× ${f.nombre}`).join(', ') }}
                            </span>
                          </span>
                          <span class="ocard__item-price">${{ (item.precio * item.cantidad).toFixed(2) }}</span>
                        </li>
                      </ul>

                      <!-- Footer -->
                      <div class="ocard__foot">
                        <div class="ocard__total">
                          <span>Total</span>
                          <strong>${{ order.total.toFixed(2) }}</strong>
                        </div>
                        <router-link
                          v-if="order.trackingToken && order.status !== 'pending'"
                          :to="`/pedido/${order.trackingToken}`"
                          class="mp-btn mp-btn--track"
                        >
                          <i class="fa-solid fa-location-dot"></i>
                          Ver estado
                        </router-link>
                      </div>
                    </div>
                  </article>
                </div>
              </template>
            </div>
          </div>
        </template>

        <!-- ════ GUEST VIEW ════ -->
        <template v-else>
          <div class="mp-guest">

            <!-- Login promo card -->
            <div class="mp-guest__promo" :style="{ backgroundImage: `url(${GUEST_BG})` }">
              <div class="mp-guest__promo-overlay"></div>
              <div class="mp-guest__promo-content">
                <img
                  class="mp-guest__logo"
                  src="https://res.cloudinary.com/dvq6znk71/image/upload/f_auto,q_auto/tequecruncheese/logos/logo-small"
                  alt="Tequecruncheese"
                />
                <h2 class="mp-guest__promo-title">¿Ya tienes cuenta?</h2>
                <p class="mp-guest__promo-sub">
                  Inicia sesión para ver todos tus pedidos al instante, sin buscar por correo.
                </p>
                <div class="mp-guest__feats">
                  <div class="mp-guest__feat">
                    <i class="fa-solid fa-clock-rotate-left"></i>
                    <span>Historial completo</span>
                  </div>
                  <div class="mp-guest__feat">
                    <i class="fa-solid fa-location-dot"></i>
                    <span>Rastreo en tiempo real</span>
                  </div>
                  <div class="mp-guest__feat">
                    <i class="fa-solid fa-shield-halved"></i>
                    <span>Acceso seguro</span>
                  </div>
                </div>
                <router-link to="/login" class="mp-btn mp-btn--gold">
                  <i class="fa-solid fa-right-to-bracket"></i>
                  Iniciar sesión
                </router-link>
              </div>
            </div>

            <!-- Search section -->
            <div class="mp-search">
              <div class="mp-search__header">
                <div class="mp-search__icon">
                  <i class="fa-regular fa-envelope"></i>
                </div>
                <div>
                  <h3 class="mp-search__title">Buscar sin cuenta</h3>
                  <p class="mp-search__sub">Ingresa el correo con el que hiciste tu pedido</p>
                </div>
              </div>

              <form class="mp-search__form" @submit.prevent="searchByEmail">
                <div class="mp-search__input-wrap">
                  <i class="fa-regular fa-envelope mp-search__input-icon"></i>
                  <input
                    v-model="guestEmail"
                    type="email"
                    placeholder="tu@correo.com"
                    autocomplete="email"
                    required
                  />
                </div>
                <button type="submit" class="mp-btn mp-btn--primary" :disabled="guestLoading">
                  <i v-if="guestLoading" class="fa-solid fa-spinner fa-spin"></i>
                  <i v-else class="fa-solid fa-magnifying-glass"></i>
                  Buscar pedidos
                </button>
              </form>

              <!-- Guest results -->
              <template v-if="guestSearched">

                <div v-if="guestLoading" class="mp-state">
                  <div class="mp-state__spinner">
                    <i class="fa-solid fa-spinner fa-spin"></i>
                  </div>
                  <p>Buscando tus pedidos...</p>
                </div>

                <div v-else-if="guestError" class="mp-state mp-state--error">
                  <div class="mp-state__icon">
                    <i class="fa-solid fa-circle-exclamation"></i>
                  </div>
                  <p>{{ guestError }}</p>
                </div>

                <div v-else-if="guestOrders.length === 0" class="mp-state">
                  <div class="mp-state__icon">
                    <i class="fa-solid fa-bag-shopping"></i>
                  </div>
                  <p>No encontramos pedidos para ese correo.</p>
                  <router-link to="/tienda" class="mp-btn mp-btn--primary">
                    <i class="fa-solid fa-store"></i>
                    Ver productos
                  </router-link>
                </div>

                <template v-else>
                  <p class="mp-orders-count">
                    <i class="fa-solid fa-list-check"></i>
                    {{ guestOrders.length }} {{ guestOrders.length === 1 ? 'pedido encontrado' : 'pedidos encontrados' }}
                  </p>
                  <div class="mp-list">
                    <article
                      v-for="(order, idx) in guestOrders"
                      :key="idx"
                      class="ocard"
                      :class="{ 'ocard--negative': isNegative(order.status) }"
                    >
                      <div class="ocard__thumb">
                        <img :src="cardThumb(idx)" :alt="`Pedido ${idx + 1}`" loading="lazy" />
                        <div class="ocard__thumb-overlay"></div>
                        <span class="ocard__badge" :class="`ocard__badge--${order.status}`">
                          <i :class="`fa-solid ${STATUS_ICON[order.status] || 'fa-clock'}`"></i>
                          {{ STATUS_LABELS[order.status] || order.status }}
                        </span>
                      </div>

                      <div class="ocard__body">
                        <div class="ocard__meta">
                          <div class="ocard__date-group">
                            <i class="fa-regular fa-calendar-days"></i>
                            <div>
                              <span class="ocard__date">{{ formatDate(order.createdAt) }}</span>
                              <span class="ocard__time">{{ formatTime(order.createdAt) }}</span>
                            </div>
                          </div>
                          <div class="ocard__total-pill">${{ order.total.toFixed(2) }}</div>
                        </div>

                        <div v-if="!isNegative(order.status)" class="ocard__timeline">
                          <div
                            v-for="(step, si) in FLOW_STEPS"
                            :key="step"
                            class="ocard__step"
                            :class="{
                              'ocard__step--done': stepIndex(order.status) >= si,
                              'ocard__step--current': order.status === step,
                            }"
                          >
                            <div class="ocard__step-dot"></div>
                            <span class="ocard__step-label">{{ STATUS_LABELS[step] }}</span>
                            <div v-if="si < FLOW_STEPS.length - 1" class="ocard__step-line"></div>
                          </div>
                        </div>

                        <div v-else class="ocard__neg-banner">
                          <i :class="`fa-solid ${STATUS_ICON[order.status]}`"></i>
                          {{ STATUS_LABELS[order.status] }}
                        </div>

                        <div v-if="order.scheduledFor" class="ocard__scheduled">
                          <i class="fa-regular fa-calendar-check"></i>
                          {{ formatSchedule(order.scheduledFor) }}
                        </div>

                        <ul class="ocard__items">
                          <li v-for="item in order.items" :key="item.slug" class="ocard__item">
                            <span class="ocard__item-qty">{{ item.cantidad }}×</span>
                            <span class="ocard__item-name">
                            {{ item.nombre }}
                            <span v-if="item.flavorSelections?.length" class="ocard__item-flavors">
                              Sabores: {{ item.flavorSelections.map(f => `${f.cantidad}× ${f.nombre}`).join(', ') }}
                            </span>
                          </span>
                            <span class="ocard__item-price">${{ (item.precio * item.cantidad).toFixed(2) }}</span>
                          </li>
                        </ul>

                        <div class="ocard__foot">
                          <div class="ocard__total">
                            <span>Total</span>
                            <strong>${{ order.total.toFixed(2) }}</strong>
                          </div>
                          <router-link
                            v-if="order.trackingToken"
                            :to="`/pedido/${order.trackingToken}`"
                            class="mp-btn mp-btn--track"
                          >
                            <i class="fa-solid fa-location-dot"></i>
                            Ver estado
                          </router-link>
                        </div>
                      </div>
                    </article>
                  </div>
                </template>
              </template>
            </div>
          </div>
        </template>
      </div>
    </main>

    <TheFooter />
  </div>
</template>

<style lang="scss" scoped>
// ─── View wrapper ────────────────────────────────────────────────
.mp-view {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: #f5f2ee;
}

.mp { flex: 1; padding-top: 72px; }

// ─── Hero ────────────────────────────────────────────────────────
.mp-hero {
  position: relative;
  background-size: cover;
  background-position: center 40%;
  padding: 5rem 1.5rem 4.5rem;
  overflow: hidden;

  @include respond-to('md') {
    padding: 7rem 3rem 5.5rem;
  }

  &__overlay {
    position: absolute;
    inset: 0;
    background: linear-gradient(
      135deg,
      rgba($color-accent, 0.92) 0%,
      rgba(darken($color-accent, 8%, 'adjust'), 0.75) 60%,
      rgba(0, 0, 0, 0.4) 100%
    );
  }

  &__inner {
    position: relative;
    z-index: 1;
    max-width: 800px;
    margin: 0 auto;
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.875rem;
  }

  &__eyebrow {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    font-size: 0.72rem;
    font-weight: 800;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: $color-primary;
    background: rgba($color-primary, 0.15);
    border: 1px solid rgba($color-primary, 0.3);
    padding: 0.35rem 1rem;
    border-radius: 999px;

    i { font-size: 0.65rem; }
  }

  &__title {
    font-size: clamp(2.2rem, 6vw, 3.5rem);
    font-weight: 900;
    color: $white;
    letter-spacing: -0.03em;
    line-height: 1.05;
    margin: 0;
  }

  &__sub {
    font-size: 1rem;
    color: rgba($white, 0.72);
    margin: 0;

    @include respond-to('md') { font-size: 1.1rem; }
  }

  &__meta {
    display: flex;
    align-items: center;
    gap: 1.25rem;
    margin-top: 0.5rem;
    background: rgba($white, 0.1);
    backdrop-filter: blur(8px);
    border: 1px solid rgba($white, 0.18);
    border-radius: 999px;
    padding: 0.6rem 1.75rem;
  }

  &__stat {
    display: flex;
    flex-direction: column;
    align-items: center;

    strong {
      font-size: 1.4rem;
      font-weight: 900;
      color: $color-primary;
      font-family: $font-secondary;
    }

    span {
      font-size: 0.7rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: rgba($white, 0.6);
    }
  }

  &__stat-divider {
    width: 1px;
    height: 36px;
    background: rgba($white, 0.2);
  }
}

// ─── Body ────────────────────────────────────────────────────────
.mp-body {
  max-width: 1180px;
  margin: 0 auto;
  padding: 2.5rem 1.25rem 5rem;
  width: 100%;

  @include respond-to('md') { padding: 3.5rem 2rem 6rem; }
  @include respond-to('lg') { padding: 3.5rem 2.5rem 6rem; }
}

// ─── Two-column layout ───────────────────────────────────────────
.mp-layout {
  display: grid;
  grid-template-columns: 1fr;
  gap: 2rem;

  @include respond-to('lg') {
    grid-template-columns: 280px 1fr;
    align-items: start;
  }
}

// ─── Sidebar user card ───────────────────────────────────────────
.mp-sidebar {
  @include respond-to('lg') {
    position: sticky;
    top: 92px;
  }
}

.mp-user-card {
  background: $white;
  border-radius: 1.5rem;
  padding: 2rem 1.5rem;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  text-align: center;

  &__avatar {
    width: 72px;
    height: 72px;
    border-radius: 50%;
    background: $color-accent;
    color: $color-primary;
    font-size: 1.8rem;
    font-weight: 900;
    font-family: $font-secondary;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 6px 20px rgba($color-accent, 0.35);
  }

  &__info {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
  }

  &__name {
    font-size: 1.05rem;
    font-weight: 800;
    color: $color-accent;
    margin: 0;
  }

  &__email {
    font-size: 0.78rem;
    color: #aaa;
    margin: 0;
    word-break: break-all;
  }

  &__divider {
    width: 100%;
    height: 1px;
    background: #f0ebe5;
  }

  &__stats {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  &__stat {
    display: flex;
    align-items: center;
    gap: 0.875rem;
    text-align: left;

    i {
      width: 36px;
      height: 36px;
      border-radius: 0.625rem;
      background: rgba($color-accent, 0.08);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.8rem;
      color: $color-accent;
      flex-shrink: 0;
    }

    div {
      display: flex;
      flex-direction: column;
      gap: 0.05rem;
    }

    strong {
      font-size: 0.95rem;
      font-weight: 800;
      color: $color-accent;
    }

    span {
      font-size: 0.7rem;
      color: #bbb;
      text-transform: uppercase;
      letter-spacing: 0.06em;
    }
  }

  &__shop-btn {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    background: $color-accent;
    color: $color-primary;
    border-radius: 0.875rem;
    padding: 0.8rem;
    font-size: 0.875rem;
    font-weight: 700;
    text-decoration: none;
    transition: opacity 0.15s, transform 0.15s;

    &:hover {
      opacity: 0.88;
      transform: translateY(-1px);
    }
  }

  &__logout-btn {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    background: none;
    border: 1.5px solid #e0dcd8;
    border-radius: 0.875rem;
    padding: 0.75rem;
    font-size: 0.85rem;
    font-weight: 600;
    color: #999;
    cursor: pointer;
    font-family: inherit;
    transition: border-color 0.15s, color 0.15s, background 0.15s;

    &:hover {
      border-color: #e53e3e;
      color: #e53e3e;
      background: #fff5f5;
    }
  }
}

// ─── Orders column ───────────────────────────────────────────────
.mp-orders-col { display: flex; flex-direction: column; gap: 1.5rem; }

.mp-orders-count {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.78rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.09em;
  color: #c0b8b0;
  margin: 0;

  i { font-size: 0.7rem; }
}

.mp-list {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

// ─── Buttons ─────────────────────────────────────────────────────
.mp-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  font-size: 0.875rem;
  font-weight: 700;
  font-family: inherit;
  border: none;
  border-radius: 0.875rem;
  padding: 0.7rem 1.375rem;
  cursor: pointer;
  text-decoration: none;
  transition: opacity 0.15s, transform 0.15s, box-shadow 0.15s;

  &:hover:not(:disabled) {
    opacity: 0.88;
    transform: translateY(-1px);
  }

  &:disabled { opacity: 0.5; cursor: not-allowed; }

  &--primary {
    background: $color-accent;
    color: $color-primary;
    box-shadow: 0 4px 14px rgba($color-accent, 0.28);
  }

  &--track {
    background: rgba($color-accent, 0.08);
    color: $color-accent;
    font-size: 0.825rem;
    padding: 0.6rem 1.125rem;
  }

  &--gold {
    background: $color-primary;
    color: $color-accent;
    font-size: 1rem;
    padding: 0.9rem 2rem;
    box-shadow: 0 4px 18px rgba($color-primary, 0.4);
    border-radius: 999px;
  }
}

// ─── States ──────────────────────────────────────────────────────
.mp-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  min-height: 260px;
  color: #aaa;
  text-align: center;
  background: $white;
  border-radius: 1.5rem;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);

  p { margin: 0; font-size: 0.95rem; }

  &--error { color: #c53030; }

  &__spinner {
    width: 56px;
    height: 56px;
    border-radius: 50%;
    background: #f5f2ee;
    display: flex;
    align-items: center;
    justify-content: center;
    i { font-size: 1.4rem; color: $color-accent; }
  }

  &__icon {
    width: 56px;
    height: 56px;
    border-radius: 50%;
    background: #f5f2ee;
    display: flex;
    align-items: center;
    justify-content: center;
    i { font-size: 1.4rem; color: #ccc; }

    .mp-state--error & {
      background: #fff5f5;
      i { color: #c53030; }
    }
  }
}

// ─── Empty state ─────────────────────────────────────────────────
.mp-empty {
  background: $white;
  border-radius: 1.5rem;
  overflow: hidden;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.07);
  display: grid;
  grid-template-columns: 1fr;

  @include respond-to('md') {
    grid-template-columns: 1fr 1fr;
    min-height: 360px;
  }

  &__img-wrap {
    position: relative;
    min-height: 220px;

    @include respond-to('md') { min-height: unset; }
  }

  &__img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  &__img-overlay {
    position: absolute;
    inset: 0;
    background: linear-gradient(to right, transparent 60%, $white);

    @include respond-to('md') {
      background: linear-gradient(to right, transparent 70%, $white);
    }
  }

  &__content {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    justify-content: center;
    gap: 1rem;
    padding: 2.5rem 2rem;
  }

  &__icon {
    width: 52px;
    height: 52px;
    border-radius: 1rem;
    background: rgba($color-accent, 0.08);
    display: flex;
    align-items: center;
    justify-content: center;
    i { font-size: 1.2rem; color: $color-accent; }
  }

  h3 {
    font-size: 1.2rem;
    font-weight: 900;
    color: $color-accent;
    margin: 0;
    letter-spacing: -0.02em;
  }

  p {
    font-size: 0.88rem;
    color: #aaa;
    margin: 0;
    line-height: 1.55;
  }
}

// ─── Order card ──────────────────────────────────────────────────
.ocard {
  background: $white;
  border-radius: 1.375rem;
  overflow: hidden;
  box-shadow: 0 3px 16px rgba(0, 0, 0, 0.07);
  display: grid;
  grid-template-columns: 1fr;
  transition: box-shadow 0.2s, transform 0.2s;

  @include respond-to('sm') {
    grid-template-columns: 200px 1fr;
  }

  @include respond-to('md') {
    grid-template-columns: 240px 1fr;
  }

  &:hover {
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
    transform: translateY(-2px);
  }

  &--negative {
    border-left: 4px solid #feb2b2;
  }

  // ── Thumbnail ──
  &__thumb {
    position: relative;
    min-height: 180px;

    @include respond-to('sm') { min-height: unset; }

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
      min-height: 180px;
    }

    &-overlay {
      position: absolute;
      inset: 0;
      background: linear-gradient(
        180deg,
        rgba($color-accent, 0.2) 0%,
        rgba($color-accent, 0.05) 50%,
        rgba(0, 0, 0, 0.35) 100%
      );
    }
  }

  // ── Status badge ──
  &__badge {
    position: absolute;
    top: 0.75rem;
    left: 0.75rem;
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    padding: 0.3rem 0.75rem;
    border-radius: 999px;
    font-size: 0.68rem;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    backdrop-filter: blur(4px);

    i { font-size: 0.6rem; }

    &--pending  { background: rgba(#fefcbf, 0.9); color: #744210; }
    &--approved { background: rgba(#c6f6d5, 0.9); color: #22543d; }
    &--preparing{ background: rgba(#bee3f8, 0.9); color: #2a4365; }
    &--ready    { background: rgba(#e9d8fd, 0.9); color: #44337a; }
    &--delivered{ background: rgba(#c6f6d5, 0.9); color: #22543d; }
    &--rejected { background: rgba(#fed7d7, 0.9); color: #742a2a; }
    &--cancelled{ background: rgba(#e2e8f0, 0.9); color: #4a5568; }
  }

  // ── Body ──
  &__body {
    display: flex;
    flex-direction: column;
    gap: 0;
    padding: 0;
  }

  &__meta {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    padding: 1.125rem 1.5rem 0.875rem;
    border-bottom: 1px solid #f3f0ec;
  }

  &__date-group {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: #ccc;
    font-size: 0.8rem;

    i { font-size: 0.85rem; flex-shrink: 0; }

    div { display: flex; flex-direction: column; gap: 0.05rem; }
  }

  &__date {
    font-size: 0.85rem;
    font-weight: 700;
    color: $color-accent;
    display: block;
    line-height: 1.2;
  }

  &__time {
    font-size: 0.72rem;
    color: #c0b8b0;
    display: block;
  }

  &__total-pill {
    font-size: 1rem;
    font-weight: 900;
    color: $color-accent;
    font-family: $font-secondary;
    background: rgba($color-accent, 0.06);
    border-radius: 999px;
    padding: 0.25rem 0.875rem;
    white-space: nowrap;
  }

  // ── Timeline ──
  &__timeline {
    display: flex;
    align-items: flex-start;
    padding: 1rem 1.5rem;
    background: #faf8f5;
    border-bottom: 1px solid #f3f0ec;
    overflow-x: auto;
    scrollbar-width: none;
    &::-webkit-scrollbar { display: none; }
  }

  &__step {
    display: flex;
    flex-direction: column;
    align-items: center;
    position: relative;
    flex: 1;
    min-width: 54px;
  }

  &__step-dot {
    width: 9px;
    height: 9px;
    border-radius: 50%;
    background: #ddd;
    border: 2px solid #ddd;
    z-index: 1;
    transition: background 0.2s, border-color 0.2s, transform 0.2s;
    flex-shrink: 0;
  }

  &__step--done &__step-dot {
    background: $color-accent;
    border-color: $color-accent;
  }

  &__step--current &__step-dot {
    background: $color-primary;
    border-color: $color-accent;
    box-shadow: 0 0 0 4px rgba($color-accent, 0.12);
    transform: scale(1.35);
  }

  &__step-label {
    font-size: 0.58rem;
    font-weight: 600;
    color: #ccc;
    text-align: center;
    margin-top: 0.3rem;
    white-space: nowrap;
    line-height: 1.2;
  }

  &__step--done &__step-label { color: #999; }

  &__step--current &__step-label {
    color: $color-accent;
    font-weight: 800;
  }

  &__step-line {
    position: absolute;
    top: 3.5px;
    left: 50%;
    width: 100%;
    height: 2px;
    background: #e8e4df;
    z-index: 0;
  }

  &__step--done &__step-line { background: $color-accent; }

  // ── Negative banner ──
  &__neg-banner {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1.5rem;
    background: #fff5f5;
    border-bottom: 1px solid #fed7d7;
    font-size: 0.82rem;
    font-weight: 700;
    color: #c53030;

    i { font-size: 0.85rem; }
  }

  // ── Items ──
  &__items {
    list-style: none;
    margin: 0;
    padding: 0.875rem 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 0.45rem;
    flex: 1;
  }

  &__item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.85rem;
  }

  &__item-qty {
    font-size: 0.75rem;
    font-weight: 800;
    color: $color-primary;
    background: $color-accent;
    border-radius: 0.375rem;
    padding: 0.1rem 0.4rem;
    flex-shrink: 0;
    min-width: 24px;
    text-align: center;
  }

  &__item-name {
    flex: 1;
    color: #666;
    font-weight: 500;
    line-height: 1.35;
  }

  &__item-flavors {
    display: block;
    margin-top: 2px;
    color: #999;
    font-weight: 400;
    font-size: 0.78rem;
    line-height: 1.3;
  }

  &__scheduled {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    margin-bottom: 0.6rem;
    padding: 0.28rem 0.65rem;
    border-radius: $border-radius-pill;
    background: rgba($color-primary, 0.45);
    color: $color-accent;
    font-size: 0.75rem;
    font-weight: 700;
    text-transform: capitalize;

    i { color: $color-secondary; font-size: 0.72rem; }
  }

  &__item-price {
    font-weight: 800;
    color: $color-accent;
    white-space: nowrap;
    font-family: $font-secondary;
    font-size: 0.82rem;
  }

  // ── Footer ──
  &__foot {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    flex-wrap: wrap;
    padding: 1rem 1.5rem 1.25rem;
    border-top: 2px solid #f3f0ec;
    background: #faf8f5;
    border-radius: 0 0 1.375rem 0;
  }

  &__total {
    display: flex;
    flex-direction: column;
    gap: 0.05rem;

    span {
      font-size: 0.65rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #c0b8b0;
    }

    strong {
      font-size: 1.35rem;
      font-weight: 900;
      color: $color-accent;
      letter-spacing: -0.02em;
      font-family: $font-secondary;
      line-height: 1;
    }
  }
}

// ─── Guest view ──────────────────────────────────────────────────
.mp-guest {
  display: flex;
  flex-direction: column;
  gap: 2rem;

  @include respond-to('lg') {
    flex-direction: row;
    align-items: flex-start;
  }
}

.mp-guest__promo {
  position: relative;
  border-radius: 1.75rem;
  overflow: hidden;
  background-size: cover;
  background-position: center;
  min-height: 420px;
  display: flex;
  align-items: flex-end;

  @include respond-to('lg') {
    flex: 0 0 380px;
    min-height: 500px;
    align-items: center;
  }
}

.mp-guest__promo-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    170deg,
    rgba($color-accent, 0.55) 0%,
    rgba($color-accent, 0.92) 70%
  );
}

.mp-guest__promo-content {
  position: relative;
  z-index: 1;
  padding: 2.5rem 2rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  width: 100%;
}

.mp-guest__logo {
  height: 48px;
  width: auto;
}

.mp-guest__promo-title {
  font-size: 1.6rem;
  font-weight: 900;
  color: $white;
  margin: 0;
  letter-spacing: -0.02em;
  line-height: 1.15;
}

.mp-guest__promo-sub {
  font-size: 0.88rem;
  color: rgba($white, 0.72);
  margin: 0;
  line-height: 1.55;
}

.mp-guest__feats {
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
}

.mp-guest__feat {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  color: rgba($white, 0.85);
  font-size: 0.85rem;
  font-weight: 500;

  i {
    width: 30px;
    height: 30px;
    border-radius: 0.5rem;
    background: rgba($color-primary, 0.2);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.72rem;
    color: $color-primary;
    flex-shrink: 0;
  }
}

// ─── Search section ──────────────────────────────────────────────
.mp-search {
  flex: 1;
  background: $white;
  border-radius: 1.75rem;
  padding: 2.25rem 2rem;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.07);
  display: flex;
  flex-direction: column;
  gap: 1.75rem;

  &__header {
    display: flex;
    align-items: flex-start;
    gap: 1.125rem;
  }

  &__icon {
    width: 52px;
    height: 52px;
    border-radius: 1rem;
    background: rgba($color-accent, 0.08);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    i { font-size: 1.1rem; color: $color-accent; }
  }

  &__title {
    font-size: 1.2rem;
    font-weight: 900;
    color: $color-accent;
    margin: 0 0 0.25rem;
  }

  &__sub {
    font-size: 0.85rem;
    color: #aaa;
    margin: 0;
    line-height: 1.4;
  }

  &__form {
    display: flex;
    gap: 0.625rem;
    flex-wrap: wrap;

    @include respond-to('sm') { flex-wrap: nowrap; }
  }

  &__input-wrap {
    position: relative;
    flex: 1;
    display: flex;
    align-items: center;
  }

  &__input-icon {
    position: absolute;
    left: 0.875rem;
    font-size: 0.75rem;
    color: #ccc;
    pointer-events: none;
  }

  input {
    width: 100%;
    padding: 0.8rem 0.875rem 0.8rem 2.25rem;
    border: 1.5px solid #e8e3de;
    border-radius: 0.875rem;
    font-size: 0.9rem;
    font-family: inherit;
    outline: none;
    transition: border-color 0.18s, box-shadow 0.18s;
    color: $color-accent;

    &::placeholder { color: #bbb; }

    &:focus {
      border-color: $color-accent;
      box-shadow: 0 0 0 3px rgba($color-accent, 0.08);
    }
  }
}

// ─── Filter tabs ─────────────────────────────────────────────────
.mp-tabs {
  display: flex;
  gap: 0.375rem;
  flex-wrap: wrap;
  padding: 0.375rem;
  background: $white;
  border-radius: 1rem;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
}

.mp-tab {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.55rem 1rem;
  border-radius: 0.75rem;
  border: none;
  background: none;
  font-size: 0.82rem;
  font-weight: 600;
  font-family: inherit;
  color: #aaa;
  cursor: pointer;
  position: relative;
  transition: background 0.18s, color 0.18s;
  white-space: nowrap;

  i { font-size: 0.72rem; }

  &:hover:not(:disabled) {
    background: rgba($color-accent, 0.06);
    color: $color-accent;
  }

  &:disabled { opacity: 0.5; cursor: not-allowed; }

  &--active {
    background: $color-accent;
    color: $color-primary;

    &:hover { background: $color-accent; color: $color-primary; }
  }

  &__badge {
    position: absolute;
    top: -4px;
    right: -4px;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: #e53e3e;
    color: $white;
    font-size: 0.6rem;
    font-weight: 800;
    display: flex;
    align-items: center;
    justify-content: center;
  }
}

// ─── Payment banner ───────────────────────────────────────────────
.ocard--pending {
  border-top: 3px solid #fed47f;
}

.ocard__pay-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.875rem;
  flex-wrap: wrap;
  padding: 0.875rem 1.5rem;
  background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%);
  border-bottom: 1px solid #fde68a;
}

.ocard__pay-banner-text {
  display: flex;
  align-items: flex-start;
  gap: 0.625rem;

  i {
    font-size: 1rem;
    color: #d97706;
    margin-top: 2px;
    flex-shrink: 0;
  }

  div {
    display: flex;
    flex-direction: column;
    gap: 0.05rem;
  }

  strong {
    font-size: 0.85rem;
    font-weight: 800;
    color: #92400e;
    display: block;
  }

  span {
    font-size: 0.75rem;
    color: #b45309;
  }
}

.ocard__pay-expired {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  font-size: 0.75rem;
  color: #b45309;
  font-weight: 600;
  opacity: 0.8;

  i { font-size: 0.7rem; }
}

.mp-btn--pay {
  background: $color-accent;
  color: $color-primary;
  font-size: 0.85rem;
  font-weight: 800;
  border: none;
  border-radius: 0.75rem;
  padding: 0.6rem 1.25rem;
  cursor: pointer;
  font-family: inherit;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  box-shadow: 0 3px 12px rgba($color-accent, 0.3);
  transition: opacity 0.15s, transform 0.15s;
  white-space: nowrap;
  flex-shrink: 0;

  &:hover {
    opacity: 0.88;
    transform: translateY(-1px);
  }
}
</style>
