<script setup>
import { ref, onMounted, onUnmounted, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import * as THREE from 'three'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import gsap from 'gsap'

const router = useRouter()
const containerRef = ref(null)

// --- DATA: THE CRYSTAL NEXUS NODES ---
const nodes = [
  { 
    id: 0, 
    path: '/explore', 
    label: 'EXPLORATION', 
    sub: 'SECTOR 01',
    desc: 'Chart the Unknown Worlds',
    color: '#0ea5e9', // Sky Blue
    emissive: '#7dd3fc',
    iconGeometry: 'sphere' 
  },
  { 
    id: 1, 
    path: '/events', 
    label: 'ARCHIVES', 
    sub: 'SECTOR 09',
    desc: 'Access Ancient Records', 
    color: '#fbbf24', // Amber
    emissive: '#fcd34d',
    iconGeometry: 'box'
  },
  { 
    id: 2, 
    path: '/game', 
    label: 'SIMULATION', 
    sub: 'SECTOR 99',
    desc: 'Tactical Combat Drill', 
    color: '#ef4444', // Red
    emissive: '#fca5a5',
    iconGeometry: 'icosahedron'
  }
]

const activeIndex = ref(0)
const isTransitioning = ref(false)
const carouselGroup = new THREE.Group()

// --- THREE.JS VARIABLES ---
let scene, camera, renderer, composer
let monoliths = []
let lights = []
let animationId
const clock = new THREE.Clock()

const isMobile = window.innerWidth < 768

// --- 3D SETUP ---
const init = () => {
  const w = window.innerWidth
  const h = window.innerHeight

  // 1. SCENE
  scene = new THREE.Scene()
  scene.background = new THREE.Color('#050510') // Very dark blue-black
  scene.fog = new THREE.FogExp2('#050510', 0.02)

  // 2. CAMERA
  camera = new THREE.PerspectiveCamera(60, w/h, 0.1, 100)
  camera.position.set(0, 0, 18)
  
  // 3. RENDERER
  renderer = new THREE.WebGLRenderer({ 
      antialias: true, 
      alpha: true,
      powerPreference: 'high-performance' 
  })
  renderer.setSize(w, h)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.2
  containerRef.value.appendChild(renderer.domElement)

  // 4. LIGHTING (Premium Studio Setup)
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.2)
  scene.add(ambientLight)

  const spotLight = new THREE.SpotLight(0xffffff, 10)
  spotLight.position.set(10, 20, 10)
  spotLight.angle = 0.5
  spotLight.penumbra = 1
  scene.add(spotLight)

  const backLight = new THREE.PointLight(0x00ffff, 2, 20)
  backLight.position.set(-10, 5, -10)
  scene.add(backLight)
  
  const fillLight = new THREE.PointLight(0xff00ff, 2, 20)
  fillLight.position.set(10, -5, -10)
  scene.add(fillLight)

  // 5. STARFIELD BACKGROUND
  createStarfield()

  // 6. BUILD THE MONOLITHS
  createMonoliths()
  scene.add(carouselGroup)

  // 7. POST PROCESSING
  const renderPass = new RenderPass(scene, camera)
  const bloomPass = new UnrealBloomPass(new THREE.Vector2(w, h), 1.5, 0.4, 0.85)
  bloomPass.strength = 0.8
  bloomPass.radius = 0.5
  bloomPass.threshold = 0.2
  
  composer = new EffectComposer(renderer)
  composer.addPass(renderPass)
  composer.addPass(bloomPass)

  window.addEventListener('resize', onResize)
  window.addEventListener('wheel', onWheel)
  window.addEventListener('touchstart', onTouchStart)
  window.addEventListener('touchmove', onTouchMove)
  window.addEventListener('touchend', onTouchEnd)
  
  animate()
  
  // Intro Animation
  gsap.from(camera.position, { z: 40, duration: 2.5, ease: "power3.out" })
  gsap.from(carouselGroup.rotation, { y: Math.PI, duration: 2.5, ease: "power3.out" })
}

const createStarfield = () => {
    const geometry = new THREE.BufferGeometry()
    const count = 3000
    const positions = new Float32Array(count * 3)
    const colors = new Float32Array(count * 3)

    for(let i=0; i<count; i++) {
        const r = 40 + Math.random() * 40
        const theta = Math.random() * Math.PI * 2
        const phi = Math.acos((Math.random() * 2) - 1)
        
        const x = r * Math.sin(phi) * Math.cos(theta)
        const y = r * Math.sin(phi) * Math.sin(theta)
        const z = r * Math.cos(phi)
        
        positions[i*3] = x
        positions[i*3+1] = y
        positions[i*3+2] = z
        
        // Slight tint variations
        const tint = Math.random() > 0.8 ? 0.8 : 1
        colors[i*3] = tint; colors[i*3+1] = tint; colors[i*3+2] = tint
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    
    const material = new THREE.PointsMaterial({
        size: 0.15,
        vertexColors: true,
        transparent: true,
        opacity: 0.6
    })
    
    const stars = new THREE.Points(geometry, material)
    scene.add(stars)
}

const createMonoliths = () => {
    const radius = 6 // Distance from center
    const angleStep = (Math.PI * 2) / 3
    
    nodes.forEach((node, i) => {
        const group = new THREE.Group()
        const angle = i * angleStep
        
        // Position in circle
        group.position.x = Math.sin(angle) * radius
        group.position.z = Math.cos(angle) * radius // Rearrange to start correctly?
                                                    // Standard circle logic: sin/cos
        
        // Correct rotation to face center initially (or outward)
        group.rotation.y = angle
        
        // --- A. THE GLASS SLAB ---
        // Premium glass material
        const glassGeo = new THREE.BoxGeometry(4, 6, 0.5)
        const glassMat = new THREE.MeshPhysicalMaterial({
            color: 0xffffff,
            metalness: 0,
            roughness: 0,
            transmission: 1, // Glass
            thickness: 2.5, // Refraction thickness
            envMapIntensity: 1,
            clearcoat: 1,
            clearcoatRoughness: 0.1,
            ior: 1.5,
            attenuationColor: new THREE.Color(node.color),
            attenuationDistance: 2
        })
        const slab = new THREE.Mesh(glassGeo, glassMat)
        
        // --- B. INNER GLOWING ICON ---
        let iconGeo
        if (node.iconGeometry === 'sphere') iconGeo = new THREE.IcosahedronGeometry(1.2, 1)
        else if (node.iconGeometry === 'box') iconGeo = new THREE.BoxGeometry(1.8, 1.8, 1.8)
        else iconGeo = new THREE.OctahedronGeometry(1.5, 0)
        
        const iconMat = new THREE.MeshBasicMaterial({
            color: node.coreColor || node.color,
            wireframe: true,
            transparent: true,
            opacity: 0.8
        })
        const icon = new THREE.Mesh(iconGeo, iconMat)
        
        // Inner light
        const innerLight = new THREE.PointLight(node.color, 3, 8)
        innerLight.position.set(0,0,0)
        
        group.add(slab)
        group.add(icon)
        group.add(innerLight)
        
        // Store refs for animation
        group.userData = { id: node.id, initialY: group.position.y, icon }
        monoliths.push(group)
        carouselGroup.add(group)
    })
    
    // Initial offset to center the first item (Index 0)
    // If index 0 is at angle 0 (0,0,radius), camera is at (0,0,18).
    // We want index 0 to be at (0,0,radius) facing camera? 
    // Actually standard Circle: 0 is at (0, 0, 1) usually. 
    // Let's settle rotation later via updateCarousel
    updateCarouselRotation()
}

// --- ANIMATION LOOP ---
const animate = () => {
    animationId = requestAnimationFrame(animate)
    const time = clock.getElapsedTime()
    
    // Float Monoliths
    monoliths.forEach((m, i) => {
        m.userData.icon.rotation.y += 0.01 // Spin icon
        m.userData.icon.rotation.x = Math.sin(time * 0.5) * 0.2
        
        // Gentle hover
        m.position.y = Math.sin(time + i) * 0.2
    })
    
    // Rotate Starfield slightly?
    
    composer.render()
}

// --- INTERACTION LOGIC ---

const updateCarouselRotation = () => {
    // 3 Items -> 120 deg apart (2PI / 3)
    // We want activeIndex to be closest to camera (Z+)
    // If Item 0 is at Angle 0. We rotate group by -Angle0?
    
    const targetRotation = -activeIndex.value * (Math.PI * 2 / 3)
    
    gsap.to(carouselGroup.rotation, {
        y: targetRotation,
        duration: 1.2,
        ease: "power4.out"
    })
}

const next = () => {
    if(isTransitioning.value) return
    activeIndex.value = (activeIndex.value + 1) % nodes.length
    updateCarouselRotation()
}

const prev = () => {
    if(isTransitioning.value) return
    activeIndex.value = (activeIndex.value - 1 + nodes.length) % nodes.length
    updateCarouselRotation()
}

const selectItem = () => {
    if(isTransitioning.value) return
    isTransitioning.value = true
    
    // Warp Speed Effect
    const targetNode = nodes[activeIndex.value]
    
    // 1. Zoom Camera Forcefully
    gsap.to(camera.position, {
        z: 6, // Go INTO the monolith
        duration: 0.8,
        ease: "power2.in"
    })
    
    // 2. Fade Out UI
    gsap.to('.ui-layer', { opacity: 0, scale: 0.9, duration: 0.5 })
    
    // 3. Navigate
    setTimeout(() => {
        router.push(targetNode.path)
    }, 800)
}

// Wheel/Scroll Support
let scrollTimeout
const onWheel = (e) => {
    if(isTransitioning.value) return
    clearTimeout(scrollTimeout)
    
    scrollTimeout = setTimeout(() => {
        if(e.deltaY > 0) next()
        else prev()
    }, 50)
}

// Touch Support
let touchStartX = 0
const onTouchStart = (e) => { touchStartX = e.touches[0].clientX }
const onTouchMove = (e) => {} 
const onTouchEnd = (e) => {
    const diff = touchStartX - e.changedTouches[0].clientX
    if(Math.abs(diff) > 50) {
        if(diff > 0) next()
        else prev()
    }
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
    window.removeEventListener('wheel', onWheel)
    window.removeEventListener('touchstart', onTouchStart)
    window.removeEventListener('touchmove', onTouchMove)
    window.removeEventListener('touchend', onTouchEnd)
    if(renderer) {
        renderer.dispose()
        renderer.forceContextLoss()
    }
})

const current = computed(() => nodes[activeIndex.value])
</script>

<template>
  <div class="relative w-full h-full bg-[#050510] font-sans overflow-hidden select-none text-white">
    
    <!-- 3D Canvas -->
    <div ref="containerRef" class="absolute inset-0 z-0"></div>
    
    <!-- Vignette / Overlays -->
    <div class="absolute inset-0 z-10 pointer-events-none bg-[radial-gradient(circle_at_center,transparent_0%,#000000_120%)]"></div>

    <!-- UI LAYER -->
    <div class="ui-layer absolute inset-0 z-20 flex flex-col justify-between p-8 md:p-12 pointer-events-none transition-all duration-300">
        
        <!-- HEADER -->
        <div class="flex justify-between items-start">
            <div class="flex flex-col gap-1">
                <div class="text-[10px] md:text-xs font-mono text-cyan-400 tracking-[0.4em] uppercase opacity-70 mb-1">Nexus Interface</div>
                <h1 class="text-3xl md:text-4xl font-headers font-bold tracking-widest text-white uppercase drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]">
                    System Select
                </h1>
            </div>

        </div>

        <!-- MAIN INFO (CENTER BOTTOM) -->
        <div class="absolute bottom-12 md:bottom-20 left-0 w-full text-center flex flex-col items-center">
            
            <!-- Dynamic Info -->
            <div class="mb-10 transition-all duration-500 transform" :key="current.id">
                <div class="text-xs font-mono font-bold tracking-[0.5em] uppercase text-gray-400 mb-2">{{ current.sub }}</div>
                <h2 class="text-5xl md:text-8xl font-headers font-black uppercase tracking-tight text-transparent bg-clip-text bg-gradient-to-b from-white to-gray-500 mb-4 drop-shadow-2xl">
                    {{ current.label }}
                </h2>
                <div class="w-16 h-[2px] bg-white/20 mx-auto mb-4"></div>
                <p class="text-sm md:text-base font-sans tracking-[0.2em] text-cyan-300 uppercase opacity-80">
                    {{ current.desc }}
                </p>
            </div>

            <!-- Action Button -->
            <button 
                @click="selectItem"
                class="pointer-events-auto group relative px-12 py-4 bg-white/5 border border-white/20 hover:bg-white/10 hover:border-cyan-400/50 backdrop-blur-md overflow-hidden transition-all duration-300 rounded-sm"
            >
                <div class="absolute inset-0 bg-cyan-500/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                <span class="relative z-10 text-xs md:text-sm font-bold tracking-[0.4em] uppercase group-hover:text-cyan-300 transition-colors">
                    INITIALIZE LINK
                </span>
            </button>
        </div>

        <!-- NAVIGATION ARROWS (SIDE) -->
        <div class="absolute inset-y-0 left-4 md:left-12 flex items-center">
             <button @click="prev" class="pointer-events-auto p-4 md:p-6 rounded-full border border-white/10 hover:bg-white/5 hover:border-white/30 backdrop-blur-md transition-all hover:-translate-x-1 group">
                 <span class="text-2xl text-white/30 group-hover:text-white">&lt;</span>
             </button>
        </div>
        <div class="absolute inset-y-0 right-4 md:right-12 flex items-center">
             <button @click="next" class="pointer-events-auto p-4 md:p-6 rounded-full border border-white/10 hover:bg-white/5 hover:border-white/30 backdrop-blur-md transition-all hover:translate-x-1 group">
                 <span class="text-2xl text-white/30 group-hover:text-white">&gt;</span>
             </button>
        </div>

    </div>
  </div>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Rajdhani:wght@400;600&display=swap');

.font-headers { font-family: 'Orbitron', sans-serif; }
.font-sans { font-family: 'Rajdhani', sans-serif; }
</style>