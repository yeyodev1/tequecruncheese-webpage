<script setup lang="ts">
/**
 * Pick a delivery point on a map, the way a ride app does it.
 *
 * A pasted Maps link is the fast path when it works, but it fails in ways the
 * customer cannot diagnose — a place shared from the app carries a name rather
 * than a pin, a link gets mangled by the chat it came through. The fallback
 * used to be prose ("coordinaremos el envío contigo"), which left the fee
 * unknown at the moment the customer is deciding whether to buy.
 *
 * The pin is fixed to the centre of the screen and the map moves underneath.
 * That is the pattern every delivery app uses, and it beats dragging a marker
 * on a phone: the target never leaves the middle of the screen, so it cannot
 * end up under a thumb or outside the viewport.
 *
 * The result is emitted as a plain "lat,lng" string, which the checkout stores
 * in the same field a pasted link goes into — the backend already reads that
 * form, so nothing downstream needs to know a map was involved.
 */
import { ref, shallowRef, computed, watch, onBeforeUnmount, nextTick } from 'vue'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { haversineKm, getDeliveryCost } from '@/composables/useDeliveryQuote'

const props = defineProps<{
  open: boolean
  /** Where to open the map, when the customer already has a resolved point. */
  initial?: { lat: number; lng: number } | null
}>()

const emit = defineEmits<{
  close: []
  confirm: [coords: { lat: number; lng: number }]
}>()

/** The store. Also the fallback centre when there is nothing better. */
const ORIGIN = { lat: -2.1647443, lng: -79.912804 }

const mapEl = ref<HTMLElement | null>(null)
const map = shallowRef<L.Map | null>(null)
const centre = ref<{ lat: number; lng: number }>({ ...ORIGIN })
const address = ref('')
const isLocating = ref(false)
const isNaming = ref(false)
const locateError = ref('')
/** True while the map glides, so the pin can lift and the fee can hold still. */
const isMoving = ref(false)

const km = computed(() => haversineKm(ORIGIN.lat, ORIGIN.lng, centre.value.lat, centre.value.lng))
const cost = computed(() => getDeliveryCost(km.value))

let nameTimer: ReturnType<typeof setTimeout> | undefined
let nameSeq = 0

/**
 * Name the point under the pin.
 *
 * Coordinates prove nothing to a customer — "-2.1348, -79.9020" is not
 * something anyone can check against the place they live. A street name is,
 * and it is the difference between confirming and guessing. Best-effort: the
 * fee and the confirm button never depend on it.
 */
async function nameCentre() {
  clearTimeout(nameTimer)
  const mySeq = ++nameSeq
  isNaming.value = true
  nameTimer = setTimeout(async () => {
    try {
      const { lat, lng } = centre.value
      const url =
        'https://nominatim.openstreetmap.org/reverse?format=jsonv2' +
        `&lat=${lat}&lon=${lng}&zoom=18&accept-language=es`
      const res = await fetch(url, { headers: { Accept: 'application/json' } })
      if (!res.ok) throw new Error('reverse failed')
      const data = (await res.json()) as { address?: Record<string, string>; display_name?: string }
      if (mySeq !== nameSeq) return
      const a = data.address ?? {}
      const street = [a.road, a.house_number].filter(Boolean).join(' ')
      const area = a.neighbourhood ?? a.suburb ?? a.city_district ?? a.town ?? a.city
      address.value = [street, area].filter(Boolean).join(', ') || (data.display_name ?? '')
    } catch {
      // A missing name is not an error the customer needs to see; the map
      // itself is the confirmation, and the fee is computed from the point.
      if (mySeq === nameSeq) address.value = ''
    } finally {
      if (mySeq === nameSeq) isNaming.value = false
    }
  }, 450)
}

function syncCentre() {
  const m = map.value
  if (!m) return
  const c = m.getCenter()
  centre.value = { lat: c.lat, lng: c.lng }
  void nameCentre()
}

async function mount() {
  await nextTick()
  if (!mapEl.value || map.value) return

  const start = props.initial ?? ORIGIN
  centre.value = { ...start }

  const m = L.map(mapEl.value, {
    center: [start.lat, start.lng],
    zoom: props.initial ? 17 : 13,
    zoomControl: false,
    attributionControl: true,
  })

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© OpenStreetMap',
  }).addTo(m)

  L.control.zoom({ position: 'bottomright' }).addTo(m)

  // A marker on the store gives the distance somewhere to be measured from.
  L.circleMarker([ORIGIN.lat, ORIGIN.lng], {
    radius: 7,
    color: '#572612',
    fillColor: '#FED47F',
    fillOpacity: 1,
    weight: 2,
  })
    .addTo(m)
    .bindTooltip('Tequecruncheese', { direction: 'top' })

  m.on('movestart', () => { isMoving.value = true })
  m.on('move', () => {
    const c = m.getCenter()
    centre.value = { lat: c.lat, lng: c.lng }
  })
  m.on('moveend', () => {
    isMoving.value = false
    syncCentre()
  })

  map.value = m
  // Leaflet measures the container on creation; inside a modal that has only
  // just been shown, that measurement is of a zero-height box.
  setTimeout(() => m.invalidateSize(), 60)
  void nameCentre()
}

function destroy() {
  clearTimeout(nameTimer)
  nameSeq++
  map.value?.remove()
  map.value = null
  address.value = ''
  locateError.value = ''
}

/** Jump to the device's own position — the shortest path to a correct pin. */
function locateMe() {
  if (!navigator.geolocation) {
    locateError.value = 'Tu navegador no permite compartir ubicación.'
    return
  }
  isLocating.value = true
  locateError.value = ''
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      isLocating.value = false
      map.value?.flyTo([pos.coords.latitude, pos.coords.longitude], 17, { duration: 0.8 })
    },
    () => {
      isLocating.value = false
      // Denial is a choice, not a fault: the map still works by hand.
      locateError.value = 'No pudimos acceder a tu ubicación. Mueve el mapa para marcarla.'
    },
    { enableHighAccuracy: true, timeout: 8000 },
  )
}

// `immediate`, because the parent lazy-mounts this component only once the map
// is wanted: `open` is already true on the very first run, and a watcher that
// waits for a *change* would sit there watching an empty box forever.
watch(
  () => props.open,
  (open) => {
    if (open) void mount()
    else destroy()
  },
  { immediate: true },
)

onBeforeUnmount(destroy)
</script>

<template>
  <!--
    Teleported to <body> because `position: fixed` is not fixed to the viewport
    when any ancestor carries a transform, filter or perspective — it anchors to
    that ancestor instead. Nested inside the scrolled checkout the panel landed
    293px above the top of the screen, header and all. Out here nothing upstream
    can capture it.
  -->
  <Teleport to="body">
    <Transition name="lp-fade" appear>
      <div
        v-if="open"
        class="lp"
        role="dialog"
        aria-modal="true"
        aria-label="Elegir ubicación de entrega"
      >
        <header class="lp__head">
          <button class="lp__back" type="button" aria-label="Cerrar" @click="emit('close')">
            <i class="fa-solid fa-arrow-left"></i>
          </button>
          <div class="lp__titles">
            <strong>¿Dónde te lo dejamos?</strong>
            <span>Mueve el mapa para poner el pin en tu puerta</span>
          </div>
        </header>

        <div class="lp__mapwrap">
          <div ref="mapEl" class="lp__map"></div>

          <!-- Fixed to the centre: the map moves, the pin does not. -->
          <div class="lp__pin" :class="{ 'lp__pin--lifted': isMoving }" aria-hidden="true">
            <i class="fa-solid fa-location-dot"></i>
            <span class="lp__pin-shadow"></span>
          </div>

          <button class="lp__locate" type="button" :disabled="isLocating" @click="locateMe">
            <i :class="isLocating ? 'fa-solid fa-spinner fa-spin' : 'fa-solid fa-crosshairs'"></i>
            <span>{{ isLocating ? 'Buscando...' : 'Usar mi ubicación' }}</span>
          </button>
        </div>

        <footer class="lp__foot">
          <p v-if="locateError" class="lp__err">
            <i class="fa-solid fa-circle-info"></i> {{ locateError }}
          </p>

          <div class="lp__where">
            <i class="fa-solid fa-location-dot"></i>
            <div class="lp__where-body">
              <strong v-if="address">{{ address }}</strong>
              <strong v-else-if="isNaming">Buscando la dirección...</strong>
              <strong v-else>Punto seleccionado</strong>
              <span>{{ km.toFixed(1) }} km desde la tienda</span>
            </div>
          </div>

          <div class="lp__fee" :class="cost === null ? 'lp__fee--warn' : 'lp__fee--ok'">
            <template v-if="cost === null">
              <i class="fa-solid fa-triangle-exclamation"></i>
              <span>Fuera de nuestra zona · coordinamos el envío contigo</span>
            </template>
            <template v-else>
              <i class="fa-solid fa-truck"></i>
              <span>Envío <strong>${{ cost!.toFixed(2) }}</strong></span>
            </template>
          </div>

          <button class="lp__confirm" type="button" @click="emit('confirm', { ...centre })">
            <i class="fa-solid fa-check"></i>
            Confirmar esta ubicación
          </button>
        </footer>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped lang="scss">
.lp {
  position: fixed;
  inset: 0;
  z-index: 1200;
  display: flex;
  flex-direction: column;
  background: $white;
}

.lp__head {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.85rem 1rem;
  background: $color-accent;
  color: $color-primary;
  flex-shrink: 0;
}

.lp__back {
  display: grid;
  place-items: center;
  width: 2.25rem;
  height: 2.25rem;
  border: none;
  border-radius: $border-radius-pill;
  background: rgba($white, 0.14);
  color: $color-primary;
  font-size: 1rem;
  cursor: pointer;
  flex-shrink: 0;

  &:hover { background: rgba($white, 0.24); }
}

.lp__titles {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
  min-width: 0;

  strong {
    font-family: $font-secondary;
    font-size: 1rem;
    font-weight: 800;
    line-height: 1.2;
  }

  span {
    font-size: 0.76rem;
    opacity: 0.82;
    line-height: 1.3;
  }
}

.lp__mapwrap {
  position: relative;
  flex: 1;
  min-height: 0;
}

.lp__map {
  position: absolute;
  inset: 0;
}

.lp__pin {
  position: absolute;
  top: 50%;
  left: 50%;
  z-index: 500;
  transform: translate(-50%, -100%);
  pointer-events: none;
  transition: transform 0.18s ease;
  text-align: center;

  > i {
    font-size: 2.4rem;
    color: $color-secondary;
    filter: drop-shadow(0 3px 4px rgba(0, 0, 0, 0.35));
  }

  // Lifting while the map glides reads as "not yet placed".
  &--lifted { transform: translate(-50%, -115%); }
}

.lp__pin-shadow {
  display: block;
  width: 0.5rem;
  height: 0.25rem;
  margin: -0.15rem auto 0;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.32);
}

.lp__locate {
  position: absolute;
  left: 1rem;
  bottom: 1rem;
  z-index: 500;
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.6rem 0.95rem;
  border: 1.5px solid rgba($color-accent, 0.16);
  border-radius: $border-radius-pill;
  background: $white;
  color: $color-accent;
  font-size: 0.82rem;
  font-weight: 700;
  box-shadow: 0 3px 12px rgba(0, 0, 0, 0.16);
  cursor: pointer;

  &:disabled { opacity: 0.65; cursor: default; }
  > i { color: $color-secondary; }
}

.lp__foot {
  flex-shrink: 0;
  padding: 0.9rem 1rem calc(1rem + env(safe-area-inset-bottom));
  border-top: 1px solid rgba($color-accent, 0.1);
  background: $white;
  box-shadow: 0 -4px 18px rgba(0, 0, 0, 0.07);
}

.lp__err {
  display: flex;
  align-items: flex-start;
  gap: 0.4rem;
  margin: 0 0 0.6rem;
  font-size: 0.76rem;
  line-height: 1.4;
  color: #92400e;
}

.lp__where {
  display: flex;
  align-items: flex-start;
  gap: 0.6rem;
  margin-bottom: 0.6rem;

  > i {
    margin-top: 0.15rem;
    color: $color-secondary;
    flex-shrink: 0;
  }

  &-body {
    display: flex;
    flex-direction: column;
    gap: 0.1rem;
    min-width: 0;

    strong {
      font-size: 0.9rem;
      font-weight: 800;
      color: $color-accent;
      line-height: 1.3;
      overflow-wrap: anywhere;
    }

    span {
      font-size: 0.76rem;
      color: $text-secondary;
    }
  }
}

.lp__fee {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.6rem 0.8rem;
  border-radius: $border-radius-md;
  margin-bottom: 0.8rem;
  font-size: 0.82rem;

  strong { font-weight: 800; }

  &--ok {
    background: $alert-success-bg;
    border: 1.5px solid rgba($alert-success, 0.4);
    color: #276749;
    > i { color: $alert-success; }
  }

  &--warn {
    background: $alert-warning-bg;
    border: 1.5px solid rgba($alert-warning, 0.45);
    color: #92400e;
    > i { color: $alert-warning; }
  }
}

.lp__confirm {
  width: 100%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.95rem 1rem;
  border: none;
  border-radius: $border-radius-md;
  background: $color-accent;
  color: $color-primary;
  font-family: $font-secondary;
  font-size: 1rem;
  font-weight: 800;
  cursor: pointer;

  &:hover { background: darken($color-accent, 5); }
}

@media (min-width: $breakpoint-md) {
  .lp {
    inset: 50% auto auto 50%;
    transform: translate(-50%, -50%);
    width: min(560px, 94vw);
    height: min(720px, 92vh);
    border-radius: $border-radius-lg;
    overflow: hidden;
    box-shadow: 0 24px 60px rgba(0, 0, 0, 0.3);
  }
}

.lp-fade-enter-active,
.lp-fade-leave-active { transition: opacity 0.18s ease; }
.lp-fade-enter-from,
.lp-fade-leave-to { opacity: 0; }
</style>
