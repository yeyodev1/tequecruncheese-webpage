import { API_BASE_URL as API_BASE } from '@/config/api'

export interface MapsQuote {
  resolvedUrl: string
  coords: { lat: number; lng: number } | null
  km: number | null
  deliveryCost: number | null
}

export const mapsService = {
  /**
   * Asks the backend to resolve any pasted Maps link (short, long, regional
   * domain or bare "lat,lng") and price the delivery. The backend is the
   * authority — the browser-side estimate is only an instant preview.
   */
  async quote(url: string): Promise<MapsQuote> {
    const res = await fetch(`${API_BASE}/maps/resolve?url=${encodeURIComponent(url)}`)
    if (!res.ok) throw new Error('Could not resolve URL')
    return (await res.json()) as MapsQuote
  },
}
