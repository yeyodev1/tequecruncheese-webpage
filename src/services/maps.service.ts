const API_BASE = (import.meta.env.VITE_API_BASE_URL as string) || 'http://localhost:8100/api'

export const mapsService = {
  async resolveUrl(url: string): Promise<string> {
    const res = await fetch(`${API_BASE}/maps/resolve?url=${encodeURIComponent(url)}`)
    if (!res.ok) throw new Error('Could not resolve URL')
    const data = await res.json() as { resolvedUrl: string }
    return data.resolvedUrl
  },
}
