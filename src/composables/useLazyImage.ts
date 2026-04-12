/**
 * useLazyImage
 * Composable para lazy loading de imágenes con Intersection Observer.
 * Conecta con Cloudinary para servir imágenes optimizadas desde el CDN.
 *
 * Uso:
 *   const { src, imgRef, loaded } = useLazyImage('DSC06085.jpg', { width: 800 })
 *   <img :ref="imgRef" :src="src" :class="{ loaded }" loading="lazy" />
 */
import { ref, onMounted, onUnmounted } from 'vue'
import { cloudImg, type CloudinaryOptions } from '@/services/cloudinary'

export function useLazyImage(filename: string, opts: CloudinaryOptions = {}) {
  const imgRef = ref<HTMLImageElement | null>(null)
  const src = ref<string>('')
  const loaded = ref(false)

  let observer: IntersectionObserver | null = null

  const load = () => {
    const url = cloudImg(filename, opts)
    src.value = url
    loaded.value = false

    if (imgRef.value) {
      imgRef.value.onload = () => { loaded.value = true }
      imgRef.value.onerror = () => { loaded.value = true } // fail silently
    }
  }

  onMounted(() => {
    if (!imgRef.value) {
      load()
      return
    }

    observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          load()
          observer?.disconnect()
        }
      },
      { rootMargin: '200px' } // pre-load 200px before viewport
    )

    observer.observe(imgRef.value)
  })

  onUnmounted(() => {
    observer?.disconnect()
  })

  return { src, imgRef, loaded }
}
