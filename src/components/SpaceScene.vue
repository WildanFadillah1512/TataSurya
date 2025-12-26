<script setup>
import { shallowRef, watch, toRefs, onBeforeUpdate, defineProps } from 'vue'
import { useLoop } from '@tresjs/core'
import { Stars, OrbitControls } from '@tresjs/cientos'
import { useSpaceStore } from '../stores/spaceStore' // Pastikan path benar
import gsap from 'gsap'

const store = useSpaceStore()

// 1. Props Definition
const props = defineProps({
  currentView: { type: String, default: 'home' },
  // planetTarget dapat berupa nama planet (string) atau id dari route (number)
  planetTarget: { type: [String, Number], default: null }
})

const { currentView, planetTarget } = toRefs(props)

// 2. Refs Setup
const cameraRef = shallowRef()
const controlsRef = shallowRef()
const planetRefs = shallowRef([])

// Reset refs sebelum update (Best Practice Vue 3 untuk v-for ref array)
onBeforeUpdate(() => {
  planetRefs.value = []
})

// 3. Move Camera Logic
const moveCamera = () => {
  if (!cameraRef.value || !controlsRef.value) return 

  // --- VIEW: HOME ---
  if (currentView.value === 'home') {
    // Reset Target ke Tengah (Matahari)
    gsap.to(controlsRef.value.target, { x: 0, y: 0, z: 0, duration: 2 })
    gsap.to(cameraRef.value.position, { x: 0, y: 200, z: 300, duration: 2.5, ease: "power2.inOut" })
  } 
  
  // --- VIEW: EXPLORE ---
  else if (currentView.value === 'explore') {
    store.setFocus(null) // Reset state di store
    // Reset Target ke Tengah
    gsap.to(controlsRef.value.target, { x: 0, y: 0, z: 0, duration: 2 })
    gsap.to(cameraRef.value.position, { x: 0, y: 40, z: 140, duration: 2, ease: "power2.inOut" })
  } 
  
  // --- VIEW: PLANET DETAIL ---
  else if (currentView.value === 'planet-detail' && planetTarget.value != null) {
    // planetTarget bisa berupa id (dari route.params.id) atau nama planet
    let pIndex = -1
    const tgt = planetTarget.value
    const id = parseInt(tgt)

    if (!Number.isNaN(id)) {
      // Jika id numeric: solarData id 1 = Mercury -> store.planets index 0 (id - 1)
      pIndex = id > 0 ? id - 1 : -1
    } else {
      pIndex = store.planets.findIndex(p => p.name.toLowerCase() === String(tgt).toLowerCase())
    }

    // Safety check: Pastikan planet ketemu
    if (pIndex !== -1 && planetRefs.value[pIndex]) {
      const targetObj = planetRefs.value[pIndex]
      const planetName = store.planets[pIndex].name
      store.setFocus(planetName)

      // Animasi Kamera mendekat ke Planet
      gsap.to(cameraRef.value.position, {
        x: targetObj.position.x + ((targetObj.geometry && targetObj.geometry.parameters && targetObj.geometry.parameters.radius) ? targetObj.geometry.parameters.radius * 4 : 10),
        y: targetObj.position.y + 2,
        z: targetObj.position.z + ((targetObj.geometry && targetObj.geometry.parameters && targetObj.geometry.parameters.radius) ? targetObj.geometry.parameters.radius * 4 : 10),
        duration: 2,
        ease: "power3.out",
        onUpdate: () => {
          // KUNCI: Update target controls SETIAP FRAME animasi agar tidak "stutter"
          controlsRef.value.target.set(targetObj.position.x, targetObj.position.y, targetObj.position.z)
        }
      })
    }
  }
}

// 4. Watcher
// Gunakan flush: 'post' agar watcher jalan SETELAH DOM/Tres update (mengurangi butuh setTimeout)
watch([currentView, planetTarget], () => {
  moveCamera()
}, { flush: 'post' })

// 5. Render Loop (Rotasi Planet)
const { onBeforeRender } = useLoop()

onBeforeRender(({ elapsed }) => {
  // Loop rotasi planet
  store.planets.forEach((data, index) => {
    const obj = planetRefs.value[index]
    if (!obj) return

    // Jika sedang melihat detail planet INI, stop rotasi (Freeze logic)
    // Supaya kamera tidak pusing mengejar planet yang lari
    if (store.viewState === 'detail' && store.targetPlanet === data.name) {
       return 
    }

    // Rumus Orbit sederhana
    obj.position.x = Math.cos(elapsed * 0.5 + index) * data.dist
    obj.position.z = Math.sin(elapsed * 0.5 + index) * data.dist
    
    // Opsional: Rotasi planet pada porosnya sendiri
    obj.rotation.y += 0.01
  })
})
</script>

<template>
  <TresPerspectiveCamera ref="cameraRef" :position="[0, 200, 300]" :fov="45" />
  
  <OrbitControls 
    ref="controlsRef" 
    :enable-pan="false"
    :enable-zoom="currentView !== 'home'" 
    :max-distance="500"
    :min-distance="10"
  />

  <TresAmbientLight :intensity="0.5" /> <TresPointLight :position="[0, 0, 0]" :intensity="2" color="#ffaa00" /> <TresMesh :position="[0,0,0]">
    <TresSphereGeometry :args="[6, 32, 32]" />
    <TresMeshBasicMaterial color="#FFD700" />
  </TresMesh>

  <TresGroup>
    <TresMesh 
      v-for="(p, i) in store.planets" 
      :key="p.name"
      :ref="(el) => planetRefs[i] = el"
    >
      <TresSphereGeometry :args="[p.scale, 32, 32]" />
      <TresMeshStandardMaterial :color="p.color" :roughness="0.7" />
    </TresMesh>
  </TresGroup>

  <Stars />
</template>