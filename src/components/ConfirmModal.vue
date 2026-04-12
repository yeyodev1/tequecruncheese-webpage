<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import { useModalStore } from '@/stores/modal'

const modal = useModalStore()

function onKeyDown(e: KeyboardEvent) {
  if (e.key === 'Escape') modal.dismiss()
}

onMounted(() => document.addEventListener('keydown', onKeyDown))
onUnmounted(() => document.removeEventListener('keydown', onKeyDown))

const VARIANT_ICON: Record<string, string> = {
  danger:  'fa-triangle-exclamation',
  warning: 'fa-circle-exclamation',
  info:    'fa-circle-info',
}
</script>

<template>
  <Teleport to="body">
    <!-- Backdrop -->
    <Transition name="cm-backdrop">
      <div
        v-if="modal.isOpen"
        class="cm-backdrop"
        aria-hidden="true"
        @click="modal.dismiss"
      ></div>
    </Transition>

    <!-- Panel -->
    <Transition name="cm-panel">
      <div
        v-if="modal.isOpen"
        class="cm-panel"
        role="alertdialog"
        aria-modal="true"
        :aria-labelledby="'cm-title'"
      >
        <!-- Icon -->
        <div :class="['cm-icon', `cm-icon--${modal.options.variant || 'danger'}`]">
          <i :class="`fa-solid ${VARIANT_ICON[modal.options.variant || 'danger']}`"></i>
        </div>

        <!-- Text -->
        <div class="cm-body">
          <h2 id="cm-title" class="cm-title">{{ modal.options.title }}</h2>
          <p v-if="modal.options.message" class="cm-message">{{ modal.options.message }}</p>
        </div>

        <!-- Actions -->
        <div class="cm-actions">
          <button class="cm-btn cm-btn--cancel" @click="modal.dismiss">
            {{ modal.options.cancelText || 'Cancelar' }}
          </button>
          <button
            :class="['cm-btn', `cm-btn--${modal.options.variant || 'danger'}`]"
            @click="modal.accept"
          >
            {{ modal.options.confirmText || 'Confirmar' }}
          </button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style lang="scss" scoped>
.cm-backdrop {
  position: fixed;
  inset: 0;
  z-index: 1000;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(3px);
  -webkit-backdrop-filter: blur(3px);
}

.cm-panel {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 1001;
  width: calc(100% - 2rem);
  max-width: 400px;
  background: $white;
  border-radius: 1.5rem;
  padding: 2rem 1.75rem 1.75rem;
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.2);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.125rem;
  text-align: center;
}

.cm-icon {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;

  i { font-size: 1.5rem; }

  &--danger {
    background: #fff5f5;
    i { color: #e53e3e; }
  }

  &--warning {
    background: #fffbeb;
    i { color: #d97706; }
  }

  &--info {
    background: #ebf8ff;
    i { color: #2b6cb0; }
  }
}

.cm-body {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.cm-title {
  font-size: 1.05rem;
  font-weight: 800;
  color: $color-accent;
  margin: 0;
  letter-spacing: -0.01em;
}

.cm-message {
  font-size: 0.875rem;
  color: #777;
  margin: 0;
  line-height: 1.5;
}

.cm-actions {
  display: flex;
  gap: 0.625rem;
  width: 100%;
  margin-top: 0.25rem;
}

.cm-btn {
  flex: 1;
  padding: 0.75rem 1rem;
  border-radius: 0.875rem;
  font-size: 0.9rem;
  font-weight: 700;
  cursor: pointer;
  border: none;
  transition: opacity 0.15s, transform 0.15s;

  &:hover { opacity: 0.88; transform: translateY(-1px); }
  &:active { transform: translateY(0); }

  &--cancel {
    background: #f5f5f5;
    color: #666;
  }

  &--danger {
    background: #e53e3e;
    color: $white;
  }

  &--warning {
    background: #d97706;
    color: $white;
  }

  &--info {
    background: $color-accent;
    color: $color-primary;
  }
}

// ── Transitions ─────────────────────────────────────────────────
.cm-backdrop-enter-active,
.cm-backdrop-leave-active {
  transition: opacity 0.25s ease;
}
.cm-backdrop-enter-from,
.cm-backdrop-leave-to {
  opacity: 0;
}

.cm-panel-enter-active {
  transition: opacity 0.25s ease, transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.cm-panel-leave-active {
  transition: opacity 0.18s ease, transform 0.18s ease;
}
.cm-panel-enter-from,
.cm-panel-leave-to {
  opacity: 0;
  transform: translate(-50%, -50%) scale(0.88);
}
</style>
