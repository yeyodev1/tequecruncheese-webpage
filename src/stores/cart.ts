import { defineStore } from 'pinia'
import type { CartItem, CustomerInfo, FlavorSelection } from '@/types'

export interface CartState {
  items: CartItem[]
  customerEmail: string
  customerInfo: CustomerInfo
  isCartOpen: boolean
}

export const useCartStore = defineStore('cart', {
  state: (): CartState => ({
    items: [],
    customerEmail: '',
    customerInfo: {
      nombre: '',
      cedula: '',
      email: '',
      telefono: '',
      calle: '',
      barrio: '',
      referencia: '',
      mapsUrl: '',
    },
    isCartOpen: false,
  }),

  getters: {
    totalItems: (state): number =>
      state.items.reduce((sum, item) => sum + item.cantidad, 0),

    totalPrice: (state): number =>
      state.items.reduce((sum, item) => sum + item.precio * item.cantidad, 0),

    isEmpty: (state): boolean => state.items.length === 0,
  },

  actions: {
    addItem(
      product: Omit<CartItem, 'cantidad'>,
      flavorSelections?: FlavorSelection[],
      openCart = true,
    ) {
      if (flavorSelections?.length) {
        // Flavor box: replace existing entry (customer re-configured flavors)
        const idx = this.items.findIndex((i) => i.slug === product.slug)
        const item = { ...product, cantidad: 1, flavorSelections }
        if (idx !== -1) this.items[idx] = item
        else this.items.push(item)
      } else {
        const existing = this.items.find((i) => i.slug === product.slug)
        if (existing) existing.cantidad++
        else this.items.push({ ...product, cantidad: 1 })
      }
      if (openCart) this.isCartOpen = true
    },

    removeItem(slug: string) {
      this.items = this.items.filter((i) => i.slug !== slug)
    },

    updateQuantity(slug: string, cantidad: number) {
      const item = this.items.find((i) => i.slug === slug)
      if (item) {
        if (cantidad <= 0) this.removeItem(slug)
        else item.cantidad = cantidad
      }
    },

    setEmail(email: string) {
      this.customerEmail = email
    },

    setCustomerInfo(info: Partial<CustomerInfo>) {
      // Mutate in place rather than replacing the object: composables and
      // `toRef` hold on to this reference, and swapping it leaves them
      // reading a detached copy that never updates again.
      Object.assign(this.customerInfo, info)
    },

    openCart() {
      this.isCartOpen = true
    },

    closeCart() {
      this.isCartOpen = false
    },

    toggleCart() {
      this.isCartOpen = !this.isCartOpen
    },

    clear() {
      this.items = []
      this.customerEmail = ''
      this.customerInfo = {
        nombre: '',
        cedula: '',
        email: '',
        telefono: '',
        calle: '',
        barrio: '',
        referencia: '',
        mapsUrl: '',
      }
      this.isCartOpen = false
    },
  },
})
