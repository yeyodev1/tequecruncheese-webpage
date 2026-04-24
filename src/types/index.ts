export interface ApiError {
  status: number
  message: string
  data?: unknown
}

// ── Product (from API) ────────────────────────────────────────────
export interface ProductImage {
  url: string
  publicId: string
}

export interface ProductFlavor {
  nombre: string
  grupo: 'normal' | 'especial'
  isActive: boolean
  limite: number   // 0 = sin límite individual
}

export interface Product {
  _id?: string
  slug: string
  nombre: string
  precio: number
  descripcion: string
  categoria: string
  imagen: ProductImage
  inStock: boolean
  hasStock: boolean
  stockCount: number
  isActive: boolean
  sortOrder?: number
  hasFlavors?: boolean
  boxSize?: number
  batchSize?: number
  flavors?: ProductFlavor[]
  createdAt?: string
  updatedAt?: string
}

// ── Flavor selection (cart) ────────────────────────────────────
export interface FlavorSelection {
  nombre: string
  grupo: string
  cantidad: number
}

// ── Cart ──────────────────────────────────────────────────────────
export interface CartItem {
  slug: string
  nombre: string
  precio: number
  cantidad: number
  flavorSelections?: FlavorSelection[]
}

// ── Customer info for checkout ────────────────────────────────────
export interface CustomerInfo {
  nombre: string
  cedula: string
  email: string
  telefono: string
  calle: string
  barrio?: string
  referencia?: string
  mapsUrl?: string
  quiereFactura?: boolean
  facturaEmail?: string
  facturaRuc?: string
  deliveryMethod?: 'delivery' | 'pickup'
}

// ── Payment ───────────────────────────────────────────────────────
export interface PreparePaymentPayload {
  items: CartItem[]
  clientTransactionId: string
  customerEmail: string
  customerInfo?: CustomerInfo
  deliveryCost?: number
}

export interface TrackOrderResponse {
  status: OrderStatus
  items: CartItem[]
  total: number
  createdAt: string
  trackingToken?: string
}

export type OrderStatus =
  | 'pending'
  | 'approved'
  | 'preparing'
  | 'ready'
  | 'delivered'
  | 'rejected'
  | 'cancelled'

export interface AdminNote {
  text: string
  createdAt: string
}

export interface AdminOrder {
  _id: string
  clientTransactionId: string
  trackingToken: string
  customerEmail: string
  customerName?: string
  customerPhone?: string
  cedula?: string
  quiereFactura?: boolean
  facturaEmail?: string
  facturaRuc?: string
  deliveryCost?: number
  deliveryAddress?: {
    calle: string
    barrio?: string
    referencia?: string
    mapsUrl?: string
  }
  status: OrderStatus
  total: number
  items: CartItem[]
  adminNotes: AdminNote[]
  createdAt: string
  updatedAt: string
}

export interface PreparePaymentResponse {
  payWithPayPhone: string
}

export interface ConfirmPaymentPayload {
  id: string
  clientTransactionId: string
}

export interface ConfirmPaymentResponse {
  success: boolean
  transactionStatus: string
  order: {
    id: string
    status: string
    total: number
    trackingToken?: string
  }
}
