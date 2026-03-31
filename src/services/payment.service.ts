import APIBase from './httpBase'
import type {
  PreparePaymentPayload,
  PreparePaymentResponse,
  ConfirmPaymentPayload,
  ConfirmPaymentResponse,
  TrackOrderResponse,
  AdminOrder,
} from '@/types'

class PaymentService extends APIBase {
  async preparePayment(payload: PreparePaymentPayload): Promise<PreparePaymentResponse> {
    const res = await this.post<PreparePaymentResponse>('payphone/prepare', payload)
    return res.data
  }

  async confirmPayment(payload: ConfirmPaymentPayload): Promise<ConfirmPaymentResponse> {
    const res = await this.post<ConfirmPaymentResponse>('payphone/confirm', payload)
    return res.data
  }

  async trackOrder(token: string): Promise<TrackOrderResponse> {
    const res = await this.get<TrackOrderResponse>(`orders/track/${token}`)
    return res.data
  }

  async listOrders(status?: string): Promise<AdminOrder[]> {
    const query = status ? `?status=${encodeURIComponent(status)}` : ''
    const res = await this.get<AdminOrder[]>(`orders${query}`)
    return res.data
  }
}

export const paymentService = new PaymentService()
