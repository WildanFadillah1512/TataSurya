<script setup>
import TheUniverse from './components/TheUniverse.vue'
</script>

<template>
  <div class="relative w-full h-screen bg-black overflow-hidden font-mono">
    
    <div class="absolute inset-0 z-0">
      <TheUniverse />
    </div>

    <div class="absolute inset-0 z-20 pointer-events-none flex flex-col">
      <router-view v-slot="{ Component }">
        <Transition name="fade" mode="out-in">
          <component :is="Component" />
        </Transition>
      </router-view>
    </div>

  </div>
</template>

<style>
/* CSS Global */
html, body, #app {
  width: 100%;
  height: 100%;
  margin: 0;
  padding: 0;
  background-color: black;
  overflow: hidden;
}
.fade-enter-active, .fade-leave-active { transition: opacity 0.5s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>