<script setup>
import { ref, onMounted, onUnmounted, computed } from "vue";
import { useRouter } from "vue-router";

import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import gsap from "gsap";
import speech from "../utils/speech";
import { useAR } from "../composables/useAR.js";
import { useComet } from "../composables/useComet.js";

const router = useRouter();
const canvasRef = ref(null);
const videoRef = ref(null);
const activeIndex = ref(0);
const sliderValue = ref(50);
const statusLabel = ref("");

// Composables
const {
  isARMode,
  cameraError,
  toggleAR: toggleARComposable,
  stopAR: stopARComposable,
} = useAR();
const { createCometShower, updateComets } = useComet();

// Audio State
const isSpeaking = ref(false);
const speechAvailable = ref(false);
const voiceStatusMsg = ref("");

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
    description:
      "Geser slider untuk melihat Bulan mengorbit di antara Matahari dan Bumi. Perhatikan bayangan kecil Bulan jatuh ke permukaan Bumi.",
    audioText:
      "Gerhana Matahari terjadi ketika Bulan berada di antara Matahari dan Bumi. Geser slider untuk melihat pergerakan Bulan.",
    camPos: { x: 0, y: 5, z: 35 },
    logic: "eclipse-solar",
    objects: [
      { type: "sun", size: 2.5, pos: { x: -12, y: 0, z: 0 } },
      { type: "earth", size: 2.0, pos: { x: 12, y: 0, z: 0 } },
      { type: "moon", size: 0.6, pos: { x: 0, y: 0, z: 0 }, orbit: true },
    ],
  },
  {
    id: "lunar-eclipse",
    title: "Gerhana Bulan",
    subtitle: "MASUK KE BAYANGAN BUMI",
    description:
      "Bulan bergerak melengkung menuju belakang Bumi (Umbra). Perhatikan Bulan menjadi gelap saat tertutup Bumi sepenuhnya.",
    audioText:
      "Gerhana Bulan terjadi ketika Bumi berada di antara Matahari dan Bulan. Bulan akan masuk ke bayangan Bumi yang disebut Umbra.",
    camPos: { x: 0, y: 5, z: 35 },
    logic: "eclipse-lunar",
    objects: [
      { type: "sun", size: 2.5, pos: { x: -12, y: 0, z: 0 } },
      { type: "earth", size: 2.0, pos: { x: 12, y: 0, z: 0 } },
      { type: "moon", size: 0.6, pos: { x: 24, y: 0, z: 0 }, orbit: true },
    ],
  },
  {
    id: "seasons",
    title: "Pergantian Musim",
    subtitle: "KEMIRINGAN SUMBU (AXIAL TILT)",
    description:
      "Bumi miring 23.5°. Slider mensimulasikan revolusi tahunan. Perhatikan kutub mana yang condong ke Matahari (Kiri = Panas, Kanan = Dingin).",
    audioText:
      "Pergantian musim terjadi karena kemiringan sumbu Bumi sebesar 23 koma 5 derajat. Geser slider untuk melihat perubahan musim sepanjang tahun.",
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
    description:
      "Bumi berputar pada porosnya. Perhatikan batas 'Terminator' (garis antara siang dan malam) yang bergerak melintasi benua.",
    audioText:
      "Siang dan malam terjadi karena Bumi berputar pada porosnya. Satu kali putaran penuh membutuhkan waktu 24 jam.",
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
    description:
      "Hujan meteor/komet melintas dengan kecepatan dan posisi acak.",
    audioText:
      "Hujan meteor terjadi ketika Bumi melewati jalur debu yang ditinggalkan oleh komet. Perhatikan lintasan meteor yang melintasi langit.",
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

const currentScene = computed(() => scenes[activeIndex.value]);

// Speech functions
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

const toggleAudio = async () => {
  if (isSpeaking.value) {
    speech.cancel();
    isSpeaking.value = false;
  } else {
    const text = currentScene.value.audioText || currentScene.value.description;
    try {
      isSpeaking.value = true;
      await speech.speak(text, { lang: "id-ID", rate: 1.0 });
    } catch (e) {
      console.warn("[Speech] speak error", e);
    } finally {
      isSpeaking.value = false;
    }
  }
};

// --- AR FUNCTIONS (Using Composable) ---
const toggleAR = async () => {
  await toggleARComposable(videoRef.value, scene, starSystem);
};

const stopAR = () => {
  stopARComposable(videoRef.value, scene, starSystem, 0x020205);
};

const initThree = () => {
  const w = window.innerWidth;
  const h = window.innerHeight;

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x020205);

  camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 1000);

  renderer = new THREE.WebGLRenderer({
    canvas: canvasRef.value,
    antialias: true,
    alpha: true,
  });

  renderer.setClearColor(0x000000, 0);

  renderer.setSize(w, h);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;

  const renderPass = new RenderPass(scene, camera);
  const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(w, h),
    1.0,
    0.4,
    0.85
  );

  composer = new EffectComposer(renderer);
  composer.addPass(renderPass);
  composer.addPass(bloomPass);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.05);
  scene.add(ambientLight);
  const hemiLight = new THREE.HemisphereLight(0x88aaff, 0x222233, 0.45);
  scene.add(hemiLight);
  const fillDir = new THREE.DirectionalLight(0xffffff, 0.6);
  fillDir.position.set(10, 10, 10);
  scene.add(fillDir);

  if (typeof createStarfield === "function") createStarfield();
  if (typeof entityGroup !== "undefined") scene.add(entityGroup);
  if (typeof cometGroup !== "undefined") scene.add(cometGroup);

  loadScene(0);
  animate();
  window.addEventListener("resize", onResize);
};

const loadScene = (index) => {
  entityGroup.clear();
  cometGroup.clear();

  sliderValue.value = 50;

  const config = scenes[index];
  config.objects.forEach(createObject);

  const earthObj = entityGroup.children.find(
    (c) => c.userData.type === "earth"
  );
  if (earthObj) {
    entityGroup.children.forEach((c) => {
      if (c.userData.type === "moon") {
        const dx = c.position.x - earthObj.position.x;
        const dz = c.position.z - earthObj.position.z;
        const computedRadius =
          Math.sqrt(dx * dx + dz * dz) || c.userData.radius || 6;
        c.userData.radius = c.userData.radius || computedRadius;
        c.userData.startAngle =
          typeof c.userData.startAngle === "number"
            ? c.userData.startAngle
            : Math.atan2(dz, dx);
        c.userData.span =
          c.userData.span ||
          (config.logic === "eclipse-solar" ? Math.PI : Math.PI * 1.2);
        c.userData.zScale = c.userData.zScale || 0.6;
      }
    });
  }

  if (config.logic === "comet-shower") {
    createCometShower(scene, cometGroup, config.cometCount, true);
  }

  gsap.to(camera.position, {
    x: config.camPos.x,
    y: config.camPos.y,
    z: config.camPos.z,
    duration: 1.5,
    ease: "power2.inOut",
  });

  controls.target.set(0, 0, 0);

  if (config.logic === "eclipse-solar" || config.logic === "eclipse-lunar")
    sliderValue.value = 0;
  else sliderValue.value = sliderValue.value ?? 50;

  updateSceneAtT(sliderValue.value / 100);
};

const updateSceneAtT = (t) => {
  const currentScene = scenes[activeIndex.value];

  if (currentScene.logic === "eclipse-solar") {
    const earthObj = entityGroup.children.find(
      (c) => c.userData.type === "earth"
    );
    const moonObj = entityGroup.children.find(
      (c) => c.userData.type === "moon"
    );
    const sunObj = entityGroup.children.find((c) => c.userData.type === "sun");
    if (earthObj && moonObj) {
      const radius = moonObj.userData.radius || 8;
      const start = moonObj.userData.startAngle || 0;
      const span = moonObj.userData.span || Math.PI;
      const zScale = moonObj.userData.zScale || 0.6;
      const angle = start + t * span;
      moonObj.position.x = earthObj.position.x + Math.cos(angle) * radius;
      moonObj.position.z =
        earthObj.position.z + Math.sin(angle) * radius * zScale;
      moonObj.rotation.y = -angle;

      if (sunObj) {
        const seX = earthObj.position.x - sunObj.position.x;
        const seZ = earthObj.position.z - sunObj.position.z;
        const smX = moonObj.position.x - sunObj.position.x;
        const smZ = moonObj.position.z - sunObj.position.z;
        const seLen = Math.hypot(seX, seZ) || 0.0001;
        const proj = (smX * seX + smZ * seZ) / seLen;
        const perp = Math.abs(smX * seZ - smZ * seX) / seLen;
        if (proj > 0 && proj < seLen && perp < 1.5)
          statusLabel.value = "GERHANA TOTAL (UMBRA)";
        else if (proj > -3 && proj < seLen + 3 && perp < 3)
          statusLabel.value = "GERHANA PARSIAL";
        else statusLabel.value = "BULAN MENGORBIT";
      } else {
        statusLabel.value = "BULAN MENGORBIT";
      }
    }
  } else if (currentScene.logic === "eclipse-lunar") {
    const earthObj = entityGroup.children.find(
      (c) => c.userData.type === "earth"
    );
    const moonObj = entityGroup.children.find(
      (c) => c.userData.type === "moon"
    );
    const sunObj = entityGroup.children.find((c) => c.userData.type === "sun");
    if (earthObj && moonObj) {
      const radius = moonObj.userData.radius || 8;
      const start = moonObj.userData.startAngle || 0;
      const span = moonObj.userData.span || Math.PI;
      const zScale = moonObj.userData.zScale || 0.6;
      const angle = start + t * span;
      moonObj.position.x = earthObj.position.x + Math.cos(angle) * radius;
      moonObj.position.z =
        earthObj.position.z + Math.sin(angle) * radius * zScale;
      moonObj.rotation.y = -angle;

      if (sunObj) {
        const seX = earthObj.position.x - sunObj.position.x;
        const seZ = earthObj.position.z - sunObj.position.z;
        const smX = moonObj.position.x - sunObj.position.x;
        const smZ = moonObj.position.z - sunObj.position.z;
        const seLen = Math.hypot(seX, seZ) || 0.0001;
        const proj = (smX * seX + smZ * seZ) / seLen;
        const perp = Math.abs(smX * seZ - smZ * seX) / seLen;
        if (proj > seLen && perp < 1.5)
          statusLabel.value = "UMBRA (GELAP TOTAL)";
        else if (proj > seLen - 2 && perp < 3) statusLabel.value = "PENUMBRA";
        else statusLabel.value = "BULAN PURNAMA";
      } else {
        const dx = Math.abs(moonObj.position.x - earthObj.position.x);
        const dz = Math.abs(moonObj.position.z - earthObj.position.z);
        if (dx < 1.5 && dz < 1.5) statusLabel.value = "UMBRA (GELAP TOTAL)";
        else if (dx < 3 && dz < 3) statusLabel.value = "PENUMBRA";
        else statusLabel.value = "BULAN PURNAMA";
      }
    }
  } else if (currentScene.logic === "day-night") {
    const earthObj = entityGroup.children.find(
      (c) => c.userData.type === "earth"
    );
    if (earthObj) {
      const spinGroup = earthObj.getObjectByName("SpinGroup");
      if (spinGroup) spinGroup.rotation.y = t * Math.PI * 2 + Math.PI;
      const hours = Math.floor(t * 24);
      const mins = Math.floor(((t * 24) % 1) * 60);
      statusLabel.value = `WAKTU ROTASI: ${hours
        .toString()
        .padStart(2, "0")}:${mins.toString().padStart(2, "0")}`;
    }
  } else if (currentScene.logic === "seasons-tilt") {
    const earthObj = entityGroup.children.find(
      (c) => c.userData.type === "earth"
    );
    if (earthObj) {
      const axisTilt = earthObj.getObjectByName("AxisTilt");
      const tiltPivot = earthObj.getObjectByName("TiltPivot");
      if (axisTilt) axisTilt.rotation.z = -23.5 * (Math.PI / 180);
      if (tiltPivot) tiltPivot.rotation.y = t * Math.PI;
      if (t < 0.2) statusLabel.value = "MUSIM PANAS (UTARA)";
      else if (t > 0.8) statusLabel.value = "MUSIM DINGIN (UTARA)";
      else statusLabel.value = "EKUINOKS";
    }
  } else if (currentScene.logic === "comet-shower") {
    cometGroup.children.forEach((c) => {
      c.position.x = c.position.x;
    });
    statusLabel.value = `KEPADATAN: ${Math.round(sliderValue.value)}%`;
  }
};

const createObject = (conf) => {
  const wrapper = new THREE.Group();
  wrapper.position.set(conf.pos.x, conf.pos.y, conf.pos.z);
  wrapper.userData = { ...conf, initialPos: { ...conf.pos } };

  if (conf.type === "sun") {
    if (conf.size > 0) {
      const sunGeo = new THREE.SphereGeometry(conf.size, 32, 32);
      const sunMat = new THREE.MeshStandardMaterial({
        color: 0xffaa00,
        emissive: 0xffaa00,
        emissiveIntensity: 3.0,
        roughness: 0.25,
        metalness: 0.0,
      });
      const sunMesh = new THREE.Mesh(sunGeo, sunMat);
      sunMesh.castShadow = false;
      wrapper.add(sunMesh);

      const spriteMat = new THREE.SpriteMaterial({
        map: new THREE.TextureLoader().load(
          "https://threejs.org/examples/textures/sprites/glow.png"
        ),
        color: 0xffdd88,
        transparent: true,
        blending: THREE.AdditiveBlending,
      });
      const sprite = new THREE.Sprite(spriteMat);
      sprite.scale.set(conf.size * 10, conf.size * 10, 1);
      wrapper.add(sprite);

      const pLight = new THREE.PointLight(
        0xfff0cc,
        2.0 * Math.max(1, conf.size),
        250,
        2
      );
      pLight.position.set(0, 0, 0);
      pLight.castShadow = true;
      pLight.shadow.bias = -0.002;
      wrapper.add(pLight);

      const dirLight = new THREE.DirectionalLight(
        0xffffff,
        1.2 * Math.max(1, conf.size)
      );
      dirLight.castShadow = true;
      dirLight.shadow.mapSize.width = 2048;
      dirLight.shadow.mapSize.height = 2048;
      dirLight.shadow.bias = -0.001;
      dirLight.shadow.camera.left = -20;
      dirLight.shadow.camera.right = 20;
      dirLight.shadow.camera.top = 20;
      dirLight.shadow.camera.bottom = -20;

      const targetObj = new THREE.Object3D();
      targetObj.position.set(50, 0, 0);
      wrapper.add(targetObj);
      dirLight.target = targetObj;

      wrapper.add(dirLight);
    }
  }

  const filename = modelAssets[conf.type];
  if (filename) {
    loader.load(
      `/textures/${filename}`,
      (gltf) => {
        const model = gltf.scene;

        const box = new THREE.Box3().setFromObject(model);
        const sizeVec = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(sizeVec.x, sizeVec.y, sizeVec.z) || 1;
        const scale = (conf.size * 2) / maxDim;
        model.scale.set(scale, scale, scale);

        const center = box.getCenter(new THREE.Vector3());
        model.position.set(
          -center.x * scale,
          -center.y * scale,
          -center.z * scale
        );

        model.traverse((c) => {
          if (c.isMesh) {
            c.castShadow = true;
            c.receiveShadow = true;
            const map = c.material && c.material.map ? c.material.map : null;
            const color =
              c.material && c.material.color
                ? c.material.color.getHex()
                : 0xffffff;
            c.material = new THREE.MeshStandardMaterial({
              map: map,
              color: color,
              roughness: 0.6,
              metalness: 0.03,
            });
            c.material.needsUpdate = true;
          }
        });

        if (conf.type === "earth") {
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

const createStarfield = () => {
  const geo = new THREE.BufferGeometry();
  const pos = [];
  for (let i = 0; i < 3000; i++) {
    pos.push(
      (Math.random() - 0.5) * 800,
      (Math.random() - 0.5) * 800,
      -100 + Math.random() * 50
    );
  }
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({
    size: 0.7,
    color: 0xffffff,
    transparent: true,
    opacity: 0.8,
  });
  starSystem = new THREE.Points(geo, mat);
  scene.add(starSystem);
};

const animate = () => {
  animationFrameId = requestAnimationFrame(animate);
  const dt = clock.getDelta();
  controls.update();
  if (starSystem) starSystem.rotation.z += 0.0002;

  if (cometGroup && cometGroup.children.length) {
    updateComets(cometGroup, dt);
  }

  const t = sliderValue.value / 100;
  updateSceneAtT(t);

  if (isARMode.value) {
    renderer.render(scene, camera);
  } else {
    composer.render();
  }
};

const nextScene = () => {
  activeIndex.value = (activeIndex.value + 1) % scenes.length;
  loadScene(activeIndex.value);
  try {
    speech.cancel();
  } catch (e) {}
  isSpeaking.value = false;
};

const startSceneQuiz = () => {
  const sceneConf = scenes[activeIndex.value];
  if (sceneConf && sceneConf.id) {
    router.push({
      name: "quiz",
      params: { id: sceneConf.id },
      query: { from: "events" },
    });
  }
};

const prevScene = () => {
  activeIndex.value = (activeIndex.value - 1 + scenes.length) % scenes.length;
  loadScene(activeIndex.value);
  try {
    speech.cancel();
  } catch (e) {}
  isSpeaking.value = false;
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

const goBack = () => {
  stopAR();
  try {
    speech.cancel();
  } catch (e) {}
  router.push("/selection");
};

const goToLeaderboard = () => {
  const sceneId = scenes[activeIndex.value].id;
  let missionName = "Misi Fenomena Umum";

  const mapping = {
    "solar-eclipse": "Misi Gerhana Matahari",
    "lunar-eclipse": "Misi Gerhana Bulan",
    seasons: "Misi Pergantian Musim",
    "day-night": "Misi Siang & Malam",
    comet: "Misi Komet",
  };

  if (mapping[sceneId]) missionName = mapping[sceneId];

  router.push({
    path: "/leaderboard",
    query: { category: "phenomena", mission: missionName },
  });
};

onMounted(() => {
  initThree();

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

onUnmounted(() => {
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }

  window.removeEventListener("resize", onResize);

  stopAR();

  try {
    speech.cancel();
  } catch (e) {
    console.warn("[Speech] cleanup error", e);
  }

  gsap.killTweensOf("*");

  if (scene) {
    scene.traverse((object) => {
      if (object.geometry) {
        object.geometry.dispose();
      }

      if (object.material) {
        const materials = Array.isArray(object.material)
          ? object.material
          : [object.material];
        materials.forEach((material) => {
          if (material.map) material.map.dispose();
          if (material.normalMap) material.normalMap.dispose();
          if (material.emissiveMap) material.emissiveMap.dispose();
          material.dispose();
        });
      }
    });

    scene.clear();
    scene = null;
  }

  if (controls) {
    controls.dispose();
    controls = null;
  }

  if (renderer) {
    renderer.dispose();
    renderer.domElement = null;
    renderer = null;
  }

  if (composer) {
    composer = null;
  }

  if (entityGroup) {
    entityGroup.clear();
    entityGroup = null;
  }

  if (cometGroup) {
    cometGroup.clear();
    cometGroup = null;
  }

  camera = null;
  starSystem = null;
});
</script>

<template>
  <div
    class="relative w-full min-h-screen bg-black overflow-x-hidden font-sans text-white select-none"
  >
    <video
      ref="videoRef"
      class="fixed inset-0 w-full h-full object-cover z-0 transition-opacity duration-500"
      :class="isARMode ? 'opacity-100' : 'opacity-0'"
      playsinline
      muted
      autoplay
    ></video>

    <canvas
      ref="canvasRef"
      class="fixed inset-0 w-full h-full z-10 block outline-none"
      :style="{ cursor: 'move', pointerEvents: 'auto' }"
    ></canvas>

    <div
      class="relative z-20 pointer-events-none flex flex-col justify-between min-h-screen p-6 md:p-10"
    >
      <div class="pointer-events-auto max-w-xl animate-fade-in-down">
        <div
          class="inline-flex items-center gap-2 px-3 py-1 mb-4 text-[10px] font-bold tracking-widest bg-white/10 rounded-full border border-white/20 backdrop-blur-md"
        >
          <span class="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
          <span class="text-white/80 uppercase"
            >Simulasi {{ activeIndex + 1 }} / {{ scenes.length }}</span
          >
        </div>

        <div class="flex items-start gap-4 mb-2">
          <h1
            class="text-4xl md:text-6xl font-black tracking-tighter bg-gradient-to-r from-white via-gray-200 to-gray-500 bg-clip-text text-transparent drop-shadow-lg"
          >
            {{ scenes[activeIndex].title }}
          </h1>
        </div>

        <div class="flex items-center gap-3 mb-4">
          <p
            class="text-cyan-400 tracking-[0.3em] text-xs font-bold uppercase pl-1"
          >
            {{ scenes[activeIndex].subtitle }}
          </p>
          <div
            v-if="statusLabel"
            class="px-3 py-1 bg-cyan-900/50 border border-cyan-500/30 rounded text-[10px] font-mono text-cyan-200"
          >
            {{ statusLabel }}
          </div>
        </div>

        <p
          v-if="!isARMode"
          class="text-gray-200 text-xs md:text-base leading-relaxed bg-black/50 p-3 md:p-4 rounded-xl border-l-4 border-cyan-500 backdrop-blur-sm w-full md:max-w-md shadow-2xl transition-all"
        >
          {{ scenes[activeIndex].description }}
        </p>
      </div>

      <div
        class="w-full flex flex-col items-center gap-2 animate-fade-in-up md:gap-4 relative z-50 mb-2 md:mb-0"
      >
        <button
          v-if="!isARMode"
          @click="startSceneQuiz"
          class="pointer-events-auto group relative overflow-hidden bg-cyan-600 hover:bg-cyan-500 text-white px-6 py-3 md:px-8 md:py-4 rounded-xl md:rounded-2xl font-black uppercase tracking-widest text-sm md:text-lg shadow-[0_0_30px_rgba(8,145,178,0.5)] hover:shadow-[0_0_50px_rgba(34,211,238,0.7)] transition-all active:scale-95 scale-100 md:scale-100 cursor-pointer"
        >
          <div
            class="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-[100%] group-hover:translate-x-[100%] transition-transform duration-700 ease-in-out"
          ></div>
          <span class="relative z-10 flex items-center gap-2 md:gap-3">
            <span class="text-xl md:text-2xl">🚀</span>
            <span>LAUNCH MISSION</span>
          </span>
        </button>

        <div
          class="pointer-events-auto w-full max-w-4xl mx-auto flex items-end gap-2 md:gap-4"
        >
          <button
            v-if="!isARMode"
            @click="prevScene"
            class="control-btn group pointer-events-auto cursor-pointer p-2 md:p-0"
          >
            <span
              class="text-[9px] uppercase font-bold text-gray-400 mb-1 group-hover:text-white transition-colors"
              >Prev</span
            >
            <svg
              class="w-6 h-6 text-white group-hover:-translate-x-1 transition-transform"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              ></path>
            </svg>
          </button>

          <div
            class="flex-1 w-full bg-black/60 backdrop-blur-xl border border-white/10 rounded-3xl p-3 md:p-6 shadow-2xl relative overflow-hidden pointer-events-auto"
          >
            <div
              class="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-500 to-transparent opacity-50"
            ></div>

            <div
              class="flex justify-between text-[8px] md:text-[10px] uppercase font-bold text-gray-400 mb-2 md:mb-4 tracking-wider"
            >
              <span>Start</span>
              <span class="text-cyan-400 font-mono text-[10px] md:text-xs"
                >{{ Math.round(sliderValue) }}%</span
              >
              <span>End</span>
            </div>

            <input
              type="range"
              v-model="sliderValue"
              min="0"
              max="100"
              step="0.5"
              class="slider-input w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer pointer-events-auto"
            />
          </div>

          <button
            v-if="!isARMode"
            @click="nextScene"
            class="control-btn group pointer-events-auto cursor-pointer p-2 md:p-0"
          >
            <span
              class="text-[9px] uppercase font-bold text-gray-400 mb-1 group-hover:text-white transition-colors"
              >Next</span
            >
            <svg
              class="w-6 h-6 text-white group-hover:translate-x-1 transition-transform"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M14 5l7 7m0 0l-7 7m7-7H3"
              ></path>
            </svg>
          </button>
        </div>
      </div>
    </div>

    <div
      class="fixed right-4 top-[40%] -translate-y-1/2 z-30 flex flex-col gap-4 pointer-events-auto md:top-[40%] md:right-6"
    >
      <button
        @click="toggleAR"
        class="w-12 h-12 backdrop-blur-md border rounded-xl flex items-center justify-center transition-all group relative overflow-hidden shadow-lg cursor-pointer pointer-events-auto"
        :class="
          isARMode
            ? 'bg-red-500/20 border-red-400 text-red-400 animate-pulse'
            : 'bg-black/40 border-white/20 text-white hover:border-cyan-400 hover:text-cyan-300'
        "
      >
        <span class="text-xl relative z-10">{{ isARMode ? "✕" : "📷" }}</span>

        <span
          class="hidden md:block absolute right-14 bg-black/80 text-white text-[10px] px-2 py-1 rounded border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none"
        >
          {{ isARMode ? "STOP AR" : "START AR" }}
        </span>
      </button>

      <button
        @click="toggleAudio"
        :disabled="!speechAvailable"
        class="w-12 h-12 backdrop-blur-md border border-white/20 rounded-xl flex items-center justify-center transition-all relative group shadow-lg cursor-pointer pointer-events-auto"
        :class="
          isSpeaking
            ? 'bg-black/60 border-green-500 text-green-400 shadow-[0_0_15px_rgba(34,197,94,0.4)]'
            : !speechAvailable
            ? 'bg-black/40 opacity-50 cursor-not-allowed'
            : 'bg-black/40 hover:border-yellow-400 hover:text-yellow-300'
        "
      >
        <span class="text-xl">{{ isSpeaking ? "🔊" : "🔈" }}</span>

        <div
          v-if="isSpeaking"
          class="absolute inset-0 flex items-center justify-center gap-[2px] opacity-30"
        >
          <div class="w-1 bg-green-400 animate-wave h-3"></div>
          <div class="w-1 bg-green-400 animate-wave h-5 delay-75"></div>
          <div class="w-1 bg-green-400 animate-wave h-2 delay-150"></div>
        </div>

        <span
          class="hidden md:block absolute right-14 bg-black/80 text-white text-[10px] px-2 py-1 rounded border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none"
        >
          {{ isSpeaking ? "STOP" : "PLAY" }}
        </span>
      </button>

      <button
        v-if="!isARMode"
        @click="goToLeaderboard"
        class="w-12 h-12 flex items-center justify-center rounded-xl bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/30 backdrop-blur-md transition-all group shadow-lg text-yellow-200 hover:scale-105 active:scale-95 relative cursor-pointer pointer-events-auto"
      >
        <span class="text-xl">🏆</span>

        <span
          class="hidden md:block absolute right-14 bg-black/80 text-white text-[10px] px-2 py-1 rounded border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none"
        >
          LEADERBOARD
        </span>
      </button>

      <div
        v-if="!speechAvailable || voiceStatusMsg"
        class="absolute right-14 top-12 w-32 flex flex-col items-end gap-1"
      >
        <div
          v-if="voiceStatusMsg"
          class="text-[9px] text-white/70 bg-black/50 px-2 py-1 rounded backdrop-blur text-right leading-tight"
        >
          {{ voiceStatusMsg }}
        </div>
        <button
          v-if="!speechAvailable"
          @click="enableSpeech"
          class="text-[9px] px-2 py-1 bg-cyan-600/30 border border-cyan-500/30 text-cyan-200 rounded hover:bg-cyan-600/50 backdrop-blur whitespace-nowrap cursor-pointer pointer-events-auto"
        >
          Aktifkan
        </button>
      </div>
    </div>

    <div
      v-if="cameraError"
      class="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-red-900/90 text-white p-5 rounded-xl backdrop-blur-lg border border-red-500/30 max-w-xs text-center pointer-events-auto z-50 shadow-2xl"
    >
      <div class="text-3xl mb-2">⚠️</div>
      <p class="font-bold mb-1">Akses Kamera Ditolak</p>
      <p class="text-xs text-red-100 mb-4 leading-relaxed">{{ cameraError }}</p>
      <button
        @click="cameraError = null"
        class="bg-white/10 border border-white/20 px-6 py-2 rounded-full text-sm hover:bg-white/20 transition-colors cursor-pointer pointer-events-auto"
      >
        Tutup
      </button>
    </div>

    <div
      v-if="!isARMode"
      class="fixed top-4 right-4 md:top-6 md:right-6 z-20 pointer-events-auto"
    >
      <div class="flex gap-3">
        <button
          @click="goBack"
          class="px-4 py-2 md:px-6 md:py-2 rounded-full bg-black/40 border border-white/10 text-white font-bold text-[10px] md:text-xs uppercase hover:bg-cyan-600 hover:border-cyan-500 transition-all shadow-lg backdrop-blur-md cursor-pointer pointer-events-auto"
        >
          Kembali
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
video {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  z-index: 0;
}

canvas {
  z-index: 5;
}

.overlay-ui {
  z-index: 10;
}

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

.control-btn {
  height: 84px;
  aspect-ratio: 1 / 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border-radius: 1rem;
  background-color: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(6px);
  transition: all 150ms ease-in-out;
  flex-shrink: 0;
  box-shadow: 0 10px 15px rgba(0, 0, 0, 0.15);
}
.control-btn:hover {
  background-color: rgba(255, 255, 255, 0.1);
}
.control-btn:active {
  transform: scale(0.95);
}

@keyframes fadeInDown {
  from {
    opacity: 0;
    transform: translateY(-30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
.animate-fade-in-down {
  animation: fadeInDown 1s cubic-bezier(0.2, 0.8, 0.2, 1);
}
.animate-fade-in-up {
  animation: fadeInUp 1s cubic-bezier(0.2, 0.8, 0.2, 1);
}

@keyframes wave {
  0%,
  100% {
    height: 30%;
  }
  50% {
    height: 80%;
  }
}
.animate-wave {
  animation: wave 1s ease-in-out infinite;
}
.delay-75 {
  animation-delay: 75ms;
}
.delay-150 {
  animation-delay: 150ms;
}
</style>
