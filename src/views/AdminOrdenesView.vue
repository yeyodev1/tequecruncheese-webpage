<script setup lang="ts">
import { ref, reactive, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { VueDraggable } from 'vue-draggable-plus'
import gsap from 'gsap'
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
const searchQ = ref('')
// kept for cancelChange resync flow
const dragging      = ref<AdminOrder | null>(null)
const dragOverCol   = ref<OrderStatus | null>(null)
const dragSourceCol = ref<OrderStatus | null>(null)

// Mobile long-press move sheet
const mobileMoveOrder   = ref<AdminOrder | null>(null)
let longPressTimer: ReturnType<typeof setTimeout> | null = null
let longPressStarted = false

// Status-change confirmation modal
const pendingChange = ref<{ order: AdminOrder; newStatus: OrderStatus; sourceEl?: HTMLElement } | null>(null)
const changeNote = ref('')

// Email form
const emailSubject = ref('')
const emailMessage = ref('')
const emailLoading = ref(false)
const emailSent    = ref(false)

// Keep reactive filters so loadOrders still works (loads all)
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

const KANBAN_COLUMNS: OrderStatus[] = ['approved', 'preparing', 'ready', 'delivered']

// Stage progression order (for determining forward vs. backward)
const STAGE_ORDER: OrderStatus[] = ['approved', 'preparing', 'ready', 'delivered']

const NEXT_STAGES: Partial<Record<OrderStatus, OrderStatus[]>> = {
  approved:  ['preparing'],
  preparing: ['ready', 'approved'],
  ready:     ['delivered', 'preparing'],
  delivered: ['ready'],
}

// Forward-only next stage for card quick-move
const FORWARD_NEXT: Partial<Record<OrderStatus, OrderStatus>> = {
  approved:  'preparing',
  preparing: 'ready',
  ready:     'delivered',
}

// Backward step
const BACK_PREV: Partial<Record<OrderStatus, OrderStatus>> = {
  preparing: 'approved',
  ready:     'preparing',
  delivered: 'ready',
}

// Statuses that trigger an automatic customer email
const EMAIL_STATUSES: OrderStatus[] = ['approved', 'preparing', 'ready', 'delivered', 'cancelled', 'rejected']

// Key stages that require admin confirmation + optional message before changing
const KEY_STAGES: OrderStatus[] = ['ready', 'delivered', 'cancelled', 'rejected']

function isBackward(current: OrderStatus, target: OrderStatus): boolean {
  const ci = STAGE_ORDER.indexOf(current)
  const ti = STAGE_ORDER.indexOf(target)
  return ci >= 0 && ti >= 0 && ti < ci
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatDate(iso: string) {
  return new Date(iso).toLocaleString('es-EC', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'ahora'
  if (mins < 60) return `hace ${mins}m`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `hace ${hrs}h`
  const days = Math.floor(hrs / 24)
  return `hace ${days}d`
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

// ─── VueDraggable column arrays ───────────────────────────────────────────────
const colArrays = ref<Record<string, AdminOrder[]>>({
  approved: [], preparing: [], ready: [], delivered: [],
})

function syncColArrays() {
  const q = searchQ.value.trim().toLowerCase()
  KANBAN_COLUMNS.forEach(s => {
    colArrays.value[s] = orders.value.filter(o => {
      if (o.status !== s) return false
      if (!q) return true
      return (
        o.customerEmail.toLowerCase().includes(q) ||
        (o.customerName ?? '').toLowerCase().includes(q)
      )
    })
  })
}

watch([orders, searchQ], syncColArrays, { deep: true })

// ─── Order detail ─────────────────────────────────────────────────────────────
function openOrder(order: AdminOrder) {
  selectedOrder.value = { ...order }
  noteText.value = ''
  emailSubject.value = ''
  emailMessage.value = ''
  emailSent.value = false
}

function closeOrder() {
  selectedOrder.value = null
}

function printOrder() {
  window.print()
}

// ─── Status change (works from drawer + drag-drop + quick-move) ───────────────
// ─── Card flight animation (GSAP) ────────────────────────────────────────────
function flyCardTo(sourceEl: HTMLElement, targetStatus: OrderStatus) {
  const targetCol = document.querySelector(`[data-col="${targetStatus}"] .kanban__col-body`)
  if (!targetCol) return

  const src = sourceEl.getBoundingClientRect()
  const dst = targetCol.getBoundingClientRect()
  const goingForward = !isBackward(
    (sourceEl.closest('[data-col]') as HTMLElement | null)?.dataset.col as OrderStatus ?? targetStatus,
    targetStatus,
  )

  // Clone card and position it fixed over the source
  const clone = sourceEl.cloneNode(true) as HTMLElement
  Object.assign(clone.style, {
    position: 'fixed',
    left: `${src.left}px`,
    top: `${src.top}px`,
    width: `${src.width}px`,
    margin: '0',
    zIndex: '9999',
    pointerEvents: 'none',
    boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
  })
  document.body.appendChild(clone)

  gsap.to(clone, {
    x: dst.left + 12 - src.left,
    y: dst.top + 16 - src.top,
    scale: 0.82,
    rotation: goingForward ? 4 : -4,
    opacity: 0,
    duration: 0.48,
    ease: 'power2.in',
    onComplete: () => { if (document.body.contains(clone)) document.body.removeChild(clone) },
  })
}

// Flash "arrived" on the card once it lands in the new column
async function flashArrived(orderId: string) {
  await nextTick()
  await nextTick() // two ticks: first for colArrays sync, second for DOM paint
  const el = document.querySelector(`[data-order-id="${orderId}"]`) as HTMLElement | null
  if (!el) return
  el.classList.add('kanban__card--arrived')
  el.addEventListener('animationend', () => el.classList.remove('kanban__card--arrived'), { once: true })
}

async function changeStatus(order: AdminOrder, newStatus: OrderStatus, note?: string) {
  statusLoading.value = true
  try {
    const updated = await adminService.updateStatus(order._id, newStatus, note)
    const idx = orders.value.findIndex((o) => o._id === updated._id)
    if (idx !== -1) orders.value[idx] = updated
    if (selectedOrder.value?._id === updated._id) {
      selectedOrder.value = updated
    }
    void flashArrived(updated._id)
  } catch {
    alert('No se pudo actualizar el estado.')
    syncColArrays()
  } finally {
    statusLoading.value = false
  }
}

// ─── Status change request ────────────────────────────────────────────────────
function requestStatusChange(order: AdminOrder, newStatus: OrderStatus, sourceEl?: HTMLElement) {
  if (order.status === newStatus) return
  if (KEY_STAGES.includes(newStatus)) {
    changeNote.value = ''
    pendingChange.value = { order, newStatus, sourceEl }
  } else {
    if (sourceEl) flyCardTo(sourceEl, newStatus)
    void changeStatus(order, newStatus)
  }
}

// Wrapper for template buttons — captures the card DOM element
function moveCard(e: MouseEvent, order: AdminOrder, newStatus: OrderStatus) {
  const cardEl = (e.currentTarget as HTMLElement).closest('.kanban__card') as HTMLElement | null
  requestStatusChange(order, newStatus, cardEl ?? undefined)
}

async function confirmChange() {
  if (!pendingChange.value) return
  const { order, newStatus, sourceEl } = pendingChange.value
  const note = changeNote.value.trim() || undefined
  pendingChange.value = null
  changeNote.value = ''
  if (sourceEl) flyCardTo(sourceEl, newStatus)
  await changeStatus(order, newStatus, note)
}

function cancelChange() {
  pendingChange.value = null
  changeNote.value = ''
  dragging.value = null
  dragSourceCol.value = null
  dragOverCol.value = null
  // Resync VueDraggable column arrays to undo optimistic DOM move
  syncColArrays()
}

// ─── VueDraggable cross-column drop ───────────────────────────────────────────
function onCardAdded(event: { item: HTMLElement }, targetStatus: OrderStatus) {
  const orderId = event.item.dataset.orderId
  const order = orders.value.find(o => o._id === orderId)
  if (!order || order.status === targetStatus) return
  requestStatusChange(order, targetStatus)
}

// Drawer-specific wrapper (uses selectedOrder)
function changeStatusFromDrawer(newStatus: OrderStatus) {
  if (!selectedOrder.value) return
  requestStatusChange(selectedOrder.value, newStatus)
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

async function submitEmail() {
  if (!selectedOrder.value || !emailSubject.value.trim() || !emailMessage.value.trim()) return
  emailLoading.value = true
  try {
    const updated = await adminService.sendEmail(
      selectedOrder.value._id,
      emailSubject.value,
      emailMessage.value,
    )
    selectedOrder.value = updated
    emailSubject.value = ''
    emailMessage.value = ''
    emailSent.value = true
    setTimeout(() => { emailSent.value = false }, 3500)
    const idx = orders.value.findIndex((o) => o._id === updated._id)
    if (idx !== -1) orders.value[idx] = updated
  } catch {
    alert('No se pudo enviar el correo.')
  } finally {
    emailLoading.value = false
  }
}

// ─── Drag & Drop handled by VueDraggable (see onCardAdded) ───────────────────

// ─── Mobile long-press → move sheet ──────────────────────────────────────────
function onCardPointerDown(e: PointerEvent, order: AdminOrder) {
  if (e.pointerType === 'mouse') return   // desktop uses drag
  longPressStarted = false
  longPressTimer = setTimeout(() => {
    longPressStarted = true
    navigator.vibrate?.(40)
    mobileMoveOrder.value = order
  }, 500)
}

function onCardPointerUp(e: PointerEvent, order: AdminOrder) {
  if (e.pointerType === 'mouse') return
  if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null }
  if (!longPressStarted) {
    // short tap → open drawer
    openOrder(order)
  }
  longPressStarted = false
}

function onCardPointerMove() {
  // Cancel long-press if finger moved
  if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null }
}

function mobileMoveTo(status: OrderStatus) {
  if (!mobileMoveOrder.value) return
  const order = mobileMoveOrder.value
  mobileMoveOrder.value = null
  requestStatusChange(order, status)
}

onMounted(async () => {
  await loadOrders()
  syncColArrays()
})

onBeforeUnmount(() => {
  document.body.classList.remove('is-dragging')
  if (longPressTimer) clearTimeout(longPressTimer)
})
</script>

<template>
  <div class="admin">
    <!-- Header -->
    <header class="admin__header">
      <div class="admin__header-left">
        <img
          class="admin__logo"
          src="https://res.cloudinary.com/dvq6znk71/image/upload/f_auto,q_auto/tequecruncheese/logos/logo-small"
          alt="TequeCruncheese"
        />
        <div>
          <h1>Panel de Administración</h1>
          <p>Tequecruncheese</p>
        </div>
      </div>
      <nav class="admin__nav">
        <RouterLink to="/admin/dashboard" class="admin__nav-link">
          <i class="fa-solid fa-receipt"></i> Órdenes
        </RouterLink>
        <RouterLink to="/admin/productos" class="admin__nav-link">
          <i class="fa-solid fa-box-open"></i> Productos
        </RouterLink>
      </nav>
      <button class="admin__logout" @click="logout">
        <i class="fa-solid fa-right-from-bracket"></i>
        Cerrar sesión
      </button>
    </header>

    <!-- Kanban board -->
    <div class="kanban">
      <!-- Top bar: search + refresh -->
      <div class="kanban__topbar">
        <div class="kanban__search-wrap">
          <i class="fa-solid fa-magnifying-glass kanban__search-icon"></i>
          <input
            v-model="searchQ"
            type="text"
            class="kanban__search"
            placeholder="Buscar por correo o nombre..."
          />
          <button v-if="searchQ" class="kanban__search-clear" @click="searchQ = ''">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>
        <button class="kanban__refresh" :class="{ 'kanban__refresh--loading': loading }" @click="loadOrders">
          <i class="fa-solid fa-arrows-rotate" :class="{ 'fa-spin': loading }"></i>
          {{ loading ? 'Cargando...' : 'Actualizar' }}
        </button>
      </div>

      <!-- Error feedback -->
      <div v-if="error" class="kanban__error">
        <i class="fa-solid fa-triangle-exclamation"></i> {{ error }}
      </div>

      <!-- Board -->
      <div class="kanban__board">
        <div
          v-for="colStatus in KANBAN_COLUMNS"
          :key="colStatus"
          :data-col="colStatus"
          class="kanban__col"
          :class="`kanban__col--${STATUS_CONFIG[colStatus].color}`"
        >
          <!-- Column header -->
          <div class="kanban__col-header">
            <span class="kanban__col-dot"></span>
            <span class="kanban__col-label">{{ STATUS_CONFIG[colStatus].label }}</span>
            <span class="kanban__col-badge">{{ colArrays[colStatus]?.length ?? 0 }}</span>
          </div>

          <!-- Cards (VueDraggable cross-column) -->
          <VueDraggable
            v-model="(colArrays as Record<string, any>)[colStatus]"
            :group="{ name: 'orders', pull: true, put: true }"
            :animation="220"
            ghost-class="kanban__card--ghost"
            chosen-class="kanban__card--chosen"
            drag-class="kanban__card--dragging"
            class="kanban__col-body"
            @add="onCardAdded($event, colStatus)"
          >
            <!-- Empty state -->
            <div
              v-if="!colArrays[colStatus]?.length"
              class="kanban__empty"
            >
              <i class="fa-solid fa-inbox"></i>
              <span>Sin órdenes</span>
            </div>

            <!-- Card -->
            <div
              v-for="order in colArrays[colStatus]"
              :key="order._id"
              :data-order-id="order._id"
              class="kanban__card"
              :class="`kanban__card--${STATUS_CONFIG[colStatus].color}`"
              @click="openOrder(order)"
              @pointerdown="onCardPointerDown($event, order)"
              @pointerup="onCardPointerUp($event, order)"
              @pointermove="onCardPointerMove"
              @pointercancel="onCardPointerMove"
            >
              <!-- Drag handle -->
              <span class="kanban__card-handle" title="Arrastra para mover">
                <i class="fa-solid fa-grip-vertical"></i>
              </span>

              <div class="kanban__card-top">
                <span class="kanban__card-email">{{ order.customerEmail }}</span>
                <span class="kanban__card-time">{{ timeAgo(order.createdAt) }}</span>
              </div>
              <div v-if="order.customerName" class="kanban__card-name">
                <i class="fa-solid fa-user"></i> {{ order.customerName }}
              </div>
              <div class="kanban__card-meta">
                <span class="kanban__card-total">${{ order.total.toFixed(2) }}</span>
                <span class="kanban__card-items">{{ order.items.reduce((s: number, i) => s + i.cantidad, 0) }} item(s)</span>
                <span v-if="order.adminNotes?.length" class="kanban__card-notes">
                  <i class="fa-solid fa-note-sticky"></i> {{ order.adminNotes.length }}
                </span>
              </div>

              <!-- Move buttons ← → -->
              <div class="kanban__card-actions" @click.stop @pointerdown.stop>
                <button
                  v-if="BACK_PREV[colStatus]"
                  class="kanban__card-move kanban__card-move--back"
                  :disabled="statusLoading"
                  :title="STATUS_CONFIG[BACK_PREV[colStatus]!].label"
                  @click.stop="moveCard($event, order, BACK_PREV[colStatus]!)"
                >
                  <i class="fa-solid fa-arrow-left"></i>
                </button>
                <button
                  v-if="FORWARD_NEXT[colStatus]"
                  class="kanban__card-move kanban__card-move--fwd"
                  :disabled="statusLoading"
                  @click.stop="moveCard($event, order, FORWARD_NEXT[colStatus]!)"
                >
                  <i class="fa-solid fa-arrow-right"></i>
                  <span class="kanban__card-move-label">{{ STATUS_CONFIG[FORWARD_NEXT[colStatus]!].label }}</span>
                </button>
                <!-- Mobile: explicit "Mover" button -->
                <button
                  class="kanban__card-move kanban__card-move--mobile"
                  @click.stop="mobileMoveOrder = order"
                >
                  <i class="fa-solid fa-arrows-up-down-left-right"></i>
                </button>
              </div>
            </div>
          </VueDraggable>
        </div>
      </div>
    </div>

    <!-- ── Mobile move sheet ─────────────────────────────────────────────────── -->
    <Teleport to="body">
      <Transition name="sheet">
        <div v-if="mobileMoveOrder" class="move-sheet__overlay" @click.self="mobileMoveOrder = null">
          <div class="move-sheet">
            <div class="move-sheet__handle"></div>
            <div class="move-sheet__header">
              <div>
                <p class="move-sheet__sub">Mover pedido de</p>
                <h3>{{ mobileMoveOrder.customerEmail }}</h3>
              </div>
              <button class="move-sheet__close" @click="mobileMoveOrder = null">
                <i class="fa-solid fa-xmark"></i>
              </button>
            </div>
            <div class="move-sheet__body">
              <button
                v-for="colStatus in KANBAN_COLUMNS"
                :key="colStatus"
                class="move-sheet__option"
                :class="[
                  `move-sheet__option--${STATUS_CONFIG[colStatus].color}`,
                  { 'move-sheet__option--current': mobileMoveOrder.status === colStatus },
                ]"
                :disabled="mobileMoveOrder.status === colStatus || statusLoading"
                @click="mobileMoveTo(colStatus)"
              >
                <i class="fa-solid" :class="STATUS_CONFIG[colStatus].icon"></i>
                <span>{{ STATUS_CONFIG[colStatus].label }}</span>
                <i v-if="mobileMoveOrder.status === colStatus" class="fa-solid fa-check move-sheet__check"></i>
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- ── Status-change confirmation modal ──────────────────────────────────── -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="pendingChange" class="scc__overlay" @click.self="cancelChange">
          <div class="scc">
            <div class="scc__header">
              <h3>Cambiar estado del pedido</h3>
              <button class="scc__close" @click="cancelChange">
                <i class="fa-solid fa-xmark"></i>
              </button>
            </div>

            <div class="scc__body">
              <!-- Stage transition arrow -->
              <div class="scc__stages">
                <span class="scc__badge" :class="`scc__badge--${STATUS_CONFIG[pendingChange.order.status]?.color}`">
                  <i class="fa-solid" :class="STATUS_CONFIG[pendingChange.order.status]?.icon"></i>
                  {{ STATUS_CONFIG[pendingChange.order.status]?.label }}
                </span>
                <i class="fa-solid fa-arrow-right scc__arrow"></i>
                <span class="scc__badge" :class="`scc__badge--${STATUS_CONFIG[pendingChange.newStatus]?.color}`">
                  <i class="fa-solid" :class="STATUS_CONFIG[pendingChange.newStatus]?.icon"></i>
                  {{ STATUS_CONFIG[pendingChange.newStatus]?.label }}
                </span>
              </div>

              <!-- Auto-email notice -->
              <div v-if="EMAIL_STATUSES.includes(pendingChange.newStatus)" class="scc__email-note">
                <i class="fa-solid fa-envelope-open-text"></i>
                <div>
                  <strong>Se enviará un correo automático</strong> a
                  <span class="scc__email-addr">{{ pendingChange.order.customerEmail }}</span>
                  notificándole del cambio.
                </div>
              </div>

              <!-- Optional personal note -->
              <div class="scc__note-wrap">
                <label class="scc__note-label">
                  <i class="fa-solid fa-comment-dots"></i>
                  Mensaje para el cliente
                  <span class="scc__note-optional">(opcional)</span>
                </label>
                <textarea
                  v-model="changeNote"
                  class="scc__note-input"
                  rows="3"
                  placeholder="Ej: Tu pedido estará listo en aproximadamente 30 minutos…"
                  autofocus
                ></textarea>
                <span v-if="EMAIL_STATUSES.includes(pendingChange.newStatus)" class="scc__note-hint">
                  <i class="fa-solid fa-circle-info"></i>
                  Si escribes un mensaje, se incluirá en el correo automático.
                </span>
              </div>
            </div>

            <div class="scc__footer">
              <button class="scc__btn scc__btn--cancel" @click="cancelChange">Cancelar</button>
              <button
                class="scc__btn scc__btn--confirm"
                :class="`scc__btn--confirm-${STATUS_CONFIG[pendingChange.newStatus]?.color}`"
                :disabled="statusLoading"
                @click="confirmChange"
              >
                <i v-if="statusLoading" class="fa-solid fa-spinner fa-spin"></i>
                <i v-else class="fa-solid fa-check"></i>
                Confirmar cambio
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Order Detail Drawer -->
    <Teleport to="body">
      <Transition name="drawer">
        <div v-if="selectedOrder" class="admin-drawer__overlay" @click.self="closeOrder">
          <div class="admin-drawer">

            <!-- Header -->
            <div class="admin-drawer__header">
              <div>
                <h2>Detalle del pedido</h2>
                <p>{{ formatDate(selectedOrder.createdAt) }}</p>
              </div>
              <div class="admin-drawer__header-right">
                <span
                  class="admin__badge"
                  :class="`admin__badge--${STATUS_CONFIG[selectedOrder.status]?.color ?? 'gray'}`"
                >
                  <i class="fa-solid" :class="STATUS_CONFIG[selectedOrder.status]?.icon"></i>
                  {{ STATUS_CONFIG[selectedOrder.status]?.label ?? selectedOrder.status }}
                </span>
                <button class="admin-drawer__print-btn" @click="printOrder">
                  <i class="fa-solid fa-print"></i>
                  Imprimir
                </button>
                <button class="admin-drawer__close" @click="closeOrder">
                  <i class="fa-solid fa-xmark"></i>
                </button>
              </div>
            </div>

            <div class="admin-drawer__body">

              <!-- ── Customer info ──────────────────────────────────── -->
              <div class="admin-drawer__section admin-drawer__section--card">
                <h3><i class="fa-solid fa-user-circle"></i> Información del cliente</h3>

                <div class="admin-drawer__info-grid">
                  <div class="admin-drawer__info-row">
                    <i class="fa-solid fa-envelope"></i>
                    <div>
                      <span class="admin-drawer__info-label">Correo</span>
                      <span class="admin-drawer__info-val">{{ selectedOrder.customerEmail }}</span>
                    </div>
                  </div>

                  <div v-if="selectedOrder.customerName" class="admin-drawer__info-row">
                    <i class="fa-solid fa-user"></i>
                    <div>
                      <span class="admin-drawer__info-label">Nombre</span>
                      <span class="admin-drawer__info-val">{{ selectedOrder.customerName }}</span>
                    </div>
                  </div>

                  <div v-if="selectedOrder.customerPhone" class="admin-drawer__info-row">
                    <i class="fa-solid fa-phone"></i>
                    <div>
                      <span class="admin-drawer__info-label">Teléfono</span>
                      <a :href="`tel:${selectedOrder.customerPhone}`" class="admin-drawer__phone-link">
                        {{ selectedOrder.customerPhone }}
                      </a>
                    </div>
                  </div>

                  <div v-if="selectedOrder.cedula" class="admin-drawer__info-row">
                    <i class="fa-solid fa-id-card"></i>
                    <div>
                      <span class="admin-drawer__info-label">Cédula</span>
                      <span class="admin-drawer__info-val">{{ selectedOrder.cedula }}</span>
                    </div>
                  </div>

                  <!-- Factura -->
                  <div v-if="selectedOrder.quiereFactura" class="admin-drawer__info-row admin-drawer__info-row--factura">
                    <i class="fa-solid fa-file-invoice"></i>
                    <div>
                      <span class="admin-drawer__info-label">
                        Factura solicitada
                        <span class="admin-drawer__factura-badge">SRI</span>
                      </span>
                      <span class="admin-drawer__info-val">{{ selectedOrder.facturaRuc }}
                        <span class="admin-drawer__factura-type">
                          {{ selectedOrder.facturaRuc?.length === 13 ? '· RUC' : '· Cédula' }}
                        </span>
                      </span>
                      <span v-if="selectedOrder.facturaEmail" class="admin-drawer__info-sub">
                        {{ selectedOrder.facturaEmail }}
                      </span>
                    </div>
                  </div>

                  <div v-if="selectedOrder.deliveryAddress?.calle" class="admin-drawer__info-row">
                    <i class="fa-solid fa-location-dot"></i>
                    <div>
                      <span class="admin-drawer__info-label">Dirección</span>
                      <span class="admin-drawer__info-val">
                        {{ selectedOrder.deliveryAddress.calle }}
                        <span v-if="selectedOrder.deliveryAddress.barrio">, {{ selectedOrder.deliveryAddress.barrio }}</span>
                      </span>
                      <span v-if="selectedOrder.deliveryAddress.referencia" class="admin-drawer__info-sub">
                        Ref: {{ selectedOrder.deliveryAddress.referencia }}
                      </span>
                      <a
                        v-if="selectedOrder.deliveryAddress.mapsUrl"
                        :href="selectedOrder.deliveryAddress.mapsUrl"
                        target="_blank"
                        class="admin-drawer__link admin-drawer__maps-link"
                      >
                        <i class="fa-solid fa-map-location-dot"></i> Ver en Maps
                      </a>
                    </div>
                  </div>
                </div>

                <a
                  :href="`/pedido/${selectedOrder.trackingToken}`"
                  target="_blank"
                  class="admin-drawer__link"
                >
                  <i class="fa-solid fa-arrow-up-right-from-square"></i> Ver tracking del cliente
                </a>
              </div>

              <!-- ── Stage change ──────────────────────────────────── -->
              <div class="admin-drawer__section">
                <h3><i class="fa-solid fa-arrows-rotate"></i> Cambiar estado</h3>

                <div v-if="NEXT_STAGES[selectedOrder.status]" class="admin-drawer__stage-grid">
                  <button
                    v-for="next in NEXT_STAGES[selectedOrder.status]"
                    :key="next"
                    class="admin-drawer__stage-btn"
                    :class="[
                      `admin-drawer__stage-btn--${STATUS_CONFIG[next]?.color ?? 'gray'}`,
                      isBackward(selectedOrder.status, next) ? 'admin-drawer__stage-btn--back' : '',
                    ]"
                    :disabled="statusLoading"
                    @click="changeStatusFromDrawer(next)"
                  >
                    <i
                      class="fa-solid"
                      :class="isBackward(selectedOrder.status, next)
                        ? 'fa-rotate-left'
                        : STATUS_CONFIG[next]?.icon"
                    ></i>
                    <span>
                      <span v-if="isBackward(selectedOrder.status, next)" class="admin-drawer__back-label">← Volver a </span>
                      {{ STATUS_CONFIG[next]?.label }}
                    </span>
                  </button>
                </div>
                <p v-else class="admin-drawer__no-notes">
                  Estado final — no hay más cambios disponibles.
                </p>
              </div>

              <!-- ── Items ─────────────────────────────────────────── -->
              <div class="admin-drawer__section">
                <h3><i class="fa-solid fa-bag-shopping"></i> Productos</h3>
                <table class="admin-drawer__items">
                  <tbody>
                    <tr v-for="item in selectedOrder.items" :key="item.slug">
                      <td>{{ item.nombre }}</td>
                      <td class="admin__right admin-drawer__qty">× {{ item.cantidad }}</td>
                      <td class="admin__right admin-drawer__item-price">${{ (item.precio * item.cantidad).toFixed(2) }}</td>
                    </tr>
                    <tr v-if="selectedOrder.deliveryCost" class="admin-drawer__delivery-row">
                      <td colspan="2">
                        <i class="fa-solid fa-truck"></i> Envío
                      </td>
                      <td class="admin__right">${{ selectedOrder.deliveryCost.toFixed(2) }}</td>
                    </tr>
                    <tr class="admin-drawer__total-row">
                      <td colspan="2"><strong>Total</strong></td>
                      <td class="admin__right"><strong>${{ selectedOrder.total.toFixed(2) }}</strong></td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <!-- ── Notes ─────────────────────────────────────────── -->
              <div class="admin-drawer__section">
                <h3><i class="fa-solid fa-note-sticky"></i> Notas internas</h3>
                <div v-if="selectedOrder.adminNotes?.length" class="admin-drawer__notes">
                  <div
                    v-for="(note, i) in selectedOrder.adminNotes"
                    :key="i"
                    class="admin-drawer__note"
                    :class="note.text.startsWith('[EMAIL') ? 'admin-drawer__note--email' : ''"
                  >
                    <p>{{ note.text }}</p>
                    <span>{{ formatDate(note.createdAt) }}</span>
                  </div>
                </div>
                <p v-else class="admin-drawer__no-notes">Sin notas aún.</p>

                <div class="admin-drawer__note-form">
                  <textarea
                    v-model="noteText"
                    placeholder="Agregar una nota interna..."
                    rows="2"
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

              <!-- ── Send email ─────────────────────────────────────── -->
              <div class="admin-drawer__section admin-drawer__section--email">
                <h3><i class="fa-solid fa-paper-plane"></i> Enviar correo al cliente</h3>

                <Transition name="email-ok">
                  <div v-if="emailSent" class="admin-drawer__email-ok">
                    <i class="fa-solid fa-check-circle"></i> ¡Correo enviado con éxito!
                  </div>
                </Transition>

                <div v-if="!emailSent" class="admin-drawer__note-form">
                  <input
                    v-model="emailSubject"
                    type="text"
                    placeholder="Asunto del correo..."
                    class="admin-drawer__note-input admin-drawer__note-input--sm"
                  />
                  <textarea
                    v-model="emailMessage"
                    placeholder="Escribe el mensaje para el cliente..."
                    rows="4"
                    class="admin-drawer__note-input"
                  ></textarea>
                  <button
                    class="admin-drawer__note-btn admin-drawer__note-btn--email"
                    :disabled="emailLoading || !emailSubject.trim() || !emailMessage.trim()"
                    @click="submitEmail"
                  >
                    <i v-if="emailLoading" class="fa-solid fa-spinner fa-spin"></i>
                    <i v-else class="fa-solid fa-envelope"></i>
                    {{ emailLoading ? 'Enviando...' : `Enviar a ${selectedOrder.customerEmail}` }}
                  </button>
                </div>
              </div>

            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style lang="scss" scoped>
// ─── Admin shell ──────────────────────────────────────────────────────────────
.admin {
  min-height: 100vh;
  background: #f7f3ec;
  display: flex;
  flex-direction: column;

  &__header {
    background: $color-accent;
    color: $white;
    padding: 1rem 1.5rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    flex-shrink: 0;
  }

  &__header-left {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  &__logo {
    height: 36px;
    width: auto;
    flex-shrink: 0;
  }

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

  &__nav {
    display: flex;
    gap: 0.25rem;
    margin-right: auto;
  }

  &__nav-link {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.4rem 0.875rem;
    border-radius: 0.5rem;
    font-size: 0.82rem;
    font-weight: 700;
    color: rgba($white, .7);
    text-decoration: none;
    transition: background 0.15s, color 0.15s;

    &:hover {
      background: rgba($white, .1);
      color: $white;
    }

    &.router-link-active {
      background: rgba($white, .15);
      color: $white;
    }
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

  // Status badges (used inside drawer)
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

  &__right { text-align: right; }
}

// ─── Kanban ───────────────────────────────────────────────────────────────────
.kanban {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 1.25rem 1rem 0;
  overflow: hidden;

  // ── Top bar ────────────────────────────────────────────────────────────────
  &__topbar {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-bottom: 1rem;
    flex-shrink: 0;
  }

  &__search-wrap {
    position: relative;
    flex: 1;
    max-width: 380px;
  }

  &__search-icon {
    position: absolute;
    left: 0.75rem;
    top: 50%;
    transform: translateY(-50%);
    color: #aaa;
    font-size: 0.85rem;
    pointer-events: none;
  }

  &__search {
    width: 100%;
    padding: 0.55rem 2.25rem 0.55rem 2.25rem;
    border: 1.5px solid #e0d8cc;
    border-radius: 0.625rem;
    font-size: 0.875rem;
    background: $white;
    outline: none;
    box-sizing: border-box;
    font-family: $font-principal;

    &:focus { border-color: $color-accent; }
  }

  &__search-clear {
    position: absolute;
    right: 0.5rem;
    top: 50%;
    transform: translateY(-50%);
    background: none;
    border: none;
    color: #aaa;
    cursor: pointer;
    font-size: 0.85rem;
    padding: 0.2rem;
    display: flex;
    align-items: center;

    &:hover { color: #666; }
  }

  &__refresh {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.55rem 1rem;
    background: $color-accent;
    color: $color-primary;
    border: none;
    border-radius: 0.625rem;
    font-size: 0.85rem;
    font-weight: 700;
    cursor: pointer;
    font-family: $font-principal;
    transition: opacity 0.15s;

    &:hover { opacity: 0.88; }
    &--loading { opacity: 0.7; cursor: default; }
  }

  &__error {
    background: #fed7d7;
    color: #742a2a;
    border-radius: 0.625rem;
    padding: 0.75rem 1rem;
    font-size: 0.875rem;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.75rem;
    flex-shrink: 0;
  }

  // ── Board ──────────────────────────────────────────────────────────────────
  &__board {
    display: flex;
    gap: 0.875rem;
    overflow-x: auto;
    padding-bottom: 1.5rem;
    flex: 1;
    align-items: flex-start;

    // Custom scrollbar
    scrollbar-width: thin;
    scrollbar-color: #d8cfc3 transparent;

    &::-webkit-scrollbar { height: 6px; }
    &::-webkit-scrollbar-track { background: transparent; }
    &::-webkit-scrollbar-thumb { background: #d8cfc3; border-radius: 3px; }
  }

  // ── Column ─────────────────────────────────────────────────────────────────
  &__col {
    min-width: 280px;
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    border-radius: 0.875rem;
    overflow: hidden;
    background: rgba(255,255,255,0.5);
    border: 2px solid transparent;
    transition: border-color 0.15s, box-shadow 0.15s;

    &--drag-over {
      border-color: $color-accent !important;
      box-shadow: 0 0 0 3px rgba(87, 38, 18, 0.15);
    }

    // Column color variants — border + header bg
    &--yellow { border-color: #d69e2e; .kanban__col-header { background: #fefcbf; } .kanban__col-dot { background: #d69e2e; } }
    &--blue   { border-color: #3182ce; .kanban__col-header { background: #bee3f8; } .kanban__col-dot { background: #3182ce; } }
    &--orange { border-color: #dd6b20; .kanban__col-header { background: #feebc8; } .kanban__col-dot { background: #dd6b20; } }
    &--purple { border-color: #805ad5; .kanban__col-header { background: #e9d8fd; } .kanban__col-dot { background: #805ad5; } }
    &--green  { border-color: #38a169; .kanban__col-header { background: #c6f6d5; } .kanban__col-dot { background: #38a169; } }
    &--red    { border-color: #e53e3e; .kanban__col-header { background: #fed7d7; } .kanban__col-dot { background: #e53e3e; } }
    &--gray   { border-color: #a0aec0; .kanban__col-header { background: #e2e8f0; } .kanban__col-dot { background: #a0aec0; } }
  }

  &__col-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.625rem 0.875rem;
    flex-shrink: 0;
  }

  &__col-dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  &__col-label {
    font-size: 0.78rem;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: #333;
    flex: 1;
  }

  &__col-badge {
    background: rgba(0,0,0,0.12);
    color: #333;
    font-size: 0.72rem;
    font-weight: 700;
    padding: 1px 7px;
    border-radius: 2rem;
  }

  &__col-body {
    padding: 0.625rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    overflow-y: auto;
    min-height: 120px;
    max-height: calc(100vh - 220px);
    scrollbar-width: thin;
    scrollbar-color: #d8cfc3 transparent;
    transition: background 0.2s;

    // Highlight the column when a card is hovering over it (SortableJS adds .sortable-drag-over)
    &.sortable-drag-over,
    &[data-drag-over="true"] {
      background: rgba(49, 130, 206, 0.06);
    }

    &::-webkit-scrollbar { width: 4px; }
    &::-webkit-scrollbar-thumb { background: #d8cfc3; border-radius: 2px; }
  }

  &__empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.4rem;
    padding: 2rem 0;
    color: #bbb;
    font-size: 0.82rem;

    i { font-size: 1.4rem; }
  }

  // ── Card ───────────────────────────────────────────────────────────────────
  &__card {
    background: $white;
    border-radius: 0.625rem;
    padding: 0.75rem 0.875rem;
    border-left: 4px solid transparent;
    cursor: pointer;
    box-shadow: 0 1px 4px rgba(0,0,0,0.07);
    transition: transform 0.12s, box-shadow 0.12s;
    user-select: none;

    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0,0,0,0.12);
    }

    &:active { transform: translateY(0); }

    // Left border colors per status
    &--yellow { border-left-color: #d69e2e; }
    &--blue   { border-left-color: #3182ce; }
    &--orange { border-left-color: #dd6b20; }
    &--purple { border-left-color: #805ad5; }
    &--green  { border-left-color: #38a169; }
    &--red    { border-left-color: #e53e3e; }
    &--gray   { border-left-color: #a0aec0; }

    // VueDraggable states
    &--ghost {
      opacity: 0.35;
      background: #f0f4ff !important;
      border: 2px dashed #3182ce !important;
      box-shadow: none !important;
      transform: none !important;
    }

    &--chosen {
      box-shadow: 0 8px 28px rgba(0,0,0,0.18) !important;
      transform: rotate(1.5deg) scale(1.02) !important;
      z-index: 100;
      cursor: grabbing !important;
    }

    &--dragging {
      opacity: 0.9;
      box-shadow: 0 16px 40px rgba(0,0,0,0.22) !important;
      transform: rotate(1.5deg) scale(1.03) !important;
    }

    // "Pop in" when card lands in new column
    &--arrived {
      animation: cardArrive 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both;
    }
  }

  &__card-top {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 0.5rem;
    margin-bottom: 0.25rem;
  }

  &__card-email {
    font-size: 0.8rem;
    color: #444;
    font-weight: 600;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    flex: 1;
  }

  &__card-time {
    font-size: 0.7rem;
    color: #aaa;
    flex-shrink: 0;
    white-space: nowrap;
  }

  &__card-name {
    font-size: 0.78rem;
    color: #666;
    margin-bottom: 0.375rem;
    display: flex;
    align-items: center;
    gap: 0.3rem;

    i { font-size: 0.68rem; color: #bbb; }
  }

  &__card-meta {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-top: 0.375rem;
  }

  &__card-total {
    font-size: 0.875rem;
    font-weight: 800;
    color: $color-accent;
  }

  &__card-items {
    font-size: 0.72rem;
    color: #888;
    background: #f5f0e8;
    padding: 1px 6px;
    border-radius: 2rem;
  }

  &__card-notes {
    font-size: 0.72rem;
    color: #d69e2e;
    display: flex;
    align-items: center;
    gap: 0.2rem;
  }

  &__card-actions {
    margin-top: 0.625rem;
    padding-top: 0.5rem;
    border-top: 1px solid #f5f0e8;
    display: flex;
    align-items: center;
    gap: 0.3rem;
    flex-wrap: wrap;
  }

  &__card-move {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    font-size: 0.72rem;
    font-weight: 700;
    color: $color-accent;
    background: #fdf8f0;
    border: 1px solid #e8dccf;
    border-radius: 0.375rem;
    padding: 3px 8px;
    cursor: pointer;
    font-family: $font-principal;
    transition: background 0.12s, transform 0.1s, box-shadow 0.1s;

    &:hover:not(:disabled) {
      background: #f5ede0;
      transform: translateY(-1px);
      box-shadow: 0 2px 6px rgba(0,0,0,0.1);
    }
    &:active:not(:disabled) { transform: translateY(0); }
    &:disabled { opacity: 0.45; cursor: not-allowed; }

    // Back button (←) — compact, ghost style
    &--back {
      background: transparent;
      color: #718096;
      border-color: #cbd5e0;
      padding: 3px 7px;
      &:hover:not(:disabled) {
        background: #edf2f7;
        color: #2d3748;
      }
    }

    // Forward button (→) with label
    &--fwd {
      flex: 1;
      justify-content: center;
    }

    // Mobile-only "Mover" icon button — hidden on desktop
    &--mobile {
      display: none;
      background: #f7f3ec;
      border-color: #d8cfc3;

      @media (max-width: 768px) {
        display: inline-flex;
      }
    }
  }

  // ── Drag handle hint (desktop) ──────────────────────────────────────────────
  &__card-handle {
    display: none;
    position: absolute;
    top: 50%;
    left: -18px;
    transform: translateY(-50%);
    color: #ccc;
    font-size: 0.75rem;
    cursor: grab;
    pointer-events: none;

    @media (min-width: 769px) {
      display: block;
    }
  }

  // ── Dragging card ghost ─────────────────────────────────────────────────────
  &__card {
    position: relative; // anchor handle positioning

    &--dragging {
      opacity: 0.3;
      border-style: dashed !important;
      border-left-style: solid !important;
      pointer-events: none;
      box-shadow: none !important;
      transform: none !important;
    }
  }

  // ── Source column dimming ───────────────────────────────────────────────────
  &__col {
    &--drag-source {
      opacity: 0.65;
    }

    // Enhanced drag-over pulse
    &--drag-over {
      animation: col-pulse 0.6s ease-in-out infinite alternate;
    }
  }

  // ── Drop indicator banner ───────────────────────────────────────────────────
  &__drop-indicator {
    margin: 0 0.625rem;
    padding: 0.5rem 0.75rem;
    background: rgba(87, 38, 18, 0.08);
    border: 2px dashed $color-accent;
    border-radius: 0.5rem;
    font-size: 0.78rem;
    font-weight: 700;
    color: $color-accent;
    display: flex;
    align-items: center;
    gap: 0.4rem;
    animation: drop-hint 0.4s ease-out;
    flex-shrink: 0;

    i { font-size: 0.7rem; animation: bounce-down 0.6s ease infinite; }
  }

  // ── Empty drop target ───────────────────────────────────────────────────────
  &__empty {
    &--drop-target {
      border: 2px dashed $color-accent;
      border-radius: 0.5rem;
      background: rgba(87, 38, 18, 0.05);
      color: $color-accent !important;
      animation: col-pulse 0.6s ease-in-out infinite alternate;
    }
  }
}

// ─── Drag cursor (global) ─────────────────────────────────────────────────────
:global(body.is-dragging) {
  cursor: grabbing !important;

  * {
    cursor: grabbing !important;
    user-select: none !important;
  }
}

// ─── Card arrival animation ───────────────────────────────────────────────────
@keyframes cardArrive {
  0%   { opacity: 0; transform: scale(0.75) translateY(12px); box-shadow: 0 20px 40px rgba(0,0,0,0.25); }
  55%  { opacity: 1; transform: scale(1.04) translateY(-4px); box-shadow: 0 8px 20px rgba(0,0,0,0.14); }
  100% { opacity: 1; transform: scale(1) translateY(0);       box-shadow: 0 1px 4px rgba(0,0,0,0.07); }
}

// ─── Drag animations ──────────────────────────────────────────────────────────
@keyframes col-pulse {
  from { box-shadow: 0 0 0 3px rgba(87, 38, 18, 0.12); }
  to   { box-shadow: 0 0 0 6px rgba(87, 38, 18, 0.25); }
}

@keyframes drop-hint {
  from { opacity: 0; transform: translateY(-6px); }
  to   { opacity: 1; transform: translateY(0); }
}

@keyframes bounce-down {
  0%, 100% { transform: translateY(0); }
  50%       { transform: translateY(3px); }
}

// ─── Mobile move sheet ────────────────────────────────────────────────────────
.move-sheet {
  &__overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    z-index: 300;
    display: flex;
    align-items: flex-end;
    justify-content: center;
  }

  background: $white;
  width: 100%;
  max-width: 480px;
  border-radius: 1.25rem 1.25rem 0 0;
  padding: 0 0 env(safe-area-inset-bottom, 1rem);
  box-shadow: 0 -8px 40px rgba(0, 0, 0, 0.18);

  &__handle {
    width: 36px;
    height: 4px;
    background: #ddd;
    border-radius: 2px;
    margin: 0.75rem auto 0;
  }

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.75rem 1.25rem 0.5rem;
    border-bottom: 1px solid #f0ebe3;

    h3 {
      margin: 0;
      font-size: 0.95rem;
      font-weight: 800;
      color: $color-accent;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      max-width: 260px;
    }
  }

  &__sub {
    margin: 0 0 0.1rem;
    font-size: 0.7rem;
    color: #aaa;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  &__close {
    background: #f5f5f5;
    border: none;
    border-radius: 50%;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    color: #666;
    font-size: 0.9rem;
    flex-shrink: 0;
    transition: background 0.15s;

    &:hover { background: #eee; }
  }

  &__body {
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
    padding: 0.875rem 1rem 1rem;
    max-height: 55vh;
    overflow-y: auto;
  }

  &__option {
    display: flex;
    align-items: center;
    gap: 0.625rem;
    padding: 0.75rem 1rem;
    border-radius: 0.625rem;
    border: 2px solid transparent;
    background: #faf8f4;
    font-size: 0.9rem;
    font-weight: 600;
    font-family: $font-principal;
    cursor: pointer;
    text-align: left;
    transition: background 0.12s, border-color 0.12s;

    i { width: 1.1rem; text-align: center; font-size: 0.9rem; }

    &:disabled {
      opacity: 0.45;
      cursor: not-allowed;
    }

    &--current {
      background: #fdf8f0;
      border-color: $color-accent;
      color: $color-accent;
      pointer-events: none;
    }

    &--yellow  { color: #744210; &:not(:disabled):hover { background: #fefcbf; border-color: #d69e2e; } }
    &--blue    { color: #2a4365; &:not(:disabled):hover { background: #bee3f8; border-color: #3182ce; } }
    &--orange  { color: #7b341e; &:not(:disabled):hover { background: #feebc8; border-color: #dd6b20; } }
    &--purple  { color: #44337a; &:not(:disabled):hover { background: #e9d8fd; border-color: #805ad5; } }
    &--green   { color: #22543d; &:not(:disabled):hover { background: #c6f6d5; border-color: #38a169; } }
    &--red     { color: #742a2a; &:not(:disabled):hover { background: #fed7d7; border-color: #e53e3e; } }
    &--gray    { color: #4a5568; &:not(:disabled):hover { background: #e2e8f0; border-color: #a0aec0; } }
  }

  &__check {
    margin-left: auto;
    color: $color-accent;
  }
}

// ─── Sheet slide-up transition ────────────────────────────────────────────────
.sheet-enter-active,
.sheet-leave-active {
  transition: opacity 0.25s ease;

  .move-sheet {
    transition: transform 0.25s cubic-bezier(0.32, 0.72, 0, 1);
  }
}

.sheet-enter-from,
.sheet-leave-to {
  opacity: 0;

  .move-sheet {
    transform: translateY(100%);
  }
}

// ─── Status-change confirm modal (scc) ────────────────────────────────────────
.scc {
  &__overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.55);
    z-index: 400;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1rem;
  }

  background: $white;
  border-radius: 1rem;
  width: 100%;
  max-width: 460px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.22);
  overflow: hidden;

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1.25rem 1.5rem;
    border-bottom: 1px solid #f0ebe3;

    h3 {
      margin: 0;
      font-size: 1rem;
      font-weight: 800;
      color: $color-accent;
    }
  }

  &__close {
    background: #f5f5f5;
    border: none;
    border-radius: 50%;
    width: 30px;
    height: 30px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    color: #666;
    font-size: 0.85rem;
    transition: background 0.15s;
    flex-shrink: 0;

    &:hover { background: #eee; }
  }

  &__body {
    padding: 1.25rem 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  // Stage transition row
  &__stages {
    display: flex;
    align-items: center;
    gap: 0.625rem;
    flex-wrap: wrap;
  }

  &__badge {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    padding: 5px 11px;
    border-radius: 2rem;
    font-size: 0.8rem;
    font-weight: 700;
    white-space: nowrap;

    &--yellow  { background: #fefcbf; color: #744210; }
    &--blue    { background: #bee3f8; color: #2a4365; }
    &--orange  { background: #feebc8; color: #7b341e; }
    &--purple  { background: #e9d8fd; color: #44337a; }
    &--green   { background: #c6f6d5; color: #22543d; }
    &--red     { background: #fed7d7; color: #742a2a; }
    &--gray    { background: #e2e8f0; color: #4a5568; }
  }

  &__arrow {
    color: #bbb;
    font-size: 0.8rem;
    flex-shrink: 0;
  }

  // Email notification notice
  &__email-note {
    display: flex;
    align-items: flex-start;
    gap: 0.625rem;
    background: #ebf8ff;
    border: 1px solid #bee3f8;
    border-radius: 0.625rem;
    padding: 0.75rem 1rem;
    font-size: 0.82rem;
    color: #2a4365;
    line-height: 1.5;

    > i { color: #3182ce; font-size: 1rem; flex-shrink: 0; margin-top: 1px; }
  }

  &__email-addr {
    font-weight: 700;
    word-break: break-all;
  }

  // Note textarea
  &__note-wrap {
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
  }

  &__note-label {
    font-size: 0.8rem;
    font-weight: 700;
    color: #555;
    display: flex;
    align-items: center;
    gap: 0.35rem;

    i { color: $color-accent; }
  }

  &__note-optional {
    font-weight: 400;
    color: #aaa;
    font-size: 0.75rem;
  }

  &__note-input {
    width: 100%;
    padding: 0.625rem 0.75rem;
    border: 1.5px solid #e0d8cc;
    border-radius: 0.5rem;
    font-size: 0.875rem;
    font-family: $font-principal;
    resize: vertical;
    outline: none;
    box-sizing: border-box;
    background: #fdf9f5;
    color: #333;
    transition: border-color 0.15s;

    &:focus { border-color: $color-accent; background: $white; }
  }

  &__note-hint {
    font-size: 0.72rem;
    color: #888;
    display: flex;
    align-items: center;
    gap: 0.3rem;

    i { color: #63b3ed; }
  }

  &__footer {
    padding: 1rem 1.5rem;
    border-top: 1px solid #f0ebe3;
    display: flex;
    justify-content: flex-end;
    gap: 0.75rem;
  }

  &__btn {
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    padding: 0.6rem 1.25rem;
    border-radius: 0.5rem;
    font-size: 0.875rem;
    font-weight: 700;
    font-family: $font-principal;
    cursor: pointer;
    border: none;
    transition: opacity 0.15s, transform 0.1s;

    &:disabled { opacity: 0.5; cursor: not-allowed; }
    &:not(:disabled):active { transform: scale(0.97); }

    &--cancel {
      background: #f5f5f5;
      color: #555;

      &:hover { background: #eee; }
    }

    &--confirm {
      background: $color-accent;
      color: $color-primary;

      &:not(:disabled):hover { opacity: 0.88; }

      // Color variants per target status
      &-blue   { background: #2b6cb0; color: $white; }
      &-orange { background: #c05621; color: $white; }
      &-purple { background: #553c9a; color: $white; }
      &-green  { background: #276749; color: $white; }
      &-red    { background: #c53030; color: $white; }
      &-gray   { background: #4a5568; color: $white; }
    }
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
    flex-shrink: 0;

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

  &__header-right {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    flex-shrink: 0;
  }

  &__print-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    background: rgba(255,255,255,0.18);
    border: 1.5px solid rgba(255,255,255,0.35);
    color: $white;
    height: 2rem;
    padding: 0 0.875rem;
    border-radius: 999px;
    cursor: pointer;
    font-size: 0.78rem;
    font-weight: 700;
    flex-shrink: 0;
    transition: background 0.15s, border-color 0.15s;
    i { font-size: 0.8rem; }
    &:hover { background: rgba(255,255,255,0.3); border-color: rgba(255,255,255,0.6); }
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
    overflow-y: auto;
    flex: 1;
  }

  &__section {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;

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

    &--card {
      background: #fdf8f0;
      border: 1px solid #f0e8d8;
      border-radius: 0.875rem;
      padding: 1rem 1.125rem;
      gap: 0.875rem;
    }

    &--email {
      background: #f0f7ff;
      border: 1px solid #bee3f8;
      border-radius: 0.875rem;
      padding: 1rem 1.125rem;
    }
  }

  &__info-grid {
    display: flex;
    flex-direction: column;
    gap: 0.625rem;
  }

  &__info-row {
    display: flex;
    align-items: flex-start;
    gap: 0.625rem;
    font-size: 0.875rem;

    > i {
      margin-top: 1px;
      color: $color-accent;
      font-size: 0.85rem;
      width: 16px;
      flex-shrink: 0;
    }

    > div {
      display: flex;
      flex-direction: column;
      gap: 1px;
    }

    &--factura {
      background: #f0fff4;
      border: 1px solid #9ae6b4;
      border-radius: 0.625rem;
      padding: 0.625rem 0.75rem;

      > i { color: #2f855a; }
    }
  }

  &__factura-badge {
    display: inline-block;
    background: #2f855a;
    color: #fff;
    font-size: 0.58rem;
    font-weight: 800;
    padding: 1px 5px;
    border-radius: 4px;
    letter-spacing: 0.05em;
    margin-left: 0.3rem;
    vertical-align: middle;
  }

  &__factura-type {
    font-size: 0.75rem;
    color: #2f855a;
    font-weight: 600;
    margin-left: 0.3rem;
  }

  &__info-label {
    font-size: 0.68rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: #aaa;
  }

  &__info-val {
    color: #222;
    font-weight: 600;
    font-size: 0.875rem;
  }

  &__info-sub {
    font-size: 0.78rem;
    color: #888;
  }

  &__phone-link {
    color: $color-accent;
    font-weight: 700;
    text-decoration: none;
    font-size: 0.875rem;

    &:hover { text-decoration: underline; }
  }

  &__maps-link {
    font-size: 0.78rem;
    margin-top: 2px;
  }

  &__link {
    font-size: 0.82rem;
    color: $color-accent;
    text-decoration: none;
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    font-weight: 600;
    margin-top: 0.25rem;

    &:hover { text-decoration: underline; }
  }

  &__stage-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  &__stage-btn {
    padding: 0.5rem 1rem;
    border-radius: 0.625rem;
    border: 2px solid transparent;
    font-size: 0.82rem;
    font-weight: 700;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 0.375rem;
    transition: opacity 0.15s, transform 0.1s;

    &:disabled { opacity: 0.45; cursor: not-allowed; }
    &:not(:disabled):hover { opacity: 0.85; transform: translateY(-1px); }

    &--orange  { background: #feebc8; color: #7b341e; border-color: #f6ad55; }
    &--purple  { background: #e9d8fd; color: #44337a; border-color: #b794f4; }
    &--green   { background: #c6f6d5; color: #22543d; border-color: #68d391; }
    &--blue    { background: #bee3f8; color: #2a4365; border-color: #63b3ed; }
    &--gray    { background: #e2e8f0; color: #4a5568; border-color: #a0aec0; }
    &--red     { background: #fed7d7; color: #742a2a; border-color: #fc8181; }

    &--back {
      opacity: 0.8;
      border-style: dashed;
    }
  }

  &__back-label {
    font-weight: 400;
    opacity: 0.75;
    font-size: 0.75rem;
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

  &__qty {
    color: #888;
    font-size: 0.82rem !important;
  }

  &__item-price {
    font-weight: 700;
    color: $color-accent !important;
  }

  &__delivery-row td {
    border-bottom: none;
    color: #276749;
    font-size: 0.82rem;
    font-weight: 600;
    i { margin-right: 0.3rem; font-size: 0.75rem; }
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
    max-height: 180px;
    overflow-y: auto;
  }

  &__note {
    background: #fdf8f0;
    border-left: 3px solid $color-primary;
    padding: 0.5rem 0.75rem;
    border-radius: 0 0.375rem 0.375rem 0;

    p { margin: 0 0 0.25rem; font-size: 0.875rem; color: #333; }
    span { font-size: 0.72rem; color: #999; }

    &--email {
      background: #f0f7ff;
      border-color: #63b3ed;
    }
  }

  &__no-notes { font-size: 0.85rem; color: #aaa; font-style: italic; margin: 0; }

  &__note-form {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    margin-top: 0.25rem;
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
    background: $white;

    &:focus { border-color: $color-accent; }
    &--sm { resize: none; }
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

    &--email {
      background: #2b6cb0;
      color: $white;
      align-self: stretch;
      justify-content: center;
    }
  }

  &__email-ok {
    background: #c6f6d5;
    color: #22543d;
    border-radius: 0.5rem;
    padding: 0.75rem 1rem;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.875rem;
    font-weight: 700;
  }
}

// ─── Drawer slide-in transition ───────────────────────────────────────────────
.drawer-enter-active,
.drawer-leave-active {
  transition: opacity 0.25s ease;

  .admin-drawer {
    transition: transform 0.25s ease;
  }
}

.drawer-enter-from,
.drawer-leave-to {
  opacity: 0;

  .admin-drawer {
    transform: translateX(100%);
  }
}

// ─── Email ok transition ───────────────────────────────────────────────────────
.email-ok-enter-active, .email-ok-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}
.email-ok-enter-from, .email-ok-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}
</style>

<style>
@media print {
  /* Hide everything except the order drawer */
  body * { visibility: hidden !important; }

  .admin-drawer,
  .admin-drawer * { visibility: visible !important; }

  .admin-drawer {
    position: fixed !important;
    inset: 0 !important;
    width: 100% !important;
    max-width: none !important;
    height: auto !important;
    min-height: 0 !important;
    overflow: visible !important;
    box-shadow: none !important;
    border-radius: 0 !important;
    transform: none !important;
    z-index: 9999 !important;
  }

  .admin-drawer__body {
    overflow: visible !important;
    max-height: none !important;
  }

  /* Hide interactive controls */
  .admin-drawer__close,
  .admin-drawer__print-btn,
  .admin-drawer__section--actions,
  .admin-drawer__section--email,
  .admin-drawer__note-input-row { display: none !important; }
}
</style>
