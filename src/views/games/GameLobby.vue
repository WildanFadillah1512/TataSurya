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
const uiContainerRef = ref(null);

// --- DATA: MULTIVERSE GATES ---
const portals = [
  {
    id: 0,
    title: "SPACE MYSTERY",
    sub: "The Enigma Gate",
    desc: "Solve Ancient Riddles",
    type: "PUZZLE DIMENSION",
    color: "#a855f7", // Purple
    coreColor: "#d8b4fe",
    path: "/game/play-1",
    locked: false,
  },
  {
    id: 1,
    title: "ASTRO ADVENTURE",
    sub: "The Velocity Gate",
    desc: "High Speed Exploration",
    type: "FLIGHT DIMENSION",
    color: "#06b6d4", // Cyan
    coreColor: "#67e8f9",
    path: "/game/play-2",
    locked: false,
  },
  {
    id: 2,
    title: "CLASSIFIED",
    sub: "Sealed Dimension",
    desc: "Containment Field Active",
    type: "RESTRICTED",
    color: "#ef4444", // Red
    coreColor: "#7f1d1d",
    path: "",
    locked: true,
  },
];

const activeIndex = ref(-1);
const isTraveling = ref(false);
const mouse = ref({ x: 0, y: 0 });

// --- THREE.JS VARIABLES ---
let scene, camera, renderer, composer;
let gates = [];
let starSystem;
let raycaster;
let animationId;

// --- 3D SETUP ---
const init = () => {
  const w = window.innerWidth;
  const h = window.innerHeight;

  scene = new THREE.Scene();
  scene.background = new THREE.Color("#000000");
  scene.fog = new THREE.FogExp2("#000000", 0.02);

  camera = new THREE.PerspectiveCamera(60, w / h, 0.1, 1000);
  updateCameraPosition(w, h);

  renderer = new THREE.WebGLRenderer({
    antialias: false,
    powerPreference: "high-performance",
  });
  renderer.setSize(w, h);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  containerRef.value.appendChild(renderer.domElement);

  raycaster = new THREE.Raycaster();

  // -- STARS --
  createStars();

  // -- BUILD GATES --
  buildGates();

  // -- LIGHTS --
  const gateLight = new THREE.PointLight(0xffffff, 0, 100);
  gateLight.position.set(0, 0, 5);
  gateLight.name = "GateLight";
  scene.add(gateLight);

  // -- POST PROCESSING --
  const renderPass = new RenderPass(scene, camera);
  const bloomRadius = w < 768 ? 0.4 : 0.6;
  const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(w, h),
    1.5,
    bloomRadius,
    0.85
  );
  bloomPass.strength = 1.2;
  bloomPass.threshold = 0.1;

  composer = new EffectComposer(renderer);
  composer.addPass(renderPass);
  composer.addPass(bloomPass);

  window.addEventListener("resize", onResize);
  window.addEventListener("mousemove", onMouseMove);
  window.addEventListener("click", onClick);
  window.addEventListener("touchstart", onTouchStart, { passive: false });

  animate();

  // Intro Animation
  const startZ = camera.position.z + 30;
  const endZ = camera.position.z;
  camera.position.z = startZ;
  gsap.to(camera.position, { z: endZ, duration: 2.5, ease: "power2.out" });
};

const updateCameraPosition = (w, h) => {
  const aspect = w / h;
  let targetZ = 25;
  if (aspect < 0.5) targetZ = 50;
  else if (aspect < 0.75) targetZ = 40;
  else if (aspect < 1.0) targetZ = 35;
  else targetZ = 25;

  camera.position.set(0, 2, targetZ);
  camera.lookAt(0, 0, 0);
};

const createStars = () => {
  const starCount = 4000;
  const starsGeo = new THREE.BufferGeometry();
  const starPos = new Float32Array(starCount * 3);
  const starVel = new Float32Array(starCount * 3);
  const starBasePos = new Float32Array(starCount * 3);

  for (let i = 0; i < starCount; i++) {
    const x = (Math.random() - 0.5) * 200;
    const y = (Math.random() - 0.5) * 100;
    const z = (Math.random() - 0.5) * 100;
    starPos[i * 3] = x;
    starBasePos[i * 3] = x;
    starPos[i * 3 + 1] = y;
    starBasePos[i * 3 + 1] = y;
    starPos[i * 3 + 2] = z;
    starBasePos[i * 3 + 2] = z;
    starVel[i * 3] = 0;
    starVel[i * 3 + 1] = 0;
    starVel[i * 3 + 2] = 0;
  }
  starsGeo.setAttribute("position", new THREE.BufferAttribute(starPos, 3));
  const starsMat = new THREE.PointsMaterial({
    color: 0x888888,
    size: 0.15,
    transparent: true,
    opacity: 0.6,
  });
  starSystem = new THREE.Points(starsGeo, starsMat);
  starSystem.userData = { starBasePos, starVel };
  scene.add(starSystem);
};

const buildGates = () => {
  gates.forEach((g) => {
    scene.remove(g.group);
    g.ring.geometry.dispose();
    g.ring.material.dispose();
    g.innerRing.geometry.dispose();
    g.innerRing.material.dispose();
    g.horizon.geometry.dispose();
    g.horizon.material.dispose();
  });
  gates = [];

  const w = window.innerWidth;
  const spacing = w < 768 ? 9 : 16;

  portals.forEach((p, i) => {
    const group = new THREE.Group();
    const xPos = (i - 1) * spacing;
    const zPos = w < 768 ? Math.abs(i - 1) * 1 : Math.abs(i - 1) * 2;

    group.position.set(xPos, 0, -zPos);
    group.lookAt(0, 0, 50);

    const ringGeo = new THREE.TorusGeometry(3.5, 0.2, 16, 50);
    const ringMat = new THREE.MeshBasicMaterial({
      color: p.color,
      wireframe: true,
      transparent: true,
      opacity: 0.15,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    group.add(ring);

    const innerGeo = new THREE.TorusGeometry(3.2, 0.05, 8, 40);
    const innerMat = new THREE.MeshBasicMaterial({
      color: p.coreColor,
      transparent: true,
      opacity: 0.5,
    });
    const innerRing = new THREE.Mesh(innerGeo, innerMat);
    group.add(innerRing);

    const horizon = createHorizon(p.color);
    group.add(horizon);

    if (p.locked) {
      const cageGeo = new THREE.IcosahedronGeometry(2.5, 1);
      const cageMat = new THREE.MeshBasicMaterial({
        color: "red",
        wireframe: true,
        transparent: true,
        opacity: 0.3,
      });
      const cage = new THREE.Mesh(cageGeo, cageMat);
      group.add(cage);
    }

    scene.add(group);
    gates.push({ group, ring, innerRing, horizon, data: p });
  });
};

const createHorizon = (color) => {
  const count = 500;
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(count * 3);
  const data = { ang: [], rad: [], spd: [] };

  for (let i = 0; i < count; i++) {
    const ang = Math.random() * Math.PI * 2;
    const rad = Math.random() * 3;
    data.ang.push(ang);
    data.rad.push(rad);
    data.spd.push(0.01 + Math.random() * 0.03);
    pos[i * 3] = Math.cos(ang) * rad;
    pos[i * 3 + 1] = Math.sin(ang) * rad;
    pos[i * 3 + 2] = (Math.random() - 0.5) * 0.2;
  }

  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({
    color: color,
    size: 0.08,
    transparent: true,
    opacity: 0.1,
    blending: THREE.AdditiveBlending,
  });
  const mesh = new THREE.Points(geo, mat);
  mesh.userData = data;
  return mesh;
};

const animate = () => {
  animationId = requestAnimationFrame(animate);

  raycaster.setFromCamera(mouse.value, camera);
  const intersects = raycaster.intersectObjects(gates.map((g) => g.horizon));

  let hoveredIndex = -1;
  if (intersects.length > 0 && !isTraveling.value) {
    hoveredIndex = gates.findIndex((g) => g.horizon === intersects[0].object);
  }

  if (!isTraveling.value) {
    activeIndex.value = hoveredIndex;
    document.body.style.cursor = hoveredIndex !== -1 ? "pointer" : "default";
  }

  updateGravity(hoveredIndex);

  const gateLight = scene.getObjectByName("GateLight");
  if (hoveredIndex !== -1) {
    gateLight.color.set(gates[hoveredIndex].data.color);
    gateLight.intensity = THREE.MathUtils.lerp(gateLight.intensity, 2, 0.1);
    gateLight.position.lerp(gates[hoveredIndex].group.position, 0.1);
  } else {
    gateLight.intensity = THREE.MathUtils.lerp(gateLight.intensity, 0, 0.1);
  }

  gates.forEach((g, i) => {
    const isHovered = i === activeIndex.value;
    g.innerRing.rotation.z -= isHovered ? 0.1 : 0.01;
    g.ring.rotation.z += 0.002;

    const positions = g.horizon.geometry.attributes.position.array;
    const { ang, rad, spd } = g.horizon.userData;

    for (let j = 0; j < ang.length; j++) {
      ang[j] += spd[j] * (isHovered ? 5 : 1);
      if (isTraveling.value && isHovered) rad[j] *= 0.95;
      positions[j * 3] = Math.cos(ang[j]) * rad[j];
      positions[j * 3 + 1] = Math.sin(ang[j]) * rad[j];
    }
    g.horizon.geometry.attributes.position.needsUpdate = true;

    const targetOp = isHovered && !g.data.locked ? 0.8 : 0.1;
    g.horizon.material.opacity = THREE.MathUtils.lerp(
      g.horizon.material.opacity,
      targetOp,
      0.1
    );
  });

  if (!isTraveling.value) {
    const damping = window.innerWidth < 768 ? 0.01 : 0.05;
    camera.position.x += (mouse.value.x * 2 - camera.position.x) * damping;
    const targetY = window.innerWidth < 768 ? 2 : 2 + mouse.value.y * 1;
    camera.position.y += (targetY - camera.position.y) * damping;
    camera.lookAt(0, 0, 0);
  }

  composer.render();
};

const updateGravity = (targetIndex) => {
  const positions = starSystem.geometry.attributes.position.array;
  const { starBasePos, starVel } = starSystem.userData;
  let targetPos = new THREE.Vector3(0, 0, 0);
  let active = targetIndex !== -1;
  if (active) targetPos.copy(gates[targetIndex].group.position);

  for (let i = 0; i < positions.length; i += 3) {
    const ix = i,
      iy = i + 1,
      iz = i + 2;
    if (active) {
      const dx = targetPos.x - positions[ix],
        dy = targetPos.y - positions[iy],
        dz = targetPos.z - positions[iz];
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (dist < 30 && dist > 2) {
        const force = 0.5 / (dist * dist);
        starVel[ix] += dx * force;
        starVel[iy] += dy * force;
        starVel[iz] += dz * force;
      }
    }
    starVel[ix] += (starBasePos[ix] - positions[ix]) * 0.01;
    starVel[iy] += (starBasePos[iy] - positions[iy]) * 0.01;
    starVel[iz] += (starBasePos[iz] - positions[iz]) * 0.01;
    starVel[ix] *= 0.9;
    starVel[iy] *= 0.9;
    starVel[iz] *= 0.9;
    positions[ix] += starVel[ix];
    positions[iy] += starVel[iy];
    positions[iz] += starVel[iz];
  }
  starSystem.geometry.attributes.position.needsUpdate = true;
};

const onClick = () => {
  if (activeIndex.value === -1 || isTraveling.value) return;
  const gate = gates[activeIndex.value];
  if (gate.data.locked) return;
  enterWormhole(activeIndex.value);
};

const onTouchStart = (e) => {
  if (e.touches.length > 0) {
    mouse.value.x = (e.touches[0].clientX / window.innerWidth) * 2 - 1;
    mouse.value.y = -(e.touches[0].clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse.value, camera);
    const hitTestObjects = gates.map((g) => g.horizon);
    const intersects = raycaster.intersectObjects(hitTestObjects);

    if (intersects.length > 0) {
      const hitObj = intersects[0].object;
      const index = gates.findIndex((g) => g.horizon === hitObj);

      if (activeIndex.value === index) {
        onClick();
      } else {
        activeIndex.value = index;
      }
    }
  }
};

const enterWormhole = (index) => {
  isTraveling.value = true;
  const gate = gates[index];
  const targetPos = gate.group.position.clone();

  gsap.to(camera.position, {
    x: targetPos.x,
    y: targetPos.y,
    z: targetPos.z - 5,
    duration: 1.5,
    ease: "power3.in",
    onComplete: () => router.push(gate.data.path),
  });
  gsap.to(".ui-layer", { opacity: 0, duration: 0.5 });
};

const onMouseMove = (e) => {
  mouse.value.x = (e.clientX / window.innerWidth) * 2 - 1;
  mouse.value.y = -(e.clientY / window.innerHeight) * 2 + 1;

  if (uiContainerRef.value && window.innerWidth > 768) {
    const rx = mouse.value.y * -5;
    const ry = mouse.value.x * 5;
    uiContainerRef.value.style.transform = `perspective(1000px) rotateX(${rx}deg) rotateY(${ry}deg)`;
  }
};

const onResize = () => {
  if (!containerRef.value) return;
  const w = window.innerWidth;
  const h = window.innerHeight;

  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  updateCameraPosition(w, h);

  renderer.setSize(w, h);
  composer.setSize(w, h);
  buildGates();
};

onMounted(() => {
  init();
});
onUnmounted(() => {
  if (animationId) cancelAnimationFrame(animationId);
  window.removeEventListener("resize", onResize);
  window.removeEventListener("mousemove", onMouseMove);
  window.removeEventListener("click", onClick);
  window.removeEventListener("touchstart", onTouchStart);

  gates.forEach((g) => scene.remove(g.group));
  if (renderer) renderer.dispose();
});

const currentGate = computed(() =>
  activeIndex.value !== -1 ? portals[activeIndex.value] : null
);
</script>

<template>
  <div
    class="relative w-full h-full bg-black font-sans overflow-hidden select-none text-white"
    style="touch-action: none"
  >
    <div ref="containerRef" class="absolute inset-0 z-0"></div>

    <div
      class="absolute inset-x-0 top-0 z-30 pointer-events-none p-4 pt-8 md:p-12"
    >
      <div
        class="w-full relative flex flex-col md:flex-row justify-between items-center md:items-start pointer-events-auto gap-2 md:gap-0"
      >
        <div class="w-full md:w-auto flex justify-between items-center">
          <button
            @click="router.push('/selection')"
            class="pointer-events-auto z-50 px-4 py-2 border border-white/20 bg-black/40 backdrop-blur text-white rounded text-[10px] md:text-xs font-bold tracking-widest transition-all duration-200 hover:bg-cyan-600 hover:border-cyan-400 hover:shadow-[0_0_15px_rgba(8,145,178,0.5)] active:scale-95 active:bg-cyan-700"
          >
            &lt; RETURN
          </button>

          <button
            @click="
              router.push({
                path: '/leaderboard',
                query: { category: 'games' },
              })
            "
            class="md:hidden pointer-events-auto z-50 px-4 py-2 border border-cyan-500/50 text-cyan-400 bg-black/40 backdrop-blur rounded text-[10px] font-bold tracking-widest transition-all duration-200 hover:bg-cyan-600 hover:text-white hover:border-cyan-400 active:scale-95 active:bg-cyan-700"
          >
            LEADERBOARD
          </button>
        </div>

        <div
          class="md:absolute md:left-1/2 md:-translate-x-1/2 md:top-0 text-center w-full mt-2 md:mt-0"
        >
          <div
            class="text-[8px] md:text-xs font-mono text-cyan-400 tracking-[0.2em] md:tracking-[0.4em] uppercase opacity-70 mb-1"
          >
            Nexus Protocol
          </div>
          <h1
            class="text-2xl md:text-5xl font-headers font-bold tracking-widest text-white uppercase drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]"
          >
            Gate Selection
          </h1>
        </div>

        <button
          @click="
            router.push({ path: '/leaderboard', query: { category: 'games' } })
          "
          class="hidden md:block pointer-events-auto z-50 px-4 py-2 border border-cyan-500/50 text-cyan-400 bg-black/40 backdrop-blur rounded text-[10px] md:text-xs font-bold tracking-widest transition-all duration-200 hover:bg-cyan-600 hover:text-white hover:border-cyan-400 hover:shadow-[0_0_15px_rgba(8,145,178,0.5)] active:scale-95 active:bg-cyan-700"
        >
          LEADERBOARD
        </button>
      </div>
    </div>

    <div
      ref="uiContainerRef"
      class="ui-layer absolute inset-0 z-20 pointer-events-none p-4 md:p-12 flex flex-col justify-end transition-opacity duration-500"
    >
      <div
        class="absolute bottom-16 md:bottom-24 left-0 w-full text-center pointer-events-none transition-all duration-300"
        :class="
          currentGate
            ? 'opacity-100 translate-y-0 scale-100'
            : 'opacity-0 translate-y-10 scale-95'
        "
      >
        <div
          v-if="currentGate"
          class="relative inline-block px-4 py-6 md:p-8 max-w-[90%] md:max-w-full"
        >
          <div
            class="absolute inset-0 bg-black/40 backdrop-blur-md border border-white/10 rounded-xl -z-10"
          ></div>

          <div
            class="text-[8px] md:text-sm font-mono tracking-[0.2em] uppercase text-gray-400 mb-1"
          >
            {{ currentGate.sub }}
          </div>

          <h2
            class="text-3xl md:text-7xl font-headers font-black uppercase tracking-wider mb-2 leading-none text-transparent bg-clip-text bg-gradient-to-b from-white to-gray-400"
            :style="{ dropShadow: `0 0 15px ${currentGate.color}` }"
          >
            {{ currentGate.title }}
          </h2>

          <div class="flex items-center justify-center gap-3 md:gap-4 mb-4">
            <div class="h-[1px] w-6 md:w-12 bg-white/30"></div>
            <span
              class="text-[8px] md:text-xs font-bold tracking-widest uppercase text-white/80"
              >{{ currentGate.type }}</span
            >
            <div class="h-[1px] w-6 md:w-12 bg-white/30"></div>
          </div>

          <div
            v-if="!currentGate.locked"
            class="text-cyan-400 text-[9px] md:text-xs tracking-[0.2em] uppercase font-bold animate-pulse"
          >
            [ Tap to Enter ]
          </div>
          <div
            v-else
            class="text-red-500 text-[9px] md:text-xs tracking-[0.2em] uppercase font-bold border border-red-500/30 px-3 py-1 bg-red-500/10 rounded inline-block"
          >
            ⚠️ LOCKED
          </div>
        </div>
      </div>

      <div
        class="flex justify-between items-end text-[8px] md:text-[10px] font-mono text-gray-500 border-t border-white/10 pt-2 md:pt-4 opacity-50"
      >
        <div>STATUS: ONLINE</div>
        <div>SECURE</div>
      </div>
    </div>

    <div
      class="absolute inset-0 z-10 pointer-events-none bg-[radial-gradient(circle_at_center,transparent_30%,#000000_120%)]"
    ></div>
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
