<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

// --- DATA MISI ---
const missions = ref([
  {
    id: 1,
    code: 'OP-PLANETARY',
    title: 'PLANET HUNTER',
    subtitle: 'Identification Module',
    desc: 'Uji kemampuan pengenalan visual objek tata surya dalam simulasi waktu nyata.',
    diff: 'CADET',
    color: 'from-cyan-500 to-blue-500',
    accent: '#06b6d4',
    icon: '🪐',
    path: '/game/play-1', // Pastikan route ini ada di router/index.js
    locked: false
  },
  {
    id: 2,
    code: 'OP-ACADEMY',
    title: 'COSMIC QUIZ',
    subtitle: 'Theoretical Exam',
    desc: 'Evaluasi pengetahuan astrofisika untuk promosi pangkat kadet akademi.',
    diff: 'OFFICER',
    color: 'from-purple-500 to-pink-500',
    accent: '#d946ef',
    icon: '🧠',
    path: '/game/play-2', // Pastikan route ini ada di router/index.js
    locked: false
  },
  {
    id: 3,
    code: 'OP-CLASSIFIED',
    title: 'WARP VELOCITY',
    subtitle: 'Simulasi Tertutup',
    desc: 'Akses ditolak. Modul ini memerlukan izin keamanan level 5.',
    diff: 'ELITE',
    color: 'from-yellow-500 to-orange-500',
    accent: '#f59e0b',
    icon: '🔒',
    path: '',
    locked: true
  }
])

// --- LOGIKA TILT KARTU (3D HOVER) ---
const handleMouseMove = (e, index) => {
  const card = document.getElementById(`mission-card-${index}`)
  if (!card) return

  const rect = card.getBoundingClientRect()
  const x = e.clientX - rect.left
  const y = e.clientY - rect.top
  
  const centerX = rect.width / 2
  const centerY = rect.height / 2
  
  const rotateX = ((y - centerY) / centerY) * -10 
  const rotateY = ((x - centerX) / centerX) * 10

  card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.02)`
}

const resetCard = (index) => {
  const card = document.getElementById(`mission-card-${index}`)
  if (card) {
    card.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) scale(1)'
  }
}

const goBack = () => {
  router.push('/explore') 
}
</script>

<template>
  <div class="lobby-wrapper">
    <div class="bg-layer stars-sm"></div>
    <div class="bg-layer stars-md"></div>
    <div class="scanline"></div>
    
    <div class="header-hud">
      <div class="top-bar">
        <div class="flex items-center gap-4">
           <button @click="goBack" class="back-btn">
             <span class="icon">❮</span> SYSTEM EXIT
           </button>
           <div class="w-[1px] h-6 bg-white/20"></div>
           <div class="live-indicator">
             <span class="dot"></span> ONLINE
           </div>
        </div>
        <div class="user-profile">
          COMMANDER_USER // <span class="text-cyan-400">LOGGED_IN</span>
        </div>
      </div>
      
      <div class="title-section">
        <h1 class="main-title">MISSION CONTROL</h1>
        <p class="sub-title">Pilih modul simulasi untuk memulai pelatihan.</p>
      </div>
    </div>

    <div class="mission-container">
      <div 
        v-for="(mission, index) in missions" 
        :key="mission.id"
        class="card-wrapper"
        @mousemove="(e) => handleMouseMove(e, index)"
        @mouseleave="() => resetCard(index)"
      >
        <div 
          :id="`mission-card-${index}`" 
          class="mission-card"
          :class="{ 'locked': mission.locked }"
        >
          <div class="glow-border" :style="{ background: mission.locked ? 'gray' : mission.accent }"></div>
          
          <div class="card-inner">
            <div class="card-header">
              <span class="mission-code">{{ mission.code }}</span>
              <span class="mission-diff" :style="{ color: mission.locked ? '#888' : mission.accent }">
                {{ mission.diff }}
              </span>
            </div>

            <div class="icon-area">
              <div class="icon-circle" :class="mission.locked ? 'bg-gray-800' : `bg-gradient-to-br ${mission.color}`">
                {{ mission.icon }}
              </div>
            </div>

            <h2 class="mission-title">{{ mission.title }}</h2>
            <div class="mission-subtitle">{{ mission.subtitle }}</div>
            
            <div class="divider"></div>
            
            <p class="mission-desc">{{ mission.desc }}</p>

            <router-link 
              v-if="!mission.locked"
              :to="mission.path" 
              class="action-btn"
              :style="{ '--accent': mission.accent }"
            >
              INITIALIZE <span class="arrow">→</span>
            </router-link>

            <button v-else class="locked-btn">
              🔒 LOCKED
            </button>
          </div>
        </div>
      </div>
    </div>

    <div class="footer-hud">
      <div class="data-block">
        <span>SYS.VER.4.2</span>
        <span>LATENCY: 12ms</span>
        <span>SECURE_CONNECTION</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* --- BASE LAYOUT --- */
.lobby-wrapper {
  min-height: 100vh;
  background-color: #050505;
  color: white;
  font-family: 'Segoe UI', sans-serif;
  overflow-x: hidden;
  overflow-y: auto;
  position: relative;
  display: flex;
  flex-direction: column;
}

/* --- BACKGROUND LAYERS --- */
.bg-layer {
  position: absolute; top: 0; left: 0; width: 100%; height: 100%;
  background-image: radial-gradient(white 1px, transparent 1px);
  opacity: 0.3; z-index: 0;
  pointer-events: none;
}
.stars-sm { background-size: 20px 20px; animation: drift 100s linear infinite; }
.stars-md { background-size: 50px 50px; opacity: 0.1; animation: drift 150s linear infinite; }
@keyframes drift { from { background-position: 0 0; } to { background-position: 100px 100px; } }

.scanline {
  position: absolute; top: 0; left: 0; width: 100%; height: 100%;
  background: linear-gradient(to bottom, transparent 50%, rgba(0, 0, 0, 0.3) 51%);
  background-size: 100% 4px; 
  pointer-events: none; /* Penting agar tidak menghalangi klik */
  z-index: 50; 
  opacity: 0.2;
}

/* --- HUD HEADER --- */
.header-hud { 
  position: relative; 
  z-index: 10; 
  padding: 20px 40px; 
  background: linear-gradient(to bottom, rgba(0,0,0,0.8), transparent);
  pointer-events: none; /* Container header tembus klik */
}

/* Aktifkan kembali pointer events untuk anak elemen header */
.header-hud > * { pointer-events: auto; }

.top-bar { display: flex; justify-content: space-between; align-items: center; font-family: monospace; font-size: 0.8rem; color: #888; margin-bottom: 40px; pointer-events: auto; }

.back-btn { 
  background: rgba(255,255,255,0.05); 
  border: 1px solid rgba(255,255,255,0.1); 
  padding: 8px 16px; 
  border-radius: 4px; 
  color: white; 
  font-family: monospace; 
  cursor: pointer; 
  transition: all 0.2s; 
  pointer-events: auto; /* Pastikan tombol back bisa diklik */
  z-index: 100;
}
.back-btn:hover { background: rgba(0, 242, 255, 0.2); border-color: #00f2ff; }

.live-indicator { display: flex; align-items: center; gap: 8px; color: #aaa; }
.dot { width: 8px; height: 8px; background: red; border-radius: 50%; box-shadow: 0 0 10px red; animation: blink 1s infinite; }
@keyframes blink { 50% { opacity: 0.5; } }

.title-section { text-align: center; margin-bottom: 20px; pointer-events: none; }
.main-title { font-size: 4rem; font-weight: 900; letter-spacing: 10px; background: linear-gradient(to bottom, #fff, #888); -webkit-background-clip: text; -webkit-text-fill-color: transparent; margin: 0; text-transform: uppercase; filter: drop-shadow(0 0 10px rgba(255,255,255,0.2)); }
.sub-title { color: #06b6d4; font-family: monospace; letter-spacing: 2px; text-transform: uppercase; font-size: 0.9rem; margin-top: 10px; opacity: 0.8; }

/* --- MISSION CARDS --- */
.mission-container { 
  display: flex; justify-content: center; align-items: center; gap: 30px; flex-wrap: wrap; padding: 20px; 
  position: relative; 
  z-index: 60; /* LEBIH TINGGI DARI SCANLINE (50) */
  flex-grow: 1; 
}

.card-wrapper { perspective: 1000px; }

.mission-card { 
  width: 320px; min-height: 480px; 
  background: rgba(10, 10, 15, 0.7); 
  backdrop-filter: blur(20px); 
  border: 1px solid rgba(255, 255, 255, 0.1); 
  border-radius: 16px; 
  position: relative; 
  transform-style: preserve-3d; 
  transition: transform 0.1s ease-out; 
  display: flex; flex-direction: column; 
}

.mission-card.locked { filter: grayscale(1); opacity: 0.7; pointer-events: none; }

.glow-border { 
  position: absolute; top: -1px; left: -1px; right: -1px; bottom: -1px; 
  border-radius: 16px; 
  z-index: -1; 
  opacity: 0; filter: blur(15px); transition: opacity 0.3s; 
}
.mission-card:hover .glow-border { opacity: 0.4; }
.mission-card:hover { border-color: rgba(255,255,255,0.3); }

.card-inner { 
  padding: 30px; 
  display: flex; flex-direction: column; height: 100%; 
  transform: translateZ(20px); 
  pointer-events: auto; /* Pastikan card inner menerima interaksi mouse */
}

.card-header { display: flex; justify-content: space-between; font-family: monospace; font-size: 0.7rem; margin-bottom: 30px; letter-spacing: 1px; color: #666; }
.icon-area { display: flex; justify-content: center; margin-bottom: 30px; transform: translateZ(30px); }
.icon-circle { width: 80px; height: 80px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 3rem; box-shadow: 0 0 30px rgba(0,0,0,0.5); }
.mission-title { font-size: 1.8rem; font-weight: 800; margin: 0; text-transform: uppercase; letter-spacing: 2px; line-height: 1; }
.mission-subtitle { font-family: monospace; color: #888; font-size: 0.8rem; margin-top: 5px; }
.divider { width: 100%; height: 1px; background: linear-gradient(to right, transparent, rgba(255,255,255,0.2), transparent); margin: 20px 0; }
.mission-desc { font-size: 0.9rem; color: #ccc; line-height: 1.6; flex-grow: 1; }

/* FIX TOMBOL ACTION */
.action-btn { 
  margin-top: 20px; 
  padding: 15px; 
  background: rgba(255,255,255,0.05); 
  border: 1px solid rgba(255,255,255,0.1); 
  color: white; 
  text-align: center; text-decoration: none; 
  font-weight: bold; letter-spacing: 2px; font-size: 0.9rem; 
  transition: all 0.3s; 
  position: relative; 
  overflow: hidden; 
  display: flex; justify-content: center; align-items: center; gap: 10px;
  
  /* PROPERTI PENTING UNTUK FIX KLIK */
  z-index: 100; 
  cursor: pointer;
  pointer-events: auto;
  transform: translateZ(40px); /* Memaksa tombol timbul di atas elemen lain */
}

.action-btn:hover { background: var(--accent); border-color: var(--accent); color: black; box-shadow: 0 0 20px var(--accent); }

.locked-btn { margin-top: 20px; padding: 15px; background: #222; border: 1px dashed #444; color: #666; width: 100%; text-align: center; font-family: monospace; cursor: not-allowed; }

/* --- FOOTER HUD --- */
.footer-hud { padding: 20px; text-align: center; font-family: monospace; font-size: 0.7rem; color: #444; border-top: 1px solid rgba(255,255,255,0.05); }
.data-block span { margin: 0 10px; }

@media (max-width: 768px) { .main-title { font-size: 2.5rem; letter-spacing: 5px; } .header-hud { padding: 20px; } .mission-container { gap: 20px; } .mission-card { width: 100%; min-height: auto; } }
</style>