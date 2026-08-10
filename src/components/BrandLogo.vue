<script setup lang="ts">
import { computed } from 'vue'
import { cloudImg, cloudSrcset } from '@/services/cloudinary'

/**
 * The one place the logo is rendered.
 *
 * Before this, seven files pasted the same Cloudinary URL by hand with no
 * width transform — the browser downloaded the 171KB wordmark (or the 604KB
 * square mark) and scaled it down in CSS — and the home header imported a
 * 253KB PNG straight into the bundle, which the project's own rules forbid.
 *
 * Sizes are requested from the CDN, a 2x source is offered for retina, and
 * width/height are always set so the header does not reflow once it loads.
 */

const props = withDefaults(defineProps<{
  /** `long` is the wordmark, `mark` the square icon. */
  variant?: 'long' | 'mark'
  /** Rendered height in px. Width follows the artwork's aspect ratio. */
  height?: number
  /** Wraps the image in a link. Pass null for a plain image. */
  to?: string | null
  /** Above-the-fold logos should not be lazy. */
  eager?: boolean
  alt?: string
}>(), {
  variant: 'long',
  height: 40,
  to: '/',
  eager: true,
  alt: 'Tequecruncheese',
})

// Natural artwork ratios: wordmark 5499x3317, square mark 6250x6250.
const RATIO = { long: 5499 / 3317, mark: 1 }

const file = computed(() => (props.variant === 'long' ? 'logo-long.png' : 'logo-small.png'))
const width = computed(() => Math.round(props.height * RATIO[props.variant]))

const src = computed(() => cloudImg(file.value, { width: width.value, crop: 'limit' }))
const srcset = computed(() =>
  cloudSrcset(file.value, [width.value, width.value * 2]),
)
</script>

<template>
  <component
    :is="to ? 'RouterLink' : 'span'"
    v-bind="to ? { to } : {}"
    class="brand-logo"
    :class="`brand-logo--${variant}`"
  >
    <img
      :src="src"
      :srcset="srcset"
      :sizes="`${width}px`"
      :width="width"
      :height="height"
      :alt="alt"
      :loading="eager ? 'eager' : 'lazy'"
      :fetchpriority="eager ? 'high' : 'auto'"
      decoding="async"
    />
  </component>
</template>

<style scoped lang="scss">
.brand-logo {
  display: inline-flex;
  align-items: center;
  flex-shrink: 0;
  line-height: 0;
  text-decoration: none;

  img {
    display: block;
    // The height prop drives the size; width follows the intrinsic ratio.
    height: v-bind('`${height}px`');
    width: auto;
    max-width: 100%;
    object-fit: contain;
  }
}
</style>
