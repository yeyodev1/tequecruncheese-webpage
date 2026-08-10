<script setup lang="ts">
import { useCartStore } from '@/stores/cart'
import type { FlavorSelection } from '@/types'

defineProps<{
  isPickup: boolean
  deliveryKm: number | null
  deliveryCost: number | null
  grandTotal: number
  scheduledFor: string | null
  scheduledLabel: string
}>()

const emit = defineEmits<{ edit: [] }>()

const cart = useCartStore()

function flavorSummary(selections: FlavorSelection[]): string {
  return selections.map(s => `${s.cantidad}× ${s.nombre}`).join(', ')
}
</script>

<template>
  <aside class="co-summary">
    <div class="co-summary__inner">
      <h3 class="co-summary__title">
        <i class="fa-solid fa-receipt"></i>
        Tu pedido
      </h3>

      <ul class="co-summary__list">
        <li v-for="item in cart.items" :key="item.slug" class="co-summary__item">
          <div class="co-summary__item-body">
            <div class="co-summary__item-info">
              <span class="co-summary__item-qty">{{ item.cantidad }}×</span>
              <div class="co-summary__item-text">
                <span class="co-summary__item-name">{{ item.nombre }}</span>
                <span v-if="item.flavorSelections?.length" class="co-summary__item-flavors">
                  <i class="fa-solid fa-sliders"></i>
                  {{ flavorSummary(item.flavorSelections) }}
                </span>
              </div>
            </div>
            <span class="co-summary__item-price">
              ${{ (item.precio * item.cantidad).toFixed(2) }}
            </span>
          </div>
        </li>
      </ul>

      <div v-if="scheduledFor" class="co-summary__schedule">
        <i class="fa-regular fa-calendar-check"></i>
        <div>
          <strong>{{ isPickup ? 'Retiro' : 'Entrega' }} programada</strong>
          <span>{{ scheduledLabel }}</span>
        </div>
      </div>

      <div class="co-summary__totals">
        <div class="co-summary__row">
          <span>Subtotal</span>
          <span>${{ cart.totalPrice.toFixed(2) }}</span>
        </div>
        <div v-if="isPickup" class="co-summary__row co-summary__row--delivery">
          <span><i class="fa-solid fa-store"></i> Retiro en tienda</span>
          <span>Gratis</span>
        </div>
        <div
          v-else-if="deliveryCost !== null && deliveryCost > 0"
          class="co-summary__row co-summary__row--delivery"
        >
          <span>
            <i class="fa-solid fa-truck"></i>
            Envío ({{ deliveryKm!.toFixed(1) }} km)
          </span>
          <span>${{ deliveryCost.toFixed(2) }}</span>
        </div>
        <div v-else class="co-summary__row co-summary__row--delivery-pending">
          <span><i class="fa-solid fa-truck"></i> Envío</span>
          <span>por coordinar</span>
        </div>
        <div class="co-summary__row co-summary__row--total">
          <span>Total</span>
          <strong>${{ grandTotal.toFixed(2) }}</strong>
        </div>
      </div>

      <button class="co-summary__edit" @click="emit('edit')">
        <i class="fa-solid fa-pen-to-square"></i>
        Editar pedido
      </button>
    </div>
  </aside>
</template>

<style scoped lang="scss">
$accent: #572612;

.co-summary {
  @media (min-width: 900px) {
    width: 340px;
    flex-shrink: 0;
    // Only sticks because html/body use overflow-x: clip, not hidden —
    // `hidden` would make them scroll containers and disable this.
    position: sticky;
    top: 80px;
  }

  &__inner {
    background: #fff;
    border-radius: 1.25rem;
    padding: 1.375rem;
    border: 1px solid rgba(0, 0, 0, 0.06);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  }

  &__title {
    font-size: 0.875rem;
    font-weight: 800;
    color: $accent;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    display: flex;
    align-items: center;
    gap: 0.4rem;
    margin: 0 0 1rem;

    i {
      font-size: 0.8rem;
      color: rgba($accent, 0.5);
    }
  }

  &__list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    border-top: 1px solid #f0ede8;
  }

  &__item { border-bottom: 1px solid #f0ede8; }

  &__item-body {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 0.75rem;
    padding: 0.75rem 0;
  }

  &__item-info {
    display: flex;
    align-items: flex-start;
    gap: 0.5rem;
    flex: 1;
    min-width: 0;
  }

  &__item-qty {
    font-size: 0.8rem;
    font-weight: 800;
    color: rgba($accent, 0.45);
    flex-shrink: 0;
    margin-top: 0.1rem;
  }

  &__item-text {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
    min-width: 0;
  }

  &__item-name {
    font-size: 0.875rem;
    font-weight: 700;
    color: $accent;
    line-height: 1.3;
  }

  &__item-flavors {
    font-size: 0.72rem;
    color: #999;
    display: flex;
    align-items: center;
    gap: 0.25rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;

    i {
      font-size: 0.65rem;
      flex-shrink: 0;
    }
  }

  &__item-price {
    font-size: 0.875rem;
    font-weight: 800;
    color: $accent;
    flex-shrink: 0;
    white-space: nowrap;
  }

  &__schedule {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    margin-top: 0.85rem;
    padding: 0.6rem 0.8rem;
    border-radius: $border-radius-md;
    background: rgba($color-primary, 0.28);

    > i {
      color: $color-secondary;
      font-size: 0.95rem;
    }

    div {
      display: flex;
      flex-direction: column;
      line-height: 1.3;
    }

    strong {
      font-size: 0.8rem;
      font-weight: 700;
      color: $color-accent;
    }

    span {
      font-size: 0.78rem;
      color: rgba($color-accent, 0.7);
      text-transform: capitalize;
    }
  }

  &__totals {
    padding: 1rem 0 0;
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }

  &__row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 0.82rem;
    color: #888;
    font-weight: 500;

    i {
      font-size: 0.7rem;
      margin-right: 0.2rem;
    }

    &--delivery {
      color: #276749;
      font-weight: 600;
      background: #f0fff4;
      padding: 0.3rem 0.5rem;
      border-radius: 0.5rem;
      margin: 0 -0.5rem;
    }

    &--delivery-pending {
      font-style: italic;
      color: #bbb;
    }

    &--total {
      padding-top: 0.625rem;
      border-top: 2px solid #f0ede8;
      margin-top: 0.25rem;
      font-size: 1rem;
      color: $accent;
      font-weight: 700;

      strong {
        font-size: 1.25rem;
        font-weight: 900;
        letter-spacing: -0.02em;
      }
    }
  }

  &__edit {
    margin-top: 1rem;
    width: 100%;
    min-height: 44px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.4rem;
    padding: 0.625rem 1rem;
    border: 1.5px solid #e8e4dc;
    border-radius: 0.75rem;
    background: none;
    color: #aaa;
    font-size: 0.8rem;
    font-weight: 600;
    cursor: pointer;
    transition: color 0.12s, border-color 0.12s, background 0.12s;

    i { font-size: 0.72rem; }

    &:hover {
      color: $accent;
      border-color: $accent;
      background: rgba($accent, 0.03);
    }
  }
}
</style>
