<template>
  <div
    class="game-container relative w-full h-full overflow-hidden bg-black select-none"
    @mousedown="!showNameModal && onMouseDown($event)"
    @mouseup="!showNameModal && onMouseUp($event)"
    @touchstart="!showNameModal && onTouchStart($event)"
    @touchend="!showNameModal && onTouchEnd($event)"
    @touchmove="!showNameModal && onTouchMove($event)"
  >
    <div
      ref="canvasContainer"
      class="w-full h-full absolute inset-0 bg-radial-gradient"
    ></div>

    <div
      v-if="isLoading"
      class="absolute inset-0 flex flex-col items-center justify-center bg-black z-50"
    >
      <div
        class="w-12 h-12 md:w-16 md:h-16 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mb-4"
      ></div>
      <p class="text-cyan-400 font-mono tracking-widest text-sm md:text-base">
        LOADING ASSETS...
      </p>
      <p class="text-[10px] md:text-xs text-gray-500 mt-2">
        game1 (Player) • game2 (Enemy) • game3-7 (Bosses)
      </p>
    </div>

    <div
      class="ui-layer absolute inset-0 pointer-events-none p-3 md:p-6 flex flex-col justify-between"
      v-show="!isLoading"
    >
      <div class="flex flex-col w-full z-10">
        <div
          class="flex justify-between items-start text-white font-mono w-full"
        >
          <div class="flex items-start gap-3">
            <div class="hud-panel">
              <h2
                class="text-cyan-400 text-[10px] md:text-xs uppercase tracking-widest mb-1"
              >
                Level {{ level }}
              </h2>
              <p class="text-lg md:text-2xl font-bold font-mono nums">
                SCORE: {{ Math.floor(score) }}
              </p>
            </div>
          </div>

          <div class="hud-panel flex flex-col items-end">
            <h2
              class="text-red-400 text-[10px] md:text-xs uppercase tracking-widest mb-1"
            >
              Shield Integrity
            </h2>
            <div
              class="w-24 md:w-56 h-2 md:h-3 bg-gray-800/50 rounded-sm overflow-hidden border border-gray-700 relative"
            >
              <div
                v-if="isShieldActive"
                class="absolute inset-0 bg-blue-400 animate-pulse z-10 opacity-50"
              ></div>
              <div
                class="h-full transition-all duration-300 ease-out shadow-[0_0_10px_currentColor]"
                :class="
                  health > 50
                    ? 'bg-cyan-500 text-cyan-500'
                    : health > 20
                    ? 'bg-amber-500 text-amber-500'
                    : 'bg-red-600 text-red-600'
                "
                :style="{ width: health + '%' }"
              ></div>
            </div>
          </div>
        </div>

        <div
          v-if="isTripleShotActive"
          class="absolute top-24 left-1/2 -translate-x-1/2 text-center pointer-events-none w-full"
        >
          <h1
            class="text-xl md:text-4xl font-black text-yellow-400 drop-shadow-[0_0_10px_rgba(251,191,36,0.8)] animate-pulse"
          >
            TRIPLE SHOT!
          </h1>
        </div>

        <div
          v-if="isBossActive"
          class="w-full flex flex-col items-center mt-4 animate-fade-in px-4"
        >
          <h2
            class="text-purple-400 font-black tracking-[0.2em] md:tracking-[0.5em] text-xs md:text-sm mb-1 animate-pulse text-center"
          >
            {{
              bossStats.isCritical
                ? "CRITICAL STATE"
                : bossStats.isEnraged
                ? "WARNING: BOSS ULTIMATE"
                : `LEVEL ${level} BOSS`
            }}
          </h2>
          <div
            class="w-full max-w-lg h-3 md:h-6 bg-gray-900/80 border-2 border-purple-600 rounded overflow-hidden relative shadow-[0_0_20px_rgba(147,51,234,0.5)]"
          >
            <div
              class="h-full transition-all duration-200"
              :class="
                bossStats.isCritical
                  ? 'bg-red-700 animate-pulse'
                  : bossStats.isEnraged
                  ? 'bg-red-600 animate-pulse'
                  : 'bg-purple-600'
              "
              :style="{ width: (bossStats.hp / bossStats.maxHp) * 100 + '%' }"
            ></div>
          </div>
        </div>

        <div
          v-if="isRestPhase"
          class="w-full flex flex-col items-center mt-4 animate-fade-in px-4"
        >
          <h2
            class="text-green-400 font-black tracking-[0.2em] md:tracking-[0.5em] text-xs md:text-sm mb-1 animate-pulse text-center"
          >
            PREPARING NEXT WAVE
          </h2>
          <div
            class="w-full max-w-lg h-3 md:h-6 bg-gray-900/80 border-2 border-green-600 rounded overflow-hidden relative shadow-[0_0_20px_rgba(34,197,94,0.5)]"
          >
            <div
              class="h-full transition-all duration-200 bg-green-600"
              :style="{
                width:
                  ((restPhaseDuration - restPhaseTimer) / restPhaseDuration) *
                    100 +
                  '%',
              }"
            ></div>
          </div>
          <p class="text-green-300 text-[10px] md:text-xs mt-2 font-mono">
            Next boss in: {{ Math.ceil(restPhaseTimer / 1000) }}s
          </p>
        </div>

        <div
          v-if="showLevelUp"
          class="absolute top-1/3 left-1/2 -translate-x-1/2 text-center pointer-events-none w-full"
        >
          <h1
            class="text-3xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-b from-yellow-300 to-amber-600 drop-shadow-[0_0_10px_rgba(251,191,36,0.8)] animate-bounce"
          >
            LEVEL UP!
          </h1>
          <p
            class="text-white font-mono tracking-widest bg-black/50 px-4 py-1 mt-2 inline-block text-sm md:text-base"
          >
            ENEMIES EVOLVED
          </p>
        </div>
      </div>

      <div
        v-if="isPlaying"
        class="absolute inset-0 pointer-events-none z-20 flex flex-col justify-end pb-4 md:pb-8"
      >
        <div
          class="md:hidden absolute bottom-6 left-4 pointer-events-auto opacity-70"
        >
          <div
            class="relative w-28 h-28 bg-gray-900/30 rounded-full border border-white/10 backdrop-blur-sm"
          >
            <button
              class="dpad-btn top-0 left-1/2 -translate-x-1/2 rounded-t-lg"
              @touchstart.prevent="inputState.up = true"
              @touchend.prevent="inputState.up = false"
            >
              ▲
            </button>
            <button
              class="dpad-btn bottom-0 left-1/2 -translate-x-1/2 rounded-b-lg"
              @touchstart.prevent="inputState.down = true"
              @touchend.prevent="inputState.down = false"
            >
              ▼
            </button>
            <button
              class="dpad-btn left-0 top-1/2 -translate-y-1/2 rounded-l-lg"
              @touchstart.prevent="inputState.left = true"
              @touchend.prevent="inputState.left = false"
            >
              ◀
            </button>
            <button
              class="dpad-btn right-0 top-1/2 -translate-y-1/2 rounded-r-lg"
              @touchstart.prevent="inputState.right = true"
              @touchend.prevent="inputState.right = false"
            >
              ▶
            </button>
          </div>
        </div>

        <div
          class="md:hidden absolute bottom-24 right-4 pointer-events-auto opacity-80"
        >
          <button
            class="w-16 h-16 rounded-full bg-red-600/50 border-4 border-red-500 flex items-center justify-center active:bg-red-500 active:scale-95 transition-all shadow-[0_0_20px_rgba(239,68,68,0.5)]"
            @touchstart.prevent="inputState.shoot = true"
            @touchend.prevent="inputState.shoot = false"
          >
            <span class="font-black text-white text-[10px] tracking-tighter"
              >FIRE</span
            >
          </button>
        </div>

        <div
          class="pointer-events-auto flex gap-3 md:gap-4 absolute bottom-6 right-4 md:left-1/2 md:right-auto md:-translate-x-1/2 flex-row items-end md:items-center"
        >
          <div
            class="skill-slot group"
            @click="activateBlaster"
            @touchstart.prevent="activateBlaster"
          >
            <div class="skill-key hidden md:block">Q</div>
            <div class="skill-icon bg-red-500/20 border-red-500">
              <span class="text-lg md:text-2xl">☢️</span>
            </div>
            <div
              class="cooldown-overlay"
              :style="{ height: cdBlasterPct + '%' }"
            ></div>
            <span
              class="absolute -top-5 md:-top-6 text-[8px] md:text-[10px] text-red-400 font-bold bg-black/50 px-1 rounded"
              >ULTIMATE</span
            >
          </div>

          <div
            class="skill-slot group"
            @click="activateShield"
            @touchstart.prevent="activateShield"
          >
            <div class="skill-key hidden md:block">W</div>
            <div class="skill-icon bg-blue-500/20 border-blue-500">
              <span class="text-lg md:text-2xl">🛡️</span>
            </div>
            <div
              class="cooldown-overlay"
              :style="{ height: cdShieldPct + '%' }"
            ></div>
          </div>

          <div
            class="skill-slot group"
            @click="activateTimeSlow"
            @touchstart.prevent="activateTimeSlow"
          >
            <div class="skill-key hidden md:block">E</div>
            <div class="skill-icon bg-purple-500/20 border-purple-500">
              <span class="text-lg md:text-2xl">⏳</span>
            </div>
            <div
              class="cooldown-overlay"
              :style="{ height: cdTimePct + '%' }"
            ></div>
          </div>
        </div>
      </div>

      <div
        v-if="!isPlaying"
        class="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-md pointer-events-auto z-50 p-4"
      >
        <div
          class="text-center space-y-4 md:space-y-6 w-full max-w-lg p-6 md:p-10 border border-cyan-500/30 bg-gray-900/90 rounded-xl shadow-[0_0_100px_rgba(6,182,212,0.2)]"
        >
          <h1
            class="text-3xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-br"
            :class="
              isVictory
                ? 'from-yellow-300 via-amber-500 to-orange-600'
                : 'from-cyan-300 via-blue-500 to-purple-600'
            "
          >
            {{
              isVictory
                ? "VICTORY!"
                : isGameOver
                ? "SYSTEM FAILURE"
                : "VOID COMMANDER"
            }}
          </h1>
          <p class="text-gray-300 font-mono text-xs md:text-sm">
            {{
              isVictory
                ? `FINAL SCORE: ${Math.floor(score)} - GALAXY SAVED!`
                : isGameOver
                ? `FINAL SCORE: ${Math.floor(score)} - LEVEL ${level}`
                : "INITIATE LAUNCH SEQUENCE"
            }}
          </p>

          <div v-if="isVictory" class="text-center">
            <p class="text-yellow-400 font-mono text-sm md:text-lg mb-1">
              🏆 HIGH SCORE 🏆
            </p>
            <p class="text-white font-bold text-xl md:text-2xl">
              {{ Math.floor(score) }}
            </p>
          </div>

          <div
            v-if="!isVictory && !isGameOver"
            class="flex flex-col gap-2 text-xs text-gray-400 font-mono"
          >
            <p>PERFORMANCE SETTINGS</p>
            <div class="flex justify-center gap-2">
              <button
                @click="setQuality('low')"
                :class="
                  quality === 'low'
                    ? 'text-cyan-400 border-cyan-400 bg-cyan-900/20'
                    : 'border-gray-600'
                "
                class="px-3 py-1 border rounded transition-colors"
              >
                LOW
              </button>
              <button
                @click="setQuality('medium')"
                :class="
                  quality === 'medium'
                    ? 'text-cyan-400 border-cyan-400 bg-cyan-900/20'
                    : 'border-gray-600'
                "
                class="px-3 py-1 border rounded transition-colors"
              >
                MED
              </button>
              <button
                @click="setQuality('high')"
                :class="
                  quality === 'high'
                    ? 'text-cyan-400 border-cyan-400 bg-cyan-900/20'
                    : 'border-gray-600'
                "
                class="px-3 py-1 border rounded transition-colors"
              >
                HIGH
              </button>
            </div>
          </div>

          <div
            class="hidden md:flex flex-col gap-1 text-[10px] md:text-xs text-gray-500 font-mono bg-black/40 p-3 rounded"
          >
            <p class="text-cyan-300 mb-1">CONTROLS</p>
            <p>MOVE: [WASD] or [MOUSE]</p>
            <p>SHOOT: [SPACE] or [CLICK]</p>
            <p>SKILLS: [Q] Ult • [W] Shield • [E] Slow</p>
          </div>

          <div
            class="md:hidden flex flex-col gap-1 text-[10px] text-gray-500 font-mono"
          >
            <p>Left: D-Pad / Drag • Right: Fire & Skills</p>
          </div>

          <div class="flex flex-col gap-3 mt-2">
            <button
              @click="startGame"
              class="w-full px-6 py-3 bg-cyan-700 hover:bg-cyan-600 text-white font-bold rounded shadow-lg transition-all active:scale-95 border-t border-cyan-400 text-sm md:text-base"
            >
              {{ isVictory || isGameOver ? "PLAY AGAIN" : "ENGAGE ENGINES" }}
            </button>

            <button
              @click="goToLobby"
              class="w-full px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white font-bold rounded shadow-lg transition-all active:scale-95 border-t border-gray-500 text-sm md:text-base"
            >
              BACK TO LOBBY
            </button>
          </div>
        </div>
      </div>

      <div
        v-if="isPaused && isPlaying"
        class="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm pointer-events-auto z-40"
      >
        <div
          class="text-center space-y-6 p-10 border border-yellow-500/30 bg-gray-900/90 rounded-xl shadow-[0_0_100px_rgba(250,204,21,0.2)]"
        >
          <h1 class="text-4xl md:text-5xl font-black text-yellow-400">
            PAUSED
          </h1>
          <button
            @click="togglePause"
            class="w-full px-8 py-3 bg-yellow-700 hover:bg-yellow-600 text-white font-bold rounded shadow-lg transition-all active:scale-95 border-t border-yellow-400"
          >
            RESUME
          </button>
        </div>
      </div>
    </div>

    <PlayerNameModal
      :show="showNameModal && !isLoading"
      title="GAME 2: ADVENTURE"
      @submit="handleNameSubmit"
      @back="goToLobby"
    />
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onBeforeUnmount } from "vue";
import { useRouter } from "vue-router";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { useSpaceStore } from "../../stores/spaceStore";
import PlayerNameModal from "../../components/PlayerNameModal.vue";

const router = useRouter();
const spaceStore = useSpaceStore();

// --- State ---
const canvasContainer = ref(null);
const isLoading = ref(true);
const isPlaying = ref(false);
const isGameOver = ref(false);
const isPaused = ref(false);
const showLevelUp = ref(false);
const isTripleShotActive = ref(false);
const showNameModal = ref(true);
const astronautName = ref("");
const isVictory = ref(false);

// Game Stats
const score = ref(0);
const health = ref(100);
const level = ref(1);
const quality = ref("medium");

// Boss & Logic State
const isBossActive = ref(false);
const bossStats = reactive({
  hp: 1000,
  maxHp: 1000,
  isEnraged: false,
  isCritical: false,
  hasUsedUltimate: false,
});
let nextBossScoreThreshold = 1500;
const isRestPhase = ref(false);
const restPhaseTimer = ref(0);
const restPhaseDuration = 10000;

// Skills
const isShieldActive = ref(false);
const isTimeSlowActive = ref(false);
const cdBlasterPct = ref(0);
const cdShieldPct = ref(0);
const cdTimePct = ref(0);

// Input
const inputMode = ref("mouse");
const inputState = reactive({
  up: false,
  down: false,
  left: false,
  right: false,
  shoot: false,
});

// Three.js Globals
let scene, camera, renderer;
let playerShip, shieldMesh;
let starSystem, nebulaSystem;
let asteroids = [],
  repairKits = [],
  powerUps = [],
  enemies = [];
let boss = null;
let lasers = [],
  enemyLasers = [],
  bossLasers = [],
  explosions = [];
let animationId;
const loader = new GLTFLoader();

let enemyTemplates = [],
  bossTemplates = [];
let asteroidGeometry, asteroidMaterial, powerUpGeometry, powerUpMaterial;
let repairKitGeometry,
  repairKitMaterial,
  enemyFallbackGeometry,
  enemyFallbackMaterial;
let bossFallbackGeometry, bossFallbackMaterial;

// Game Physics Vars (Responsive)
let baseGameSpeed = ref(1.0);
let timeScale = ref(1.0);
let lastShotTime = 0;
let targetX = 0;
let targetY = 0;
let screenAspect = 1.0;
// Responsive boundaries
let gameFieldWidth = 70; // Base width
let gameFieldHeight = 40; // Base height

const laserPool = [],
  explosionPool = [],
  maxPoolSize = 100;

// Quality Settings
const qualitySettings = {
  low: {
    particleCount: 10,
    laserCount: 1,
    bossLaserCount: 2,
    asteroidCount: 3,
    shadowMapEnabled: false,
    antialias: false,
  },
  medium: {
    particleCount: 20,
    laserCount: 2,
    bossLaserCount: 3,
    asteroidCount: 5,
    shadowMapEnabled: true,
    antialias: true,
  },
  high: {
    particleCount: 30,
    laserCount: 2,
    bossLaserCount: 5,
    asteroidCount: 8,
    shadowMapEnabled: true,
    antialias: true,
  },
};

onMounted(() => {
  const savedQuality = localStorage.getItem("voidCommanderQuality");
  if (savedQuality && ["low", "medium", "high"].includes(savedQuality))
    quality.value = savedQuality;
  // If mobile, default to low if not set
  else if (window.innerWidth < 768) quality.value = "low";

  initThree();
  window.addEventListener("resize", onWindowResize);
  document.addEventListener("mousemove", onDocumentMouseMove);
  document.addEventListener("keydown", onKeyDown);
  document.addEventListener("keyup", onKeyUp);
});

onBeforeUnmount(() => {
  if (animationId) cancelAnimationFrame(animationId);
  window.removeEventListener("resize", onWindowResize);
  document.removeEventListener("mousemove", onDocumentMouseMove);
  document.removeEventListener("keydown", onKeyDown);
  document.removeEventListener("keyup", onKeyUp);
  cleanupThreeJS();
});

function setQuality(newQuality) {
  quality.value = newQuality;
  localStorage.setItem("voidCommanderQuality", newQuality);
  const settings = qualitySettings[newQuality];
  renderer.shadowMap.enabled = settings.shadowMapEnabled;
  renderer.antialias = settings.antialias;
  // Re-init stars/dust if needed logic here (omitted for brevity, handled in init)
}

function initSharedResources() {
  asteroidGeometry = new THREE.IcosahedronGeometry(1, 0);
  asteroidMaterial = new THREE.MeshStandardMaterial({
    color: 0x666666,
    roughness: 0.8,
    flatShading: true,
  });
  powerUpGeometry = new THREE.OctahedronGeometry(1, 0);
  powerUpMaterial = new THREE.MeshStandardMaterial({
    color: 0xffff00,
    emissive: 0xffff00,
    emissiveIntensity: 0.5,
  });
  repairKitGeometry = new THREE.BoxGeometry(1, 1, 1);
  repairKitMaterial = new THREE.MeshLambertMaterial({
    color: 0x00ff00,
    emissive: 0x005500,
  });
  enemyFallbackGeometry = new THREE.TetrahedronGeometry(1, 0);
  enemyFallbackGeometry.rotateX(-Math.PI / 2);
  enemyFallbackMaterial = new THREE.MeshStandardMaterial({ color: 0xcc0000 });
  bossFallbackGeometry = new THREE.TorusKnotGeometry(2, 0.6, 100, 16);
  bossFallbackMaterial = new THREE.MeshStandardMaterial({ color: 0x9333ea });
}

function initThree() {
  scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x050510, 0.002);

  // Camera Setup
  camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  updateCameraForResponsive(); // Set Initial Z

  const settings = qualitySettings[quality.value];
  renderer = new THREE.WebGLRenderer({
    alpha: true,
    antialias: settings.antialias,
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.shadowMap.enabled = settings.shadowMapEnabled;
  canvasContainer.value.appendChild(renderer.domElement);

  scene.add(new THREE.HemisphereLight(0x4433aa, 0x000000, 0.6));
  const sunLight = new THREE.DirectionalLight(0xffffff, 2);
  sunLight.position.set(20, 50, 20);
  sunLight.castShadow = settings.shadowMapEnabled;
  scene.add(sunLight);

  initSharedResources();
  loadAllAssets();
  createEnvironment();
  animate();
}

// Helper to keep camera responsive
function updateCameraForResponsive() {
  screenAspect = window.innerWidth / window.innerHeight;
  // Portrait mode needs camera further back to see the width
  if (screenAspect < 1) {
    camera.position.set(0, 10, 35);
    gameFieldWidth = 35; // Narrower effective field
  } else {
    camera.position.set(0, 3, 25);
    gameFieldWidth = 55;
  }
}

async function loadAllAssets() {
  enemyTemplates = [];
  bossTemplates = [];
  const loadModel = (url) =>
    new Promise((resolve) => {
      loader.load(
        url,
        (gltf) => resolve(gltf.scene),
        undefined,
        () => resolve(null)
      );
    });

  try {
    const playerModel = await loadModel("/textures/assets-game1.glb");
    const enemyPromises = [];
    for (let i = 2; i <= 6; i++)
      enemyPromises.push(loadModel(`/textures/assets-game${i}.glb`));
    const enemyModels = await Promise.all(enemyPromises);

    const bossPromises = [];
    for (let i = 3; i <= 7; i++)
      bossPromises.push(loadModel(`/textures/assets-game${i}.glb`));
    const bossModels = await Promise.all(bossPromises);

    if (playerModel) {
      playerShip = playerModel;
      playerShip.scale.set(0.01, 0.01, 0.01);
      playerShip.rotation.y = Math.PI;
      setupPlayerMesh();
    } else {
      createFallbackShip();
    }
    enemyTemplates = enemyModels;
    bossTemplates = bossModels;
    isLoading.value = false;
  } catch (error) {
    console.error("Error loading assets", error);
    isLoading.value = false;
  }
}

function createFallbackShip() {
  const geometry = new THREE.ConeGeometry(1, 4, 8);
  geometry.rotateX(Math.PI / 2);
  const material = new THREE.MeshStandardMaterial({ color: 0x00aaff });
  playerShip = new THREE.Mesh(geometry, material);
  setupPlayerMesh();
}

function setupPlayerMesh() {
  const shieldGeo = new THREE.SphereGeometry(2.0, 32, 32);
  const shieldMat = new THREE.MeshPhysicalMaterial({
    color: 0x0088ff,
    transparent: true,
    opacity: 0.3,
    transmission: 0.5,
    roughness: 0,
    emissive: 0x0044aa,
    emissiveIntensity: 0.5,
    side: THREE.DoubleSide,
  });
  shieldMesh = new THREE.Mesh(shieldGeo, shieldMat);
  shieldMesh.visible = false;
  playerShip.add(shieldMesh);
  scene.add(playerShip);
}

function createEnvironment() {
  const settings = qualitySettings[quality.value];
  const starsGeo = new THREE.BufferGeometry();
  const posArray = new Float32Array(settings.particleCount * 100 * 3);
  for (let i = 0; i < settings.particleCount * 100 * 3; i++)
    posArray[i] = (Math.random() - 0.5) * 400;
  starsGeo.setAttribute("position", new THREE.BufferAttribute(posArray, 3));
  starSystem = new THREE.Points(
    starsGeo,
    new THREE.PointsMaterial({ size: 0.5, color: 0xffffff })
  );
  scene.add(starSystem);
}

// --- INPUT HANDLERS (RESPONSIVE) ---

function onKeyDown(e) {
  if (showNameModal.value) return;
  if (!isPlaying.value) return;
  if (e.code === "Escape") {
    togglePause();
    return;
  }
  if (["KeyW", "ArrowUp"].includes(e.code)) {
    inputState.up = true;
    inputMode.value = "keyboard";
  }
  if (["KeyS", "ArrowDown"].includes(e.code)) {
    inputState.down = true;
    inputMode.value = "keyboard";
  }
  if (["KeyA", "ArrowLeft"].includes(e.code)) {
    inputState.left = true;
    inputMode.value = "keyboard";
  }
  if (["KeyD", "ArrowRight"].includes(e.code)) {
    inputState.right = true;
    inputMode.value = "keyboard";
  }
  if (e.code === "Space") inputState.shoot = true;
  if (e.code === "KeyQ") activateBlaster();
  if (e.code === "KeyW") activateShield();
  if (e.code === "KeyE") activateTimeSlow();
}
function onKeyUp(e) {
  if (showNameModal.value) return;
  if (["KeyW", "ArrowUp"].includes(e.code)) inputState.up = false;
  if (["KeyS", "ArrowDown"].includes(e.code)) inputState.down = false;
  if (["KeyA", "ArrowLeft"].includes(e.code)) inputState.left = false;
  if (["KeyD", "ArrowRight"].includes(e.code)) inputState.right = false;
  if (e.code === "Space") inputState.shoot = false;
}
function onMouseDown() {
  if (isPlaying.value && !isPaused.value && !showNameModal.value)
    inputState.shoot = true;
}
function onMouseUp() {
  inputState.shoot = false;
}
function onTouchStart() {}
function onTouchEnd() {}

// Responsive Movement: Map screen coordinates to game world size
function updateInputFromPointer(clientX, clientY) {
  if (!isPlaying.value || isPaused.value) return;
  inputMode.value = "mouse";

  // Normalize -1 to 1 based on screen size
  const ndcX = (clientX / window.innerWidth) * 2 - 1;
  const ndcY = (clientY / window.innerHeight) * 2 - 1;

  // Scale to game world dimensions (Adjusted for responsiveness)
  // 0.6 factor keeps the ship reachable with thumbs without obscuring edges
  const rangeX = screenAspect < 1 ? 25 : 35;
  const rangeY = 20;

  targetX = ndcX * rangeX;
  targetY = -ndcY * rangeY;
}

function onDocumentMouseMove(e) {
  updateInputFromPointer(e.clientX, e.clientY);
}

// Added touch move for "drag to move" feel on mobile
function onTouchMove(e) {
  if (e.touches.length > 0) {
    // Use the first touch point
    updateInputFromPointer(e.touches[0].clientX, e.touches[0].clientY);
  }
}

function updateInputTargets() {
  if (inputMode.value === "keyboard") {
    const speed = 0.8;
    if (inputState.up) targetY += speed; // Corrected direction
    if (inputState.down) targetY -= speed;
    if (inputState.left) targetX -= speed;
    if (inputState.right) targetX += speed;

    const rangeX = screenAspect < 1 ? 20 : 35;
    targetX = Math.max(-rangeX, Math.min(rangeX, targetX));
    targetY = Math.max(-20, Math.min(20, targetY));
  }
}

function togglePause() {
  if (!isPlaying.value) return;
  isPaused.value = !isPaused.value;
  timeScale.value = isPaused.value ? 0 : 1;
}

// --- SKILLS & WEAPONS ---
function startCooldown(pctRef, durationMs) {
  pctRef.value = 100;
  const step = 100 / (durationMs / 50);
  const timer = setInterval(() => {
    pctRef.value -= step;
    if (pctRef.value <= 0) {
      pctRef.value = 0;
      clearInterval(timer);
    }
  }, 50);
}

function activateBlaster() {
  if (cdBlasterPct.value > 0 || isPaused.value) return;
  const settings = qualitySettings[quality.value];
  const burstCount = settings.bossLaserCount * 4;
  for (let i = 0; i < burstCount; i++) {
    const angle = (i / burstCount) * Math.PI * 2;
    spawnLaser(0, angle, true);
  }
  camera.position.z += 0.5;
  setTimeout(() => (camera.position.z -= 0.5), 100);
  startCooldown(cdBlasterPct, 8000);
}

function activateShield() {
  if (cdShieldPct.value > 0 || isShieldActive.value || isPaused.value) return;
  isShieldActive.value = true;
  shieldMesh.visible = true;
  setTimeout(() => {
    isShieldActive.value = false;
    shieldMesh.visible = false;
  }, 3000);
  startCooldown(cdShieldPct, 10000);
}

function activateTimeSlow() {
  if (cdTimePct.value > 0 || isTimeSlowActive.value || isPaused.value) return;
  isTimeSlowActive.value = true;
  timeScale.value = 0.2;
  scene.fog.color.setHex(0x220033);
  setTimeout(() => {
    isTimeSlowActive.value = false;
    timeScale.value = 1.0;
    scene.fog.color.setHex(0x050510);
  }, 4000);
  startCooldown(cdTimePct, 15000);
}

function firePlayerWeapon() {
  const now = Date.now();
  if (now - lastShotTime > 150) {
    const settings = qualitySettings[quality.value];
    if (isTripleShotActive.value) {
      spawnLaser(-0.8);
      spawnLaser(0);
      spawnLaser(0.8);
    } else {
      for (let i = 0; i < settings.laserCount; i++) {
        const offset = (i - (settings.laserCount - 1) / 2) * 0.4;
        spawnLaser(offset);
      }
    }
    lastShotTime = now;
  }
}

function spawnLaser(offsetX, angleY = 0, isUlt = false) {
  let laserGroup;
  if (laserPool.length > 0) {
    laserGroup = laserPool.pop();
    laserGroup.position.set(0, 0, 0);
    laserGroup.rotation.set(0, 0, 0);
    laserGroup.visible = true;
  } else {
    laserGroup = new THREE.Group();
    const coreGeo = new THREE.CylinderGeometry(
      isUlt ? 0.1 : 0.08,
      isUlt ? 0.1 : 0.08,
      isUlt ? 3 : 2.5,
      8
    );
    coreGeo.rotateX(Math.PI / 2);
    const coreMat = new THREE.MeshStandardMaterial({
      color: isUlt ? 0xff0044 : 0x00ffaa,
      emissive: isUlt ? 0xff0044 : 0x00ffff,
      emissiveIntensity: 1.5,
    });
    laserGroup.add(new THREE.Mesh(coreGeo, coreMat));
  }

  laserGroup.position.copy(playerShip.position);
  laserGroup.position.x += offsetX;
  laserGroup.position.z -= 0.5;
  laserGroup.rotation.y = angleY;

  const velocity = isUlt
    ? new THREE.Vector3(Math.sin(angleY) * 1.5, 0, Math.cos(angleY) * 1.5)
    : new THREE.Vector3(Math.sin(angleY) * 0.5, 0, -2);

  scene.add(laserGroup);
  lasers.push({ mesh: laserGroup, velocity: velocity, isUlt: isUlt });
}

function createExplosion(position, isSmall = false) {
  const settings = qualitySettings[quality.value];
  let explosion;
  if (explosionPool.length > 0) {
    explosion = explosionPool.pop();
    explosion.mesh.position.copy(position);
    explosion.life = 1.0;
    explosion.mesh.visible = true;
    explosion.mesh.material.opacity = 1.0;
  } else {
    const particleCount = isSmall
      ? Math.floor(settings.particleCount / 3)
      : settings.particleCount;
    const particles = new THREE.BufferGeometry();
    const pos = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      const size = isSmall ? 1 : 4;
      pos[i * 3] = (Math.random() - 0.5) * size; // Relative
      pos[i * 3 + 1] = (Math.random() - 0.5) * size;
      pos[i * 3 + 2] = (Math.random() - 0.5) * size;
      const color = new THREE.Color().setHSL(Math.random() * 0.1, 1, 0.5);
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }
    // Correct position setting
    const finalPos = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount * 3; i += 3) {
      finalPos[i] = position.x + pos[i];
      finalPos[i + 1] = position.y + pos[i + 1];
      finalPos[i + 2] = position.z + pos[i + 2];
    }

    particles.setAttribute("position", new THREE.BufferAttribute(finalPos, 3));
    particles.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    const material = new THREE.PointsMaterial({
      size: isSmall ? 0.2 : 0.4,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      transparent: true,
      opacity: 1,
    });
    const system = new THREE.Points(particles, material);
    scene.add(system);
    explosion = { mesh: system, life: 1.0 };
  }
  explosions.push(explosion);
}

// --- SPAWNERS (RESPONSIVE) ---

// Helper for responsive X spawn position
function getResponsiveSpawnX() {
  const range = screenAspect < 1 ? 25 : 50;
  return (Math.random() - 0.5) * range;
}

function spawnAsteroid() {
  const settings = qualitySettings[quality.value];
  const mesh = new THREE.Mesh(asteroidGeometry, asteroidMaterial);
  const radius = Math.random() * 1.0 + 0.5;
  mesh.scale.set(radius, radius, radius);
  mesh.castShadow = settings.shadowMapEnabled;
  mesh.position.set(getResponsiveSpawnX(), (Math.random() - 0.5) * 30, -150);
  mesh.rotation.set(Math.random() * 3, Math.random() * 3, 0);
  scene.add(mesh);
  asteroids.push({
    mesh,
    rotSpeed: { x: Math.random() * 0.05, y: Math.random() * 0.05 },
  });
}

function spawnPowerUp() {
  const mesh = new THREE.Mesh(powerUpGeometry, powerUpMaterial);
  mesh.position.set(getResponsiveSpawnX(), (Math.random() - 0.5) * 20, -150);
  scene.add(mesh);
  powerUps.push({ mesh });
}

function spawnRepairKit() {
  const mesh = new THREE.Mesh(repairKitGeometry, repairKitMaterial);
  mesh.position.set(getResponsiveSpawnX(), (Math.random() - 0.5) * 20, -150);
  scene.add(mesh);
  repairKits.push({ mesh });
}

function tintModel(mesh, colorHex) {
  mesh.traverse((child) => {
    if (child.isMesh) {
      child.material = child.material.clone();
      child.material.color.setHex(colorHex);
    }
  });
}

function spawnEnemy() {
  const settings = qualitySettings[quality.value];
  let mesh;
  let type = "normal";
  let speedBonus = 0;
  let hp = 1;

  const templateIndex = Math.min(level.value - 1, enemyTemplates.length - 1);
  const enemyTemplate = enemyTemplates[templateIndex];

  if (enemyTemplate) {
    mesh = enemyTemplate.clone();
    if (level.value === 1) {
      mesh.scale.set(3.0, 3.0, 3.0);
    } else if (level.value === 2) {
      mesh.scale.set(3.0, 3.0, 3.0);
      tintModel(mesh, 0xffaa00);
      speedBonus = 0.3;
      type = "scout";
    } else {
      mesh.scale.set(3.0, 3.0, 3.0);
      tintModel(mesh, 0x00ffcc);
      hp = 3;
      type = "tank";
    }
    mesh.rotation.y = Math.PI;
  } else {
    mesh = new THREE.Mesh(enemyFallbackGeometry, enemyFallbackMaterial);
  }

  mesh.position.set(getResponsiveSpawnX(), (Math.random() - 0.5) * 20, -150);
  scene.add(mesh);

  enemies.push({
    mesh,
    lastFire: 0,
    fireRate: Math.random() * 2000 + 1000,
    speedZ: Math.random() * 0.5 + 0.5 + speedBonus,
    hp: hp,
    type: type,
  });
}

function spawnEnemyLaser(
  startPos,
  isBoss = false,
  angleOffset = 0,
  isCritical = false
) {
  const geo = isBoss
    ? new THREE.SphereGeometry(0.5, 8, 8)
    : new THREE.SphereGeometry(0.2, 4, 4);
  const color = isBoss ? (isCritical ? 0xff0000 : 0xff00ff) : 0xff0000;
  const mat = new THREE.MeshBasicMaterial({ color: color });
  const laser = new THREE.Mesh(geo, mat);
  laser.position.copy(startPos);

  let velocity = new THREE.Vector3(0, 0, 1);
  if (angleOffset !== 0)
    velocity = new THREE.Vector3(
      Math.sin(angleOffset),
      0,
      Math.cos(angleOffset)
    );

  scene.add(laser);
  const damage = isBoss ? (isCritical ? 30 : 20) : 10;
  const laserObj = { mesh: laser, velocity: velocity, damage: damage };
  if (isBoss) bossLasers.push(laserObj);
  else enemyLasers.push(laserObj);
}

// --- BOSS LOGIC ---
function spawnBoss() {
  isBossActive.value = true;
  const hp = 1000 + level.value * 500;
  bossStats.maxHp = hp;
  bossStats.hp = hp;
  bossStats.isEnraged = false;
  bossStats.isCritical = false;
  bossStats.hasUsedUltimate = false;

  const templateIndex = Math.min(level.value - 1, bossTemplates.length - 1);
  const bossTemplate = bossTemplates[templateIndex];

  let mesh;
  if (bossTemplate) {
    mesh = bossTemplate.clone();
    mesh.scale.set(3.0, 3.0, 3.0);
    mesh.rotation.y = Math.PI;
  } else {
    mesh = new THREE.Mesh(bossFallbackGeometry, bossFallbackMaterial);
  }

  mesh.position.set(0, 5, -50);
  const light = new THREE.PointLight(0xff00ff, 2, 20);
  mesh.add(light);
  scene.add(mesh);

  boss = {
    mesh,
    lastFire: 0,
    fireRate: 800,
    floatOffset: 0,
    angle: 0,
    spiralTimer: 0,
    ultimateDuration: 0,
    criticalAttackTimer: 0,
  };
}

function updateBoss(currentSpeed) {
  if (!boss) return;
  const settings = qualitySettings[quality.value];

  boss.floatOffset += 0.02 * timeScale.value;
  boss.mesh.position.x =
    Math.sin(boss.floatOffset) * (screenAspect < 1 ? 8 : 15); // Less side movement on mobile
  boss.mesh.position.y = Math.cos(boss.floatOffset * 0.5) * 5 + 2;
  boss.mesh.lookAt(
    playerShip.position.x,
    playerShip.position.y,
    playerShip.position.z + 50
  );

  if (boss.mesh.position.z < -20) boss.mesh.position.z += 0.5 * timeScale.value;

  const hpPercent = bossStats.hp / bossStats.maxHp;
  if (hpPercent < 0.5 && !bossStats.isEnraged) bossStats.isEnraged = true;
  if (hpPercent < 0.25 && !bossStats.isCritical) {
    bossStats.isCritical = true;
    if (boss.mesh.children[0]?.isLight)
      boss.mesh.children[0].color.setHex(0xff0000);
  }

  const now = Date.now();
  if (boss.mesh.position.z > -40) {
    if (bossStats.isEnraged && !bossStats.hasUsedUltimate) {
      boss.ultimateDuration += 16 * timeScale.value;
      if (now - boss.lastFire > 200) {
        boss.angle += 0.3;
        spawnEnemyLaser(boss.mesh.position, true, boss.angle, false);
        spawnEnemyLaser(boss.mesh.position, true, boss.angle + Math.PI, false);
        boss.lastFire = now;
      }
      if (boss.ultimateDuration > 3000) {
        bossStats.hasUsedUltimate = true;
        boss.ultimateDuration = 0;
      }
    } else if (now - boss.lastFire > boss.fireRate) {
      if (bossStats.isCritical) {
        for (let i = 0; i < settings.bossLaserCount; i++) {
          const angle = (i / settings.bossLaserCount) * Math.PI * 2;
          spawnEnemyLaser(boss.mesh.position, true, angle, true);
        }
      } else {
        spawnEnemyLaser(boss.mesh.position, true, 0, false);
        const leftPos = boss.mesh.position.clone();
        leftPos.x -= 2;
        spawnEnemyLaser(leftPos, true, 0, false);
        const rightPos = boss.mesh.position.clone();
        rightPos.x += 2;
        spawnEnemyLaser(rightPos, true, 0, false);
      }
      boss.lastFire = now;
    }
  }

  const playerBox = new THREE.Box3().setFromObject(playerShip);
  const bossBox = new THREE.Box3().setFromObject(boss.mesh);
  if (playerBox.intersectsBox(bossBox) && !isShieldActive.value) {
    health.value -= 1;
    if (health.value <= 0) gameOver();
  }
}

function handleBossDefeat() {
  createExplosion(boss.mesh.position);
  isBossActive.value = false;
  scene.remove(boss.mesh);
  boss = null;

  if (level.value >= 5) {
    victory();
  } else {
    isRestPhase.value = true;
    restPhaseTimer.value = restPhaseDuration;
    score.value += 5000;
    health.value = Math.min(100, health.value + 50);
    asteroids.forEach((a) => scene.remove(a.mesh));
    asteroids = [];
    enemyLasers.forEach((l) => scene.remove(l.mesh));
    enemyLasers = [];
    bossLasers.forEach((l) => scene.remove(l.mesh));
    bossLasers = [];
  }
}

function updateRestPhase(deltaTime) {
  if (!isRestPhase.value) return;
  restPhaseTimer.value -= deltaTime;
  if (Math.random() < 0.02 * timeScale.value) spawnAsteroid();
  if (Math.random() < 0.005 * timeScale.value) spawnRepairKit();
  if (restPhaseTimer.value <= 0) {
    isRestPhase.value = false;
    level.value++;
    nextBossScoreThreshold += 2000;
    showLevelUp.value = true;
    setTimeout(() => {
      showLevelUp.value = false;
    }, 3000);
  }
}

function victory() {
  isPlaying.value = false;
  isVictory.value = true;
  isPaused.value = false;
  score.value += 10000;
  const highScore = localStorage.getItem("voidCommanderHighScore") || 0;
  if (score.value > highScore)
    localStorage.setItem("voidCommanderHighScore", score.value);
}

// --- CLEANUP ---
function cleanupThreeJS() {
  const disposeObject = (obj) => {
    if (obj.geometry) obj.geometry.dispose();
    if (obj.material) {
      if (Array.isArray(obj.material))
        obj.material.forEach((mat) => mat.dispose());
      else obj.material.dispose();
    }
  };

  [
    ...asteroids,
    ...repairKits,
    ...powerUps,
    ...enemies,
    ...lasers,
    ...enemyLasers,
    ...bossLasers,
    ...explosions,
  ].forEach((obj) => {
    if (obj.mesh) {
      disposeObject(obj.mesh);
      scene.remove(obj.mesh);
    }
  });

  if (boss) {
    disposeObject(boss.mesh);
    scene.remove(boss.mesh);
  }
  laserPool.forEach((mesh) => {
    disposeObject(mesh);
    scene.remove(mesh);
  });
  explosionPool.forEach((exp) => {
    if (exp.mesh) {
      disposeObject(exp.mesh);
      scene.remove(exp.mesh);
    }
  });

  if (starSystem) {
    disposeObject(starSystem);
    scene.remove(starSystem);
  }
  if (renderer) {
    renderer.dispose();
    renderer.forceContextLoss();
  }

  // Shared Resources
  [
    asteroidGeometry,
    asteroidMaterial,
    powerUpGeometry,
    powerUpMaterial,
    repairKitGeometry,
    repairKitMaterial,
    enemyFallbackGeometry,
    enemyFallbackMaterial,
    bossFallbackGeometry,
    bossFallbackMaterial,
  ].forEach((res) => {
    if (res && res.dispose) res.dispose();
  });
}

// --- GAME LOOP ---
function startGame() {
  score.value = 0;
  health.value = 100;
  level.value = 1;
  baseGameSpeed.value = 0.8;
  timeScale.value = 1.0;
  isGameOver.value = false;
  isPlaying.value = true;
  isPaused.value = false;
  isVictory.value = false;
  isBossActive.value = false;
  showLevelUp.value = false;
  isTripleShotActive.value = false;
  isRestPhase.value = false;
  restPhaseTimer.value = 0;
  nextBossScoreThreshold = 1500;
  targetX = 0;
  targetY = 0;

  // Quick Cleanup
  asteroids.forEach((a) => scene.remove(a.mesh));
  asteroids = [];
  enemies.forEach((e) => scene.remove(e.mesh));
  enemies = [];
  lasers.forEach((l) => scene.remove(l.mesh));
  lasers = [];
  enemyLasers.forEach((l) => scene.remove(l.mesh));
  enemyLasers = [];
  bossLasers.forEach((l) => scene.remove(l.mesh));
  bossLasers = [];
  if (boss) {
    scene.remove(boss.mesh);
    boss = null;
  }

  cdBlasterPct.value = 0;
  cdShieldPct.value = 0;
  cdTimePct.value = 0;
  isShieldActive.value = false;
  isTimeSlowActive.value = false;
  if (shieldMesh) shieldMesh.visible = false;
  playerShip.position.set(0, 0, 0);
}

function updateGame() {
  if (!isPlaying.value || isPaused.value || !playerShip) return;

  const currentSpeed = baseGameSpeed.value * timeScale.value;
  const deltaTime = 16 * timeScale.value;

  baseGameSpeed.value += 0.0001 * timeScale.value;
  score.value += currentSpeed;

  updateRestPhase(deltaTime);
  updateInputTargets();
  if (inputState.shoot) firePlayerWeapon();

  // Smooth Movement
  playerShip.position.x += (targetX - playerShip.position.x) * 0.1;
  playerShip.position.y += (targetY - playerShip.position.y) * 0.1;
  playerShip.rotation.z = -THREE.MathUtils.clamp(
    (targetX - playerShip.position.x) * 0.1,
    -0.8,
    0.8
  );
  playerShip.rotation.x = THREE.MathUtils.clamp(
    (targetY - playerShip.position.y) * 0.1,
    -0.5,
    0.5
  );
  if (shieldMesh) shieldMesh.rotation.copy(playerShip.rotation);

  if (!isRestPhase.value) {
    if (!isBossActive.value) {
      if (score.value > nextBossScoreThreshold) {
        spawnBoss();
      } else {
        if (Math.random() < (0.05 + level.value * 0.01) * currentSpeed)
          spawnAsteroid();
        if (Math.random() < (0.01 + level.value * 0.005) * currentSpeed)
          spawnEnemy();
        if (Math.random() < 0.002) spawnRepairKit();
        if (Math.random() < 0.001) spawnPowerUp();
      }
    } else {
      updateBoss(currentSpeed);
    }
  }

  const playerBox = new THREE.Box3().setFromObject(playerShip);

  // Update Lasers
  for (let i = lasers.length - 1; i >= 0; i--) {
    const l = lasers[i];
    l.mesh.position.add(l.velocity.clone().multiplyScalar(timeScale.value));

    let hit = false;
    const laserBox = new THREE.Box3().setFromObject(l.mesh);

    // Collision: Boss Lasers
    for (let j = bossLasers.length - 1; j >= 0; j--) {
      if (
        laserBox.intersectsBox(
          new THREE.Box3().setFromObject(bossLasers[j].mesh)
        )
      ) {
        createExplosion(l.mesh.position, true);
        scene.remove(l.mesh);
        lasers.splice(i, 1);
        scene.remove(bossLasers[j].mesh);
        bossLasers.splice(j, 1);
        score.value += 25;
        hit = true;
        break;
      }
    }

    if (hit) continue;

    // Collision: Boss
    if (isBossActive.value && boss) {
      const bossBox = new THREE.Box3().setFromObject(boss.mesh);
      if (laserBox.intersectsBox(bossBox)) {
        bossStats.hp -= 25;
        if (boss.mesh.material) {
          const oldColor = boss.mesh.material.emissive.getHex();
          boss.mesh.material.emissive.setHex(0xffffff);
          setTimeout(() => {
            if (boss?.mesh?.material)
              boss.mesh.material.emissive.setHex(oldColor);
          }, 50);
        }
        hit = true;
        if (bossStats.hp <= 0) handleBossDefeat();
      }
    }

    if (!hit) {
      // Collision: Asteroids
      for (let j = asteroids.length - 1; j >= 0; j--) {
        if (
          laserBox.intersectsBox(
            new THREE.Box3().setFromObject(asteroids[j].mesh)
          )
        ) {
          createExplosion(asteroids[j].mesh.position);
          scene.remove(asteroids[j].mesh);
          asteroids.splice(j, 1);
          score.value += 50;
          if (!l.isUlt) hit = true;
          break;
        }
      }
      // Collision: Enemies
      if (!hit || l.isUlt) {
        for (let j = enemies.length - 1; j >= 0; j--) {
          const enemyBox = new THREE.Box3().setFromObject(enemies[j].mesh);
          enemyBox.expandByScalar(1.5);
          if (laserBox.intersectsBox(enemyBox)) {
            enemies[j].hp -= 1;
            if (enemies[j].hp <= 0) {
              createExplosion(enemies[j].mesh.position);
              scene.remove(enemies[j].mesh);
              enemies.splice(j, 1);
              score.value += 150;
            } else {
              enemies[j].mesh.position.z -= 2;
            }
            if (!l.isUlt) hit = true;
            if (!l.isUlt) break;
          }
        }
      }
    }

    if (
      (hit && !l.isUlt) ||
      l.mesh.position.z < -200 ||
      l.mesh.position.z > 50
    ) {
      scene.remove(l.mesh);
      l.mesh.visible = false;
      if (laserPool.length < maxPoolSize) laserPool.push(l.mesh);
      lasers.splice(i, 1);
    }
  }

  // Update Enemy Lasers
  const processEnemyLaser = (list) => {
    for (let i = list.length - 1; i >= 0; i--) {
      const l = list[i];
      if (l.velocity && l.velocity.z !== 1) {
        l.mesh.position.add(
          l.velocity
            .clone()
            .multiplyScalar(
              isBossActive.value ? 0.4 * currentSpeed : currentSpeed
            )
        );
        l.mesh.position.z += 0.2 * currentSpeed;
      } else {
        l.mesh.position.z += (isBossActive.value ? 0.8 : 1.0) * currentSpeed;
      }

      if (playerBox.containsPoint(l.mesh.position)) {
        if (!isShieldActive.value) {
          health.value -= l.damage || 10;
          if (health.value <= 0) gameOver();
        }
        scene.remove(l.mesh);
        list.splice(i, 1);
        continue;
      }
      if (l.mesh.position.z > 20) {
        scene.remove(l.mesh);
        list.splice(i, 1);
      }
    }
  };

  processEnemyLaser(enemyLasers);
  processEnemyLaser(bossLasers);

  // Update Enemies
  for (let i = enemies.length - 1; i >= 0; i--) {
    const e = enemies[i];
    e.mesh.position.z += e.speedZ + currentSpeed;
    e.mesh.position.x +=
      (playerShip.position.x - e.mesh.position.x) * 0.01 * timeScale.value;

    const now = Date.now();
    if (now - e.lastFire > e.fireRate && e.mesh.position.z > -100) {
      spawnEnemyLaser(e.mesh.position);
      e.lastFire = now;
    }

    if (e.mesh.position.z > 20) {
      scene.remove(e.mesh);
      enemies.splice(i, 1);
    } else if (
      playerBox.intersectsBox(new THREE.Box3().setFromObject(e.mesh))
    ) {
      createExplosion(e.mesh.position);
      if (!isShieldActive.value) health.value -= 30;
      scene.remove(e.mesh);
      enemies.splice(i, 1);
      if (health.value <= 0) gameOver();
    }
  }

  // Asteroids, Repair, Powerups
  const updateObjects = (arr, onHit, speedMult = 1.5) => {
    for (let i = arr.length - 1; i >= 0; i--) {
      const o = arr[i];
      o.mesh.position.z += speedMult * currentSpeed;
      if (o.rotSpeed) {
        o.mesh.rotation.x += o.rotSpeed.x;
        o.mesh.rotation.y += o.rotSpeed.y;
      } else {
        o.mesh.rotation.y += 0.05;
      }

      if (o.mesh.position.z > 20) {
        scene.remove(o.mesh);
        arr.splice(i, 1);
      } else if (
        playerBox.intersectsBox(new THREE.Box3().setFromObject(o.mesh))
      ) {
        onHit(o, i);
        scene.remove(o.mesh);
        arr.splice(i, 1);
      }
    }
  };

  updateObjects(asteroids, () => {
    createExplosion(playerShip.position);
    if (!isShieldActive.value) {
      health.value -= 20;
      if (health.value <= 0) gameOver();
    }
  });

  updateObjects(repairKits, () => {
    health.value = Math.min(100, health.value + 25);
    score.value += 100;
  });

  updateObjects(powerUps, () => {
    isTripleShotActive.value = true;
    score.value += 250;
    setTimeout(() => {
      isTripleShotActive.value = false;
    }, 5000);
  });

  // Explosions
  for (let i = explosions.length - 1; i >= 0; i--) {
    const e = explosions[i];
    e.life -= 0.02 * timeScale.value;
    e.mesh.material.opacity = e.life;
    if (e.life <= 0) {
      e.mesh.visible = false;
      if (explosionPool.length < maxPoolSize) explosionPool.push(e);
      else scene.remove(e.mesh);
      explosions.splice(i, 1);
    }
  }
}

function gameOver() {
  isPlaying.value = false;
  isGameOver.value = true;
  isPaused.value = false;
  spaceStore.submitScore(
    astronautName.value,
    Math.floor(score.value),
    "GAME 2: ADVENTURE"
  );
}

function handleNameSubmit(name) {
  astronautName.value = name;
  showNameModal.value = false;
}

function goToLobby() {
  router.push("/game");
}

function animate() {
  animationId = requestAnimationFrame(animate);
  const currentSpeed = baseGameSpeed.value * timeScale.value;

  if (starSystem) starSystem.rotation.z += 0.0005 * timeScale.value;
  if (nebulaSystem) {
    const positions = nebulaSystem.geometry.attributes.position.array;
    for (let i = 2; i < positions.length; i += 3) {
      positions[i] += 2 * currentSpeed;
      if (positions[i] > 50) positions[i] = -200;
    }
    nebulaSystem.geometry.attributes.position.needsUpdate = true;
  }

  updateGame();

  // Smooth Camera Follow
  camera.position.x += (0 - camera.position.x) * 0.1;
  camera.position.y += ((screenAspect < 1 ? 10 : 3) - camera.position.y) * 0.1;

  renderer.render(scene, camera);
}

function onWindowResize() {
  updateCameraForResponsive();
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
</script>

<style scoped>
.game-container {
  cursor: crosshair;
  touch-action: none;
}
.bg-radial-gradient {
  background: radial-gradient(circle at center, #1a1a2e 0%, #000000 100%);
}
.hud-panel {
  @apply bg-gray-900/60 backdrop-blur-md border border-white/10 p-2 md:p-3 rounded-lg shadow-lg;
}
.dpad-btn {
  @apply absolute w-10 h-10 bg-white/10 border border-white/20 text-white/70 flex items-center justify-center text-sm active:bg-cyan-500/50 active:scale-95 transition-all outline-none select-none;
}
.skill-slot {
  @apply relative w-12 h-12 md:w-16 md:h-16 bg-gray-900/80 rounded-lg border border-gray-600 flex items-center justify-center cursor-pointer transition-all active:scale-90 md:hover:scale-110 md:active:scale-95 touch-manipulation;
}
.skill-key {
  @apply absolute -top-3 -left-2 bg-gray-800 text-white text-xs font-bold px-2 py-0.5 rounded border border-gray-600 z-30;
}
.skill-icon {
  @apply w-full h-full flex items-center justify-center rounded-lg border-b-4 opacity-80;
}
.cooldown-overlay {
  @apply absolute bottom-0 left-0 w-full bg-black/70 z-20 transition-all rounded-lg;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
.animate-fade-in {
  animation: fadeIn 0.5s ease-out forwards;
}
</style>
