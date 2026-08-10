import { API_BASE_URL as API_BASE } from '@/config/api'

export interface ScheduleConfig {
  timezone: string
  openHour: number
  closeHour: number
  slotMinutes: number
  minLeadMinutes: number
  maxDaysAhead: number
  /** Server clock at the time of the request, so a skewed device still
   *  offers slots the API will accept. */
  serverNow: string
}

/** Mirrors the backend defaults so the picker renders before the fetch lands. */
export const DEFAULT_SCHEDULE_CONFIG: ScheduleConfig = {
  timezone: 'America/Guayaquil',
  openHour: 9,
  closeHour: 20,
  slotMinutes: 30,
  minLeadMinutes: 60,
  maxDaysAhead: 14,
  serverNow: '',
}

/**
 * "mar 11 ago, 14:30" in store time — used everywhere a booked slot is shown,
 * so the customer, the kitchen and the emails all read the same wall clock.
 */
export function formatSchedule(iso?: string | null): string {
  if (!iso) return ''
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat('es-EC', {
    timeZone: DEFAULT_SCHEDULE_CONFIG.timezone,
    weekday: 'short', day: 'numeric', month: 'short',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(date)
}

/** Compact "11 ago · 14:30" for tight spots like kanban cards. */
export function formatScheduleShort(iso?: string | null): string {
  if (!iso) return ''
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  const parts = new Intl.DateTimeFormat('es-EC', {
    timeZone: DEFAULT_SCHEDULE_CONFIG.timezone,
    day: 'numeric', month: 'short',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(date)
  const get = (type: string) => parts.find(p => p.type === type)?.value ?? ''
  return `${get('day')} ${get('month')} · ${get('hour')}:${get('minute')}`
}

export const scheduleService = {
  async config(): Promise<ScheduleConfig> {
    const res = await fetch(`${API_BASE}/schedule/config`)
    if (!res.ok) throw new Error('Could not load schedule config')
    return (await res.json()) as ScheduleConfig
  },
}
