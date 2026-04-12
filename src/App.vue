<script setup lang="ts">
import AppLoader from '@/components/AppLoader.vue'
import CartDrawer from '@/components/tienda/CartDrawer.vue'
import ConfirmModal from '@/components/ConfirmModal.vue'
import gsap from 'gsap'

function onEnter(el: Element, done: () => void) {
  gsap.fromTo(
    el,
    { opacity: 0, y: 28, filter: 'blur(8px)' },
    { opacity: 1, y: 0, filter: 'blur(0px)', duration: 0.48, ease: 'power3.out', onComplete: done },
  )
}

function onLeave(el: Element, done: () => void) {
  gsap.to(el, {
    opacity: 0,
    y: -18,
    filter: 'blur(6px)',
    duration: 0.28,
    ease: 'power2.in',
    onComplete: done,
  })
}
</script>

<template>
  <AppLoader />
  <CartDrawer />
  <ConfirmModal />
  <div class="app-container">
    <RouterView v-slot="{ Component, route }">
      <Transition :css="false" mode="out-in" @enter="onEnter" @leave="onLeave">
        <component :is="Component" :key="route.fullPath" />
      </Transition>
    </RouterView>
  </div>
</template>

<style lang="scss">
.app-container {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}
</style>
