<script setup lang="ts">
import { ref } from 'vue'
import { authService } from '@/services/auth.service'

const email = ref('')
const loading = ref(false)
const success = ref(false)
const error = ref('')

async function handleSubmit() {
  if (!email.value) return
  loading.value = true
  error.value = ''
  try {
    await authService.forgotPassword(email.value)
    success.value = true
  } catch (err: unknown) {
    const e = err as { status?: number }
    if (e.status === 429) {
      error.value = 'Ya enviamos un correo. Espera 5 minutos antes de intentar de nuevo.'
    } else {
      error.value = 'Ocurrió un error. Verifica tu correo e intenta de nuevo.'
    }
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="recuperar-view">
    <div class="recuperar-view__card">
      <div class="recuperar-view__brand">
        <img
          class="recuperar-view__logo"
          src="https://res.cloudinary.com/dvq6znk71/image/upload/f_auto,q_auto/tequecruncheese/logos/logo-small"
          alt="TequeCruncheese"
        />
        <h1 class="recuperar-view__title">Recuperar contraseña</h1>
        <p class="recuperar-view__subtitle">Te enviamos un enlace a tu correo</p>
      </div>

      <div v-if="success" class="recuperar-view__success">
        <i class="fa-solid fa-circle-check"></i>
        <p>Revisa tu correo. Te enviamos un enlace para restablecer tu contraseña.</p>
      </div>

      <form v-else class="recuperar-view__form" @submit.prevent="handleSubmit">
        <div class="recuperar-view__field">
          <label for="recover-email">Correo electrónico</label>
          <input
            id="recover-email"
            v-model="email"
            type="email"
            autocomplete="email"
            placeholder="tu@correo.com"
            required
          />
        </div>

        <p v-if="error" class="recuperar-view__error">
          <i class="fa-solid fa-triangle-exclamation"></i> {{ error }}
        </p>

        <button type="submit" class="recuperar-view__btn" :disabled="loading">
          <i v-if="loading" class="fa-solid fa-spinner fa-spin"></i>
          <i v-else class="fa-solid fa-paper-plane"></i>
          {{ loading ? 'Enviando...' : 'Enviar correo de recuperación' }}
        </button>
      </form>

      <div class="recuperar-view__back">
        <router-link to="/login">
          <i class="fa-solid fa-arrow-left"></i> Volver al inicio de sesión
        </router-link>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.recuperar-view {
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

  &__success {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
    padding: 1.5rem 0;
    text-align: center;

    i {
      font-size: 3rem;
      color: #38a169;
    }

    p {
      margin: 0;
      font-size: 0.95rem;
      color: #444;
      line-height: 1.6;
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
    width: 100%;

    &:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    &:not(:disabled):hover {
      opacity: 0.88;
    }
  }

  &__back {
    margin-top: 1.5rem;
    text-align: center;

    a {
      font-size: 0.875rem;
      color: $color-accent;
      text-decoration: none;
      font-weight: 600;
      display: inline-flex;
      align-items: center;
      gap: 0.375rem;

      &:hover {
        text-decoration: underline;
      }
    }
  }
}
</style>
