<script setup>
import { ref, onMounted, onUnmounted, reactive } from 'vue'
import { useRouter } from 'vue-router'
import * as THREE from 'three'

const router = useRouter()
const canvasRef = ref(null)

// State
const isLoading = ref(true)
const syncProgress = ref(0)
const isEntering = ref(false)
const systemLogs = reactive([])

// Three.js Core
let scene, camera, renderer, clock
let centralCore, ringSystem, starField
let animationId

const addLog = (msg) => {
    systemLogs.push({ id: Date.now(), text: msg })
    if (systemLogs.length > 5) systemLogs.shift()
}

const initThree = () => {
    scene = new THREE.Scene()
    clock = new THREE.Clock()
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)
    camera.position.z = 5

    renderer = new THREE.WebGLRenderer({ canvas: canvasRef.value, antialias: true, alpha: true })
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.setPixelRatio(window.devicePixelRatio)

    // --- GEOMETRY: THE CORE ---
    // Menggunakan Torus Knot sebagai 'Inti Partikel' yang kompleks
    const coreGeo = new THREE.TorusKnotGeometry(1, 0.3, 100, 16)
    const coreMat = new THREE.MeshStandardMaterial({ 
        color: 0x00f3ff, 
        wireframe: true,
        emissive: 0x0044ff,
        emissiveIntensity: 2
    })
    centralCore = new THREE.Mesh(coreGeo, coreMat)
    scene.add(centralCore)

    // --- RINGS OF DATA ---
    ringSystem = new THREE.Group()
    for(let i = 0; i < 3; i++) {
        const ringGeo = new THREE.TorusGeometry(2 + (i * 0.5), 0.01, 16, 100)
        const ringMat = new THREE.MeshBasicMaterial({ color: 0x00f3ff, transparent: true, opacity: 0.2 })
        const ring = new THREE.Mesh(ringGeo, ringMat)
        ring.rotation.x = Math.PI / (1.5 + i)
        ringSystem.add(ring)
    }
    scene.add(ringSystem)

    // --- LIGHTING ---
    const pointLight = new THREE.PointLight(0xffffff, 1)
    pointLight.position.set(5, 5, 5)
    scene.add(pointLight)

    // Fake Syncing Progress
    const interval = setInterval(() => {
        syncProgress.value += Math.floor(Math.random() * 5) + 1
        if(syncProgress.value % 20 === 0) addLog(`CALIBRATING_NODE_${syncProgress.value}... OK`)
        
        if(syncProgress.value >= 100) {
            syncProgress.value = 100
            isLoading.value = false
            addLog("NEURAL_LINK_STABLE. READY FOR INITIALIZATION.")
            clearInterval(interval)
        }
    }, 150)
}

const animate = () => {
    const elapsed = clock.getElapsedTime()
    animationId = requestAnimationFrame(animate)

    if (centralCore) {
        centralCore.rotation.y = elapsed * 0.5
        centralCore.rotation.z = elapsed * 0.2
        const scale = 1 + Math.sin(elapsed * 2) * 0.05
        centralCore.scale.set(scale, scale, scale)
    }

    if (ringSystem) {
        ringSystem.children.forEach((ring, i) => {
            ring.rotation.z += 0.01 * (i + 1)
        })
    }

    if (isEntering.value) {
        camera.position.z -= 0.2 // Effect maju menembus inti
        centralCore.scale.multiplyScalar(1.1)
    }

    renderer.render(scene, camera)
}

const handleResize = () => {
    camera.aspect = window.innerWidth / window.innerHeight
    camera.updateProjectionMatrix()
    renderer.setSize(window.innerWidth, window.innerHeight)
}

const startSimulation = () => {
    isEntering.value = true
    setTimeout(() => router.push('/selection'), 800)
}

onMounted(() => {
    initThree()
    animate()
    window.addEventListener('resize', handleResize)
    addLog("AWAKENING_SYSTEM_VOID...")
})

onUnmounted(() => {
    window.removeEventListener('resize', handleResize)
    cancelAnimationFrame(animationId)
})
</script>

<template>
    <div class="interface-container h-screen w-full bg-[#030712] overflow-hidden font-mono text-cyan-400">
        
        <canvas ref="canvasRef" class="fixed inset-0 z-0 pointer-events-none"></canvas>

        <div class="overlay-fx fixed inset-0 z-10 pointer-events-none opacity-40"></div>

        <div class="relative z-20 h-full p-6 flex flex-col justify-between select-none">
            
            <div class="flex justify-between items-start">
                <div class="hud-box-tl p-4 border-l-2 border-t-2 border-cyan-500/50 bg-cyan-500/5">
                    <div class="text-[10px] text-cyan-600 mb-1 tracking-widest uppercase">Operator_Unit</div>
                    <div class="text-xl font-black text-white italic">X-NEURAL_PILOT</div>
                </div>

                <div class="text-right">
                    <div class="flex items-center gap-4">
                        <div v-for="i in 5" :key="i" 
                             class="h-1 w-8" 
                             :class="syncProgress > (i*20) ? 'bg-cyan-400 shadow-[0_0_10px_cyan]' : 'bg-white/10'">
                        </div>
                    </div>
                    <div class="text-[10px] mt-2 text-cyan-500/60">BIOS_VERSION_8.0.44_STABLE</div>
                </div>
            </div>

            <div class="w-64 space-y-2 opacity-60">
                <div v-for="log in systemLogs" :key="log.id" class="text-[9px] flex items-center gap-2 animate-log">
                    <span class="w-1 h-1 bg-cyan-500"></span>
                    {{ log.text }}
                </div>
            </div>

            <div class="flex flex-col items-center gap-8">
                
                <div class="relative w-48 h-48 flex items-center justify-center">
                    <svg class="absolute inset-0 w-full h-full -rotate-90">
                        <circle cx="96" cy="96" r="80" stroke="currentColor" stroke-width="1" fill="transparent" class="text-white/10" />
                        <circle cx="96" cy="96" r="80" stroke="currentColor" stroke-width="2" fill="transparent" 
                                class="text-cyan-500 transition-all duration-300"
                                :stroke-dasharray="502"
                                :stroke-dashoffset="502 - (502 * syncProgress) / 100" />
                    </svg>
                    
                    <div class="text-center">
                        <div class="text-4xl font-black text-white tracking-tighter">{{ syncProgress }}%</div>
                        <div class="text-[8px] tracking-[0.3em] text-cyan-500">SYNC_RATE</div>
                    </div>
                </div>

                <div v-if="!isLoading" class="group relative">
                    <div class="absolute -inset-4 bg-cyan-500/20 blur-xl group-hover:bg-cyan-500/40 transition-all"></div>
                    <button @click="startSimulation" 
                            class="relative px-16 py-4 bg-white text-black font-black tracking-[0.5em] transition-all 
                                   hover:translate-y-[-2px] active:scale-95 clip-path-polygon">
                        ENTER_VOID
                    </button>
                </div>
                <div v-else class="text-[10px] tracking-[0.8em] animate-pulse text-cyan-600">
                    ESTABLISHING_NEURAL_LINK
                </div>
            </div>

            <div class="flex justify-between items-end border-b-2 border-cyan-500/20 pb-2">
                <div class="text-[9px] text-cyan-700 uppercase">
                    <p>Lat: 0.003124 | Lon: -1.24152</p>
                    <p>Connection: Encrypted_AES_256</p>
                </div>
                <div class="flex gap-12 text-[10px] font-bold tracking-widest">
                    <button class="hover:text-white transition-all underline decoration-cyan-500/50">ARCHIVE</button>
                    <button class="hover:text-white transition-all underline decoration-cyan-500/50">SYSTEM_ERR</button>
                    <button class="hover:text-white transition-all underline decoration-cyan-500/50 text-red-500">DISCONNECT</button>
                </div>
            </div>

        </div>
    </div>
</template>

<style scoped>
/* Clip Path untuk tombol bergaya futuristik (asimetris) */
.clip-path-polygon {
    clip-path: polygon(10% 0%, 100% 0%, 90% 100%, 0% 100%);
}

.interface-container {
    background: radial-gradient(circle at center, #0a192f 0%, #030712 100%);
}

/* Overlay Grain Effect */
.overlay-fx {
    background-image: url("https://grainy-gradients.vercel.app/noise.svg");
    filter: contrast(150%) brightness(100%);
}

/* Animation Log */
.animate-log {
    animation: slideRight 0.3s ease-out forwards;
}

@keyframes slideRight {
    from { opacity: 0; transform: translateX(-10px); }
    to { opacity: 1; transform: translateX(0); }
}

/* scanline effect */
.interface-container::after {
  content: " ";
  display: block;
  position: absolute;
  top: 0; left: 0; bottom: 0; right: 0;
  background: linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%), 
              linear-gradient(90deg, rgba(255, 0, 0, 0.06), rgba(0, 255, 0, 0.02), rgba(0, 0, 255, 0.06));
  z-index: 15;
  background-size: 100% 4px, 3px 100%;
  pointer-events: none;
}
</style>