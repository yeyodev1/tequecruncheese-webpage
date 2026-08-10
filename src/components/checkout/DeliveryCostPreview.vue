<script setup lang="ts">
/** The live shipping estimate that sits under the Google Maps field. */
defineProps<{
  show: boolean
  isResolving: boolean
  hasCoords: boolean
  outOfRange: boolean
  km: number | null
  cost: number | null
}>()
</script>

<template>
  <Transition name="co-delivery">
    <div
      v-if="show"
      class="co-delivery-preview"
      :class="{
        'co-delivery-preview--loading': isResolving,
        'co-delivery-preview--ok': !isResolving && hasCoords && !outOfRange,
        'co-delivery-preview--warn': !isResolving && (!hasCoords || outOfRange),
      }"
    >
      <template v-if="isResolving">
        <i class="fa-solid fa-spinner fa-spin"></i>
        <div class="co-delivery-preview__body">
          <strong>Calculando distancia...</strong>
        </div>
      </template>
      <template v-else-if="hasCoords && outOfRange">
        <i class="fa-solid fa-triangle-exclamation"></i>
        <div class="co-delivery-preview__body">
          <strong>Estás a {{ km!.toFixed(1) }} km de la tienda</strong>
          <span>Fuera de nuestra zona habitual; coordinamos el envío contigo</span>
        </div>
      </template>
      <template v-else-if="hasCoords">
        <i class="fa-solid fa-truck"></i>
        <div class="co-delivery-preview__body">
          <strong>${{ cost!.toFixed(2) }} de envío</strong>
          <span>{{ km!.toFixed(1) }} km desde nuestra tienda</span>
        </div>
      </template>
      <template v-else>
        <i class="fa-solid fa-triangle-exclamation"></i>
        <div class="co-delivery-preview__body">
          <strong>No pudimos calcular la distancia exacta</strong>
          <span>Igual puedes continuar; coordinaremos el envío con tu referencia</span>
        </div>
      </template>
    </div>
  </Transition>
</template>

<style scoped lang="scss">
.co-delivery-preview {
  display: flex;
  align-items: flex-start;
  gap: 0.6rem;
  padding: 0.75rem 0.875rem;
  border-radius: 0.75rem;
  margin-top: 0.5rem;
  font-size: 0.82rem;

  > i {
    font-size: 0.9rem;
    flex-shrink: 0;
    margin-top: 0.1rem;
  }

  &__body {
    display: flex;
    flex-direction: column;
    gap: 0.1rem;

    strong {
      font-weight: 800;
      line-height: 1.2;
    }

    span {
      font-size: 0.75rem;
      opacity: 0.75;
    }
  }

  &--loading {
    background: #f7f8ff;
    border: 1.5px solid #bee3f8;
    color: #2b6cb0;
    > i { color: #3182ce; }
  }

  &--ok {
    background: #f0fff4;
    border: 1.5px solid #9ae6b4;
    color: #276749;
    > i { color: #38a169; }
  }

  &--warn {
    background: #fffbeb;
    border: 1.5px solid #fbd38d;
    color: #92400e;
    > i { color: #dd6b20; }
  }
}

.co-delivery-enter-active,
.co-delivery-leave-active {
  transition: opacity 0.2s, transform 0.2s;
}

.co-delivery-enter-from,
.co-delivery-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
