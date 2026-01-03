<script setup>
import { ref, onMounted, onUnmounted, computed } from "vue";
import { useRouter } from "vue-router";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import gsap from "gsap";

// Pastikan file data Anda benar ada di path ini
import { solarData as rawContentData } from "../data/planets.js";

// --- KONFIGURASI 3D ---
const visualConfig = [
  { id: 0, distance: 0, size: 6.0 },
  { id: 1, distance: 16, size: 0.8 },
  { id: 2, distance: 24, size: 1.2 },
  { id: 3, distance: 34, size: 1.3 },
  { id: 4, distance: 44, size: 1.0 },
  { id: 5, distance: 65, size: 4.0 },
  { id: 6, distance: 88, size: 3.5 },
  { id: 7, distance: 110, size: 2.5 },
  { id: 8, distance: 130, size: 2.4 },
];

// Optimasi: Hitung sekali saja di setup, bukan di computed
// Ini menghindari re-calculation setiap kali component re-render
const solarData = rawContentData.map((content) => {
  const visual = visualConfig.find((v) => v.id === content.id) || {
    distance: 0,
    size: 1,
  };
  return { ...content, ...visual };
});

const router = useRouter();
const containerRef = ref(null);
const isMissionStarted = ref(true);
const selectedPlanet = ref(null);

// Three.js Global Vars
let scene, camera, renderer, controls, composer;
let planetsMesh = [];
let orbitsMesh = [];
let starSystem, asteroidSystem;
let warpSpeed = 0;
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let animationFrame;
let visibilityHandler;
let entranceTween = null;
let userInteracting = false;
// handlers moved to module scope so they can be removed on unmount
let onUserPointerDown = null;
let onUserPointerUp = null;

// Moon variables
let moonPivot = null;
let moonMesh = null;

// Clock + lightweight FPS meter
const clock = new THREE.Clock();
const fps = ref(0);
let fpsAccum = 0;
let fpsElapsed = 0;

// --- 1. INITIALIZATION ---
const initScene = () => {
  if (!containerRef.value) return;
  const width = containerRef.value.clientWidth;
  const height = containerRef.value.clientHeight;

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x050505);
  scene.fog = new THREE.FogExp2(0x000000, 0.002);

  camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000);
  camera.position.set(0, 0, 400);

  // Performance heuristics
  const isMobile = window.innerWidth < 768;
  const maxPixelRatio = isMobile ? 1 : Math.min(window.devicePixelRatio, 1.5);
  const nav = typeof navigator !== "undefined" ? navigator : {};
  const deviceMemory = nav.deviceMemory || 0;
  const hwConcurrency = nav.hardwareConcurrency || 0;
  const prefersLowPower = deviceMemory <= 2 || hwConcurrency <= 2;

  renderer = new THREE.WebGLRenderer({
    antialias: !isMobile && !prefersLowPower,
    powerPreference: "high-performance",
  });
  renderer.setSize(width, height);
  renderer.setPixelRatio(maxPixelRatio);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ReinhardToneMapping;
  renderer.toneMappingExposure = 1.0;

  containerRef.value.appendChild(renderer.domElement);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.maxDistance = 300;
  controls.minDistance = 10;
  controls.enabled = false;

  const renderScene = new RenderPass(scene, camera);
  const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(width, height),
    1.2,
    0.25,
    0.85
  );
  bloomPass.threshold = prefersLowPower ? 0.35 : 0.2;
  bloomPass.strength = prefersLowPower ? 0.6 : 1.2;
  bloomPass.radius = 0.4;

  const useComposer = !prefersLowPower && !isMobile;
  if (useComposer) {
    composer = new EffectComposer(renderer);
    composer.addPass(renderScene);
    composer.addPass(bloomPass);
  } else {
    composer = null;
  }

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
  scene.add(ambientLight);
  const sunLight = new THREE.PointLight(0xffffff, 2, 300);
  sunLight.position.set(0, 0, 0);
  scene.add(sunLight);

  createWarpStars();
  createAsteroidBelt();
  loadAllPlanets();

  renderer.domElement.addEventListener("pointerdown", onCanvasClick);

  onUserPointerDown = (e) => {
    if (e.target === renderer.domElement) {
      if (!controls.enabled) {
        if (entranceTween) {
          entranceTween.kill();
          entranceTween = null;
        }
        gsap.killTweensOf(camera.position);
        gsap.killTweensOf(controls.target);
        controls.enabled = true;
        controls.target.set(0, 0, 0);
        warpSpeed = 0;
      }
      userInteracting = true;
      controls.dampingFactor = 0.02;
    }
  };
  onUserPointerUp = () => {
    userInteracting = false;
    controls.dampingFactor = 0.05;
  };
  renderer.domElement.addEventListener("pointerdown", onUserPointerDown);
  window.addEventListener("pointerup", onUserPointerUp);

  runEntranceAnimation();
  animate();

  visibilityHandler = () => {
    if (document.hidden) {
      if (animationFrame) cancelAnimationFrame(animationFrame);
      animationFrame = null;
    } else if (!animationFrame) {
      animationFrame = requestAnimationFrame(animate);
    }
  };
  document.addEventListener("visibilitychange", visibilityHandler);
};

// --- FUNGSI ANIMASI ---
const runEntranceAnimation = () => {
  warpSpeed = 12;
  entranceTween = gsap.to(camera.position, {
    x: 80,
    y: 60,
    z: 120,
    duration: 4,
    ease: "power2.out",
    onUpdate: () => {
      warpSpeed = THREE.MathUtils.lerp(warpSpeed, 0, 0.02);
    },
    onComplete: () => {
      controls.enabled = true;
      controls.target.set(0, 0, 0);
      warpSpeed = 0;
      entranceTween = null;
    },
  });
};

const createWarpStars = () => {
  const isMobileLocal = window.innerWidth < 768;
  const starCount = isMobileLocal ? 1000 : 2000;
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 600;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 600;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 600;
  }
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const material = new THREE.PointsMaterial({
    color: 0xffffff,
    size: isMobileLocal ? 0.5 : 0.7,
    transparent: true,
    opacity: 0.8,
  });
  starSystem = new THREE.Points(geometry, material);
  scene.add(starSystem);
};

const animate = () => {
  animationFrame = requestAnimationFrame(animate);
  const dt = clock.getDelta();

  if (warpSpeed > 0.1 && starSystem) {
    const positions = starSystem.geometry.attributes.position.array;
    const count = positions.length / 3;
    for (let i = 0; i < count; i++) {
      const idx = i * 3;
      positions[idx + 2] += warpSpeed * dt * 60;
      if (positions[idx + 2] > 400) {
        positions[idx + 2] = -600;
        positions[idx] = (Math.random() - 0.5) * 600;
        positions[idx + 1] = (Math.random() - 0.5) * 600;
      }
    }
    starSystem.geometry.attributes.position.needsUpdate = true;
    if (warpSpeed > 2) {
      camera.position.x += (Math.random() - 0.5) * 0.1 * dt * 60;
      camera.position.y += (Math.random() - 0.5) * 0.1 * dt * 60;
    }
  }

  controls.update();

  planetsMesh.forEach((obj) => {
    const speed = obj.data.name === "MATAHARI" ? 0.12 : 0.3;
    obj.mesh.rotation.y += speed * dt;
  });

  if (asteroidSystem) asteroidSystem.rotation.y += 0.018 * dt;

  // --- ANIMASI BULAN ---
  // Memutar pivot bulan sehingga bulan bergerak mengelilingi bumi
  if (moonPivot) {
    moonPivot.rotation.y += 0.8 * dt; // Sesuaikan kecepatan di sini
  }

  fpsAccum += 1;
  fpsElapsed += dt;
  if (fpsElapsed >= 0.5) {
    fps.value = Math.round(fpsAccum / fpsElapsed);
    fpsAccum = 0;
    fpsElapsed = 0;
  }

  if (composer) composer.render();
  else renderer.render(scene, camera);
};

// --- ASSETS ---
const createAsteroidBelt = () => {
  const isMobileLocal = window.innerWidth < 768;
  const count = isMobileLocal ? 200 : 600;
  const geometry = new THREE.TetrahedronGeometry(0.2, 1);
  const material = new THREE.MeshLambertMaterial({ color: 0x888888 });
  asteroidSystem = new THREE.InstancedMesh(geometry, material, count);
  const dummy = new THREE.Object3D();
  for (let i = 0; i < count; i++) {
    const dist = 54 + Math.random() * 8;
    const angle = Math.random() * Math.PI * 2;
    dummy.position.set(
      Math.cos(angle) * dist,
      (Math.random() - 0.5) * 3,
      Math.sin(angle) * dist
    );
    dummy.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
    const scale = Math.random() * 0.8 + 0.2;
    dummy.scale.set(scale, scale, scale);
    dummy.updateMatrix();
    asteroidSystem.setMatrixAt(i, dummy.matrix);
  }
  scene.add(asteroidSystem);
};

const loadAllPlanets = () => {
  const loader = new GLTFLoader();
  let loadedCount = 0;
  solarData.forEach((data) => {
    if (data.distance > 0) {
      const orbitGeo = new THREE.RingGeometry(
        data.distance - 0.1,
        data.distance + 0.1,
        128
      );
      const orbitMat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(data.color),
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.15,
      });
      const orbit = new THREE.Mesh(orbitGeo, orbitMat);
      orbit.rotation.x = -Math.PI / 2;
      scene.add(orbit);
      orbitsMesh.push(orbit);
    }

    loader.load(
      `/textures/${data.file}`,
      (gltf) => {
        const mesh = gltf.scene;
        const box = new THREE.Box3().setFromObject(mesh);
        const sizeVec = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(sizeVec.x, sizeVec.y, sizeVec.z);
        const scaleFactor = data.size / maxDim;
        mesh.scale.set(scaleFactor, scaleFactor, scaleFactor);

        const angle = Math.random() * Math.PI * 2;
        mesh.position.set(
          Math.cos(angle) * data.distance,
          0,
          Math.sin(angle) * data.distance
        );

        mesh.traverse((c) => {
          if (c.isMesh) {
            if (data.name === "MATAHARI") {
              c.material = new THREE.MeshBasicMaterial({
                map: c.material.map,
                color: 0xffdd00,
              });
            } else {
              c.material.roughness = 0.7;
              c.material.metalness = 0.2;
            }
          }
        });
        scene.add(mesh);
        // add id to mesh so it can be detected from intersections
        mesh.userData = mesh.userData || {};
        mesh.userData.planetId = data.id;
        planetsMesh.push({ mesh, data, id: data.id });

        // --- SETUP KHUSUS UNTUK BUMI DAN BULAN ---
        if (data.name === "BUMI") {
          // Reset jika sudah ada
          if (moonPivot) {
            moonPivot.remove(moonMesh);
            moonMesh = null;
            moonPivot = null;
          }

          // 1. Buat Pivot (Titik putar bulan)
          moonPivot = new THREE.Object3D();
          moonPivot.name = "MoonPivot";
          mesh.add(moonPivot); // Attach ke Mesh Bumi

          // Hitung jarak orbit bulan
          const orbitRadius = data.size * 3 + 6;

          // 2. Buat Visual Garis Orbit Bulan (Lingkaran Tipis)
          // Kita tempelkan ke Mesh Bumi (bukan Pivot) agar garisnya diam relatif thd Bumi
          const moonOrbitGeo = new THREE.RingGeometry(
            orbitRadius - 0.08, // Inner radius
            orbitRadius + 0.08, // Outer radius (ketebalan)
            64 // Segments
          );
          const moonOrbitMat = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.2, // Transparansi agar tidak terlalu mencolok
          });
          const moonOrbitVis = new THREE.Mesh(moonOrbitGeo, moonOrbitMat);
          moonOrbitVis.rotation.x = -Math.PI / 2; // Rebahkan
          mesh.add(moonOrbitVis);

          // 3. Buat Mesh Bulan
          const moonRadius = Math.max(0.15, data.size * 0.22);
          const moonGeo = new THREE.SphereGeometry(moonRadius, 16, 16);
          const moonMat = new THREE.MeshStandardMaterial({
            color: 0x9ea7b0,
            roughness: 1.0,
            metalness: 0,
          });
          moonMesh = new THREE.Mesh(moonGeo, moonMat);

          // Posisikan bulan di atas garis orbit (X axis local)
          moonMesh.position.set(orbitRadius, 0, 0);
          moonMesh.castShadow = false;
          moonMesh.receiveShadow = false;

          // Attach Bulan ke Pivot (agar bisa diputar via pivot)
          moonPivot.add(moonMesh);

          // Make moon clickable and map it to the BULAN entry in data (so clicking leads to moon detail)
          const moonData = solarData.find(
            (p) => p.name === "BULAN" || p.id === 9
          );
          if (moonData) {
            moonMesh.userData = moonMesh.userData || {};
            moonMesh.userData.planetId = moonData.id;
            moonMesh.name = "MoonMesh";
            planetsMesh.push({
              mesh: moonMesh,
              data: moonData,
              id: moonData.id,
            });
          }
        }

        loadedCount++;
      },
      undefined,
      (error) => console.error(error)
    );
  });
};

// --- LOGIC INTERAKSI ---
const updateVisualState = (targetId) => {
  const targetOpacity = targetId !== null ? 0.05 : 0.15;
  orbitsMesh.forEach((orbit) => {
    gsap.to(orbit.material, { opacity: targetOpacity, duration: 1 });
  });
};

const flyToPlanet = (planetData) => {
  const targetObj = planetsMesh.find((p) => p.id === planetData.id);
  if (!targetObj) return;
  selectedPlanet.value = planetData;

  updateVisualState(planetData.id);

  const offset = planetData.name === "MATAHARI" ? 22 : 6;
  const targetPos = targetObj.mesh.position.clone();
  const isMobile = window.innerWidth < 768;
  let camPos, lookAtPos;

  if (isMobile) {
    camPos = targetPos
      .clone()
      .add(new THREE.Vector3(0, offset * 0.5, offset * 2.8));
    lookAtPos = targetPos.clone();
  } else {
    camPos = targetPos
      .clone()
      .add(new THREE.Vector3(offset, offset * 0.6, offset));
    lookAtPos = targetPos;
  }

  gsap.to(camera.position, {
    x: camPos.x,
    y: camPos.y,
    z: camPos.z,
    duration: 2,
    ease: "power3.out",
  });
  gsap.to(controls.target, {
    x: lookAtPos.x,
    y: lookAtPos.y,
    z: lookAtPos.z,
    duration: 2,
    ease: "power3.out",
  });
};

const resetView = () => {
  selectedPlanet.value = null;
  updateVisualState(null);
  gsap.to(camera.position, { x: 80, y: 60, z: 120, duration: 1.5 });
  gsap.to(controls.target, { x: 0, y: 0, z: 0, duration: 1.5 });
};

const openDetail = () => {
  if (!selectedPlanet.value) return;
  router.push({ path: `/planet/${selectedPlanet.value.id}` });
};

const onCanvasClick = (event) => {
  if (event.target !== renderer.domElement) return;

  const rect = renderer.domElement.getBoundingClientRect();
  const clientX =
    event.clientX || (event.touches ? event.touches[0].clientX : 0);
  const clientY =
    event.clientY || (event.touches ? event.touches[0].clientY : 0);

  mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(
    planetsMesh.map((p) => p.mesh),
    true
  );

  if (intersects.length > 0) {
    let object = intersects[0].object;
    // walk up the ancestor chain to find a matching registered mesh in planetsMesh
    let targetData = null;
    let o = object;
    while (o) {
      const match = planetsMesh.find((p) => p.mesh === o);
      if (match) {
        targetData = match.data;
        break;
      }
      o = o.parent;
    }
    if (targetData) flyToPlanet(targetData);
  } else {
    resetView();
  }
};

const handleResize = () => {
  if (!containerRef.value) return;
  const w = containerRef.value.clientWidth;
  const h = containerRef.value.clientHeight;
  const isNowMobile = w < 768;
  const newPR = isNowMobile ? 1 : Math.min(window.devicePixelRatio, 1.5);
  renderer.setPixelRatio(newPR);
  renderer.setSize(w, h);
  if (composer) composer.setSize(w, h);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
};

const goBack = () => router.push("/selection");

onMounted(() => {
  initScene();
  window.addEventListener("resize", handleResize);
});
onUnmounted(() => {
  window.removeEventListener("resize", handleResize);

  // Cleanup event listeners
  if (renderer) {
    renderer.domElement.removeEventListener("pointerdown", onCanvasClick);
    if (onUserPointerDown) {
      renderer.domElement.removeEventListener("pointerdown", onUserPointerDown);
    }
  }
  if (onUserPointerUp) {
    window.removeEventListener("pointerup", onUserPointerUp);
  }

  if (visibilityHandler) {
    document.removeEventListener("visibilitychange", visibilityHandler);
  }

  // Cancel animation
  if (animationFrame) {
    cancelAnimationFrame(animationFrame);
    animationFrame = null;
  }

  // Kill GSAP tweens
  gsap.killTweensOf("*");

  // Dispose Three.js resources
  if (renderer) {
    renderer.dispose();
    renderer = null;
  }

  if (composer) {
    composer = null;
  }

  if (scene) {
    scene.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) {
        const materials = Array.isArray(o.material) ? o.material : [o.material];
        materials.forEach((m) => {
          // Dispose textures
          if (m.map) m.map.dispose();
          if (m.normalMap) m.normalMap.dispose();
          if (m.roughnessMap) m.roughnessMap.dispose();
          if (m.metalnessMap) m.metalnessMap.dispose();
          m.dispose();
        });
      }
    });
    scene.clear();
    scene = null;
  }

  camera = null;
  controls = null;
  planetsMesh = [];
  orbitsMesh = [];
  starSystem = null;
  asteroidSystem = null;
});
</script>

<template>
  <div
    class="relative w-full h-[100dvh] bg-black overflow-hidden font-sans select-none pointer-events-auto"
  >
    <div ref="containerRef" class="w-full h-full"></div>

    <Transition name="slide-up" appear>
      <div
        v-if="isMissionStarted"
        class="absolute inset-0 pointer-events-none z-40 flex flex-col justify-between"
      >
        <div
          class="p-4 md:p-6 flex justify-between items-start pointer-events-none"
        >
          <div
            class="bg-black/40 backdrop-blur-md border border-white/10 rounded-2xl p-3 md:p-4 pointer-events-auto shadow-lg"
          >
            <div class="flex items-center gap-2">
              <div class="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
              <span
                class="text-[10px] md:text-xs font-bold text-gray-400 tracking-widest"
                >LIVE FEED</span
              >
            </div>
            <div class="text-sm md:text-xl font-bold text-white mt-1">
              TATA SURYA
            </div>
            <div class="text-[10px] text-white/80 mt-2 md:mt-3">
              {{ fps }} FPS
            </div>
          </div>

          <div class="flex gap-3 items-center pointer-events-auto">
            <button
              @click="goBack"
              class="cursor-pointer px-4 py-2 bg-cyan-500/10 hover:bg-cyan-500/80 border border-cyan-500/50 rounded-lg text-white text-xs font-bold transition-all backdrop-blur-sm"
            >
              ← BACK
            </button>
          </div>
        </div>

        <div
          class="relative flex-1 w-full flex flex-col justify-between md:justify-center"
        >
          <Transition name="fade-slide">
            <div
              v-if="selectedPlanet"
              class="w-full h-full md:h-auto pointer-events-none flex flex-col md:block"
            >
              <div
                class="md:hidden w-full flex flex-col items-center mt-4 pointer-events-none"
              >
                <h2
                  class="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-white/50 uppercase tracking-widest drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]"
                >
                  {{ selectedPlanet.name }}
                </h2>
                <div
                  class="text-cyan-300 font-mono text-[10px] uppercase tracking-[0.2em] mt-1 bg-black/30 px-3 py-1 rounded-full backdrop-blur-sm border border-white/5"
                >
                  {{ selectedPlanet.title || "Unknown Object" }}
                </div>
              </div>

              <div class="flex-1"></div>

              <div
                class="md:hidden w-full flex justify-center mb-6 pointer-events-auto px-6"
              >
                <div
                  class="flex items-center bg-white/10 backdrop-blur-xl border border-white/20 rounded-full p-1.5 shadow-2xl gap-2"
                >
                  <button
                    @click.stop="openDetail"
                    class="bg-gradient-to-r from-cyan-500 to-blue-600 px-6 py-3 rounded-full text-xs font-bold text-white uppercase tracking-widest hover:scale-105 active:scale-95 transition-all flex items-center gap-2 shadow-[0_0_15px_rgba(6,182,212,0.5)]"
                  >
                    <span>EXPLORE</span> →
                  </button>

                  <button
                    @click.stop="resetView"
                    class="w-10 h-10 rounded-full bg-black/40 hover:bg-red-500/80 border border-white/10 flex items-center justify-center text-white transition-all active:scale-90"
                  >
                    ✕
                  </button>
                </div>
              </div>

              <div
                class="hidden md:block pointer-events-auto md:w-[400px] md:bg-black/70 md:backdrop-blur-xl md:border-l-4 md:border-white/20 md:rounded-r-2xl md:p-8 md:ml-auto md:mr-12 md:shadow-2xl"
                :style="`border-color: ${selectedPlanet.color}`"
              >
                <h2
                  class="text-6xl font-black text-white uppercase italic tracking-tighter mb-2"
                >
                  {{ selectedPlanet.name }}
                </h2>
                <div
                  class="text-cyan-300 font-mono text-sm mb-6 border-b border-white/10 pb-2 uppercase tracking-widest"
                >
                  {{ selectedPlanet.title || selectedPlanet.desc }}
                </div>
                <p class="text-gray-300 text-base leading-relaxed mb-8">
                  "{{
                    selectedPlanet.funFacts &&
                    selectedPlanet.funFacts.length > 0
                      ? selectedPlanet.funFacts[0]
                      : "Data belum tersedia."
                  }}"
                </p>
                <div class="flex flex-col gap-3">
                  <button
                    @click.stop="openDetail"
                    class="w-full py-4 bg-white text-black rounded-lg uppercase font-black tracking-widest hover:bg-cyan-300 transition-colors"
                  >
                    Baca Selengkapnya
                  </button>
                  <button
                    @click.stop="resetView"
                    class="w-full py-3 border border-white/20 text-gray-400 rounded-lg uppercase text-xs font-bold hover:bg-white/5 hover:text-white transition-colors"
                  >
                    Kembali ke Orbit
                  </button>
                </div>
              </div>
            </div>
          </Transition>
        </div>

        <div
          class="pointer-events-auto p-4 md:p-6 flex justify-center z-40 bg-gradient-to-t from-black via-black/80 to-transparent pb-8 md:pb-6"
        >
          <div
            class="bg-white/5 backdrop-blur-xl border border-white/10 rounded-full p-2 flex gap-3 overflow-x-auto max-w-full md:max-w-[90vw] hide-scrollbar shadow-2xl relative"
          >
            <button
              @click="resetView"
              class="flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center bg-white/5 hover:bg-cyan-500 hover:text-black transition-all border border-white/10 text-xl"
            >
              🔭
            </button>
            <div
              class="w-[1px] bg-white/20 h-8 self-center mx-1 flex-shrink-0"
            ></div>

            <button
              v-for="planet in solarData"
              :key="planet.id"
              @click="flyToPlanet(planet)"
              class="flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center transition-all hover:scale-110 border-2 relative group"
              :class="
                selectedPlanet?.id === planet.id
                  ? 'border-white bg-white/30 scale-110 shadow-[0_0_15px_rgba(255,255,255,0.3)]'
                  : 'border-transparent hover:bg-white/10'
              "
            >
              <div
                class="w-4 h-4 rounded-full shadow-[0_0_10px_currentColor]"
                :style="`background-color: ${planet.color}; color: ${planet.color}`"
              ></div>
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.hide-scrollbar::-webkit-scrollbar {
  display: none;
}
.hide-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}

.slide-up-enter-active {
  transition: transform 1.2s cubic-bezier(0.16, 1, 0.3, 1), opacity 1.2s;
}
.slide-up-enter-from {
  transform: translateY(50px);
  opacity: 0;
}

.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: all 0.6s cubic-bezier(0.16, 1, 0.3, 1);
}
.fade-slide-enter-from,
.fade-slide-leave-to {
  opacity: 0;
  transform: scale(0.95);
}
</style>
