<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import gsap from 'gsap'
import ScrollTrigger from 'gsap/ScrollTrigger'
import GalleryModal from './GalleryModal.vue'

import img1 from '@/assets/stock/DSC06085.jpg'
import img2 from '@/assets/stock/DSC06129.jpg'
import img3 from '@/assets/stock/DSC06140.jpg'
import img4 from '@/assets/stock/DSC06177.jpg'

gsap.registerPlugin(ScrollTrigger)

const flavors = [
  { name: 'Queso', desc: 'Clásico blanco artesanal, con la textura perfecta que se estira en cada bocado. El sabor tradicional en su máxima expresión.', img: img1, type: 'Clásico' },
  { name: 'Jamón con Queso', desc: 'La combinación perfecta y el contraste ideal. El ahumado del jamón abraza al queso derretido en una experiencia inigualable.', img: img2, type: 'Salado' },
  { name: 'Tocino / Queso', desc: 'Extra crujiente y ahumado. Para los paladares exigentes que buscan un golpe de sabor intenso y reconfortante.', img: img3, type: 'Premium' },
  { name: 'Guayaba / Queso', desc: 'El contraste dulce/salado llevado al extremo. Una explosión tropical que te hará agua la boca al instante.', img: img4, type: 'Tropical' },
  { name: 'Chocolate', desc: 'Relleno profundo, oscuro y derretido que inunda el crujiente envoltorio. Para los amantes del cacao puro.', img: null, type: 'Dulce' },
  { name: 'Nutella', desc: 'El favorito indiscutible. Cremosa crema de avellanas rebosante de sabor, perfecta para compartir o disfrutar a solas.', img: null, type: 'Dulce' },
  { name: 'Sabor de Temporada', desc: 'Edición especial (como Ferrero Rocher o innovaciones del mes) pensados para sorprenderte constantemente.', img: null, type: 'Premium' },
]

const sectionRef = ref<HTMLElement | null>(null)
let ctx: gsap.Context

const isGalleryOpen = ref(false)

onMounted(() => {
  ctx = gsap.context(() => {
    // Header Animation
    gsap.from('.flavors__header > *', {
      scrollTrigger: {
        trigger: '.flavors__header',
        start: 'top 85%',
      },
      y: 40,
      opacity: 0,
      duration: 1,
      stagger: 0.15,
      ease: 'power3.out'
    })

    // Grid Cards Animation
    gsap.from('.flavor-card', {
      scrollTrigger: {
        trigger: '.flavors__grid',
        start: 'top 80%',
      },
      y: 60,
      opacity: 0,
      duration: 1.2,
      stagger: 0.1,
      ease: 'back.out(1.2)'
    })

    // Callout Animation
    gsap.from('.flavor-card--callout', {
      scrollTrigger: {
        trigger: '.flavor-card--callout',
        start: 'top 90%',
      },
      scale: 0.98,
      y: 30,
      opacity: 0,
      duration: 1,
      ease: 'power2.out'
    })
  }, sectionRef.value!)
})

onUnmounted(() => {
  if (ctx) ctx.revert()
})
</script>

<template>
  <section id="sabores" class="flavors" ref="sectionRef">
    <div class="flavors__header text-center">
      <h2 class="title-section text-accent">Nuestros Sabores</h2>
      <p class="flavors__subtitle text-secondary">
        Descubre un abanico sensorial. Desde el clásico queso derretido hasta 
        combinaciones dulces y premium que desafían todo lo que conoces sobre el Crunch.
      </p>
    </div>

    <div class="flavors__grid">
      <article 
        v-for="(flavor, idx) in flavors" 
        :key="idx" 
        class="flavor-card"
        :class="{'flavor-card--featured': flavor.img}"
      >
        <div class="flavor-card__bg" v-if="flavor.img">
          <img :src="flavor.img" :alt="flavor.name" loading="lazy" />
          <div class="flavor-card__overlay"></div>
        </div>
        
        <div class="flavor-card__content">
          <span class="flavor-card__badge">{{ flavor.type }}</span>
          <div class="flavor-card__text">
            <h3 class="flavor-card__title">{{ flavor.name }}</h3>
            <p class="flavor-card__desc">{{ flavor.desc }}</p>
          </div>
          
          <div class="flavor-card__action mt-auto">
            <span class="flavor-card__discover">Siente el crunch <span class="arrow">→</span></span>
          </div>
        </div>
      </article>
      
      <!-- Callout for Bandejas de Queso -->
      <article class="flavor-card flavor-card--callout bg-primary">
        <div class="flavor-card__content flavor-card__content--center">
          <h3 class="flavor-card__title text-accent">Experiencia en Grande</h3>
          <p class="flavor-card__desc text-accent max-w-lg">
            Impresiona a tus invitados con nuestras monumentales bandejas de <strong>SOLO QUESO</strong>. 
            Calidad premium, salsa inagotable y una crujencia inigualable para ser el centro de atención en tu evento.
          </p>
          <button class="btn btn--outline mt-md" style="border-color: #572612; color: #572612;" @click="isGalleryOpen = true">Ver Galería</button>
        </div>
      </article>

    </div>
    
    <GalleryModal :isOpen="isGalleryOpen" @close="isGalleryOpen = false" />
  </section>
</template>

<style lang="scss" scoped>
.flavors {
  background-color: #ffffff;
  padding: $spacing-xxl $spacing-md;
  overflow: hidden;

  @include respond-to('lg') {
    padding: $spacing-xxl;
  }

  &__header {
    margin-bottom: $spacing-xxl;
  }

  &__subtitle {
    font-size: 1.15rem;
    margin-top: $spacing-sm;
    max-width: 600px;
    margin-left: auto;
    margin-right: auto;
    line-height: 1.6;
  }

  &__grid {
    max-width: 1400px;
    margin: 0 auto;
    display: grid;
    grid-template-columns: 1fr;
    gap: $spacing-md;

    @include respond-to('md') {
      grid-template-columns: repeat(2, 1fr);
      gap: $spacing-lg;
    }

    @include respond-to('lg') {
      grid-template-columns: repeat(4, 1fr);
    }
  }
}

.flavor-card {
  position: relative;
  background: #FAFAFA;
  border-radius: $border-radius-lg;
  overflow: hidden;
  min-height: 320px;
  display: flex;
  flex-direction: column;
  box-shadow: 0 10px 30px rgba($color-accent, 0.05);
  transition: transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275), box-shadow 0.4s ease;

  &:hover {
    transform: translateY(-8px);
    box-shadow: 0 20px 40px rgba($color-accent, 0.15);

    .arrow {
      transform: translateX(5px);
    }
  }

  &--featured {
    @include respond-to('md') {
      grid-column: span 2;
    }
  }

  &--callout {
    @include respond-to('lg') {
      grid-column: span 4;
    }
  }

  &__bg {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 1;

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      transition: transform 1.5s ease;
    }
  }

  &:hover &__bg img {
    transform: scale(1.08);
  }

  &__overlay {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: linear-gradient(to top, rgba($color-accent, 0.95) 0%, rgba($color-accent, 0.1) 100%);
  }

  &__content {
    position: relative;
    z-index: 2;
    padding: $spacing-lg;
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
    flex-grow: 1;

    &--center {
      align-items: center;
      text-align: center;
      justify-content: center;
    }
  }

  &--featured &__content {
    justify-content: flex-end;
  }

  &__badge {
    align-self: flex-start;
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.15em;
    font-weight: 800;
    padding: 6px 10px;
    border-radius: 4px;
    margin-bottom: $spacing-md;
    background: rgba($color-accent, 0.1);
    color: $color-accent;
    transition: background 0.3s ease, color 0.3s ease;
  }

  &--featured &__badge {
    background: rgba($color-primary, 0.9);
    color: $color-accent;
  }

  &__title {
    font-size: 1.6rem;
    color: $color-accent;
    line-height: 1.1;
    margin-bottom: $spacing-sm;
    font-family: $font-secondary;
  }

  &__desc {
    font-size: 1rem;
    color: rgba($color-accent, 0.7);
    line-height: 1.5;
    margin-bottom: $spacing-lg;
  }

  &--featured &__title {
    color: $white;
    font-size: 2rem;
  }
  
  &--featured &__desc {
    color: rgba($white, 0.85);
    font-size: 1.05rem;
    max-width: 90%;
  }

  &__discover {
    display: inline-flex;
    align-items: center;
    font-weight: 600;
    color: $color-accent;
    font-size: 0.95rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;

    .arrow {
      margin-left: 8px;
      transition: transform 0.3s ease;
    }
  }

  &--featured &__discover {
    color: $color-primary;
  }
}

.max-w-lg {
  max-width: 700px;
  margin-left: auto;
  margin-right: auto;
}

.mt-auto { margin-top: auto; }
.mt-md { margin-top: $spacing-md; }
</style>
