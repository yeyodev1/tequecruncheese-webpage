import APIBase from './httpBase'
import type { AdminOrder, OrderStatus } from '@/types'

class AdminService extends APIBase {
  private getAdminHeaders(): Record<string, string> {
    const token = localStorage.getItem('admin_token')
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    }
  }

  async login(email: string, password: string): Promise<string> {
    const res = await this.post<{ token: string }>('admin/login', { email, password })
    return res.data.token
  }

  async listOrders(params?: {
    status?: string
    search?: string
    from?: string
    to?: string
  }): Promise<AdminOrder[]> {
    const query = new URLSearchParams()
    if (params?.status) query.set('status', params.status)
    if (params?.search) query.set('search', params.search)
    if (params?.from) query.set('from', params.from)
    if (params?.to) query.set('to', params.to)
    const qs = query.toString() ? `?${query.toString()}` : ''
    const res = await this.get<AdminOrder[]>(`admin/orders${qs}`, this.getAdminHeaders())
    return res.data
  }

  async getOrder(id: string): Promise<AdminOrder> {
    const res = await this.get<AdminOrder>(`admin/orders/${id}`, this.getAdminHeaders())
    return res.data
  }

  async updateStatus(id: string, status: OrderStatus): Promise<AdminOrder> {
    const res = await this.patch<AdminOrder>(
      `admin/orders/${id}/status`,
      { status },
      this.getAdminHeaders(),
    )
    return res.data
  }

  async addNote(id: string, text: string): Promise<AdminOrder> {
    const res = await this.post<AdminOrder>(
      `admin/orders/${id}/notes`,
      { text },
      this.getAdminHeaders(),
    )
    return res.data
  }
}

export const adminService = new AdminService()
