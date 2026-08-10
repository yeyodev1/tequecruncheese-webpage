<script setup lang="ts">
defineProps<{ modelValue: 'delivery' | 'pickup' }>()
const emit = defineEmits<{ 'update:modelValue': ['delivery' | 'pickup'] }>()
</script>

<template>
  <div>
    <div class="co-delivery-method">
      <button
        class="co-delivery-method__btn"
        :class="{ 'co-delivery-method__btn--active': modelValue === 'delivery' }"
        @click="emit('update:modelValue', 'delivery')"
      >
        <i class="fa-solid fa-truck"></i>
        <div>
          <strong>Envío a domicilio</strong>
          <span>Te lo llevamos a tu puerta</span>
        </div>
      </button>
      <button
        class="co-delivery-method__btn"
        :class="{ 'co-delivery-method__btn--active': modelValue === 'pickup' }"
        @click="emit('update:modelValue', 'pickup')"
      >
        <i class="fa-solid fa-store"></i>
        <div>
          <strong>Recoger en tienda</strong>
          <span>Sin costo de envío</span>
        </div>
      </button>
    </div>

    <div v-if="modelValue === 'pickup'" class="co-pickup-info">
      <i class="fa-solid fa-location-dot"></i>
      <div>
        <strong>Retira en nuestro local</strong>
        <span>Te avisamos cuando tu pedido esté listo</span>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
$accent: #572612;

.co-delivery-method {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
  margin-bottom: 0.25rem;

  &__btn {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    min-height: 44px;
    padding: 0.875rem 1rem;
    border-radius: 0.875rem;
    border: 2px solid #e8e5e0;
    background: #fafafa;
    cursor: pointer;
    text-align: left;
    transition: border-color 0.15s, background 0.15s, box-shadow 0.15s;

    > i {
      font-size: 1.1rem;
      color: #bbb;
      flex-shrink: 0;
      transition: color 0.15s;
    }

    div {
      display: flex;
      flex-direction: column;
      gap: 0.1rem;
      min-width: 0;

      strong {
        font-size: 0.82rem;
        font-weight: 800;
        color: #444;
        line-height: 1.2;
      }

      span {
        font-size: 0.7rem;
        color: #aaa;
      }
    }

    &--active {
      border-color: $accent;
      background: rgba($accent, 0.04);
      box-shadow: 0 0 0 3px rgba($accent, 0.07);

      > i { color: $accent; }
      div strong { color: $accent; }
    }

    &:not(&--active):hover {
      border-color: #ccc;
      background: #f5f5f5;
    }
  }
}

.co-pickup-info {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 0.875rem 1rem;
  background: #f0fff4;
  border: 1.5px solid #9ae6b4;
  border-radius: 0.875rem;
  margin-top: 0.75rem;
  color: #276749;
  font-size: 0.85rem;

  > i {
    font-size: 1rem;
    flex-shrink: 0;
    margin-top: 0.1rem;
    color: #38a169;
  }

  div {
    display: flex;
    flex-direction: column;
    gap: 0.1rem;

    strong { font-weight: 800; }
    span { font-size: 0.78rem; opacity: 0.8; }
  }
}
</style>
