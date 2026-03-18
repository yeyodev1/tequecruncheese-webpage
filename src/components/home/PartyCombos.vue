<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import gsap from 'gsap'
import ScrollTrigger from 'gsap/ScrollTrigger'
import bgImage from '@/assets/stock/DSC06166.jpg'

gsap.registerPlugin(ScrollTrigger)

const waEvento = 'https://wa.me/593963237880?text=' + encodeURIComponent(
  'Hola TequeCruncheese! 👋 Quisiera planificar un evento con sus tequeños artesanales.\n\n' +
  '¿Me pueden informar sobre:\n' +
  '• Opciones de cajas y combos disponibles\n' +
  '• Cantidades mínimas para eventos\n' +
  '• Precios y disponibilidad\n\n' +
  '¡Gracias!'
)

const combos = [
  { name: 'Crunch Box', desc: 'Tus sabores favoritos, cuidadosamente seleccionados para una explosión de sabor compacta e ideal para antojos.' },
  { name: 'Premium Mixt', desc: 'El balance perfecto para compartir la verdadera experiencia TequeCruncheese con tus seres queridos.' },
  { name: 'Gold & Special Mixt', desc: 'Nuestra joya de la corona. Múltiples unidades con absolutamente todos los sabores para no dejar a nadie por fuera.' },
]

const partyBoxes = [
  { name: 'TequeParty Classic', desc: 'El tamaño perfecto (4cm) de nuestro clásico queso blanco para que tus invitados no dejen de picar.' },
  { name: 'TequeParty Custom', desc: 'Combina opciones dulces y saladas en tamaño bocado para crear un evento verdaderamente inolvidable.' },
  { name: 'TequeParty Frozen', desc: 'Llévate la fiesta cruda y fríelos en el momento exacto de tu celebración para garantizar calidez suprema.' },
]

const sectionRef = ref<HTMLElement | null>(null)
let ctx: gsap.Context

onMounted(() => {
  ctx = gsap.context(() => {
    // Parallax background map to scroll
    gsap.to('.party-section__bg', {
      scrollTrigger: {
        trigger: '.party-section',
        start: 'top bottom',
        end: 'bottom top',
        scrub: true
      },
      yPercent: 15,
      ease: 'none'
    })

    // Content reveal staggered
    gsap.from('.party-section__header > *', {
      scrollTrigger: {
        trigger: '.party-section__header',
        start: 'top 85%'
      },
      y: 40,
      opacity: 0,
      duration: 1,
      stagger: 0.2,
      ease: 'power3.out'
    })

    // Cards sliding in
    gsap.from('.party-card:nth-child(1)', {
      scrollTrigger: {
        trigger: '.party-section__content',
        start: 'top 80%'
      },
      x: -50,
      opacity: 0,
      duration: 1.2,
      ease: 'power3.out'
    })

    gsap.from('.party-card:nth-child(2)', {
      scrollTrigger: {
        trigger: '.party-section__content',
        start: 'top 80%'
      },
      x: 50,
      opacity: 0,
      duration: 1.2,
      delay: 0.2,
      ease: 'power3.out'
    })
    
    // List items stagger
    gsap.from('.combo-item', {
      scrollTrigger: {
        trigger: '.party-section__content',
        start: 'top 65%'
      },
      y: 20,
      opacity: 0,
      duration: 0.8,
      stagger: 0.15,
      ease: 'power2.out'
    })
  }, sectionRef.value!)
})

onUnmounted(() => {
  if (ctx) ctx.revert()
})
</script>

<template>
  <section id="combos" class="party-section" ref="sectionRef">
    <!-- Parallax Background -->
    <div class="party-section__bg" :style="{ backgroundImage: `url(${bgImage})` }"></div>
    <div class="party-section__overlay"></div>

    <div class="party-section__container">
      <div class="party-section__header text-center">
        <h2 class="title-section text-primary">Experiencia & Eventos</h2>
        <p class="party-section__subtitle text-white">
          Combina tus sabores favoritos o arma la fiesta perfecta con nuestras cajas diseñadas exclusivamente para compartir momentos memorables.
        </p>
      </div>

      <div class="party-section__content">
        <!-- Combos Mixtos Column -->
        <article class="party-card">
          <div class="party-card__header">
            <h3 class="party-card__title">Cajas Mixtas</h3>
            <p class="party-card__desc">Exploración sensorial para paladares atrevidos. Medida estándar (7cm).</p>
          </div>
          <ul class="combo-list">
            <li v-for="(combo, idx) in combos" :key="'combo-'+idx" class="combo-item">
              <div class="combo-item__info">
                <h4 class="combo-item__name">{{ combo.name }}</h4>
                <p class="combo-item__desc">{{ combo.desc }}</p>
              </div>
            </li>
          </ul>
        </article>

        <!-- TequeParty Column -->
        <article class="party-card party-card--highlight">
          <div class="party-card__header">
            <span class="party-card__badge">Formatos</span>
            <h3 class="party-card__title text-accent">Teque Party</h3>
            <p class="party-card__desc text-accent">Tamaño bocado perfecto (4cm) ideado para el consumo social interactivo.</p>
          </div>
          <ul class="combo-list combo-list--dark">
            <li v-for="(box, idx) in partyBoxes" :key="'box-'+idx" class="combo-item">
              <div class="combo-item__info">
                <h4 class="combo-item__name">{{ box.name }}</h4>
                <p class="combo-item__desc">{{ box.desc }}</p>
              </div>
            </li>
          </ul>
          
          <div class="party-card__footer mt-xl text-center">
             <a :href="waEvento" target="_blank" rel="noopener" class="btn btn--outline" style="border-color: #572612; color: #572612; width: 100%; display:inline-flex; align-items:center; justify-content:center; gap:8px; text-decoration:none;">
               <i class="fa-brands fa-whatsapp"></i> Planifica tu Evento
             </a>
          </div>
        </article>
      </div>
    </div>
  </section>
</template>

<style lang="scss" scoped>
.party-section {
  position: relative;
  padding: $spacing-xxl $spacing-md;
  background-color: $color-accent; 
  overflow: hidden;

  &__bg {
    position: absolute;
    top: -10%;
    left: 0;
    width: 100%;
    height: 120%; /* Extra height for parallax */
    background-size: cover;
    background-position: center;
    z-index: 0;
    opacity: 0.3;
    will-change: transform;
  }

  &__overlay {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: linear-gradient(to right, rgba($color-accent, 0.98) 0%, rgba($color-accent, 0.75) 100%);
    z-index: 1;
  }

  &__container {
    position: relative;
    z-index: 2;
    max-width: 1200px;
    margin: 0 auto;
  }

  &__header {
    margin-bottom: $spacing-xxl;
  }

  &__subtitle {
    font-size: 1.2rem;
    margin-top: $spacing-md;
    max-width: 650px;
    margin-left: auto;
    margin-right: auto;
    opacity: 0.9;
    line-height: 1.6;
  }

  &__content {
    display: grid;
    grid-template-columns: 1fr;
    gap: $spacing-lg;

    @include respond-to('lg') {
      grid-template-columns: 1fr 1fr;
      align-items: stretch;
    }
  }
}

.party-card {
  @include glass($opacity: 0.85, $blur: 24px);
  border-radius: $border-radius-xl;
  padding: $spacing-xl;
  box-shadow: 0 30px 60px rgba(0, 0, 0, 0.3);
  display: flex;
  flex-direction: column;

  &--highlight {
    background: rgba($color-primary, 0.95);
    border: 1px solid rgba($white, 0.2);
  }

  &__header {
    margin-bottom: $spacing-xl;
    padding-bottom: $spacing-md;
    border-bottom: 2px dashed rgba($white, 0.2);
  }

  &--highlight &__header {
    border-bottom-color: rgba($color-accent, 0.2);
  }

  &__badge {
    display: inline-block;
    background: $color-accent;
    color: $white;
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.15em;
    padding: 6px 14px;
    border-radius: 9999px;
    margin-bottom: $spacing-sm;
    font-weight: 800;
  }

  &__title {
    font-family: $font-secondary;
    font-size: 2.2rem;
    color: $color-accent;
    margin-bottom: 8px;
    line-height: 1.1;
  }

  &--highlight &__title {
    color: $color-accent;
  }

  &__desc {
    color: rgba($color-accent, 0.85);
    font-size: 1.05rem;
    line-height: 1.5;
  }
}

.combo-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: $spacing-lg;
  flex-grow: 1;

  &--dark {
    .combo-item__name { color: $color-accent; }
    .combo-item__desc { color: rgba($color-accent, 0.8); }
  }
}

.combo-item {
  display: flex;
  align-items: flex-start;
  position: relative;
  padding-left: $spacing-md;

  &::before {
    content: '';
    position: absolute;
    left: 0;
    top: 6px;
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background-color: $color-primary;
  }

  .combo-list--dark &::before {
    background-color: $color-accent;
  }

  &__info {
    flex-grow: 1;
  }

  &__name {
    font-size: 1.25rem;
    font-weight: 700;
    color: $color-accent;
    margin-bottom: 6px;
    font-family: $font-secondary;
  }

  &__desc {
    font-size: 0.95rem;
    color: rgba($color-accent, 0.8);
    line-height: 1.5;
  }
}

.font-bold { font-weight: 700; }
.mt-xl { margin-top: auto; padding-top: $spacing-xl; }
.text-center { text-align: center; }
</style>
