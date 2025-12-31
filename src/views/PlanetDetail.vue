<template>
  <div class="relative w-full h-screen bg-[#050510] overflow-hidden font-sans select-none text-white">
    
    <!-- BACKGROUND & 3D LAYERS -->
    <video
      ref="videoRef"
      class="absolute inset-0 w-full h-full object-cover z-0 transition-all duration-700 ease-in-out"
      :class="isARMode ? 'opacity-100 scale-100' : 'opacity-0 scale-110 pointer-events-none grayscale'"
      playsinline
      muted
      autoplay
    ></video>
    <div
      ref="containerRef"
      class="absolute inset-0 z-10 cursor-move active:cursor-grabbing pointer-events-auto"
    ></div>

    <!-- ATMOSPHERIC EFFECTS -->
    <div class="absolute inset-0 z-10 pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay"></div>
    <div class="absolute inset-0 z-10 pointer-events-none bg-radial-gradient"></div>

    <!-- UI LAYER -->
    <div class="absolute inset-0 z-20 pointer-events-none flex flex-col h-full">
      
      <!-- HEADER (Responsive) -->
      <header class="w-full p-4 md:p-6 flex justify-between items-start transition-all duration-500 z-30" :class="isARMode ? 'opacity-0 -translate-y-10' : 'opacity-100 translate-y-0'">
        
        <!-- BACK BUTTON -->
        <div class="pointer-events-auto">
          <button
            @click="goBack"
            class="group flex items-center gap-3 px-5 py-3 rounded-l-full rounded-r-lg bg-gray-900/80 border-l-4 border-cyan-500 border-y border-r border-white/10 backdrop-blur-md hover:bg-white/10 transition-all shadow-[0_4px_20px_rgba(0,0,0,0.5)]"
          >
            <span class="text-cyan-400 text-xl group-hover:-translate-x-1 transition-transform">❮</span>
            <div class="flex flex-col items-start leading-none">
              <span class="text-[9px] text-cyan-500 tracking-[0.2em] font-mono mb-1">SYSTEM</span>
              <span class="font-bold text-sm tracking-widest text-gray-100">RETURN</span>
            </div>
          </button>
        </div>

        <!-- PLANET TITLE -->
        <div class="flex flex-col items-end pointer-events-auto">
           <div class="flex items-center gap-2 text-[10px] md:text-xs font-mono text-cyan-400/80 tracking-widest mb-1 bg-black/40 px-2 py-1 rounded backdrop-blur-sm border border-white/5">
             <span class="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-pulse"></span>
             <span>ID: {{ planetData.id || '00' }}</span>
             <span class="hidden md:inline text-white/20">|</span>
             <span class="hidden md:inline">CLASS: PLANETARY</span>
          </div>
          <h1 class="text-5xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-cyan-100 to-cyan-400 uppercase tracking-tighter italic drop-shadow-[0_0_15px_rgba(34,211,238,0.5)]">
            {{ planetData.name }}
          </h1>
        </div>
      </header>

      <!-- DESKTOP CONTAINER (Flex Layout) -->
      <div class="hidden md:flex flex-1 mx-6 mb-6 gap-6 min-h-0 relative z-20">
        
        <!-- LEFT SIDEBAR: INFO PANEL (Desktop) -->
        <aside 
          class="w-[420px] flex flex-col pointer-events-auto transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]"
          :class="isARMode ? '-translate-x-[120%] opacity-0' : 'translate-x-0 opacity-100'"
        >
          <div class="flex-1 bg-black/70 backdrop-blur-2xl border border-white/10 rounded-2xl overflow-hidden flex flex-col shadow-2xl relative group hover:border-cyan-500/30 transition-colors">
            <!-- DECORATIVE LINES -->
            <div class="absolute top-0 right-0 p-3 opacity-50"><div class="w-12 h-12 border-t-2 border-r-2 border-cyan-500/30 rounded-tr-xl"></div></div>
            <div class="absolute bottom-0 left-0 p-3 opacity-50"><div class="w-12 h-12 border-b-2 border-l-2 border-cyan-500/30 rounded-bl-xl"></div></div>

            <!-- TABS -->
            <div class="p-2 grid grid-cols-4 gap-1 bg-black/50 border-b border-white/5">
              <button 
                v-for="tab in ['stats', 'structure', 'atmosphere', 'facts']" 
                :key="tab"
                @click="activeTab = tab"
                class="relative py-3 flex flex-col items-center justify-center rounded-lg transition-all duration-300 group/btn"
                :class="activeTab === tab ? 'bg-cyan-500/10 text-cyan-300' : 'hover:bg-white/5 text-gray-500 hover:text-white'"
              >
                <span class="text-xl mb-1 filter drop-shadow-md transition-transform group-hover/btn:scale-110">
                  {{ tab === 'stats' ? '📊' : tab === 'structure' ? '⚙️' : tab === 'atmosphere' ? '🌫️' : '✨' }}
                </span>
                <span class="text-[8px] font-bold uppercase tracking-wider opacity-80 md:inline hidden">{{ tab }}</span>
                <div v-if="activeTab === tab" class="absolute bottom-0 w-1/2 h-[2px] bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)] rounded-full"></div>
              </button>
            </div>

            <!-- CONTENT -->
            <div class="flex-1 overflow-y-auto p-6 scrollbar-hide relative text-shadow-sm">
              <Transition name="fade-slide" mode="out-in">
                <component :is="{
                   'stats': 'div', 'structure': 'div', 'atmosphere': 'div', 'facts': 'div'
                }[activeTab]" class="space-y-4">
                  <!-- STATS -->
                  <div v-if="activeTab === 'stats'" class="grid grid-cols-1 gap-3">
                     <div v-for="(stat, idx) in [
                        { icon: '🌡️', label: 'Avg Temp', value: planetData.quickStats?.temperature },
                        { icon: '⚖️', label: 'Gravity', value: planetData.quickStats?.gravity },
                        { icon: '📏', label: 'Diameter', value: planetData.quickStats?.diameter },
                        { icon: '🌙', label: 'Moons', value: planetData.quickStats?.moons?.toString() }
                      ]" :key="idx" 
                      class="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/5 hover:border-cyan-500/30 transition-all hover:bg-white/10 group/stat"
                    >
                      <div class="flex items-center gap-3">
                        <span class="text-2xl grayscale group-hover/stat:grayscale-0 transition-all duration-500">{{ stat.icon }}</span>
                        <span class="text-xs font-mono text-gray-400 uppercase tracking-widest">{{ stat.label }}</span>
                      </div>
                      <span class="text-lg font-bold text-white font-mono text-right">{{ stat.value || 'N/A' }}</span>
                    </div>
                  </div>

                  <!-- TEXT -->
                  <div v-else-if="activeTab === 'structure' || activeTab === 'atmosphere'" class="relative">
                    <h3 class="text-lg font-bold text-white mb-4 flex items-center gap-2 border-b border-white/10 pb-2">
                       <span class="text-cyan-400 font-mono text-xs p-1 bg-cyan-900/40 rounded">///</span>
                       <span class="tracking-widest">{{ activeTab === 'structure' ? 'COMPOSITION' : 'ATMOSPHERE' }}</span>
                    </h3>
                    <p class="text-base leading-relaxed text-gray-300 font-light tracking-wide text-justify">
                      {{ activeTab === 'structure' ? planetData.structure : planetData.atmosphere }}
                    </p>
                  </div>

                  <!-- FACTS -->
                  <div v-else class="flex flex-col h-full">
                    <div class="flex justify-between items-end mb-4">
                       <span class="text-[10px] font-mono text-cyan-400 animate-pulse bg-cyan-950/50 px-2 py-0.5 rounded border border-cyan-800">● LIVE CONNECTION</span>
                       <span class="text-xs font-mono text-gray-500">{{ currentFactIdx + 1 }} / {{ planetData.funFacts.length }}</span>
                    </div>

                    <div class="bg-black/80 rounded-lg border border-cyan-500/20 p-5 font-mono text-sm leading-relaxed text-cyan-50 shadow-[inset_0_0_20px_rgba(0,0,0,0.8)] relative overflow-hidden min-h-[120px]">
                      <div class="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 pointer-events-none"></div>
                      <span class="text-cyan-500 mr-2">➜</span>
                      {{ displayedFact }}<span class="w-1.5 h-4 bg-cyan-500 inline-block align-middle ml-1 animate-blink"></span>
                    </div>

                    <div class="mt-6 flex flex-col gap-4">
                      <div class="flex justify-center gap-1.5">
                         <button 
                          v-for="(_, idx) in planetData.funFacts" :key="idx"
                          @click="currentFactIdx = idx; typeText(planetData.funFacts[idx])"
                          class="w-full h-1 rounded-full transition-all"
                          :class="idx === currentFactIdx ? 'bg-cyan-400 shadow-[0_0_8px_cyan]' : 'bg-gray-800 hover:bg-gray-600'"
                         ></button>
                      </div>
                      <button @click="nextFact" class="w-full py-3 bg-white/5 hover:bg-cyan-500/20 border border-white/10 hover:border-cyan-500/50 text-xs font-bold uppercase tracking-widest text-white transition-all rounded-lg flex items-center justify-center gap-2 group/next">
                         Next Data Entry <span class="group-hover/next:translate-x-1 transition-transform">→</span>
                      </button>
                    </div>
                  </div>
                </component>
              </Transition>
            </div>
            
            <!-- QUIZ ACTION -->
            <div class="p-4 border-t border-white/10 bg-gradient-to-t from-fuchsia-900/40 to-transparent">
              <button
                @click="router.push({ name: 'quiz', params: { id: planetData.id }, query: { from: 'planet-detail' } })"
                class="w-full relative overflow-hidden group bg-fuchsia-600 hover:bg-fuchsia-500 text-white p-4 rounded-xl font-bold uppercase tracking-wider transition-all shadow-[0_0_20px_rgba(192,38,211,0.4)] hover:shadow-[0_0_30px_rgba(192,38,211,0.6)]"
              >
                <div class="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                <span class="relative z-10 flex items-center justify-center gap-2">
                  <span>🚀</span> LAUNCH MISSION
                </span>
              </button>
            </div>
          </div>
        </aside>

        <div class="flex-1 pointer-events-none"></div>

        <!-- RIGHT SIDEBAR: TOOLS (Desktop) -->
        <aside class="flex flex-col gap-4 items-end pointer-events-auto z-30 pt-10">
          <button
            @click="router.push('/leaderboard')"
            class="flex items-center gap-3 px-4 py-2 bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/30 rounded-lg backdrop-blur-md transition-all group shadow-lg"
          >
            <span class="text-xl">🏆</span>
            <span class="text-xs font-bold text-yellow-200 group-hover:text-yellow-100">LEADERBOARD</span>
          </button>

          <div class="flex flex-col gap-3 mt-4">
             <!-- Audio Button -->
             <div class="relative group flex items-center justify-end">
               <span class="absolute right-14 bg-black/90 text-white text-[10px] px-2 py-1 rounded border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">{{ voiceStatusMsg || 'AI Assistant' }}</span>
               <button @click="toggleAudio" :disabled="!speechAvailable" class="w-12 h-12 rounded-xl backdrop-blur-md border flex items-center justify-center transition-all relative overflow-hidden shadow-lg hover:scale-105 active:scale-95" :class="isSpeaking ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' : 'bg-black/60 border-white/20 text-white hover:bg-white/20'">
                  <div v-if="isSpeaking" class="absolute inset-0 flex items-center justify-center gap-[3px] opacity-50"><div class="w-[3px] bg-emerald-400 animate-wave h-3"></div><div class="w-[3px] bg-emerald-400 animate-wave h-5 delay-75"></div><div class="w-[3px] bg-emerald-400 animate-wave h-2 delay-150"></div></div>
                  <span class="relative z-10 text-xl">{{ isSpeaking ? '🔊' : '🔈' }}</span>
               </button>
             </div>
             
             <!-- AR Button -->
             <button @click="toggleAR" class="w-12 h-12 rounded-xl backdrop-blur-md border flex items-center justify-center transition-all relative overflow-hidden shadow-lg hover:scale-105 active:scale-95" :class="isARMode ? 'bg-red-500/20 border-red-500 text-red-500 animate-pulse-slow' : 'bg-black/60 border-white/20 text-white hover:border-cyan-400 hover:text-cyan-400'">
                <span class="text-xl font-bold">{{ isARMode ? '✕' : 'AR' }}</span>
             </button>
          </div>
        </aside>

      </div>

      <!-- MOBILE LAYOUT (Tools Top Right, Info Bottom Sheet) -->
      <div class="md:hidden absolute inset-0 pointer-events-none z-20">
         
         <!-- Top Right Tools -->
         <div class="absolute top-20 right-4 flex flex-col gap-3 pointer-events-auto items-end">
            <button @click="router.push('/leaderboard')" class="w-10 h-10 flex items-center justify-center rounded-full bg-yellow-500/10 border border-yellow-500/30 text-yellow-200 backdrop-blur-md shadow-lg">
              <span class="text-sm">🏆</span>
            </button>
            <button @click="toggleAudio" :disabled="!speechAvailable" class="w-10 h-10 rounded-full backdrop-blur-md border flex items-center justify-center bg-black/60 border-white/20 text-white shadow-lg" :class="isSpeaking && 'border-emerald-500 text-emerald-400'"><span class="text-sm">{{ isSpeaking ? '🔊' : '🔈' }}</span></button>
            <button @click="toggleAR" class="w-10 h-10 rounded-full backdrop-blur-md border flex items-center justify-center bg-black/60 border-white/20 text-white shadow-lg"><span class="text-xs font-bold">{{ isARMode ? '✕' : 'AR' }}</span></button>
         </div>

         <!-- Bottom Sheet Info -->
         <div 
            class="absolute bottom-0 left-0 w-full bg-black/80 backdrop-blur-2xl border-t border-white/10 rounded-t-3xl shadow-[0_-5px_30px_rgba(0,0,0,0.8)] transition-transform duration-500 pointer-events-auto flex flex-col max-h-[50vh]"
            :class="isARMode ? 'translate-y-full' : 'translate-y-0'"
         >
            <!-- Drag Handle -->
            <div class="w-full flex justify-center pt-3 pb-1"><div class="w-12 h-1.5 bg-white/20 rounded-full"></div></div>

            <!-- Tabs Scroll -->
            <div class="flex overflow-x-auto gap-4 px-6 py-2 pb-0 no-scrollbar border-b border-white/5">
               <button v-for="tab in ['stats', 'structure', 'atmosphere', 'facts']" :key="tab" @click="activeTab = tab" class="pb-3 text-xs font-bold uppercase tracking-widest whitespace-nowrap transition-colors relative" :class="activeTab === tab ? 'text-cyan-400' : 'text-gray-500'">
                  {{ tab }}
                  <div v-if="activeTab === tab" class="absolute bottom-0 left-0 w-full h-0.5 bg-cyan-400 shadow-[0_0_8px_cyan]"></div>
               </button>
            </div>
            
            <!-- Content Area -->
            <div class="p-6 overflow-y-auto min-h-[200px]">
               <div v-if="activeTab === 'stats'" class="grid grid-cols-2 gap-3">
                  <div v-for="(stat, idx) in [{startLabel:'Temp', val:planetData.quickStats?.temperature}, {startLabel:'Gravity', val:planetData.quickStats?.gravity}, {startLabel:'Diameter', val:planetData.quickStats?.diameter}, {startLabel:'Moons', val:planetData.quickStats?.moons?.toString()}]" :key="idx" class="bg-white/5 p-3 rounded-xl border border-white/5 flex flex-col">
                     <span class="text-[10px] uppercase text-gray-500 tracking-wider">{{stat.startLabel}}</span>
                     <span class="text-sm font-bold text-white mt-1">{{stat.val}}</span>
                  </div>
               </div>
               <div v-else-if="activeTab === 'facts'">
                  <p class="text-sm leading-relaxed text-gray-300 mb-4 font-light">"{{ planetData.funFacts[currentFactIdx] }}"</p>
                  <button @click="nextFact" class="w-full py-2 bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 rounded-lg text-xs font-bold uppercase">Next Fact</button>
               </div>
               <div v-else>
                  <p class="text-sm leading-relaxed text-gray-300 font-light text-justify">{{ activeTab === 'structure' ? planetData.structure : planetData.atmosphere }}</p>
               </div>
               
               <div class="mt-6 pt-4 border-t border-white/10">
                 <button @click="router.push({ name: 'quiz', params: { id: planetData.id }, query: { from: 'planet-detail' } })" class="w-full py-3 bg-fuchsia-600 rounded-xl text-white font-bold uppercase text-xs tracking-wider shadow-lg">Start Mission</button>
               </div>
            </div>
         </div>
      </div>
    
    <!-- END UI LAYER -->
    </div>
  </div>
</template>

<script setup>
// LOGIKA ANDA TIDAK DIUBAH SAMA SEKALI
import { ref, onMounted, onUnmounted, computed, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import gsap from "gsap";
import speech from "../utils/speech";

// --- IMPORT DATA ---
import { solarData } from "../data/planets.js";

// --- SETUP ---
const route = useRoute();
const router = useRouter();
const containerRef = ref(null);
const videoRef = ref(null);

// --- DATA LOGIC ---
const planetData = computed(() => {
  const idFromUrl = parseInt(route.params.id);
  return solarData.find((p) => p.id === idFromUrl) || solarData[0];
});

// --- STATE ---
const isARMode = ref(false);
const isSpeaking = ref(false);
const speechAvailable = ref(false);
const voiceStatusMsg = ref("");
const enableSpeech = async () => {
  try {
    voiceStatusMsg.value = "Memuat suara...";
    await speech.initVoices();
    const c = speech.getVoicesCount();
    voiceStatusMsg.value = c
      ? `Suara siap (${c})`
      : "Tidak ada suara terdeteksi";
    speechAvailable.value = speech.isAvailable() && c > 0;
  } catch (e) {
    voiceStatusMsg.value = "Gagal memuat suara";
    console.warn("[Speech] enable failed", e);
  }
};
const currentFactIdx = ref(0);
const cameraError = ref(null);
const activeTab = ref('facts'); // 'stats', 'structure', 'atmosphere', 'facts'

// Typewriter State
const displayedFact = ref("");
let typingInterval = null;

// --- 3D VARS ---
let scene, camera, renderer, controls, planetMesh, starMesh;
let animationFrame;
const loader = new GLTFLoader();
// Objects and timeline used for event demos (gerhana, musim, komet)
let eventObjects = [];
let eventTimeline = null;
const currentEvent = computed(() => route.query.event || null);

const cleanupScene = () => {
  // stop any running timelines and animations
  try {
    if (eventTimeline) {
      eventTimeline.kill();
      eventTimeline = null;
    }
  } catch (e) {}
  try {
    if (animationFrame) cancelAnimationFrame(animationFrame);
  } catch (e) {}
  try {
    if (controls) controls.dispose();
  } catch (e) {}
  try {
    if (renderer) {
      renderer.dispose();
      renderer = null;
    }
  } catch (e) {}
  try {
    if (scene) {
      scene.clear();
      scene = null;
    }
  } catch (e) {}

  // remove event objects
  eventObjects.forEach((o) => {
    try {
      scene && scene.remove(o);
    } catch (e) {}
  });
  eventObjects = [];
};

// --- AUDIO ASSISTANT ---
const speak = async (text) => {
  if (!speech.isAvailable()) return;
  try {
    isSpeaking.value = true;
    await speech.speak(text, { lang: "id-ID", rate: 1.0, pitch: 1.0 });
  } catch (e) {
    console.warn("[Speech] speak error", e);
  } finally {
    isSpeaking.value = false;
  }
};

const toggleAudio = async () => {
  if (isSpeaking.value) {
    speech.cancel();
    isSpeaking.value = false;
  } else {
    const fact = planetData.value.funFacts[currentFactIdx.value];
    try {
      await speak(fact);
    } catch (e) {
      console.warn(e);
    }
  }
};

// --- TYPEWRITER ---
const typeText = (text) => {
  if (typingInterval) clearInterval(typingInterval);
  displayedFact.value = "";
  let i = 0;
  typingInterval = setInterval(() => {
    if (i < text.length) {
      displayedFact.value += text.charAt(i);
      i++;
    } else {
      clearInterval(typingInterval);
    }
  }, 30);
};

watch(currentFactIdx, () => {
  typeText(planetData.value.funFacts[currentFactIdx.value]);
});

// --- 3D SCENE SETUP ---
const initScene = () => {
  if (containerRef.value) containerRef.value.innerHTML = "";
  const w = window.innerWidth;
  const h = window.innerHeight;

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x050510);
  scene.fog = new THREE.FogExp2(0x050510, 0.02);

  camera = new THREE.PerspectiveCamera(60, w / h, 0.1, 1000);
  camera.position.set(0, 0, 12);

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(w, h);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  renderer.domElement.style.touchAction = "none";
  containerRef.value.appendChild(renderer.domElement);

  controls = new OrbitControls(camera, renderer.domElement);

  controls.enableDamping = true;
  controls.dampingFactor = 0.05;

  controls.enableZoom = true;
  controls.zoomSpeed = 1.5;

  controls.minDistance = 3;
  controls.maxDistance = 20;

  controls.enablePan = false;

  controls.autoRotate = true;
  controls.autoRotateSpeed = 2;

  // Lighting
  const ambient = new THREE.AmbientLight(0xffffff, 0.8);
  scene.add(ambient);
  const sunLight = new THREE.DirectionalLight(0xffffff, 2.5);
  sunLight.position.set(5, 10, 7);
  scene.add(sunLight);

  addFunStars();

  const modelPath = `/textures/${planetData.value.file}`;
  loader.load(
    modelPath,
    (gltf) => {
      planetMesh = gltf.scene;
      const box = new THREE.Box3().setFromObject(planetMesh);
      const size = box.getSize(new THREE.Vector3()).length();
      const scale = 5 / size;
      planetMesh.scale.set(scale, scale, scale);
      scene.add(planetMesh);

      planetMesh.scale.set(0, 0, 0);
      gsap.to(planetMesh.scale, {
        x: scale,
        y: scale,
        z: scale,
        duration: 1.5,
        ease: "elastic.out(1, 0.5)",
        onComplete: () => {
          if (currentEvent.value) {
            applyEventEffect(currentEvent.value);
          }
        },
      });
    },
    undefined,
    (err) => {
      console.warn(`Gagal load GLTF ${modelPath}`, err);
      const base = planetData.value.file.replace(/\.glb$/i, "");
      const texPathJpg = `/textures/${base}.jpg`;
      const texPathPng = `/textures/${base}.png`;
      const texLoader = new THREE.TextureLoader();
      texLoader.load(
        texPathJpg,
        (tex) => {
          const radius = 3;
          planetMesh = new THREE.Mesh(
            new THREE.SphereGeometry(radius, 32, 32),
            new THREE.MeshStandardMaterial({ map: tex })
          );
          scene.add(planetMesh);
          planetMesh.scale.set(0, 0, 0);
          gsap.to(planetMesh.scale, {
            x: 1,
            y: 1,
            z: 1,
            duration: 1.5,
            ease: "elastic.out(1, 0.5)",
            onComplete: () => {
              if (currentEvent.value) applyEventEffect(currentEvent.value);
            },
          });
        },
        undefined,
        () => {
          texLoader.load(
            texPathPng,
            (tex2) => {
              const radius = 3;
              planetMesh = new THREE.Mesh(
                new THREE.SphereGeometry(radius, 32, 32),
                new THREE.MeshStandardMaterial({ map: tex2 })
              );
              scene.add(planetMesh);
              planetMesh.scale.set(0, 0, 0);
              gsap.to(planetMesh.scale, {
                x: 1,
                y: 1,
                z: 1,
                duration: 1.5,
                ease: "elastic.out(1, 0.5)",
                onComplete: () => {
                  if (currentEvent.value) applyEventEffect(currentEvent.value);
                },
              });
            },
            undefined,
            () => {
              const radius = 3;
              planetMesh = new THREE.Mesh(
                new THREE.SphereGeometry(radius, 32, 32),
                new THREE.MeshStandardMaterial({
                  color: planetData.value.color || 0x888888,
                })
              );
              scene.add(planetMesh);
              planetMesh.scale.set(0, 0, 0);
              gsap.to(planetMesh.scale, {
                x: 1,
                y: 1,
                z: 1,
                duration: 1.5,
                ease: "elastic.out(1, 0.5)",
                onComplete: () => {
                  if (currentEvent.value) applyEventEffect(currentEvent.value);
                },
              });
            }
          );
        }
      );
    }
  );

  animate();
  window.addEventListener("resize", handleResize);
  typeText(planetData.value.funFacts[0]);
};

const addFunStars = () => {
  const geometry = new THREE.BufferGeometry();
  const count = 1000;
  const pos = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  for (let i = 0; i < count * 3; i += 3) {
    pos[i] = (Math.random() - 0.5) * 60;
    pos[i + 1] = (Math.random() - 0.5) * 60;
    pos[i + 2] = (Math.random() - 0.5) * 60;
    colors[i] = Math.random();
    colors[i + 1] = Math.random();
    colors[i + 2] = 1;
  }
  geometry.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  const material = new THREE.PointsMaterial({ size: 0.2, vertexColors: true });
  starMesh = new THREE.Points(geometry, material);
  scene.add(starMesh);
};

// --- AR LOGIC ---
const toggleAR = async () => {
  if (!isARMode.value) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      if (videoRef.value) {
        videoRef.value.srcObject = stream;
        videoRef.value.play();
      }
      scene.background = null;
      scene.fog = null;
      if (starMesh) starMesh.visible = false;

      isARMode.value = true;
      cameraError.value = null;
      try {
        await speak(
          "Mode AR aktif. Silakan zoom dan putar planet dengan jari Anda."
        );
      } catch (e) {
        console.warn(e);
      }
    } catch (err) {
      console.error(err);
      cameraError.value = "Izin kamera ditolak.";
      try {
        await speak("Gagal akses kamera.");
      } catch (e) {
        console.warn(e);
      }
    }
  } else {
    stopAR();
  }
};

const stopAR = () => {
  if (videoRef.value && videoRef.value.srcObject) {
    const tracks = videoRef.value.srcObject.getTracks();
    tracks.forEach((track) => track.stop());
    videoRef.value.srcObject = null;
  }
  scene.background = new THREE.Color(0x050510);
  scene.fog = new THREE.FogExp2(0x050510, 0.02);
  if (starMesh) starMesh.visible = true;
  isARMode.value = false;
};

const animate = () => {
  animationFrame = requestAnimationFrame(animate);
  controls.update();
  if (starMesh) starMesh.rotation.y += 0.0005;
  renderer.render(scene, camera);
};

const handleResize = () => {
  if (!containerRef.value) return;
  const w = window.innerWidth;
  const h = window.innerHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
};

const nextFact = () => {
  currentFactIdx.value =
    (currentFactIdx.value + 1) % planetData.value.funFacts.length;
  if (planetMesh)
    gsap.to(planetMesh.rotation, {
      y: planetMesh.rotation.y + Math.PI * 2,
      duration: 1.5,
      ease: "power2.inOut",
    });
  try {
    speech.cancel();
  } catch (e) {
    console.warn("[Speech] cancel failed", e);
  }
  isSpeaking.value = false;
};

const goBack = () => {
  stopAR();
  router.push("/explore");
};

onMounted(() => {
  initScene();
  try {
    speechAvailable.value = speech.isAvailable();
    if (speechAvailable.value) {
      speech
        .initVoices()
        .then(() => {
          const c = speech.getVoicesCount();
          speechAvailable.value = c > 0;
          voiceStatusMsg.value = c
            ? `Suara siap (${c})`
            : "Tidak ada suara terdeteksi";
          console.log("[Speech] warm-up voices:", c);
        })
        .catch((e) => {
          console.warn("[Speech] init failed", e);
          voiceStatusMsg.value = "Gagal memuat suara";
        });
    } else {
      voiceStatusMsg.value = "Speech tidak didukung di browser ini";
    }
  } catch (e) {
    console.warn("[Speech] check failed", e);
    voiceStatusMsg.value = "Gagal periksa kemampuan suara";
  }
});

const applyEventEffect = async (eventType) => {
  eventObjects.forEach((o) => {
    try {
      scene.remove(o);
    } catch (e) {}
  });
  eventObjects = [];
  try {
    if (eventTimeline) {
      eventTimeline.kill();
      eventTimeline = null;
    }
  } catch (e) {}

  if (!scene || !planetMesh) return;

  if (eventType === "solar-eclipse" || eventType === "lunar-eclipse") {
    const planetBox = new THREE.Box3().setFromObject(planetMesh);
    const planetSizeVec = planetBox.getSize(new THREE.Vector3());
    const base = Math.max(planetSizeVec.length(), 5);

    const sunObj = await new Promise((res) =>
      loader.load(
        "/textures/sun.glb",
        (g) => res(g.scene),
        undefined,
        () => res(null)
      )
    );
    const moonObj = await new Promise((res) =>
      loader.load(
        "/textures/moon.glb",
        (g) => res(g.scene),
        undefined,
        () => res(null)
      )
    );

    let sun;
    if (sunObj) {
      sun = sunObj;
      const box = new THREE.Box3().setFromObject(sun);
      const size = box.getSize(new THREE.Vector3()).length() || 1;
      const desired = base * 0.9;
      const sScale = desired / size;
      sun.scale.set(sScale, sScale, sScale);
    } else {
      sun = new THREE.Mesh(
        new THREE.SphereGeometry(base * 0.9, 32, 32),
        new THREE.MeshStandardMaterial({
          color: 0xfdb813,
          emissive: 0xffffaa,
          emissiveIntensity: 1.8,
          roughness: 0.25,
        })
      );
    }
    sun.position.set(-base * 2.5, 0, -base * 0.15);
    sun.castShadow = false;

    let moon;
    if (moonObj) {
      moon = moonObj;
      const box = new THREE.Box3().setFromObject(moon);
      const size = box.getSize(new THREE.Vector3()).length() || 1;
      const desired = Math.max(0.12, base * 0.25);
      const mScale = desired / size;
      moon.scale.set(mScale, mScale, mScale);
    } else {
      moon = new THREE.Mesh(
        new THREE.SphereGeometry(Math.max(0.12, base * 0.25), 16, 16),
        new THREE.MeshStandardMaterial({ color: 0x999999 })
      );
    }
    const orbitRadius = base * 1.6;
    moon.position.set(orbitRadius, 0, 0);

    scene.add(sun);
    scene.add(moon);
    eventObjects.push(sun, moon);

    eventTimeline = gsap.timeline({ repeat: -1 });
    eventTimeline
      .to(moon.position, {
        x: -orbitRadius,
        z: 0,
        duration: 3,
        ease: "power1.inOut",
      })
      .to(moon.position, {
        x: orbitRadius,
        z: 0,
        duration: 3,
        ease: "power1.inOut",
      });

    const amb = scene.children.find((c) => c.type === "AmbientLight");
    if (amb)
      eventTimeline.to(
        amb,
        { intensity: 0.05, duration: 0.6, yoyo: true, repeat: 1 },
        2
      );

    speak(
      "Menampilkan simulasi gerhana. Geser atau putar untuk melihat dari sudut berbeda."
    );
  } else if (eventType === "seasons") {
    planetMesh.rotation.z = THREE.MathUtils.degToRad(23.5);
    const sunLight = scene.children.find((c) => c.type === "DirectionalLight");
    if (sunLight)
      eventTimeline = gsap.to(sunLight.position, {
        x: 12,
        z: 8,
        duration: 6,
        yoyo: true,
        repeat: -1,
        ease: "sine.inOut",
      });
    speak("Menampilkan pergantian musim. Perhatikan kemiringan poros bumi.");
  } else if (eventType === "day-night") {
    eventTimeline = gsap.to(planetMesh.rotation, {
      y: planetMesh.rotation.y + Math.PI * 2,
      duration: 8,
      repeat: -1,
      ease: "linear",
    });
    speak("Menampilkan rotasi harian: perhatikan batas siang dan malam.");
  } else if (eventType === "comet") {
    const planetBox = new THREE.Box3().setFromObject(planetMesh);
    const base = Math.max(planetBox.getSize(new THREE.Vector3()).length(), 5);
    const count = 20;
    for (let i = 0; i < count; i++) {
      const radius = Math.max(0.03, base * 0.03);
      const c = new THREE.Mesh(
        new THREE.SphereGeometry(radius, 6, 6),
        new THREE.MeshBasicMaterial({ color: 0xffffff })
      );
      c.position.set(
        base * 4 + Math.random() * base * 3,
        (Math.random() - 0.5) * base * 2,
        (Math.random() - 0.5) * base * 2
      );
      scene.add(c);
      eventObjects.push(c);
      gsap.to(c.position, {
        x: -base * 4,
        duration: 3 + Math.random() * 5,
        repeat: -1,
        ease: "linear",
        delay: Math.random() * 3,
        onRepeat() {
          this.targets()[0].position.set(
            base * 4 + Math.random() * base * 2,
            (Math.random() - 0.5) * base * 2,
            (Math.random() - 0.5) * base * 2
          );
        },
      });
    }
    speak("Menampilkan hujan komet. Perhatikan lintasan acak dan cepat.");
  } else {
    // unknown event: do nothing
  }
};

// re-run event when query changes
watch(currentEvent, (val) => {
  if (val && planetMesh) applyEventEffect(val);
});

onUnmounted(() => {
  window.removeEventListener("resize", handleResize);
  stopAR();
  if (typingInterval) clearInterval(typingInterval);
  try {
    speech.cancel();
  } catch (e) {
    console.warn("[Speech] cancel failed", e);
  }
  cleanupScene();
});

watch(
  () => route.params.id,
  () => {
    initScene();
    currentFactIdx.value = 0;
  }
);
</script>

<style scoped>
/* BACKGROUND GRADIENT */
.bg-radial-gradient {
  background: radial-gradient(circle at center, transparent 0%, #050510 90%);
}

/* CUSTOM ANIMATIONS */
@keyframes wave {
  0%, 100% { height: 30%; }
  50% { height: 80%; }
}
.animate-wave {
  animation: wave 1s ease-in-out infinite;
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}
.animate-blink {
  animation: blink 1s step-end infinite;
}

/* TRANSITIONS */
.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: all 0.3s ease;
}
.fade-slide-enter-from {
  opacity: 0;
  transform: translateY(10px);
}
.fade-slide-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

/* UTILITY */
.scrollbar-hide::-webkit-scrollbar {
    display: none;
}
.scrollbar-hide {
    -ms-overflow-style: none;
    scrollbar-width: none;
}
</style>