<script setup>
import { ref, onMounted, onUnmounted } from "vue";
import { useRouter } from "vue-router";
import { solarData } from '../data/planets.js';
import * as THREE from "three"; // keep after solarData import
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import gsap from "gsap";

const router = useRouter();
const canvasRef = ref(null);
const activeIndex = ref(0);
const sliderValue = ref(50);
const statusLabel = ref(""); 

// Assets
const modelAssets = {
  sun: "sun.glb",
  earth: "earth.glb",
  moon: "moon.glb",
};

// --- KONFIGURASI SCENE ---
const scenes = [
  {
    id: "solar-eclipse",
    title: "Gerhana Matahari",
    subtitle: "BULAN MENGELILINGI BUMI",
    description: "Geser slider untuk melihat Bulan mengorbit di antara Matahari dan Bumi. Perhatikan bayangan kecil Bulan jatuh ke permukaan Bumi.",
    camPos: { x: 0, y: 5, z: 35 }, 
    logic: "eclipse-solar",
    objects: [
      { type: "sun", size: 2.5, pos: { x: -12, y: 0, z: 0 } }, 
      { type: "earth", size: 2.0, pos: { x: 12, y: 0, z: 0 } }, 
      { type: "moon", size: 0.6, pos: { x: 0, y: 0, z: 0 }, orbit: true }, // Posisi start tetap 0
    ],
  },
  {
    id: "lunar-eclipse",
    title: "Gerhana Bulan",
    subtitle: "MASUK KE BAYANGAN BUMI",
    description: "Bulan bergerak melengkung menuju belakang Bumi (Umbra). Perhatikan Bulan menjadi gelap saat tertutup Bumi sepenuhnya.",
    camPos: { x: 0, y: 5, z: 35 },
    logic: "eclipse-lunar",
    objects: [
      { type: "sun", size: 2.5, pos: { x: -12, y: 0, z: 0 } },
      // Match Earth's position to the solar eclipse (x:12) so distances are consistent
      { type: "earth", size: 2.0, pos: { x: 12, y: 0, z: 0 } }, 
      // Place Moon the same Earth-Moon distance used in solar eclipse (earth.x + 12)
      { type: "moon", size: 0.6, pos: { x: 24, y: 0, z: 0 }, orbit: true }, 
    ],
  },
  {
    id: "seasons",
    title: "Pergantian Musim",
    subtitle: "KEMIRINGAN SUMBU (AXIAL TILT)",
    description: "Bumi miring 23.5°. Slider mensimulasikan revolusi tahunan. Perhatikan kutub mana yang condong ke Matahari (Kiri = Panas, Kanan = Dingin).",
    camPos: { x: 0, y: 2, z: 25 },
    logic: "seasons-tilt",
    objects: [
      { type: "sun", size: 2.5, pos: { x: -10, y: 0, z: 0 } },
      { type: "earth", size: 2.2, pos: { x: 8, y: 0, z: 0 } },
    ],
  },
  {
    id: "day-night",
    title: "Siang & Malam",
    subtitle: "ROTASI HARIAN",
    description: "Bumi berputar pada porosnya. Perhatikan batas 'Terminator' (garis antara siang dan malam) yang bergerak melintasi benua.",
    camPos: { x: 0, y: 0, z: 20 },
    logic: "day-night",
    objects: [
      { type: "sun", size: 2.5, pos: { x: -10, y: 0, z: 0 } },
      { type: "earth", size: 3.5, pos: { x: 6, y: 0, z: 0 } },
    ],
  },
  {
    id: "comet",
    title: "Hujan Komet",
    subtitle: "LINTASAN DINAMIS",
    description: "Hujan meteor/komet melintas dengan kecepatan dan posisi acak.",
    camPos: { x: 0, y: 0, z: 40 },
    logic: "comet-shower",
    cometCount: 20,
    objects: [
      { type: "sun", size: 0, pos: { x: -50, y: 0, z: 0 } }, 
      { type: "earth", size: 2.5, pos: { x: 0, y: 0, z: 0 } },
    ],
  },
];

// Three.js Global Variables
let scene, camera, renderer, controls, composer;
let starSystem;
let entityGroup = new THREE.Group();
let cometGroup = new THREE.Group();
let animationFrameId;
const loader = new GLTFLoader();
const clock = new THREE.Clock();

const initThree = () => {
  const w = window.innerWidth;
  const h = window.innerHeight;

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x020205); 

  camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 1000); 
  
  renderer = new THREE.WebGLRenderer({ canvas: canvasRef.value, antialias: true });
  renderer.setSize(w, h);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  // Better color & lighting reproduction
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  renderer.physicallyCorrectLights = true;

  const renderPass = new RenderPass(scene, camera);
  const bloomPass = new UnrealBloomPass(new THREE.Vector2(w, h), 1.0, 0.4, 0.85);
  composer = new EffectComposer(renderer);
  composer.addPass(renderPass);
  composer.addPass(bloomPass);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.enablePan = false; 
  
  // Ambient light diredupkan agar shadow lebih kontras (penting untuk gerhana/siang-malam)
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.05); 
  scene.add(ambientLight);

  // Hemisphere light for sky/ground fill
  const hemiLight = new THREE.HemisphereLight(0x88aaff, 0x222233, 0.45);
  scene.add(hemiLight);

  // Soft fill directional light to give general body illumination
  const fillDir = new THREE.DirectionalLight(0xffffff, 0.6);
  fillDir.position.set(10, 10, 10);
  scene.add(fillDir);

  // Rim/back light to separate silhouettes
  const rimLight = new THREE.DirectionalLight(0xffffff, 0.25);
  rimLight.position.set(-15, 5, -10);
  scene.add(rimLight);

  createStarfield();
  scene.add(entityGroup);
  scene.add(cometGroup);

  loadScene(0);
  animate();
  window.addEventListener("resize", onResize);
};

const loadScene = (index) => {
  entityGroup.clear();
  cometGroup.clear();

  // Reset state slider
  sliderValue.value = 50;

  const config = scenes[index];
  config.objects.forEach(createObject);

  // --- Compute orbit metadata for moons relative to Earth ---
  const earthObj = entityGroup.children.find(c => c.userData.type === 'earth');
  if (earthObj) {
    entityGroup.children.forEach((c) => {
      if (c.userData.type === 'moon') {
        const dx = c.position.x - earthObj.position.x;
        const dz = c.position.z - earthObj.position.z;
        const computedRadius = Math.sqrt(dx * dx + dz * dz) || (c.userData.radius || 6);
        // store robust numeric values
        c.userData.radius = c.userData.radius || computedRadius;
        c.userData.startAngle = typeof c.userData.startAngle === 'number' ? c.userData.startAngle : Math.atan2(dz, dx);
        // Default to full circle unless scene wants a limited sweep
        c.userData.span = c.userData.span || (config.logic === 'eclipse-solar' ? Math.PI : Math.PI * 1.2);
        c.userData.zScale = c.userData.zScale || 0.6;
      }
    });
  }

  if (config.logic === "comet-shower") createCometShower(config, true);

  // Animasi Kamera setiap ganti scene
  gsap.to(camera.position, {
    x: config.camPos.x,
    y: config.camPos.y,
    z: config.camPos.z,
    duration: 1.5,
    ease: "power2.inOut",
  });
  
  controls.target.set(0, 0, 0); 

  // Ensure initial scene shows the event state immediately
  // For eclipse scenes, set slider to the event moment (0% -> alignment/totality)
  if (config.logic === 'eclipse-solar' || config.logic === 'eclipse-lunar') sliderValue.value = 0;
  else sliderValue.value = sliderValue.value ?? 50;

  // Update positions immediately to reflect the current slider value
  updateSceneAtT(sliderValue.value / 100);
};

// Helper that updates object positions and status for a given normalized t in [0,1]
const updateSceneAtT = (t) => {
  const currentScene = scenes[activeIndex.value];

  // Solar eclipse: moon orbits Earth; totality if aligned with Sun
  if (currentScene.logic === 'eclipse-solar') {
    const earthObj = entityGroup.children.find(c => c.userData.type === 'earth');
    const moonObj = entityGroup.children.find(c => c.userData.type === 'moon');
    const sunObj = entityGroup.children.find(c => c.userData.type === 'sun');
    if (earthObj && moonObj) {
      const radius = moonObj.userData.radius || 8;
      const start = moonObj.userData.startAngle || 0;
      const span = moonObj.userData.span || Math.PI;
      const zScale = moonObj.userData.zScale || 0.6;
      const angle = start + t * span;
      moonObj.position.x = earthObj.position.x + Math.cos(angle) * radius;
      moonObj.position.z = earthObj.position.z + Math.sin(angle) * radius * zScale;
      moonObj.rotation.y = -angle;

      if (sunObj) {
        const seX = earthObj.position.x - sunObj.position.x;
        const seZ = earthObj.position.z - sunObj.position.z;
        const smX = moonObj.position.x - sunObj.position.x;
        const smZ = moonObj.position.z - sunObj.position.z;
        const seLen = Math.hypot(seX, seZ) || 0.0001;
        const proj = (smX * seX + smZ * seZ) / seLen;
        const perp = Math.abs(smX * seZ - smZ * seX) / seLen;
        if (proj > 0 && proj < seLen && perp < 1.5) statusLabel.value = 'GERHANA TOTAL (UMBRA)';
        else if (proj > -3 && proj < seLen + 3 && perp < 3) statusLabel.value = 'GERHANA PARSIAL';
        else statusLabel.value = 'BULAN MENGORBIT';
      } else {
        statusLabel.value = 'BULAN MENGORBIT';
      }
    }
  }

  // Lunar eclipse: moon orbits Earth into its shadow
  else if (currentScene.logic === 'eclipse-lunar') {
    const earthObj = entityGroup.children.find(c => c.userData.type === 'earth');
    const moonObj = entityGroup.children.find(c => c.userData.type === 'moon');
    const sunObj = entityGroup.children.find(c => c.userData.type === 'sun');
    if (earthObj && moonObj) {
      const radius = moonObj.userData.radius || 8;
      const start = moonObj.userData.startAngle || 0;
      const span = moonObj.userData.span || Math.PI;
      const zScale = moonObj.userData.zScale || 0.6;
      const angle = start + t * span;
      moonObj.position.x = earthObj.position.x + Math.cos(angle) * radius;
      moonObj.position.z = earthObj.position.z + Math.sin(angle) * radius * zScale;
      moonObj.rotation.y = -angle;

      if (sunObj) {
        const seX = earthObj.position.x - sunObj.position.x;
        const seZ = earthObj.position.z - sunObj.position.z;
        const smX = moonObj.position.x - sunObj.position.x;
        const smZ = moonObj.position.z - sunObj.position.z;
        const seLen = Math.hypot(seX, seZ) || 0.0001;
        const proj = (smX * seX + smZ * seZ) / seLen;
        const perp = Math.abs(smX * seZ - smZ * seX) / seLen;
        if (proj > seLen && perp < 1.5) statusLabel.value = 'UMBRA (GELAP TOTAL)';
        else if (proj > seLen - 2 && perp < 3) statusLabel.value = 'PENUMBRA';
        else statusLabel.value = 'BULAN PURNAMA';
      } else {
        const dx = Math.abs(moonObj.position.x - earthObj.position.x);
        const dz = Math.abs(moonObj.position.z - earthObj.position.z);
        if (dx < 1.5 && dz < 1.5) statusLabel.value = 'UMBRA (GELAP TOTAL)';
        else if (dx < 3 && dz < 3) statusLabel.value = 'PENUMBRA';
        else statusLabel.value = 'BULAN PURNAMA';
      }
    }
  }

  // Day-night and seasons updates for immediate state
  else if (currentScene.logic === 'day-night') {
    const earthObj = entityGroup.children.find(c => c.userData.type === 'earth');
    if (earthObj) {
      const spinGroup = earthObj.getObjectByName('SpinGroup');
      if (spinGroup) spinGroup.rotation.y = (t * Math.PI * 2) + Math.PI;
      const hours = Math.floor(t * 24);
      const mins = Math.floor((t * 24 % 1) * 60);
      statusLabel.value = `WAKTU ROTASI: ${hours.toString().padStart(2,'0')}:${mins.toString().padStart(2,'0')}`;
    }
  }

  else if (currentScene.logic === 'seasons-tilt') {
    const earthObj = entityGroup.children.find(c => c.userData.type === 'earth');
    if (earthObj) {
      const axisTilt = earthObj.getObjectByName('AxisTilt');
      const tiltPivot = earthObj.getObjectByName('TiltPivot');
      if (axisTilt) axisTilt.rotation.z = -23.5 * (Math.PI / 180);
      if (tiltPivot) tiltPivot.rotation.y = t * Math.PI;
      if (t < 0.2) statusLabel.value = 'MUSIM PANAS (UTARA)';
      else if (t > 0.8) statusLabel.value = 'MUSIM DINGIN (UTARA)';
      else statusLabel.value = 'EKUINOKS';
    }
  }

  // Comet: update positions immediately
  else if (currentScene.logic === 'comet-shower') {
    cometGroup.children.forEach((c) => {
      // Position some comets at a start point relative to t
      c.position.x = c.position.x; // leave as is; the animate loop will handle motion
    });
    statusLabel.value = `KEPADATAN: ${Math.round(sliderValue.value) }%`;
  }

  // Render a single frame update so user sees the initial state
  composer.render();
};

const createObject = (conf) => {
  const wrapper = new THREE.Group();
  wrapper.position.set(conf.pos.x, conf.pos.y, conf.pos.z);
  wrapper.userData = { ...conf, initialPos: { ...conf.pos } }; 

  if (conf.type === "sun") {
    if (conf.size > 0) {
      const sunGeo = new THREE.SphereGeometry(conf.size, 32, 32);
      const sunMat = new THREE.MeshStandardMaterial({ color: 0xffaa00, emissive: 0xffaa00, emissiveIntensity: 3.0, roughness: 0.25, metalness: 0.0 });
      const sunMesh = new THREE.Mesh(sunGeo, sunMat);
      sunMesh.castShadow = false; // Sun shouldn't cast self-shadow
      wrapper.add(sunMesh);

      const spriteMat = new THREE.SpriteMaterial({
        map: new THREE.TextureLoader().load("https://threejs.org/examples/textures/sprites/glow.png"),
        color: 0xffdd88,
        transparent: true,
        blending: THREE.AdditiveBlending,
      });
      const sprite = new THREE.Sprite(spriteMat);
      sprite.scale.set(conf.size * 10, conf.size * 10, 1);
      wrapper.add(sprite);

      // Strong point light centered on sun for warm fill and realistic highlights
      const pLight = new THREE.PointLight(0xfff0cc, 2.0 * Math.max(1, conf.size), 250, 2);
      pLight.position.set(0, 0, 0);
      pLight.castShadow = true;
      pLight.shadow.bias = -0.002;
      wrapper.add(pLight);

      // Directional light for shadows from Sun, softened
      const dirLight = new THREE.DirectionalLight(0xffffff, 1.2 * Math.max(1, conf.size));
      dirLight.castShadow = true;
      dirLight.shadow.mapSize.width = 2048;
      dirLight.shadow.mapSize.height = 2048;
      dirLight.shadow.bias = -0.001;
      // Perluas area shadow camera agar mencakup orbit bulan
      dirLight.shadow.camera.left = -20;
      dirLight.shadow.camera.right = 20;
      dirLight.shadow.camera.top = 20;
      dirLight.shadow.camera.bottom = -20;
      
      const targetObj = new THREE.Object3D();
      targetObj.position.set(50, 0, 0); // Target ke arah kanan (scene)
      wrapper.add(targetObj);
      dirLight.target = targetObj;
      
      wrapper.add(dirLight);
    }
  }

  const filename = modelAssets[conf.type];
  if (filename) {
    loader.load(`/textures/${filename}`, (gltf) => {
        const model = gltf.scene;
        
        const box = new THREE.Box3().setFromObject(model);
        const sizeVec = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(sizeVec.x, sizeVec.y, sizeVec.z) || 1;
        const scale = (conf.size * 2) / maxDim;
        model.scale.set(scale, scale, scale);

        // Re-center the model geometry so the visual center is at the group's origin
        const center = box.getCenter(new THREE.Vector3());
        model.position.set(-center.x * scale, -center.y * scale, -center.z * scale);

        model.traverse((c) => {
          if (c.isMesh) {
            c.castShadow = true;
            c.receiveShadow = true;
            const map = c.material && c.material.map ? c.material.map : null;
            const color = c.material && c.material.color ? c.material.color.getHex() : 0xffffff;
            c.material = new THREE.MeshStandardMaterial({
                map: map,
                color: color,
                roughness: 0.6,
                metalness: 0.03
            });
            c.material.needsUpdate = true;
          }
        });

        if (conf.type === "earth") {
          // --- HIRARKI BUMI YANG DIPERBAIKI UNTUK MUSIM & ROTASI ---
          // 1. TiltPivot: Untuk memutar arah sumbu miring (simulasi revolusi mengelilingi matahari)
          // 2. AxisTilt: Wadah miring permanen (23.5 derajat)
          // 3. SpinGroup: Wadah untuk rotasi harian (siang/malam)
          // 4. Model Asli
          
          const spinGroup = new THREE.Group();
          spinGroup.name = "SpinGroup";
          spinGroup.add(model);
          
          const axisTilt = new THREE.Group();
          axisTilt.name = "AxisTilt";
          axisTilt.add(spinGroup);

          const tiltPivot = new THREE.Group();
          tiltPivot.name = "TiltPivot";
          tiltPivot.add(axisTilt);

          wrapper.add(tiltPivot);
        } else {
          wrapper.add(model);
        }
      },
      undefined,
      () => {
        const geo = new THREE.SphereGeometry(conf.size, 32, 32);
        const mat = new THREE.MeshStandardMaterial({ color: 0x888888 });
        wrapper.add(new THREE.Mesh(geo, mat));
      }
    );
  }
  entityGroup.add(wrapper);
};

const createCometShower = (config, initial = false) => {
  for (let i = 0; i < config.cometCount; i++) {
    const cometSize = 0.1 + Math.random() * 0.15;
    const head = new THREE.Mesh(
      new THREE.SphereGeometry(cometSize, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0xaaddff })
    );
    // Ekor komet
    const tailLength = 6 + Math.random() * 5;
    const tail = new THREE.Mesh(
      new THREE.ConeGeometry(cometSize, tailLength, 16, 1, true),
      new THREE.MeshBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.3, blending: THREE.AdditiveBlending, depthWrite: false })
    );
    tail.rotation.x = Math.PI / 2;
    tail.position.z = tailLength / 2;
    head.add(tail);
    // Place comets across a wider range on initial load so some are visible immediately
    resetComet(head, initial);
    cometGroup.add(head);
  }
};

const resetComet = (comet, initial = false) => {
    // Variasi posisi start Y dan Z agar tidak satu garis lurus
    if (initial) {
        // Spread some comets across a range including in-front of camera so they are visible immediately
        comet.position.set(
            -20 + Math.random() * 70,
            (Math.random() - 0.5) * 15,
            (Math.random() - 0.5) * 15
        );
    } else {
        // Reset far right to recycle
        comet.position.set(
            50 + Math.random() * 30,
            (Math.random() - 0.5) * 15,
            (Math.random() - 0.5) * 15
        );
    }
    // Variasi kecepatan
    comet.userData = { speed: 0.5 + Math.random() * 0.8 };
    // Sedikit rotasi acak
    comet.rotation.z = (Math.random() - 0.5) * 0.5;
};

const createStarfield = () => {
  const geo = new THREE.BufferGeometry();
  const pos = [];
  for (let i = 0; i < 3000; i++) {
    pos.push((Math.random() - 0.5) * 800, (Math.random() - 0.5) * 800, -100 + (Math.random() * 50));
  }
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({ size: 0.7, color: 0xffffff, transparent: true, opacity: 0.8 });
  starSystem = new THREE.Points(geo, mat);
  scene.add(starSystem);
};

// --- LOGIKA UTAMA (ANIMASI & FISIKA) ---
const animate = () => {
  animationFrameId = requestAnimationFrame(animate);
  const dt = clock.getDelta();
  controls.update();
  if (starSystem) starSystem.rotation.z += 0.0002;

  // Update comet motion continuously (independent of slider)
  if (cometGroup && cometGroup.children.length) {
    cometGroup.children.forEach((c) => {
      c.position.x -= (c.userData.speed || 0.6) * dt * 20; // scale to pleasant speed
      if (c.position.x < -80) resetComet(c, false);
    });
  }

  const t = sliderValue.value / 100; // 0.0 -> 1.0
  updateSceneAtT(t);
};

const nextScene = () => {
  activeIndex.value = (activeIndex.value + 1) % scenes.length;
  loadScene(activeIndex.value);
};

const startSceneQuiz = () => {
  const sceneConf = scenes[activeIndex.value];
  if (sceneConf && sceneConf.id) router.push({ name: 'quiz', params: { id: sceneConf.id } });
};

// Navigation to planet-detail from EventsView was intentionally removed.
// Previously this opened a planet detail (with an event query) but it's not desired anymore.

const prevScene = () => {
  activeIndex.value = (activeIndex.value - 1 + scenes.length) % scenes.length;
  loadScene(activeIndex.value);
};

const onResize = () => {
  if (!camera || !renderer) return;
  const w = window.innerWidth;
  const h = window.innerHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
  composer.setSize(w, h);
};

const goBack = () => router.push("/selection");

onMounted(initThree);
onUnmounted(() => {
  cancelAnimationFrame(animationFrameId);
  window.removeEventListener("resize", onResize);
  if (renderer) renderer.dispose();
});
</script>

<template>
  <div class="relative w-full h-screen bg-black overflow-hidden font-sans text-white select-none pointer-events-auto">
    
    <canvas ref="canvasRef" class="relative z-0 block w-full h-full outline-none cursor-move pointer-events-auto"></canvas>

    <div class="absolute inset-0 z-10 pointer-events-none flex flex-col justify-between p-6 md:p-10">
      
      <div class="pointer-events-auto max-w-xl animate-fade-in-down">
        <div class="inline-flex items-center gap-2 px-3 py-1 mb-4 text-[10px] font-bold tracking-widest bg-white/10 rounded-full border border-white/20 backdrop-blur-md">
          <span class="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
          <span class="text-white/80 uppercase">Simulasi {{ activeIndex + 1 }} / {{ scenes.length }}</span>
        </div>

        <div class="flex items-start gap-4 mb-2">
          <h1 class="text-4xl md:text-6xl font-black tracking-tighter bg-gradient-to-r from-white via-gray-200 to-gray-500 bg-clip-text text-transparent drop-shadow-lg">
            {{ scenes[activeIndex].title }}
          </h1>
          <button @click="startSceneQuiz" class="mt-2 px-3 py-1 rounded-md bg-cyan-600/20 border border-cyan-400 text-cyan-200 text-sm hover:bg-cyan-600/30 transition">Mulai Quiz</button>
        </div>
        
        <div class="flex items-center gap-3 mb-4">
            <p class="text-cyan-400 tracking-[0.3em] text-xs font-bold uppercase pl-1">
            {{ scenes[activeIndex].subtitle }}
            </p>
            <div v-if="statusLabel" class="px-3 py-1 bg-cyan-900/50 border border-cyan-500/30 rounded text-[10px] font-mono text-cyan-200">
                {{ statusLabel }}
            </div>
        </div>

        <p class="text-gray-200 text-sm md:text-base leading-relaxed bg-black/50 p-4 rounded-xl border-l-4 border-cyan-500 backdrop-blur-sm max-w-md shadow-2xl">
          {{ scenes[activeIndex].description }}
        </p>
      </div>

      <div class="pointer-events-auto w-full max-w-4xl mx-auto flex items-end gap-4 animate-fade-in-up">
        
        <button @click="prevScene" class="control-btn group">
          <span class="text-[9px] uppercase font-bold text-gray-400 mb-1 group-hover:text-white transition-colors">Prev</span>
          <svg class="w-6 h-6 text-white group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path> 
          </svg>
        </button>

        <div class="flex-1 w-full bg-black/60 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
          <div class="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-500 to-transparent opacity-50"></div>
          
          <div class="flex justify-between text-[10px] uppercase font-bold text-gray-400 mb-4 tracking-wider">
            <span>Start</span>
            <span class="text-cyan-400 font-mono text-xs">{{ Math.round(sliderValue) }}%</span>
            <span>End</span>
          </div>
          
          <input
            type="range"
            v-model="sliderValue"
            min="0"
            max="100"
            step="0.5"
            class="slider-input w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
          />
        </div>

        <button @click="nextScene" class="control-btn group">
          <span class="text-[9px] uppercase font-bold text-gray-400 mb-1 group-hover:text-white transition-colors">Next</span>
          <svg class="w-6 h-6 text-white group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path>
          </svg>
        </button>
      </div>
    </div>

    <div class="absolute top-6 right-6 z-20 pointer-events-auto">
      <button @click="goBack" class="px-6 py-2 rounded-full bg-white/5 border border-white/10 text-white font-bold text-xs uppercase hover:bg-cyan-600 hover:border-cyan-500 transition-all shadow-lg backdrop-blur-sm">
        Kembali
      </button>
    </div>
  </div>
</template>

<style scoped>
/* Custom Slider Styling */
.slider-input::-webkit-slider-thumb {
  -webkit-appearance: none;
  height: 28px;
  width: 28px;
  border-radius: 50%;
  background: #000;
  border: 3px solid #22d3ee;
  margin-top: -12px;
  box-shadow: 0 0 15px rgba(34, 211, 238, 0.8);
  transition: transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}
.slider-input::-webkit-slider-thumb:hover {
  transform: scale(1.3);
  background: #22d3ee;
}
.slider-input::-webkit-slider-runnable-track {
  height: 4px;
  background: #374151;
  border-radius: 2px;
}

/* Button Styling */
.control-btn {
  height: 84px;
  aspect-ratio: 1 / 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border-radius: 1rem;
  background-color: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.1);
  backdrop-filter: blur(6px);
  transition: all 150ms ease-in-out;
  flex-shrink: 0;
  box-shadow: 0 10px 15px rgba(0,0,0,0.15);
}
.control-btn:hover {
  background-color: rgba(255,255,255,0.1);
}
.control-btn:active {
  transform: scale(0.95);
}

/* Animations */
@keyframes fadeInDown {
  from { opacity: 0; transform: translateY(-30px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(30px); }
  to { opacity: 1; transform: translateY(0); }
}
.animate-fade-in-down { animation: fadeInDown 1s cubic-bezier(0.2, 0.8, 0.2, 1); }
.animate-fade-in-up { animation: fadeInUp 1s cubic-bezier(0.2, 0.8, 0.2, 1); }
</style>