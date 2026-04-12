import { defineStore } from 'pinia'
import { authService } from '@/services/auth.service'

export interface UserState {
  id: string | null
  name: string | null
  email: string | null
  role: string | null
  isAuthenticated: boolean
}

export const useUserStore = defineStore('user', {
  state: (): UserState => ({
    id: null,
    name: null,
    email: null,
    role: null,
    isAuthenticated: false,
  }),

  getters: {
    isLoggedIn: (state): boolean => {
      // Combine reactive state with localStorage so the getter stays reactive
      return state.isAuthenticated || !!localStorage.getItem('access_token')
    },
  },

  actions: {
    hydrate() {
      const token = localStorage.getItem('access_token')
      const id = localStorage.getItem('user_id')
      const name = localStorage.getItem('user_name')
      const email = localStorage.getItem('user_email')
      const role = localStorage.getItem('user_role')

      this.isAuthenticated = !!token
      this.id = id || null
      this.name = name || null
      this.email = email || null
      this.role = role || null
    },

    setUser(payload: { id?: string; name?: string; email?: string; role?: string }) {
      if (payload.id !== undefined) {
        this.id = payload.id
        try { localStorage.setItem('user_id', payload.id) } catch {}
      }
      if (payload.name) {
        this.name = payload.name
        try { localStorage.setItem('user_name', payload.name) } catch {}
      }
      if (payload.email) {
        this.email = payload.email
        try { localStorage.setItem('user_email', payload.email) } catch {}
      }
      if (payload.role) {
        this.role = payload.role
        try { localStorage.setItem('user_role', payload.role) } catch {}
      }
      this.isAuthenticated = true
    },

    async login(email: string, password: string): Promise<void> {
      const result = await authService.login(email, password)
      localStorage.setItem('access_token', result.token)
      this.setUser({
        id: result.user.id,
        name: result.user.name,
        email: result.user.email,
        role: result.user.role,
      })
    },

    logout() {
      this.clear()
    },

    clear() {
      this.id = null
      this.name = null
      this.email = null
      this.role = null
      this.isAuthenticated = false
      try {
        localStorage.removeItem('access_token')
        localStorage.removeItem('user_id')
        localStorage.removeItem('user_name')
        localStorage.removeItem('user_email')
        localStorage.removeItem('user_role')
      } catch {}
    },
  },
})
