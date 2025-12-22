<script setup>
import { ref, onMounted, onUnmounted, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import gsap from 'gsap'

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
const currentFactIdx = ref(0)
const showQuiz = ref(false)
const quizAnswered = ref(null)
const cameraError = ref(null)

// Typewriter State
const displayedFact = ref("") 
let typingInterval = null

// --- 3D VARS ---
let scene, camera, renderer, controls, planetMesh, starMesh
let animationFrame

// --- AUDIO ASSISTANT ---
const speak = (text) => {
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel()
        const utterance = new SpeechSynthesisUtterance(text)
        utterance.lang = 'id-ID'
        utterance.rate = 1.0; utterance.pitch = 1.0
        utterance.onstart = () => { isSpeaking.value = true }
        utterance.onend = () => { isSpeaking.value = false }
        window.speechSynthesis.speak(utterance)
    }
}

const toggleAudio = () => {
    if (isSpeaking.value) {
        window.speechSynthesis.cancel(); isSpeaking.value = false
    } else {
        const fact = planetData.value.funFacts[currentFactIdx.value]
        speak(fact)
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

    const loader = new GLTFLoader()
    const modelPath = `/textures/${planetData.value.file}`
    loader.load(modelPath, (gltf) => {
        planetMesh = gltf.scene
        const box = new THREE.Box3().setFromObject(planetMesh)
        const size = box.getSize(new THREE.Vector3()).length()
        const scale = 5 / size 
        planetMesh.scale.set(scale, scale, scale)
        scene.add(planetMesh)
        
        // Animasi muncul
        planetMesh.scale.set(0,0,0)
        gsap.to(planetMesh.scale, { x: scale, y: scale, z: scale, duration: 1.5, ease: "elastic.out(1, 0.5)" })
    })

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
            speak("Mode AR aktif. Silakan zoom dan putar planet dengan jari Anda.")

        } catch (err) {
            console.error(err)
            cameraError.value = "Izin kamera ditolak."
            speak("Gagal akses kamera.")
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
    window.speechSynthesis.cancel(); isSpeaking.value = false
}

const answerQuiz = (userAns) => {
    const isCorrect = userAns === planetData.value.quiz.a
    quizAnswered.value = isCorrect ? 'correct' : 'wrong'
    speak((isCorrect ? "Benar! " : "Salah. ") + planetData.value.quiz.explain)
}

const goBack = () => {
    stopAR()
    router.push('/explore')
}

onMounted(() => { initScene() })

onUnmounted(() => {
    window.removeEventListener('resize', handleResize)
    cancelAnimationFrame(animationFrame)
    stopAR()
    if(typingInterval) clearInterval(typingInterval)
    window.speechSynthesis.cancel()
    if (scene) scene.clear()
    if (renderer) renderer.dispose()
})

watch(() => route.params.id, () => {
    initScene()
    currentFactIdx.value = 0
})
</script>

<template>
  <div class="relative w-full h-screen bg-black overflow-hidden font-sans select-none text-white">
    
    <video ref="videoRef" 
           class="absolute inset-0 w-full h-full object-cover z-0 transition-opacity duration-500"
           :class="isARMode ? 'opacity-100' : 'opacity-0 pointer-events-none'"
           playsinline muted autoplay></video>

    <div ref="containerRef" class="absolute inset-0 z-10 cursor-move active:cursor-grabbing"></div>

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

            <button @click="toggleAudio" class="w-12 h-12 bg-black/40 backdrop-blur-md border border-white/20 rounded-xl flex items-center justify-center transition-all"
                :class="isSpeaking ? 'border-green-500 text-green-400 shadow-[0_0_15px_rgba(34,197,94,0.4)]' : 'hover:border-yellow-400 hover:text-yellow-300'">
                <span class="text-xl">{{ isSpeaking ? '🔊' : '🔈' }}</span>
                <div v-if="isSpeaking" class="absolute inset-0 flex items-center justify-center gap-[2px] opacity-30">
                     <div class="w-1 bg-green-400 animate-wave h-3"></div>
                     <div class="w-1 bg-green-400 animate-wave h-5 delay-75"></div>
                     <div class="w-1 bg-green-400 animate-wave h-2 delay-150"></div>
                </div>
            </button>
        </div>

        <div class="w-full pointer-events-auto transition-all duration-500 flex justify-center px-4 pb-6 md:pb-10"
             :class="[showQuiz ? 'translate-y-[150%] opacity-0' : 'translate-y-0 opacity-100']">
            
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
                            <button @click="showQuiz = true" class="flex-1 md:flex-none relative overflow-hidden bg-fuchsia-600/20 hover:bg-fuchsia-600/40 border border-fuchsia-500/50 text-fuchsia-300 px-6 py-3 rounded text-sm font-bold tracking-wider uppercase transition-all active:scale-95">
                                <span class="relative z-10 flex items-center justify-center gap-2">QUIZ <span class="text-xs">?</span></span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div v-if="showQuiz" class="absolute inset-0 z-50 flex items-end md:items-center justify-center pointer-events-none">
            <div class="absolute inset-0 bg-black/80 backdrop-blur-sm pointer-events-auto transition-opacity" @click="showQuiz = false"></div>
            <div class="bg-gray-900 border-t-2 md:border-2 border-fuchsia-500/50 w-full md:w-[600px] rounded-t-3xl md:rounded-3xl p-6 md:p-8 shadow-[0_0_50px_rgba(192,38,211,0.3)] relative animate-slide-up pointer-events-auto pb-safe overflow-hidden">
                <button @click="showQuiz = false; quizAnswered = null" class="absolute top-4 right-4 text-gray-400 hover:text-white transition text-xl">✕</button>
                <div class="relative z-10">
                    <div class="text-center mb-6">
                        <span class="text-fuchsia-400 font-mono text-xs tracking-[0.3em] uppercase border-b border-fuchsia-500/30 pb-1">Quiz Protocol</span>
                        <h3 class="text-xl md:text-2xl font-bold mt-4 text-white leading-relaxed">{{ planetData.quiz.q }}</h3>
                    </div>
                    <div v-if="!quizAnswered" class="grid grid-cols-2 gap-4">
                        <button @click="answerQuiz(true)" class="bg-gradient-to-br from-gray-800 to-gray-900 hover:from-green-900/50 border border-white/10 hover:border-green-500 p-6 rounded-xl transition-all group">
                            <div class="text-2xl mb-2 group-hover:scale-110">👍</div>
                            <div class="font-bold text-gray-300 group-hover:text-green-400">BENAR</div>
                        </button>
                        <button @click="answerQuiz(false)" class="bg-gradient-to-br from-gray-800 to-gray-900 hover:from-red-900/50 border border-white/10 hover:border-red-500 p-6 rounded-xl transition-all group">
                            <div class="text-2xl mb-2 group-hover:scale-110">👎</div>
                            <div class="font-bold text-gray-300 group-hover:text-red-400">SALAH</div>
                        </button>
                    </div>
                    <div v-else class="text-center animate-fade-in">
                        <h4 class="text-xl font-bold mb-2" :class="quizAnswered === 'correct' ? 'text-green-400' : 'text-red-400'">
                            {{ quizAnswered === 'correct' ? 'ACCESS GRANTED' : 'ACCESS DENIED' }}
                        </h4>
                        <p class="text-gray-300 text-sm mb-6">{{ planetData.quiz.explain }}</p>
                        <button @click="showQuiz = false; quizAnswered = null" class="w-full bg-white text-black font-bold py-3 rounded hover:bg-gray-200 transition">LANJUT</button>
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