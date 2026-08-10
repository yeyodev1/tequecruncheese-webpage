<script setup lang="ts">
import type { CartItem } from '@/types'

defineProps<{ items: CartItem[] }>()
const emit = defineEmits<{ pick: [slug: string] }>()
</script>

<template>
  <div v-if="items.length > 0" class="co-flavor-alert">
    <div class="co-flavor-alert__head">
      <i class="fa-solid fa-triangle-exclamation"></i>
      <div>
        <p class="co-flavor-alert__title">¡Falta elegir sabores!</p>
        <p class="co-flavor-alert__sub">
          Debes configurar los sabores de tu caja antes de pagar.
        </p>
      </div>
    </div>
    <ul class="co-flavor-alert__list">
      <li v-for="item in items" :key="item.slug" class="co-flavor-alert__item">
        <div class="co-flavor-alert__item-info">
          <i class="fa-solid fa-cubes-stacked"></i>
          <span>{{ item.nombre }}</span>
          <span class="co-flavor-alert__badge">Sin sabores</span>
        </div>
        <button class="co-flavor-alert__btn" @click="emit('pick', item.slug)">
          <i class="fa-solid fa-sliders"></i>
          Elegir sabores
        </button>
      </li>
    </ul>
  </div>
</template>

<style scoped lang="scss">
.co-flavor-alert {
  background: #fffbeb;
  border: 2px solid #f6ad55;
  border-radius: 1.125rem;
  padding: 1.125rem 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.875rem;

  &__head {
    display: flex;
    align-items: flex-start;
    gap: 0.75rem;

    > i {
      font-size: 1.1rem;
      color: #dd6b20;
      margin-top: 0.1rem;
      flex-shrink: 0;
    }
  }

  &__title {
    font-size: 0.95rem;
    font-weight: 800;
    color: #7b341e;
    margin: 0 0 0.15rem;
  }

  &__sub {
    font-size: 0.8rem;
    color: #9c4221;
    margin: 0;
    line-height: 1.4;
  }

  &__list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  &__item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    padding: 0.75rem 1rem;
    background: #fff;
    border-radius: 0.75rem;
    border: 1.5px solid #fbd38d;
  }

  &__item-info {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex: 1;
    min-width: 0;

    i {
      font-size: 0.85rem;
      color: #dd6b20;
      flex-shrink: 0;
    }

    span {
      font-size: 0.875rem;
      font-weight: 700;
      color: #7b341e;
    }
  }

  &__badge {
    font-size: 0.68rem !important;
    font-weight: 700 !important;
    background: #fed7aa;
    color: #c05621 !important;
    padding: 0.15rem 0.5rem;
    border-radius: 999px;
    flex-shrink: 0;
  }

  &__btn {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    min-height: 44px;
    background: #572612;
    color: #fed47f;
    border: none;
    border-radius: 0.625rem;
    padding: 0.55rem 1rem;
    font-size: 0.82rem;
    font-weight: 800;
    cursor: pointer;
    white-space: nowrap;
    flex-shrink: 0;
    transition: opacity 0.15s, transform 0.1s;

    i { font-size: 0.75rem; }

    &:hover {
      opacity: 0.88;
      transform: translateY(-1px);
    }
  }
}
</style>
