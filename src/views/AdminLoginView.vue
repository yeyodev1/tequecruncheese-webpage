<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { adminService } from '@/services/admin.service'

const router = useRouter()
const email = ref('admin@tequecruncheese.com')
const password = ref('')
const loading = ref(false)
const error = ref('')

async function handleLogin() {
  if (!email.value || !password.value) return
  loading.value = true
  error.value = ''
  try {
    const token = await adminService.login(email.value, password.value)
    localStorage.setItem('admin_token', token)
    router.push('/admin/dashboard')
  } catch {
    error.value = 'Correo o contraseña incorrectos.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="admin-login">
    <div class="admin-login__card">
      <div class="admin-login__brand">
        <span>🧀</span>
        <h1>Tequecruncheese</h1>
        <p>Panel de administración</p>
      </div>

      <form class="admin-login__form" @submit.prevent="handleLogin">
        <div class="admin-login__field">
          <label for="admin-email">Correo</label>
          <input
            id="admin-email"
            v-model="email"
            type="email"
            autocomplete="email"
            placeholder="admin@tequecruncheese.com"
            required
          />
        </div>

        <div class="admin-login__field">
          <label for="admin-pass">Contraseña</label>
          <input
            id="admin-pass"
            v-model="password"
            type="password"
            autocomplete="current-password"
            placeholder="••••••••"
            required
          />
        </div>

        <p v-if="error" class="admin-login__error">
          <i class="fa-solid fa-triangle-exclamation"></i> {{ error }}
        </p>

        <button type="submit" class="admin-login__btn" :disabled="loading">
          <i v-if="loading" class="fa-solid fa-spinner fa-spin"></i>
          <i v-else class="fa-solid fa-right-to-bracket"></i>
          {{ loading ? 'Ingresando...' : 'Ingresar' }}
        </button>
      </form>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.admin-login {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: $color-accent;
  padding: 1rem;

  &__card {
    background: $white;
    border-radius: 1.5rem;
    padding: 2.5rem 2rem;
    width: 100%;
    max-width: 400px;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  }

  &__brand {
    text-align: center;
    margin-bottom: 2rem;

    span { font-size: 2.5rem; }

    h1 {
      font-size: 1.4rem;
      font-weight: 900;
      color: $color-accent;
      margin: 0.25rem 0 0;
    }

    p {
      font-size: 0.85rem;
      color: #888;
      margin: 0.25rem 0 0;
    }
  }

  &__form {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
  }

  &__field {
    display: flex;
    flex-direction: column;
    gap: 0.375rem;

    label {
      font-size: 0.85rem;
      font-weight: 600;
      color: #444;
    }

    input {
      padding: 0.7rem 0.875rem;
      border: 1.5px solid #e0e0e0;
      border-radius: 0.625rem;
      font-size: 0.95rem;
      outline: none;
      transition: border-color 0.15s;

      &:focus {
        border-color: $color-accent;
      }
    }
  }

  &__error {
    margin: 0;
    font-size: 0.85rem;
    color: #c53030;
    display: flex;
    align-items: center;
    gap: 0.375rem;
  }

  &__btn {
    background: $color-accent;
    color: $color-primary;
    border: none;
    border-radius: 0.75rem;
    padding: 0.875rem;
    font-size: 1rem;
    font-weight: 700;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    transition: opacity 0.15s;

    &:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    &:not(:disabled):hover {
      opacity: 0.88;
    }
  }
}
</style>
