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
const uiContainerRef = ref(null)

// --- DATA: SINGULARITY NODES ---
const nodes = [
  { 
    id: 0, 
    path: '/explore', 
    label: 'EXPLORE', 
    sub: 'SOLAR SYSTEM',
    desc: 'Chart the Unknown Worlds',
    coords: 'Sector 01',
    color: '#3b82f6', // Deep Blue
    coreColor: '#ffffff',
  },
  { 
    id: 1, 
    path: '/events', 
    label: 'ARCHIVE', 
    sub: 'HISTORY LOGS',
    desc: 'Access Ancient Records', 
    coords: 'Sector 09',
    color: '#eab308', // Gold
    coreColor: '#fef08a',
  },
  { 
    id: 2, 
    path: '/game', 
    label: 'SIMULATION', 
    sub: 'TACTICAL DRILL',
    desc: 'Combat Readiness', 
    coords: 'Sector 99',
    color: '#ef4444', // Red
    coreColor: '#fecaca',
  }
]

const activeIndex = ref(0)
const isImploding = ref(false)
const singularityCharge = ref(0)
const mouse = ref({ x: 0, y: 0 }) 

// --- THREE.JS VARIABLES ---
let scene, camera, renderer, composer
let particles, particleGeo
let glowMesh
let animationId
let clock = new THREE.Clock()

const isMobile = window.innerWidth < 768
const PARTICLE_COUNT = isMobile ? 15000 : 30000 

const init = () => {
  const w = window.innerWidth
  const h = window.innerHeight

  scene = new THREE.Scene()
  scene.background = new THREE.Color('#000000') 
  scene.fog = new THREE.FogExp2('#000000', 0.02)

  camera = new THREE.PerspectiveCamera(75, w/h, 0.1, 1000)
  camera.position.z = isMobile ? 35 : 25
  camera.position.y = 5

  renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' })
  renderer.setSize(w, h)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  containerRef.value.appendChild(renderer.domElement)

  // -- 1. THE SINGULARITY (BLACK HOLE CORE) --
  const geometry = new THREE.SphereGeometry(3, 32, 32)
  const material = new THREE.MeshBasicMaterial({ color: 0x000000 })
  const blackHole = new THREE.Mesh(geometry, material)
  scene.add(blackHole)

  // -- 2. ACCRETION DISK (Particle System) --
  const pGeo = new THREE.BufferGeometry()
  const positions = new Float32Array(PARTICLE_COUNT * 3)
  const colors = new Float32Array(PARTICLE_COUNT * 3)
  const sizes = new Float32Array(PARTICLE_COUNT)
  
  // Simulation Data (Simplified from State A)
  const angles = new Float32Array(PARTICLE_COUNT) 
  const radii = new Float32Array(PARTICLE_COUNT)  
  const speeds = new Float32Array(PARTICLE_COUNT) 
  const drifts = new Float32Array(PARTICLE_COUNT) 

  for(let i=0; i<PARTICLE_COUNT; i++) {
      const angle = Math.random() * Math.PI * 2
      const radius = 5 + Math.random() * 25 
      
      const i3 = i * 3
      positions[i3] = Math.cos(angle) * radius
      positions[i3+1] = (Math.random() - 0.5) * (radius * 0.1) 
      positions[i3+2] = Math.sin(angle) * radius
      
      colors[i3] = 0.5; colors[i3+1] = 0.5; colors[i3+2] = 0.5
      sizes[i] = Math.random()
      
      angles[i] = angle
      radii[i] = radius
      speeds[i] = (1 / radius) * 0.5 
      drifts[i] = (Math.random() - 0.5) * 0.05
  }

  pGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  pGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  pGeo.setAttribute('size', new THREE.BufferAttribute(sizes, 1))
  pGeo.userData = { angles, radii, speeds, drifts }

  const pMat = new THREE.PointsMaterial({
      size: 0.1,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      transparent: true,
      opacity: 0.8
  })

  particles = new THREE.Points(pGeo, pMat)
  scene.add(particles)

  // -- 3. GLOW --
  const glowGeo = new THREE.PlaneGeometry(14, 14)
  const canvas = document.createElement('canvas')
  canvas.width = 128; canvas.height = 128
  const ctx = canvas.getContext('2d')
  const grad = ctx.createRadialGradient(64,64,0, 64,64,64)
  grad.addColorStop(0, 'white')
  grad.addColorStop(1, 'transparent')
  ctx.fillStyle = grad
  ctx.fillRect(0,0,128,128)
  const glowTexture = new THREE.CanvasTexture(canvas)
  
  const glowMat = new THREE.MeshBasicMaterial({
      map: glowTexture,
      transparent: true,
      opacity: 0.1, // Subtle glow
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false
  })

  glowMesh = new THREE.Mesh(glowGeo, glowMat)
  glowMesh.lookAt(camera.position)
  scene.add(glowMesh)

  // -- POST PROCESSING --
  const renderPass = new RenderPass(scene, camera)
  const bloomPass = new UnrealBloomPass(new THREE.Vector2(w, h), 1.5, 0.4, 0.85)
  bloomPass.strength = 1.2
  bloomPass.radius = 0.5
  bloomPass.threshold = 0
  
  composer = new EffectComposer(renderer)
  composer.addPass(renderPass)
  composer.addPass(bloomPass)

  window.addEventListener('resize', onResize)
  window.addEventListener('mousemove', onMouseMove)
  window.addEventListener('touchmove', onTouchMove, { passive: false })
  
  animate()
  
  // Entry
  gsap.from(camera.position, { y: 20, z: 60, duration: 3, ease: "power4.out" })
}

const animate = () => {
  animationId = requestAnimationFrame(animate)
  const time = clock.getElapsedTime()
  
  // Updates
  const positions = particles.geometry.attributes.position.array
  const colors = particles.geometry.attributes.color.array
  const { angles, radii, speeds, drifts } = particles.geometry.userData
  
  const targetColorObj = new THREE.Color(nodes[activeIndex.value].color)
  const coreColorObj = new THREE.Color(nodes[activeIndex.value].coreColor)

  // Particle Loop
  for(let i=0; i<PARTICLE_COUNT; i++) {
      const i3 = i * 3
      
      // 1. Orbital Physics
      let speedMultiplier = isImploding.value ? 5 + (singularityCharge.value/10) : 1
      angles[i] += speeds[i] * speedMultiplier * 0.2
      
      if (isImploding.value || singularityCharge.value > 0) {
          radii[i] -= 0.1 + (singularityCharge.value / 200)
          if (radii[i] < 3) radii[i] = 25
      }

      // 2. Base Position
      let x = Math.cos(angles[i]) * radii[i]
      let z = Math.sin(angles[i]) * radii[i]
      let y = positions[i3+1] // Keep existing Y which includes flattened disk randomness + drift
      
      // Apply drift only (Stable Physics)
      y = (Math.random()-0.5) * (radii[i] * 0.1) + drifts[i]

      // Mode specifics
      if (activeIndex.value === 1) { // Archive: Cylinder/Rain
          x = Math.cos(angles[i]) * 8
          z = Math.sin(angles[i]) * 8
          y += Math.sin(time + i) * 0.1 
          y *= 2 
      } 
      else if (activeIndex.value === 2) { // Sim: Sphere Chaos
           x += (Math.random()-0.5) * 0.1
           z += (Math.random()-0.5) * 0.1
           y *= 3 
      }

      positions[i3] = x
      positions[i3+1] = y
      positions[i3+2] = z
      
      // 3. Color Logic
      const distFromCenter = Math.sqrt(x*x + z*z)
      const normalizedDist = Math.max(0, Math.min(1, (distFromCenter - 3) / 20))
      
      const mixedColor = coreColorObj.clone().lerp(targetColorObj, normalizedDist)
      
      colors[i3] += (mixedColor.r - colors[i3]) * 0.05
      colors[i3+1] += (mixedColor.g - colors[i3+1]) * 0.05
      colors[i3+2] += (mixedColor.b - colors[i3+2]) * 0.05
  }
  
  particles.geometry.attributes.position.needsUpdate = true
  particles.geometry.attributes.color.needsUpdate = true

  // Camera Drift
  const targetX = mouse.value.x * 2
  const targetY = 5 + mouse.value.y * 2
  camera.position.x += (targetX - camera.position.x) * 0.05
  camera.position.y += (targetY - camera.position.y) * 0.05
  camera.lookAt(0, 0, 0)
  glowMesh.lookAt(camera.position)
  
  if (singularityCharge.value > 50) {
      camera.position.x += (Math.random() - 0.5) * 0.5
      camera.position.y += (Math.random() - 0.5) * 0.5
  }

  composer.render()
}

const next = () => {
    if (isImploding.value) return
    activeIndex.value = (activeIndex.value + 1) % nodes.length
}

const prev = () => {
    if (isImploding.value) return
    activeIndex.value = (activeIndex.value - 1 + nodes.length) % nodes.length
}

let chargeInterval
const startSequence = () => {
    if (isImploding.value) return
    
    chargeInterval = setInterval(() => {
        singularityCharge.value += 1.5
        camera.fov = 75 + (singularityCharge.value / 2)
        camera.updateProjectionMatrix()
        
        if (singularityCharge.value >= 100) {
            clearInterval(chargeInterval)
            crossEventHorizon()
        }
    }, 20)
}

const stopSequence = () => {
    if (isImploding.value) return
    clearInterval(chargeInterval)
    const decay = setInterval(() => {
        singularityCharge.value -= 5
        camera.fov = 75 + (singularityCharge.value / 2)
        camera.updateProjectionMatrix()
        
        if (singularityCharge.value <= 0) {
            singularityCharge.value = 0
            camera.fov = 75
            camera.updateProjectionMatrix()
            clearInterval(decay)
        }
    }, 10)
}

const crossEventHorizon = () => {
    isImploding.value = true
    const targetPath = nodes[activeIndex.value].path
    
    gsap.to(camera.position, { 
        x: 0, 
        y: 0, 
        z: 0.1, 
        duration: 0.8, 
        ease: "power2.in" 
    })
    
    gsap.to('.ui-layer', { opacity: 0, scale: 0.8, duration: 0.4 })
    gsap.to('.blackout-overlay', { opacity: 1, duration: 0.8, delay: 0.1 })
    
    setTimeout(() => {
        router.push(targetPath)
    }, 1200)
}

const onMouseMove = (e) => {
  mouse.value.x = (e.clientX / window.innerWidth) * 2 - 1
  mouse.value.y = -(e.clientY / window.innerHeight) * 2 + 1
  
    // 3D HUD TILT
    if (uiContainerRef.value) {
        const rx = mouse.value.y * -5
        const ry = mouse.value.x * 5
        uiContainerRef.value.style.transform = `perspective(1000px) rotateX(${rx}deg) rotateY(${ry}deg)`
    }
}
const onTouchMove = (e) => {
    const t = e.touches[0]
    mouse.value.x = (t.clientX / window.innerWidth) * 2 - 1
    mouse.value.y = -(t.clientY / window.innerHeight) * 2 + 1
}
const onResize = () => {
  if(!containerRef.value) return
  const w = window.innerWidth
  const h = window.innerHeight
  camera.aspect = w/h
  camera.updateProjectionMatrix()
  renderer.setSize(w, h)
  composer.setSize(w, h)
}

onMounted(() => { init() })
onUnmounted(() => {
    cancelAnimationFrame(animationId)
    window.removeEventListener('resize', onResize)
    window.removeEventListener('mousemove', onMouseMove)
    window.removeEventListener('touchmove', onTouchMove)
    if(renderer) renderer.dispose()
})

const current = computed(() => nodes[activeIndex.value])
</script>

<template>
  <div class="relative w-full h-full bg-black font-sans overflow-hidden select-none touch-manipulation text-white">
    
    <!-- 3D Viewport -->
    <div ref="containerRef" class="absolute inset-0 z-0"></div>
    
    <!-- Cinematic Overlays -->
    <div class="absolute inset-0 z-10 pointer-events-none bg-[radial-gradient(circle_at_center,transparent_0%,#000000_150%)]"></div>
    <div class="blackout-overlay absolute inset-0 z-50 bg-black opacity-0 pointer-events-none transition-opacity"></div>

    <!-- UI LAYER (Holographic Tilt) -->
    <div ref="uiContainerRef" class="ui-layer absolute inset-0 z-20 flex flex-col justify-between p-8 md:p-12 transition-all duration-300 will-change-transform">
        
        <!-- TOP HUD -->
        <div class="flex justify-between items-start pointer-events-none">
            <div class="flex flex-col gap-1">
                <h3 class="text-[10px] md:text-xs font-mono text-cyan-400 tracking-[0.4em] uppercase opacity-70">Sector Analysis</h3>
                <h1 class="text-3xl md:text-5xl font-headers font-bold tracking-tighter" :style="{ color: current.coreColor }">
                    {{ current.coords }}
                </h1>
            </div>
            
            <button
               @click="router.push('/leaderboard')"
               class="px-5 py-2 bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/30 rounded text-[10px] font-bold pointer-events-auto transition-all backdrop-blur-md flex items-center gap-3 group tracking-widest uppercase font-mono"
             >
               <span class="opacity-50 group-hover:opacity-100 transition-opacity">Rankings</span>
               <span class="text-yellow-400">🏆</span>
            </button>
        </div>

        <!-- CENTER NAVIGATION (Enhanced Visibility) -->
        <div class="absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-between px-4 md:px-20 pointer-events-none">
            <button @click="prev" class="pointer-events-auto w-16 h-16 md:w-20 md:h-20 flex items-center justify-center rounded-full bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/30 backdrop-blur-sm hover:scale-110 active:scale-95 transition-all group shadow-[0_0_20px_rgba(255,255,255,0.05)] hover:shadow-[0_0_30px_rgba(255,255,255,0.1)]">
                <span class="text-2xl font-black text-white/50 group-hover:text-white transition-colors">&lt;</span>
            </button>
            <button @click="next" class="pointer-events-auto w-16 h-16 md:w-20 md:h-20 flex items-center justify-center rounded-full bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/30 backdrop-blur-sm hover:scale-110 active:scale-95 transition-all group shadow-[0_0_20px_rgba(255,255,255,0.05)] hover:shadow-[0_0_30px_rgba(255,255,255,0.1)]">
                <span class="text-2xl font-black text-white/50 group-hover:text-white transition-colors">&gt;</span>
            </button>
        </div>

        <!-- BOTTOM CONTROLS -->
        <div class="flex flex-col items-center pointer-events-none">
            
            <!-- Description Module -->
            <div class="mb-12 text-center" :class="{ 'opacity-0 blur-sm': isImploding }">
                <div class="overflow-hidden h-6 mb-2">
                    <div class="text-[12px] font-mono font-bold tracking-[0.5em] text-cyan-400 uppercase animate-slide-up" :key="current.id">
                        {{ current.sub }}
                    </div>
                </div>
                <h2 class="text-5xl md:text-8xl font-headers font-black uppercase tracking-tighter leading-none mb-4 mix-blend-overlay opacity-90 transition-all duration-500"
                    :style="{ textShadow: `0 0 50px ${current.color}` }">
                    {{ current.label }}
                </h2>
                
                <div class="flex items-center justify-center gap-4 mb-8 opacity-70">
                    <div class="h-[1px] w-8 bg-white/50"></div>
                     <p class="text-xs text-white  font-sans tracking-[0.2em] uppercase">
                        {{ current.desc }}
                    </p>
                    <div class="h-[1px] w-8 bg-white/50"></div>
                </div>
            </div>

            <!-- INITIATE BUTTON -->
            <button
                @mousedown="startSequence" 
                @mouseup="stopSequence"
                @mouseleave="stopSequence"
                @touchstart.prevent="startSequence"
                @touchend="stopSequence"
                class="pointer-events-auto relative group overflow-hidden rounded-sm"
            >
                <div class="relative px-10 py-5 bg-white/5 border border-white/20 hover:border-white/50 backdrop-blur-md transition-all duration-300">
                    <!-- Progress Fill -->
                    <div class="absolute inset-0 bg-white mix-blend-overlay transition-all duration-75 ease-linear origin-left"
                         :style="{ transform: `scaleX(${singularityCharge / 100})` }"></div>
                    
                    <span class="relative z-10 text-xs font-bold tracking-[0.4em] uppercase group-hover:text-white transition-colors">
                        Initiate Sequence
                    </span>
                </div>
                
                <div class="absolute -bottom-8 left-1/2 -translate-x-1/2 text-[9px] font-mono text-gray-500 tracking-widest opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                    [ HOLD TO CROSS HORIZON ]
                </div>
            </button>
            
        </div>

    </div>
  </div>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Rajdhani:wght@400;600&display=swap');

.font-headers {
    font-family: 'Orbitron', sans-serif;
}
.font-sans {
    font-family: 'Rajdhani', sans-serif;
}
.font-mono {
    font-family: monospace; /* Fallback for tech text */
}

.animate-slide-up {
    animation: slideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1);
}
@keyframes slideUp {
    from { transform: translateY(100%); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
}
</style>