<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { ScheduleConfig } from '@/services/schedule.service'

const props = defineProps<{
  /** ISO instant of the booked slot, or null for "as soon as possible". */
  modelValue: string | null
  config: ScheduleConfig
  /** Copy changes between delivery and pickup. */
  mode: 'delivery' | 'pickup'
}>()

const emit = defineEmits<{ 'update:modelValue': [string | null] }>()

// ── Store-timezone helpers ────────────────────────────────────
// Every slot is built in the store's wall clock, never the device's, so a
// customer travelling abroad still books against Guayaquil hours.

interface Parts { year: number; month: number; day: number; hour: number; minute: number }

function zonedParts(date: Date, timeZone: string): Parts {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  })
  const read = (type: string) =>
    Number(fmt.formatToParts(date).find(p => p.type === type)?.value ?? '0')
  return {
    year: read('year'), month: read('month'), day: read('day'),
    hour: read('hour') % 24, minute: read('minute'),
  }
}

/** "-05:00" for the given instant in the store's zone. */
function zoneOffset(date: Date, timeZone: string): string {
  const name = new Intl.DateTimeFormat('en-US', { timeZone, timeZoneName: 'longOffset' })
    .formatToParts(date).find(p => p.type === 'timeZoneName')?.value ?? 'GMT-05:00'
  const match = name.match(/GMT([+-])(\d{1,2})(?::(\d{2}))?/)
  if (!match) return '-05:00'
  const sign = match[1]
  const hh = match[2]!.padStart(2, '0')
  const mm = match[3] ?? '00'
  return `${sign}${hh}:${mm}`
}

const pad = (n: number) => String(n).padStart(2, '0')

/** ISO instant for a wall-clock time at the store. */
function storeInstant(day: Parts, hour: number, minute: number): string {
  const probe = new Date(Date.UTC(day.year, day.month - 1, day.day, 12))
  const offset = zoneOffset(probe, props.config.timezone)
  return `${day.year}-${pad(day.month)}-${pad(day.day)}T${pad(hour)}:${pad(minute)}:00${offset}`
}

// ── Clock ─────────────────────────────────────────────────────
// Anchored to the server clock when we have it, so the picker never offers a
// slot the API would reject for being in the past.
const skewMs = computed(() =>
  props.config.serverNow ? new Date(props.config.serverNow).getTime() - Date.now() : 0,
)
const nowTick = ref(Date.now())
// Re-evaluates every minute so a slot does not stay bookable past its lead time.
const ticker = setInterval(() => { nowTick.value = Date.now() }, 60_000)
watch(() => props.modelValue, () => { /* keeps the grid reactive to resets */ })

const now = computed(() => new Date(nowTick.value + skewMs.value))
const earliest = computed(() => new Date(now.value.getTime() + props.config.minLeadMinutes * 60_000))

// ── Days ──────────────────────────────────────────────────────
interface Day { key: string; parts: Parts; label: string; sublabel: string; slots: Slot[] }
interface Slot { iso: string; label: string }

const WEEKDAYS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb']
const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

const days = computed<Day[]>(() => {
  const { timezone, openHour, closeHour, slotMinutes, maxDaysAhead } = props.config
  const today = zonedParts(now.value, timezone)
  const cutoff = earliest.value.getTime()
  const horizon = now.value.getTime() + maxDaysAhead * 24 * 60 * 60_000
  const result: Day[] = []

  for (let offset = 0; offset <= maxDaysAhead; offset++) {
    const base = new Date(Date.UTC(today.year, today.month - 1, today.day + offset, 12))
    const parts: Parts = {
      year: base.getUTCFullYear(), month: base.getUTCMonth() + 1, day: base.getUTCDate(),
      hour: 0, minute: 0,
    }

    const slots: Slot[] = []
    for (let m = openHour * 60; m + slotMinutes <= closeHour * 60; m += slotMinutes) {
      const iso = storeInstant(parts, Math.floor(m / 60), m % 60)
      const time = new Date(iso).getTime()
      // Drop slots that are too soon, or past the booking horizon.
      if (time < cutoff || time > horizon) continue
      slots.push({ iso, label: `${pad(Math.floor(m / 60))}:${pad(m % 60)}` })
    }
    if (!slots.length) continue

    const weekday = WEEKDAYS[new Date(Date.UTC(parts.year, parts.month - 1, parts.day)).getUTCDay()]!
    result.push({
      key: `${parts.year}-${pad(parts.month)}-${pad(parts.day)}`,
      parts,
      label: offset === 0 ? 'Hoy' : offset === 1 ? 'Mañana' : weekday,
      sublabel: `${parts.day} ${MONTHS[parts.month - 1]}`,
      slots,
    })
  }
  return result
})

// ── Selection ─────────────────────────────────────────────────
const isScheduled = computed(() => props.modelValue !== null)
const selectedDayKey = ref<string | null>(null)

const activeDay = computed<Day | null>(() =>
  days.value.find(d => d.key === selectedDayKey.value) ?? days.value[0] ?? null,
)

/** If the chosen slot expires while the tab sits open, clear it. */
watch(days, () => {
  if (!props.modelValue) return
  const stillOffered = days.value.some(d => d.slots.some(s => s.iso === props.modelValue))
  if (!stillOffered) emit('update:modelValue', null)
})

function chooseAsap() {
  emit('update:modelValue', null)
}

function startScheduling() {
  if (!days.value.length) return
  selectedDayKey.value = days.value[0]!.key
  // Nothing is booked until a time is tapped — the grid opens empty on purpose.
  emit('update:modelValue', days.value[0]!.slots[0]!.iso)
}

function selectDay(day: Day) {
  selectedDayKey.value = day.key
  const first = day.slots[0]
  if (first) emit('update:modelValue', first.iso)
}

function selectSlot(slot: Slot) {
  emit('update:modelValue', slot.iso)
}

/** "mar 11 ago · 14:30" for the confirmation strip. */
const selectionLabel = computed(() => {
  if (!props.modelValue) return ''
  const parts = zonedParts(new Date(props.modelValue), props.config.timezone)
  const weekday = WEEKDAYS[new Date(Date.UTC(parts.year, parts.month - 1, parts.day)).getUTCDay()]!
  const day = days.value.find(d => d.key === `${parts.year}-${pad(parts.month)}-${pad(parts.day)}`)
  const dayName = day && (day.label === 'Hoy' || day.label === 'Mañana')
    ? day.label
    : `${weekday} ${parts.day} ${MONTHS[parts.month - 1]}`
  return `${dayName} · ${pad(parts.hour)}:${pad(parts.minute)}`
})

const verb = computed(() => (props.mode === 'pickup' ? 'Retiro' : 'Entrega'))

defineExpose({ stopTicker: () => clearInterval(ticker) })
</script>

<template>
  <div class="sched">
    <!-- Mode toggle -->
    <div class="sched__modes">
      <button
        type="button"
        :class="['sched__mode', { 'sched__mode--active': !isScheduled }]"
        @click="chooseAsap"
      >
        <span class="sched__mode-icon"><i class="fa-solid fa-bolt"></i></span>
        <span class="sched__mode-text">
          <strong>Lo antes posible</strong>
          <small>Preparamos apenas confirmes</small>
        </span>
      </button>

      <button
        type="button"
        :class="['sched__mode', { 'sched__mode--active': isScheduled }]"
        :disabled="!days.length"
        @click="startScheduling"
      >
        <span class="sched__mode-icon"><i class="fa-regular fa-calendar-check"></i></span>
        <span class="sched__mode-text">
          <strong>Programar</strong>
          <small v-if="days.length">Elige día y hora</small>
          <small v-else>Sin horarios disponibles</small>
        </span>
      </button>
    </div>

    <!-- Picker -->
    <Transition name="sched-expand">
      <div v-if="isScheduled && activeDay" class="sched__picker">

        <p class="sched__label">
          <i class="fa-regular fa-calendar"></i> Día
        </p>
        <div class="sched__days">
          <button
            v-for="day in days"
            :key="day.key"
            type="button"
            :class="['sched__day', { 'sched__day--active': day.key === activeDay.key }]"
            @click="selectDay(day)"
          >
            <span class="sched__day-name">{{ day.label }}</span>
            <span class="sched__day-date">{{ day.sublabel }}</span>
          </button>
        </div>

        <p class="sched__label">
          <i class="fa-regular fa-clock"></i> Hora
          <span class="sched__label-hint">{{ activeDay.slots.length }} disponibles</span>
        </p>
        <div class="sched__slots">
          <button
            v-for="slot in activeDay.slots"
            :key="slot.iso"
            type="button"
            :class="['sched__slot', { 'sched__slot--active': slot.iso === modelValue }]"
            @click="selectSlot(slot)"
          >
            {{ slot.label }}
          </button>
        </div>

        <div v-if="selectionLabel" class="sched__confirm">
          <i class="fa-solid fa-circle-check"></i>
          <div class="sched__confirm-body">
            <strong>{{ verb }} programada</strong>
            <span>{{ selectionLabel }}</span>
          </div>
        </div>

      </div>
    </Transition>
  </div>
</template>

<style scoped lang="scss">
.sched {
  display: flex;
  flex-direction: column;
  gap: 0.9rem;

  // ── Mode cards ──────────────────────────────────────────
  &__modes {
    display: grid;
    grid-template-columns: 1fr;
    gap: 0.6rem;

    @include respond-to('sm') {
      grid-template-columns: 1fr 1fr;
    }
  }

  &__mode {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.85rem 1rem;
    border: 1.5px solid rgba($color-accent, 0.14);
    border-radius: $border-radius-lg;
    background: $white;
    text-align: left;
    cursor: pointer;
    transition: border-color 0.2s ease, background 0.2s ease, transform 0.2s ease;

    &:hover:not(:disabled) {
      border-color: rgba($color-secondary, 0.5);
      transform: translateY(-2px);
    }

    &:disabled {
      opacity: 0.45;
      cursor: not-allowed;
    }

    &--active {
      border-color: $color-secondary;
      background: rgba($color-primary, 0.22);
    }
  }

  &__mode-icon {
    display: grid;
    place-items: center;
    flex-shrink: 0;
    width: 38px;
    height: 38px;
    border-radius: 50%;
    background: rgba($color-primary, 0.45);
    color: $color-accent;
    font-size: 1rem;

    .sched__mode--active & {
      background: $color-secondary;
      color: $white;
    }
  }

  &__mode-text {
    display: flex;
    flex-direction: column;
    line-height: 1.3;

    strong {
      font-family: $font-secondary;
      font-size: 0.95rem;
      font-weight: 700;
      color: $color-accent;
    }

    small {
      font-size: 0.76rem;
      color: rgba($color-accent, 0.6);
    }
  }

  // ── Picker body ─────────────────────────────────────────
  &__picker {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    padding: 0.9rem;
    border-radius: $border-radius-lg;
    background: rgba($color-primary, 0.1);
    border: 1px solid rgba($color-accent, 0.1);
  }

  &__label {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    margin-top: 0.3rem;
    font-size: 0.78rem;
    font-weight: 600;
    color: rgba($color-accent, 0.7);
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  &__label-hint {
    margin-left: auto;
    text-transform: none;
    letter-spacing: 0;
    font-weight: 400;
    font-size: 0.72rem;
    color: rgba($color-accent, 0.45);
  }

  // ── Day strip ───────────────────────────────────────────
  &__days {
    display: flex;
    gap: 0.45rem;
    overflow-x: auto;
    padding-bottom: 0.3rem;
    scroll-snap-type: x mandatory;
    -webkit-overflow-scrolling: touch;

    &::-webkit-scrollbar { height: 4px; }
    &::-webkit-scrollbar-thumb {
      background: rgba($color-accent, 0.18);
      border-radius: $border-radius-pill;
    }
  }

  &__day {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1px;
    flex-shrink: 0;
    min-width: 64px;
    padding: 0.5rem 0.6rem;
    border: 1.5px solid rgba($color-accent, 0.12);
    border-radius: $border-radius-md;
    background: $white;
    cursor: pointer;
    scroll-snap-align: start;
    transition: all 0.18s ease;

    &:hover { border-color: rgba($color-secondary, 0.5); }

    &--active {
      border-color: $color-secondary;
      background: $color-secondary;

      .sched__day-name, .sched__day-date { color: $white; }
    }
  }

  &__day-name {
    font-family: $font-secondary;
    font-size: 0.82rem;
    font-weight: 700;
    color: $color-accent;
    text-transform: capitalize;
  }

  &__day-date {
    font-size: 0.7rem;
    color: rgba($color-accent, 0.55);
  }

  // ── Time slots ──────────────────────────────────────────
  &__slots {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(66px, 1fr));
    gap: 0.4rem;
    max-height: 190px;
    overflow-y: auto;
    padding-right: 2px;

    &::-webkit-scrollbar { width: 4px; }
    &::-webkit-scrollbar-thumb {
      background: rgba($color-accent, 0.18);
      border-radius: $border-radius-pill;
    }
  }

  &__slot {
    padding: 0.45rem 0.2rem;
    border: 1.5px solid rgba($color-accent, 0.12);
    border-radius: $border-radius-md;
    background: $white;
    font-family: $font-secondary;
    font-size: 0.82rem;
    font-weight: 600;
    color: $color-accent;
    cursor: pointer;
    transition: all 0.15s ease;

    &:hover { border-color: rgba($color-secondary, 0.55); }

    &--active {
      border-color: $color-secondary;
      background: $color-secondary;
      color: $white;
    }
  }

  // ── Confirmation strip ──────────────────────────────────
  &__confirm {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    margin-top: 0.4rem;
    padding: 0.65rem 0.85rem;
    border-radius: $border-radius-md;
    background: $alert-success-bg;
    border: 1px solid rgba($alert-success, 0.28);

    > i {
      color: $alert-success;
      font-size: 1rem;
    }
  }

  &__confirm-body {
    display: flex;
    flex-direction: column;
    line-height: 1.3;

    strong {
      font-size: 0.85rem;
      font-weight: 700;
      color: #276749;
    }

    span {
      font-size: 0.8rem;
      color: rgba(#276749, 0.8);
      text-transform: capitalize;
    }
  }
}

// ── Expand transition ─────────────────────────────────────
.sched-expand-enter-active,
.sched-expand-leave-active {
  transition: opacity 0.25s ease, transform 0.25s ease, max-height 0.3s ease;
  overflow: hidden;
  max-height: 500px;
}

.sched-expand-enter-from,
.sched-expand-leave-to {
  opacity: 0;
  max-height: 0;
  transform: translateY(-6px);
}
</style>
