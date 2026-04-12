import { defineStore } from 'pinia'
import { ref } from 'vue'

export interface ConfirmOptions {
  title: string
  message?: string
  confirmText?: string
  cancelText?: string
  variant?: 'danger' | 'warning' | 'info'
}

export const useModalStore = defineStore('modal', () => {
  const isOpen = ref(false)
  const options = ref<ConfirmOptions>({ title: '' })

  let _resolve: ((value: boolean) => void) | null = null

  function confirm(opts: ConfirmOptions): Promise<boolean> {
    options.value = {
      confirmText: 'Confirmar',
      cancelText: 'Cancelar',
      variant: 'danger',
      ...opts,
    }
    isOpen.value = true
    return new Promise((resolve) => {
      _resolve = resolve
    })
  }

  function accept() {
    isOpen.value = false
    _resolve?.(true)
    _resolve = null
  }

  function dismiss() {
    isOpen.value = false
    _resolve?.(false)
    _resolve = null
  }

  return { isOpen, options, confirm, accept, dismiss }
})
