<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import gsap from 'gsap'

const props = defineProps({
  isOpen: {
    type: Boolean,
    required: true
  }
})

const emit = defineEmits(['close'])

const imageModules = import.meta.glob('@/assets/stock/DSC*.jpg', { eager: true, import: 'default' })
const allImages = Object.values(imageModules) as string[]

const displayImages = ref<string[]>([])
const selectedImage = ref<string | null>(null)

const shuffleImages = () => {
  const shuffled = [...allImages].sort(() => 0.5 - Math.random())
  displayImages.value = shuffled.slice(0, 20) // Always show up to 20 dynamic images
}

const openLightbox = (imgSrc: string) => {
  selectedImage.value = imgSrc
}

const closeLightbox = () => {
  selectedImage.value = null
}

const modalRef = ref<HTMLElement | null>(null)
let isAnimating = false

watch(() => props.isOpen, async (newVal) => {
  if (newVal) {
    shuffleImages()
    document.documentElement.style.overflow = 'hidden'
    document.body.style.overflow = 'hidden'
    await nextTick()
    
    // Animate background and modal container
    gsap.fromTo(modalRef.value, 
      { opacity: 0, backdropFilter: 'blur(0px)' }, 
      { opacity: 1, backdropFilter: 'blur(15px)', duration: 0.6, ease: 'power2.out' }
    )
    
    // Animate items and bottom close button
    gsap.fromTo('.gallery-modal__item, .gallery-modal__close-bottom',
      { y: 80, opacity: 0, scale: 0.8 },
      { y: 0, opacity: 1, scale: 1, duration: 0.8, stagger: 0.08, ease: 'back.out(1.2)' }
    )
  } else {
    document.documentElement.style.overflow = ''
    document.body.style.overflow = ''
  }
})

const close = () => {
  if (isAnimating) return
  isAnimating = true
  
  gsap.to('.gallery-modal__item', {
    y: 40, opacity: 0, scale: 0.9, duration: 0.4, stagger: 0.03, ease: 'power2.in'
  })
  
  gsap.to(modalRef.value, { 
    opacity: 0, 
    backdropFilter: 'blur(0px)', 
    duration: 0.5, 
    delay: 0.2, // Wait for items to start animating out
    ease: 'power2.inOut',
    onComplete: () => {
      isAnimating = false
      emit('close')
    }
  })
}
</script>

<template>
  <Teleport to="body">
    <div v-show="isOpen" class="gallery-modal" ref="modalRef" @click.self="close">
      <button class="gallery-modal__close" @click="close" aria-label="Cerrar Galería">
        <i class="fa-solid fa-xmark"></i>
      </button>
      
      <div class="gallery-modal__content">
        <h2 class="gallery-modal__title title-display text-accent">Nuestra Galería</h2>
        <p class="gallery-modal__subtitle">Cada bocado es una obra de arte. Explora el verdadero <em>Crunch</em>.</p>
        
        <div class="gallery-modal__grid">
          <div 
            v-for="(img, index) in displayImages" 
            :key="index" 
            :class="['gallery-modal__item', `gallery-modal__item--${index}`]"
            @click="openLightbox(img)"
          >
            <img :src="img" alt="Gallery Tequecruncheese" loading="lazy" />
            <div class="gallery-modal__hover-overlay">
              <i class="fa-solid fa-expand"></i>
            </div>
          </div>
        </div>

        <div class="gallery-modal__footer">
          <button class="gallery-modal__close-bottom btn btn--primary" @click="close">
            <i class="fa-solid fa-xmark"></i> Cerrar Galería
          </button>
        </div>
      </div>
    </div>

    <!-- Lightbox for Expanded Image -->
    <Transition name="fade">
      <div v-if="selectedImage" class="lightbox" @click.self="closeLightbox">
        <button class="lightbox__close" @click="closeLightbox" aria-label="Cerrar imagen grande">
          <i class="fa-solid fa-xmark"></i>
        </button>
        <img :src="selectedImage" class="lightbox__img" alt="Tequecruncheese Zoomed Image" />
      </div>
    </Transition>
  </Teleport>
</template>

<style lang="scss" scoped>
.gallery-modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  z-index: 10000;
  background-color: rgba(#FAFAFA, 0.92);
  display: flex;
  justify-content: center;
  align-items: flex-start;
  overflow-y: auto;
  padding: $spacing-xl $spacing-md;

  @include respond-to('lg') {
    padding: $spacing-xxl;
  }

  &__close {
    position: fixed;
    top: $spacing-md;
    right: $spacing-md;
    width: 60px;
    height: 60px;
    border-radius: 50%;
    background-color: $color-primary;
    color: $color-accent;
    border: none;
    font-size: 2rem;
    cursor: pointer;
    z-index: 10002;
    transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    display: flex;
    justify-content: center;
    align-items: center;
    box-shadow: 0 10px 25px rgba($color-primary, 0.5);

    @include respond-to('md') {
      top: $spacing-xl;
      right: $spacing-xl;
    }

    &:hover {
      transform: scale(1.1) rotate(90deg);
      background-color: $color-accent;
      color: $color-primary;
    }
  }

  &__content {
    width: 100%;
    max-width: 1400px;
    margin: 0 auto;
    text-align: center;
    padding-top: $spacing-xxl;
    padding-bottom: $spacing-xxl;
  }

  &__title {
    font-size: 3.5rem;
    margin-bottom: $spacing-md;

    @include respond-to('md') {
      font-size: 5rem;
    }
  }

  &__subtitle {
    font-size: 1.25rem;
    color: rgba($color-accent, 0.7);
    margin-bottom: $spacing-xxl;
    max-width: 600px;
    margin-left: auto;
    margin-right: auto;
    line-height: 1.6;
  }

  &__grid {
    display: grid;
    grid-template-columns: repeat(1, 1fr);
    grid-auto-rows: 280px;
    gap: $spacing-md;

    @include respond-to('md') {
      grid-template-columns: repeat(3, 1fr);
      grid-auto-rows: 320px;
      gap: $spacing-lg;
    }

    @include respond-to('lg') {
      grid-template-columns: repeat(4, 1fr);
      grid-auto-rows: 350px;
    }
  }

  &__item {
    border-radius: $border-radius-xl;
    overflow: hidden;
    position: relative;
    box-shadow: 0 15px 35px rgba($color-accent, 0.1);
    background-color: rgba($color-primary, 0.1);
    
    // Masonry-like dynamic styling for specific indices
    @include respond-to('md') {
      &--0 { grid-column: span 2; grid-row: span 2; }
      &--3 { grid-column: span 2; }
      &--6 { grid-row: span 2; }
      &--7 { grid-column: span 2; }
    }

    @include respond-to('lg') {
      &--0 { grid-column: span 2; grid-row: span 2; }
      &--3 { grid-column: span 2; }
      &--7 { grid-column: span 2; }
      &--8 { grid-column: span 2; grid-row: span 2; }
    }

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      transition: transform 0.8s cubic-bezier(0.165, 0.84, 0.44, 1);
    }

    &:hover img {
      transform: scale(1.08);
    }

    &::after {
      content: '';
      position: absolute;
      top: 0; left: 0; width: 100%; height: 100%;
      background: linear-gradient(to top, rgba($color-accent, 0.6) 0%, transparent 60%);
      pointer-events: none;
      opacity: 0;
      transition: opacity 0.4s ease;
    }

    &:hover::after {
      opacity: 1;
    }
  }

  &__hover-overlay {
    position: absolute;
    top: 0; left: 0; width: 100%; height: 100%;
    background: rgba($color-accent, 0.4);
    display: flex;
    justify-content: center;
    align-items: center;
    opacity: 0;
    transition: opacity 0.3s ease;
    pointer-events: none;

    i {
      color: $white;
      font-size: 2.5rem;
      transform: scale(0.5);
      transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    }
  }

  &__item:hover &__hover-overlay {
    opacity: 1;
    i {
      transform: scale(1);
    }
  }
}

// Transitions
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* Lightbox specific styles */
.lightbox {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  z-index: 20000;
  background-color: rgba($color-accent, 0.95);
  display: flex;
  justify-content: center;
  align-items: center;
  padding: $spacing-md;

  @include respond-to('md') {
    padding: $spacing-xxl;
  }

  &__close {
    position: absolute;
    top: $spacing-md;
    right: $spacing-md;
    width: 50px;
    height: 50px;
    border-radius: 50%;
    background-color: transparent;
    color: $white;
    border: 2px solid rgba($white, 0.3);
    font-size: 1.5rem;
    cursor: pointer;
    z-index: 20001;
    transition: all 0.3s ease;
    display: flex;
    justify-content: center;
    align-items: center;

    @include respond-to('md') {
      top: $spacing-xl;
      right: $spacing-xl;
    }

    &:hover {
      background-color: $white;
      color: $color-accent;
      transform: rotate(90deg);
    }
  }

  &__img {
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
    border-radius: $border-radius-md;
    box-shadow: 0 20px 50px rgba($color-primary, 0.2);
    animation: zoomIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
  }
}

@keyframes zoomIn {
  from { opacity: 0; transform: scale(0.95); }
  to { opacity: 1; transform: scale(1); }
}
</style>
