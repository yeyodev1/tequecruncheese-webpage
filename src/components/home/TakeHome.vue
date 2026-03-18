<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import gsap from 'gsap'
import ScrollTrigger from 'gsap/ScrollTrigger'
import frozenImg from '@/assets/stock/DSC06027.jpg'

gsap.registerPlugin(ScrollTrigger)

const frozenBenefits = [
  'Listos para freír en la comodidad de tu hogar',
  'Frescura 100% garantizada y sellada al vacío',
  'El salvavidas perfecto para visitas sorpresa o desayunos',
  'Disponibles en toda nuestra gama de sabores',
  'Crujencia intacta, exactamente como en el restaurante'
]

const sectionRef = ref<HTMLElement | null>(null)
let ctx: gsap.Context

onMounted(() => {
  ctx = gsap.context(() => {
    // Image reveal
    gsap.from('.take-home__visual', {
      scrollTrigger: {
        trigger: '.take-home__grid',
        start: 'top 70%'
      },
      xPercent: -20,
      opacity: 0,
      duration: 1.5,
      ease: 'power4.out'
    })

    gsap.from('.take-home__img', {
      scrollTrigger: {
        trigger: '.take-home__grid',
        start: 'top 70%'
      },
      scale: 1.2,
      duration: 2,
      ease: 'power3.out'
    })

    // Floating Badge Animation
    gsap.from('.take-home__badge', {
      scrollTrigger: {
        trigger: '.take-home__grid',
        start: 'top 50%'
      },
      scale: 0,
      rotation: -45,
      duration: 1,
      ease: 'back.out(2)',
      onComplete: () => {
        gsap.to('.take-home__badge', {
          y: -15,
          rotation: -12,
          yoyo: true,
          repeat: -1,
          duration: 2.5,
          ease: 'sine.inOut'
        })
      }
    })

    // Content Text Reveal
    gsap.from('.take-home__header > *', {
      scrollTrigger: {
        trigger: '.take-home__content',
        start: 'top 75%'
      },
      x: 40,
      opacity: 0,
      duration: 1.2,
      stagger: 0.2,
      ease: 'power3.out'
    })

    // List Stagger
    gsap.from('.frozen-item', {
      scrollTrigger: {
        trigger: '.frozen-list',
        start: 'top 85%'
      },
      x: 30,
      opacity: 0,
      duration: 0.8,
      stagger: 0.15,
      ease: 'power2.out'
    })

    // Button Stagger
    gsap.from('.take-home__action', {
      scrollTrigger: {
        trigger: '.frozen-list',
        start: 'top 70%'
      },
      y: 30,
      opacity: 0,
      duration: 1,
      ease: 'power3.out'
    })

  }, sectionRef.value!)
})

onUnmounted(() => {
  if (ctx) ctx.revert()
})
</script>

<template>
  <section id="congelados" class="take-home" ref="sectionRef">
    <div class="take-home__grid">
      <!-- Image Side -->
      <div class="take-home__visual">
        <div class="take-home__img-wrapper">
          <img :src="frozenImg" alt="Tequeños Congelados" class="take-home__img" loading="lazy" />
        </div>
        <div class="take-home__overlay"></div>
        <div class="take-home__badge">
          <span class="take-home__badge-text">100%<br/>Frescos</span>
        </div>
      </div>

      <!-- Content Side -->
      <div class="take-home__content">
        <div class="take-home__header">
          <h2 class="title-section text-accent take-home__title">Lleva el Crunch<br/><span class="text-primary">a tu Cocina</span></h2>
          <p class="take-home__subtitle">Bandejas exclusivas de <strong>20 unidades crudas</strong> para que armes tu fiesta cuando y donde quieras.</p>
        </div>

        <ul class="frozen-list">
          <li v-for="(benefit, idx) in frozenBenefits" :key="'ben-'+idx" class="frozen-item">
            <svg class="frozen-item__icon" width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M20 6L9 17L4 12" stroke="#F3923E" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <span class="frozen-item__text">{{ benefit }}</span>
          </li>
        </ul>

        <div class="take-home__action">
          <a href="https://wa.me/593963237880" target="_blank" rel="noopener" class="btn btn--primary take-home__btn">
            <i class="fa-brands fa-whatsapp"></i> Reserva tu Bandeja
          </a>
        </div>
      </div>
    </div>
  </section>
</template>

<style lang="scss" scoped>
.take-home {
  background-color: #FAFAFA;
  overflow: hidden;

  &__grid {
    display: grid;
    grid-template-columns: 1fr;

    @include respond-to('lg') {
      grid-template-columns: 1fr 1fr;
      min-height: 80vh;
    }
  }

  &__visual {
    position: relative;
    height: 50vh;
    min-height: 400px;
    overflow: hidden;

    @include respond-to('lg') {
      height: 100%;
    }
  }

  &__img-wrapper {
    width: 100%;
    height: 100%;
  }

  &__img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transform-origin: center;
  }
  
  &__overlay {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: linear-gradient(to bottom, rgba(0,0,0,0) 50%, rgba(#FAFAFA, 1) 100%);
    
    @include respond-to('lg') {
      background: linear-gradient(to right, rgba(0,0,0,0) 70%, rgba(#FAFAFA, 1) 100%);
    }
  }

  &__badge {
    position: absolute;
    bottom: $spacing-xl;
    right: $spacing-xl;
    background: $color-primary;
    color: $color-accent;
    width: 120px;
    height: 120px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    text-align: center;
    font-family: $font-secondary;
    font-weight: 800;
    font-size: 1.3rem;
    line-height: 1.1;
    transform: rotate(-10deg);
    box-shadow: 0 15px 30px rgba($color-accent, 0.2);
    border: 5px solid $white;
    z-index: 2;
  }

  &__content {
    padding: $spacing-xl $spacing-md;
    display: flex;
    flex-direction: column;
    justify-content: center;

    @include respond-to('md') {
      padding: $spacing-xxl $spacing-xl;
    }

    @include respond-to('lg') {
      padding: $spacing-xxl 10%;
    }
  }

  &__header {
    margin-bottom: $spacing-xl;
  }

  &__title {
    font-size: 2.8rem;
    line-height: 1.1;
    margin-bottom: $spacing-md;

    span {
      display: block;
    }

    @include respond-to('md') {
      font-size: 4rem;
    }
  }

  &__subtitle {
    font-size: 1.15rem;
    color: rgba($color-accent, 0.8);
    line-height: 1.6;
    max-width: 500px;
  }

  &__btn {
    margin-top: $spacing-xl;
    padding: 16px 32px;
    font-size: 1.1rem;
    box-shadow: 0 10px 20px rgba($color-primary, 0.3);
    
    &:hover {
      box-shadow: 0 15px 25px rgba($color-primary, 0.5);
    }
  }
}

.frozen-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: $spacing-sm;
}

.frozen-item {
  display: flex;
  align-items: flex-start;
  color: $color-accent;
  font-size: 1.1rem;
  padding: $spacing-xs 0;

  @include respond-to('md') {
    font-size: 1.2rem;
  }

  &__icon {
    flex-shrink: 0;
    margin-right: $spacing-sm;
    margin-top: 2px;
  }

  &__text {
    font-weight: 500;
    line-height: 1.4;
  }
}
</style>
