<script setup>
import { ref, onMounted, onUnmounted, computed } from "vue";
import { useRouter } from "vue-router";
import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import gsap from "gsap";

const router = useRouter();
const containerRef = ref(null);

// --- DATA: THE CRYSTAL NEXUS NODES ---
const nodes = [
  {
    id: 0,
    path: "/explore",
    label: "EXPLORATION",
    sub: "SECTOR 01",
    desc: "Chart the Unknown Worlds",
    color: "#0ea5e9", // Sky Blue
    emissive: "#7dd3fc",
    iconGeometry: "sphere",
  },
  {
    id: 1,
    path: "/events",
    label: "ARCHIVES",
    sub: "SECTOR 09",
    desc: "Access Ancient Records",
    color: "#fbbf24", // Amber
    emissive: "#fcd34d",
    iconGeometry: "box",
  },
  {
    id: 2,
    path: "/game",
    label: "SIMULATION",
    sub: "SECTOR 99",
    desc: "Tactical Combat Drill",
    color: "#ef4444", // Red
    emissive: "#fca5a5",
    iconGeometry: "icosahedron",
  },
];

// STATE
const activeIndex = ref(0);
const isTransitioning = ref(false);

// VAR BARU: Menyimpan total rotasi kumulatif agar bisa infinite scroll tanpa rewind
// Ini kunci agar rotasi selalu lanjut ke kanan/kiri tanpa balik arah.
const currentRotationY = ref(0);

const carouselGroup = new THREE.Group();

// --- THREE.JS VARIABLES ---
let scene, camera, renderer, composer;
let monoliths = [];
let lights = [];
let animationId;
const clock = new THREE.Clock();

// --- 3D SETUP ---
const init = () => {
  // Restore state
  const savedIndex = sessionStorage.getItem("solar_selection_index");

  // Angle per item (360 derajat / 3 item = 120 derajat atau 2PI/3 radian)
  const angleStep = (Math.PI * 2) / 3;

  if (savedIndex !== null) {
    const idx = parseInt(savedIndex);
    activeIndex.value = idx;
    // Set rotasi awal langsung ke posisi index yang tersimpan
    // Negatif karena kita memutar group berlawanan dengan arah item
    currentRotationY.value = -idx * angleStep;
  }

  const w = window.innerWidth;
  const h = window.innerHeight;

  // 1. SCENE
  scene = new THREE.Scene();
  scene.background = new THREE.Color("#050510"); // Very dark blue-black
  scene.fog = new THREE.FogExp2("#050510", 0.02);

  // 2. CAMERA
  camera = new THREE.PerspectiveCamera(60, w / h, 0.1, 100);

  // 3. RENDERER
  renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    powerPreference: "high-performance",
  });
  renderer.setSize(w, h);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  containerRef.value.appendChild(renderer.domElement);

  // 4. LIGHTING
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.2);
  scene.add(ambientLight);

  const spotLight = new THREE.SpotLight(0xffffff, 10);
  spotLight.position.set(10, 20, 10);
  spotLight.angle = 0.5;
  spotLight.penumbra = 1;
  scene.add(spotLight);

  const backLight = new THREE.PointLight(0x00ffff, 2, 20);
  backLight.position.set(-10, 5, -10);
  scene.add(backLight);

  const fillLight = new THREE.PointLight(0xff00ff, 2, 20);
  fillLight.position.set(10, -5, -10);
  scene.add(fillLight);

  // 5. STARFIELD BACKGROUND
  createStarfield();

  // 6. BUILD THE MONOLITHS
  createMonoliths();
  scene.add(carouselGroup);

  // 7. POST PROCESSING
  const renderPass = new RenderPass(scene, camera);
  const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(w, h),
    1.5,
    0.4,
    0.85
  );
  bloomPass.strength = 0.8;
  bloomPass.radius = 0.5;
  bloomPass.threshold = 0.2;

  composer = new EffectComposer(renderer);
  composer.addPass(renderPass);
  composer.addPass(bloomPass);

  window.addEventListener("resize", onResize);
  window.addEventListener("wheel", onWheel);
  window.addEventListener("touchstart", onTouchStart);
  window.addEventListener("touchmove", onTouchMove);
  window.addEventListener("touchend", onTouchEnd);

  // Apply Responsive Camera
  updateCameraResponsive();

  animate();

  // Jika ini kunjungan pertama (belum ada savedIndex), animasi intro
  if (savedIndex === null) {
    const targetZ = camera.position.z;
    camera.position.z += 20;
    gsap.to(camera.position, { z: targetZ, duration: 2.5, ease: "power3.out" });
    // Intro rotation (optional spin)
    gsap.from(carouselGroup.rotation, {
      y: Math.PI,
      duration: 2.5,
      ease: "power3.out",
    });
  } else {
    // Jika restore, langsung set posisi tanpa animasi
    carouselGroup.rotation.y = currentRotationY.value;
  }
};

const updateCameraResponsive = () => {
  if (!camera) return;
  const w = window.innerWidth;
  const h = window.innerHeight;
  const aspect = w / h;

  // Base distance
  const baseZ = 22;
  let targetZ = baseZ;

  if (aspect < 1.0) {
    // Mobile: Mundur lebih jauh
    targetZ = baseZ + 14 / aspect;
  } else if (aspect < 1.4) {
    // Tablet
    targetZ = baseZ + 6;
  }

  camera.position.z = targetZ;
  camera.aspect = aspect;
  camera.updateProjectionMatrix();

  renderer.setSize(w, h);
  composer.setSize(w, h);
};

const createStarfield = () => {
  const geometry = new THREE.BufferGeometry();
  const count = 3000;
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);

  for (let i = 0; i < count; i++) {
    const r = 40 + Math.random() * 40;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(Math.random() * 2 - 1);

    const x = r * Math.sin(phi) * Math.cos(theta);
    const y = r * Math.sin(phi) * Math.sin(theta);
    const z = r * Math.cos(phi);

    positions[i * 3] = x;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = z;

    const tint = Math.random() > 0.8 ? 0.8 : 1;
    colors[i * 3] = tint;
    colors[i * 3 + 1] = tint;
    colors[i * 3 + 2] = tint;
  }

  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

  const material = new THREE.PointsMaterial({
    size: 0.15,
    vertexColors: true,
    transparent: true,
    opacity: 0.6,
  });

  const stars = new THREE.Points(geometry, material);
  scene.add(stars);
};

const createMonoliths = () => {
  // UPDATED: Radius diperbesar
  const radius = 9;
  const angleStep = (Math.PI * 2) / 3;

  nodes.forEach((node, i) => {
    const group = new THREE.Group();
    const angle = i * angleStep;

    group.position.x = Math.sin(angle) * radius;
    group.position.z = Math.cos(angle) * radius;
    group.rotation.y = angle;

    // --- UKURAN GEOMETRI BESAR ---
    let iconGeo;
    if (node.iconGeometry === "sphere") {
      iconGeo = new THREE.IcosahedronGeometry(2.5, 1);
    } else if (node.iconGeometry === "box") {
      iconGeo = new THREE.BoxGeometry(3.5, 3.5, 3.5);
    } else {
      iconGeo = new THREE.TorusKnotGeometry(1.4, 0.45, 100, 16);
    }

    const iconMat = new THREE.MeshBasicMaterial({
      color: node.coreColor || node.color,
      wireframe: true,
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide,
    });
    const icon = new THREE.Mesh(iconGeo, iconMat);

    const innerLight = new THREE.PointLight(node.color, 4, 15);
    innerLight.position.set(0, 0, 0);

    group.add(icon);
    group.add(innerLight);

    group.userData = { id: node.id, initialY: group.position.y, icon };
    monoliths.push(group);
    carouselGroup.add(group);
  });
};

// --- ANIMATION LOOP ---
const animate = () => {
  animationId = requestAnimationFrame(animate);
  const time = clock.getElapsedTime();

  monoliths.forEach((m, i) => {
    m.userData.icon.rotation.y += 0.005;
    m.userData.icon.rotation.x = Math.sin(time * 0.3) * 0.15;

    // Gentle hover
    m.position.y = Math.sin(time * 0.8 + i) * 0.3;
  });

  composer.render();
};

// --- INTERACTION LOGIC (REVISI PENTING) ---

const updateCarouselRotation = () => {
  // Gunakan nilai kumulatif currentRotationY agar rotasi berlanjut mulus
  // Tidak di-reset ke 0, tapi terus bertambah/berkurang
  gsap.to(carouselGroup.rotation, {
    y: currentRotationY.value,
    duration: 1.2,
    ease: "power4.out",
  });
};

const next = () => {
  if (isTransitioning.value) return;

  // Update Index (0, 1, 2)
  activeIndex.value = (activeIndex.value + 1) % nodes.length;

  // Update Rotasi Kumulatif (Terus berkurang ke kiri/negatif)
  // - (120 derajat)
  const angleStep = (Math.PI * 2) / 3;
  currentRotationY.value -= angleStep;

  updateCarouselRotation();
};

const prev = () => {
  if (isTransitioning.value) return;

  // Update Index (Mundur)
  activeIndex.value = (activeIndex.value - 1 + nodes.length) % nodes.length;

  // Update Rotasi Kumulatif (Terus bertambah ke kanan/positif)
  // + (120 derajat)
  const angleStep = (Math.PI * 2) / 3;
  currentRotationY.value += angleStep;

  updateCarouselRotation();
};

const selectItem = () => {
  if (isTransitioning.value) return;
  isTransitioning.value = true;

  // Save state agar saat kembali posisinya benar
  sessionStorage.setItem("solar_selection_index", activeIndex.value);

  const targetNode = nodes[activeIndex.value];

  // Zoom Camera Forcefully
  gsap.to(camera.position, {
    z: 4, // Go closer/into the monolith
    duration: 0.8,
    ease: "power2.in",
  });

  gsap.to(".ui-layer", { opacity: 0, scale: 0.9, duration: 0.5 });

  setTimeout(() => {
    router.push(targetNode.path);
  }, 800);
};

let scrollTimeout;
const onWheel = (e) => {
  if (isTransitioning.value) return;
  clearTimeout(scrollTimeout);

  scrollTimeout = setTimeout(() => {
    if (e.deltaY > 0) next();
    else prev();
  }, 50);
};

let touchStartX = 0;
const onTouchStart = (e) => {
  touchStartX = e.touches[0].clientX;
};
const onTouchMove = (e) => {};
const onTouchEnd = (e) => {
  const diff = touchStartX - e.changedTouches[0].clientX;
  if (Math.abs(diff) > 50) {
    if (diff > 0) next();
    else prev();
  }
};

const onResize = () => {
  if (!containerRef.value) return;
  updateCameraResponsive();
};

onMounted(() => {
  init();
});
onUnmounted(() => {
  cancelAnimationFrame(animationId);
  window.removeEventListener("resize", onResize);
  window.removeEventListener("wheel", onWheel);
  window.removeEventListener("touchstart", onTouchStart);
  window.removeEventListener("touchmove", onTouchMove);
  window.removeEventListener("touchend", onTouchEnd);

  gsap.killTweensOf(camera.position);
  gsap.killTweensOf(carouselGroup.rotation);
  gsap.killTweensOf(".ui-layer");

  if (scene) {
    scene.traverse((child) => {
      if (child.geometry) child.geometry.dispose();
      if (child.material) {
        if (Array.isArray(child.material))
          child.material.forEach((m) => m.dispose());
        else child.material.dispose();
      }
    });
    scene.clear();
  }

  if (renderer) {
    renderer.dispose();
    renderer.forceContextLoss();
  }
  composer = null;
});

const current = computed(() => nodes[activeIndex.value]);
</script>

<template>
  <div
    class="relative w-full h-full bg-[#050510] font-sans overflow-hidden select-none text-white"
  >
    <div ref="containerRef" class="absolute inset-0 z-0"></div>

    <div
      class="absolute inset-0 z-10 pointer-events-none bg-[radial-gradient(circle_at_center,transparent_0%,#000000_120%)]"
    ></div>

    <div
      class="ui-layer absolute inset-0 z-20 flex flex-col justify-between p-6 md:p-12 pointer-events-none transition-all duration-300"
    >
      <div class="flex justify-between items-start w-full pointer-events-auto">
        <div class="flex flex-col gap-1">
          <div
            class="text-[9px] md:text-xs font-mono text-cyan-400 tracking-[0.4em] uppercase opacity-70 mb-1"
          >
            Nexus Interface
          </div>
          <h1
            class="text-2xl md:text-4xl font-headers font-bold tracking-widest text-white uppercase drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]"
          >
            System Select
          </h1>
        </div>

        <button
          @click="router.push('/')"
          class="px-4 py-2 hover:bg-white/5 border border-white/20 hover:border-cyan-400/50 rounded-lg text-white text-[10px] md:text-xs font-bold tracking-widest transition-all active:scale-95 flex items-center gap-2"
        >
          <span>←</span> HOME
        </button>
      </div>

      <div
        class="absolute bottom-20 md:bottom-24 left-0 w-full text-center flex flex-col items-center pointer-events-none px-4"
      >
        <div
          class="mb-6 md:mb-10 transition-all duration-500 transform"
          :key="current.id"
        >
          <h2
            class="text-4xl md:text-8xl font-headers font-black uppercase tracking-tight text-transparent bg-clip-text bg-gradient-to-b from-white to-gray-500 mb-2 md:mb-4 drop-shadow-2xl"
          >
            {{ current.label }}
          </h2>
          <div
            class="w-12 h-[1px] md:w-16 md:h-[2px] bg-white/20 mx-auto mb-2 md:mb-4"
          ></div>
          <p
            class="text-xs md:text-base font-sans tracking-[0.2em] text-cyan-300 uppercase opacity-80"
          >
            {{ current.desc }}
          </p>
        </div>

        <button
          @click="selectItem"
          class="pointer-events-auto group relative px-8 py-3 md:px-12 md:py-4 bg-white/5 border border-white/20 hover:bg-white/10 hover:border-cyan-400/50 backdrop-blur-md overflow-hidden transition-all duration-300 rounded-sm"
        >
          <div
            class="absolute inset-0 bg-cyan-500/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300"
          ></div>
          <span
            class="relative z-10 text-[10px] md:text-sm font-bold tracking-[0.4em] uppercase group-hover:text-cyan-300 transition-colors"
          >
            INITIALIZE LINK
          </span>
        </button>
      </div>

      <div class="absolute inset-y-0 left-2 md:left-12 flex items-center z-30">
        <button
          @click="prev"
          class="pointer-events-auto p-4 md:p-6 rounded-full border border-white/10 hover:bg-white/5 hover:border-white/30 backdrop-blur-md transition-all hover:-translate-x-1 group active:scale-90"
        >
          <span class="text-xl md:text-2xl text-white/30 group-hover:text-white"
            >&lt;</span
          >
        </button>
      </div>
      <div
        class="absolute inset-y-0 right-2 md:right-12 flex items-center z-30"
      >
        <button
          @click="next"
          class="pointer-events-auto p-4 md:p-6 rounded-full border border-white/10 hover:bg-white/5 hover:border-white/30 backdrop-blur-md transition-all hover:translate-x-1 group active:scale-90"
        >
          <span class="text-xl md:text-2xl text-white/30 group-hover:text-white"
            >&gt;</span
          >
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
@import url("https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Rajdhani:wght@400;600&display=swap");

.font-headers {
  font-family: "Orbitron", sans-serif;
}
.font-sans {
  font-family: "Rajdhani", sans-serif;
}
</style>
