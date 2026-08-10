import { computed, ref, watch, onBeforeUnmount, type Ref } from 'vue'
import { mapsService, type MapsQuote } from '@/services/maps.service'

/**
 * Turns a pasted Google Maps link into a delivery distance and price.
 *
 * The backend owns the real calculation and the amount charged; everything
 * here is a preview so the customer sees a price while typing.
 */

const ORIGIN = { lat: -2.1647443, lng: -79.912804 } // Tequecruncheese, Guayaquil

/** Continental Ecuador — anything outside is a mis-parse, not an address. */
const EC_BBOX = { minLat: -5.2, maxLat: 1.8, minLng: -81.3, maxLng: -74.9 }
const MAX_DELIVERY_KM = 60

const NUM = '(-?\\d+\\.\\d+)'
// Ordered by trustworthiness: `!3d!4d` is the resolved pin, `@` only the
// viewport centre. Decimals are required so street numbers cannot match.
const COORD_PATTERNS = [
  new RegExp(`!3d${NUM}!4d${NUM}`),
  new RegExp(`[?&](?:q|query|destination|daddr|saddr|ll|sll|center|mlat)=(?:loc:)?${NUM},\\+?${NUM}`),
  new RegExp(`/maps/(?:search|dir|place)/${NUM},\\+?${NUM}`),
  new RegExp(`@${NUM},${NUM}`),
]
const BARE_COORDS_RE = new RegExp(`^\\s*${NUM}\\s*,\\s*${NUM}\\s*$`)

function isPlausible(lat: number, lng: number): boolean {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false
  return lat >= EC_BBOX.minLat && lat <= EC_BBOX.maxLat
    && lng >= EC_BBOX.minLng && lng <= EC_BBOX.maxLng
}

export function extractCoordsFromMapsUrl(url: string): { lat: number; lng: number } | null {
  if (!url) return null

  const bare = url.match(BARE_COORDS_RE)
  if (bare) {
    const lat = parseFloat(bare[1]!), lng = parseFloat(bare[2]!)
    if (isPlausible(lat, lng)) return { lat, lng }
  }

  let decoded = url
  try { decoded = decodeURIComponent(url) } catch { /* keep the raw string */ }

  for (const candidate of [url, decoded]) {
    for (const pattern of COORD_PATTERNS) {
      const match = candidate.match(pattern)
      if (!match) continue
      const lat = parseFloat(match[1]!), lng = parseFloat(match[2]!)
      // Keep scanning: a bad `@` hit must not shadow a good `!3d!4d` later on.
      if (isPlausible(lat, lng)) return { lat, lng }
    }
  }

  return null
}

export function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371
  const toRad = (v: number) => (v * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

/** Mirrors the backend tariff table. Out of radius → null ("por coordinar"). */
export function getDeliveryCost(km: number): number | null {
  if (!Number.isFinite(km) || km < 0) return null
  if (km <= 1) return 2.00
  if (km <= 2.9) return 2.50
  if (km <= 4.9) return 3.00
  if (km <= 5.9) return 3.50
  if (km <= 7.9) return 4.00
  if (km <= 8.5) return 4.50
  if (km <= 9.9) return 5.00
  if (km <= 10.9) return 5.50
  if (km <= 13.9) return 6.00
  if (km <= 15.9) return 6.50
  if (km <= 17.9) return 7.00
  if (km <= 20.9) return 8.00
  if (km <= 23.9) return 9.00
  if (km <= MAX_DELIVERY_KM) return 10.00
  return null
}

export function useDeliveryQuote(mapsUrl: Ref<string | undefined>, isPickup: Ref<boolean>) {
  // Every link goes to the backend: short links need a redirect follow, and
  // long ones can resolve to a page whose coordinates only live in the body.
  const quote = ref<MapsQuote | null>(null)
  const isResolving = ref(false)
  let timer: ReturnType<typeof setTimeout> | undefined
  let seq = 0

  watch(
    mapsUrl,
    (newUrl) => {
      clearTimeout(timer)
      quote.value = null
      const raw = (newUrl ?? '').trim()
      if (!raw) { isResolving.value = false; return }

      isResolving.value = true
      const mySeq = ++seq
      // Debounced so a pasted-then-edited link doesn't fire per keystroke.
      timer = setTimeout(async () => {
        try {
          const result = await mapsService.quote(raw)
          if (mySeq === seq) quote.value = result
        } catch {
          // Leaves the local estimate (or the "por coordinar" notice) in place.
        } finally {
          if (mySeq === seq) isResolving.value = false
        }
      }, 500)
    },
    { immediate: true },
  )

  onBeforeUnmount(() => clearTimeout(timer))

  /** Local estimate — usable only when the link already carries coords. */
  const localCoords = computed(() => extractCoordsFromMapsUrl(mapsUrl.value ?? ''))

  const coords = computed(() => quote.value?.coords ?? localCoords.value)

  const km = computed(() => {
    if (quote.value?.km != null) return quote.value.km
    const c = localCoords.value
    return c ? haversineKm(ORIGIN.lat, ORIGIN.lng, c.lat, c.lng) : null
  })

  const cost = computed(() => {
    if (isPickup.value) return 0
    if (quote.value) return quote.value.deliveryCost
    return km.value !== null ? getDeliveryCost(km.value) : null
  })

  /** Coordinates found but beyond the radius — price is coordinated by hand. */
  const outOfRange = computed(() =>
    !isPickup.value && coords.value !== null && cost.value === null,
  )

  return { coords, km, cost, outOfRange, isResolving }
}
