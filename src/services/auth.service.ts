import APIBase from './httpBase'
import type { CartItem } from '@/types'

export interface LoginResponse {
  token: string
  user: {
    id: string
    name: string
    email: string
    role: string
  }
}

export interface RegisterData {
  name?: string
  email: string
  password: string
}

export interface UserProfile {
  id: string
  name: string
  email: string
}

export type OrderFilter = 'all' | 'pending' | 'active' | 'completed' | 'cancelled'

export interface MyOrder {
  _id: string
  trackingToken: string
  status: string
  items: CartItem[]
  total: number
  createdAt: string
  payWithPayPhone?: string
  scheduledFor?: string
}

class AuthService extends APIBase {
  async login(email: string, password: string): Promise<LoginResponse> {
    const res = await this.post<LoginResponse>('auth/login', { email, password })
    return res.data
  }

  async register(data: RegisterData): Promise<LoginResponse> {
    const res = await this.post<LoginResponse>('auth/register', data)
    return res.data
  }

  async me(): Promise<UserProfile> {
    const res = await this.get<UserProfile>('auth/me')
    return res.data
  }

  async forgotPassword(email: string): Promise<{ message: string }> {
    const res = await this.post<{ message: string }>('auth/forgot-password', { email })
    return res.data
  }

  async resetPassword(token: string, password: string): Promise<{ message: string }> {
    const res = await this.post<{ message: string }>('auth/reset-password', { token, password })
    return res.data
  }

  async myOrders(filter?: string): Promise<MyOrder[]> {
    const query = filter && filter !== 'all' ? `?filter=${filter}` : ''
    const res = await this.get<MyOrder[]>(`orders/my-orders${query}`)
    return res.data
  }
}

export const authService = new AuthService()
