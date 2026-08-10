import type { CartItem, CustomerInfo } from '@/types'

const WHATSAPP_NUMBER = '593963237880'

export interface WhatsAppOrder {
  items: CartItem[]
  customerInfo: CustomerInfo
  subtotal: number
  total: number
  isPickup: boolean
  deliveryKm: number | null
  deliveryCost: number | null
}

/** Composes the order message and opens WhatsApp with it prefilled. */
export function openWhatsAppOrder(order: WhatsAppOrder): void {
  const { items, customerInfo: c, subtotal, total, isPickup, deliveryKm, deliveryCost } = order

  const lines = items.map(item => {
    let line = `• ${item.cantidad}x ${item.nombre} — $${(item.precio * item.cantidad).toFixed(2)}`
    if (item.flavorSelections?.length) {
      const detail = item.flavorSelections.map(s => `${s.cantidad}× ${s.nombre}`).join(', ')
      line += `\n  Sabores: ${detail}`
    }
    return line
  })

  const formInfo = [
    `Nombre: ${c.nombre}`,
    `Cédula: ${c.cedula}`,
    `Email: ${c.email}`,
    `Tel: ${c.telefono}`,
    `Dirección: ${c.calle}`,
    c.barrio ? `Barrio: ${c.barrio}` : '',
    c.referencia ? `Referencia: ${c.referencia}` : '',
    c.mapsUrl ? `Google Maps: ${c.mapsUrl}` : '',
  ].filter(Boolean)

  const deliveryLine = isPickup
    ? '🏪 Retiro en tienda (sin costo de envío)'
    : deliveryCost
      ? `Envío (${deliveryKm!.toFixed(1)} km): $${deliveryCost.toFixed(2)}`
      : 'Envío: por coordinar'

  const message = [
    '¡Hola Tequecruncheese! Quisiera hacer el siguiente pedido:',
    '',
    ...lines,
    '',
    // Scheduled orders never reach this path: they are card-only.
    '⚡ Lo antes posible',
    '',
    `Subtotal: $${subtotal.toFixed(2)}`,
    deliveryLine,
    `*Total: $${total.toFixed(2)}*`,
    '',
    '---',
    ...formInfo,
    '',
    '¡Gracias!',
  ].join('\n')

  window.open(
    `https://api.whatsapp.com/send/?phone=${WHATSAPP_NUMBER}&text=${encodeURIComponent(message)}`,
    '_blank',
    'noopener',
  )
}
