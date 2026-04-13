<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useCartStore } from '@/stores/cart'
import type { Product, ProductFlavor, FlavorSelection } from '@/types'

const props = defineProps<{
  product: Product | null
  modelValue: boolean
}>()
const emit = defineEmits<{
  'update:modelValue': [v: boolean]
  added: []
}>()

const cart = useCartStore()

// ── Flavor state ──────────────────────────────────────────────
const counts = ref<Record<string, number>>({})

watch(() => props.modelValue, (open) => {
  if (open && props.product) resetCounts(props.product)
})

watch(() => props.product, (p) => {
  if (p && props.modelValue) resetCounts(p)
})

function resetCounts(p: Product) {
  const init: Record<string, number> = {}
  ;(p.flavors ?? []).forEach(f => { if (f.isActive) init[f.nombre] = 0 })
  counts.value = init
}

// ── Non-flavor quantity ───────────────────────────────────────
const qty = ref(1)
watch(() => props.modelValue, (open) => { if (open) qty.value = 1 })

// ── Computed ──────────────────────────────────────────────────
const p = computed(() => props.product)

const normalFlavors = computed<ProductFlavor[]>(() =>
  (p.value?.flavors ?? []).filter(f => f.grupo === 'normal' && f.isActive),
)
const especialFlavors = computed<ProductFlavor[]>(() =>
  (p.value?.flavors ?? []).filter(f => f.grupo === 'especial' && f.isActive),
)

const boxSize      = computed(() => p.value?.boxSize ?? 12)
const totalSel     = computed(() => Object.values(counts.value).reduce((s, n) => s + n, 0))
const especialTotal = computed(() =>
  especialFlavors.value.reduce((s, f) => s + (counts.value[f.nombre] ?? 0), 0),
)
const remaining  = computed(() => boxSize.value - totalSel.value)
const isComplete = computed(() => totalSel.value === boxSize.value)
const progress   = computed(() => Math.min((totalSel.value / boxSize.value) * 100, 100))

const allActiveFlavors = computed(() => [...normalFlavors.value, ...especialFlavors.value])
const hasAnyLimit = computed(() => allActiveFlavors.value.some(f => f.limite > 0))
// True when remaining > 0 but every + button is disabled (limits exhausted before filling box)
const isStuck = computed(() =>
  !isComplete.value &&
  remaining.value > 0 &&
  allActiveFlavors.value.length > 0 &&
  allActiveFlavors.value.every(f => !canAdd(f)),
)

function canAdd(flavor: ProductFlavor): boolean {
  if (remaining.value <= 0) return false
  if (flavor.grupo === 'especial' && especialTotal.value >= 2) return false
  if (flavor.limite > 0 && (counts.value[flavor.nombre] ?? 0) >= flavor.limite) return false
  return true
}
function addFlavor(f: ProductFlavor) {
  if (!canAdd(f)) return
  counts.value[f.nombre] = (counts.value[f.nombre] ?? 0) + 1
}
function subFlavor(nombre: string) {
  if ((counts.value[nombre] ?? 0) <= 0) return
  counts.value[nombre] = (counts.value[nombre] ?? 1) - 1
}

// ── Cart actions ──────────────────────────────────────────────
const hasFlavorsConfigured = computed(() =>
  (p.value?.flavors ?? []).some(f => f.isActive),
)

function handleAdd() {
  if (!p.value) return
  if (p.value.hasFlavors && hasFlavorsConfigured.value) {
    if (!isComplete.value) return
    const selections: FlavorSelection[] = Object.entries(counts.value)
      .filter(([, c]) => c > 0)
      .map(([nombre, cantidad]) => {
        const flavor = p.value!.flavors?.find(f => f.nombre === nombre)
        return { nombre, grupo: flavor?.grupo ?? 'normal', cantidad }
      })
    cart.addItem({ slug: p.value.slug, nombre: p.value.nombre, precio: p.value.precio }, selections, false)
  } else {
    for (let i = 0; i < qty.value; i++) {
      cart.addItem({ slug: p.value.slug, nombre: p.value.nombre, precio: p.value.precio }, undefined, false)
    }
  }
  emit('added')
  close()
}

function close() { emit('update:modelValue', false) }
</script>

<template>
  <Teleport to="body">
    <Transition name="detail-modal">
      <div v-if="modelValue && product" class="pdm-overlay" @click.self="close">
        <div class="pdm">

          <!-- Close -->
          <button class="pdm__close" @click="close" aria-label="Cerrar">
            <i class="fa-solid fa-xmark"></i>
          </button>

          <!-- Image -->
          <div class="pdm__image-wrap">
            <img
              v-if="product.imagen?.url"
              :src="product.imagen.url"
              :alt="product.nombre"
              class="pdm__image"
            />
            <div v-else class="pdm__image-placeholder">
              <i class="fa-solid fa-bread-slice"></i>
            </div>
            <div v-if="!product.inStock" class="pdm__oos">Sin stock</div>
            <div v-if="product.hasFlavors" class="pdm__flavor-tag">
              <i class="fa-solid fa-cubes-stacked"></i> Caja personalizable
            </div>
          </div>

          <!-- Content -->
          <div class="pdm__body">

            <!-- Header info -->
            <div class="pdm__info">
              <div class="pdm__meta">
                <span v-if="product.categoria" class="pdm__cat">{{ product.categoria }}</span>
              </div>
              <div class="pdm__name-row">
                <h2 class="pdm__name">{{ product.nombre }}</h2>
                <span class="pdm__price">${{ product.precio.toFixed(2) }}</span>
              </div>
              <p v-if="product.descripcion" class="pdm__desc">{{ product.descripcion }}</p>
            </div>

            <!-- ── NON-FLAVOR: qty selector (also fallback if no flavors configured) ── -->
            <template v-if="!product.hasFlavors || !(product.flavors ?? []).some(f => f.isActive)">
              <div class="pdm__qty-row">
                <span class="pdm__qty-label">Cantidad</span>
                <div class="pdm__qty-ctrl">
                  <button class="pdm__qty-btn" :disabled="qty <= 1" @click="qty--">
                    <i class="fa-solid fa-minus"></i>
                  </button>
                  <span class="pdm__qty-val">{{ qty }}</span>
                  <button class="pdm__qty-btn" @click="qty++">
                    <i class="fa-solid fa-plus"></i>
                  </button>
                </div>
              </div>
            </template>

            <!-- ── FLAVOR: inline picker (only when flavors are configured) ── -->
            <template v-else>
              <div class="pdm__picker">
                <div class="pdm__picker-header">
                  <span class="pdm__picker-title">
                    <i class="fa-solid fa-sliders"></i>
                    Elige tus sabores
                  </span>
                  <span class="pdm__picker-size">Caja de {{ boxSize }}</span>
                </div>

                <!-- Hint: freedom vs. per-flavor limits -->
                <div v-if="!hasAnyLimit" class="pdm__freedom-hint">
                  <i class="fa-solid fa-circle-info"></i>
                  Distribuye los {{ boxSize }} como quieras — puedes poner todos en un solo sabor si quieres
                </div>
                <div v-else class="pdm__freedom-hint pdm__freedom-hint--limited">
                  <i class="fa-solid fa-sliders"></i>
                  Cada sabor tiene un máximo indicado. Total debe ser exactamente {{ boxSize }}.
                </div>

                <!-- Progress -->
                <div class="pdm__prog-wrap">
                  <div class="pdm__prog-bar">
                    <div
                      class="pdm__prog-fill"
                      :class="{ 'pdm__prog-fill--done': isComplete }"
                      :style="{ width: `${progress}%` }"
                    />
                  </div>
                  <span class="pdm__prog-label" :class="{ 'pdm__prog-label--done': isComplete }">
                    <template v-if="isComplete">
                      <i class="fa-solid fa-circle-check"></i> ¡Caja lista!
                    </template>
                    <template v-else-if="totalSel === 0">
                      {{ boxSize }} disponibles para repartir
                    </template>
                    <template v-else>
                      {{ totalSel }} elegidos · {{ remaining }} restantes
                    </template>
                  </span>
                </div>

                <!-- Normal flavors -->
                <div v-if="normalFlavors.length" class="pdm__fgroup">
                  <div class="pdm__fgroup-label">
                    <span class="pdm__fgroup-dot pdm__fgroup-dot--normal"></span>
                    Sabores
                  </div>
                  <div class="pdm__flist">
                    <div v-for="f in normalFlavors" :key="f.nombre" class="pdm__frow">
                      <div class="pdm__fname-wrap">
                        <span class="pdm__fname">{{ f.nombre }}</span>
                        <span v-if="f.limite > 0" class="pdm__flimit pdm__flimit--cap">
                          <i class="fa-solid fa-arrow-up"></i> máx. {{ f.limite }}
                        </span>
                        <span v-else class="pdm__flimit pdm__flimit--free">libre</span>
                      </div>
                      <div class="pdm__fstepper">
                        <button
                          class="pdm__fstep pdm__fstep--minus"
                          :disabled="(counts[f.nombre] ?? 0) === 0"
                          @click="subFlavor(f.nombre)"
                        ><i class="fa-solid fa-minus"></i></button>
                        <span class="pdm__fcount" :class="{ 'pdm__fcount--active': (counts[f.nombre] ?? 0) > 0 }">
                          {{ counts[f.nombre] ?? 0 }}
                        </span>
                        <button
                          class="pdm__fstep pdm__fstep--plus"
                          :disabled="!canAdd(f)"
                          @click="addFlavor(f)"
                        ><i class="fa-solid fa-plus"></i></button>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Especial flavors -->
                <div v-if="especialFlavors.length" class="pdm__fgroup">
                  <div class="pdm__fgroup-label">
                    <span class="pdm__fgroup-dot pdm__fgroup-dot--especial"></span>
                    Especiales
                    <span class="pdm__fgroup-hint pdm__fgroup-hint--especial">
                      <i class="fa-solid fa-star"></i>
                      Máx. 2 por caja · {{ especialTotal }}/2
                    </span>
                  </div>
                  <div class="pdm__flist">
                    <div v-for="f in especialFlavors" :key="f.nombre" class="pdm__frow pdm__frow--especial">
                      <div class="pdm__fname-wrap">
                        <span class="pdm__fname">{{ f.nombre }}</span>
                        <span class="pdm__fbadge">Especial</span>
                        <span v-if="f.limite > 0" class="pdm__flimit pdm__flimit--cap">
                          <i class="fa-solid fa-arrow-up"></i> máx. {{ f.limite }}
                        </span>
                      </div>
                      <div class="pdm__fstepper">
                        <button
                          class="pdm__fstep pdm__fstep--minus"
                          :disabled="(counts[f.nombre] ?? 0) === 0"
                          @click="subFlavor(f.nombre)"
                        ><i class="fa-solid fa-minus"></i></button>
                        <span class="pdm__fcount" :class="{ 'pdm__fcount--active': (counts[f.nombre] ?? 0) > 0 }">
                          {{ counts[f.nombre] ?? 0 }}
                        </span>
                        <button
                          class="pdm__fstep pdm__fstep--plus"
                          :disabled="!canAdd(f)"
                          @click="addFlavor(f)"
                        ><i class="fa-solid fa-plus"></i></button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </template>

          </div><!-- /pdm__body -->

          <!-- Footer CTA -->
          <div class="pdm__footer">
            <button class="pdm__cta-ghost" @click="close">Cerrar</button>
            <button
              class="pdm__cta"
              :disabled="!product.inStock || (product.hasFlavors && hasFlavorsConfigured && !isComplete)"
              @click="handleAdd"
            >
              <i class="fa-solid fa-cart-plus"></i>
              <span v-if="!product.inStock">Sin stock</span>
              <span v-else-if="product.hasFlavors && hasFlavorsConfigured && isStuck">
                <i class="fa-solid fa-triangle-exclamation"></i>
                Los límites no completan la caja — contacta al negocio
              </span>
              <span v-else-if="product.hasFlavors && hasFlavorsConfigured && !isComplete">
                Elige {{ remaining }} más para agregar
              </span>
              <span v-else-if="product.hasFlavors && hasFlavorsConfigured">Agregar al carrito</span>
              <span v-else>
                Agregar · ${{ (product.precio * qty).toFixed(2) }}
              </span>
            </button>
          </div>

        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style lang="scss" scoped>
$accent:   #572612;
$gold:     #FED47F;
$especial: #7c3aed;

.pdm-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.6);
  z-index: 400;
  display: flex;
  align-items: flex-end;
  justify-content: center;

  @media (min-width: 640px) {
    align-items: center;
    padding: 1.5rem;
  }
}

.pdm {
  position: relative;
  background: #fff;
  width: 100%;
  max-width: 520px;
  border-radius: 1.5rem 1.5rem 0 0;
  max-height: 94dvh;
  display: flex;
  flex-direction: column;
  overflow: hidden;

  @media (min-width: 640px) {
    border-radius: 1.5rem;
    max-height: 88dvh;
  }

  // ── Close ─────────────────────────────────────────────────────
  &__close {
    position: absolute;
    top: 0.875rem;
    right: 0.875rem;
    z-index: 10;
    width: 2.25rem;
    height: 2.25rem;
    border-radius: 50%;
    border: none;
    background: rgba(255,255,255,0.9);
    backdrop-filter: blur(4px);
    color: $accent;
    font-size: 0.9rem;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 2px 8px rgba(0,0,0,0.12);
    transition: background 0.15s, transform 0.1s;
    &:hover { background: #fff; transform: scale(1.08); }
  }

  // ── Image ──────────────────────────────────────────────────────
  &__image-wrap {
    position: relative;
    width: 100%;
    aspect-ratio: 16 / 9;
    flex-shrink: 0;
    overflow: hidden;
    background: #fdf5e8;
  }

  &__image {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  &__image-placeholder {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 4rem;
    color: rgba($accent, 0.12);
  }

  &__oos {
    position: absolute;
    inset: 0;
    background: rgba(0,0,0,0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    color: #fff;
    font-weight: 800;
    font-size: 0.9rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  &__flavor-tag {
    position: absolute;
    bottom: 0.75rem;
    left: 0.75rem;
    background: rgba($accent, 0.88);
    backdrop-filter: blur(4px);
    color: $gold;
    font-size: 0.72rem;
    font-weight: 700;
    padding: 0.3rem 0.75rem;
    border-radius: 999px;
    display: flex;
    align-items: center;
    gap: 0.35rem;
    letter-spacing: 0.02em;
  }

  // ── Body ───────────────────────────────────────────────────────
  &__body {
    flex: 1;
    overflow-y: auto;
    padding: 1.25rem 1.375rem;
    display: flex;
    flex-direction: column;
    gap: 1.125rem;
    scrollbar-width: thin;
  }

  &__info { display: flex; flex-direction: column; gap: 0.4rem; }

  &__meta {
    display: flex;
    align-items: center;
    gap: 0.4rem;
  }

  &__cat {
    font-size: 0.72rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.07em;
    color: $accent;
    background: rgba($accent, 0.08);
    padding: 2px 10px;
    border-radius: 999px;
  }

  &__name-row {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 0.75rem;
  }

  &__name {
    font-size: 1.35rem;
    font-weight: 900;
    color: $accent;
    margin: 0;
    letter-spacing: -0.02em;
    line-height: 1.2;
  }

  &__price {
    font-size: 1.5rem;
    font-weight: 900;
    color: $accent;
    letter-spacing: -0.03em;
    flex-shrink: 0;
    font-family: inherit;
  }

  &__desc {
    font-size: 0.875rem;
    color: #777;
    line-height: 1.6;
    margin: 0;
  }

  // ── Qty ────────────────────────────────────────────────────────
  &__qty-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.875rem 1rem;
    background: #fdf8f2;
    border-radius: 0.875rem;
    border: 1.5px solid #ece5d8;
  }

  &__qty-label {
    font-size: 0.875rem;
    font-weight: 700;
    color: $accent;
  }

  &__qty-ctrl {
    display: flex;
    align-items: center;
    gap: 0.875rem;
  }

  &__qty-btn {
    width: 2.25rem;
    height: 2.25rem;
    border-radius: 50%;
    border: 1.5px solid #e8dccf;
    background: #fff;
    color: $accent;
    font-size: 0.7rem;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.12s, border-color 0.12s;
    &:hover:not(:disabled) { background: #fdf0e0; border-color: $accent; }
    &:disabled { opacity: 0.3; cursor: not-allowed; }
  }

  &__qty-val {
    font-size: 1.2rem;
    font-weight: 900;
    color: $accent;
    min-width: 1.5rem;
    text-align: center;
  }

  // ── Flavor picker ───────────────────────────────────────────────
  &__picker {
    display: flex;
    flex-direction: column;
    gap: 0.875rem;
    padding: 1rem;
    background: #fdf8f2;
    border-radius: 1rem;
    border: 1.5px solid #ece5d8;
  }

  &__picker-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  &__picker-title {
    font-size: 0.9rem;
    font-weight: 800;
    color: $accent;
    display: flex;
    align-items: center;
    gap: 0.4rem;
  }

  &__picker-size {
    font-size: 0.75rem;
    color: #aaa;
    font-weight: 600;
  }

  &__prog-wrap { display: flex; flex-direction: column; gap: 0.3rem; }

  &__prog-bar {
    height: 6px;
    background: #e8dccf;
    border-radius: 999px;
    overflow: hidden;
  }

  &__prog-fill {
    height: 100%;
    background: linear-gradient(90deg, #e8a838, $accent);
    border-radius: 999px;
    transition: width 0.22s ease;
    &--done { background: linear-gradient(90deg, #38a169, #276749); }
  }

  &__prog-label {
    font-size: 0.75rem;
    font-weight: 700;
    color: #999;
    display: flex;
    align-items: center;
    gap: 0.3rem;
    &--done { color: #38a169; }
  }

  // ── Flavor groups ──────────────────────────────────────────────
  &__fgroup { display: flex; flex-direction: column; gap: 0.4rem; }

  &__fgroup-label {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    font-size: 0.75rem;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: #666;
  }

  &__fgroup-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    &--normal   { background: $accent; }
    &--especial { background: $especial; }
  }

  &__fgroup-hint {
    margin-left: auto;
    font-size: 0.72rem;
    color: #aaa;
    font-weight: 600;
    text-transform: none;
    letter-spacing: 0;
    &--especial { color: $especial; display: flex; align-items: center; gap: 0.2rem; }
  }

  &__flist { display: flex; flex-direction: column; gap: 0.3rem; }

  &__frow {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.5rem 0.75rem;
    background: #fff;
    border-radius: 0.625rem;
    border: 1.5px solid transparent;
    transition: border-color 0.15s;

    &--especial { background: #f9f5ff; }

    &:has(.pdm__fcount--active) { border-color: rgba($accent, 0.2); }
    &--especial:has(.pdm__fcount--active) { border-color: rgba($especial, 0.2); }
  }

  &__fname-wrap {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    flex: 1;
    min-width: 0;
  }

  &__fname {
    font-size: 0.875rem;
    font-weight: 600;
    color: #333;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  &__fbadge {
    font-size: 0.62rem;
    font-weight: 700;
    text-transform: uppercase;
    background: rgba($especial, 0.1);
    color: $especial;
    padding: 1px 6px;
    border-radius: 999px;
    flex-shrink: 0;
  }

  &__freedom-hint {
    display: flex;
    align-items: flex-start;
    gap: 0.4rem;
    font-size: 0.75rem;
    color: #2f855a;
    background: #f0fff4;
    border: 1px solid #9ae6b4;
    border-radius: 0.625rem;
    padding: 0.5rem 0.75rem;
    line-height: 1.4;
    i { flex-shrink: 0; margin-top: 0.1rem; font-size: 0.7rem; }

    &--limited {
      color: #744210;
      background: #fffbeb;
      border-color: #f6ad55;
    }
  }

  &__flimit {
    display: inline-flex;
    align-items: center;
    gap: 0.2rem;
    font-size: 0.67rem;
    font-weight: 700;
    padding: 1px 6px;
    border-radius: 999px;
    flex-shrink: 0;
    i { font-size: 0.55rem; }

    &--cap {
      color: #c05621;
      background: #fffaf0;
      border: 1px solid #fbd38d;
    }

    &--free {
      color: #2f855a;
      background: #f0fff4;
      border: 1px solid #9ae6b4;
    }
  }

  &__fstepper {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-shrink: 0;
  }

  &__fstep {
    width: 1.875rem;
    height: 1.875rem;
    border-radius: 50%;
    border: 1.5px solid #e8dccf;
    background: #fff;
    color: $accent;
    font-size: 0.6rem;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.1s, transform 0.08s;

    &--plus:not(:disabled) {
      background: $accent;
      border-color: $accent;
      color: $gold;
    }
    &:hover:not(:disabled) { transform: scale(1.1); }
    &:disabled { opacity: 0.28; cursor: not-allowed; transform: none; }
  }

  &__fcount {
    min-width: 1.4rem;
    text-align: center;
    font-size: 0.95rem;
    font-weight: 800;
    color: #ccc;
    transition: color 0.12s;
    &--active { color: $accent; }
  }

  // ── Footer ─────────────────────────────────────────────────────
  &__footer {
    display: flex;
    gap: 0.625rem;
    padding: 1rem 1.375rem;
    border-top: 1px solid #f0ede8;
    flex-shrink: 0;
  }

  &__cta-ghost {
    padding: 0.75rem 1.125rem;
    border-radius: 0.875rem;
    border: 1.5px solid #e8dccf;
    background: transparent;
    color: #999;
    font-size: 0.85rem;
    font-weight: 700;
    cursor: pointer;
    transition: background 0.12s;
    flex-shrink: 0;
    &:hover { background: #f5f0e8; color: $accent; }
  }

  &__cta {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 0.875rem 1.25rem;
    border-radius: 0.875rem;
    border: none;
    background: $accent;
    color: $gold;
    font-size: 0.925rem;
    font-weight: 800;
    cursor: pointer;
    transition: opacity 0.15s, transform 0.12s;

    &:hover:not(:disabled) { opacity: 0.88; transform: translateY(-1px); }
    &:active:not(:disabled) { transform: translateY(0); }
    &:disabled { background: #d8cfc3; color: #aaa; cursor: not-allowed; }
  }
}

// ── Modal transition ──────────────────────────────────────────
.detail-modal-enter-active,
.detail-modal-leave-active {
  transition: opacity 0.25s ease;
  .pdm { transition: transform 0.3s cubic-bezier(0.32, 0.72, 0, 1); }
}
.detail-modal-enter-from,
.detail-modal-leave-to {
  opacity: 0;
  .pdm { transform: translateY(60px); }
}
@media (min-width: 640px) {
  .detail-modal-enter-from .pdm,
  .detail-modal-leave-to .pdm {
    transform: scale(0.92) translateY(16px);
  }
}
</style>
