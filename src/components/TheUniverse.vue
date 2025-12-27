<script setup>
import { TresCanvas } from '@tresjs/core'
import { useRoute } from 'vue-router'
import SpaceScene from './SpaceScene.vue'

const route = useRoute()
</script>

<template>
  <TresCanvas 
    window-size 
    shadows 
    alpha 
    antialias 
    power-preference="high-performance"
    class="block outline-none touch-none pointer-events-auto" 
    style="z-index: 0;"
  >
    <Suspense>
      <SpaceScene 
        :current-view="route.name" 
        :planet-target="route.params.id" 
      />
      <template #fallback></template>
    </Suspense>

  </TresCanvas>
</template>