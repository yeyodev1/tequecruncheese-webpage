<script setup lang="ts">
import TheHeader from '@/components/home/TheHeader.vue'
import TheHero from '@/components/home/TheHero.vue'
import ProductShowcase from '@/components/home/ProductShowcase.vue'
import OurFlavors from '@/components/home/OurFlavors.vue'
import PartyCombos from '@/components/home/PartyCombos.vue'
import TakeHome from '@/components/home/TakeHome.vue'
import TheFooter from '@/components/home/TheFooter.vue'
</script>

<template>
  <main class="home-view">
    <TheHeader />
    <TheHero />
    <ProductShowcase />
    <OurFlavors />
    <PartyCombos />
    <TakeHome />
    <TheFooter />
  </main>
</template>

<style lang="scss" scoped>
.home-view {
  width: 100%;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}
</style>
