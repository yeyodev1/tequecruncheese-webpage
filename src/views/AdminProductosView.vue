<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { VueDraggable } from 'vue-draggable-plus'
import { productService, type ProductPayload } from '@/services/product.service'
import { adminService } from '@/services/admin.service'
import type { Product } from '@/types'

const router = useRouter()

// ── Tabs ──────────────────────────────────────────────────────────────────────
const activeTab = ref<'products' | 'categories'>('products')

// ── Products State ────────────────────────────────────────────────────────────
const products   = ref<Product[]>([])
const loading    = ref(false)
const error      = ref('')
const searchQ    = ref('')

// Modal
const showModal  = ref(false)
const editTarget = ref<Product | null>(null)
const saving     = ref(false)
const modalError = ref('')

// Image upload state
const imageFile      = ref<File | null>(null)
const imagePreview   = ref('')
const uploadedUrl    = ref('')
const uploadedPubId  = ref('')
const imageUploading = ref(false)

// Form fields
const form = ref<ProductPayload>({
  slug:        '',
  nombre:      '',
  descripcion: '',
  precio:      0,
  categoria:   '',
  imagen:      { url: '', publicId: '' },
  inStock:     true,
  hasStock:    false,
  stockCount:  0,
  isActive:    true,
  hasFlavors:  false,
  boxSize:     12,
  flavors:     [],
})

// Delete confirm
const deleteTarget = ref<Product | null>(null)
const deleting     = ref(false)

// Reorder
const reordering = ref(false)

// ── Categories State ──────────────────────────────────────────────────────────
const categories     = ref<{ _id: string; name: string }[]>([])
const newCatName     = ref('')
const catCreating    = ref(false)
const showCatCreate  = ref(false)
const catDeleteTarget = ref<{ _id: string; name: string } | null>(null)
const catDeleteReassign = ref('')
const catDeleting    = ref(false)
const catDeleteMode  = ref<'leave' | 'reassign'>('leave')

// ── Computed ──────────────────────────────────────────────────────────────────
const filtered = computed(() => {
  const q = searchQ.value.trim().toLowerCase()
  if (!q) return products.value
  return products.value.filter(p =>
    p.nombre.toLowerCase().includes(q) ||
    p.categoria.toLowerCase().includes(q) ||
    p.slug.toLowerCase().includes(q),
  )
})

function catProductCount(catName: string): number {
  return products.value.filter(p => p.categoria === catName).length
}

const otherCatsForReassign = computed(() =>
  catDeleteTarget.value
    ? categories.value.filter(c => c._id !== catDeleteTarget.value!._id)
    : [],
)

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatPrice(n: number) { return `$${n.toFixed(2)}` }

function logout() {
  localStorage.removeItem('admin_token')
  router.push('/admin')
}

// ── Load ──────────────────────────────────────────────────────────────────────
async function loadProducts() {
  loading.value = true
  error.value = ''
  try {
    products.value = await productService.adminList()
  } catch {
    error.value = 'No se pudieron cargar los productos.'
  } finally {
    loading.value = false
  }
}

async function loadCategories() {
  try {
    categories.value = await adminService.listCategories()
  } catch {
    // non-blocking
  }
}

// ── Modal ─────────────────────────────────────────────────────────────────────
function openCreate() {
  editTarget.value = null
  form.value = {
    slug: '', nombre: '', descripcion: '', precio: 0,
    categoria: '', imagen: { url: '', publicId: '' },
    inStock: true, hasStock: false, stockCount: 0, isActive: true,
    hasFlavors: false, boxSize: 12, flavors: [],
  }
  imagePreview.value = ''
  uploadedUrl.value = ''
  uploadedPubId.value = ''
  imageFile.value = null
  modalError.value = ''
  showModal.value = true
}

function openEdit(p: Product) {
  editTarget.value = p
  form.value = {
    slug:        '',
    nombre:      p.nombre,
    descripcion: p.descripcion,
    precio:      p.precio,
    categoria:   p.categoria,
    imagen:      { url: p.imagen?.url ?? '', publicId: p.imagen?.publicId ?? '' },
    inStock:     p.inStock,
    hasStock:    p.hasStock,
    stockCount:  p.stockCount,
    isActive:    p.isActive,
    hasFlavors:  p.hasFlavors ?? false,
    boxSize:     p.boxSize ?? 12,
    flavors:     p.flavors ? p.flavors.map(f => ({ ...f })) : [],
  }
  imagePreview.value = p.imagen?.url ?? ''
  uploadedUrl.value  = p.imagen?.url ?? ''
  uploadedPubId.value = p.imagen?.publicId ?? ''
  imageFile.value = null
  modalError.value = ''
  showModal.value = true
}

function closeModal() {
  showModal.value = false
}

// ── Image upload/remove ───────────────────────────────────────────────────────
async function onFileChange(e: Event) {
  const input = e.target as HTMLInputElement
  const file  = input.files?.[0]
  if (!file) return

  if (uploadedPubId.value) {
    try { await productService.deleteImage(uploadedPubId.value) } catch {}
    uploadedUrl.value   = ''
    uploadedPubId.value = ''
  }

  imageFile.value    = file
  imagePreview.value = URL.createObjectURL(file)
  modalError.value   = ''

  imageUploading.value = true
  try {
    const result = await productService.uploadImage(file)
    uploadedUrl.value   = result.url
    uploadedPubId.value = result.publicId
    form.value.imagen   = { url: result.url, publicId: result.publicId }
    imageFile.value     = null
    input.value = ''
  } catch {
    modalError.value   = 'Error al subir la imagen. Intenta de nuevo.'
    imagePreview.value = ''
    imageFile.value    = null
  } finally {
    imageUploading.value = false
  }
}

async function removeImage() {
  if (!uploadedPubId.value) {
    imagePreview.value = ''
    form.value.imagen  = { url: '', publicId: '' }
    return
  }
  imageUploading.value = true
  try {
    await productService.deleteImage(uploadedPubId.value)
  } catch {
    // best-effort
  } finally {
    imageUploading.value = false
  }
  uploadedUrl.value   = ''
  uploadedPubId.value = ''
  imagePreview.value  = ''
  form.value.imagen   = { url: '', publicId: '' }
}

// ── Save ──────────────────────────────────────────────────────────────────────
async function save() {
  if (imageUploading.value) return

  saving.value     = true
  modalError.value = ''
  try {
    if (editTarget.value?._id) {
      const updated = await productService.update(editTarget.value._id, form.value)
      const idx = products.value.findIndex(p => p._id === editTarget.value!._id)
      if (idx !== -1) products.value[idx] = updated
    } else {
      const created = await productService.create(form.value)
      products.value.unshift(created)
    }
    closeModal()
  } catch (err: unknown) {
    const e = err as { message?: string }
    modalError.value = e.message ?? 'Error al guardar el producto.'
  } finally {
    saving.value = false
  }
}

// ── Delete product ────────────────────────────────────────────────────────────
function confirmDelete(p: Product) {
  deleteTarget.value = p
}

async function doDelete() {
  if (!deleteTarget.value?._id) return
  deleting.value = true
  try {
    await productService.remove(deleteTarget.value._id)
    products.value = products.value.filter(p => p._id !== deleteTarget.value!._id)
    deleteTarget.value = null
  } catch {
    alert('No se pudo eliminar el producto.')
  } finally {
    deleting.value = false
  }
}

// ── Reorder ───────────────────────────────────────────────────────────────────
async function onReorder() {
  if (searchQ.value) return
  reordering.value = true
  try {
    const order = products.value.map((p, i) => ({ _id: p._id!, sortOrder: i }))
    await productService.reorder(order)
  } catch {
    // silent — visual order already updated
  } finally {
    reordering.value = false
  }
}

// ── Toggle active ─────────────────────────────────────────────────────────────
async function toggleActive(p: Product) {
  if (!p._id) return
  const newVal = !p.isActive
  try {
    const updated = await productService.update(p._id, { isActive: newVal })
    const idx = products.value.findIndex(x => x._id === p._id)
    if (idx !== -1) products.value[idx] = updated
  } catch {
    alert('No se pudo actualizar el estado.')
  }
}

// ── Flavor management ─────────────────────────────────────────────────────────
function addFlavor() {
  form.value.flavors = [...(form.value.flavors ?? []), { nombre: '', grupo: 'normal', isActive: true, limite: 0 }]
}

function removeFlavor(i: number) {
  form.value.flavors = (form.value.flavors ?? []).filter((_, idx) => idx !== i)
}

// ── Category CRUD ─────────────────────────────────────────────────────────────
async function createCategory() {
  const name = newCatName.value.trim()
  if (!name) return
  catCreating.value = true
  try {
    const created = await adminService.createCategory(name)
    categories.value.push(created)
    newCatName.value = ''
    showCatCreate.value = false
  } catch {
    alert('No se pudo crear la categoría.')
  } finally {
    catCreating.value = false
  }
}

function openCatDelete(cat: { _id: string; name: string }) {
  catDeleteTarget.value = cat
  catDeleteReassign.value = ''
  catDeleteMode.value = 'leave'
}

async function doDeleteCategory() {
  if (!catDeleteTarget.value) return
  catDeleting.value = true
  try {
    const reassignTo = catDeleteMode.value === 'reassign' && catDeleteReassign.value
      ? catDeleteReassign.value
      : undefined
    await adminService.deleteCategory(catDeleteTarget.value._id, reassignTo)
    categories.value = categories.value.filter(c => c._id !== catDeleteTarget.value!._id)
    catDeleteTarget.value = null
    // Reload products so counts update
    await loadProducts()
  } catch {
    alert('No se pudo eliminar la categoría.')
  } finally {
    catDeleting.value = false
  }
}

onMounted(() => {
  loadProducts()
  loadCategories()
})
</script>

<template>
  <div class="ap">
    <!-- ── Header ─────────────────────────────────────────────────────────── -->
    <header class="ap__header">
      <div class="ap__header-left">
        <img
          class="ap__logo"
          src="https://res.cloudinary.com/dvq6znk71/image/upload/f_auto,q_auto/tequecruncheese/logos/logo-small"
          alt="TequeCruncheese"
        />
        <div>
          <h1>Panel de Administración</h1>
          <p>Tequecruncheese</p>
        </div>
      </div>
      <nav class="ap__nav">
        <RouterLink to="/admin/dashboard" class="ap__nav-link">
          <i class="fa-solid fa-receipt"></i> Órdenes
        </RouterLink>
        <RouterLink to="/admin/productos" class="ap__nav-link ap__nav-link--active">
          <i class="fa-solid fa-box-open"></i> Productos
        </RouterLink>
      </nav>
      <button class="ap__logout" @click="logout">
        <i class="fa-solid fa-right-from-bracket"></i>
        Cerrar sesión
      </button>
    </header>

    <!-- ── Body ──────────────────────────────────────────────────────────── -->
    <div class="ap__body">

      <!-- Tabs -->
      <div class="ap__tabs">
        <button
          class="ap__tab"
          :class="{ 'ap__tab--active': activeTab === 'products' }"
          @click="activeTab = 'products'"
        >
          <i class="fa-solid fa-box-open"></i>
          Productos
        </button>
        <button
          class="ap__tab"
          :class="{ 'ap__tab--active': activeTab === 'categories' }"
          @click="activeTab = 'categories'"
        >
          <i class="fa-solid fa-tags"></i>
          Categorías
        </button>
      </div>

      <!-- ══ PRODUCTS TAB ══ -->
      <template v-if="activeTab === 'products'">
        <!-- Toolbar -->
        <div class="ap__toolbar">
          <div class="ap__search-wrap">
            <i class="fa-solid fa-magnifying-glass ap__search-icon"></i>
            <input
              v-model="searchQ"
              class="ap__search"
              type="text"
              placeholder="Buscar por nombre, categoría o slug…"
            />
          </div>
          <button class="ap__btn ap__btn--primary" @click="openCreate">
            <i class="fa-solid fa-plus"></i>
            Nuevo producto
          </button>
          <span v-if="reordering" class="ap__saving-order">
            <i class="fa-solid fa-spinner fa-spin"></i> Guardando orden…
          </span>
        </div>

        <!-- Error -->
        <div v-if="error" class="ap__alert ap__alert--error">
          <i class="fa-solid fa-circle-exclamation"></i> {{ error }}
          <button @click="loadProducts">Reintentar</button>
        </div>

        <!-- Loading -->
        <div v-if="loading" class="ap__state">
          <i class="fa-solid fa-spinner fa-spin fa-2x"></i>
          <p>Cargando productos…</p>
        </div>

        <!-- Empty -->
        <div v-else-if="!loading && filtered.length === 0" class="ap__state">
          <i class="fa-solid fa-box-open fa-2x" style="opacity:.3"></i>
          <p>{{ searchQ ? 'No hay resultados.' : 'Aún no hay productos. ¡Crea el primero!' }}</p>
        </div>

        <!-- Product table -->
        <div v-else class="ap__table-wrap">
          <table class="ap__table">
            <thead>
              <tr>
                <th class="ap__th-drag"></th>
                <th>Imagen</th>
                <th>Nombre</th>
                <th>Categoría</th>
                <th>Precio</th>
                <th>Stock</th>
                <th>Activo</th>
                <th></th>
              </tr>
            </thead>
            <VueDraggable
              v-model="products"
              tag="tbody"
              handle=".ap__drag-handle"
              :disabled="!!searchQ"
              :animation="150"
              ghost-class="ap__row--ghost"
              @end="onReorder"
            >
              <tr v-for="p in (searchQ ? filtered : products)" :key="p._id">
                <td class="ap__td-drag">
                  <i
                    class="fa-solid fa-grip-vertical ap__drag-handle"
                    :class="{ 'ap__drag-handle--off': !!searchQ }"
                    :title="searchQ ? 'Limpia la búsqueda para reordenar' : 'Arrastra para reordenar'"
                  ></i>
                </td>
                <td class="ap__td-img">
                  <img v-if="p.imagen?.url" :src="p.imagen.url" :alt="p.nombre" class="ap__thumb" />
                  <span v-else class="ap__thumb-placeholder">
                    <i class="fa-solid fa-bread-slice"></i>
                  </span>
                </td>
                <td>
                  <div class="ap__product-name">{{ p.nombre }}</div>
                  <div class="ap__product-slug">{{ p.slug }}</div>
                </td>
                <td>{{ p.categoria || '—' }}</td>
                <td class="ap__price">{{ formatPrice(p.precio) }}</td>
                <td>
                  <span
                    class="ap__badge"
                    :class="p.inStock ? 'ap__badge--green' : 'ap__badge--red'"
                  >
                    {{ p.inStock ? 'En stock' : 'Sin stock' }}
                  </span>
                  <span v-if="p.hasStock" class="ap__stock-count">({{ p.stockCount }})</span>
                </td>
                <td>
                  <button
                    class="ap__toggle"
                    :class="p.isActive ? 'ap__toggle--on' : 'ap__toggle--off'"
                    :title="p.isActive ? 'Desactivar' : 'Activar'"
                    @click="toggleActive(p)"
                  >
                    <span class="ap__toggle-knob" />
                  </button>
                </td>
                <td class="ap__td-actions">
                  <button class="ap__icon-btn ap__icon-btn--edit" @click="openEdit(p)" title="Editar">
                    <i class="fa-solid fa-pen-to-square"></i>
                  </button>
                  <button class="ap__icon-btn ap__icon-btn--del" @click="confirmDelete(p)" title="Eliminar">
                    <i class="fa-solid fa-trash"></i>
                  </button>
                </td>
              </tr>
            </VueDraggable>
          </table>
        </div>
      </template>

      <!-- ══ CATEGORIES TAB ══ -->
      <template v-else>
        <!-- Category toolbar -->
        <div class="ap__toolbar">
          <h2 class="ap__section-title">Gestión de Categorías</h2>
          <button class="ap__btn ap__btn--primary" @click="showCatCreate = !showCatCreate">
            <i class="fa-solid fa-plus"></i>
            Nueva categoría
          </button>
        </div>

        <!-- Inline create form -->
        <div v-if="showCatCreate" class="ap__cat-create-card">
          <div class="ap__field" style="flex:1">
            <label>Nombre de la categoría</label>
            <input
              v-model="newCatName"
              type="text"
              placeholder="Ej: Clásicos"
              @keyup.enter="createCategory"
            />
          </div>
          <div class="ap__cat-create-actions">
            <button class="ap__btn ap__btn--ghost" @click="showCatCreate = false; newCatName = ''">
              Cancelar
            </button>
            <button
              class="ap__btn ap__btn--primary"
              :disabled="catCreating || !newCatName.trim()"
              @click="createCategory"
            >
              <i v-if="catCreating" class="fa-solid fa-spinner fa-spin"></i>
              {{ catCreating ? 'Creando…' : 'Crear' }}
            </button>
          </div>
        </div>

        <!-- Category list -->
        <div class="ap__table-wrap">
          <div v-if="categories.length === 0" class="ap__state">
            <i class="fa-solid fa-tags fa-2x" style="opacity:.3"></i>
            <p>No hay categorías todavía.</p>
          </div>
          <table v-else class="ap__table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Productos</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="cat in categories" :key="cat._id">
                <td>
                  <div class="ap__product-name">{{ cat.name }}</div>
                </td>
                <td>
                  <span class="ap__badge ap__badge--green">
                    {{ catProductCount(cat.name) }} producto{{ catProductCount(cat.name) !== 1 ? 's' : '' }}
                  </span>
                </td>
                <td class="ap__td-actions">
                  <button class="ap__icon-btn ap__icon-btn--del" @click="openCatDelete(cat)" title="Eliminar categoría">
                    <i class="fa-solid fa-trash"></i>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </template>
    </div>

    <!-- ── Create / Edit Product Modal ──────────────────────────────────── -->
    <Transition name="modal">
      <div v-if="showModal" class="ap__overlay" @click.self="closeModal">
        <div class="ap__modal">
          <div class="ap__modal-header">
            <h2>{{ editTarget ? 'Editar producto' : 'Nuevo producto' }}</h2>
            <button class="ap__modal-close" @click="closeModal">
              <i class="fa-solid fa-xmark"></i>
            </button>
          </div>

          <div class="ap__modal-body">
            <!-- Image uploader -->
            <div class="ap__image-section">
              <div class="ap__image-preview-wrap">
                <img
                  v-if="imagePreview"
                  :src="imagePreview"
                  alt="Vista previa"
                  class="ap__image-preview"
                />
                <div v-else class="ap__image-empty">
                  <i class="fa-solid fa-image"></i>
                  <span>Sin imagen</span>
                </div>

                <button
                  v-if="imagePreview"
                  class="ap__image-remove"
                  :disabled="imageUploading"
                  @click="removeImage"
                  title="Eliminar imagen"
                >
                  <i class="fa-solid fa-xmark"></i>
                </button>

                <div v-if="imageUploading" class="ap__image-uploading">
                  <i class="fa-solid fa-spinner fa-spin"></i>
                </div>
              </div>

              <div class="ap__image-actions">
                <label
                  class="ap__btn ap__file-label"
                  :class="imageUploading ? 'ap__btn--secondary ap__file-label--loading' : 'ap__btn--secondary'"
                >
                  <i v-if="imageUploading" class="fa-solid fa-spinner fa-spin"></i>
                  <i v-else-if="uploadedUrl" class="fa-solid fa-arrows-rotate"></i>
                  <i v-else class="fa-solid fa-image"></i>
                  {{ imageUploading ? 'Subiendo…' : (uploadedUrl ? 'Cambiar imagen' : 'Agregar imagen') }}
                  <input
                    type="file"
                    accept="image/*"
                    class="ap__file-input"
                    :disabled="imageUploading"
                    @change="onFileChange"
                  />
                </label>
                <p class="ap__image-hint">
                  <i class="fa-solid fa-circle-info"></i>
                  Se sube automáticamente al seleccionar
                </p>
              </div>
            </div>

            <div class="ap__form-grid">
              <div class="ap__field ap__field--full">
                <label>Nombre *</label>
                <input v-model="form.nombre" type="text" placeholder="Tequeños de queso" />
              </div>

              <div class="ap__field">
                <label>Categoría</label>
                <select v-model="form.categoria">
                  <option value="">Sin categoría</option>
                  <option v-for="cat in categories" :key="cat._id" :value="cat.name">
                    {{ cat.name }}
                  </option>
                </select>
              </div>

              <div class="ap__field">
                <label>Precio (USD) *</label>
                <input v-model.number="form.precio" type="number" min="0" step="0.01" placeholder="0.00" />
              </div>

              <div class="ap__field ap__field--full">
                <label>Descripción</label>
                <textarea v-model="form.descripcion" rows="3" placeholder="Descripción del producto…" />
              </div>

            </div>

            <!-- Stock & visibility settings -->
            <div class="ap__stock-section">
              <h4 class="ap__stock-title">
                <i class="fa-solid fa-layer-group"></i> Disponibilidad y stock
              </h4>

              <!-- Visible en tienda -->
              <label class="ap__toggle-card" :class="{ 'ap__toggle-card--on': form.isActive }">
                <div class="ap__toggle-card-info">
                  <span class="ap__toggle-card-label">
                    <i class="fa-solid fa-store"></i> Visible en tienda
                  </span>
                  <span class="ap__toggle-card-desc">
                    Los clientes pueden ver y agregar este producto al carrito.
                    Desactívalo para ocultarlo temporalmente.
                  </span>
                </div>
                <div class="ap__toggle-switch" :class="{ 'ap__toggle-switch--on': form.isActive }">
                  <input v-model="form.isActive" type="checkbox" class="ap__toggle-switch-input" />
                  <span class="ap__toggle-switch-thumb"></span>
                </div>
              </label>

              <!-- Disponible para compra -->
              <label class="ap__toggle-card" :class="{ 'ap__toggle-card--on': form.inStock }">
                <div class="ap__toggle-card-info">
                  <span class="ap__toggle-card-label">
                    <i class="fa-solid fa-bag-shopping"></i> Disponible para compra
                  </span>
                  <span class="ap__toggle-card-desc">
                    El producto se puede agregar al carrito y comprar.
                    Desactívalo si se agotó pero quieres mantenerlo visible.
                  </span>
                </div>
                <div class="ap__toggle-switch" :class="{ 'ap__toggle-switch--on': form.inStock }">
                  <input v-model="form.inStock" type="checkbox" class="ap__toggle-switch-input" />
                  <span class="ap__toggle-switch-thumb"></span>
                </div>
              </label>

              <!-- Controlar cantidad -->
              <label class="ap__toggle-card" :class="{ 'ap__toggle-card--on': form.hasStock }">
                <div class="ap__toggle-card-info">
                  <span class="ap__toggle-card-label">
                    <i class="fa-solid fa-hashtag"></i> Controlar cantidad exacta
                  </span>
                  <span class="ap__toggle-card-desc">
                    Actívalo si quieres llevar conteo de unidades disponibles.
                    Al llegar a 0 se marcará como agotado automáticamente.
                  </span>
                </div>
                <div class="ap__toggle-switch" :class="{ 'ap__toggle-switch--on': form.hasStock }">
                  <input v-model="form.hasStock" type="checkbox" class="ap__toggle-switch-input" />
                  <span class="ap__toggle-switch-thumb"></span>
                </div>
              </label>

              <!-- Unidades disponibles (solo si hasStock) -->
              <Transition name="fade">
                <div v-if="form.hasStock" class="ap__stock-count-row">
                  <i class="fa-solid fa-boxes-stacked"></i>
                  <div class="ap__stock-count-field">
                    <label>Unidades disponibles</label>
                    <input
                      v-model.number="form.stockCount"
                      type="number"
                      min="0"
                      placeholder="0"
                      class="ap__stock-count-input"
                    />
                  </div>
                </div>
              </Transition>
            </div>

            <!-- ── Sabores de caja ────────────────────────────── -->
            <div class="ap__stock-section ap__flavors-section">
              <h4 class="ap__stock-title">
                <i class="fa-solid fa-layer-group"></i> Sabores de caja
              </h4>

              <!-- Toggle -->
              <label class="ap__toggle-card" :class="{ 'ap__toggle-card--on': form.hasFlavors }">
                <div class="ap__toggle-card-info">
                  <span class="ap__toggle-card-label">
                    <i class="fa-solid fa-cubes-stacked"></i> Esta es una caja con sabores
                  </span>
                  <span class="ap__toggle-card-desc">
                    Los clientes elegirán sus sabores al agregar la caja al carrito.
                  </span>
                </div>
                <div class="ap__toggle-switch" :class="{ 'ap__toggle-switch--on': form.hasFlavors }">
                  <input v-model="form.hasFlavors" type="checkbox" class="ap__toggle-switch-input" />
                  <span class="ap__toggle-switch-thumb"></span>
                </div>
              </label>

              <Transition name="fade">
                <div v-if="form.hasFlavors" class="ap__flavors-config">

                  <!-- Box size -->
                  <div class="ap__flavors-boxsize">
                    <i class="fa-solid fa-box-open"></i>
                    <label>Tamaño de caja</label>
                    <input
                      v-model.number="form.boxSize"
                      type="number"
                      min="1"
                      max="100"
                      class="ap__flavors-boxsize-input"
                    />
                    <span class="ap__flavors-boxsize-unit">unidades por caja</span>
                  </div>

                  <!-- Flavor list -->
                  <div class="ap__flavors-list">
                    <div
                      v-for="(flavor, i) in form.flavors"
                      :key="i"
                      class="ap__flavor-row"
                      :class="flavor.grupo === 'especial' ? 'ap__flavor-row--especial' : ''"
                    >
                      <div class="ap__flavor-row-left">
                        <span class="ap__flavor-grupo-dot" :class="`ap__flavor-grupo-dot--${flavor.grupo}`"></span>
                        <input
                          v-model="flavor.nombre"
                          type="text"
                          placeholder="Nombre del sabor…"
                          class="ap__flavor-name-input"
                        />
                      </div>
                      <div class="ap__flavor-row-right">
                        <select v-model="flavor.grupo" class="ap__flavor-grupo-select">
                          <option value="normal">Normal</option>
                          <option value="especial">Especial (máx. 2)</option>
                        </select>

                        <!-- Limit control: clear two-state UI -->
                        <div class="ap__flavor-limite-ctrl">
                          <template v-if="flavor.limite === 0">
                            <span class="ap__flavor-limite-pill">
                              <i class="fa-solid fa-infinity"></i> Sin límite
                            </span>
                            <button
                              class="ap__flavor-limite-toggle"
                              title="Poner límite máximo por caja"
                              @click="flavor.limite = 1"
                            >+ límite</button>
                          </template>
                          <template v-else>
                            <span class="ap__flavor-limite-label">máx.</span>
                            <input
                              v-model.number="flavor.limite"
                              type="number"
                              min="1"
                              :max="form.boxSize"
                              class="ap__flavor-limite-input"
                            />
                            <button
                              class="ap__flavor-limite-toggle ap__flavor-limite-toggle--remove"
                              title="Quitar límite (sin límite)"
                              @click="flavor.limite = 0"
                            ><i class="fa-solid fa-xmark"></i></button>
                          </template>
                        </div>

                        <button
                          class="ap__icon-btn ap__icon-btn--del"
                          title="Eliminar sabor"
                          @click="removeFlavor(i)"
                        >
                          <i class="fa-solid fa-trash"></i>
                        </button>
                      </div>
                    </div>

                    <div v-if="!form.flavors?.length" class="ap__flavors-empty">
                      <i class="fa-solid fa-bowl-food"></i>
                      <span>Aún no hay sabores. Agrega el primero.</span>
                    </div>
                  </div>

                  <button class="ap__btn ap__btn--ghost ap__flavors-add-btn" @click="addFlavor">
                    <i class="fa-solid fa-plus"></i>
                    Agregar sabor
                  </button>

                </div>
              </Transition>
            </div>

            <!-- Error -->
            <div v-if="modalError" class="ap__alert ap__alert--error">
              <i class="fa-solid fa-circle-exclamation"></i> {{ modalError }}
            </div>
          </div>

          <div class="ap__modal-footer">
            <button class="ap__btn ap__btn--ghost" @click="closeModal">Cancelar</button>
            <button
              class="ap__btn ap__btn--primary"
              :disabled="saving || !form.nombre || form.precio <= 0"
              @click="save"
            >
              <i v-if="saving" class="fa-solid fa-spinner fa-spin"></i>
              <span>{{ saving ? 'Guardando…' : (editTarget ? 'Guardar cambios' : 'Crear producto') }}</span>
            </button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- ── Delete Product Confirm ────────────────────────────────────────── -->
    <Transition name="modal">
      <div v-if="deleteTarget" class="ap__overlay" @click.self="deleteTarget = null">
        <div class="ap__modal ap__modal--sm">
          <div class="ap__modal-header">
            <h2>Eliminar producto</h2>
            <button class="ap__modal-close" @click="deleteTarget = null">
              <i class="fa-solid fa-xmark"></i>
            </button>
          </div>
          <div class="ap__modal-body">
            <p>¿Estás seguro de que deseas eliminar <strong>{{ deleteTarget.nombre }}</strong>?
            Esta acción también borrará la imagen de Cloudinary y no puede deshacerse.</p>
          </div>
          <div class="ap__modal-footer">
            <button class="ap__btn ap__btn--ghost" @click="deleteTarget = null">Cancelar</button>
            <button class="ap__btn ap__btn--danger" :disabled="deleting" @click="doDelete">
              <i v-if="deleting" class="fa-solid fa-spinner fa-spin"></i>
              {{ deleting ? 'Eliminando…' : 'Sí, eliminar' }}
            </button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- ── Delete Category Confirm ───────────────────────────────────────── -->
    <Transition name="modal">
      <div v-if="catDeleteTarget" class="ap__overlay" @click.self="catDeleteTarget = null">
        <div class="ap__modal ap__modal--sm">
          <div class="ap__modal-header">
            <h2>Eliminar categoría</h2>
            <button class="ap__modal-close" @click="catDeleteTarget = null">
              <i class="fa-solid fa-xmark"></i>
            </button>
          </div>
          <div class="ap__modal-body">
            <template v-if="catProductCount(catDeleteTarget.name) > 0">
              <div class="ap__alert ap__alert--warn">
                <i class="fa-solid fa-triangle-exclamation"></i>
                Esta categoría tiene <strong>{{ catProductCount(catDeleteTarget.name) }} producto{{ catProductCount(catDeleteTarget.name) !== 1 ? 's' : '' }}</strong>. ¿Qué deseas hacer?
              </div>
              <div class="ap__cat-delete-options">
                <label class="ap__check-label">
                  <input type="radio" v-model="catDeleteMode" value="leave" />
                  <span>Dejar sin categoría</span>
                </label>
                <label class="ap__check-label">
                  <input type="radio" v-model="catDeleteMode" value="reassign" />
                  <span>Reasignar a otra categoría</span>
                </label>
              </div>
              <div v-if="catDeleteMode === 'reassign'" class="ap__field">
                <label>Reasignar a</label>
                <select v-model="catDeleteReassign">
                  <option value="">Seleccionar categoría…</option>
                  <option v-for="c in otherCatsForReassign" :key="c._id" :value="c._id">
                    {{ c.name }}
                  </option>
                </select>
              </div>
            </template>
            <template v-else>
              <p>¿Estás seguro de que deseas eliminar la categoría <strong>{{ catDeleteTarget.name }}</strong>?</p>
            </template>
          </div>
          <div class="ap__modal-footer">
            <button class="ap__btn ap__btn--ghost" @click="catDeleteTarget = null">Cancelar</button>
            <button
              class="ap__btn ap__btn--danger"
              :disabled="catDeleting || (catDeleteMode === 'reassign' && !catDeleteReassign)"
              @click="doDeleteCategory"
            >
              <i v-if="catDeleting" class="fa-solid fa-spinner fa-spin"></i>
              {{ catDeleting ? 'Eliminando…' : 'Sí, eliminar' }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style lang="scss" scoped>
// ── Layout ─────────────────────────────────────────────────────────────────
.ap {
  min-height: 100vh;
  background: #f4f5f7;
  display: flex;
  flex-direction: column;
  font-family: $font-principal;

  // ── Header ───────────────────────────────────────────────────────────────
  &__header {
    background: $color-accent;
    padding: 0 2rem;
    height: 64px;
    display: flex;
    align-items: center;
    gap: 1rem;
    box-shadow: 0 2px 12px rgba(0,0,0,.18);
    position: sticky;
    top: 0;
    z-index: 100;

    h1 {
      font-size: 1rem;
      font-weight: 800;
      color: $white;
      margin: 0;
    }
    p {
      font-size: 0.72rem;
      color: rgba($white, .6);
      margin: 0;
    }
  }

  &__header-left {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    flex: 1;
  }

  &__logo {
    height: 36px;
    width: 36px;
    border-radius: 8px;
    object-fit: cover;
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

    &--active, &.router-link-active {
      background: rgba($white, .15);
      color: $white;
    }
  }

  &__logout {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    background: rgba($white, .12);
    border: 1px solid rgba($white, .2);
    color: $white;
    border-radius: 0.5rem;
    padding: 0.4rem 0.875rem;
    font-size: 0.82rem;
    font-weight: 700;
    cursor: pointer;
    transition: background 0.15s;

    &:hover { background: rgba($white, .22); }
  }

  // ── Body ─────────────────────────────────────────────────────────────────
  &__body {
    flex: 1;
    max-width: 1200px;
    width: 100%;
    margin: 0 auto;
    padding: 2rem 1.5rem 4rem;
  }

  // ── Tabs ──────────────────────────────────────────────────────────────────
  &__tabs {
    display: flex;
    gap: 0.25rem;
    margin-bottom: 1.5rem;
    background: $white;
    border: 1px solid #eee;
    border-radius: 0.875rem;
    padding: 0.3rem;
    width: fit-content;
  }

  &__tab {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.5rem 1.1rem;
    border-radius: 0.625rem;
    font-size: 0.875rem;
    font-weight: 700;
    border: none;
    background: transparent;
    color: #888;
    cursor: pointer;
    transition: background 0.15s, color 0.15s;

    &:hover { background: #f5f5f5; color: #444; }

    &--active {
      background: $color-accent;
      color: $color-primary;
    }
  }

  // ── Section title ─────────────────────────────────────────────────────────
  &__section-title {
    font-size: 1.1rem;
    font-weight: 800;
    color: $color-accent;
    margin: 0;
    flex: 1;
  }

  // ── Category create card ──────────────────────────────────────────────────
  &__cat-create-card {
    background: $white;
    border: 1px solid #e2e8f0;
    border-radius: 1rem;
    padding: 1.25rem 1.5rem;
    display: flex;
    align-items: flex-end;
    gap: 1rem;
    margin-bottom: 1.25rem;
    flex-wrap: wrap;
  }

  &__cat-create-actions {
    display: flex;
    gap: 0.75rem;
    padding-bottom: 0.1rem;
  }

  &__cat-delete-options {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    margin-bottom: 0.75rem;
  }

  // ── Toolbar ───────────────────────────────────────────────────────────────
  &__toolbar {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-bottom: 1.5rem;
    flex-wrap: wrap;
  }

  &__search-wrap {
    position: relative;
    flex: 1;
    min-width: 200px;
  }

  &__search-icon {
    position: absolute;
    left: 0.875rem;
    top: 50%;
    transform: translateY(-50%);
    color: #bbb;
    font-size: 0.85rem;
  }

  &__search {
    width: 100%;
    padding: 0.6rem 1rem 0.6rem 2.4rem;
    border: 1px solid #e2e8f0;
    border-radius: 0.75rem;
    font-size: 0.875rem;
    background: $white;
    outline: none;
    box-sizing: border-box;
    transition: border-color 0.15s;

    &:focus { border-color: $color-accent; }
  }

  // ── Buttons ───────────────────────────────────────────────────────────────
  &__btn {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.55rem 1.1rem;
    border-radius: 0.625rem;
    font-size: 0.875rem;
    font-weight: 700;
    cursor: pointer;
    border: none;
    transition: opacity 0.15s, transform 0.15s;
    white-space: nowrap;

    &:disabled { opacity: 0.5; cursor: not-allowed; transform: none !important; }
    &:hover:not(:disabled) { transform: translateY(-1px); opacity: 0.9; }

    &--primary { background: $color-accent; color: $color-primary; }
    &--secondary { background: #f0f0f0; color: #444; }
    &--ghost { background: transparent; border: 1px solid #ddd; color: #555; }
    &--danger { background: #e53e3e; color: $white; }
  }

  // ── Alerts ────────────────────────────────────────────────────────────────
  &__alert {
    border-radius: 0.75rem;
    padding: 0.875rem 1.25rem;
    display: flex;
    align-items: center;
    gap: 0.75rem;
    font-size: 0.875rem;
    margin-bottom: 1.25rem;

    &--error { background: #fff5f5; color: #c53030; border: 1px solid #fed7d7; }
    &--warn  { background: #fffbeb; color: #b7791f; border: 1px solid #fbd38d; }

    button {
      margin-left: auto;
      background: none;
      border: 1px solid currentColor;
      border-radius: 0.4rem;
      padding: 0.3rem 0.75rem;
      font-size: 0.78rem;
      font-weight: 700;
      cursor: pointer;
      color: inherit;
    }
  }

  // ── State placeholder ────────────────────────────────────────────────────
  &__state {
    background: $white;
    border-radius: 1.25rem;
    border: 1px solid #eee;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 1rem;
    min-height: 280px;
    color: #bbb;
    text-align: center;

    p { margin: 0; font-size: 0.95rem; }
  }

  // ── Table ─────────────────────────────────────────────────────────────────
  &__table-wrap {
    background: $white;
    border-radius: 1.25rem;
    border: 1px solid #eee;
    overflow: hidden;
    box-shadow: 0 2px 8px rgba(0,0,0,.04);
  }

  &__table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.875rem;

    thead tr {
      border-bottom: 1px solid #f0f0f0;
    }

    th {
      padding: 0.875rem 1rem;
      text-align: left;
      font-size: 0.75rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: #aaa;
    }

    td {
      padding: 0.875rem 1rem;
      vertical-align: middle;
      border-bottom: 1px solid #f8f8f8;
    }

    tbody tr:last-child td { border-bottom: none; }
    tbody tr:hover td { background: #fafafa; }
  }

  &__td-img { width: 64px; }

  &__thumb {
    width: 52px;
    height: 52px;
    border-radius: 0.5rem;
    object-fit: cover;
    border: 1px solid #eee;
  }

  &__thumb-placeholder {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 52px;
    height: 52px;
    border-radius: 0.5rem;
    background: #fdf5e8;
    color: rgba($color-accent, .3);
    font-size: 1.25rem;
  }

  &__product-name {
    font-weight: 700;
    color: $color-accent;
  }

  &__product-slug {
    font-size: 0.72rem;
    color: #bbb;
    margin-top: 2px;
  }

  &__price {
    font-weight: 800;
    color: $color-accent;
    font-family: $font-secondary;
    font-size: 1rem;
  }

  &__badge {
    display: inline-block;
    border-radius: 999px;
    padding: 0.2rem 0.6rem;
    font-size: 0.72rem;
    font-weight: 700;

    &--green { background: #c6f6d5; color: #276749; }
    &--red   { background: #fed7d7; color: #c53030; }
  }

  &__stock-count {
    font-size: 0.72rem;
    color: #aaa;
    margin-left: 4px;
  }

  // ── Toggle switch ─────────────────────────────────────────────────────────
  &__toggle {
    display: inline-flex;
    align-items: center;
    width: 40px;
    height: 22px;
    border-radius: 999px;
    border: none;
    cursor: pointer;
    padding: 2px;
    transition: background 0.2s;
    position: relative;

    &--on  { background: $color-accent; }
    &--off { background: #ddd; }
  }

  &__toggle-knob {
    display: block;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: $white;
    box-shadow: 0 1px 4px rgba(0,0,0,.2);
    transition: transform 0.2s;

    .ap__toggle--on & { transform: translateX(18px); }
  }

  &__td-actions { width: 80px; }

  &__th-drag,
  &__td-drag {
    width: 2rem;
    padding: 0 0.25rem;
    text-align: center;
  }

  &__drag-handle {
    cursor: grab;
    color: #b0b8c1;
    font-size: 0.9rem;
    padding: 0.25rem;
    transition: color 0.15s;

    &:hover { color: #718096; }
    &:active { cursor: grabbing; }

    &--off {
      cursor: not-allowed;
      opacity: 0.25;
    }
  }

  &__row--ghost {
    opacity: 0.45;
    background: #f0f4ff !important;
  }

  &__saving-order {
    font-size: 0.8rem;
    color: #718096;
    display: flex;
    align-items: center;
    gap: 0.35rem;
  }

  &__icon-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border-radius: 0.5rem;
    border: 1px solid transparent;
    cursor: pointer;
    font-size: 0.85rem;
    transition: background 0.15s, color 0.15s;

    &--edit {
      background: #ebf4ff;
      color: #3182ce;
      &:hover { background: #bee3f8; }
    }

    &--del {
      background: #fff5f5;
      color: #e53e3e;
      margin-left: 4px;
      &:hover { background: #fed7d7; }
    }
  }

  // ── Modal ─────────────────────────────────────────────────────────────────
  &__overlay {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,.55);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1rem;
    z-index: 200;
    backdrop-filter: blur(2px);
  }

  &__modal {
    background: $white;
    border-radius: 1.5rem;
    width: 100%;
    max-width: 680px;
    max-height: 92vh;
    display: flex;
    flex-direction: column;
    box-shadow: 0 25px 60px rgba(0,0,0,.2);
    overflow: hidden;

    &--sm { max-width: 440px; }
  }

  &__modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1.25rem 1.5rem;
    border-bottom: 1px solid #f0f0f0;
    flex-shrink: 0;

    h2 { font-size: 1.1rem; font-weight: 800; color: $color-accent; margin: 0; }
  }

  &__modal-close {
    background: #f5f5f5;
    border: none;
    border-radius: 50%;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    font-size: 0.9rem;
    color: #666;
    transition: background 0.15s;

    &:hover { background: #eee; }
  }

  &__modal-body {
    padding: 1.5rem;
    overflow-y: auto;
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
  }

  &__modal-footer {
    padding: 1rem 1.5rem;
    border-top: 1px solid #f0f0f0;
    display: flex;
    justify-content: flex-end;
    gap: 0.75rem;
    flex-shrink: 0;
  }

  // ── Image uploader ────────────────────────────────────────────────────────
  &__image-section {
    display: flex;
    gap: 1.25rem;
    align-items: flex-start;
    flex-wrap: wrap;
  }

  &__image-preview-wrap {
    position: relative;
    width: 140px;
    height: 140px;
    flex-shrink: 0;
    border-radius: 1rem;
    overflow: hidden;
    background: #fdf5e8;
    border: 2px dashed #e8e0d5;
  }

  &__image-preview {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  &__image-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    gap: 0.5rem;
    color: rgba($color-accent, .25);

    i { font-size: 2rem; }
    span { font-size: 0.7rem; font-weight: 600; }
  }

  &__image-remove {
    position: absolute;
    top: 6px;
    right: 6px;
    width: 26px;
    height: 26px;
    border-radius: 50%;
    background: rgba(0,0,0,.55);
    color: $white;
    border: none;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    font-size: 0.75rem;
    transition: background 0.15s;

    &:hover { background: #e53e3e; }
    &:disabled { opacity: 0.5; cursor: not-allowed; }
  }

  &__image-uploading {
    position: absolute;
    inset: 0;
    background: rgba($white, .75);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.5rem;
    color: $color-accent;
  }

  &__image-actions {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    justify-content: center;
    flex: 1;
  }

  &__file-label {
    cursor: pointer;
    position: relative;
    overflow: hidden;
    display: inline-flex;

    &--loading {
      opacity: 0.7;
      cursor: default;
      pointer-events: none;
    }
  }

  &__file-input {
    position: absolute;
    opacity: 0;
    inset: 0;
    cursor: pointer;
    width: 100%;

    &:disabled { pointer-events: none; }
  }

  &__image-hint {
    font-size: 0.72rem;
    color: #bbb;
    display: flex;
    align-items: center;
    gap: 0.3rem;
    margin: 0;

    i { font-size: 0.68rem; }
  }

  // ── Form grid ─────────────────────────────────────────────────────────────
  &__form-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.875rem;

    @media (max-width: 480px) { grid-template-columns: 1fr; }
  }

  &__field {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;

    &--full { grid-column: 1 / -1; }

    label {
      font-size: 0.78rem;
      font-weight: 700;
      color: #555;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    input, textarea, select {
      padding: 0.6rem 0.875rem;
      border: 1px solid #e2e8f0;
      border-radius: 0.625rem;
      font-size: 0.875rem;
      outline: none;
      transition: border-color 0.15s;
      font-family: $font-principal;
      resize: vertical;
      background: $white;

      &:focus { border-color: $color-accent; }
      &:disabled { background: #f8f8f8; color: #aaa; cursor: not-allowed; }
    }

    select { cursor: pointer; }
  }

  // ── Stock section ──────────────────────────────────────────────────────────
  &__stock-section {
    display: flex;
    flex-direction: column;
    gap: 0.625rem;
  }

  &__stock-title {
    font-size: 0.78rem;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: #888;
    margin: 0 0 0.25rem;
    display: flex;
    align-items: center;
    gap: 0.4rem;
  }

  &__toggle-card {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 0.75rem 1rem;
    border-radius: 0.625rem;
    border: 1.5px solid #ede8df;
    background: #faf8f4;
    cursor: pointer;
    transition: border-color 0.15s, background 0.15s;

    &:hover { border-color: #d8cfc3; background: #f5f0e8; }

    &--on {
      border-color: $color-accent;
      background: #fdf8f0;
    }
  }

  &__toggle-card-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
  }

  &__toggle-card-label {
    font-size: 0.875rem;
    font-weight: 700;
    color: #333;
    display: flex;
    align-items: center;
    gap: 0.4rem;

    i { color: $color-accent; font-size: 0.8rem; }
  }

  &__toggle-card-desc {
    font-size: 0.75rem;
    color: #888;
    line-height: 1.45;
  }

  // Custom toggle switch
  &__toggle-switch {
    position: relative;
    width: 42px;
    height: 24px;
    flex-shrink: 0;

    &-input {
      position: absolute;
      opacity: 0;
      width: 0;
      height: 0;
    }

    &-thumb {
      display: block;
      width: 42px;
      height: 24px;
      background: #d8d8d8;
      border-radius: 12px;
      transition: background 0.2s;
      cursor: pointer;

      &::after {
        content: '';
        position: absolute;
        top: 3px;
        left: 3px;
        width: 18px;
        height: 18px;
        background: $white;
        border-radius: 50%;
        box-shadow: 0 1px 4px rgba(0,0,0,0.18);
        transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
      }
    }

    &--on &-thumb {
      background: $color-accent;

      &::after {
        transform: translateX(18px);
      }
    }
  }

  // Units count row
  &__stock-count-row {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem 1rem;
    border-radius: 0.625rem;
    background: #fdf8f0;
    border: 1.5px dashed $color-accent;

    > i { color: $color-accent; font-size: 1rem; flex-shrink: 0; }
  }

  &__stock-count-field {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;

    label {
      font-size: 0.75rem;
      font-weight: 700;
      color: $color-accent;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
  }

  &__stock-count-input {
    width: 100%;
    max-width: 120px;
    padding: 0.5rem 0.75rem;
    border: 1.5px solid #d8cfc3;
    border-radius: 0.5rem;
    font-size: 0.95rem;
    font-weight: 700;
    font-family: $font-principal;
    color: $color-accent;
    background: $white;
    outline: none;
    box-sizing: border-box;

    &:focus { border-color: $color-accent; }
  }

  // ── Flavor styles ──────────────────────────────────────────────────────────
  &__flavors-section { margin-top: 0.75rem; }

  &__flavors-config {
    display: flex;
    flex-direction: column;
    gap: 0.875rem;
    padding: 0.875rem;
    background: #fdfaf5;
    border-radius: 0.75rem;
    border: 1.5px solid #ece5d8;
  }

  &__flavors-boxsize {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    font-size: 0.85rem;
    color: #555;
    font-weight: 600;

    i { color: $color-accent; }

    label { font-weight: 700; color: $color-accent; }
  }

  &__flavors-boxsize-input {
    width: 4rem;
    padding: 0.3rem 0.5rem;
    border: 1.5px solid #d8cfc3;
    border-radius: 0.5rem;
    font-size: 0.9rem;
    font-weight: 800;
    color: $color-accent;
    text-align: center;
    font-family: $font-principal;
    &:focus { outline: none; border-color: $color-accent; }
  }

  &__flavors-boxsize-unit { color: #999; font-size: 0.8rem; }

  &__flavors-list {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }

  &__flavor-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    padding: 0.5rem 0.625rem;
    background: $white;
    border-radius: 0.625rem;
    border: 1.5px solid #ece5d8;

    &--especial { border-color: rgba(124, 58, 237, 0.25); background: #f9f5ff; }

    &-left {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      flex: 1;
      min-width: 0;
    }

    &-right {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      flex-shrink: 0;
    }
  }

  &__flavor-grupo-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    flex-shrink: 0;
    &--normal   { background: $color-accent; }
    &--especial { background: #7c3aed; }
  }

  &__flavor-name-input {
    flex: 1;
    min-width: 0;
    padding: 0.3rem 0.5rem;
    border: 1px solid #e8dccf;
    border-radius: 0.375rem;
    font-size: 0.875rem;
    font-family: $font-principal;
    color: #333;
    background: transparent;
    &:focus { outline: none; border-color: $color-accent; }
  }

  &__flavor-grupo-select {
    padding: 0.3rem 0.5rem;
    border: 1px solid #e8dccf;
    border-radius: 0.375rem;
    font-size: 0.75rem;
    font-family: $font-principal;
    font-weight: 700;
    color: #555;
    background: $white;
    cursor: pointer;
    &:focus { outline: none; border-color: $color-accent; }
  }

  &__flavor-limite-ctrl {
    display: flex;
    align-items: center;
    gap: 0.3rem;
  }

  &__flavor-limite-pill {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    font-size: 0.72rem;
    font-weight: 700;
    color: #2f855a;
    background: #f0fff4;
    border: 1px solid #9ae6b4;
    border-radius: 999px;
    padding: 0.2rem 0.6rem;
    white-space: nowrap;
    i { font-size: 0.65rem; }
  }

  &__flavor-limite-toggle {
    font-size: 0.68rem;
    font-weight: 700;
    font-family: $font-principal;
    color: #aaa;
    background: none;
    border: none;
    cursor: pointer;
    padding: 0 0.2rem;
    transition: color 0.15s;
    &:hover { color: $color-accent; }
    &--remove { color: #e57373; &:hover { color: #c62828; } }
  }

  &__flavor-limite-label {
    font-size: 0.72rem;
    font-weight: 700;
    color: #888;
  }

  &__flavor-limite-input {
    width: 2.8rem;
    border: 1px solid #e8dccf;
    border-radius: 0.375rem;
    outline: none;
    font-size: 0.82rem;
    font-weight: 700;
    font-family: $font-principal;
    color: $color-accent;
    text-align: center;
    background: $white;
    padding: 0.2rem 0.3rem;
    &:focus { border-color: $color-accent; }
    // hide spinners
    &::-webkit-inner-spin-button,
    &::-webkit-outer-spin-button { -webkit-appearance: none; }
    -moz-appearance: textfield;
    &::placeholder { color: #bbb; font-weight: 400; }
  }

  &__flavors-empty {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem;
    color: #bbb;
    font-size: 0.82rem;
    i { color: #ddd; }
  }

  &__flavors-add-btn {
    align-self: flex-start;
    font-size: 0.82rem;
    padding: 0.4rem 0.875rem;
  }

  // Keep check-label for category delete modal radios
  &__check-label {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.875rem;
    font-weight: 600;
    color: #444;
    cursor: pointer;

    input[type="checkbox"],
    input[type="radio"] {
      width: 16px;
      height: 16px;
      accent-color: $color-accent;
      cursor: pointer;
    }
  }
}

// ── Modal transition ───────────────────────────────────────────────────────
.modal-enter-active, .modal-leave-active {
  transition: opacity 0.22s ease;
  .ap__modal { transition: transform 0.22s ease; }
}
.modal-enter-from, .modal-leave-to {
  opacity: 0;
  .ap__modal { transform: scale(0.94) translateY(12px); }
}

// ── Fade transition (stock count row) ─────────────────────────────────────────
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
