<!-- src/components/ParticleField.vue -->
<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import * as THREE from 'three'

const props = defineProps({
  count: {
    type: Number,
    default: 200
  },
  interactive: {
    type: Boolean,
    default: true
  }
})

const containerRef = ref(null)

let scene, camera, renderer, particles
let mouse = { x: 9999,  y: 9999 }
let animationId

const init = () => {
  if (!containerRef.value) return

  const w = containerRef.value.clientWidth || window.innerWidth
  const h = containerRef.value.clientHeight || window.innerHeight

  // Scene
  scene = new THREE.Scene()

  // Camera
  camera = new THREE.PerspectiveCamera(60, w / h, 0.1, 1000)
  camera.position.z = 500

  // Renderer
  renderer = new THREE.WebGLRenderer({ 
    alpha: true, 
    antialias: false,
    powerPreference: 'high-performance'
  })
  renderer.setSize(w, h)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5))
  containerRef.value.appendChild(renderer.domElement)

  // Particles
  const geometry = new THREE.BufferGeometry()
  const positions = new Float32Array(props.count * 3)
  const velocities = new Float32Array(props.count * 3)

  for (let i = 0; i < props.count * 3; i += 3) {
    positions[i] = (Math.random() - 0.5) * 1000
    positions[i + 1] = (Math.random() - 0.5) * 1000
    positions[i + 2] = (Math.random() - 0.5) * 500
    
    velocities[i] = (Math.random() - 0.5) * 0.2
    velocities[i + 1] = (Math.random() - 0.5) * 0.2
    velocities[i + 2] = (Math.random() - 0.5) * 0.1
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geometry.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3))

  const material = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 2,
    transparent: true,
    opacity: 0.6,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  })

  particles = new THREE.Points(geometry, material)
  scene.add(particles)

  // Event listeners
  if (props.interactive) {
    window.addEventListener('mousemove', onMouseMove)
  }
  window.addEventListener('resize', onResize)

  animate()
}

const animate = () => {
  animationId = requestAnimationFrame(animate)

  const positions = particles.geometry.attributes.position.array
  const velocities = particles.geometry.attributes.velocity.array

  for (let i = 0; i < positions.length; i += 3) {
    // Drift movement
    positions[i] += velocities[i]
    positions[i + 1] += velocities[i + 1]
    positions[i + 2] += velocities[i + 2]

    // Interactive repulsion
    if (props.interactive) {
      const dx = positions[i] - mouse.x
      const dy = positions[i + 1] - mouse.y
      const dist = Math.sqrt(dx * dx + dy * dy)
      
      if (dist < 150) {
        const force = (150 - dist) / 150
        positions[i] += (dx / dist) * force * 5
        positions[i + 1] += (dy / dist) * force * 5
      }
    }

    // Boundaries
    if (positions[i] < -500) positions[i] = 500
    if (positions[i] > 500) positions[i] = -500
    if (positions[i + 1] < -500) positions[i + 1] = 500
    if (positions[i + 1] > 500) positions[i + 1] = -500
  }

  particles.geometry.attributes.position.needsUpdate = true
  particles.rotation.y += 0.0002

  renderer.render(scene, camera)
}

const onMouseMove = (e) => {
  const bounds = containerRef.value.getBoundingClientRect()
  mouse.x = ((e.clientX - bounds.left) / bounds.width) * 1000 - 500
  mouse.y = -((e.clientY - bounds.top) / bounds.height) * 1000 + 500
}

const onResize = () => {
  if (!containerRef.value) return
  const w = containerRef.value.clientWidth || window.innerWidth
  const h = containerRef.value.clientHeight || window.innerHeight
  
  camera.aspect = w / h
  camera.updateProjectionMatrix()
  renderer.setSize(w, h)
}

onMounted(() => {
  init()
})

onUnmounted(() => {
  if (animationId) cancelAnimationFrame(animationId)
  if (props.interactive) window.removeEventListener('mousemove', onMouseMove)
  window.removeEventListener('resize', onResize)
  
  if (renderer) {
    renderer.dispose()
    renderer.domElement.remove()
  }
  if (particles) {
    particles.geometry.dispose()
    particles.material.dispose()
  }
})
</script>

<template>
  <div ref="containerRef" class="particle-field"></div>
</template>

<style scoped>
.particle-field {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 0;
}
</style>
