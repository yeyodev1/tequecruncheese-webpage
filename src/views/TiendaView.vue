<script setup lang="ts">
import { ref, onMounted } from 'vue'
import TheHeader from '@/components/home/TheHeader.vue'
import TheFooter from '@/components/home/TheFooter.vue'
import ProductCard from '@/components/tienda/ProductCard.vue'
import CartDrawer from '@/components/tienda/CartDrawer.vue'
import { fetchProducts } from '@/services/storyblok.service'
import { paymentService } from '@/services/payment.service'
import { useCartStore } from '@/stores/cart'
import type { Product } from '@/types'

const cart = useCartStore()
const products = ref<Product[]>([])
const loading = ref(true)
const error = ref('')
const checkoutLoading = ref(false)

onMounted(async () => {
  try {
    products.value = await fetchProducts()
  } catch {
    error.value = 'No se pudieron cargar los productos. Intenta de nuevo.'
  } finally {
    loading.value = false
  }
})

async function checkout() {
  if (cart.isEmpty || checkoutLoading.value) return

  checkoutLoading.value = true
  try {
    const clientTransactionId = crypto.randomUUID()
    const result = await paymentService.preparePayment({
      items: cart.items,
      clientTransactionId,
    })
    window.location.href = result.payWithPayPhone
  } catch {
    alert('Hubo un problema al procesar el pago. Por favor intenta de nuevo.')
  } finally {
    checkoutLoading.value = false
  }
}
</script>

<template>
  <div class="tienda-view">
    <TheHeader />

    <main class="tienda">
      <div class="tienda__hero">
        <h1 class="tienda__title">Nuestra Tienda</h1>
        <p class="tienda__subtitle">Tequeños artesanales listos para disfrutar</p>
      </div>

      <div class="tienda__layout">
        <!-- Products section -->
        <section class="tienda__products">
          <div v-if="loading" class="tienda__loading">
            <i class="fa-solid fa-spinner fa-spin"></i>
            <p>Cargando productos...</p>
          </div>

          <div v-else-if="error" class="tienda__error">
            <i class="fa-solid fa-triangle-exclamation"></i>
            <p>{{ error }}</p>
            <button class="btn btn--primary" @click="() => { loading = true; error = ''; fetchProducts().then(p => { products = p }).catch(() => { error = 'Error al cargar.' }).finally(() => { loading = false }) }">
              Reintentar
            </button>
          </div>

          <div v-else-if="products.length === 0" class="tienda__empty">
            <p>No hay productos disponibles por el momento.</p>
          </div>

          <div v-else class="tienda__grid">
            <ProductCard
              v-for="product in products"
              :key="product.slug"
              :product="product"
              @add-to-cart="cart.addItem($event)"
            />
          </div>
        </section>

        <!-- Cart sidebar -->
        <aside class="tienda__cart">
          <CartDrawer @checkout="checkout" />
          <div v-if="checkoutLoading" class="tienda__checkout-overlay">
            <i class="fa-solid fa-spinner fa-spin"></i>
            <span>Preparando pago...</span>
          </div>
        </aside>
      </div>
    </main>

    <TheFooter />
  </div>
</template>

<style lang="scss" scoped>
.tienda-view {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.tienda {
  flex: 1;
  padding-top: 80px; // offset for fixed header

  &__hero {
    background: $color-accent;
    color: $white;
    text-align: center;
    padding: 3rem $spacing-sm 2.5rem;

    @include respond-to('md') {
      padding: 4rem $spacing-xl 3rem;
    }
  }

  &__title {
    font-size: clamp(2rem, 5vw, 3rem);
    font-weight: 900;
    margin: 0 0 0.5rem;
  }

  &__subtitle {
    font-size: 1.1rem;
    opacity: 0.85;
    margin: 0;
  }

  &__layout {
    max-width: 1400px;
    margin: 0 auto;
    padding: 2.5rem $spacing-sm;
    display: grid;
    grid-template-columns: 1fr;
    gap: 2rem;
    align-items: start;

    @include respond-to('md') {
      padding: 2.5rem $spacing-xl;
      grid-template-columns: 1fr 340px;
    }
  }

  &__grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 1.5rem;

    @include respond-to('md') {
      grid-template-columns: repeat(2, 1fr);
    }

    @include respond-to('lg') {
      grid-template-columns: repeat(3, 1fr);
    }
  }

  &__loading,
  &__empty,
  &__error {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 1rem;
    min-height: 300px;
    color: #888;
    text-align: center;

    i {
      font-size: 2.5rem;
      color: $color-primary;
    }

    p {
      margin: 0;
    }
  }

  &__cart {
    position: relative;
    order: -1;

    @include respond-to('md') {
      order: 0;
    }
  }

  &__checkout-overlay {
    position: absolute;
    inset: 0;
    background: rgba(255, 255, 255, 0.85);
    border-radius: 1.25rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.75rem;
    font-weight: 600;
    color: $color-accent;

    i {
      font-size: 2rem;
    }
  }
}
</style>
