<script setup lang="ts">
import { ref, computed } from 'vue'
import menuBg from '@/assets/stock/DSC06039.jpg'

const activeCategory = ref('sabores')

const categories = [
  { id: 'sabores', label: 'Por Sabores' },
  { id: 'queso', label: 'Bandejas de Queso' },
  { id: 'combos', label: 'Combos Mixtos' },
  { id: 'congelados', label: 'Congelados' },
  { id: 'tequeparty', label: 'TequeParty' }
]

const menuData: Record<string, any> = {
  sabores: {
    description: 'Precios por cantidad de unidades. Sabores dulces y salados. Todos incluyen salsa clásica y vienen listos para comer.',
    hasMultiplePrices: true,
    items: [
      { name: 'Queso', prices: { '5': 3.5, '10': 6.0, '20': 10.5 } },
      { name: 'Jamón con Queso', prices: { '5': 4.0, '10': 6.5, '20': 12.0 } },
      { name: 'Tocino con Queso', prices: { '5': 4.25, '10': 7.0, '20': 13.0 } },
      { name: 'Cheddar con Jamón', prices: { '5': 4.0, '10': 6.5, '20': 12.0 } },
      { name: 'Guayaba con Queso', prices: { '5': 4.5, '10': 7.5, '20': 14.0 } },
      { name: 'Chocolate', prices: { '5': 4.0, '10': 6.5, '20': 12.0 } },
      { name: 'Nutella', prices: { '5': 4.5, '10': 7.5, '20': 14.0 } },
      { name: 'Manjar', prices: { '5': 4.5, '10': 7.5, '20': 14.0 } },
      { name: 'Ferrero / Temporada', prices: { '5': 5.0, '10': 8.0, '20': 15.0 } },
    ]
  },
  queso: {
    description: 'Bandejas exclusivas de QUESO TRADICIONAL, tamaño 7cm. Incluyen salsas y empaque especializado. ¡Listos para comer!',
    hasMultiplePrices: false,
    items: [
      { name: '30 Unidades', desc: 'Incluye 3 salsas de 60cc (1 caja)', price: 15 },
      { name: '40 Unidades', desc: 'Incluye 4 salsas de 60cc (1 caja)', price: 19.5 },
      { name: '50 Unidades', desc: 'Incluye 5 salsas de 60cc (2 cajas)', price: 24 },
      { name: '60 Unidades', desc: 'Incluye 6 salsas de 60cc (2 cajas)', price: 28 },
      { name: '70 Unidades', desc: 'Incluye 7 salsas de 60cc (2 cajas)', price: 32 },
      { name: '80 Unidades', desc: 'Incluye 8 salsas de 60cc (2 cajas)', price: 36 },
      { name: '90 Unidades', desc: 'Incluye 9 salsas de 60cc (3 cajas)', price: 41 },
      { name: '100 Unidades', desc: 'Incluye 10 salsas de 60cc (1 caja)', price: 45 }
    ]
  },
  combos: {
    description: 'Combina como tú quieras. Elige tus sabores favoritos y disfruta del abanico crujiente. Sabores a elegir: Queso, Jamón/Queso, Tocino/Queso, Cheddar/Jamón, Guayaba/Queso, Chocolate, Nutella, Manjar, Ferrero o ST.',
    hasMultiplePrices: false,
    items: [
      { name: 'Crunch Box', desc: '5 und. de 5 sabores a elegir (1 por sabor), medida 7cm. Incluye 1 salsa de 40cc (1 caja)', price: 4.5 },
      { name: 'Mini-Duo', desc: '10 und. de 2 sabores a elegir (5 por sabor), medida 7cm (1 caja)', price: 7 },
      { name: 'Teque Duo', desc: '20 und. de 2 sabores a elegir (10 por sabor), medida 7cm (1 caja)', price: 13 },
      { name: 'Premium Mixt', desc: '30 und. de 3 sabores a elegir (10 por sabor), medida 7cm (1 caja)', price: 17 },
      { name: 'VIP Mixt', desc: '40 und. de 4 sabores a elegir (10 por sabor), medida 7cm (1 caja)', price: 23 },
      { name: 'Gold Mixt', desc: '50 und. de 5 sabores a elegir (10 por sabor), medida 7cm (2 cajas)', price: 27 },
      { name: 'Special Mixt', desc: '100 und. con TODOS LOS SABORES disponibles, medida 7cm (1 caja)', price: 50 },
    ]
  },
  congelados: {
    description: 'Lleva la fiesta a casa en versión congelada para freír cuando gustes. Bandejas de 20 unidades. Importante: NO INCLUYE SALSA.',
    hasMultiplePrices: false,
    items: [
      { name: 'Queso', desc: '20 unidades de queso tradicional, congelados.', price: 8.5 },
      { name: 'Jamón con Queso', desc: '20 unidades de jamón con queso, congelados.', price: 9 },
      { name: 'Cheddar con Jamón', desc: '20 unidades de cheddar con jamón, congelados.', price: 9 },
      { name: 'Tocino con Queso', desc: '20 unidades de tocino con queso, congelados.', price: 9 },
      { name: 'Guayaba con Queso', desc: '20 unidades de guayaba con queso, congelados.', price: 10 },
      { name: 'Chocolate', desc: '20 unidades de chocolate, congelados.', price: 11 },
      { name: 'Nutella', desc: '20 unidades de nutella, congelados.', price: 11 },
      { name: 'Manjar', desc: '20 unidades de manjar, congelados.', price: 12 },
      { name: 'Ferrero / ST', desc: '20 unidades de ferrero o sabor de temporada, congelados.', price: 13 }
    ]
  },
  tequeparty: {
    description: 'El tamaño perfecto para grandes eventos. Tequeños tamaño bocado (4cm). Nota: Sabores como Jamón y Chocolate requieren pedido con 1 DÍA de anticipación.',
    hasMultiplePrices: false,
    items: [
      { name: 'Box Party (Small) - Listos', desc: '50 unidades de SOLO QUESO. Incluye 3 salsas de 60cc (1 caja)', price: 16 },
      { name: 'Box Party (Big) - Listos', desc: '100 unidades de SOLO QUESO. Incluye 6 salsas de 60cc (2 cajas)', price: 30 },
      { name: 'Box Party (Small) - Congelados', desc: '50 unidades de SOLO QUESO. NO incluye salsa', price: 15 },
      { name: 'Box Party (Big) - Congelados', desc: '100 unidades de SOLO QUESO. NO incluye salsa', price: 29 },
    ]
  }
}

const currentCategoryData = computed(() => {
  return menuData[activeCategory.value]
})

function setCategory(id: string) {
  activeCategory.value = id
}
</script>

<template>
  <section id="menu" class="menu-section">
    <!-- Background visual to keep it highly premium -->
    <div class="menu-section__bg">
      <img :src="menuBg" alt="Menú Tequecruncheese" class="menu-section__bg-img" loading="lazy" />
      <div class="menu-section__bg-overlay"></div>
    </div>

    <div class="menu-section__container">
      <div class="menu-section__header text-center">
        <h2 class="title-section text-white text-shadow-glow">Nuestro Menú</h2>
        <p class="menu-section__subtitle text-white">Descubre la crujencia perfecta en cada una de nuestras presentaciones.</p>
      </div>

      <!-- Main Glass Card holding the menu -->
      <div class="menu-section__content">
        <!-- Tabs -->
        <div class="menu-tabs">
          <button 
            v-for="cat in categories" 
            :key="cat.id"
            :class="['menu-tabs__btn', { 'menu-tabs__btn--active': activeCategory === cat.id }]"
            @click="setCategory(cat.id)"
          >
            {{ cat.label }}
          </button>
        </div>

        <!-- Dynamic Menu List -->
        <div class="menu-list">
          <div class="menu-list__header">
            <p class="menu-list__desc">{{ currentCategoryData.description }}</p>
          </div>
          
          <div class="menu-items">
            <!-- Special Grid for Sabores with Multiple Quantities -->
            <template v-if="currentCategoryData.hasMultiplePrices">
              <div class="menu-items__grid-sabores">
                <!-- Header Row -->
                <div class="menu-item-row menu-item-row--header">
                  <div class="menu-item-cell menu-item-name menu-item-name--title">Sabor</div>
                  <div class="menu-item-cell text-center">5 unds.</div>
                  <div class="menu-item-cell text-center">10 unds.</div>
                  <div class="menu-item-cell text-center">20 unds.</div>
                </div>
                <!-- Data Rows -->
                <div 
                  v-for="(item, idx) in currentCategoryData.items" 
                  :key="'sabor-'+idx" 
                  class="menu-item-row"
                >
                  <div class="menu-item-cell menu-item-name">{{ item.name }}</div>
                  <div class="menu-item-cell text-center text-accent font-bold">${{ item.prices['5'].toFixed(2) }}</div>
                  <div class="menu-item-cell text-center text-accent font-bold">${{ item.prices['10'].toFixed(2) }}</div>
                  <div class="menu-item-cell text-center text-accent font-bold">${{ item.prices['20'].toFixed(2) }}</div>
                </div>
              </div>
            </template>

            <!-- Standard List with Desc and Price -->
            <template v-else>
              <ul class="menu-items__standard">
                <li 
                  v-for="(item, idx) in currentCategoryData.items" 
                  :key="'item-'+idx"
                  class="menu-item-standard"
                >
                  <div class="menu-item-standard__info">
                    <h4 class="menu-item-standard__name">{{ item.name }}</h4>
                    <p class="menu-item-standard__desc">{{ item.desc }}</p>
                  </div>
                  <div class="menu-item-standard__dots"></div>
                  <div class="menu-item-standard__price">
                    ${{ item.price.toFixed(2) }}
                  </div>
                </li>
              </ul>
            </template>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style lang="scss" scoped>
.menu-section {
  position: relative;
  min-height: 100vh;
  padding: $spacing-xxl 0;
  overflow: hidden;

  &__bg {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: -1;
  }

  &__bg-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: center;
  }

  &__bg-overlay {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: linear-gradient(
      180deg,
      rgba($color-accent, 0.9) 0%,
      rgba($color-accent, 0.6) 100%
    );
  }

  &__container {
    max-width: 1000px;
    margin: 0 auto;
    padding: 0 $spacing-md;
    position: relative;
    z-index: 2;
  }

  &__header {
    margin-bottom: $spacing-xl;
  }

  &__subtitle {
    font-size: 1.125rem;
    opacity: 0.9;
    margin-top: $spacing-sm;
  }

  &__content {
    @include glass($opacity: 0.95, $blur: 24px);
    border-radius: $border-radius-xl;
    box-shadow: 0 30px 60px rgba(0, 0, 0, 0.3);
    overflow: hidden;
  }
}

.text-shadow-glow {
  text-shadow: 0 4px 20px rgba($white, 0.3);
}
.text-center { text-align: center; }
.font-bold { font-weight: 700; }

.menu-tabs {
  display: flex;
  overflow-x: auto;
  border-bottom: 1px solid rgba($color-accent, 0.1);
  background: rgba($white, 0.5);
  scrollbar-width: none; // Firefox
  &::-webkit-scrollbar { display: none; } // Chrome/Safari
  
  &__btn {
    flex: 1;
    min-width: 140px;
    padding: $spacing-md $spacing-sm;
    font-family: $font-secondary;
    font-weight: 600;
    font-size: 0.95rem;
    color: rgba($color-accent, 0.6);
    background: transparent;
    border: none;
    border-bottom: 3px solid transparent;
    cursor: pointer;
    transition: all 0.3s ease;
    white-space: nowrap;

    &:hover {
      color: rgba($color-accent, 0.9);
      background: rgba($color-primary, 0.1);
    }

    &--active {
      color: $color-accent;
      border-bottom-color: $color-primary;
      background: rgba($white, 0.4);
    }
  }
}

.menu-list {
  padding: $spacing-lg;

  @include respond-to('md') {
    padding: $spacing-xl;
  }

  &__header {
    margin-bottom: $spacing-lg;
    text-align: center;
    border-bottom: 1px dashed rgba($color-accent, 0.15);
    padding-bottom: $spacing-md;
  }

  &__desc {
    color: rgba($color-accent, 0.8);
    font-size: 0.95rem;
    line-height: 1.5;

    @include respond-to('md') {
      font-size: 1rem;
    }
  }
}

.menu-items {
  &__grid-sabores {
    display: flex;
    flex-direction: column;
    gap: $spacing-sm;
  }
}

.menu-item-row {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 1fr;
  align-items: center;
  padding: $spacing-sm 0;
  border-bottom: 1px solid rgba($color-accent, 0.05);

  &--header {
    border-bottom: 2px solid rgba($color-accent, 0.1);
    font-weight: 700;
    color: rgba($color-accent, 0.7);
    font-size: 0.8rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
}

.menu-item-cell {
  font-size: 0.95rem;
  
  @include respond-to('md') {
    font-size: 1.05rem;
  }
}

.menu-item-name {
  font-family: $font-secondary;
  font-weight: 600;
  color: $color-accent;
  
  &--title {
    color: inherit;
  }
}

.menu-items__standard {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: $spacing-md;
}

.menu-item-standard {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  width: 100%;
  
  &__info {
    flex-shrink: 0;
    max-width: 65%;
  }

  &__name {
    font-family: $font-secondary;
    font-weight: 700;
    font-size: 1.1rem;
    color: $color-accent;
    margin-bottom: 4px;
  }

  &__desc {
    font-size: 0.85rem;
    color: rgba($color-accent, 0.7);
    line-height: 1.4;

    @include respond-to('md') {
      font-size: 0.95rem;
      max-width: 90%;
    }
  }

  &__dots {
    flex-grow: 1;
    border-bottom: 2px dotted rgba($color-accent, 0.2);
    margin: 0 $spacing-sm 6px;
  }

  &__price {
    flex-shrink: 0;
    font-weight: 700;
    font-size: 1.25rem;
    color: $color-accent;
    padding-bottom: 2px;
  }
}
</style>
