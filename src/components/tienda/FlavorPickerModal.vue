<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { Product, ProductFlavor, FlavorSelection } from '@/types'

const props = defineProps<{
  product: Product
  modelValue: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  confirm: [selections: FlavorSelection[]]
}>()

// ── Local state ───────────────────────────────────────────────
const counts = ref<Record<string, number>>({})

// Reset counts when modal opens
watch(() => props.modelValue, (open) => {
  if (open) {
    const initial: Record<string, number> = {}
    ;(props.product.flavors ?? []).forEach(f => { if (f.isActive) initial[f.nombre] = 0 })
    counts.value = initial
  }
})

// ── Computed ──────────────────────────────────────────────────
const normalFlavors = computed(() =>
  (props.product.flavors ?? []).filter(f => f.grupo === 'normal' && f.isActive),
)
const especialFlavors = computed(() =>
  (props.product.flavors ?? []).filter(f => f.grupo === 'especial' && f.isActive),
)

const boxSize = computed(() => props.product.boxSize ?? 12)
const totalSelected = computed(() => Object.values(counts.value).reduce((s, n) => s + n, 0))
const especialTotal = computed(() =>
  especialFlavors.value.reduce((s, f) => s + (counts.value[f.nombre] ?? 0), 0),
)
const remaining = computed(() => boxSize.value - totalSelected.value)
const isComplete = computed(() => totalSelected.value === boxSize.value)

function canAdd(flavor: ProductFlavor): boolean {
  if (remaining.value <= 0) return false
  if (flavor.grupo === 'especial' && especialTotal.value >= 2) return false
  if (flavor.limite > 0 && (counts.value[flavor.nombre] ?? 0) >= flavor.limite) return false
  return true
}

function add(nombre: string, flavor: ProductFlavor) {
  if (!canAdd(flavor)) return
  counts.value[nombre] = (counts.value[nombre] ?? 0) + 1
}

function remove(nombre: string) {
  if ((counts.value[nombre] ?? 0) <= 0) return
  counts.value[nombre] = (counts.value[nombre] ?? 1) - 1
}

function confirm() {
  const selections: FlavorSelection[] = Object.entries(counts.value)
    .filter(([, c]) => c > 0)
    .map(([nombre, cantidad]) => {
      const flavor = props.product.flavors?.find(f => f.nombre === nombre)
      return { nombre, grupo: flavor?.grupo ?? 'normal', cantidad }
    })
  emit('confirm', selections)
  emit('update:modelValue', false)
}

function close() {
  emit('update:modelValue', false)
}
</script>

<template>
  <Teleport to="body">
    <Transition name="picker-modal">
      <div v-if="modelValue" class="fp-overlay" @click.self="close">
        <div class="fp">

          <!-- Header -->
          <div class="fp__header">
            <div class="fp__header-info">
              <h3 class="fp__title">Personaliza tu caja</h3>
              <p class="fp__subtitle">{{ product.nombre }}</p>
            </div>
            <button class="fp__close" @click="close">
              <i class="fa-solid fa-xmark"></i>
            </button>
          </div>

          <!-- Progress bar -->
          <div class="fp__progress-wrap">
            <div class="fp__progress-bar">
              <div
                class="fp__progress-fill"
                :class="{ 'fp__progress-fill--done': isComplete }"
                :style="{ width: `${Math.min((totalSelected / boxSize) * 100, 100)}%` }"
              />
            </div>
            <span class="fp__progress-label" :class="{ 'fp__progress-label--done': isComplete }">
              <template v-if="isComplete">
                <i class="fa-solid fa-circle-check"></i> ¡Caja completa!
              </template>
              <template v-else>
                {{ totalSelected }} / {{ boxSize }} — faltan {{ remaining }}
              </template>
            </span>
          </div>

          <!-- Body -->
          <div class="fp__body">

            <!-- Normal flavors -->
            <div v-if="normalFlavors.length" class="fp__group">
              <div class="fp__group-header">
                <span class="fp__group-dot fp__group-dot--normal"></span>
                <span class="fp__group-name">Clásicos</span>
                <span class="fp__group-hint">Sin límite</span>
              </div>
              <div class="fp__flavor-list">
                <div v-for="f in normalFlavors" :key="f.nombre" class="fp__flavor-row">
                  <span class="fp__flavor-name">
                    {{ f.nombre }}
                    <span v-if="f.limite > 0" class="fp__flavor-limite">máx. {{ f.limite }}</span>
                  </span>
                  <div class="fp__qty">
                    <button
                      class="fp__qty-btn fp__qty-btn--minus"
                      :disabled="(counts[f.nombre] ?? 0) === 0"
                      @click="remove(f.nombre)"
                    >
                      <i class="fa-solid fa-minus"></i>
                    </button>
                    <span class="fp__qty-val" :class="{ 'fp__qty-val--active': (counts[f.nombre] ?? 0) > 0 }">
                      {{ counts[f.nombre] ?? 0 }}
                    </span>
                    <button
                      class="fp__qty-btn fp__qty-btn--plus"
                      :disabled="!canAdd(f)"
                      @click="add(f.nombre, f)"
                    >
                      <i class="fa-solid fa-plus"></i>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <!-- Especial flavors -->
            <div v-if="especialFlavors.length" class="fp__group">
              <div class="fp__group-header">
                <span class="fp__group-dot fp__group-dot--especial"></span>
                <span class="fp__group-name">Especiales</span>
                <span class="fp__group-hint fp__group-hint--especial">
                  <i class="fa-solid fa-star"></i>
                  Máx. 2 por caja · {{ especialTotal }}/2
                </span>
              </div>
              <div class="fp__flavor-list">
                <div v-for="f in especialFlavors" :key="f.nombre" class="fp__flavor-row fp__flavor-row--especial">
                  <span class="fp__flavor-name">
                    {{ f.nombre }}
                    <span class="fp__flavor-badge">Especial</span>
                    <span v-if="f.limite > 0" class="fp__flavor-limite">máx. {{ f.limite }}</span>
                  </span>
                  <div class="fp__qty">
                    <button
                      class="fp__qty-btn fp__qty-btn--minus"
                      :disabled="(counts[f.nombre] ?? 0) === 0"
                      @click="remove(f.nombre)"
                    >
                      <i class="fa-solid fa-minus"></i>
                    </button>
                    <span class="fp__qty-val" :class="{ 'fp__qty-val--active': (counts[f.nombre] ?? 0) > 0 }">
                      {{ counts[f.nombre] ?? 0 }}
                    </span>
                    <button
                      class="fp__qty-btn fp__qty-btn--plus"
                      :disabled="!canAdd(f)"
                      @click="add(f.nombre, f)"
                    >
                      <i class="fa-solid fa-plus"></i>
                    </button>
                  </div>
                </div>
              </div>
            </div>

          </div>

          <!-- Footer -->
          <div class="fp__footer">
            <button class="fp__btn fp__btn--ghost" @click="close">Cancelar</button>
            <button
              class="fp__btn fp__btn--primary"
              :disabled="!isComplete"
              @click="confirm"
            >
              <i class="fa-solid fa-cart-plus"></i>
              <span>{{ isComplete ? 'Agregar al carrito' : `Completa la caja (${totalSelected}/${boxSize})` }}</span>
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

.fp-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
  z-index: 500;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding: 0;

  @media (min-width: 600px) {
    align-items: center;
    padding: 1.5rem;
  }
}

.fp {
  background: #fff;
  border-radius: 1.5rem 1.5rem 0 0;
  width: 100%;
  max-width: 480px;
  max-height: 92dvh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 -8px 40px rgba(0,0,0,0.18);

  @media (min-width: 600px) {
    border-radius: 1.25rem;
    max-height: 80dvh;
  }

  &__header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    padding: 1.25rem 1.25rem 0.75rem;
    border-bottom: 1px solid #f0ede8;
    flex-shrink: 0;
  }

  &__title {
    font-size: 1.1rem;
    font-weight: 800;
    color: $accent;
    margin: 0 0 0.2rem;
  }

  &__subtitle {
    font-size: 0.8rem;
    color: #999;
    margin: 0;
  }

  &__close {
    width: 2rem;
    height: 2rem;
    border-radius: 50%;
    border: none;
    background: #f5f0e8;
    color: $accent;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    margin-left: 0.5rem;
    transition: background 0.15s;
    &:hover { background: #ece5d8; }
  }

  // ── Progress ────────────────────────────────────────────────
  &__progress-wrap {
    padding: 0.875rem 1.25rem 0.5rem;
    flex-shrink: 0;
  }

  &__progress-bar {
    height: 7px;
    background: #f0ede8;
    border-radius: 999px;
    overflow: hidden;
    margin-bottom: 0.4rem;
  }

  &__progress-fill {
    height: 100%;
    background: linear-gradient(90deg, #e8a838, $accent);
    border-radius: 999px;
    transition: width 0.25s ease;

    &--done {
      background: linear-gradient(90deg, #38a169, #276749);
    }
  }

  &__progress-label {
    font-size: 0.78rem;
    font-weight: 700;
    color: #888;
    display: flex;
    align-items: center;
    gap: 0.3rem;

    &--done {
      color: #38a169;
    }
  }

  // ── Body ────────────────────────────────────────────────────
  &__body {
    overflow-y: auto;
    flex: 1;
    padding: 0.5rem 0 1rem;
    scrollbar-width: thin;
  }

  // ── Group ───────────────────────────────────────────────────
  &__group {
    padding: 0.75rem 1.25rem 0;
  }

  &__group-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.625rem;
  }

  &__group-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    flex-shrink: 0;

    &--normal   { background: $accent; }
    &--especial { background: $especial; }
  }

  &__group-name {
    font-size: 0.82rem;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: #555;
  }

  &__group-hint {
    margin-left: auto;
    font-size: 0.75rem;
    color: #aaa;

    &--especial {
      color: $especial;
      font-weight: 700;
      display: flex;
      align-items: center;
      gap: 0.25rem;
    }
  }

  // ── Flavor row ──────────────────────────────────────────────
  &__flavor-list {
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
  }

  &__flavor-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.625rem 0.875rem;
    background: #fdfaf5;
    border-radius: 0.75rem;
    border: 1.5px solid transparent;
    transition: border-color 0.15s, background 0.15s;

    &--especial {
      background: #f9f5ff;
      &:has(.fp__qty-val--active) {
        border-color: rgba($especial, 0.3);
        background: #f3ebff;
      }
    }

    &:has(.fp__qty-val--active) {
      border-color: rgba($accent, 0.2);
      background: #fff8f0;
    }
  }

  &__flavor-name {
    font-size: 0.9rem;
    font-weight: 600;
    color: #333;
    display: flex;
    align-items: center;
    gap: 0.4rem;
  }

  &__flavor-badge {
    font-size: 0.65rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    background: rgba($especial, 0.12);
    color: $especial;
    padding: 1px 6px;
    border-radius: 999px;
  }

  &__flavor-limite {
    font-size: 0.68rem;
    font-weight: 600;
    color: #aaa;
    background: #f0ede8;
    padding: 1px 6px;
    border-radius: 999px;
  }

  // ── Qty stepper ─────────────────────────────────────────────
  &__qty {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-shrink: 0;
  }

  &__qty-btn {
    width: 2rem;
    height: 2rem;
    border-radius: 50%;
    border: 1.5px solid #e8dccf;
    background: #fff;
    color: $accent;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.65rem;
    transition: background 0.12s, border-color 0.12s, transform 0.1s;

    &:hover:not(:disabled) {
      background: #fdf0e0;
      border-color: $accent;
      transform: scale(1.08);
    }

    &:disabled {
      opacity: 0.3;
      cursor: not-allowed;
      transform: none;
    }

    &--plus:not(:disabled) {
      background: $accent;
      border-color: $accent;
      color: $gold;
      &:hover { opacity: 0.88; }
    }
  }

  &__qty-val {
    min-width: 1.6rem;
    text-align: center;
    font-size: 1rem;
    font-weight: 800;
    color: #ccc;
    transition: color 0.15s, transform 0.15s;

    &--active {
      color: $accent;
      transform: scale(1.1);
    }
  }

  // ── Footer ──────────────────────────────────────────────────
  &__footer {
    display: flex;
    gap: 0.625rem;
    padding: 1rem 1.25rem;
    border-top: 1px solid #f0ede8;
    flex-shrink: 0;
  }

  &__btn {
    flex: 1;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.4rem;
    padding: 0.75rem 1rem;
    border-radius: 0.75rem;
    font-size: 0.88rem;
    font-weight: 700;
    cursor: pointer;
    border: none;
    transition: opacity 0.15s, transform 0.12s;

    &--ghost {
      background: #f5f0e8;
      color: $accent;
      flex: 0 0 auto;
      padding: 0.75rem 1.25rem;
      &:hover { background: #ece5d8; }
    }

    &--primary {
      background: $accent;
      color: $gold;
      &:hover:not(:disabled) {
        opacity: 0.88;
        transform: translateY(-1px);
      }
      &:disabled {
        background: #d8cfc3;
        color: #aaa;
        cursor: not-allowed;
      }
    }
  }
}

// ── Modal transition ──────────────────────────────────────────
.picker-modal-enter-active,
.picker-modal-leave-active {
  transition: opacity 0.25s ease;
  .fp {
    transition: transform 0.3s cubic-bezier(0.32, 0.72, 0, 1);
  }
}
.picker-modal-enter-from,
.picker-modal-leave-to {
  opacity: 0;
  .fp { transform: translateY(100%); }
}
@media (min-width: 600px) {
  .picker-modal-enter-from .fp,
  .picker-modal-leave-to .fp {
    transform: scale(0.9) translateY(12px);
  }
}
</style>
