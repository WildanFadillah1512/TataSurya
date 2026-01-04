<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import * as THREE from 'three'

const router = useRouter()
const canvasRef = ref(null)

// States
const holdProgress = ref(0)
const isHolding = ref(false)
const systemStatus = ref('SYSTEM_IDLE')
let holdInterval

// Three.js
let scene, camera, renderer, stars, animationId

const initThree = () => {
  scene = new THREE.Scene()
  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)
  camera.position.z = 1

  renderer = new THREE.WebGLRenderer({ canvas: canvasRef.value, antialias: true, alpha: true })
  renderer.setSize(window.innerWidth, window.innerHeight)

  // Particles (Starfield Warp)
  const geometry = new THREE.BufferGeometry()
  const vertices = []
  for (let i = 0; i < 2000; i++) {
    vertices.push(Math.random() * 600 - 300, Math.random() * 600 - 300, Math.random() * 600 - 300)
  }
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3))
  const material = new THREE.PointsMaterial({ color: 0xffffff, size: 0.5, transparent: true })
  stars = new THREE.Points(geometry, material)
  scene.add(stars)
}

const animate = () => {
  animationId = requestAnimationFrame(animate)
  
  // Warp Effect: Stars move towards camera
  const positions = stars.geometry.attributes.position.array
  for (let i = 0; i < positions.length; i += 3) {
    positions[i + 2] += isHolding.value ? 5 : 0.2 // Speed up when holding
    if (positions[i + 2] > 200) positions[i + 2] = -300
  }
  stars.geometry.attributes.position.needsUpdate = true
  
  renderer.render(scene, camera)
}

// Interaction Logic
const startHold = () => {
  isHolding.value = true
  systemStatus.value = 'SYNCING_NEURAL_FLOW'
  holdInterval = setInterval(() => {
    if (holdProgress.value < 100) {
      holdProgress.value += 2
    } else {
      completeInitialization()
    }
  }, 20)
}

const stopHold = () => {
  isHolding.value = false
  clearInterval(holdInterval)
  if (holdProgress.value < 100) {
    holdProgress.value = 0
    systemStatus.value = 'SYSTEM_IDLE'
  }
}

const completeInitialization = () => {
  systemStatus.value = 'JUMP_AUTHORIZED'
  clearInterval(holdInterval)
  setTimeout(() => router.push('/selection'), 500)
}

const onResize = () => {
    if (!camera || !renderer) return
    camera.aspect = window.innerWidth / window.innerHeight
    camera.updateProjectionMatrix()
    renderer.setSize(window.innerWidth, window.innerHeight)
}

onMounted(() => {
  initThree()
  animate()
  window.addEventListener('resize', onResize)
})

onUnmounted(() => {
  cancelAnimationFrame(animationId)
  window.removeEventListener('resize', onResize)
  
  if (scene) {
    scene.traverse((object) => {
      if (object.geometry) object.geometry.dispose()
      if (object.material) {
        if (Array.isArray(object.material)) object.material.forEach(m => m.dispose())
        else object.material.dispose()
      }
    })
    scene.clear()
  }
  
  if (renderer) {
    renderer.dispose()
    renderer.forceContextLoss()
  }
})
</script>

<template>
  <div class="h-screen w-full bg-[#000] text-white font-sans overflow-hidden select-none">
    <canvas ref="canvasRef" class="fixed inset-0 z-0 opacity-40"></canvas>

    <div class="relative z-10 h-full flex flex-col justify-between p-6 md:p-12 safe-area-inset">
      
      <div class="flex justify-between items-start">
        <div class="space-y-1">
          <h1 class="text-3xl md:text-5xl font-extrabold tracking-[0.2em] italic">SOLARIS</h1>
          <p class="text-[8px] md:text-[10px] tracking-[0.5em] text-white/40 uppercase">Aperture Science Neural Link</p>
        </div>
        <div class="text-right font-mono text-[8px] md:text-[10px] text-white/30 hidden md:block">
          <div>LATENCY: 4ms</div>
          <div>ENCRYPTION: RSA_4096</div>
        </div>
      </div>

      <div class="flex flex-col items-center justify-center space-y-8">
        <div class="relative w-48 h-48 md:w-64 md:h-64 flex items-center justify-center z-30">
          <div :class="['absolute inset-0 border border-white/10 rounded-full transition-transform duration-700 pointer-events-none', isHolding ? 'scale-150 opacity-0' : 'scale-100']"></div>
          
          <svg class="w-full h-full transform -rotate-90 pointer-events-none" viewBox="0 0 256 256">
            <circle cx="128" cy="128" r="120" stroke="rgba(255,255,255,0.05)" stroke-width="2" fill="none" />
            <circle cx="128" cy="128" r="120" stroke="white" stroke-width="2" fill="none" 
              :stroke-dasharray="754"
              :stroke-dashoffset="754 - (754 * holdProgress) / 100"
              class="transition-all duration-75"
            />
          </svg>

          <button 
            @mousedown="startHold" @mouseup="stopHold" @mouseleave="stopHold"
            @touchstart.prevent="startHold" @touchend.prevent="stopHold"
            class="absolute inset-0 m-auto z-50 w-32 h-32 md:w-40 md:h-40 rounded-full bg-white text-black font-black text-[10px] md:text-xs tracking-widest transition-all active:scale-90 hover:shadow-[0_0_50px_rgba(255,255,255,0.3)] cursor-pointer pointer-events-auto touch-manipulation select-none"
          >
            {{ holdProgress > 0 ? holdProgress + '%' : 'HOLD TO START' }}
          </button>
        </div>
        
        <div class="text-center">
          <p class="text-xs md:text-sm font-light tracking-[0.8em] text-white/60 animate-pulse">{{ systemStatus }}</p>
        </div>
      </div>

      <div class="flex justify-between items-end border-t border-white/5 pt-4 md:pt-8 gap-4">
        <div class="max-w-xs text-[8px] md:text-[9px] leading-relaxed text-white/40 uppercase tracking-widest">
          Authorized personnel only. Interaction with the Solaris core may cause temporary temporal displacement.
        </div>
        <div class="flex gap-4 md:gap-8 min-w-max">
          <div class="group cursor-pointer">
            <div class="text-[8px] md:text-[10px] text-white/20 group-hover:text-white transition-colors">01. Wildan</div>
          </div>
          <div class="group cursor-pointer">
            <div class="text-[8px] md:text-[10px] text-white/20 group-hover:text-white transition-colors">02. Meutya</div>
          </div>
        </div>
      </div>

    </div>

    <div class="fixed inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,transparent_0%,black_90%)]"></div>
  </div>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;900&display=swap');

.font-sans {
  font-family: 'Inter', sans-serif;
}

button {
  -webkit-tap-highlight-color: transparent;
}
</style>