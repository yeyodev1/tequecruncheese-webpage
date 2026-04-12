import { defineStore } from 'pinia'
import { authService } from '@/services/auth.service'

export interface UserState {
  id: string | null
  name: string | null
  email: string | null
  isAuthenticated: boolean
}

export const useUserStore = defineStore('user', {
  state: (): UserState => ({
    id: null,
    name: null,
    email: null,
    isAuthenticated: false,
  }),

  getters: {
    isLoggedIn: (_state): boolean => {
      return !!localStorage.getItem('access_token')
    },
  },

  actions: {
    hydrate() {
      const token = localStorage.getItem('access_token')
      const id = localStorage.getItem('user_id')

      this.isAuthenticated = !!token
      this.id = id || null
    },

    setUser(payload: { id?: string; name?: string; email?: string }) {
      if (payload.id !== undefined) {
        this.id = payload.id
        try {
          localStorage.setItem('user_id', payload.id)
        } catch {}
      }
      if (payload.name) this.name = payload.name
      if (payload.email) this.email = payload.email
      this.isAuthenticated = true
    },

    async login(email: string, password: string): Promise<void> {
      const result = await authService.login(email, password)
      localStorage.setItem('access_token', result.token)
      this.setUser({
        id: result.user.id,
        name: result.user.name,
        email: result.user.email,
      })
    },

    logout() {
      this.clear()
    },

    clear() {
      this.id = null
      this.name = null
      this.email = null
      this.isAuthenticated = false
      try {
        localStorage.removeItem('access_token')
        localStorage.removeItem('user_id')
      } catch {}
    },
  },
})
