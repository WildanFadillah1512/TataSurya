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
const uiContainerRef = ref(null) // For 3D HUD tilt

// --- DATA: MULTIVERSE GATES ---
const portals = [
  {
    id: 0,
    title: 'SPACE MYSTERY',
    sub: 'The Enigma Gate',
    desc: 'Solve Ancient Riddles',
    type: 'PUZZLE DIMENSION',
    color: '#a855f7', // Purple
    coreColor: '#d8b4fe',
    path: '/game/play-1',
    locked: false
  },
  {
    id: 1,
    title: 'ASTRO ADVENTURE',
    sub: 'The Velocity Gate',
    desc: 'High Speed Exploration',
    type: 'FLIGHT DIMENSION',
    color: '#06b6d4', // Cyan
    coreColor: '#67e8f9',
    path: '/game/play-2',
    locked: false
  },
  {
    id: 2,
    title: 'CLASSIFIED',
    sub: 'Sealed Dimension',
    desc: 'Containment Field Active',
    type: 'RESTRICTED',
    color: '#ef4444', // Red
    coreColor: '#7f1d1d',
    path: '',
    locked: true
  }
]

const activeIndex = ref(-1)
const isTraveling = ref(false)
const mouse = ref({ x: 0, y: 0 })

// --- THREE.JS VARIABLES ---
let scene, camera, renderer, composer
let gates = [] 
let starSystem // Stores star particles for gravity effect
let raycaster
let animationId
let clock = new THREE.Clock()

const isMobile = window.innerWidth < 768

// --- 3D SETUP ---
const init = () => {
    const w = window.innerWidth
    const h = window.innerHeight

    scene = new THREE.Scene()
    scene.background = new THREE.Color('#000000')
    scene.fog = new THREE.FogExp2('#000000', 0.02)

    camera = new THREE.PerspectiveCamera(60, w/h, 0.1, 1000)
    camera.position.set(0, 2, 25)

    renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' })
    renderer.setSize(w, h)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    containerRef.value.appendChild(renderer.domElement)

    raycaster = new THREE.Raycaster()

    // -- DYNAMIC STARFIELD (Gravity Reactive) --
    const starCount = 4000
    const starsGeo = new THREE.BufferGeometry()
    const starPos = new Float32Array(starCount * 3)
    const starVel = new Float32Array(starCount * 3) // Velocity for physics
    const starBasePos = new Float32Array(starCount * 3) // Home position

    for(let i=0; i<starCount; i++) {
        const x = (Math.random() - 0.5) * 200
        const y = (Math.random() - 0.5) * 100
        const z = (Math.random() - 0.5) * 100
        
        starPos[i*3] = x; starBasePos[i*3] = x;
        starPos[i*3+1] = y; starBasePos[i*3+1] = y;
        starPos[i*3+2] = z; starBasePos[i*3+2] = z;
        
        starVel[i*3] = 0; starVel[i*3+1] = 0; starVel[i*3+2] = 0;
    }
    
    starsGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3))
    const starsMat = new THREE.PointsMaterial({ color: 0x888888, size: 0.15, transparent: true, opacity: 0.6 })
    starSystem = new THREE.Points(starsGeo, starsMat)
    starSystem.userData = { starBasePos, starVel }
    scene.add(starSystem)

    // -- BUILD GATES --
    buildGates()

    // -- LIGHTS --
    // Dynamic light that moves to active gate
    const gateLight = new THREE.PointLight(0xffffff, 0, 100)
    gateLight.position.set(0, 0, 5)
    gateLight.name = 'GateLight'
    scene.add(gateLight)

    // -- POST PROCESSING --
    const renderPass = new RenderPass(scene, camera)
    const bloomPass = new UnrealBloomPass(new THREE.Vector2(w, h), 1.5, 0.4, 0.85)
    bloomPass.strength = 1.5 
    bloomPass.radius = 0.6
    bloomPass.threshold = 0.1
    
    composer = new EffectComposer(renderer)
    composer.addPass(renderPass)
    composer.addPass(bloomPass)

    window.addEventListener('resize', onResize)
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('click', onClick)

    animate()
    
    gsap.from(camera.position, { z: 60, duration: 2.5, ease: "power2.out" })
}

const buildGates = () => {
    const spacing = isMobile ? 10 : 16
    
    portals.forEach((p, i) => {
        const group = new THREE.Group()
        const xPos = (i - 1) * spacing
        const zPos = Math.abs(i-1) * 2
        
        group.position.set(xPos, 0, -zPos)
        group.lookAt(0, 0, 25)
        
        // 1. OUTER RING
        const ringGeo = new THREE.TorusGeometry(3.5, 0.2, 16, 50)
        const ringMat = new THREE.MeshBasicMaterial({ 
            color: p.color, 
            wireframe: true,
            transparent: true,
            opacity: 0.15
        })
        const ring = new THREE.Mesh(ringGeo, ringMat)
        group.add(ring)
        
        // 2. ENERGY RING (Rotating)
        const innerGeo = new THREE.TorusGeometry(3.2, 0.05, 8, 40)
        const innerMat = new THREE.MeshBasicMaterial({ color: p.coreColor, transparent: true, opacity: 0.5 })
        const innerRing = new THREE.Mesh(innerGeo, innerMat)
        group.add(innerRing)
        
        // 3. EVENT HORIZON (Particles)
        const horizon = createHorizon(p.color)
        group.add(horizon)

        // 4. LOCKED CAGE
        if (p.locked) {
            const cageGeo = new THREE.IcosahedronGeometry(2.5, 1)
            const cageMat = new THREE.MeshBasicMaterial({ color: 'red', wireframe: true, transparent: true, opacity: 0.3 })
            const cage = new THREE.Mesh(cageGeo, cageMat)
            group.add(cage)
        }

        scene.add(group)
        gates.push({ group, ring, innerRing, horizon, data: p })
    })
}

const createHorizon = (color) => {
    const count = 500
    const geo = new THREE.BufferGeometry()
    const pos = new Float32Array(count * 3)
    const data = { ang: [], rad: [], spd: [] }
    
    for(let i=0; i<count; i++) {
        const ang = Math.random() * Math.PI * 2
        const rad = Math.random() * 3
        
        data.ang.push(ang)
        data.rad.push(rad)
        data.spd.push(0.01 + Math.random() * 0.03)
        
        pos[i*3] = Math.cos(ang) * rad
        pos[i*3+1] = Math.sin(ang) * rad
        pos[i*3+2] = (Math.random()-0.5) * 0.2
    }
    
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    const mat = new THREE.PointsMaterial({
        color: color,
        size: 0.08,
        transparent: true,
        opacity: 0.1, // Dim default
        blending: THREE.AdditiveBlending
    })
    
    const mesh = new THREE.Points(geo, mat)
    mesh.userData = data
    return mesh
}

// --- ANIMATION LOOP ---
const animate = () => {
    animationId = requestAnimationFrame(animate)
    
    // Raycast
    raycaster.setFromCamera(mouse.value, camera)
    const hitTestObjects = gates.map(g => g.horizon)
    const intersects = raycaster.intersectObjects(hitTestObjects)
    
    let hoveredIndex = -1
    if (intersects.length > 0 && !isTraveling.value) {
        const hitObj = intersects[0].object
        hoveredIndex = gates.findIndex(g => g.horizon === hitObj)
    }
    
    if (!isTraveling.value) {
        activeIndex.value = hoveredIndex
        document.body.style.cursor = hoveredIndex !== -1 ? 'pointer' : 'default'
    }

    // --- GRAVITY DISTORTION LOGIC ---
    updateGravity(hoveredIndex)
    
    // --- GATE UPDATES ---
    const gateLight = scene.getObjectByName('GateLight')
    if (hoveredIndex !== -1) {
        const targetGate = gates[hoveredIndex]
        gateLight.color.set(targetGate.data.color)
        gateLight.intensity = THREE.MathUtils.lerp(gateLight.intensity, 2, 0.1)
        gateLight.position.lerp(targetGate.group.position, 0.1)
    } else {
        gateLight.intensity = THREE.MathUtils.lerp(gateLight.intensity, 0, 0.1)
    }

    gates.forEach((g, i) => {
        const isHovered = i === activeIndex.value
        const isLocked = g.data.locked
        
        g.innerRing.rotation.z -= isHovered ? 0.1 : 0.01
        g.ring.rotation.z += 0.002
        
        // Horizon Particles
        const positions = g.horizon.geometry.attributes.position.array
        const { ang, rad, spd } = g.horizon.userData
        
        for(let j=0; j<ang.length; j++) {
            ang[j] += spd[j] * (isHovered ? 5 : 1)
            if (isTraveling.value && isHovered) rad[j] *= 0.95 // Suck in
            
            positions[j*3] = Math.cos(ang[j]) * rad[j]
            positions[j*3+1] = Math.sin(ang[j]) * rad[j]
        }
        g.horizon.geometry.attributes.position.needsUpdate = true
        
        // Opacity
        const targetOp = isHovered && !isLocked ? 0.8 : 0.1
        g.horizon.material.opacity = THREE.MathUtils.lerp(g.horizon.material.opacity, targetOp, 0.1)
    })

    // Camera Parallax
    if (!isTraveling.value) {
        camera.position.x += (mouse.value.x * 1.5 - camera.position.x) * 0.05
        camera.position.y += (2 + mouse.value.y * 1 - camera.position.y) * 0.05
        camera.lookAt(0, 0, 0)
    }

    composer.render()
}

const updateGravity = (targetIndex) => {
    const positions = starSystem.geometry.attributes.position.array
    const { starBasePos, starVel } = starSystem.userData
    
    let targetPos = new THREE.Vector3(0,0,0)
    let active = false
    
    if (targetIndex !== -1) {
        targetPos.copy(gates[targetIndex].group.position)
        active = true
    }
    
    for(let i=0; i<positions.length; i+=3) {
        const ix = i, iy = i+1, iz = i+2
        
        if (active) {
            // Attraction
            const dx = targetPos.x - positions[ix]
            const dy = targetPos.y - positions[iy]
            const dz = targetPos.z - positions[iz]
            const dist = Math.sqrt(dx*dx+dy*dy+dz*dz)
            
            if (dist < 30 && dist > 2) {
                const force = 0.5 / (dist * dist)
                starVel[ix] += dx * force
                starVel[iy] += dy * force
                starVel[iz] += dz * force
            }
        }
        
        // Spring back to base
        const bx = starBasePos[ix] - positions[ix]
        const by = starBasePos[iy] - positions[iy]
        const bz = starBasePos[iz] - positions[iz]
        
        starVel[ix] += bx * 0.01
        starVel[iy] += by * 0.01
        starVel[iz] += bz * 0.01
        
        // Damping
        starVel[ix] *= 0.9
        starVel[iy] *= 0.9
        starVel[iz] *= 0.9
        
        positions[ix] += starVel[ix]
        positions[iy] += starVel[iy]
        positions[iz] += starVel[iz]
    }
    starSystem.geometry.attributes.position.needsUpdate = true
}

// --- INTERACTION ---
const onClick = () => {
    if (activeIndex.value === -1 || isTraveling.value) return
    const gate = gates[activeIndex.value]
    if (gate.data.locked) return
    
    enterWormhole(activeIndex.value)
}

const enterWormhole = (index) => {
    isTraveling.value = true
    const gate = gates[index]
    const targetPos = gate.group.position.clone()
    
    gsap.to(camera.position, {
        x: targetPos.x,
        y: targetPos.y,
        z: targetPos.z - 10,
        duration: 2,
        ease: "power3.in",
        onUpdate: () => {
            camera.position.x += (Math.random() - 0.5) * 0.2
            camera.position.y += (Math.random() - 0.5) * 0.2
        },
        onComplete: () => {
            router.push(gate.data.path)
        }
    })
    
    gsap.to('.ui-layer', { opacity: 0, duration: 0.5 })
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
    // Cancel animation frame
    if (animationId) cancelAnimationFrame(animationId)
    
    // Remove event listeners
    window.removeEventListener('resize', onResize)
    window.removeEventListener('mousemove', onMouseMove)
    window.removeEventListener('click', onClick)
    
    // FIXED: Dispose all Three.js resources
    gates.forEach(gate => {
        if (gate.ring) {
            if (gate.ring.geometry) gate.ring.geometry.dispose()
            if (gate.ring.material) gate.ring.material.dispose()
        }
        if (gate.innerRing) {
            if (gate.innerRing.geometry) gate.innerRing.geometry.dispose()
            if (gate.innerRing.material) gate.innerRing.material.dispose()
        }
        if (gate.horizon) {
            if (gate.horizon.geometry) gate.horizon.geometry.dispose()
            if (gate.horizon.material) gate.horizon.material.dispose()
        }
        // Remove from scene
        if (gate.group) scene.remove(gate.group)
    })
    gates = []
    
    // Dispose starfield
    if (starSystem) {
        if (starSystem.geometry) starSystem.geometry.dispose()
        if (starSystem.material) starSystem.material.dispose()
        scene.remove(starSystem)
    }
    
    // Dispose composer
    if (composer) {
        composer.dispose()
    }
    
    // Dispose renderer
    if (renderer) {
        renderer.dispose()
        renderer.forceContextLoss()
    }
})

const currentGate = computed(() => activeIndex.value !== -1 ? portals[activeIndex.value] : null)
</script>

<template>
  <div class="relative w-full h-full bg-black font-sans overflow-hidden select-none text-white">
    
    <div ref="containerRef" class="absolute inset-0 z-0"></div>
    
    <!-- STATIC UI LAYER (No Tilt) -->
    <div class="absolute inset-0 z-20 pointer-events-none p-6 md:p-12 flex flex-col justify-between">
        <!-- HEADER -->
        <div class="w-full relative flex justify-between items-start pointer-events-auto">
            
            <!-- LEFT: RETURN -->
             <button @click="router.push('/selection')" class="z-10 px-6 py-2 border border-white/20 hover:bg-white/10 hover:border-white/50 text-white rounded text-xs font-bold tracking-widest transition-all backdrop-blur-md group">
                <span class="group-hover:-translate-x-1 inline-block transition-transform">&lt;</span> RETURN
             </button>

            <!-- CENTER: TITLE -->
            <div class="absolute left-1/2 -translate-x-1/2 top-0 flex flex-col items-center text-center">
                <div class="text-[10px] md:text-xs font-mono text-cyan-400 tracking-[0.4em] uppercase opacity-70 mb-1">Nexus Protocol</div>
                <h1 class="text-3xl md:text-5xl font-headers font-bold tracking-widest text-white uppercase drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">
                    Gate Selection
                </h1>
            </div>
            
            <!-- RIGHT: LEADERBOARD -->
            <button @click="router.push({ path: '/leaderboard', query: { category: 'games' } })" class="z-10 px-6 py-2 border border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/10 hover:border-cyan-400 rounded text-xs font-bold tracking-widest transition-all backdrop-blur-md group shadow-[0_0_10px_rgba(6,182,212,0.2)]">
                <span class="group-hover:scale-110 inline-block transition-transform">🏆</span> LEADERBOARD
            </button>
        </div>
    </div>

    <!-- DYNAMIC UI LAYER with 3D Transform -->
    <div ref="uiContainerRef" class="ui-layer absolute inset-0 z-10 pointer-events-none p-6 md:p-12 flex flex-col justify-end transition-opacity duration-500 will-change-transform">

        <!-- ACTIVE GATE INFO -->
        <div class="absolute bottom-24 left-0 w-full text-center pointer-events-none transition-all duration-300"
             :class="currentGate ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-10 scale-95'">
            
            <div v-if="currentGate" class="relative inline-block p-8">
                 <!-- Holographic Backing -->
                 <div class="absolute inset-0 bg-transparent backdrop-blur-sm border-x border-white/10 skew-x-12 -z-10 rounded-lg"></div>
                 
                 <div class="text-xs md:text-sm font-mono tracking-[0.4em] uppercase text-gray-400 mb-2">
                     {{ currentGate.sub }}
                 </div>
                 
                 <h2 class="text-4xl md:text-7xl font-headers font-black uppercase tracking-wider mb-4 leading-none text-transparent bg-clip-text bg-gradient-to-b from-white to-gray-400"
                     :style="{ dropShadow: `0 0 20px ${currentGate.color}` }">
                     {{ currentGate.title }}
                 </h2>
                 
                 <div class="flex items-center justify-center gap-4 mb-6">
                     <div class="h-[1px] w-12 bg-white/30"></div>
                     <span class="text-xs font-bold tracking-widest uppercase text-white/80">{{ currentGate.type }}</span>
                     <div class="h-[1px] w-12 bg-white/30"></div>
                 </div>

                 <div v-if="!currentGate.locked" class="text-cyan-400 text-xs tracking-[0.2em] uppercase font-bold animate-pulse">
                     [ Click to Enter Wormhole ]
                 </div>
                 <div v-else class="text-red-500 text-xs tracking-[0.2em] uppercase font-bold border border-red-500/30 px-4 py-2 bg-red-500/10 rounded">
                     ⚠️ Access Restricted
                 </div>
            </div>
            
        </div>

        <!-- FOOTER -->
        <div class="flex justify-between items-end text-[10px] font-mono text-gray-500 border-t border-white/10 pt-4 opacity-50">
            <div>
                SYS.STATUS: ONLINE<br>
                GRAVITY.FIELD: STABLE
            </div>
            <div>
                COORD: 00.99.21<br>
                SECURE
            </div>
        </div>

    </div>
    
    <!-- VIGNETTE -->
    <div class="absolute inset-0 z-20 pointer-events-none bg-[radial-gradient(circle_at_center,transparent_30%,#000000_120%)]"></div>

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
</style>