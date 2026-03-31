import APIBase from './httpBase'
import type {
  PreparePaymentPayload,
  PreparePaymentResponse,
  ConfirmPaymentPayload,
  ConfirmPaymentResponse,
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
}

export const paymentService = new PaymentService()
