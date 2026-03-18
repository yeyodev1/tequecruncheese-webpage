<script setup lang="ts">
import AppLoader from '@/components/AppLoader.vue'
</script>

<template>
  <AppLoader />
  <div class="app-container">
    <RouterView />
  </div>
</template>

<style lang="scss">
.app-container {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}
</style>
