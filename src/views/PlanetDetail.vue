<script setup>
import { ref, onMounted, onUnmounted, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import gsap from 'gsap'
import speech from '../utils/speech'

// --- IMPORT DATA ---
import { solarData } from '../data/planets.js'

// --- SETUP ---
const route = useRoute()
const router = useRouter()
const containerRef = ref(null)
const videoRef = ref(null)

// --- DATA LOGIC ---
const planetData = computed(() => {
    const idFromUrl = parseInt(route.params.id)
    return solarData.find(p => p.id === idFromUrl) || solarData[0]
})

// --- STATE ---
const isARMode = ref(false)
const isSpeaking = ref(false)
const speechAvailable = ref(false)
const voiceStatusMsg = ref('')
const enableSpeech = async () => {
    try {
        voiceStatusMsg.value = 'Memuat suara...'
        await speech.initVoices()
        const c = speech.getVoicesCount()
        voiceStatusMsg.value = c ? `Suara siap (${c})` : 'Tidak ada suara terdeteksi'
        speechAvailable.value = speech.isAvailable() && c > 0
    } catch (e) {
        voiceStatusMsg.value = 'Gagal memuat suara'
        console.warn('[Speech] enable failed', e)
    }
}
const currentFactIdx = ref(0)
const cameraError = ref(null)

// Typewriter State
const displayedFact = ref("") 
let typingInterval = null

// --- 3D VARS ---
let scene, camera, renderer, controls, planetMesh, starMesh
let animationFrame
const loader = new GLTFLoader()
// Objects and timeline used for event demos (gerhana, musim, komet)
let eventObjects = []
let eventTimeline = null
const currentEvent = computed(() => route.query.event || null)

const cleanupScene = () => {
    // stop any running timelines and animations
    try { if (eventTimeline) { eventTimeline.kill(); eventTimeline = null } } catch(e){}
    try { if (animationFrame) cancelAnimationFrame(animationFrame) } catch(e){}
    try { if (controls) controls.dispose() } catch(e){}
    try { if (renderer) { renderer.dispose(); renderer = null } } catch(e){}
    try { if (scene) { scene.clear(); scene = null } } catch(e){}

    // remove event objects
    eventObjects.forEach(o => { try { scene && scene.remove(o) } catch(e){} })
    eventObjects = []
} 

// --- AUDIO ASSISTANT ---
const speak = async (text) => {
    if (!speech.isAvailable()) return
    try {
        isSpeaking.value = true
        await speech.speak(text, { lang: 'id-ID', rate: 1.0, pitch: 1.0 })
    } catch (e) {
        console.warn('[Speech] speak error', e)
    } finally {
        isSpeaking.value = false
    }
}

const toggleAudio = async () => {
    if (isSpeaking.value) {
        speech.cancel(); isSpeaking.value = false
    } else {
        const fact = planetData.value.funFacts[currentFactIdx.value]
        try { await speak(fact) } catch(e) { console.warn(e) }
    }
}

// --- TYPEWRITER ---
const typeText = (text) => {
    if (typingInterval) clearInterval(typingInterval)
    displayedFact.value = ""
    let i = 0
    typingInterval = setInterval(() => {
        if (i < text.length) { displayedFact.value += text.charAt(i); i++ } 
        else { clearInterval(typingInterval) }
    }, 30) 
}

watch(currentFactIdx, () => {
    typeText(planetData.value.funFacts[currentFactIdx.value])
})

// --- 3D SCENE SETUP ---
const initScene = () => {
    if (containerRef.value) containerRef.value.innerHTML = ''
    const w = window.innerWidth; const h = window.innerHeight

    scene = new THREE.Scene()
    scene.background = new THREE.Color(0x050510)
    scene.fog = new THREE.FogExp2(0x050510, 0.02)

    camera = new THREE.PerspectiveCamera(60, w / h, 0.1, 1000)
    camera.position.set(0, 0, 12) // Posisi awal kamera

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }) 
    renderer.setSize(w, h)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    
    // PENTING: touchAction none agar swipe tidak men-scroll halaman web
    renderer.domElement.style.touchAction = 'none' 
    containerRef.value.appendChild(renderer.domElement)

    // --- SETUP CONTROLS (Tuning Interaksi Jari) ---
    controls = new OrbitControls(camera, renderer.domElement)
    
    // 1. Agar gerakan halus (momentum)
    controls.enableDamping = true 
    controls.dampingFactor = 0.05
    
    // 2. Zoom (Cubit)
    controls.enableZoom = true
    controls.zoomSpeed = 1.5 // Sedikit lebih responsif
    
    // 3. Batasi Zoom (Supaya gak tembus ke dalam planet atau terlalu jauh)
    controls.minDistance = 3 
    controls.maxDistance = 20

    // 4. PENTING: Matikan Pan (Geser Kanan/Kiri)
    // Supaya planet tetap di tengah layar saat dicubit/putar
    controls.enablePan = false 

    // 5. Auto Rotate (Opsional: akan berhenti otomatis saat user menyentuh layar)
    controls.autoRotate = true
    controls.autoRotateSpeed = 2

    // Lighting
    const ambient = new THREE.AmbientLight(0xffffff, 0.8)
    scene.add(ambient)
    const sunLight = new THREE.DirectionalLight(0xffffff, 2.5)
    sunLight.position.set(5, 10, 7)
    scene.add(sunLight)

    addFunStars()

    const modelPath = `/textures/${planetData.value.file}`
    loader.load(
        modelPath,
        (gltf) => {
            planetMesh = gltf.scene
            const box = new THREE.Box3().setFromObject(planetMesh)
            const size = box.getSize(new THREE.Vector3()).length()
            const scale = 5 / size 
            planetMesh.scale.set(scale, scale, scale)
            scene.add(planetMesh)

            // Animasi muncul
            planetMesh.scale.set(0,0,0)
            gsap.to(planetMesh.scale, { x: scale, y: scale, z: scale, duration: 1.5, ease: "elastic.out(1, 0.5)", onComplete: () => {
                // setelah planet muncul, jalankan demo event jika ada
                if (currentEvent.value) {
                    applyEventEffect(currentEvent.value)
                }
            }})
        },
        undefined,
        (err) => {
            console.warn(`Gagal load GLTF ${modelPath}`, err)
            // fallback: try loading as simple textured sphere (use texture file with same base name)
            const base = planetData.value.file.replace(/\.glb$/i, '')
            const texPathJpg = `/textures/${base}.jpg`
            const texPathPng = `/textures/${base}.png`
            const texLoader = new THREE.TextureLoader()
            texLoader.load(
                texPathJpg,
                (tex) => {
                    const radius = 3
                    planetMesh = new THREE.Mesh(new THREE.SphereGeometry(radius, 32, 32), new THREE.MeshStandardMaterial({ map: tex }))
                    scene.add(planetMesh)
                    planetMesh.scale.set(0,0,0)
                    gsap.to(planetMesh.scale, { x: 1, y: 1, z: 1, duration: 1.5, ease: "elastic.out(1, 0.5)", onComplete: () => { if (currentEvent.value) applyEventEffect(currentEvent.value) } })
                },
                undefined,
                () => {
                    // try png
                    texLoader.load(
                        texPathPng,
                        (tex2) => {
                            const radius = 3
                            planetMesh = new THREE.Mesh(new THREE.SphereGeometry(radius, 32, 32), new THREE.MeshStandardMaterial({ map: tex2 }))
                            scene.add(planetMesh)
                            planetMesh.scale.set(0,0,0)
                            gsap.to(planetMesh.scale, { x: 1, y: 1, z: 1, duration: 1.5, ease: "elastic.out(1, 0.5)", onComplete: () => { if (currentEvent.value) applyEventEffect(currentEvent.value) } })
                        },
                        undefined,
                        () => {
                            // final fallback: plain sphere with color
                            const radius = 3
                            planetMesh = new THREE.Mesh(new THREE.SphereGeometry(radius, 32, 32), new THREE.MeshStandardMaterial({ color: planetData.value.color || 0x888888 }))
                            scene.add(planetMesh)
                            planetMesh.scale.set(0,0,0)
                            gsap.to(planetMesh.scale, { x: 1, y: 1, z: 1, duration: 1.5, ease: "elastic.out(1, 0.5)", onComplete: () => { if (currentEvent.value) applyEventEffect(currentEvent.value) } })
                        }
                    )
                }
            )
        }
    )

    animate()
    window.addEventListener('resize', handleResize)
    typeText(planetData.value.funFacts[0])
}

const addFunStars = () => {
    const geometry = new THREE.BufferGeometry()
    const count = 1000
    const pos = new Float32Array(count * 3)
    const colors = new Float32Array(count * 3)
    for(let i=0; i<count*3; i+=3) {
        pos[i] = (Math.random() - 0.5) * 60
        pos[i+1] = (Math.random() - 0.5) * 60
        pos[i+2] = (Math.random() - 0.5) * 60
        colors[i] = Math.random(); colors[i+1] = Math.random(); colors[i+2] = 1
    }
    geometry.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    const material = new THREE.PointsMaterial({ size: 0.2, vertexColors: true })
    starMesh = new THREE.Points(geometry, material)
    scene.add(starMesh)
}

// --- AR LOGIC ---
const toggleAR = async () => {
    if (!isARMode.value) {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ 
                video: { facingMode: 'environment' } 
            })
            if (videoRef.value) {
                videoRef.value.srcObject = stream
                videoRef.value.play()
            }
            scene.background = null 
            scene.fog = null
            if(starMesh) starMesh.visible = false 
            
            isARMode.value = true
            cameraError.value = null
            try { await speak("Mode AR aktif. Silakan zoom dan putar planet dengan jari Anda.") } catch(e) { console.warn(e) }

        } catch (err) {
            console.error(err)
            cameraError.value = "Izin kamera ditolak."
            try { await speak("Gagal akses kamera.") } catch(e) { console.warn(e) }
        }
    } else {
        stopAR()
    }
}

const stopAR = () => {
    if (videoRef.value && videoRef.value.srcObject) {
        const tracks = videoRef.value.srcObject.getTracks()
        tracks.forEach(track => track.stop())
        videoRef.value.srcObject = null
    }
    scene.background = new THREE.Color(0x050510)
    scene.fog = new THREE.FogExp2(0x050510, 0.02)
    if(starMesh) starMesh.visible = true
    isARMode.value = false
}

const animate = () => {
    animationFrame = requestAnimationFrame(animate)
    controls.update() // Wajib update agar damping/momentum berfungsi
    if (starMesh) starMesh.rotation.y += 0.0005
    renderer.render(scene, camera)
}

const handleResize = () => {
    if(!containerRef.value) return
    const w = window.innerWidth; const h = window.innerHeight
    camera.aspect = w / h
    camera.updateProjectionMatrix()
    renderer.setSize(w, h)
}

const nextFact = () => {
    currentFactIdx.value = (currentFactIdx.value + 1) % planetData.value.funFacts.length
    // Animasi putar cepat saat ganti fakta
    if(planetMesh) gsap.to(planetMesh.rotation, {y: planetMesh.rotation.y + Math.PI*2, duration: 1.5, ease: "power2.inOut"})
    try { speech.cancel() } catch(e) { console.warn('[Speech] cancel failed', e) }
    isSpeaking.value = false
}



const goBack = () => {
    stopAR()
    router.push('/explore')
}

onMounted(() => { 
    initScene()
    try {
        speechAvailable.value = speech.isAvailable()
        if (speechAvailable.value) {
            speech.initVoices()
                .then(() => {
                    const c = speech.getVoicesCount()
                    speechAvailable.value = c > 0
                    voiceStatusMsg.value = c ? `Suara siap (${c})` : 'Tidak ada suara terdeteksi'
                    console.log('[Speech] warm-up voices:', c)
                })
                .catch(e => { console.warn('[Speech] init failed', e); voiceStatusMsg.value = 'Gagal memuat suara' })
        } else {
            voiceStatusMsg.value = 'Speech tidak didukung di browser ini'
        }
    } catch(e) { console.warn('[Speech] check failed', e); voiceStatusMsg.value = 'Gagal periksa kemampuan suara' }
})

const applyEventEffect = async (eventType) => {
    // clear previous event objects
    eventObjects.forEach(o => { try { scene.remove(o) } catch(e){} })
    eventObjects = []
    try { if (eventTimeline) { eventTimeline.kill(); eventTimeline = null } } catch(e){}

    if (!scene || !planetMesh) return

    if (eventType === 'solar-eclipse' || eventType === 'lunar-eclipse') {
        // compute a base scale from the planet so objects keep consistent visual size
        const planetBox = new THREE.Box3().setFromObject(planetMesh)
        const planetSizeVec = planetBox.getSize(new THREE.Vector3())
        const base = Math.max(planetSizeVec.length(), 5)

        // load sun and moon (fallback to simple spheres)
        const sunObj = await new Promise(res => loader.load('/textures/sun.glb', g => res(g.scene), undefined, () => res(null)))
        const moonObj = await new Promise(res => loader.load('/textures/moon.glb', g => res(g.scene), undefined, () => res(null)))

        // create/scale sun relative to planet
        let sun
        if (sunObj) {
            sun = sunObj
            const box = new THREE.Box3().setFromObject(sun)
            const size = box.getSize(new THREE.Vector3()).length() || 1
            const desired = base * 0.9
            const sScale = desired / size
            sun.scale.set(sScale, sScale, sScale)
        } else {
            sun = new THREE.Mesh(
                new THREE.SphereGeometry(base * 0.9, 32, 32),
                new THREE.MeshStandardMaterial({ color: 0xFDB813, emissive: 0xffffaa, emissiveIntensity: 1.8, roughness: 0.25 })
            )
        }
        sun.position.set(-base * 2.5, 0, -base * 0.15)
        sun.castShadow = false

        // create/scale moon relative to planet
        let moon
        if (moonObj) {
            moon = moonObj
            const box = new THREE.Box3().setFromObject(moon)
            const size = box.getSize(new THREE.Vector3()).length() || 1
            const desired = Math.max(0.12, base * 0.25)
            const mScale = desired / size
            moon.scale.set(mScale, mScale, mScale)
        } else {
            moon = new THREE.Mesh(
                new THREE.SphereGeometry(Math.max(0.12, base * 0.25), 16, 16),
                new THREE.MeshStandardMaterial({ color: 0x999999 })
            )
        }
        const orbitRadius = base * 1.6
        moon.position.set(orbitRadius, 0, 0)

        scene.add(sun); scene.add(moon)
        eventObjects.push(sun, moon)

        // orbit animation using planet-based radius
        eventTimeline = gsap.timeline({ repeat: -1 })
        eventTimeline.to(moon.position, { x: -orbitRadius, z: 0, duration: 3, ease: 'power1.inOut' })
                    .to(moon.position, { x: orbitRadius, z: 0, duration: 3, ease: 'power1.inOut' })

        // dim ambient light briefly at alignment
        const amb = scene.children.find(c => c.type === 'AmbientLight')
        if (amb) eventTimeline.to(amb, { intensity: 0.05, duration: 0.6, yoyo: true, repeat: 1 }, 2)

        speak('Menampilkan simulasi gerhana. Geser atau putar untuk melihat dari sudut berbeda.')
    }
    else if (eventType === 'seasons') {
        // tilt planet and slowly move sun light
        planetMesh.rotation.z = THREE.MathUtils.degToRad(23.5)
        const sunLight = scene.children.find(c => c.type === 'DirectionalLight')
        if (sunLight) eventTimeline = gsap.to(sunLight.position, { x: 12, z: 8, duration: 6, yoyo: true, repeat: -1, ease: 'sine.inOut' })
        speak('Menampilkan pergantian musim. Perhatikan kemiringan poros bumi.')
    }
    else if (eventType === 'day-night') {
        eventTimeline = gsap.to(planetMesh.rotation, { y: planetMesh.rotation.y + Math.PI * 2, duration: 8, repeat: -1, ease: 'linear' })
        speak('Menampilkan rotasi harian: perhatikan batas siang dan malam.')
    }
    else if (eventType === 'comet') {
        // scale comets relative to planet so they feel proportional on detail view
        const planetBox = new THREE.Box3().setFromObject(planetMesh)
        const base = Math.max(planetBox.getSize(new THREE.Vector3()).length(), 5)
        const count = 20
        for (let i=0; i<count; i++) {
            const radius = Math.max(0.03, base * 0.03)
            const c = new THREE.Mesh(new THREE.SphereGeometry(radius, 6, 6), new THREE.MeshBasicMaterial({ color: 0xffffff }))
            c.position.set(base * 4 + Math.random() * base * 3, (Math.random() - 0.5) * base * 2, (Math.random() - 0.5) * base * 2)
            scene.add(c); eventObjects.push(c)
            gsap.to(c.position, {
                x: -base * 4,
                duration: 3 + Math.random() * 5,
                repeat: -1,
                ease: 'linear',
                delay: Math.random() * 3,
                onRepeat() { this.targets()[0].position.set(base * 4 + Math.random() * base * 2, (Math.random() - 0.5) * base * 2, (Math.random() - 0.5) * base * 2) }
            })
        }
        speak('Menampilkan hujan komet. Perhatikan lintasan acak dan cepat.')
    } else {
        // unknown event: do nothing
    }
}

// re-run event when query changes
watch(currentEvent, (val) => {
    if (val && planetMesh) applyEventEffect(val)
})

onUnmounted(() => {
    window.removeEventListener('resize', handleResize)
    stopAR()
    if(typingInterval) clearInterval(typingInterval)
    try { speech.cancel() } catch(e) { console.warn('[Speech] cancel failed', e) }
    cleanupScene()
})

watch(() => route.params.id, () => {
    initScene()
    currentFactIdx.value = 0
})
</script>

<template>
  <div class="relative w-full h-screen bg-black overflow-hidden font-sans select-none text-white pointer-events-auto">
    
    <video ref="videoRef" 
           class="absolute inset-0 w-full h-full object-cover z-0 transition-opacity duration-500"
           :class="isARMode ? 'opacity-100' : 'opacity-0 pointer-events-none'"
           playsinline muted autoplay></video>

    <div ref="containerRef" class="absolute inset-0 z-10 cursor-move active:cursor-grabbing pointer-events-auto"></div>

    <div class="absolute inset-0 z-20 flex flex-col pointer-events-none">
        
        <div class="flex justify-between items-start p-4 md:p-8 pointer-events-auto bg-gradient-to-b from-black/90 via-black/40 to-transparent transition-all"
             :class="isARMode ? 'opacity-0 md:opacity-100' : 'opacity-100'">
            
            <button @click="goBack" class="group flex items-center gap-3 px-4 py-2 rounded-lg bg-white/5 border border-white/10 backdrop-blur hover:bg-white/10 transition-all hover:border-cyan-400/50">
                <span class="text-xl">❮</span>
                <div class="flex flex-col items-start">
                    <span class="text-[10px] text-gray-400 tracking-widest uppercase">System</span>
                    <span class="font-bold text-sm tracking-wide">RETURN</span>
                </div>
            </button>

            <div class="flex flex-col items-end">
                <h1 class="text-4xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-blue-500 italic uppercase tracking-tighter drop-shadow-[0_0_10px_rgba(6,182,212,0.5)]">
                    {{ planetData.name }}
                </h1>
            </div>
        </div>

        <div class="flex-1"></div>

        <div v-if="cameraError" class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-red-600/90 text-white p-4 rounded-xl backdrop-blur max-w-xs text-center pointer-events-auto">
            <p class="font-bold mb-2">⚠ Error Kamera</p>
            <p class="text-sm">{{ cameraError }}</p>
            <button @click="cameraError = null" class="mt-3 bg-white/20 px-4 py-1 rounded text-sm hover:bg-white/30">Tutup</button>
        </div>

        <div class="absolute right-4 top-24 md:top-1/3 flex flex-col gap-4 pointer-events-auto">
            <button @click="toggleAR" 
                class="w-12 h-12 backdrop-blur-md border rounded-xl flex items-center justify-center transition-all group relative overflow-hidden"
                :class="isARMode ? 'bg-red-500/20 border-red-400 text-red-400 animate-pulse' : 'bg-black/40 border-white/20 text-white hover:border-cyan-400 hover:text-cyan-300'">
                <span class="text-xl relative z-10">{{ isARMode ? '✕' : '👁' }}</span>
                <span class="absolute right-14 bg-black/80 text-white text-[10px] px-2 py-1 rounded border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                    {{ isARMode ? 'STOP AR' : 'START AR' }}
                </span>
            </button>

            <button @click="toggleAudio" :disabled="!speechAvailable" class="w-12 h-12 bg-black/40 backdrop-blur-md border border-white/20 rounded-xl flex items-center justify-center transition-all"
                :class="isSpeaking ? 'border-green-500 text-green-400 shadow-[0_0_15px_rgba(34,197,94,0.4)] pointer-events-auto' : (!speechAvailable ? 'opacity-50 cursor-not-allowed' : 'hover:border-yellow-400 hover:text-yellow-300')">
                <span class="text-xl">{{ isSpeaking ? '🔊' : '🔈' }}</span>
                <div v-if="isSpeaking" class="absolute inset-0 flex items-center justify-center gap-[2px] opacity-30">
                     <div class="w-1 bg-green-400 animate-wave h-3"></div>
                     <div class="w-1 bg-green-400 animate-wave h-5 delay-75"></div>
                     <div class="w-1 bg-green-400 animate-wave h-2 delay-150"></div>
                </div>
            </button>
            <div class="mt-2 text-xs text-right text-slate-400 pointer-events-auto">
                <div class="whitespace-nowrap">{{ voiceStatusMsg }}</div>
                <button v-if="!speechAvailable" @click="enableSpeech" class="mt-1 text-xs px-2 py-1 bg-white/5 rounded hover:bg-white/10">Aktifkan Suara</button>
            </div>
        </div>

        <div class="w-full pointer-events-auto transition-all duration-500 flex justify-center px-4 pb-6 md:pb-10 translate-y-0 opacity-100">
            
            <div class="relative w-full max-w-4xl group">
                <div class="absolute -inset-[1px] bg-gradient-to-r from-cyan-500 via-purple-500 to-cyan-500 rounded-2xl opacity-50 blur-sm animate-gradient-xy" :class="isARMode ? 'opacity-20' : 'opacity-50'"></div>
                
                <div class="relative rounded-2xl border border-white/10 p-5 md:p-8 overflow-hidden transition-colors duration-500"
                     :class="isARMode ? 'bg-black/40 backdrop-blur-sm' : 'bg-gray-900/80 backdrop-blur-xl'">
                    
                    <div class="absolute top-0 left-0 w-full h-[2px] bg-cyan-400/50 shadow-[0_0_10px_#22d3ee] animate-scan"></div>
                    <div class="absolute top-0 left-0 w-4 h-4 border-l-2 border-t-2 border-cyan-400"></div>
                    <div class="absolute top-0 right-0 w-4 h-4 border-r-2 border-t-2 border-cyan-400"></div>
                    <div class="absolute bottom-0 left-0 w-4 h-4 border-l-2 border-b-2 border-cyan-400"></div>
                    <div class="absolute bottom-0 right-0 w-4 h-4 border-r-2 border-b-2 border-cyan-400"></div>

                    <div class="flex justify-between items-center mb-4 border-b border-white/10 pb-2">
                        <div class="flex items-center gap-2">
                            <span class="text-cyan-400 text-lg">⌬</span>
                            <span class="font-mono text-xs md:text-sm text-cyan-300 tracking-widest uppercase">
                                {{ isARMode ? 'AR INTERACTION READY' : 'INCOMING TRANSMISSION' }}
                            </span>
                        </div>
                        <span class="font-mono text-xs text-gray-400 bg-white/5 px-2 py-1 rounded">
                            DATA [0{{ currentFactIdx + 1 }}]
                        </span>
                    </div>

                    <div class="flex flex-col md:flex-row gap-6 items-start">
                        <div class="flex-1 min-h-[4rem]">
                            <p class="text-lg md:text-2xl font-medium leading-relaxed font-mono text-gray-100 text-shadow-sm">
                                <span class="text-cyan-400 mr-2">></span>
                                {{ displayedFact }}<span class="animate-pulse">_</span>
                            </p>
                        </div>

                        <div class="flex gap-3 w-full md:w-auto mt-2 md:mt-0">
                            <button @click="nextFact" class="flex-1 md:flex-none relative overflow-hidden bg-cyan-600/20 hover:bg-cyan-600/40 border border-cyan-500/50 text-cyan-300 px-6 py-3 rounded text-sm font-bold tracking-wider uppercase transition-all active:scale-95 group">
                                <span class="relative z-10 flex items-center justify-center gap-2">NEXT <span class="text-xs">⇥</span></span>
                            </button>
                            <button @click.stop="router.push({ name: 'quiz', params: { id: planetData.id } })" class="flex-1 md:flex-none relative overflow-hidden bg-fuchsia-600/20 hover:bg-fuchsia-600/40 border border-fuchsia-500/50 text-fuchsia-300 px-6 py-3 rounded text-sm font-bold tracking-wider uppercase transition-all active:scale-95">
                                <span class="relative z-10 flex items-center justify-center gap-2">QUIZ <span class="text-xs">?</span></span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>



    </div>
  </div>
</template>

<style scoped>
.text-shadow-sm { text-shadow: 0 1px 2px rgba(0,0,0,0.8); }
@keyframes scan { 0% { top: 0%; opacity: 0; } 50% { opacity: 1; } 100% { top: 100%; opacity: 0; } }
.animate-scan { animation: scan 3s linear infinite; }
@keyframes wave { 0%, 100% { height: 30%; } 50% { height: 80%; } }
.animate-wave { animation: wave 1s ease-in-out infinite; }
@keyframes gradient-xy { 0%, 100% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } }
.animate-gradient-xy { background-size: 200% 200%; animation: gradient-xy 3s ease infinite; }
@keyframes slide-up { from { transform: translateY(100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
.animate-slide-up { animation: slide-up 0.4s cubic-bezier(0.2, 0.8, 0.2, 1) forwards; }
@keyframes fade-in { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
.animate-fade-in { animation: fade-in 0.3s ease-out forwards; }
.pb-safe { padding-bottom: env(safe-area-inset-bottom, 20px); }
</style>