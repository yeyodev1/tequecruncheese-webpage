<script setup lang="ts">
/** Numbered card that wraps each checkout step. */
defineProps<{ num: string | number; title: string; hint?: string; variant?: 'payment' }>()
</script>

<template>
  <section :class="['co-section', variant && `co-section--${variant}`]">
    <div class="co-section__head">
      <span class="co-section__num">{{ num }}</span>
      <div>
        <h2 class="co-section__title">{{ title }}</h2>
        <p v-if="hint" class="co-section__hint">{{ hint }}</p>
      </div>
    </div>
    <slot />
  </section>
</template>

<style scoped lang="scss">
$accent: #572612;

.co-section {
  background: #fff;
  border-radius: 1.25rem;
  padding: 1.5rem;
  border: 1px solid rgba(0, 0, 0, 0.05);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);

  &--payment {
    background: linear-gradient(135deg, #fdf8f0 0%, #fff 100%);
  }

  &__head {
    display: flex;
    align-items: flex-start;
    gap: 0.75rem;
    margin-bottom: 1.25rem;
  }

  &__num {
    flex-shrink: 0;
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background: $accent;
    color: #fff;
    display: grid;
    place-items: center;
    font-size: 0.8rem;
    font-weight: 800;
  }

  &__title {
    font-size: 1.05rem;
    font-weight: 800;
    color: $accent;
    margin: 0;
    line-height: 1.2;
  }

  &__hint {
    font-size: 0.78rem;
    color: #999;
    margin: 0.15rem 0 0;
  }
}
</style>
