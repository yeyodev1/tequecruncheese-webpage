export interface ApiError {
  status: number
  message: string
  data?: unknown
}

// Storyblok
export interface StoryblokAsset {
  filename: string
  alt?: string
}

export interface StoryblokProductContent {
  _uid: string
  nombre: string
  precio: string
  descripcion: string
  component: string
  fotos?: StoryblokAsset[]
}

export interface StoryblokStory {
  slug: string
  full_slug: string
  content: StoryblokProductContent
}

export interface StoryblokStoriesResponse {
  stories: StoryblokStory[]
}

// Normalized product
export interface Product {
  slug: string
  nombre: string
  precio: number
  descripcion: string
  imagen: string
}

// Cart
export interface CartItem {
  slug: string
  nombre: string
  precio: number
  cantidad: number
}

// Payment
export interface PreparePaymentPayload {
  items: CartItem[]
  clientTransactionId: string
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
  }
}
