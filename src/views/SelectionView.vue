<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import * as THREE from 'three'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import gsap from 'gsap'

const router = useRouter()
const containerRef = ref(null)

// --- DATA ---
const sections = [
  { 
    id: 0, path: '/explore', label: 'EXPLORE', desc: 'JELAJAHI ALAM SEMESTA', 
    color: '#00ffff', accent: '#0088ff', shape: 'sphere' 
  },
  { 
    id: 1, path: '/events', label: 'ARCHIVE', desc: 'PERPUSTAKAAN SEJARAH', 
    color: '#ffaa00', accent: '#ff4400', shape: 'box' 
  },
  { 
    id: 2, path: '/game', label: 'SIMULASI', desc: 'PELATIHAN INTERAKTIF', 
    color: '#ff00ff', accent: '#aa00ff', shape: 'torus' 
  }
]

const activeIndex = ref(0)
const isTransitioning = ref(false)
const loadingProgress = ref(0)
const mouse = ref({ x: 9999, y: 9999 }) 

// --- THREE.JS VARIABLES ---
let scene, camera, renderer, composer
let particles, particleGeo
let targetPositions, currentPositions
let shapes = []
let raycaster, interactionPlane

// DETEKSI MOBILE
const isMobile = window.innerWidth < 768
const PARTICLE_COUNT = isMobile ? 6000 : 15000 

let clock = new THREE.Clock()
let animationId

// --- UTILS: SHAPE GENERATOR ---
const generateShape = (type) => {
  const output = new Float32Array(PARTICLE_COUNT * 3)
  const baseScale = isMobile ? 0.8 : 1.0 

  if (type === 'box') {
    const size = 16 * baseScale
    for(let i=0; i<PARTICLE_COUNT; i++) {
      const i3 = i * 3
      output[i3] = (Math.random() - 0.5) * size
      output[i3+1] = (Math.random() - 0.5) * size
      output[i3+2] = (Math.random() - 0.5) * size
    }
  } 
  else if (type === 'sphere') {
    const radius = 10 * baseScale
    for(let i=0; i<PARTICLE_COUNT; i++) {
      const i3 = i * 3
      const u = Math.random()
      const v = Math.random()
      const theta = 2 * Math.PI * u
      const phi = Math.acos(2 * v - 1)
      const r = radius * Math.cbrt(Math.random()) 
      output[i3] = r * Math.sin(phi) * Math.cos(theta)
      output[i3+1] = r * Math.sin(phi) * Math.sin(theta)
      output[i3+2] = r * Math.cos(phi)
    }
  } 
  else if (type === 'torus') {
    const R = 8 * baseScale
    const r = 2.5 * baseScale
    for(let i=0; i<PARTICLE_COUNT; i++) {
      const i3 = i * 3
      const u = Math.random() * Math.PI * 2
      const v = Math.random() * Math.PI * 2
      const distanceInsideTube = r * Math.sqrt(Math.random())
      output[i3] = (R + distanceInsideTube * Math.cos(v)) * Math.cos(u)
      output[i3+1] = (R + distanceInsideTube * Math.cos(v)) * Math.sin(u)
      output[i3+2] = distanceInsideTube * Math.sin(v)
    }
  }
  return output
}

// --- INIT SCENE ---
const init = () => {
  const w = window.innerWidth
  const h = window.innerHeight

  scene = new THREE.Scene()
  scene.background = new THREE.Color('#050505')
  scene.fog = new THREE.FogExp2('#050505', 0.02)

  camera = new THREE.PerspectiveCamera(50, w/h, 0.1, 100)
  
  const zPos = isMobile ? 45 : 32
  camera.position.z = zPos

  renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' })
  renderer.setSize(w, h)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  containerRef.value.appendChild(renderer.domElement)

  raycaster = new THREE.Raycaster()
  const planeGeo = new THREE.PlaneGeometry(100, 100)
  const planeMat = new THREE.MeshBasicMaterial({ visible: false })
  interactionPlane = new THREE.Mesh(planeGeo, planeMat)
  scene.add(interactionPlane)

  shapes = [ generateShape('sphere'), generateShape('box'), generateShape('torus') ]
  targetPositions = new Float32Array(shapes[0])
  currentPositions = new Float32Array(shapes[0])

  particleGeo = new THREE.BufferGeometry()
  particleGeo.setAttribute('position', new THREE.BufferAttribute(currentPositions, 3))
  
  const colors = new Float32Array(PARTICLE_COUNT * 3)
  for(let i=0; i<PARTICLE_COUNT*3; i++) colors[i] = 1
  particleGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3))

  const material = new THREE.PointsMaterial({
    size: isMobile ? 0.2 : 0.12, 
    vertexColors: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    transparent: true,
    opacity: 0.9,
    sizeAttenuation: true
  })

  particles = new THREE.Points(particleGeo, material)
  scene.add(particles)

  const renderPass = new RenderPass(scene, camera)
  const bloomPass = new UnrealBloomPass(new THREE.Vector2(w, h), 1.5, 0.4, 0.85)
  bloomPass.strength = isMobile ? 0.8 : 1.2 
  bloomPass.radius = 0.4
  bloomPass.threshold = 0
  
  composer = new EffectComposer(renderer)
  composer.addPass(renderPass)
  composer.addPass(bloomPass)

  window.addEventListener('resize', onResize)
  window.addEventListener('mousemove', onMouseMove)
  window.addEventListener('touchmove', onTouchMove, { passive: false })
  window.addEventListener('touchstart', onTouchMove, { passive: false })
  
  animate()
  gsap.from(camera.position, { z: 80, duration: 2.5, ease: "expo.out" })
}

// --- ANIMATION LOOP ---
const animate = () => {
  animationId = requestAnimationFrame(animate)
  const time = clock.getElapsedTime()
  
  const pos = particleGeo.attributes.position.array
  const col = particleGeo.attributes.color.array
  const activeColor = new THREE.Color(sections[activeIndex.value].color)
  const accentColor = new THREE.Color(sections[activeIndex.value].accent)

  particles.rotation.y = time * 0.1
  particles.rotation.z = time * 0.05

  raycaster.setFromCamera(mouse.value, camera)
  const intersects = raycaster.intersectObject(interactionPlane)
  
  let mousePoint = new THREE.Vector3(9999, 9999, 9999)
  if(intersects.length > 0) {
    mousePoint = intersects[0].point
    mousePoint.applyAxisAngle(new THREE.Vector3(0,0,1), -particles.rotation.z)
    mousePoint.applyAxisAngle(new THREE.Vector3(0,1,0), -particles.rotation.y)
  }

  for(let i=0; i<PARTICLE_COUNT; i++) {
    const i3 = i * 3
    let tx = targetPositions[i3]
    let ty = targetPositions[i3+1]
    let tz = targetPositions[i3+2]

    const dx = tx - mousePoint.x
    const dy = ty - mousePoint.y
    const dz = tz - mousePoint.z
    const dist = Math.sqrt(dx*dx + dy*dy + dz*dz)
    
    const repulsionRadius = 4 
    if(dist < repulsionRadius) {
      const force = (repulsionRadius - dist) / repulsionRadius 
      const strength = 8 
      tx += (dx / dist) * force * strength
      ty += (dy / dist) * force * strength
      tz += (dz / dist) * force * strength
    }

    const lerpSpeed = isMobile ? 0.1 : 0.06 
    pos[i3] += (tx - pos[i3]) * lerpSpeed
    pos[i3+1] += (ty - pos[i3+1]) * lerpSpeed
    pos[i3+2] += (tz - pos[i3+2]) * lerpSpeed

    const drift = 0.03
    pos[i3] += Math.sin(time * 0.5 + pos[i3+1]) * drift
    pos[i3+1] += Math.cos(time * 0.3 + pos[i3]) * drift

    const normalizeY = (pos[i3+1] + 8) / 16 
    const mix = Math.max(0, Math.min(1, normalizeY))
    
    col[i3] += (THREE.MathUtils.lerp(activeColor.r, accentColor.r, mix) - col[i3]) * 0.05
    col[i3+1] += (THREE.MathUtils.lerp(activeColor.g, accentColor.g, mix) - col[i3+1]) * 0.05
    col[i3+2] += (THREE.MathUtils.lerp(activeColor.b, accentColor.b, mix) - col[i3+2]) * 0.05
  }

  particleGeo.attributes.position.needsUpdate = true
  particleGeo.attributes.color.needsUpdate = true

  const parallaxAmp = isMobile ? 0.5 : 1
  camera.position.x += (mouse.value.x * parallaxAmp - camera.position.x) * 0.05
  camera.position.y += (mouse.value.y * parallaxAmp - camera.position.y) * 0.05
  camera.lookAt(0, 0, 0)

  composer.render()
}

// --- LOGIC INTERAKSI ---
const nextSection = () => {
  if(isTransitioning.value) return
  activeIndex.value = (activeIndex.value + 1) % sections.length
  updateShape()
}
const prevSection = () => {
  if(isTransitioning.value) return
  activeIndex.value = (activeIndex.value - 1 + sections.length) % sections.length
  updateShape()
}
const updateShape = () => {
  const newShape = shapes[activeIndex.value]
  for(let i=0; i<PARTICLE_COUNT*3; i++) targetPositions[i] = newShape[i]
  
  const baseZ = isMobile ? 45 : 32
  gsap.fromTo(camera.position, { z: baseZ - 4 }, { z: baseZ, duration: 0.5, ease: "back.out(1.5)" })
}

// --- HOLD LOGIC ---
let holdInterval
const startHold = () => {
  holdInterval = setInterval(() => {
    loadingProgress.value += 3
    const pos = particleGeo.attributes.position.array
    for(let i=0; i<PARTICLE_COUNT; i+=20) { 
       const i3 = i*3
       pos[i3] += (Math.random()-0.5) 
       pos[i3+1] += (Math.random()-0.5) 
    }
    particleGeo.attributes.position.needsUpdate = true
    if (loadingProgress.value >= 100) {
      clearInterval(holdInterval)
      enterPortal()
    }
  }, 20)
}
const stopHold = () => {
  clearInterval(holdInterval)
  loadingProgress.value = 0
}
const enterPortal = () => {
  isTransitioning.value = true
  for(let i=0; i<PARTICLE_COUNT*3; i+=3) {
    targetPositions[i] *= 5 
    targetPositions[i+1] *= 5 
    targetPositions[i+2] -= 100 
  }
  gsap.to(camera.position, { z: -10, duration: 0.8, ease: "power2.in" })
  gsap.to('.ui-layer', { opacity: 0, scale: 1.1, duration: 0.5 })
  setTimeout(() => router.push(sections[activeIndex.value].path), 1000)
}

const onMouseMove = (e) => {
  mouse.value.x = (e.clientX / window.innerWidth) * 2 - 1
  mouse.value.y = -(e.clientY / window.innerHeight) * 2 + 1
}

const onTouchMove = (e) => {
  if(e.touches.length > 0) {
    const t = e.touches[0]
    mouse.value.x = (t.clientX / window.innerWidth) * 2 - 1
    mouse.value.y = -(t.clientY / window.innerHeight) * 2 + 1
  }
}

const onResize = () => {
  if(!containerRef.value) return
  const w = window.innerWidth
  const h = window.innerHeight
  camera.aspect = w/h
  camera.updateProjectionMatrix()
  
  const isNowMobile = w < 768
  camera.position.z = isNowMobile ? 45 : 32

  renderer.setSize(w, h)
  composer.setSize(w, h)
}

onMounted(init)
onUnmounted(() => {
  cancelAnimationFrame(animationId)
  window.removeEventListener('resize', onResize)
  window.removeEventListener('mousemove', onMouseMove)
  window.removeEventListener('touchmove', onTouchMove)
  window.removeEventListener('touchstart', onTouchMove)
  if(renderer) renderer.dispose()
})

const current = computed(() => sections[activeIndex.value])
</script>

<template>
  <div class="relative w-full h-full bg-black font-sans overflow-hidden select-none touch-manipulation">
    
    <div ref="containerRef" class="absolute inset-0 z-0"></div>
    
    <div class="ui-layer absolute inset-0 z-50 flex flex-col justify-between p-4 md:p-6 pointer-events-none transition-all duration-500">
      
      <div class="flex justify-between items-start">
        <div class="flex flex-col gap-1">
          <div class="flex items-center gap-2">
            <div class="w-2 h-2 md:w-3 md:h-3 rounded-full animate-pulse shadow-[0_0_10px_currentColor]" :style="{ color: current.color, backgroundColor: current.color }"></div>
            <span class="text-[10px] md:text-xs font-bold tracking-[0.2em] md:tracking-[0.3em] text-white/70">EDU.CORE</span>
          </div>
          <div class="text-[8px] md:text-[10px] text-gray-500">ID: 001 // ONLINE</div>
        </div>
        
        <div class="flex gap-2 pointer-events-auto">
          <div v-for="(s, i) in sections" :key="i"
               @click="activeIndex = i; updateShape()"
               class="h-1 w-6 md:w-8 rounded-full transition-all duration-300 cursor-pointer hover:w-10 md:hover:w-12"
               :class="activeIndex === i ? 'bg-white shadow-[0_0_15px_white]' : 'bg-white/20 hover:bg-white/40'">
          </div>
        </div>
      </div>

      <div class="absolute inset-0 pointer-events-none flex justify-center items-center px-4">
        
        <div class="flex flex-row items-center justify-center gap-8 md:gap-32 w-full max-w-7xl transition-all duration-300">

            <button @click="prevSection" class="pointer-events-auto hidden md:flex shrink-0 z-20 w-12 h-12 md:w-16 md:h-16 items-center justify-center rounded-full border border-white/10 hover:border-white hover:bg-white/10 transition-all group backdrop-blur-md">
               <svg class="w-5 h-5 md:w-6 md:h-6 text-white group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path></svg>
            </button>
    
            <div class="text-center relative z-10 flex flex-col items-center justify-center">
              
              <h1 class="text-[35vw] md:text-[25vw] font-black text-white/5 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none select-none">
                0{{ activeIndex + 1 }}
              </h1>
              
              <div class="relative backdrop-blur-sm p-4 md:py-10 md:px-20 rounded-2xl md:rounded-3xl border border-white/10 bg-black/10 md:bg-black/40 shadow-2xl mx-auto transition-all duration-300 min-w-[200px]">
                <h2 class="text-4xl md:text-8xl font-black text-white tracking-tighter uppercase drop-shadow-2xl mb-1 md:mb-4 transition-all duration-500 whitespace-nowrap"
                    :style="{ textShadow: `0 0 30px ${current.color}` }">
                  {{ current.label }}
                </h2>
                <div class="inline-block px-3 py-1 md:px-6 md:py-2 border-t border-b border-white/10 mt-1 md:mt-2">
                  <p class="text-[10px] md:text-sm font-bold tracking-[0.3em] md:tracking-[0.6em] uppercase text-white/70 whitespace-nowrap">
                    {{ current.desc }}
                  </p>
                </div>
              </div>
            </div>
    
            <button @click="nextSection" class="pointer-events-auto hidden md:flex shrink-0 z-20 w-12 h-12 md:w-16 md:h-16 items-center justify-center rounded-full border border-white/10 hover:border-white hover:bg-white/10 transition-all group backdrop-blur-md">
               <svg class="w-5 h-5 md:w-6 md:h-6 text-white group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>
            </button>

        </div>
      </div>

      <div class="pointer-events-auto flex md:hidden justify-between w-full absolute bottom-32 left-0 px-6">
          <button @click="prevSection" class="p-2 text-white/50 active:text-white active:scale-95 transition-all">
             <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path></svg>
          </button>
          <button @click="nextSection" class="p-2 text-white/50 active:text-white active:scale-95 transition-all">
             <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>
          </button>
      </div>

      <div class="w-full flex justify-center pb-8 md:pb-10 pointer-events-auto z-50">
        <button 
          @mousedown="startHold"
          @mouseup="stopHold"
          @mouseleave="stopHold"
          @touchstart.prevent="startHold"
          @touchend.prevent="stopHold"
          class="relative group cursor-pointer active:scale-95 transition-transform duration-100"
        >
          <div class="relative w-64 md:w-72 h-14 md:h-16 bg-black/80 backdrop-blur-xl border border-white/20 rounded-xl overflow-hidden flex items-center justify-center gap-3 md:gap-4 transition-all group-hover:border-white/60 shadow-lg shadow-black/50">
            <div class="absolute bottom-0 left-0 w-full bg-white/20 transition-all duration-75 ease-linear"
                 :style="{ height: `${loadingProgress}%` }"></div>
            <div class="w-6 h-6 md:w-8 md:h-8 rounded-full border border-white/30 flex items-center justify-center text-white">
              <svg class="w-3 h-3 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
            </div>
            <div class="text-left z-10">
              <div class="text-sm md:text-lg font-bold text-white tracking-widest uppercase">
                {{ loadingProgress > 0 ? 'ACCESSING...' : 'START' }}
              </div>
            </div>
          </div>
          <div class="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[8px] md:text-[9px] text-gray-500 uppercase tracking-widest opacity-60 md:opacity-0 md:group-hover:opacity-100 transition-opacity whitespace-nowrap">
            Hold to Enter
          </div>
        </button>
      </div>

    </div>

    <div class="absolute inset-0 z-10 bg-[radial-gradient(circle_at_center,transparent_30%,black_100%)] pointer-events-none"></div>

  </div>
</template>