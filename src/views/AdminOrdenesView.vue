<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { adminService } from '@/services/admin.service'
import type { AdminOrder, OrderStatus } from '@/types'

const router = useRouter()

// ─── State ────────────────────────────────────────────────────────────────────
const orders = ref<AdminOrder[]>([])
const loading = ref(false)
const error = ref('')
const selectedOrder = ref<AdminOrder | null>(null)
const noteText = ref('')
const noteLoading = ref(false)
const statusLoading = ref(false)

const filters = reactive({
  status: '',
  search: '',
  from: '',
  to: '',
})

// ─── Config ───────────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<OrderStatus, { label: string; color: string; icon: string }> = {
  pending:   { label: 'Pago pendiente',    color: 'yellow',  icon: 'fa-clock' },
  approved:  { label: 'Pago confirmado',   color: 'blue',    icon: 'fa-credit-card' },
  preparing: { label: 'En preparación',    color: 'orange',  icon: 'fa-fire-burner' },
  ready:     { label: 'Listo',             color: 'purple',  icon: 'fa-box-open' },
  delivered: { label: 'Entregado',         color: 'green',   icon: 'fa-truck' },
  rejected:  { label: 'Pago rechazado',    color: 'red',     icon: 'fa-circle-xmark' },
  cancelled: { label: 'Cancelado',         color: 'gray',    icon: 'fa-ban' },
}

const NEXT_STAGES: Partial<Record<OrderStatus, OrderStatus[]>> = {
  approved:  ['preparing', 'cancelled'],
  preparing: ['ready', 'cancelled'],
  ready:     ['delivered', 'cancelled'],
}

const ALL_STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'Todos' },
  ...Object.entries(STATUS_CONFIG).map(([k, v]) => ({ value: k, label: v.label })),
]

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatDate(iso: string) {
  return new Date(iso).toLocaleString('es-EC', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function logout() {
  localStorage.removeItem('admin_token')
  router.push('/admin')
}

// ─── Data fetching ────────────────────────────────────────────────────────────
async function loadOrders() {
  loading.value = true
  error.value = ''
  try {
    orders.value = await adminService.listOrders({
      status: filters.status || undefined,
      search: filters.search || undefined,
      from: filters.from || undefined,
      to: filters.to || undefined,
    })
  } catch (e: unknown) {
    const err = e as { status?: number }
    if (err?.status === 401) {
      localStorage.removeItem('admin_token')
      router.push('/admin')
    } else {
      error.value = 'No se pudieron cargar las órdenes.'
    }
  } finally {
    loading.value = false
  }
}

function clearFilters() {
  filters.status = ''
  filters.search = ''
  filters.from = ''
  filters.to = ''
  loadOrders()
}

// ─── Order detail ─────────────────────────────────────────────────────────────
function openOrder(order: AdminOrder) {
  selectedOrder.value = { ...order }
  noteText.value = ''
}

function closeOrder() {
  selectedOrder.value = null
}

async function changeStatus(newStatus: OrderStatus) {
  if (!selectedOrder.value) return
  statusLoading.value = true
  try {
    const updated = await adminService.updateStatus(selectedOrder.value._id, newStatus)
    selectedOrder.value = updated
    const idx = orders.value.findIndex((o) => o._id === updated._id)
    if (idx !== -1) orders.value[idx] = updated
  } catch {
    alert('No se pudo actualizar el estado.')
  } finally {
    statusLoading.value = false
  }
}

async function submitNote() {
  if (!selectedOrder.value || !noteText.value.trim()) return
  noteLoading.value = true
  try {
    const updated = await adminService.addNote(selectedOrder.value._id, noteText.value)
    selectedOrder.value = updated
    noteText.value = ''
    const idx = orders.value.findIndex((o) => o._id === updated._id)
    if (idx !== -1) orders.value[idx] = updated
  } catch {
    alert('No se pudo guardar la nota.')
  } finally {
    noteLoading.value = false
  }
}

onMounted(loadOrders)
</script>

<template>
  <div class="admin">
    <!-- Header -->
    <header class="admin__header">
      <div class="admin__header-left">
        <span class="admin__logo">🧀</span>
        <div>
          <h1>Panel de Administración</h1>
          <p>Tequecruncheese</p>
        </div>
      </div>
      <button class="admin__logout" @click="logout">
        <i class="fa-solid fa-right-from-bracket"></i>
        Cerrar sesión
      </button>
    </header>

    <div class="admin__body">
      <!-- Filters -->
      <div class="admin__filters">
        <select v-model="filters.status" class="admin__filter-select">
          <option v-for="opt in ALL_STATUS_OPTIONS" :key="opt.value" :value="opt.value">
            {{ opt.label }}
          </option>
        </select>

        <input
          v-model="filters.search"
          type="text"
          class="admin__filter-input"
          placeholder="Buscar por correo o ID..."
          @keyup.enter="loadOrders"
        />

        <input v-model="filters.from" type="date" class="admin__filter-date" />
        <span class="admin__filter-sep">→</span>
        <input v-model="filters.to" type="date" class="admin__filter-date" />

        <button class="admin__filter-btn admin__filter-btn--primary" @click="loadOrders">
          <i class="fa-solid fa-magnifying-glass"></i> Buscar
        </button>
        <button class="admin__filter-btn" @click="clearFilters">
          <i class="fa-solid fa-xmark"></i> Limpiar
        </button>
      </div>

      <!-- Stats strip -->
      <div class="admin__stats">
        <div v-for="(cfg, key) in STATUS_CONFIG" :key="key" class="admin__stat" :class="`admin__stat--${cfg.color}`">
          <strong>{{ orders.filter((o) => o.status === key).length }}</strong>
          <span>{{ cfg.label }}</span>
        </div>
      </div>

      <!-- Loading / Error / Empty -->
      <div v-if="loading" class="admin__feedback">
        <i class="fa-solid fa-spinner fa-spin"></i> Cargando órdenes...
      </div>
      <div v-else-if="error" class="admin__feedback admin__feedback--error">
        <i class="fa-solid fa-triangle-exclamation"></i> {{ error }}
      </div>
      <div v-else-if="orders.length === 0" class="admin__feedback">
        <i class="fa-solid fa-inbox"></i> No hay órdenes con ese criterio.
      </div>

      <!-- Table -->
      <div v-else class="admin__table-wrap">
        <table class="admin__table">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Cliente</th>
              <th>Productos</th>
              <th class="admin__right">Total</th>
              <th>Estado</th>
              <th>Notas</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="order in orders"
              :key="order._id"
              class="admin__row"
              @click="openOrder(order)"
            >
              <td class="admin__date">{{ formatDate(order.createdAt) }}</td>
              <td class="admin__email">{{ order.customerEmail }}</td>
              <td>{{ order.items.reduce((s, i) => s + i.cantidad, 0) }} item(s)</td>
              <td class="admin__right admin__total">${{ order.total.toFixed(2) }}</td>
              <td>
                <span
                  class="admin__badge"
                  :class="`admin__badge--${STATUS_CONFIG[order.status]?.color ?? 'gray'}`"
                >
                  <i class="fa-solid" :class="STATUS_CONFIG[order.status]?.icon"></i>
                  {{ STATUS_CONFIG[order.status]?.label ?? order.status }}
                </span>
              </td>
              <td class="admin__notes-count">
                <span v-if="order.adminNotes?.length">
                  <i class="fa-solid fa-note-sticky"></i> {{ order.adminNotes.length }}
                </span>
                <span v-else class="admin__notes-empty">—</span>
              </td>
              <td><i class="fa-solid fa-chevron-right admin__chevron"></i></td>
            </tr>
          </tbody>
        </table>
        <p class="admin__count">{{ orders.length }} orden(es) encontrada(s)</p>
      </div>
    </div>

    <!-- Order Detail Drawer -->
    <Teleport to="body">
      <div v-if="selectedOrder" class="admin-drawer__overlay" @click.self="closeOrder">
        <div class="admin-drawer">
          <div class="admin-drawer__header">
            <div>
              <h2>Detalle del pedido</h2>
              <p>{{ formatDate(selectedOrder.createdAt) }}</p>
            </div>
            <button class="admin-drawer__close" @click="closeOrder">
              <i class="fa-solid fa-xmark"></i>
            </button>
          </div>

          <div class="admin-drawer__body">
            <!-- Customer -->
            <div class="admin-drawer__section">
              <h3><i class="fa-solid fa-user"></i> Cliente</h3>
              <p>{{ selectedOrder.customerEmail }}</p>
              <a
                :href="`/pedido/${selectedOrder.trackingToken}`"
                target="_blank"
                class="admin-drawer__link"
              >
                <i class="fa-solid fa-arrow-up-right-from-square"></i> Ver tracking del cliente
              </a>
            </div>

            <!-- Current status -->
            <div class="admin-drawer__section">
              <h3><i class="fa-solid fa-tag"></i> Estado actual</h3>
              <span
                class="admin__badge admin__badge--lg"
                :class="`admin__badge--${STATUS_CONFIG[selectedOrder.status]?.color ?? 'gray'}`"
              >
                <i class="fa-solid" :class="STATUS_CONFIG[selectedOrder.status]?.icon"></i>
                {{ STATUS_CONFIG[selectedOrder.status]?.label ?? selectedOrder.status }}
              </span>
            </div>

            <!-- Stage actions -->
            <div v-if="NEXT_STAGES[selectedOrder.status]" class="admin-drawer__section">
              <h3><i class="fa-solid fa-arrow-right"></i> Cambiar estado</h3>
              <div class="admin-drawer__actions">
                <button
                  v-for="next in NEXT_STAGES[selectedOrder.status]"
                  :key="next"
                  class="admin-drawer__action-btn"
                  :class="`admin-drawer__action-btn--${STATUS_CONFIG[next]?.color ?? 'gray'}`"
                  :disabled="statusLoading"
                  @click="changeStatus(next)"
                >
                  <i class="fa-solid" :class="STATUS_CONFIG[next]?.icon"></i>
                  {{ STATUS_CONFIG[next]?.label }}
                </button>
              </div>
            </div>

            <!-- Items -->
            <div class="admin-drawer__section">
              <h3><i class="fa-solid fa-list"></i> Productos</h3>
              <table class="admin-drawer__items">
                <tbody>
                  <tr v-for="item in selectedOrder.items" :key="item.slug">
                    <td>{{ item.nombre }}</td>
                    <td class="admin__right">x{{ item.cantidad }}</td>
                    <td class="admin__right">${{ (item.precio * item.cantidad).toFixed(2) }}</td>
                  </tr>
                  <tr class="admin-drawer__total-row">
                    <td colspan="2"><strong>Total</strong></td>
                    <td class="admin__right"><strong>${{ selectedOrder.total.toFixed(2) }}</strong></td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- Notes -->
            <div class="admin-drawer__section">
              <h3><i class="fa-solid fa-note-sticky"></i> Notas internas</h3>
              <div v-if="selectedOrder.adminNotes?.length" class="admin-drawer__notes">
                <div
                  v-for="(note, i) in selectedOrder.adminNotes"
                  :key="i"
                  class="admin-drawer__note"
                >
                  <p>{{ note.text }}</p>
                  <span>{{ formatDate(note.createdAt) }}</span>
                </div>
              </div>
              <p v-else class="admin-drawer__no-notes">Sin notas aún.</p>

              <div class="admin-drawer__note-form">
                <textarea
                  v-model="noteText"
                  placeholder="Agregar una nota..."
                  rows="3"
                  class="admin-drawer__note-input"
                ></textarea>
                <button
                  class="admin-drawer__note-btn"
                  :disabled="noteLoading || !noteText.trim()"
                  @click="submitNote"
                >
                  <i v-if="noteLoading" class="fa-solid fa-spinner fa-spin"></i>
                  <i v-else class="fa-solid fa-paper-plane"></i>
                  {{ noteLoading ? 'Guardando...' : 'Agregar nota' }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style lang="scss" scoped>
// ─── Layout ───────────────────────────────────────────────────────────────────
.admin {
  min-height: 100vh;
  background: #f7f3ec;

  &__header {
    background: $color-accent;
    color: $white;
    padding: 1rem 1.5rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
  }

  &__header-left {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  &__logo { font-size: 1.75rem; }

  &__header-left h1 {
    margin: 0;
    font-size: 1.1rem;
    font-weight: 800;
    color: $color-primary;
  }

  &__header-left p {
    margin: 0;
    font-size: 0.8rem;
    color: rgba(255,255,255,0.6);
  }

  &__logout {
    background: rgba(255,255,255,0.15);
    border: 1px solid rgba(255,255,255,0.3);
    color: $white;
    padding: 0.45rem 1rem;
    border-radius: 0.5rem;
    font-size: 0.85rem;
    font-weight: 600;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 0.4rem;
    transition: background 0.15s;

    &:hover { background: rgba(255,255,255,0.25); }
  }

  &__body {
    max-width: 1200px;
    margin: 0 auto;
    padding: 1.5rem 1rem;
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
  }

  // ─── Filters ────────────────────────────────────────────────────────────────
  &__filters {
    background: $white;
    border-radius: 0.875rem;
    padding: 1rem 1.25rem;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.625rem;
    box-shadow: 0 1px 8px rgba(0,0,0,0.06);
  }

  &__filter-select,
  &__filter-input,
  &__filter-date {
    padding: 0.5rem 0.75rem;
    border: 1.5px solid #e0e0e0;
    border-radius: 0.5rem;
    font-size: 0.875rem;
    outline: none;

    &:focus { border-color: $color-accent; }
  }

  &__filter-input { flex: 1; min-width: 180px; }

  &__filter-sep { color: #888; font-size: 0.85rem; }

  &__filter-btn {
    padding: 0.5rem 1rem;
    border-radius: 0.5rem;
    border: 1.5px solid #e0e0e0;
    background: $white;
    font-size: 0.875rem;
    font-weight: 600;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 0.375rem;
    transition: background 0.15s, border-color 0.15s;

    &:hover { background: #f5f0e8; border-color: $color-accent; }

    &--primary {
      background: $color-accent;
      color: $color-primary;
      border-color: $color-accent;

      &:hover { opacity: 0.88; }
    }
  }

  // ─── Stats ──────────────────────────────────────────────────────────────────
  &__stats {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  &__stat {
    background: $white;
    border-radius: 0.625rem;
    padding: 0.5rem 0.875rem;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.8rem;
    box-shadow: 0 1px 4px rgba(0,0,0,0.06);
    border-left: 3px solid transparent;

    strong { font-size: 1.1rem; font-weight: 800; }

    &--yellow  { border-color: #d69e2e; strong { color: #744210; } }
    &--blue    { border-color: #3182ce; strong { color: #2a4365; } }
    &--orange  { border-color: #dd6b20; strong { color: #7b341e; } }
    &--purple  { border-color: #805ad5; strong { color: #44337a; } }
    &--green   { border-color: #38a169; strong { color: #22543d; } }
    &--red     { border-color: #e53e3e; strong { color: #742a2a; } }
    &--gray    { border-color: #a0aec0; strong { color: #4a5568; } }
  }

  // ─── Feedback ───────────────────────────────────────────────────────────────
  &__feedback {
    padding: 2rem;
    color: #888;
    display: flex;
    align-items: center;
    gap: 0.75rem;
    font-size: 0.95rem;

    &--error { color: #c53030; }
    i { font-size: 1.5rem; }
  }

  // ─── Table ──────────────────────────────────────────────────────────────────
  &__table-wrap {
    background: $white;
    border-radius: 0.875rem;
    overflow: hidden;
    box-shadow: 0 1px 8px rgba(0,0,0,0.07);
  }

  &__table {
    width: 100%;
    border-collapse: collapse;

    th {
      padding: 11px 14px;
      text-align: left;
      font-size: 0.78rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: $color-accent;
      background: $color-primary;
    }

    td {
      padding: 12px 14px;
      font-size: 0.875rem;
      color: #333;
      border-bottom: 1px solid #f5f0e8;
    }
  }

  &__row {
    cursor: pointer;
    transition: background 0.1s;
    &:hover td { background: #fdf8f0; }
    &:last-child td { border-bottom: none; }
  }

  &__date  { color: #666; font-size: 0.82rem !important; white-space: nowrap; }
  &__email { color: #444; font-size: 0.82rem !important; max-width: 180px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  &__right { text-align: right; }
  &__total { font-weight: 700; color: $color-accent !important; }
  &__chevron { color: #ccc; font-size: 0.8rem; }

  &__notes-count {
    font-size: 0.8rem;
    color: #666;
    i { color: #d69e2e; }
  }
  &__notes-empty { color: #ccc; }

  &__count {
    padding: 0.625rem 1rem;
    font-size: 0.78rem;
    color: #888;
    margin: 0;
    border-top: 1px solid #f0ece4;
  }

  // ─── Status Badges ──────────────────────────────────────────────────────────
  &__badge {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    padding: 3px 9px;
    border-radius: 2rem;
    font-size: 0.75rem;
    font-weight: 700;
    white-space: nowrap;

    &--lg { padding: 6px 14px; font-size: 0.875rem; }

    &--yellow  { background: #fefcbf; color: #744210; }
    &--blue    { background: #bee3f8; color: #2a4365; }
    &--orange  { background: #feebc8; color: #7b341e; }
    &--purple  { background: #e9d8fd; color: #44337a; }
    &--green   { background: #c6f6d5; color: #22543d; }
    &--red     { background: #fed7d7; color: #742a2a; }
    &--gray    { background: #e2e8f0; color: #4a5568; }
  }
}

// ─── Drawer ───────────────────────────────────────────────────────────────────
.admin-drawer {
  &__overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.45);
    z-index: 100;
    display: flex;
    justify-content: flex-end;
  }

  background: $white;
  width: 100%;
  max-width: 480px;
  height: 100%;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  box-shadow: -8px 0 32px rgba(0, 0, 0, 0.15);

  &__header {
    background: $color-accent;
    color: $white;
    padding: 1.25rem 1.5rem;
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 1rem;

    h2 {
      margin: 0;
      font-size: 1.1rem;
      font-weight: 800;
      color: $color-primary;
    }

    p {
      margin: 0.2rem 0 0;
      font-size: 0.8rem;
      color: rgba(255,255,255,0.6);
    }
  }

  &__close {
    background: rgba(255,255,255,0.15);
    border: none;
    color: $white;
    width: 2rem;
    height: 2rem;
    border-radius: 50%;
    cursor: pointer;
    font-size: 0.9rem;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    transition: background 0.15s;

    &:hover { background: rgba(255,255,255,0.3); }
  }

  &__body {
    padding: 1.25rem 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  &__section {
    display: flex;
    flex-direction: column;
    gap: 0.625rem;

    h3 {
      font-size: 0.8rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #888;
      margin: 0;
      display: flex;
      align-items: center;
      gap: 0.375rem;
    }

    p { margin: 0; font-size: 0.9rem; color: #333; }
  }

  &__link {
    font-size: 0.82rem;
    color: $color-accent;
    text-decoration: none;
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    font-weight: 600;

    &:hover { text-decoration: underline; }
  }

  &__actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  &__action-btn {
    padding: 0.5rem 1rem;
    border-radius: 0.5rem;
    border: none;
    font-size: 0.85rem;
    font-weight: 700;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 0.375rem;
    transition: opacity 0.15s;

    &:disabled { opacity: 0.5; cursor: not-allowed; }
    &:not(:disabled):hover { opacity: 0.85; }

    &--orange  { background: #feebc8; color: #7b341e; }
    &--purple  { background: #e9d8fd; color: #44337a; }
    &--green   { background: #c6f6d5; color: #22543d; }
    &--gray    { background: #e2e8f0; color: #4a5568; }
    &--red     { background: #fed7d7; color: #742a2a; }
  }

  &__items {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.875rem;

    td {
      padding: 7px 0;
      border-bottom: 1px solid #f5f0e8;
      color: #333;
    }
  }

  &__total-row td {
    border-top: 2px solid #e8e0d4;
    border-bottom: none;
    padding-top: 10px;
    color: $color-accent;
  }

  &__notes {
    display: flex;
    flex-direction: column;
    gap: 0.625rem;
    max-height: 200px;
    overflow-y: auto;
  }

  &__note {
    background: #fdf8f0;
    border-left: 3px solid $color-primary;
    padding: 0.5rem 0.75rem;
    border-radius: 0 0.375rem 0.375rem 0;

    p { margin: 0 0 0.25rem; font-size: 0.875rem; color: #333; }
    span { font-size: 0.72rem; color: #999; }
  }

  &__no-notes { font-size: 0.85rem; color: #aaa; font-style: italic; margin: 0; }

  &__note-form {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    margin-top: 0.5rem;
  }

  &__note-input {
    width: 100%;
    padding: 0.625rem 0.75rem;
    border: 1.5px solid #e0e0e0;
    border-radius: 0.5rem;
    font-size: 0.875rem;
    font-family: inherit;
    resize: vertical;
    outline: none;
    box-sizing: border-box;

    &:focus { border-color: $color-accent; }
  }

  &__note-btn {
    align-self: flex-end;
    background: $color-accent;
    color: $color-primary;
    border: none;
    border-radius: 0.5rem;
    padding: 0.5rem 1.25rem;
    font-size: 0.875rem;
    font-weight: 700;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 0.375rem;
    transition: opacity 0.15s;

    &:disabled { opacity: 0.5; cursor: not-allowed; }
    &:not(:disabled):hover { opacity: 0.88; }
  }
}
</style>
