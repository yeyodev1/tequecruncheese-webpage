<script setup lang="ts">
import { ref, onMounted } from 'vue'
import TheHeader from '@/components/home/TheHeader.vue'
import TheFooter from '@/components/home/TheFooter.vue'
import ProductCard from '@/components/tienda/ProductCard.vue'
import ProductDetailModal from '@/components/tienda/ProductDetailModal.vue'
import { productService } from '@/services/product.service'
import { useCartStore } from '@/stores/cart'
import type { Product } from '@/types'

const cart = useCartStore()
const products = ref<Product[]>([])
const loading = ref(true)
const error = ref('')

const selectedProduct = ref<Product | null>(null)
const showDetail = ref(false)

function openDetail(product: Product) {
  selectedProduct.value = product
  showDetail.value = true
}

function onDetailAdded() {
  showDetail.value = false
  cart.openCart()
}

async function loadProducts() {
  loading.value = true
  error.value = ''
  try {
    products.value = await productService.list()
  } catch {
    error.value = 'No se pudieron cargar los productos. Intenta de nuevo.'
  } finally {
    loading.value = false
  }
}

onMounted(loadProducts)
</script>

<template>
  <div class="tienda-view">
    <TheHeader />

    <main class="tienda">
      <!-- ── Hero ──────────────────────────────────────────── -->
      <section class="tienda__hero">
        <div class="tienda__hero-inner">
          <span class="tienda__hero-eyebrow">
            <i class="fa-solid fa-store"></i>
            Tienda en línea
          </span>
          <h1 class="tienda__hero-title">Nuestros Tequeños</h1>
          <p class="tienda__hero-sub">
            Artesanales, crujientes y listos para llegar a tu puerta
          </p>
        </div>
      </section>

      <!-- ── Catalog ─────────────────────────────────────────── -->
      <section class="tienda__catalog">

        <!-- Catalog header -->
        <div class="tienda__catalog-head">
          <div class="tienda__catalog-title">
            <h2>Catálogo</h2>
            <span v-if="!loading && products.length > 0" class="tienda__catalog-count">
              {{ products.length }} productos
            </span>
          </div>

          <button
            v-if="!cart.isEmpty"
            class="tienda__cart-trigger"
            @click="cart.openCart"
          >
            <i class="fa-solid fa-cart-shopping"></i>
            <span>Ver carrito</span>
            <span class="tienda__cart-trigger-badge">{{ cart.totalItems }}</span>
          </button>
        </div>

        <!-- Loading -->
        <div v-if="loading" class="tienda__state">
          <div class="tienda__state-spinner">
            <i class="fa-solid fa-spinner fa-spin"></i>
          </div>
          <p>Cargando productos...</p>
        </div>

        <!-- Error -->
        <div v-else-if="error" class="tienda__state tienda__state--error">
          <div class="tienda__state-icon">
            <i class="fa-solid fa-circle-exclamation"></i>
          </div>
          <p>{{ error }}</p>
          <button class="tienda__retry-btn" @click="loadProducts">
            <i class="fa-solid fa-rotate-right"></i>
            Reintentar
          </button>
        </div>

        <!-- Empty -->
        <div v-else-if="products.length === 0" class="tienda__state">
          <div class="tienda__state-icon">
            <i class="fa-regular fa-face-meh"></i>
          </div>
          <p>No hay productos disponibles por el momento.</p>
        </div>

        <!-- Product grid -->
        <div v-else class="tienda__grid">
          <ProductCard
            v-for="product in products"
            :key="product.slug"
            :product="product"
            @select-product="openDetail"
            @add-to-cart="cart.addItem($event)"
          />
        </div>
      </section>
    </main>

    <TheFooter />

    <!-- Product detail modal -->
    <ProductDetailModal
      v-model="showDetail"
      :product="selectedProduct"
      @added="onDetailAdded"
    />
  </div>
</template>

<style lang="scss" scoped>
.tienda-view {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: #f8f6f3;
}

.tienda {
  flex: 1;
  padding-top: 72px;

  // ── Hero ──────────────────────────────────────────────────────
  &__hero {
    background: $color-accent;
    padding: 4rem 1.5rem 3.5rem;
    text-align: center;
    position: relative;
    overflow: hidden;

    // Bottom wave divider
    &::after {
      content: '';
      position: absolute;
      bottom: -1px;
      left: 0;
      right: 0;
      height: 40px;
      background: #f8f6f3;
      clip-path: ellipse(60% 100% at 50% 100%);
    }

    @include respond-to('md') {
      padding: 5rem 2rem 4.5rem;
    }
  }

  &__hero-inner {
    position: relative;
    z-index: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
  }

  &__hero-eyebrow {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    font-size: 0.75rem;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: rgba($color-primary, 0.8);
    background: rgba($color-primary, 0.1);
    padding: 0.3rem 0.875rem;
    border-radius: 999px;

    i { font-size: 0.7rem; }
  }

  &__hero-title {
    font-size: clamp(2.25rem, 6vw, 3.5rem);
    font-weight: 900;
    color: $white;
    margin: 0;
    letter-spacing: -0.03em;
    line-height: 1.05;
  }

  &__hero-sub {
    font-size: 1rem;
    color: rgba($white, 0.7);
    margin: 0;
    max-width: 360px;
    line-height: 1.5;
  }

  // ── Catalog ───────────────────────────────────────────────────
  &__catalog {
    max-width: 1400px;
    margin: 0 auto;
    padding: 3rem 1.25rem 5rem;

    @include respond-to('md') {
      padding: 3.5rem 2.5rem 6rem;
    }
  }

  &__catalog-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    margin-bottom: 2rem;
  }

  &__catalog-title {
    display: flex;
    align-items: baseline;
    gap: 0.75rem;

    h2 {
      font-size: 1.25rem;
      font-weight: 800;
      color: $color-accent;
      margin: 0;
      letter-spacing: -0.01em;
    }
  }

  &__catalog-count {
    font-size: 0.8rem;
    color: #bbb;
    font-weight: 600;
  }

  // ── Cart trigger (inline button) ──────────────────────────────
  &__cart-trigger {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    background: $color-accent;
    color: $color-primary;
    border: none;
    border-radius: 999px;
    padding: 0.55rem 1rem 0.55rem 0.875rem;
    font-size: 0.85rem;
    font-weight: 700;
    cursor: pointer;
    transition: opacity 0.15s, transform 0.15s;
    white-space: nowrap;
    flex-shrink: 0;

    i { font-size: 0.85rem; }

    &:hover {
      opacity: 0.88;
      transform: translateY(-1px);
    }
  }

  &__cart-trigger-badge {
    background: $color-primary;
    color: $color-accent;
    border-radius: 50%;
    width: 20px;
    height: 20px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 0.68rem;
    font-weight: 900;
  }

  // ── State: loading / error / empty ────────────────────────────
  &__state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 1rem;
    min-height: 320px;
    color: #aaa;
    text-align: center;
    background: $white;
    border-radius: 1.5rem;
    border: 1px solid rgba(0, 0, 0, 0.05);

    p { margin: 0; font-size: 0.95rem; }

    &--error { color: #c53030; }
  }

  &__state-spinner {
    i { font-size: 2rem; color: rgba($color-accent, 0.3); }
  }

  &__state-icon {
    width: 60px;
    height: 60px;
    border-radius: 50%;
    background: #f5f5f5;
    display: flex;
    align-items: center;
    justify-content: center;

    i { font-size: 1.4rem; color: #ccc; }

    .tienda__state--error & {
      background: #fff5f5;
      i { color: #c53030; }
    }
  }

  &__retry-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    background: $color-accent;
    color: $color-primary;
    border: none;
    border-radius: 0.625rem;
    padding: 0.65rem 1.25rem;
    font-size: 0.875rem;
    font-weight: 700;
    cursor: pointer;
    transition: opacity 0.15s;

    &:hover { opacity: 0.85; }
  }

  // ── Product grid ──────────────────────────────────────────────
  &__grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
    gap: 1.5rem;

    @include respond-to('sm') {
      grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
    }

    @include respond-to('lg') {
      gap: 1.75rem;
    }
  }
}
</style>
