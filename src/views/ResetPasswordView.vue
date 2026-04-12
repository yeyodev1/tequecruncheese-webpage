<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { authService } from '@/services/auth.service'

const router = useRouter()
const route = useRoute()

const password = ref('')
const confirmPassword = ref('')
const loading = ref(false)
const error = ref('')

const token = computed(() => route.query.token as string | undefined)

const passwordsMatch = computed(() =>
  confirmPassword.value === '' || password.value === confirmPassword.value,
)

const canSubmit = computed(
  () => !!token.value && password.value.length >= 6 && passwordsMatch.value && confirmPassword.value !== '',
)

async function handleSubmit() {
  if (!canSubmit.value) return
  loading.value = true
  error.value = ''
  try {
    await authService.resetPassword(token.value!, password.value)
    router.push('/login')
  } catch {
    error.value = 'El enlace es inválido o expiró. Solicita uno nuevo.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="reset-view">
    <div class="reset-view__card">
      <div class="reset-view__brand">
        <span class="reset-view__logo">🧀</span>
        <h1 class="reset-view__title">Nueva contraseña</h1>
        <p class="reset-view__subtitle">Elige una contraseña segura</p>
      </div>

      <div v-if="!token" class="reset-view__invalid">
        <i class="fa-solid fa-link-slash"></i>
        <p>Este enlace no es válido. Solicita un nuevo correo de recuperación.</p>
        <router-link to="/recuperar-contrasena" class="reset-view__btn">
          Solicitar nuevo enlace
        </router-link>
      </div>

      <form v-else class="reset-view__form" @submit.prevent="handleSubmit">
        <div class="reset-view__field">
          <label for="new-pass">Nueva contraseña</label>
          <input
            id="new-pass"
            v-model="password"
            type="password"
            autocomplete="new-password"
            placeholder="Mínimo 6 caracteres"
            minlength="6"
            required
          />
        </div>

        <div class="reset-view__field">
          <label for="confirm-pass">Confirmar contraseña</label>
          <input
            id="confirm-pass"
            v-model="confirmPassword"
            type="password"
            autocomplete="new-password"
            placeholder="Repite la contraseña"
            required
            :class="{ 'reset-view__input--error': confirmPassword && !passwordsMatch }"
          />
          <span v-if="confirmPassword && !passwordsMatch" class="reset-view__field-error">
            Las contraseñas no coinciden.
          </span>
        </div>

        <p v-if="error" class="reset-view__error">
          <i class="fa-solid fa-triangle-exclamation"></i> {{ error }}
        </p>

        <button type="submit" class="reset-view__btn" :disabled="loading || !canSubmit">
          <i v-if="loading" class="fa-solid fa-spinner fa-spin"></i>
          <i v-else class="fa-solid fa-lock"></i>
          {{ loading ? 'Guardando...' : 'Guardar nueva contraseña' }}
        </button>
      </form>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.reset-view {
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
    font-size: 2.5rem;
    display: block;
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

  &__invalid {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
    padding: 1.5rem 0;
    text-align: center;

    i {
      font-size: 2.5rem;
      color: #c53030;
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

  &__input--error {
    border-color: #e53e3e !important;
  }

  &__field-error {
    font-size: 0.75rem;
    color: #e53e3e;
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
    text-decoration: none;

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
