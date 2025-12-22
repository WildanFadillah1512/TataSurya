<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import gsap from 'gsap'

const router = useRouter()
const canvasRef = ref(null)

// --- MAPPING ASSETS ---
const modelAssets = {
  sun: 'sun.glb',    
  earth: 'earth.glb', 
  moon: 'moon.glb'   
}

// --- CONFIGURATION SCENES ---
const scenes = [
  {
    id: 'solar-eclipse',
    title: 'Gerhana Matahari',
    subtitle: 'THE GREAT SHADOW',
    description: 'Bulan bergerak mengelilingi Bumi dan menghalangi cahaya Matahari. Perhatikan bayangan umbra jatuh ke permukaan Bumi.',
    camPos: { x: 0, y: 0, z: 25 }, // Kamera fokus ke Bumi
    objects: [
      { type: 'sun', size: 5, pos: { x: -50, y: 10, z: -50 } }, // Matahari jauh di belakang kiri
      { type: 'earth', size: 4.5, pos: { x: 0, y: 0, z: 0 } },
      { type: 'moon', size: 1.2, pos: { x: 0, y: 0, z: 0 }, orbit: true, radius: 12, startAngle: 2.5 } // Bulan punya orbit
    ]
  },
  {
    id: 'lunar-eclipse',
    title: 'Gerhana Bulan',
    subtitle: 'BLOOD MOON',
    description: 'Bumi berada tepat di antara Matahari dan Bulan. Bulan masuk ke dalam bayangan Bumi (Umbra) dan menjadi gelap/kemerahan.',
    camPos: { x: 5, y: 5, z: 40 }, // Kamera mundur (z:40) agar tidak out frame
    objects: [
      { type: 'sun', size: 6, pos: { x: -60, y: 0, z: 0 } }, // Matahari di kiri
      { type: 'earth', size: 4, pos: { x: 0, y: 0, z: 0 } },
      { type: 'moon', size: 1, pos: { x: 0, y: 0, z: 0 }, orbit: true, radius: 20, startAngle: 0 } // Radius orbit besar agar masuk bayangan
    ]
  },
  {
    id: 'seasons',
    title: 'Pergantian Musim',
    subtitle: 'AXIAL TILT 23.5°',
    description: 'Bumi mengelilingi Matahari dengan poros miring tetap. Geser slider untuk melihat bagaimana kutub utara/selatan bergantian mendekati Matahari.',
    camPos: { x: 0, y: 40, z: 60 },
    logic: 'orbit-sun', // Logic khusus orbit tahunan
    objects: [
      { type: 'sun', size: 8, pos: { x: 0, y: 0, z: 0 } },
      { type: 'earth', size: 3, pos: { x: 30, y: 0, z: 0 }, tilted: true }
    ]
  },
  {
    id: 'day-night',
    title: 'Siang & Malam',
    subtitle: 'EARTH ROTATION',
    description: 'Bumi berputar pada porosnya. Perhatikan garis batas terang dan gelap (terminator). Bagian yang menghadap Matahari mengalami siang.',
    camPos: { x: 0, y: 0, z: 18 },
    objects: [
      { type: 'sun', size: 2, pos: { x: 50, y: 10, z: 20 } }, // Cahaya dari kanan
      { type: 'earth', size: 5, pos: { x: 0, y: 0, z: 0 }, rotating: true }
    ]
  },
  {
    id: 'comet',
    title: 'Hujan Komet',
    subtitle: 'COSMIC TRAVELERS',
    description: 'Sekumpulan komet es melintas. Ekor komet terbentuk oleh angin matahari dan selalu menjauhi arah Matahari.',
    camPos: { x: 0, y: 10, z: 50 },
    logic: 'comet-shower', // Logic khusus banyak komet
    objects: [
      { type: 'sun', size: 0, pos: { x: -80, y: 0, z: 0 } }, // Dummy position for sun direction
      { type: 'earth', size: 6, pos: { x: 0, y: -15, z: 0 } }
    ]
  }
]

// --- STATE ---
const activeIndex = ref(0)
const sliderValue = ref(50)

// --- THREE VARS ---
let scene, camera, renderer, controls, composer
let starSystem
let entityGroup = new THREE.Group()
let cometGroup = new THREE.Group() // Grup khusus komet
let animationFrameId
const loader = new GLTFLoader()

// --- INIT ---
const initThree = () => {
  const w = window.innerWidth
  const h = window.innerHeight

  scene = new THREE.Scene()
  scene.background = new THREE.Color(0x050505)

  camera = new THREE.PerspectiveCamera(45, w/h, 0.1, 1000)
  
  renderer = new THREE.WebGLRenderer({ 
    canvas: canvasRef.value, 
    antialias: true 
  })
  renderer.setSize(w, h)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap

  // POST PROCESSING
  const renderScene = new RenderPass(scene, camera)
  const bloomPass = new UnrealBloomPass(new THREE.Vector2(w, h), 1.2, 0.4, 0.85)
  composer = new EffectComposer(renderer)
  composer.addPass(renderScene)
  composer.addPass(bloomPass)

  controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.dampingFactor = 0.05
  controls.minDistance = 10
  controls.maxDistance = 200
  
  // Ambient Light (Redup, agar shadow pekat)
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.1)
  scene.add(ambientLight)

  createStarfield()
  scene.add(entityGroup)
  scene.add(cometGroup)
  
  loadScene(0)
  animate()
  window.addEventListener('resize', onResize)
}

// --- SCENE LOADER ---
const loadScene = (index) => {
  // Clear entities
  entityGroup.clear()
  cometGroup.clear()
  
  const config = scenes[index]

  // Reset Camera
  gsap.to(camera.position, {
    x: config.camPos.x, y: config.camPos.y, z: config.camPos.z,
    duration: 1.5, ease: "power2.inOut"
  })
  controls.target.set(0,0,0)

  // Logic Khusus Komet
  if (config.logic === 'comet-shower') {
    createCometShower(config)
  }

  // Create Standard Objects
  config.objects.forEach(createObject)
  
  sliderValue.value = 50
}

const createObject = (conf) => {
  const wrapper = new THREE.Group()
  wrapper.position.set(conf.pos.x, conf.pos.y, conf.pos.z)
  wrapper.userData = { ...conf } // Simpan config di userdata untuk animasi

  // 1. MATAHARI (SUMBER CAHAYA)
  if (conf.type === 'sun') {
    if (conf.size > 0) { // Jika bukan dummy
      const light = new THREE.PointLight(0xffffff, 2.5, 500)
      light.castShadow = true
      light.shadow.bias = -0.0005
      light.shadow.mapSize.width = 2048; light.shadow.mapSize.height = 2048;
      wrapper.add(light)

      // Visual Matahari
      const sunGeo = new THREE.SphereGeometry(conf.size, 32, 32)
      const sunMat = new THREE.MeshBasicMaterial({ color: 0xffaa00 })
      const sunMesh = new THREE.Mesh(sunGeo, sunMat)
      wrapper.add(sunMesh)
      
      // Glow
      const spriteMat = new THREE.SpriteMaterial({ 
        map: new THREE.TextureLoader().load('https://threejs.org/examples/textures/sprites/glow.png'), 
        color: 0xff5500, transparent: true, blending: THREE.AdditiveBlending 
      })
      const sprite = new THREE.Sprite(spriteMat)
      sprite.scale.set(conf.size*5, conf.size*5, 1)
      wrapper.add(sprite)
    }
  }

  // 2. MODEL 3D (BUMI / BULAN)
  const filename = modelAssets[conf.type]
  if (filename) {
    loader.load(`/textures/${filename}`, (gltf) => {
      const model = gltf.scene
      
      // Scaling
      const box = new THREE.Box3().setFromObject(model)
      const sizeVec = box.getSize(new THREE.Vector3())
      const maxDim = Math.max(sizeVec.x, sizeVec.y, sizeVec.z)
      if (maxDim > 0) {
        const scale = (conf.size * 2) / maxDim 
        model.scale.set(scale, scale, scale)
      }

      // Material Tweak
      model.traverse(child => {
        if (child.isMesh) {
          child.castShadow = true
          child.receiveShadow = true
          if(child.material.map) {
             child.material.roughness = 0.8
             child.material.metalness = 0.1
          }
        }
      })

      // Jika Bumi, atur kemiringan axis jika diminta
      if (conf.type === 'earth') {
        // Wrapper dalam untuk rotasi harian
        const earthSpinGroup = new THREE.Group() 
        earthSpinGroup.name = "SpinGroup"
        earthSpinGroup.add(model)
        
        // Wrapper luar untuk Tilt 23.5 derajat
        const tiltGroup = new THREE.Group()
        tiltGroup.rotation.z = 23.5 * (Math.PI/180) // Miring permanen
        tiltGroup.add(earthSpinGroup)
        
        wrapper.add(tiltGroup)
      } else {
        wrapper.add(model)
      }

    }, undefined, (err) => {
      // Fallback Sphere
      const geo = new THREE.SphereGeometry(conf.size, 32, 32)
      const mat = new THREE.MeshStandardMaterial({ color: 0x888888 })
      wrapper.add(new THREE.Mesh(geo, mat))
    })
  }

  entityGroup.add(wrapper)
}

// --- LOGIC KOMET BANYAK & ANIMASI ---
const createCometShower = (config) => {
  // Buat 10 komet
  for(let i=0; i<8; i++) {
    const cometSize = 0.5 + Math.random() * 0.5
    const headGeo = new THREE.SphereGeometry(cometSize, 16, 16)
    const headMat = new THREE.MeshBasicMaterial({ color: 0xaaddff })
    const comet = new THREE.Mesh(headGeo, headMat)

    // Ekor
    const tailLength = 15 + Math.random() * 10
    const tailGeo = new THREE.ConeGeometry(cometSize, tailLength, 32, 1, true)
    tailGeo.rotateX(Math.PI/2) 
    tailGeo.translate(0, 0, tailLength/2) // Pivot di kepala
    const tailMat = new THREE.MeshBasicMaterial({ 
      color: 0x00ffff, transparent: true, opacity: 0.3, blending: THREE.AdditiveBlending, side: THREE.DoubleSide 
    })
    const tail = new THREE.Mesh(tailGeo, tailMat)
    comet.add(tail)

    // Posisi Awal Random
    comet.position.set(
      (Math.random() - 0.5) * 60,
      10 + Math.random() * 20,
      (Math.random() - 0.5) * 40
    )
    
    // Simpan data kecepatan
    comet.userData = {
      velocity: new THREE.Vector3(-0.2 - Math.random()*0.3, -0.1, 0.1),
      offset: Math.random() * 100
    }

    cometGroup.add(comet)
  }
}

const createStarfield = () => {
  const geo = new THREE.BufferGeometry()
  const pos = []
  for(let i=0; i<4000; i++) pos.push((Math.random()-0.5)*800, (Math.random()-0.5)*800, (Math.random()-0.5)*800)
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  const mat = new THREE.PointsMaterial({ size: 0.7, color: 0xffffff, transparent: true, opacity: 0.8 })
  starSystem = new THREE.Points(geo, mat)
  scene.add(starSystem)
}

// --- ANIMATION LOOP ---
const animate = () => {
  animationFrameId = requestAnimationFrame(animate)
  controls.update()
  if(starSystem) starSystem.rotation.y += 0.0001

  // Normalisasi Slider (0 to 1)
  const t = sliderValue.value / 100
  const currentScene = scenes[activeIndex.value]

  // 1. LOGIKA KOMET (Jika scene comet)
  if (currentScene.logic === 'comet-shower') {
    const sunPos = new THREE.Vector3(-80, 0, 0)
    cometGroup.children.forEach(c => {
      // Gerakkan komet
      c.position.add(c.userData.velocity)
      
      // Ekor selalu menjauhi Matahari
      // Trik: LookAt Matahari, lalu putar balik karena ekor di belakang
      c.lookAt(sunPos)
      c.rotateY(Math.PI) 

      // Reset jika keluar layar
      if (c.position.x < -60) {
        c.position.x = 60
        c.position.y = 10 + Math.random() * 20
      }
    })
  }

  // 2. LOGIKA PERGANTIAN MUSIM (Orbit Bumi mengelilingi Matahari)
  if (currentScene.logic === 'orbit-sun') {
    // Bumi mengorbit Matahari
    const earthObj = entityGroup.children.find(c => c.userData.type === 'earth')
    if (earthObj) {
        // Radius orbit
        const r = 35 
        // Sudut berdasarkan slider (0% - 100% = satu putaran penuh)
        const angle = t * Math.PI * 2 
        
        earthObj.position.x = Math.cos(angle) * r
        earthObj.position.z = Math.sin(angle) * r

        // Rotasi harian bumi (Spin)
        // Kita akses children -> TiltGroup -> SpinGroup -> Mesh
        const tiltGroup = earthObj.children[0]
        if(tiltGroup && tiltGroup.children[0]) {
             tiltGroup.children[0].rotation.y += 0.05 // Bumi berputar pada porosnya
        }
    }
  }

  // 3. LOGIKA UMUM (Gerhana & Siang Malam)
  entityGroup.children.forEach(obj => {
    const d = obj.userData

    // Rotasi Bumi Siang Malam
    if (d.type === 'earth' && d.rotating) {
       // Putar bumi berdasarkan slider untuk simulasi 24 jam
       const tiltGroup = obj.children[0]
       if(tiltGroup && tiltGroup.children[0]) {
           tiltGroup.children[0].rotation.y = t * Math.PI * 4 // 2x putaran
       }
    }

    // Gerhana (Orbit Bulan)
    if (d.type === 'moon' && d.orbit) {
      // Orbit Melingkar (3D)
      // Slider 0% -> Kiri, 50% -> Tengah, 100% -> Kanan
      // Kita gunakan sin/cos
      // Offset Angle agar pas di tengah saat 50%
      
      const angleRange = Math.PI // Setengah lingkaran
      const currentAngle = d.startAngle + (t * angleRange)

      obj.position.x = Math.cos(currentAngle) * d.radius
      obj.position.z = Math.sin(currentAngle) * d.radius
      
      // Sedikit variasi Y agar terlihat orbit miring sedikit (opsional)
      obj.position.y = Math.sin(currentAngle * 2) * 2
      
      obj.rotation.y += 0.01
    }
  })

  composer.render()
}

const nextScene = () => {
  activeIndex.value = (activeIndex.value + 1) % scenes.length
  loadScene(activeIndex.value)
}

const onResize = () => {
  if(!camera || !renderer) return
  const w = window.innerWidth
  const h = window.innerHeight
  camera.aspect = w/h
  camera.updateProjectionMatrix()
  renderer.setSize(w, h)
  composer.setSize(w, h)
}

onMounted(initThree)
onUnmounted(() => {
  cancelAnimationFrame(animationFrameId)
  window.removeEventListener('resize', onResize)
  if(renderer) renderer.dispose()
})
</script>

<template>
  <div class="relative w-full h-screen bg-black overflow-hidden font-sans text-white select-none">
    
    <canvas ref="canvasRef" class="relative z-0 block w-full h-full outline-none cursor-move"></canvas>

    <div class="absolute inset-0 z-10 pointer-events-none flex flex-col justify-between p-6 md:p-10">
        
        <div class="pointer-events-auto max-w-xl animate-fade-in-down">
            <div class="inline-flex items-center gap-2 px-3 py-1 mb-4 text-[10px] font-bold tracking-widest bg-white/10 rounded-full border border-white/20 backdrop-blur-md">
                <span class="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
                <span class="text-white/80 uppercase">Phenomenon {{ activeIndex + 1 }} / {{ scenes.length }}</span>
            </div>
            
            <h1 class="text-5xl md:text-7xl font-bold tracking-tighter mb-2 bg-gradient-to-r from-white via-gray-200 to-gray-500 bg-clip-text text-transparent drop-shadow-lg">
                {{ scenes[activeIndex].title }}
            </h1>
            <p class="text-cyan-400 tracking-[0.4em] text-xs font-bold uppercase mb-4 pl-1">
                {{ scenes[activeIndex].subtitle }}
            </p>
            <p class="text-gray-200 text-sm md:text-base leading-relaxed bg-black/50 p-4 rounded-lg border-l-2 border-cyan-500 backdrop-blur-sm max-w-md shadow-lg">
                {{ scenes[activeIndex].description }}
            </p>
        </div>

        <div class="pointer-events-auto w-full max-w-3xl mx-auto flex flex-col md:flex-row items-end gap-4 animate-fade-in-up">
            <div class="flex-1 w-full bg-black/60 backdrop-blur-xl border border-white/10 rounded-2xl p-5 shadow-2xl">
                <div class="flex justify-between text-[10px] uppercase font-bold text-gray-400 mb-3 tracking-wider">
                    <span>- Time</span>
                    <span class="text-cyan-400 font-mono">{{ sliderValue }}%</span>
                    <span>+ Time</span>
                </div>
                <input 
                    type="range" v-model="sliderValue" min="0" max="100" 
                    class="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-cyan-400 hover:accent-cyan-300 transition-all"
                >
            </div>

            <button @click="nextScene" class="h-[84px] aspect-square flex flex-col items-center justify-center rounded-2xl bg-white/10 border border-white/10 backdrop-blur-md hover:bg-white/20 hover:scale-105 active:scale-95 transition-all group">
                <span class="text-[10px] uppercase font-bold text-gray-400 mb-1 group-hover:text-white">Next</span>
                <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
            </button>
        </div>
    </div>

    <div class="absolute top-6 right-6 z-20 pointer-events-auto">
        <button @click="router.push('/explore')" class="px-5 py-2 rounded-full bg-white text-black font-bold text-xs uppercase hover:bg-cyan-400 hover:shadow-[0_0_20px_rgba(34,211,238,0.6)] transition-all shadow-lg">
            Exit Sim
        </button>
    </div>
  </div>
</template>

<style scoped>
input[type=range]::-webkit-slider-thumb {
  -webkit-appearance: none;
  height: 24px; width: 24px;
  border-radius: 50%;
  background: #000;
  border: 4px solid #22d3ee;
  margin-top: -10px; 
  box-shadow: 0 0 10px rgba(34,211,238,0.5);
  transition: transform 0.1s;
}
input[type=range]::-webkit-slider-thumb:hover {
    transform: scale(1.2);
}
input[type=range]::-webkit-slider-runnable-track {
    height: 4px;
    background: #374151;
    border-radius: 2px;
}

@keyframes fadeInDown { from { opacity: 0; transform: translateY(-20px); } to { opacity: 1; transform: translateY(0); } }
@keyframes fadeInUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
.animate-fade-in-down { animation: fadeInDown 0.8s ease-out; }
.animate-fade-in-up { animation: fadeInUp 0.8s ease-out; }
</style>