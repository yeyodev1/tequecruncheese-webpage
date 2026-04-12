import { defineStore } from 'pinia'
import type { CartItem, CustomerInfo } from '@/types'

export interface CartState {
  items: CartItem[]
  customerEmail: string
  customerInfo: CustomerInfo
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
  }),

  getters: {
    totalItems: (state): number =>
      state.items.reduce((sum, item) => sum + item.cantidad, 0),

    totalPrice: (state): number =>
      state.items.reduce((sum, item) => sum + item.precio * item.cantidad, 0),

    isEmpty: (state): boolean => state.items.length === 0,
  },

  actions: {
    addItem(product: Omit<CartItem, 'cantidad'>) {
      const existing = this.items.find((i) => i.slug === product.slug)
      if (existing) {
        existing.cantidad++
      } else {
        this.items.push({ ...product, cantidad: 1 })
      }
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
      this.customerInfo = { ...this.customerInfo, ...info }
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
    },
  },
})
