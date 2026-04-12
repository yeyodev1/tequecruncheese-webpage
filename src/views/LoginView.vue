<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'

const router = useRouter()
const userStore = useUserStore()

const email = ref('')
const password = ref('')
const loading = ref(false)
const error = ref('')

async function handleLogin() {
  if (!email.value || !password.value) return
  loading.value = true
  error.value = ''
  try {
    await userStore.login(email.value, password.value)
    router.push('/mis-pedidos')
  } catch (err: unknown) {
    const e = err as { status?: number; message?: string }
    if (e.status === 401 || e.status === 400) {
      error.value = 'Correo o contraseña incorrectos.'
    } else {
      error.value = 'Ocurrió un error. Intenta de nuevo.'
    }
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="login-view">
    <div class="login-view__card">
      <div class="login-view__brand">
        <img
          class="login-view__logo"
          src="https://res.cloudinary.com/dvq6znk71/image/upload/f_auto,q_auto/tequecruncheese/logos/logo-small"
          alt="TequeCruncheese"
        />
        <h1 class="login-view__title">Tequecruncheese</h1>
        <p class="login-view__subtitle">Mi cuenta</p>
      </div>

      <form class="login-view__form" @submit.prevent="handleLogin">
        <div class="login-view__field">
          <label for="login-email">Correo electrónico</label>
          <input
            id="login-email"
            v-model="email"
            type="email"
            autocomplete="email"
            placeholder="tu@correo.com"
            required
          />
        </div>

        <div class="login-view__field">
          <label for="login-pass">Contraseña</label>
          <input
            id="login-pass"
            v-model="password"
            type="password"
            autocomplete="current-password"
            placeholder="••••••••"
            required
          />
        </div>

        <p v-if="error" class="login-view__error">
          <i class="fa-solid fa-triangle-exclamation"></i> {{ error }}
        </p>

        <button type="submit" class="login-view__btn" :disabled="loading">
          <i v-if="loading" class="fa-solid fa-spinner fa-spin"></i>
          <i v-else class="fa-solid fa-right-to-bracket"></i>
          {{ loading ? 'Ingresando...' : 'Iniciar Sesión' }}
        </button>
      </form>

      <div class="login-view__links">
        <router-link to="/recuperar-contrasena" class="login-view__forgot">
          ¿Olvidaste tu contraseña?
        </router-link>
      </div>

      <div class="login-view__default-pass">
        <i class="fa-solid fa-circle-info"></i>
        <span>Tu contraseña por defecto es tu correo electrónico.</span>
      </div>

      <p class="login-view__info">
        ¿No tienes cuenta? Cuando realizas un pedido, te creamos una cuenta automáticamente.
      </p>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.login-view {
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
    max-width: 420px;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  }

  &__brand {
    text-align: center;
    margin-bottom: 2rem;
  }

  &__logo {
    height: 52px;
    width: auto;
    display: block;
    margin: 0 auto 0.25rem;
  }

  &__title {
    font-size: 1.4rem;
    font-weight: 900;
    color: $color-accent;
    margin: 0.25rem 0 0;
  }

  &__subtitle {
    font-size: 0.85rem;
    color: #888;
    margin: 0.25rem 0 0;
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
    width: 100%;

    &:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    &:not(:disabled):hover {
      opacity: 0.88;
    }
  }

  &__links {
    margin-top: 1.25rem;
    text-align: center;
  }

  &__forgot {
    font-size: 0.875rem;
    color: $color-accent;
    text-decoration: none;
    font-weight: 600;

    &:hover {
      text-decoration: underline;
    }
  }

  &__default-pass {
    margin: 1.25rem 0 0;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    background: #fffbeb;
    border: 1px solid #fed47f;
    border-radius: 0.625rem;
    padding: 0.7rem 0.875rem;
    font-size: 0.82rem;
    color: #7a4f00;
    line-height: 1.4;

    i {
      font-size: 0.9rem;
      color: #b45309;
      flex-shrink: 0;
    }
  }

  &__info {
    margin: 1rem 0 0;
    font-size: 0.8rem;
    color: #888;
    text-align: center;
    line-height: 1.5;
    border-top: 1px solid #f0f0f0;
    padding-top: 1.25rem;
  }
}
</style>
