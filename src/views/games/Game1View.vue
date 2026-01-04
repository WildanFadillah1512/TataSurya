<template>
  <div class="game-container">
    <canvas ref="canvasRef" class="background-canvas"></canvas>

    <div class="top-panel">
      <button @click="confirmExit" class="back-btn">
        <span class="btn-icon">←</span>
        <span class="btn-text">KEMBALI</span>
      </button>

      <div class="stats-panel-left">
        <div class="stat-item level">
          <div class="stat-icon">🎯</div>
          <div class="stat-content">
            <div class="stat-label">LEVEL</div>
            <div class="stat-value">{{ currentLevel }}/10</div>
          </div>
        </div>

        <div class="stat-item score">
          <div class="stat-icon">⭐</div>
          <div class="stat-content">
            <div class="stat-label">SKOR</div>
            <div class="stat-value">{{ score }}</div>
          </div>
        </div>
      </div>

      <div class="stats-panel-right">
        <div class="stat-item lives">
          <div class="stat-icon">❤️</div>
          <div class="stat-content">
            <div class="stat-label">NYAWA</div>
            <div class="stat-value">{{ lives }}/3</div>
          </div>
        </div>
      </div>
    </div>

    <button
      v-if="!gameOver && !levelComplete"
      @click="useHint"
      class="hint-btn-floating"
      :disabled="hintsUsed >= maxHints"
      :class="{ disabled: hintsUsed >= maxHints }"
    >
      <span class="hint-icon">💡</span>
      <span class="hint-count">{{ maxHints - hintsUsed }}</span>
    </button>

    <div v-if="!gameOver && !levelComplete" class="clue-container">
      <div class="clue-box">
        <div class="clue-icon">🔍</div>
        <p class="clue-text">{{ currentQuestion.clue }}</p>
      </div>
    </div>

    <div ref="modelContainer" class="model-display"></div>

    <div v-if="!gameOver && !levelComplete" class="game-content">
      <div class="answer-slots">
        <div
          v-for="(letter, index) in answerSlots"
          :key="`slot-${index}`"
          @click="deselectLetter(index)"
          class="letter-slot"
          :class="{
            filled: letter !== null,
            correct: isCorrect && letter !== null,
            wrong: showWrong && letter !== null,
            'cursor-pointer': letter !== null && !isCorrect,
          }"
        >
          <span class="slot-letter">{{ letter || "" }}</span>
        </div>
      </div>

      <div class="letters-container">
        <button
          v-for="(letter, index) in availableLetters"
          :key="`letter-${index}`"
          :disabled="letter.used"
          @click="selectLetter(index)"
          class="letter-btn"
          :class="{ used: letter.used }"
        >
          <span class="letter-char">{{ letter.char }}</span>
        </button>
      </div>
    </div>

    <div v-if="gameOver" class="result-screen game-over">
      <div class="result-card">
        <div class="result-emoji-big">
          {{ finalScore >= 80 ? "🏆" : finalScore >= 50 ? "🌟" : "💫" }}
        </div>
        <h2 class="result-title-big">{{ getGameOverTitle() }}</h2>

        <div class="final-score-box">
          <div class="score-label">NILAI AKHIR</div>
          <div class="score-big">{{ finalScore }}</div>
          <div class="score-subtitle">dari 100 poin</div>
        </div>

        <div class="score-breakdown">
          <div class="breakdown-item">
            <span class="breakdown-label">Level Selesai:</span>
            <span class="breakdown-value">
              {{
                gameOver
                  ? currentLevel > 10
                    ? 10
                    : currentLevel
                  : currentLevel > 10
                  ? 10
                  : currentLevel - 1
              }}/10
            </span>
          </div>
          <div class="breakdown-item">
            <span class="breakdown-label">Akurasi:</span>
            <span class="breakdown-value">{{ getAccuracy() }}%</span>
          </div>
          <div class="breakdown-item">
            <span class="breakdown-label">Rating:</span>
            <span class="breakdown-value">{{ getRating() }}</span>
          </div>
        </div>

        <div class="result-buttons">
          <button @click="restartGame" class="result-btn primary-btn">
            <span class="btn-icon">🔄</span>
            <span>MAIN LAGI</span>
          </button>
          <button @click="exitToLobby" class="result-btn secondary-btn">
            <span class="btn-icon">←</span>
            <span>KEMBALI</span>
          </button>
        </div>
      </div>
    </div>

    <div v-if="showParticles" class="particles-container">
      <div
        v-for="n in 30"
        :key="n"
        class="particle"
        :style="getParticleStyle()"
      ></div>
    </div>

    <div
      v-if="showExitModal"
      class="modal-overlay"
      @click="showExitModal = false"
    >
      <div class="modal-content" @click.stop>
        <div class="modal-icon">⚠️</div>
        <h3 class="modal-title">Keluar dari Permainan?</h3>
        <p class="modal-text">Progress Anda akan hilang</p>
        <div class="modal-buttons">
          <button @click="exitToLobby" class="modal-btn confirm-btn">
            Ya, Keluar
          </button>
          <button @click="showExitModal = false" class="modal-btn cancel-btn">
            Lanjut Main
          </button>
        </div>
      </div>
    </div>

    <!-- PLAYER NAME MODAL -->
    <PlayerNameModal 
      :show="showNameModal" 
      title="GAME 1: MYSTERY"
      @submit="handleNameSubmit" 
      @back="exitToLobby"
    />
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed, watch } from "vue";
import { useRouter } from "vue-router";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import gsap from "gsap";
import { useSpaceStore } from "../../stores/spaceStore";
import PlayerNameModal from "../../components/PlayerNameModal.vue";

const spaceStore = useSpaceStore();
const router = useRouter();
const canvasRef = ref(null);
const modelContainer = ref(null);

// Game State
const currentLevel = ref(1);
const score = ref(0);
const lives = ref(3);
const hintsUsed = ref(0);
const maxHints = ref(3);
const gameOver = ref(false);
const levelComplete = ref(false);
const isCorrect = ref(false);
const showWrong = ref(false);
const showParticles = ref(false);
const totalAttempts = ref(0);
const correctAttempts = ref(0);
const showExitModal = ref(false);
const showNameModal = ref(true);
const astronautName = ref("");

const finalScore = computed(() => score.value);

// 10 Questions
const allQuestions = [
  {
    level: 1,
    name: "BUMI",
    answer: "BUMI",
    clue: "Rumah kita! Planet biru dengan 70% air. Siapa aku? 🌍",
    model: "earth.glb",
    points: 10,
  },
  {
    level: 2,
    name: "BULAN",
    answer: "BULAN",
    clue: "Aku temanmu setiap malam, memantulkan cahaya matahari. Siapa aku? 🌙",
    model: "moon.glb",
    points: 10,
  },
  {
    level: 3,
    name: "MARS",
    answer: "MARS",
    clue: "Planet merah dengan gunung tertinggi di tata surya! Siapa aku? 🔴",
    model: "mars.glb",
    points: 10,
  },
  {
    level: 4,
    name: "JUPITER",
    answer: "JUPITER",
    clue: "Raja planet! Terbesar di tata surya dengan bintik merah raksasa. Siapa aku? ⚡",
    model: "jupiter.glb",
    points: 10,
  },
  {
    level: 5,
    name: "SATURNUS",
    answer: "SATURNUS",
    clue: "Planet tercantik dengan cincin indah dari es dan batu! Siapa aku? 💍",
    model: "saturn.glb",
    points: 10,
  },
  {
    level: 6,
    name: "VENUS",
    answer: "VENUS",
    clue: "Bintang kejora! Planet terpanas yang berputar terbalik. Siapa aku? 🌟",
    model: "venus.glb",
    points: 10,
  },
  {
    level: 7,
    name: "MERKURIUS",
    answer: "MERKURIUS",
    clue: "Planet terkecil dan tercepat! Penuh kawah seperti bulan. Siapa aku? 🏃",
    model: "mercury.glb",
    points: 10,
  },
  {
    level: 8,
    name: "NEPTUNUS",
    answer: "NEPTUNUS",
    clue: "Planet terjauh dengan angin tercepat 2.100 km/jam! Biru gelap. Siapa aku? 🌊",
    model: "neptune.glb",
    points: 10,
  },
  {
    level: 9,
    name: "URANUS",
    answer: "URANUS",
    clue: "Planet unik yang berputar miring seperti bola menggelinding! Siapa aku? 🎱",
    model: "uranus.glb",
    points: 10,
  },
  {
    level: 10,
    name: "MATAHARI",
    answer: "MATAHARI",
    clue: "Bintang pusat tata surya! Sumber kehidupan semua planet. Siapa aku? ☀️",
    model: "sun.glb",
    points: 10,
  },
];

const currentQuestion = ref(allQuestions[0]);
const answerSlots = ref([]);
const availableLetters = ref([]);

let scene, camera, renderer, controls, planetMesh, starfield;
let animationId;

const initializeAnswer = () => {
  const answer = currentQuestion.value.answer;
  answerSlots.value = new Array(answer.length).fill(null);

  const letters = answer.split("").map((char) => ({ char, used: false }));

  const extraCount = Math.min(5, Math.floor(currentLevel.value / 2) + 2);
  const extraLetters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  for (let i = 0; i < extraCount; i++) {
    const randomChar =
      extraLetters[Math.floor(Math.random() * extraLetters.length)];
    if (!answer.includes(randomChar)) {
      letters.push({ char: randomChar, used: false });
    }
  }

  availableLetters.value = letters.sort(() => Math.random() - 0.5);

  isCorrect.value = false;
  showWrong.value = false;
  levelComplete.value = false;
};

const selectLetter = (index) => {
  const letter = availableLetters.value[index];
  if (letter.used) return;

  const emptySlotIndex = answerSlots.value.findIndex((slot) => slot === null);
  if (emptySlotIndex !== -1) {
    answerSlots.value[emptySlotIndex] = letter.char;
    letter.used = true;

    if (answerSlots.value.every((slot) => slot !== null)) {
      setTimeout(() => checkAnswer(), 300);
    }
  }
};

const deselectLetter = (slotIndex) => {
  if (isCorrect.value || showWrong.value || gameOver.value) return;

  const char = answerSlots.value[slotIndex];
  if (!char) return;

  const letterInPool = availableLetters.value.find(
    (l) => l.char === char && l.used
  );

  if (letterInPool) {
    letterInPool.used = false;
    answerSlots.value[slotIndex] = null;
  }
};

const checkAnswer = () => {
  totalAttempts.value++;
  const userAnswer = answerSlots.value.join("");
  const correctAnswer = currentQuestion.value.answer;

  if (userAnswer === correctAnswer) {
    correctAttempts.value++;
    isCorrect.value = true;
    showParticles.value = true;

    score.value += currentQuestion.value.points;

    if (planetMesh) {
      gsap.to(planetMesh.rotation, {
        y: planetMesh.rotation.y + Math.PI * 2,
        duration: 1.5,
        ease: "power2.inOut",
      });
      gsap.to(planetMesh.scale, {
        x: planetMesh.scale.x * 1.2,
        y: planetMesh.scale.y * 1.2,
        z: planetMesh.scale.z * 1.2,
        duration: 0.3,
        yoyo: true,
        repeat: 1,
      });
    }

    setTimeout(() => {
      showParticles.value = false;

      if (currentLevel.value >= 10) {
        gameOver.value = true;
        spaceStore.submitScore(astronautName.value, score.value, "GAME 1: MYSTERY");
      } else {
        currentLevel.value++;
        currentQuestion.value = allQuestions[currentLevel.value - 1];
        initializeAnswer();
        loadPlanetModel();
      }
    }, 1500);
  } else {
    showWrong.value = true;
    lives.value--;

    if (planetMesh) {
      gsap.to(planetMesh.position, {
        x: planetMesh.position.x + 0.5,
        duration: 0.1,
        yoyo: true,
        repeat: 5,
      });
    }

    if (lives.value <= 0) {
      setTimeout(() => {
        gameOver.value = true;
        spaceStore.submitScore(astronautName.value, score.value, "GAME 1: MYSTERY");
      }, 1000);
    } else {
      setTimeout(() => {
        showWrong.value = false;
        answerSlots.value.forEach((char) => {
          if (char) {
            const letterInPool = availableLetters.value.find(
              (l) => l.char === char && l.used
            );
            if (letterInPool) letterInPool.used = false;
          }
        });
        answerSlots.value = new Array(currentQuestion.value.answer.length).fill(
          null
        );
      }, 1000);
    }
  }
};

const useHint = () => {
  if (hintsUsed.value >= maxHints.value) return;

  const correctAnswer = currentQuestion.value.answer;
  const emptySlotIndex = answerSlots.value.findIndex((slot) => slot === null);

  if (emptySlotIndex !== -1) {
    const correctChar = correctAnswer[emptySlotIndex];

    const letterIndex = availableLetters.value.findIndex(
      (letter) => letter.char === correctChar && !letter.used
    );

    if (letterIndex !== -1) {
      selectLetter(letterIndex);
      hintsUsed.value++;

      if (planetMesh) {
        gsap.to(planetMesh.scale, {
          x: planetMesh.scale.x * 0.9,
          y: planetMesh.scale.y * 0.9,
          z: planetMesh.scale.z * 0.9,
          duration: 0.2,
          yoyo: true,
          repeat: 1,
        });
      }
    }
  }
};

const restartGame = () => {
  currentLevel.value = 1;
  score.value = 0;
  lives.value = 3;
  hintsUsed.value = 0;
  totalAttempts.value = 0;
  correctAttempts.value = 0;
  gameOver.value = false;
  currentQuestion.value = allQuestions[0];
  initializeAnswer();
  loadPlanetModel();
};

const confirmExit = () => {
  if (gameOver.value) {
    exitToLobby();
  } else {
    showExitModal.value = true;
  }
};

const exitToLobby = () => {
  router.push("/game");
};

const handleNameSubmit = (name) => {
  astronautName.value = name;
  showNameModal.value = false;
};

const getAccuracy = () => {
  if (totalAttempts.value === 0) return 0;
  return Math.round((correctAttempts.value / totalAttempts.value) * 100);
};

const getRating = () => {
  const s = score.value;
  if (s >= 100) return "⭐⭐⭐⭐⭐ Sempurna!";
  if (s >= 80) return "⭐⭐⭐⭐ Hebat!";
  if (s >= 60) return "⭐⭐⭐ Bagus!";
  if (s >= 40) return "⭐⭐ Cukup";
  return "⭐ Coba Lagi";
};

const getGameOverTitle = () => {
  if (score.value >= 100) return "LUAR BIASA! 🏆";
  if (score.value >= 80) return "HEBAT SEKALI! 🌟";
  if (score.value >= 50) return "BAGUS! 👍";
  if (score.value >= 30) return "COBA LAGI! 💪";
  return "JANGAN MENYERAH! 🚀";
};

const getParticleStyle = () => {
  const colors = ["#fbbf24", "#f59e0b", "#f97316", "#ef4444", "#ec4899"];
  return {
    left: `${Math.random() * 100}%`,
    top: `${Math.random() * 100}%`,
    backgroundColor: colors[Math.floor(Math.random() * colors.length)],
    animationDelay: `${Math.random() * 0.5}s`,
    animationDuration: `${1 + Math.random() * 0.5}s`,
  };
};

const initThree = () => {
  const width = window.innerWidth;
  const height = window.innerHeight;

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0a0a1a);

  camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000);
  camera.position.set(0, 0, 8);

  renderer = new THREE.WebGLRenderer({
    canvas: canvasRef.value,
    antialias: true,
    alpha: true,
  });
  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.enableZoom = false;
  controls.enablePan = false;
  controls.autoRotate = true;
  controls.autoRotateSpeed = 2;

  const ambient = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambient);

  const pointLight = new THREE.PointLight(0xffffff, 1.5);
  pointLight.position.set(5, 5, 5);
  scene.add(pointLight);

  createStarfield();
  loadPlanetModel();
  animate();

  window.addEventListener("resize", handleResize);
};

const createStarfield = () => {
  const geometry = new THREE.BufferGeometry();
  const vertices = [];

  for (let i = 0; i < 1000; i++) {
    vertices.push(
      (Math.random() - 0.5) * 100,
      (Math.random() - 0.5) * 100,
      (Math.random() - 0.5) * 100
    );
  }

  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(vertices, 3)
  );

  const material = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 0.15,
    transparent: true,
    opacity: 0.8,
  });

  starfield = new THREE.Points(geometry, material);
  scene.add(starfield);
};

const loadPlanetModel = () => {
  if (planetMesh) {
    // FIXED: Dispose geometry and material before removing
    planetMesh.traverse((child) => {
      if (child.isMesh) {
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach(mat => mat.dispose());
          } else {
            child.material.dispose();
          }
        }
      }
    });
    scene.remove(planetMesh);
    planetMesh = null;
  }

  const loader = new GLTFLoader();
  const modelPath = `/textures/${currentQuestion.value.model}`;

  loader.load(
    modelPath,
    (gltf) => {
      planetMesh = gltf.scene;

      const box = new THREE.Box3().setFromObject(planetMesh);
      const size = box.getSize(new THREE.Vector3()).length();
      const scale = 3.5 / size;
      planetMesh.scale.set(scale, scale, scale);

      const center = box.getCenter(new THREE.Vector3());
      planetMesh.position.set(
        -center.x * scale,
        -center.y * scale,
        -center.z * scale
      );

      scene.add(planetMesh);

      planetMesh.scale.set(0, 0, 0);
      gsap.to(planetMesh.scale, {
        x: scale,
        y: scale,
        z: scale,
        duration: 1,
        ease: "elastic.out(1, 0.5)",
      });
    },
    undefined,
    () => {
      const geometry = new THREE.SphereGeometry(2.5, 32, 32);
      const material = new THREE.MeshStandardMaterial({ color: 0x4488ff });
      planetMesh = new THREE.Mesh(geometry, material);
      scene.add(planetMesh);
    }
  );
};

const animate = () => {
  animationId = requestAnimationFrame(animate);

  if (starfield) starfield.rotation.y += 0.0003;
  if (planetMesh && !levelComplete.value) planetMesh.rotation.y += 0.005;

  controls.update();
  renderer.render(scene, camera);
};

const handleResize = () => {
  const width = window.innerWidth;
  const height = window.innerHeight;

  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
};

onMounted(() => {
  initThree();
  initializeAnswer();
});

onUnmounted(() => {
  // Cancel animation frame
  if (animationId) cancelAnimationFrame(animationId);
  
  // Remove event listener
  window.removeEventListener("resize", handleResize);
  
  // Dispose Three.js resources
  if (planetMesh) {
    planetMesh.traverse((child) => {
      if (child.isMesh) {
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach(mat => mat.dispose());
          } else {
            child.material.dispose();
          }
        }
      }
    });
    scene.remove(planetMesh);
  }
  
  if (starfield) {
    if (starfield.geometry) starfield.geometry.dispose();
    if (starfield.material) starfield.material.dispose();
    scene.remove(starfield);
  }
  
  if (controls) controls.dispose();
  if (renderer) {
    renderer.dispose();
    renderer.forceContextLoss();
  }
});
</script>

<style scoped>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
  -webkit-tap-highlight-color: transparent;
}

.game-container {
  position: relative;
  width: 100%;
  height: 100vh;
  height: 100dvh;
  overflow: hidden;
  background: linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%);
  font-family: "Comic Sans MS", "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
  color: white;
  pointer-events: auto;
  touch-action: manipulation;
}

.background-canvas {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 0;
}

/* === TOP PANEL === */
.top-panel {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  z-index: 200;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 24px 15px 12px;
  background: linear-gradient(to bottom, rgba(0, 0, 0, 0.7), transparent);
  gap: 8px;
  flex-wrap: wrap;
  pointer-events: none;
}

.back-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  height: 44px;
  min-width: 110px;
  background: linear-gradient(145deg, #667eea 0%, #764ba2 100%);
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 12px;
  color: white;
  font-weight: 700;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.25s;
  box-shadow: 0 6px 18px rgba(102, 126, 234, 0.36);
  z-index: 300;
  pointer-events: auto;
}

.back-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(102, 126, 234, 0.6);
}

.back-btn:active {
  transform: translateY(0);
}

.btn-icon {
  font-size: 16px;
}

.stats-panel-left,
.stats-panel-right {
  display: flex;
  gap: 8px;
  align-items: center;
  pointer-events: auto;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: rgba(0, 0, 0, 0.6);
  border: 2px solid rgba(255, 255, 255, 0.2);
  border-radius: 12px;
  backdrop-filter: blur(10px);
}

.stat-item.level {
  border-color: rgba(99, 102, 241, 0.5);
  box-shadow: 0 0 10px rgba(99, 102, 241, 0.3);
}

.stat-item.score {
  border-color: rgba(251, 191, 36, 0.5);
  box-shadow: 0 0 10px rgba(251, 191, 36, 0.3);
}

.stat-item.lives {
  border-color: rgba(239, 68, 68, 0.5);
  box-shadow: 0 0 10px rgba(239, 68, 68, 0.3);
}

.stat-icon {
  font-size: 24px;
  line-height: 1;
}

.stat-content {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.stat-label {
  font-size: 9px;
  color: rgba(255, 255, 255, 0.7);
  font-weight: bold;
  letter-spacing: 0.5px;
}

.stat-value {
  font-size: 16px;
  font-weight: bold;
  color: white;
  line-height: 1;
}

/* === HINT BUTTON === */
.hint-btn-floating {
  position: absolute;
  right: 15px;
  top: 50%;
  transform: translateY(-50%);
  z-index: 200;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 12px 14px;
  background: linear-gradient(145deg, #fbbf24, #f59e0b);
  border: 3px solid rgba(255, 255, 255, 0.5);
  border-radius: 15px;
  cursor: pointer;
  transition: all 0.3s;
  box-shadow: 0 6px 20px rgba(251, 191, 36, 0.5);
  min-width: 65px;
  animation: float-hint 3s ease-in-out infinite;
  pointer-events: auto !important;
}

@keyframes float-hint {
  0%,
  100% {
    transform: translateY(-50%) translateX(0);
  }
  50% {
    transform: translateY(-50%) translateX(-6px);
  }
}

.hint-btn-floating:hover:not(.disabled) {
  transform: translateY(-50%) scale(1.08);
  box-shadow: 0 10px 30px rgba(251, 191, 36, 0.7);
}

.hint-btn-floating.disabled {
  opacity: 0.5;
  cursor: not-allowed;
  background: linear-gradient(145deg, #888, #666);
  animation: none;
}

.hint-icon {
  font-size: 28px;
  line-height: 1;
}

.hint-count {
  font-size: 11px;
  font-weight: bold;
  color: white;
  line-height: 1;
}

/* === CLUE CONTAINER === */
.clue-container {
  position: absolute;
  top: 95px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 100;
  width: calc(100% - 30px);
  max-width: 600px;
  pointer-events: none;
  padding: 0 15px;
}

.clue-box {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 15px 18px;
  background: linear-gradient(
    145deg,
    rgba(99, 102, 241, 0.25),
    rgba(139, 92, 246, 0.25)
  );
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 18px;
  backdrop-filter: blur(20px);
  box-shadow: 0 6px 25px rgba(0, 0, 0, 0.3);
}

.clue-icon {
  font-size: 28px;
  flex-shrink: 0;
  animation: float 3s ease-in-out infinite;
  line-height: 1;
}

@keyframes float {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-8px);
  }
}

.clue-text {
  font-size: 14px;
  line-height: 1.5;
  color: white;
  margin: 0;
  font-weight: 600;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
}

/* === 3D MODEL === */
.model-display {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 280px;
  height: 280px;
  z-index: 10;
  pointer-events: none;
}

/* === GAME CONTENT === */
.game-content {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 150;
  padding: 15px 12px 20px;
  background: linear-gradient(
    to top,
    rgba(10, 10, 26, 0.95) 0%,
    rgba(10, 10, 26, 0.8) 70%,
    transparent 100%
  );
  backdrop-filter: blur(10px);
  pointer-events: none;
}

/* === ANSWER SLOTS === */
.answer-slots {
  display: flex;
  justify-content: center;
  gap: 6px;
  margin-bottom: 15px;
  flex-wrap: wrap;
  pointer-events: auto;
}

.letter-slot {
  width: 45px;
  height: 55px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(
    145deg,
    rgba(255, 255, 255, 0.1),
    rgba(255, 255, 255, 0.05)
  );
  border: 3px solid rgba(255, 255, 255, 0.3);
  border-radius: 12px;
  transition: all 0.3s;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  pointer-events: auto;
}

.letter-slot.cursor-pointer {
  cursor: pointer;
}

.letter-slot.cursor-pointer:hover {
  border-color: #fbbf24;
  transform: translateY(-2px);
  box-shadow: 0 0 12px rgba(251, 191, 36, 0.5);
}

.slot-letter {
  font-size: 26px;
  font-weight: bold;
  color: rgba(255, 255, 255, 0.5);
  line-height: 1;
}

.letter-slot.filled {
  background: linear-gradient(145deg, #667eea, #764ba2);
  border-color: rgba(255, 255, 255, 0.6);
  transform: scale(1.05);
  box-shadow: 0 6px 18px rgba(102, 126, 234, 0.5);
}

.letter-slot.filled .slot-letter {
  color: white;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

.letter-slot.correct {
  background: linear-gradient(145deg, #10b981, #059669);
  border-color: #34d399;
  animation: bounce 0.6s;
  box-shadow: 0 0 20px rgba(16, 185, 129, 0.8);
}

.letter-slot.wrong {
  background: linear-gradient(145deg, #ef4444, #dc2626);
  border-color: #f87171;
  animation: shake 0.5s;
}

@keyframes bounce {
  0%,
  100% {
    transform: scale(1.05);
  }
  50% {
    transform: scale(1.2);
  }
}

@keyframes shake {
  0%,
  100% {
    transform: translateX(0);
  }
  25% {
    transform: translateX(-6px);
  }
  75% {
    transform: translateX(6px);
  }
}

/* === LETTER BUTTONS === */
.letters-container {
  display: flex;
  justify-content: center;
  gap: 6px;
  margin-bottom: 15px;
  flex-wrap: wrap;
  pointer-events: auto;
  z-index: 200;
}

.letter-btn {
  width: 48px;
  height: 48px;
  background: linear-gradient(145deg, #667eea 0%, #764ba2 100%);
  border: 2px solid rgba(255, 255, 255, 0.4);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
  position: relative;
  z-index: 250;
  pointer-events: auto;
}

.letter-char {
  font-size: 24px;
  font-weight: bold;
  color: white;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
  line-height: 1;
}

.letter-btn:hover:not(.used) {
  transform: translateY(-3px) scale(1.05);
  box-shadow: 0 8px 20px rgba(102, 126, 234, 0.6);
  border-color: rgba(255, 255, 255, 0.8);
}

.letter-btn:active:not(.used) {
  transform: translateY(-1px) scale(1.02);
}

.letter-btn.used {
  background: linear-gradient(
    145deg,
    rgba(100, 100, 100, 0.3),
    rgba(60, 60, 60, 0.3)
  );
  border-color: rgba(255, 255, 255, 0.2);
  cursor: pointer;
  box-shadow: none;
  transform: scale(0.9);
}

.letter-btn.used:hover {
  transform: scale(0.95);
  border-color: rgba(239, 68, 68, 0.5);
}

.letter-btn.used .letter-char {
  color: rgba(255, 255, 255, 0.3);
}

/* === RESULT SCREEN === */
.result-screen {
  position: absolute;
  inset: 0;
  z-index: 300;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(10, 10, 26, 0.95);
  backdrop-filter: blur(20px);
  padding: 15px;
  pointer-events: auto;
  overflow-y: auto;
}

.result-card {
  text-align: center;
  padding: 20px 18px;
  background: linear-gradient(
    145deg,
    rgba(99, 102, 241, 0.2),
    rgba(139, 92, 246, 0.2)
  );
  border: 3px solid rgba(255, 255, 255, 0.3);
  border-radius: 20px;
  max-width: 420px;
  width: 100%;
  animation: slideUp 0.5s ease-out;
  box-shadow: 0 15px 50px rgba(0, 0, 0, 0.5);
  pointer-events: auto;
  max-height: 85vh;
  overflow-y: auto;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(40px) scale(0.9);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.result-emoji-big {
  font-size: 60px;
  margin-bottom: 8px;
  animation: bounce-anim 1s infinite;
  line-height: 1;
}

@keyframes bounce-anim {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-8px);
  }
}

.result-title-big {
  font-size: 28px;
  font-weight: 900;
  background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  margin-bottom: 12px;
  text-shadow: 0 3px 6px rgba(0, 0, 0, 0.3);
  line-height: 1.2;
}

.final-score-box {
  padding: 12px;
  background: rgba(0, 0, 0, 0.5);
  border: 2px solid rgba(251, 191, 36, 0.5);
  border-radius: 12px;
  margin: 12px 0;
}

.score-label {
  font-size: 11px;
  color: #fbbf24;
  font-weight: bold;
  letter-spacing: 1.5px;
  margin-bottom: 4px;
}

.score-big {
  font-size: 48px;
  font-weight: 900;
  background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  margin-bottom: 0;
  text-shadow: 0 0 15px rgba(251, 191, 36, 0.6);
  line-height: 1;
}

.score-subtitle {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.7);
}

.score-breakdown {
  padding: 12px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 10px;
  margin: 12px 0;
}

.breakdown-item {
  display: flex;
  justify-content: space-between;
  padding: 6px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.breakdown-item:last-child {
  border-bottom: none;
}

.breakdown-label {
  color: rgba(255, 255, 255, 0.7);
  font-size: 13px;
}

.breakdown-value {
  color: white;
  font-weight: bold;
  font-size: 13px;
}

.result-buttons {
  display: flex;
  justify-content: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 12px;
}

.result-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px 20px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 12px;
  color: white;
  font-size: 14px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
  pointer-events: auto;
}

.primary-btn {
  background: linear-gradient(145deg, #667eea, #764ba2);
}

.primary-btn:hover {
  transform: translateY(-2px) scale(1.03);
  box-shadow: 0 8px 25px rgba(102, 126, 234, 0.6);
}

.secondary-btn {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.3);
}

.secondary-btn:hover {
  background: rgba(255, 255, 255, 0.2);
  transform: translateY(-2px);
}

/* === MODAL === */
.modal-overlay {
  position: absolute;
  inset: 0;
  z-index: 400;
  background: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(10px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  animation: fadeIn 0.3s ease-out;
  pointer-events: auto;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.modal-content {
  background: linear-gradient(
    145deg,
    rgba(99, 102, 241, 0.2),
    rgba(139, 92, 246, 0.2)
  );
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 20px;
  padding: 25px 20px;
  text-align: center;
  max-width: 350px;
  width: 100%;
  animation: scaleIn 0.3s ease-out;
  box-shadow: 0 15px 50px rgba(0, 0, 0, 0.5);
  pointer-events: auto;
}

@keyframes scaleIn {
  from {
    transform: scale(0.8);
    opacity: 0;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
}

.modal-icon {
  font-size: 50px;
  margin-bottom: 12px;
  line-height: 1;
}

.modal-title {
  font-size: 20px;
  font-weight: bold;
  color: white;
  margin-bottom: 8px;
}

.modal-text {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.7);
  margin-bottom: 20px;
}

.modal-buttons {
  display: flex;
  gap: 10px;
  justify-content: center;
  flex-wrap: wrap;
}

.modal-btn {
  padding: 10px 20px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 12px;
  font-size: 13px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s;
  box-shadow: 0 3px 12px rgba(0, 0, 0, 0.3);
  pointer-events: auto;
  flex: 1;
  min-width: 120px;
}

.confirm-btn {
  background: linear-gradient(145deg, #ef4444, #dc2626);
  color: white;
}

.confirm-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 5px 18px rgba(239, 68, 68, 0.6);
}

.cancel-btn {
  background: rgba(255, 255, 255, 0.1);
  color: white;
}

.cancel-btn:hover {
  background: rgba(255, 255, 255, 0.2);
  transform: translateY(-2px);
}

/* === PARTICLES === */
.particles-container {
  position: absolute;
  inset: 0;
  z-index: 250;
  pointer-events: none;
  overflow: hidden;
}

.particle {
  position: absolute;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  animation: particle-fall 1.5s ease-out forwards;
  box-shadow: 0 0 8px currentColor;
}

@keyframes particle-fall {
  0% {
    transform: translateY(-20px) scale(1) rotate(0deg);
    opacity: 1;
  }
  100% {
    transform: translateY(100vh) scale(0) rotate(720deg);
    opacity: 0;
  }
}

/* === MOBILE OPTIMIZATIONS === */
@media (max-width: 768px) {
  .btn-text {
    display: none;
  }

  .back-btn {
    padding: 8px 10px;
    min-width: 56px;
    height: 44px;
    justify-content: center;
  }

  .stat-item {
    padding: 6px 10px;
  }

  .stat-icon {
    font-size: 20px;
  }

  .stat-value {
    font-size: 14px;
  }

  .stat-label {
    font-size: 8px;
  }

  .hint-btn-floating {
    right: 10px;
    padding: 10px 12px;
    min-width: 55px;
  }

  .hint-icon {
    font-size: 24px;
  }

  .hint-count {
    font-size: 10px;
  }

  .clue-container {
    top: 85px;
    width: calc(100% - 20px);
    padding: 0 10px;
  }

  .clue-box {
    padding: 12px 15px;
    gap: 10px;
  }

  .clue-icon {
    font-size: 24px;
  }

  .clue-text {
    font-size: 13px;
  }

  .model-display {
    width: 240px;
    height: 240px;
  }

  .game-content {
    padding: 12px 10px 15px;
  }

  .letter-slot {
    width: 40px;
    height: 50px;
  }

  .slot-letter {
    font-size: 24px;
  }

  .letter-btn {
    width: 44px;
    height: 44px;
  }

  .letter-char {
    font-size: 22px;
  }

  .result-card {
    padding: 18px 15px;
    max-width: 95%;
  }

  .result-title-big {
    font-size: 24px;
  }

  .result-emoji-big {
    font-size: 50px;
  }

  .score-big {
    font-size: 42px;
  }

  .result-btn {
    width: 100%;
    font-size: 13px;
  }

  .modal-content {
    padding: 20px 18px;
  }

  .modal-btn {
    width: 100%;
  }
}

@media (max-width: 480px) {
  .top-panel {
    padding: 10px 12px;
    gap: 6px;
  }

  .stats-panel-left,
  .stats-panel-right {
    gap: 6px;
  }

  .letter-slot {
    width: 38px;
    height: 48px;
    gap: 5px;
  }

  .slot-letter {
    font-size: 22px;
  }

  .letter-btn {
    width: 42px;
    height: 42px;
  }

  .letter-char {
    font-size: 20px;
  }

  .result-emoji-big {
    font-size: 45px;
  }

  .score-big {
    font-size: 38px;
  }

  .breakdown-label,
  .breakdown-value {
    font-size: 12px;
  }
}

@media (max-height: 700px) {
  .clue-container {
    top: 80px;
  }

  .model-display {
    width: 200px;
    height: 200px;
  }

  .result-emoji-big {
    font-size: 40px;
    margin-bottom: 6px;
  }

  .result-title-big {
    font-size: 22px;
    margin-bottom: 10px;
  }

  .score-big {
    font-size: 36px;
  }
}

/* Landscape Mode */
@media (max-height: 500px) and (orientation: landscape) {
  .top-panel {
    padding: 8px 10px;
  }

  .clue-container {
    top: 70px;
  }

  .clue-box {
    padding: 10px 12px;
  }

  .model-display {
    width: 180px;
    height: 180px;
  }

  .game-content {
    padding: 10px 8px 12px;
  }

  .result-card {
    max-height: 90vh;
    padding: 15px 12px;
  }
}
</style>
