import { computed, ref, type Ref } from 'vue'
import type { CustomerInfo } from '@/types'

/** Ecuadorian national ID check digit (modulus 10). */
export function validarCedula(cedula: string): boolean {
  if (!/^\d{10}$/.test(cedula)) return false
  const provincia = parseInt(cedula.slice(0, 2))
  if (provincia < 1 || provincia > 24) return false
  const digits = cedula.split('').map(Number)
  const verifier = digits[9]
  const sum = digits.slice(0, 9).reduce((acc, d, i) => {
    let v = i % 2 === 0 ? d * 2 : d
    if (v > 9) v -= 9
    return acc + v
  }, 0)
  const mod = sum % 10
  return mod === 0 ? verifier === 0 : verifier === 10 - mod
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export interface FacturaState {
  quiere: Ref<boolean>
  email: Ref<string>
  ruc: Ref<string>
}

export function useCheckoutValidation(
  customerInfo: CustomerInfo,
  isPickup: Ref<boolean>,
  factura: FacturaState,
) {
  const touched = ref({
    nombre: false,
    cedula: false,
    email: false,
    telefono: false,
    calle: false,
  })
  function markTouched(field: keyof typeof touched.value) {
    touched.value[field] = true
  }

  const touchedFactura = ref({ email: false, ruc: false })

  const emailValid = computed(() => EMAIL_RE.test(customerInfo.email))
  const nombreValid = computed(() => customerInfo.nombre.trim().length >= 3)
  const cedulaValid = computed(() => validarCedula(customerInfo.cedula))
  const telefonoValid = computed(() => /^(09|02)\d{8}$/.test(customerInfo.telefono))
  const calleValid = computed(() => customerInfo.calle.trim().length >= 5)

  const facturaRucValid = computed(() => /^(\d{10}|\d{13})$/.test(factura.ruc.value))
  const facturaEmailValid = computed(() => EMAIL_RE.test(factura.email.value))

  const formValid = computed(() => {
    const personal = emailValid.value && nombreValid.value && cedulaValid.value && telefonoValid.value
    const address = isPickup.value || calleValid.value
    const base = personal && address
    if (!factura.quiere.value) return base
    return base && facturaRucValid.value && facturaEmailValid.value
  })

  /** Names what is still missing, so the disabled button explains itself. */
  const missingFieldsLabel = computed(() => {
    const missing: string[] = []
    if (!nombreValid.value) missing.push('nombre')
    if (!cedulaValid.value) missing.push('cédula')
    if (!emailValid.value) missing.push('correo')
    if (!telefonoValid.value) missing.push('teléfono')
    if (!isPickup.value && !calleValid.value) missing.push('dirección')
    if (factura.quiere.value && !facturaEmailValid.value) missing.push('correo de factura')
    if (factura.quiere.value && !facturaRucValid.value) missing.push('RUC / cédula')

    if (!missing.length) return 'Revisa los campos marcados'
    if (missing.length === 1) return `Falta tu ${missing[0]}`
    const last = missing.pop()
    return `Faltan: ${missing.join(', ')} y ${last}`
  })

  return {
    touched, markTouched, touchedFactura,
    emailValid, nombreValid, cedulaValid, telefonoValid, calleValid,
    facturaRucValid, facturaEmailValid,
    formValid, missingFieldsLabel,
  }
}
