<script setup lang="ts">
/**
 * One labelled input with its icon, error state and hint.
 * Every checkout field is this shape, so the markup lives here once.
 */
withDefaults(defineProps<{
  label: string
  icon: string
  modelValue: string
  placeholder?: string
  required?: boolean
  /** Shown when `invalid` is true. */
  error?: string
  invalid?: boolean
  /** Grey note under the label, e.g. "(opcional)". */
  optional?: string
  hint?: string
  type?: string
  maxlength?: number
  inputmode?: 'text' | 'numeric' | 'tel' | 'email' | 'url'
  autocomplete?: string
}>(), {
  required: false,
  invalid: false,
  type: 'text',
})

const emit = defineEmits<{
  'update:modelValue': [string]
  blur: []
}>()

function onInput(event: Event) {
  emit('update:modelValue', (event.target as HTMLInputElement).value)
}
</script>

<template>
  <div class="co-field">
    <label class="co-field__label">
      {{ label }}
      <span v-if="required" class="co-field__req">*</span>
      <span v-if="optional" class="co-field__optional">{{ optional }}</span>
    </label>

    <div :class="['co-field__input', { 'co-field__input--err': invalid }]">
      <i :class="icon"></i>
      <input
        :type="type"
        :value="modelValue"
        :placeholder="placeholder"
        :maxlength="maxlength"
        :inputmode="inputmode"
        :autocomplete="autocomplete"
        @input="onInput"
        @blur="emit('blur')"
      />
    </div>

    <span v-if="invalid && error" class="co-field__err">
      <i class="fa-solid fa-circle-exclamation"></i> {{ error }}
    </span>
    <span v-else-if="hint" class="co-field__hint-text">
      <i class="fa-solid fa-circle-info"></i> {{ hint }}
    </span>

    <slot />
  </div>
</template>

<style scoped lang="scss">
@use '@/styles/checkout-field' as *;
@include checkout-field;
</style>
